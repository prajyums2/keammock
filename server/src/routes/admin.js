import express from 'express';
import * as adminController from '../controllers/adminController.js';
import { auth, adminOnly } from '../middleware/auth.js';
import Result from '../models/Result.js';
import Exam from '../models/Exam.js';

const router = express.Router();

router.get('/submissions', auth, adminOnly, adminController.getSubmissions);
router.get('/submission/:id', auth, adminOnly, adminController.getSubmissionById);
router.put('/submission/:id', auth, adminOnly, adminController.updateResult);
router.post('/submission/:id/recalculate', auth, adminOnly, adminController.recalculateResult);
router.get('/stats/overview', auth, adminOnly, adminController.getOverviewStats);
router.get('/stats/exam/:examId', auth, adminOnly, adminController.getExamStats);
router.get('/export/:examId', auth, adminOnly, adminController.exportSubmissions);
router.get('/devices/:userId', auth, adminOnly, adminController.getUserDevices);
router.delete('/devices/:deviceId', auth, adminOnly, adminController.deleteDevice);

router.get('/debug/status', auth, adminOnly, async (req, res) => {
  try {
    const totalResults = await Result.countDocuments({});
    const totalExams = await Exam.countDocuments({});
    const completedResults = await Result.countDocuments({ status: 'completed' });
    
    const results = await Result.find({}).limit(5).lean();
    const exams = await Exam.find({}).select('_id title institutionId').limit(5).lean();
    
    res.json({
      success: true,
      data: {
        totalResults,
        totalExams,
        completedResults,
        userRole: req.userRole,
        userInstitutionId: req.institutionId,
        sampleResults: results.map(r => ({ _id: r._id, examId: r.examId, userId: r.userId, status: r.status, institutionId: r.institutionId })),
        sampleExams: exams
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
