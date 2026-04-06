import express from 'express';
import * as questionBankController from '../controllers/questionBankController.js';
import { auth, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, adminOnly, questionBankController.getAllBankQuestions);
router.get('/stats/overview', auth, adminOnly, questionBankController.getBankStats);
router.get('/:id', auth, adminOnly, questionBankController.getBankQuestionById);
router.post('/', auth, adminOnly, questionBankController.createBankQuestion);
router.post('/import-json', auth, adminOnly, questionBankController.importQuestions);
router.post('/add-to-exam', auth, adminOnly, questionBankController.addToExam);
router.put('/:id', auth, adminOnly, questionBankController.updateBankQuestion);
router.delete('/:id', auth, adminOnly, questionBankController.deleteBankQuestion);

export default router;
