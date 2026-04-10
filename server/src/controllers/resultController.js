import Result from '../models/Result.js';
import Exam from '../models/Exam.js';
import Question from '../models/Question.js';
import User from '../models/User.js';
import TestAssignment from '../models/TestAssignment.js';
import { successResponse, errorResponse } from '../services/utils.js';
import { calculateResult, calculateRankAndPercentile } from '../services/scoringService.js';
import { getAnalytics, getLeaderboard as getLeaderboardData, getComparison as getComparisonData } from '../services/analyticsService.js';

export async function getMyResults(req, res) {
  try {
    const results = await Result.find({ userId: req.userId })
      .populate('examId', 'title code subject duration totalMarks')
      .sort({ submittedAt: -1 });
    successResponse(res, results);
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function getResultById(req, res) {
  try {
    const result = await Result.findById(req.params.id)
      .populate('examId')
      .populate('answers.questionId');
    if (!result) return errorResponse(res, 'Result not found', 404);
    if (result.userId.toString() !== req.userId) return errorResponse(res, 'Access denied', 403);
    successResponse(res, result);
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function getResultAnalytics(req, res) {
  try {
    const analytics = await getAnalytics(req.params.id, req.userId);
    if (!analytics) return errorResponse(res, 'Result not found', 404);
    successResponse(res, analytics);
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function startTest(req, res) {
  try {
    const { examId } = req.body;

    const assignment = await TestAssignment.findOne({ examId, userId: req.userId });
    if (!assignment) return errorResponse(res, 'Access denied. This test is not assigned to you.', 403);
    if (assignment.startDate && new Date() < new Date(assignment.startDate)) {
      return errorResponse(res, `This test is not available yet. It will be available from ${new Date(assignment.startDate).toLocaleDateString()}`, 403);
    }
    if (assignment.dueDate && new Date() > new Date(assignment.dueDate)) return errorResponse(res, 'This test assignment has expired.', 403);
    if (assignment.attemptsUsed >= assignment.attemptsAllowed) return errorResponse(res, `Maximum attempts reached (${assignment.attemptsAllowed}).`, 403);

    const existingResult = await Result.findOne({ userId: req.userId, examId, status: 'in_progress' });
    if (existingResult) {
      return successResponse(res, { resultId: existingResult._id, startedAt: existingResult.startedAt }, 'Existing test session found');
    }

    const exam = await Exam.findById(examId);
    if (!exam) return errorResponse(res, 'Exam not found', 404);
    if (exam.startDate && new Date() < new Date(exam.startDate)) return errorResponse(res, 'This test is not yet available.', 403);
    if (exam.endDate && new Date() > new Date(exam.endDate)) return errorResponse(res, 'This test is no longer available.', 403);

    const questions = await Question.find({ examId }).sort({ questionNumber: 1 });
    if (questions.length === 0) return errorResponse(res, 'No questions available for this exam', 400);

    assignment.attemptsUsed += 1;
    assignment.status = 'in_progress';
    await assignment.save();

    const answers = questions.map(q => ({
      questionId: q._id, selectedOptions: [], numericalAnswer: null,
      isMarkedForReview: false, isVisited: false, timeSpent: 0
    }));

    const result = new Result({
      userId: req.userId, 
      examId, 
      institutionId: exam.institutionId || req.institutionId,
      answers,
      startedAt: new Date(), 
      status: 'in_progress'
    });
    await result.save();

    successResponse(res, { resultId: result._id, startedAt: result.startedAt, totalQuestions: questions.length }, 'Test started successfully', 201);
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function saveProgress(req, res) {
  try {
    const { resultId, answers, timeTaken, tabSwitchCount, fullscreenExitCount, violation } = req.body;

    const result = await Result.findOne({ _id: resultId, userId: req.userId });
    if (!result) return errorResponse(res, 'Test session not found', 404);

    result.answers = answers;
    result.timeTaken = timeTaken;
    if (tabSwitchCount !== undefined) result.tabSwitchCount = tabSwitchCount;
    if (fullscreenExitCount !== undefined) result.fullscreenExitCount = fullscreenExitCount;
    if (violation) {
      result.suspiciousActivity = result.suspiciousActivity || [];
      result.suspiciousActivity.push(violation);
    }

    await result.save();
    successResponse(res, null, 'Progress saved successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function submitTest(req, res) {
  try {
    const { resultId } = req.body;

    const result = await Result.findOne({ _id: resultId, userId: req.userId });
    if (!result) return errorResponse(res, 'Test session not found', 404);
    if (result.status === 'completed') return errorResponse(res, 'Test already submitted', 400);

    const exam = await Exam.findById(result.examId);
    if (!exam) return errorResponse(res, 'Exam not found', 404);

    const scoring = await calculateResult(result);

    result.totalScore = scoring.totalScore;
    result.correctAnswers = scoring.correctAnswers;
    result.wrongAnswers = scoring.wrongAnswers;
    result.unattempted = scoring.unattempted;
    result.sectionScores = scoring.sectionScores;
    result.accuracy = scoring.accuracy;
    result.timeAnalysis = scoring.timeAnalysis;
    result.weakAreas = scoring.weakAreas;
    result.strongAreas = scoring.strongAreas;
    result.status = 'completed';
    result.submittedAt = new Date();
    
    // Ensure institutionId is set
    if (!result.institutionId && exam.institutionId) {
      result.institutionId = exam.institutionId;
    }
    if (!result.institutionId && req.institutionId) {
      result.institutionId = req.institutionId;
    }
    
    await result.save();

    const rankData = await calculateRankAndPercentile(resultId, result.examId);
    result.rank = rankData.rank;
    result.percentile = rankData.percentile;
    result.comparisonWithTopper = {
      topperScore: rankData.topperScore,
      difference: rankData.difference
    };
    await result.save();

    // Update assignment status to completed
    await TestAssignment.findOneAndUpdate(
      { examId: result.examId, userId: req.userId },
      { status: 'completed', completedAt: new Date() }
    );

    // Update user's examsTaken
    await User.findByIdAndUpdate(req.userId, {
      $addToSet: {
        examsTaken: {
          examId: result.examId,
          score: scoring.totalScore,
          rank: rankData.rank,
          completedAt: new Date()
        }
      }
    });

    successResponse(res, {
      totalScore: scoring.totalScore, correctAnswers: scoring.correctAnswers,
      wrongAnswers: scoring.wrongAnswers, unattempted: scoring.unattempted,
      accuracy: scoring.accuracy, rank: rankData.rank, percentile: rankData.percentile,
      sectionScores: scoring.sectionScores, weakAreas: scoring.weakAreas, strongAreas: scoring.strongAreas
    }, 'Test submitted successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function getLeaderboard(req, res) {
  try {
    const leaderboard = await getLeaderboardData(req.params.examId);
    successResponse(res, leaderboard);
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function getComparison(req, res) {
  try {
    const comparison = await getComparisonData(req.params.examId, req.userId);
    successResponse(res, comparison);
  } catch (error) {
    errorResponse(res, error.message);
  }
}
