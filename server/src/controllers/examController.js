import Exam from '../models/Exam.js';
import Question from '../models/Question.js';
import { successResponse, errorResponse, shuffleArray } from '../services/utils.js';
import { generateExamCode } from '../services/examCodeService.js';

function getInstitutionFilter(req) {
  if (req.userRole === 'super_admin') return {};
  return { institutionId: req.institutionId };
}

export async function getAllExams(req, res) {
  try {
    const { active, search } = req.query;
    let query = getInstitutionFilter(req);

    if (active === 'true') {
      query.isActive = true;
      query.$and = [
        { $or: [{ startDate: null }, { startDate: { $lte: new Date() } }] },
        { $or: [{ endDate: null }, { endDate: { $gte: new Date() } }] }
      ];
    }
    if (search) query.$or = [{ title: { $regex: search, $options: 'i' } }, { code: { $regex: search, $options: 'i' } }];

    const exams = await Exam.find(query).populate('createdBy', 'name').sort({ createdAt: -1 });
    successResponse(res, exams);
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function getExamById(req, res) {
  try {
    const exam = await Exam.findById(req.params.id).populate('createdBy', 'name').populate('sections.questions');
    if (!exam) return errorResponse(res, 'Exam not found', 404);
    successResponse(res, exam);
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function createExam(req, res) {
  try {
    const { sections, ...examData } = req.body;
    const keamSections = sections || [
      { name: 'Mathematics', marksPerQuestion: 4 },
      { name: 'Physics', marksPerQuestion: 4 },
      { name: 'Chemistry', marksPerQuestion: 4 }
    ];
    const examCode = await generateExamCode('KEAM');
    const exam = new Exam({
      ...examData,
      code: examCode,
      institutionId: req.institutionId,
      sections: keamSections,
      createdBy: req.userId
    });
    await exam.save();
    successResponse(res, exam, 'Exam created', 201);
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function updateExam(req, res) {
  try {
    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.id, ...getInstitutionFilter(req) },
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    ).populate('sections.questions');
    if (!exam) return errorResponse(res, 'Exam not found', 404);
    successResponse(res, exam, 'Exam updated');
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function deleteExam(req, res) {
  try {
    const exam = await Exam.findOneAndDelete({ _id: req.params.id, ...getInstitutionFilter(req) });
    if (!exam) return errorResponse(res, 'Exam not found', 404);
    await Question.deleteMany({ examId: req.params.id });
    successResponse(res, null, 'Exam deleted');
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function getExamQuestions(req, res) {
  try {
    const { section, shuffle } = req.query;
    let query = { examId: req.params.id };
    if (section) query.section = section;
    let questions = await Question.find(query).select('-correctAnswer -solution').sort({ questionNumber: 1 });
    if (shuffle === 'true') questions = shuffleArray(questions);
    successResponse(res, questions);
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function getExamStats(req, res) {
  try {
    const exam = await Exam.findOne({ _id: req.params.id, ...getInstitutionFilter(req) });
    if (!exam) return errorResponse(res, 'Exam not found', 404);
    const totalQuestions = await Question.countDocuments({ examId: req.params.id });
    successResponse(res, { totalQuestions, totalMarks: exam.totalMarks, sections: exam.sections?.length || 0 });
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function duplicateExam(req, res) {
  try {
    const originalExam = await Exam.findOne({ _id: req.params.id, ...getInstitutionFilter(req) });
    if (!originalExam) return errorResponse(res, 'Exam not found', 404);

    const newCode = await generateExamCode('KEAM');
    const newExam = new Exam({
      title: `${originalExam.title} (Copy)`,
      code: newCode,
      description: originalExam.description,
      institutionId: req.institutionId,
      duration: originalExam.duration,
      totalMarks: originalExam.totalMarks,
      passingMarks: originalExam.passingMarks,
      negativeMarking: originalExam.negativeMarking,
      negativeMarksPerWrong: originalExam.negativeMarksPerWrong,
      sections: originalExam.sections.map(s => ({ ...s.toObject(), questions: [] })),
      instructions: originalExam.instructions,
      isActive: false,
      createdBy: req.userId
    });
    await newExam.save();

    const originalQuestions = await Question.find({ examId: req.params.id });
    const newQuestions = originalQuestions.map(q => ({
      examId: newExam._id, questionNumber: q.questionNumber, type: 'MCQ', section: q.section,
      questionText: q.questionText, questionImage: q.questionImage, options: q.options,
      correctAnswer: q.correctAnswer, marks: q.marks, negativeMarks: q.negativeMarks,
      solution: q.solution, difficulty: q.difficulty, topic: q.topic
    }));
    const insertedQuestions = await Question.insertMany(newQuestions);
    insertedQuestions.forEach((q, idx) => {
      const sectionIdx = newExam.sections.findIndex(s => s.name === originalQuestions[idx].section);
      if (sectionIdx !== -1) newExam.sections[sectionIdx].questions.push(q._id);
    });
    await newExam.save();
    successResponse(res, newExam, 'Exam duplicated', 201);
  } catch (error) {
    errorResponse(res, error.message);
  }
}
