import express from 'express';
import * as resultController from '../controllers/resultController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.get('/my-results', auth, resultController.getMyResults);
router.get('/:id', auth, resultController.getResultById);
router.get('/:id/analytics', auth, resultController.getResultAnalytics);
router.post('/start', auth, resultController.startTest);
router.post('/save-progress', auth, resultController.saveProgress);
router.post('/submit', auth, resultController.submitTest);
router.get('/leaderboard/:examId', auth, resultController.getLeaderboard);
router.get('/compare/:examId', auth, resultController.getComparison);

export default router;
