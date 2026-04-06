import Question from '../models/Question.js';

export function scoreAnswer(answer, question) {
  if (!question) return { isCorrect: false, isAttempted: false, marksEarned: 0 };

  const selectedOptions = answer.selectedOptions;
  const isAttempted = selectedOptions && selectedOptions.length > 0;

  let isCorrect = false;
  if (isAttempted && question.options) {
    const selectedOption = selectedOptions[0];
    isCorrect = question.options.find(o => o.text === selectedOption)?.isCorrect || false;
  }

  let marksEarned = 0;
  if (isAttempted) {
    marksEarned = isCorrect ? (question.marks || 4) : -(question.negativeMarks || 1);
  }

  return { isCorrect, isAttempted, marksEarned };
}

export async function calculateResult(result) {
  const questions = await Question.find({ examId: result.examId });
  const questionMap = new Map(questions.map(q => [q._id.toString(), q]));
  const answerMap = new Map(result.answers.map(a => [a.questionId.toString(), a]));

  let totalScore = 0;
  let correctAnswers = 0;
  let wrongAnswers = 0;
  let unattempted = 0;
  const sectionScores = {};
  const timeAnalysis = [];

  for (const question of questions) {
    const answer = answerMap.get(question._id.toString());
    
    const section = question.section;
    if (!sectionScores[section]) {
      sectionScores[section] = { sectionName: section, score: 0, correct: 0, wrong: 0, unattempted: 0, timeSpent: 0 };
    }

    if (!answer) {
      unattempted++;
      sectionScores[section].unattempted++;
      continue;
    }

    const { isCorrect, isAttempted, marksEarned } = scoreAnswer(answer, question);

    if (!isAttempted) {
      unattempted++;
      sectionScores[section].unattempted++;
    } else if (isCorrect) {
      totalScore += marksEarned;
      correctAnswers++;
      sectionScores[section].score += marksEarned;
      sectionScores[section].correct++;
    } else {
      totalScore += marksEarned;
      wrongAnswers++;
      sectionScores[section].wrong++;
    }

    sectionScores[section].timeSpent += (answer.timeSpent || 0);

    timeAnalysis.push({
      questionId: question._id,
      questionNumber: question.questionNumber,
      timeSpent: answer.timeSpent || 0,
      difficulty: question.difficulty,
      isCorrect
    });
  }

  const attempted = correctAnswers + wrongAnswers;
  const accuracy = attempted > 0 ? (correctAnswers / attempted) * 100 : 0;

  const weakAreas = [];
  const strongAreas = [];
  Object.values(sectionScores).forEach(s => {
    const total = s.correct + s.wrong + s.unattempted;
    const sectionAccuracy = total > 0 ? s.correct / total : 0;
    if (sectionAccuracy < 0.5) weakAreas.push(s.sectionName);
    else if (sectionAccuracy > 0.8) strongAreas.push(s.sectionName);
  });

  return {
    totalScore, correctAnswers, wrongAnswers, unattempted, accuracy,
    sectionScores: Object.values(sectionScores),
    timeAnalysis, weakAreas, strongAreas
  };
}

export async function calculateRankAndPercentile(resultId, examId) {
  const Result = (await import('../models/Result.js')).default;

  const rankData = await Result.aggregate([
    { $match: { examId, status: 'completed' } },
    { $sort: { totalScore: -1, timeTaken: 1 } },
    {
      $group: {
        _id: null,
        results: { $push: { _id: '$_id', totalScore: '$totalScore' } },
        total: { $sum: 1 }
      }
    }
  ]);

  if (!rankData.length) return { rank: 1, percentile: 100, topperScore: 0 };

  const { results, total } = rankData[0];
  const rank = results.findIndex(r => r._id.toString() === resultId.toString()) + 1;
  const percentile = total > 0 ? ((total - rank) / total) * 100 : 0;
  const topperScore = results[0]?.totalScore || 0;

  return { rank, percentile, topperScore, difference: topperScore - (results[rank - 1]?.totalScore || 0) };
}
