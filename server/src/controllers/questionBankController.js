import QuestionBank from '../models/QuestionBank.js';
import Exam from '../models/Exam.js';
import Question from '../models/Question.js';
import { successResponse, errorResponse, shuffleArray } from '../services/utils.js';

export async function getAllBankQuestions(req, res) {
  try {
    const { subject, topic, difficulty, type, search, limit = 50, page = 1 } = req.query;
    let query = {};

    if (subject) query.subject = subject;
    if (topic) query.topic = topic;
    if (difficulty) query.difficulty = difficulty;
    if (type) query.type = type;
    if (search) {
      query.$or = [
        { questionText: { $regex: search, $options: 'i' } },
        { topic: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const questions = await QuestionBank.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));
    const total = await QuestionBank.countDocuments(query);

    successResponse(res, { questions, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function getBankQuestionById(req, res) {
  try {
    const question = await QuestionBank.findById(req.params.id);
    if (!question) return errorResponse(res, 'Question not found', 404);
    successResponse(res, question);
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function createBankQuestion(req, res) {
  try {
    const question = new QuestionBank({ ...req.body, createdBy: req.userId });
    await question.save();
    successResponse(res, question, 'Question added to bank', 201);
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function importQuestions(req, res) {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return errorResponse(res, 'Questions array is required', 400);
    }

    const validQuestions = [];
    const errors = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText || !q.type || !q.subject || !q.topic) {
        errors.push({ index: i, error: 'Missing required fields' });
        continue;
      }
      if ((q.type === 'MCQ' || q.type === 'MSQ') && (!q.options || q.options.length < 2)) {
        errors.push({ index: i, error: 'MCQ/MSQ must have at least 2 options' });
        continue;
      }
      if (q.type === 'MCQ' && !q.options?.some(o => o.isCorrect)) {
        errors.push({ index: i, error: 'MCQ must have one correct answer' });
        continue;
      }
      validQuestions.push({ ...q, createdBy: req.userId, createdAt: new Date(), updatedAt: new Date() });
    }

    if (validQuestions.length === 0) {
      return errorResponse(res, 'No valid questions to import', 400, errors);
    }

    const createdQuestions = await QuestionBank.insertMany(validQuestions);
    successResponse(res, {
      imported: createdQuestions.length, errors, questions: createdQuestions
    }, `${createdQuestions.length} questions imported successfully`, 201);
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function addToExam(req, res) {
  try {
    const { examId, questionIds, section, shuffleOptions } = req.body;

    const exam = await Exam.findById(examId);
    if (!exam) return errorResponse(res, 'Exam not found', 404);

    const sectionIndex = exam.sections.findIndex(s => s.name === section);
    if (sectionIndex === -1) return errorResponse(res, 'Section not found', 400);

    const bankQuestions = await QuestionBank.find({ _id: { $in: questionIds } });
    const lastQuestion = await Question.findOne({ examId }).sort({ questionNumber: -1 });
    let questionNumber = lastQuestion ? lastQuestion.questionNumber + 1 : 1;

    const questionsToInsert = bankQuestions.map(bankQ => {
      let options = [...bankQ.options];
      if (shuffleOptions && (bankQ.type === 'MCQ' || bankQ.type === 'MSQ')) {
        options = shuffleArray(options);
      }
      return {
        examId, questionNumber: questionNumber++, type: bankQ.type, section,
        questionText: bankQ.questionText, questionImage: bankQ.questionImage,
        options, correctAnswer: bankQ.correctAnswer, marks: bankQ.marks,
        negativeMarks: bankQ.negativeMarks, solution: bankQ.solution,
        difficulty: bankQ.difficulty, topic: bankQ.topic
      };
    });

    const insertedQuestions = await Question.insertMany(questionsToInsert);

    insertedQuestions.forEach(q => {
      exam.sections[sectionIndex].questions.push(q._id);
    });
    await exam.save();

    await QuestionBank.updateMany(
      { _id: { $in: questionIds } },
      { $inc: { usageCount: 1 } }
    );

    successResponse(res, insertedQuestions, `${insertedQuestions.length} questions added to exam`);
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function updateBankQuestion(req, res) {
  try {
    const question = await QuestionBank.findByIdAndUpdate(
      req.params.id, { ...req.body, updatedAt: Date.now() }, { new: true }
    );
    if (!question) return errorResponse(res, 'Question not found', 404);
    successResponse(res, question, 'Question updated');
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function deleteBankQuestion(req, res) {
  try {
    const question = await QuestionBank.findByIdAndDelete(req.params.id);
    if (!question) return errorResponse(res, 'Question not found', 404);
    successResponse(res, null, 'Question deleted from bank');
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function getBankStats(req, res) {
  try {
    const subjectStats = await QuestionBank.aggregate([
      { $group: { _id: '$subject', count: { $sum: 1 } } }
    ]);
    const topicStats = await QuestionBank.aggregate([
      { $group: { _id: '$topic', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    const total = await QuestionBank.countDocuments();

    successResponse(res, { total, bySubject: subjectStats, byTopic: topicStats });
  } catch (error) {
    errorResponse(res, error.message);
  }
}
