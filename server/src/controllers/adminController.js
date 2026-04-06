import Result from '../models/Result.js';
import Exam from '../models/Exam.js';
import Question from '../models/Question.js';
import User from '../models/User.js';
import Bookmark from '../models/Bookmark.js';
import Device from '../models/Device.js';
import mongoose from 'mongoose';
import { successResponse, errorResponse } from '../services/utils.js';

function getInstitutionFilter(req) {
  if (req.userRole === 'super_admin') return {};
  return { institutionId: req.institutionId };
}

export async function getSubmissions(req, res) {
  try {
    const { examId, userId, status, search, page = 1, limit = 50, sortBy = 'submittedAt', sortOrder = 'desc', institutionId } = req.query;
    let query = {};

    if (examId) query.examId = examId;
    if (userId) query.userId = userId;
    if (status) query.status = status;

    // Build exam filter based on role and optional institutionId param
    let examFilter = {};
    if (req.userRole === 'institution_admin') {
      examFilter.institutionId = req.institutionId;
    } else if (institutionId) {
      examFilter.institutionId = institutionId;
    }

    const instExams = await Exam.find(examFilter).select('_id');
    if (instExams.length > 0) {
      query.examId = { $in: instExams.map(e => e._id) };
    } else if (Object.keys(examFilter).length > 0) {
      query.examId = { $exists: false };
    }

    if (search) {
      const users = await User.find({ $or: [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }] }).select('_id');
      query.userId = { $in: users.map(u => u._id) };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const submissions = await Result.find(query)
      .populate('userId', 'name email college branch institutionId')
      .populate('examId', 'title code subject duration totalMarks')
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(parseInt(limit));
    const total = await Result.countDocuments(query);
    successResponse(res, { submissions, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function getSubmissionById(req, res) {
  try {
    const result = await Result.findById(req.params.id)
      .populate('userId', 'name email college branch phone')
      .populate('examId')
      .populate('answers.questionId');
    if (!result) return errorResponse(res, 'Submission not found', 404);

    const devices = await Device.find({ userId: result.userId._id });
    const allResults = await Result.find({ examId: result.examId._id, status: 'completed' }).sort({ totalScore: -1 });
    const rank = allResults.findIndex(r => r._id.toString() === result._id.toString()) + 1;
    const totalParticipants = allResults.length;

    successResponse(res, {
      result, devices,
      rankInfo: { rank, totalParticipants, percentile: totalParticipants > 0 ? ((totalParticipants - rank) / totalParticipants * 100).toFixed(2) : '0' }
    });
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function getOverviewStats(req, res) {
  try {
    const { institutionId } = req.query;
    
    let examFilter = {};
    let userFilter = {};
    
    if (req.userRole === 'institution_admin') {
      examFilter.institutionId = req.institutionId;
      userFilter.institutionId = req.institutionId;
    } else if (institutionId) {
      examFilter.institutionId = institutionId;
      userFilter.institutionId = institutionId;
    }

    const exams = await Exam.find(examFilter);
    const examIds = exams.map(e => e._id);

    const totalTests = exams.length;
    const totalSubmissions = await Result.countDocuments({ examId: { $in: examIds }, status: 'completed' });
    
    const studentQuery = { role: 'student', ...userFilter };
    const totalStudents = await User.countDocuments(studentQuery);
    
    const activeTests = await Exam.countDocuments({ ...examFilter, isActive: true });

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todaySubmissions = await Result.countDocuments({ examId: { $in: examIds }, status: 'completed', submittedAt: { $gte: today } });

    const recentSubmissions = await Result.find({ examId: { $in: examIds }, status: 'completed' })
      .populate('userId', 'name institutionId').populate('examId', 'title')
      .sort({ submittedAt: -1 }).limit(10);

    const avgScore = totalSubmissions > 0 
      ? await Result.aggregate([
          { $match: { examId: { $in: examIds }, status: 'completed' } },
          { $group: { _id: null, avg: { $avg: '$totalScore' } } }
        ]).then(r => r[0]?.avg || 0)
      : 0;

    const adminFilter = req.userRole === 'super_admin' && !institutionId ? {} : { institutionId: institutionId || req.institutionId };
    const totalUsers = await User.countDocuments(adminFilter);
    const totalAdmins = await User.countDocuments({ ...adminFilter, role: 'institution_admin' });

    const allInstitutions = req.userRole === 'super_admin' && !institutionId 
      ? await mongoose.model('Institution').find({}) 
      : [];

    successResponse(res, { 
      totalTests, 
      totalSubmissions, 
      totalStudents, 
      totalUsers,
      totalAdmins,
      activeTests, 
      todaySubmissions, 
      recentSubmissions,
      averageScore: avgScore.toFixed(2),
      institutions: allInstitutions
    });
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function getExamStats(req, res) {
  try {
    const { examId } = req.params;
    const totalSubmissions = await Result.countDocuments({ examId, status: 'completed' });
    const scoreStats = await Result.aggregate([
      { $match: { examId: new mongoose.Types.ObjectId(examId), status: 'completed' } },
      { $group: { _id: null, avgScore: { $avg: '$totalScore' }, maxScore: { $max: '$totalScore' }, minScore: { $min: '$totalScore' }, avgAccuracy: { $avg: '$accuracy' } } }
    ]);
    successResponse(res, { totalSubmissions, stats: scoreStats[0] || {} });
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function exportSubmissions(req, res) {
  try {
    const { examId } = req.params;
    const results = await Result.find({ examId, status: 'completed' })
      .populate('userId', 'name email college branch')
      .sort({ totalScore: -1 });
    const csvData = results.map((r, index) => ({
      rank: index + 1, name: r.userId?.name, email: r.userId?.email,
      college: r.userId?.college, branch: r.userId?.branch,
      score: r.totalScore, accuracy: r.accuracy?.toFixed(2),
      correct: r.correctAnswers, wrong: r.wrongAnswers,
      unattempted: r.unattempted, timeTaken: Math.floor(r.timeTaken / 60),
      submittedAt: r.submittedAt?.toISOString()
    }));
    successResponse(res, csvData);
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function getUserDevices(req, res) {
  try {
    const devices = await Device.find({ userId: req.params.userId }).sort({ lastUsed: -1 });
    successResponse(res, devices);
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function deleteDevice(req, res) {
  try {
    await Device.findByIdAndDelete(req.params.deviceId);
    successResponse(res, null, 'Device removed');
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function updateResult(req, res) {
  try {
    const { status, totalScore, correctAnswers, wrongAnswers, unattempted, accuracy, timeTaken } = req.body;
    const result = await Result.findById(req.params.id);
    if (!result) return errorResponse(res, 'Result not found', 404);

    if (status !== undefined) result.status = status;
    if (totalScore !== undefined) result.totalScore = totalScore;
    if (correctAnswers !== undefined) result.correctAnswers = correctAnswers;
    if (wrongAnswers !== undefined) result.wrongAnswers = wrongAnswers;
    if (unattempted !== undefined) result.unattempted = unattempted;
    if (accuracy !== undefined) result.accuracy = accuracy;
    if (timeTaken !== undefined) result.timeTaken = timeTaken;

    await result.save();
    
    const populated = await Result.findById(result._id)
      .populate('userId', 'name email')
      .populate('examId', 'title code totalMarks');
    
    successResponse(res, populated, 'Result updated successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function recalculateResult(req, res) {
  try {
    const result = await Result.findById(req.params.id);
    if (!result) return errorResponse(res, 'Result not found', 404);

    const { calculateResult, calculateRankAndPercentile } = await import('../services/scoringService.js');
    const scoring = await calculateResult(result);
    
    result.totalScore = scoring.totalScore;
    result.correctAnswers = scoring.correctAnswers;
    result.wrongAnswers = scoring.wrongAnswers;
    result.unattempted = scoring.unattempted;
    result.accuracy = scoring.accuracy;
    result.sectionScores = scoring.sectionScores;
    result.status = 'completed';
    result.submittedAt = result.submittedAt || new Date();
    
    await result.save();
    
    const rankData = await calculateRankAndPercentile(result._id, result.examId);
    result.rank = rankData.rank;
    result.percentile = rankData.percentile;
    await result.save();
    
    successResponse(res, {
      resultId: result._id,
      totalScore: result.totalScore,
      correctAnswers: result.correctAnswers,
      wrongAnswers: result.wrongAnswers,
      unattempted: result.unattempted,
      accuracy: result.accuracy,
      rank: result.rank,
      percentile: result.percentile
    }, 'Result recalculated successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
}
