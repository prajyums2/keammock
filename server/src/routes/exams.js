import express from 'express';
import * as examController from '../controllers/examController.js';
import { auth, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, examController.getAllExams);
router.get('/stats/:id', auth, adminOnly, examController.getExamStats);
router.get('/:id', auth, examController.getExamById);
router.post('/', auth, adminOnly, examController.createExam);
router.put('/:id', auth, adminOnly, examController.updateExam);
router.delete('/:id', auth, adminOnly, examController.deleteExam);
router.get('/:id/questions', auth, examController.getExamQuestions);
router.post('/:id/duplicate', auth, adminOnly, examController.duplicateExam);

export default router;
