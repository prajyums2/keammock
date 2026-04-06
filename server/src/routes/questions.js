import express from 'express';
import * as questionController from '../controllers/questionController.js';
import { auth, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/exam/:examId', auth, questionController.getQuestionsByExam);
router.get('/admin/exam/:examId', auth, adminOnly, questionController.getQuestionsByExamAdmin);
router.get('/:id', auth, questionController.getQuestionById);
router.post('/', auth, adminOnly, questionController.createQuestion);
router.post('/bulk', auth, adminOnly, questionController.createBulkQuestions);
router.put('/:id', auth, adminOnly, questionController.updateQuestion);
router.delete('/:id', auth, adminOnly, questionController.deleteQuestion);
router.post('/reorder/:examId', auth, adminOnly, questionController.reorderQuestions);

export default router;
