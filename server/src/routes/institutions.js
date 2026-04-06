import express from 'express';
import Institution from '../models/Institution.js';
import User from '../models/User.js';
import { auth, adminOnly } from '../middleware/auth.js';
import { successResponse, errorResponse } from '../services/utils.js';

const router = express.Router();

router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const { code, search } = req.query;
    let query = {};
    if (code) query.code = code;
    if (search) query.name = { $regex: search, $options: 'i' };
    const institutions = await Institution.find(query).sort({ createdAt: -1 });
    successResponse(res, institutions);
  } catch (error) {
    errorResponse(res, error.message);
  }
});

router.get('/stats', auth, adminOnly, async (req, res) => {
  try {
    const total = await Institution.countDocuments();
    const active = await Institution.countDocuments({ isActive: true });
    const students = await User.countDocuments({ role: 'student' });
    successResponse(res, { total, active, students });
  } catch (error) {
    errorResponse(res, error.message);
  }
});

router.get('/:id', auth, adminOnly, async (req, res) => {
  try {
    const institution = await Institution.findById(req.params.id);
    if (!institution) return errorResponse(res, 'Institution not found', 404);
    successResponse(res, institution);
  } catch (error) {
    errorResponse(res, error.message);
  }
});

router.get('/:id/students', auth, adminOnly, async (req, res) => {
  try {
    const students = await User.find({ institutionId: req.params.id, role: 'student' }).select('-password').sort({ createdAt: -1 });
    successResponse(res, students);
  } catch (error) {
    errorResponse(res, error.message);
  }
});

router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { name, code, email, phone, address, maxStudents } = req.body;
    const institution = new Institution({ name, code, email, phone, address, maxStudents });
    await institution.save();
    successResponse(res, institution, 'Institution created', 201);
  } catch (error) {
    errorResponse(res, error.message);
  }
});

router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const institution = await Institution.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!institution) return errorResponse(res, 'Institution not found', 404);
    successResponse(res, institution, 'Institution updated');
  } catch (error) {
    errorResponse(res, error.message);
  }
});

router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const institution = await Institution.findByIdAndDelete(req.params.id);
    if (!institution) return errorResponse(res, 'Institution not found', 404);
    successResponse(res, null, 'Institution deleted');
  } catch (error) {
    errorResponse(res, error.message);
  }
});

export default router;
