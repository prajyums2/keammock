import Result from '../models/Result.js';

export async function getAnalytics(resultId, userId) {
  const result = await Result.findById(resultId)
    .populate('examId')
    .populate('answers.questionId');

  if (!result || result.userId.toString() !== userId) {
    return null;
  }

  const topperResult = await Result.findOne({
    examId: result.examId._id,
    status: 'completed'
  }).sort({ totalScore: -1 }).limit(1);

  const weakAreas = [];
  const strongAreas = [];

  result.sectionScores?.forEach(section => {
    const total = section.correct + section.wrong + section.unattempted;
    const accuracy = total > 0 ? section.correct / total : 0;
    if (accuracy < 0.5) weakAreas.push(section.sectionName);
    else if (accuracy > 0.8) strongAreas.push(section.sectionName);
  });

  const timeAnalysis = result.answers.map(a => ({
    questionId: a.questionId?._id,
    questionNumber: a.questionId?.questionNumber,
    timeSpent: a.timeSpent,
    difficulty: a.questionId?.difficulty,
    isCorrect: a.selectedOptions?.length > 0 &&
      ((a.questionId?.type !== 'NAT' && a.questionId?.options?.find(o => o.text === a.selectedOptions[0])?.isCorrect) ||
       (a.questionId?.type === 'NAT' && a.numericalAnswer >= a.questionId?.correctAnswer?.min &&
        a.numericalAnswer <= a.questionId?.correctAnswer?.max))
  }));

  return {
    ...result.toObject(),
    topperScore: topperResult?.totalScore || 0,
    difference: (topperResult?.totalScore || 0) - result.totalScore,
    weakAreas,
    strongAreas,
    timeAnalysis,
    averageTimePerQuestion: result.timeTaken / (result.answers.length || 1),
    fastestQuestion: timeAnalysis.length > 0 ? timeAnalysis.reduce((min, curr) => curr.timeSpent < min.timeSpent ? curr : min, timeAnalysis[0]) : null,
    slowestQuestion: timeAnalysis.length > 0 ? timeAnalysis.reduce((max, curr) => curr.timeSpent > max.timeSpent ? curr : max, timeAnalysis[0]) : null
  };
}

export async function getLeaderboard(examId, limit = 100) {
  return Result.find({ examId, status: 'completed' })
    .populate('userId', 'name college')
    .sort({ totalScore: -1, timeTaken: 1 })
    .limit(limit);
}

export async function getComparison(examId, userId) {
  const myResult = await Result.findOne({ userId, examId, status: 'completed' });
  const topPerformers = await Result.find({ examId, status: 'completed' })
    .populate('userId', 'name')
    .sort({ totalScore: -1, timeTaken: 1 })
    .limit(10);

  return { myResult, topPerformers };
}
