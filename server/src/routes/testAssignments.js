import express from 'express';
import * as assignmentController from '../controllers/assignmentController.js';
import { auth, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/all', auth, adminOnly, assignmentController.getAllAssignments);
router.get('/my-assignments', auth, assignmentController.getMyAssignments);
router.post('/', auth, adminOnly, assignmentController.createAssignments);
router.put('/:id', auth, adminOnly, assignmentController.updateAssignment);
router.delete('/:id', auth, adminOnly, assignmentController.deleteAssignment);
router.get('/can-take/:examId', auth, assignmentController.canTakeTest);
router.get('/stats/:examId', auth, adminOnly, assignmentController.getAssignmentStats);

export default router;
