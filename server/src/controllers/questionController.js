import Question from '../models/Question.js';
import Exam from '../models/Exam.js';
import { successResponse, errorResponse } from '../services/utils.js';

export async function getQuestionsByExam(req, res) {
  try {
    const { section } = req.query;
    let query = { examId: req.params.examId };
    if (section) query.section = section;

    const questions = await Question.find(query).select('-correctAnswer').sort({ questionNumber: 1 });
    successResponse(res, questions);
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function getQuestionsByExamAdmin(req, res) {
  try {
    const questions = await Question.find({ examId: req.params.examId }).sort({ questionNumber: 1 });
    successResponse(res, questions);
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function getQuestionById(req, res) {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return errorResponse(res, 'Question not found', 404);
    successResponse(res, question);
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function createQuestion(req, res) {
  try {
    const { examId, section, options, ...questionData } = req.body;

    const exam = await Exam.findById(examId);
    if (!exam) return errorResponse(res, 'Exam not found', 404);

    const sectionIndex = exam.sections.findIndex(s => s.name === section);
    if (sectionIndex === -1) return errorResponse(res, 'Section not found in exam', 400);

    const lastQuestion = await Question.findOne({ examId }).sort({ questionNumber: -1 });
    const questionNumber = lastQuestion ? lastQuestion.questionNumber + 1 : 1;

    const correctOption = options?.find(o => o.isCorrect);
    const correctAnswer = correctOption ? correctOption.text : null;

    const question = new Question({
      examId,
      section,
      questionNumber,
      options,
      correctAnswer,
      ...questionData
    });
    await question.save();

    exam.sections[sectionIndex].questions.push(question._id);
    await exam.save();

    successResponse(res, question, 'Question created successfully', 201);
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function createBulkQuestions(req, res) {
  try {
    const { questions, examId } = req.body;

    if (!examId || !questions || !Array.isArray(questions) || questions.length === 0) {
      return errorResponse(res, 'Exam ID and questions array are required', 400);
    }

    const exam = await Exam.findById(examId);
    if (!exam) return errorResponse(res, 'Exam not found', 404);

    const lastQuestion = await Question.findOne({ examId }).sort({ questionNumber: -1 });
    let questionNumber = lastQuestion ? lastQuestion.questionNumber + 1 : 1;

    const createdQuestions = [];
    const errors = [];

    for (const qData of questions) {
      const sectionIndex = exam.sections.findIndex(s => s.name === qData.section);
      if (sectionIndex === -1) {
        errors.push({ question: qData.questionText, error: 'Section not found' });
        continue;
      }

      try {
        const correctOption = qData.options?.find(o => o.isCorrect);
        const correctAnswer = correctOption ? correctOption.text : null;
        const question = new Question({
          examId,
          questionNumber: questionNumber++,
          ...qData,
          correctAnswer
        });
        await question.save();
        exam.sections[sectionIndex].questions.push(question._id);
        createdQuestions.push(question);
      } catch (err) {
        errors.push({ question: qData.questionText, error: err.message });
      }
    }

    await exam.save();

    successResponse(res, {
      created: createdQuestions.length,
      errors,
      questions: createdQuestions
    }, `${createdQuestions.length} questions created successfully`, 201);
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function updateQuestion(req, res) {
  try {
    const question = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!question) return errorResponse(res, 'Question not found', 404);
    successResponse(res, question, 'Question updated successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function deleteQuestion(req, res) {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return errorResponse(res, 'Question not found', 404);

    await Exam.findByIdAndUpdate(question.examId, {
      $pull: { 'sections.$[].questions': question._id }
    });

    await Question.findByIdAndDelete(req.params.id);
    successResponse(res, null, 'Question deleted successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function reorderQuestions(req, res) {
  try {
    const { questionOrders } = req.body;

    const bulkOps = questionOrders.map(({ questionId, newNumber }) => ({
      updateOne: { filter: { _id: questionId }, update: { questionNumber: newNumber } }
    }));

    await Question.bulkWrite(bulkOps);
    successResponse(res, null, 'Questions reordered successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
}
