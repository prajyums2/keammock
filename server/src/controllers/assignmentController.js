import TestAssignment from '../models/TestAssignment.js';
import Exam from '../models/Exam.js';
import Result from '../models/Result.js';
import mongoose from 'mongoose';
import { successResponse, errorResponse } from '../services/utils.js';

export async function getAllAssignments(req, res) {
  try {
    const { examId, userId, status, limit = 200 } = req.query;
    let query = {};
    
    if (examId) query.examId = examId;
    if (userId) query.userId = userId;
    if (status) query.status = status;
    
    // For institution_admin, filter by their institution's exams
    if (req.userRole === 'institution_admin') {
      const instExams = await Exam.find({ institutionId: req.institutionId }).select('_id');
      query.examId = { $in: instExams.map(e => e._id) };
      if (examId) query.examId = examId; // Override if specific examId provided
    }

    const assignments = await TestAssignment.find(query)
      .populate('examId', 'title code subject duration totalMarks sections')
      .populate('userId', 'name email institutionId')
      .populate('assignedBy', 'name')
      .populate('resultId')
      .sort({ assignedAt: -1 })
      .limit(parseInt(limit));
    successResponse(res, { assignments, total: assignments.length });
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function getMyAssignments(req, res) {
  try {
    const assignments = await TestAssignment.find({ userId: req.userId })
      .populate('examId', 'title code subject duration totalMarks sections isActive')
      .populate('assignedBy', 'name')
      .sort({ assignedAt: -1 });
    successResponse(res, assignments);
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function createAssignments(req, res) {
  try {
    const { examId, userIds, startDate, dueDate, notes, attemptsAllowed } = req.body;
    if (!examId) return errorResponse(res, 'Exam ID is required', 400);
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return errorResponse(res, 'User IDs array is required', 400);
    }
    const exam = await Exam.findById(examId);
    if (!exam) return errorResponse(res, 'Exam not found', 404);

    const assignments = [];
    const errors = [];
    for (const userId of userIds) {
      try {
        const assignment = new TestAssignment({
          examId, 
          userId, 
          assignedBy: req.userId,
          startDate: startDate ? new Date(startDate) : null,
          dueDate: dueDate ? new Date(dueDate) : null,
          notes, 
          attemptsAllowed: attemptsAllowed || 1
        });
        await assignment.save();
        assignments.push(assignment);
      } catch (err) {
        if (err.code === 11000) {
          errors.push({ userId, error: 'Test already assigned to this user' });
        } else {
          errors.push({ userId, error: err.message });
        }
      }
    }
    successResponse(res, { assignments, errors }, `${assignments.length} assignments created`, 201);
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function deleteAssignment(req, res) {
  try {
    const assignment = await TestAssignment.findByIdAndDelete(req.params.id);
    if (!assignment) return errorResponse(res, 'Assignment not found', 404);
    successResponse(res, null, 'Assignment removed');
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function updateAssignment(req, res) {
  try {
    const { startDate, dueDate, status, attemptsAllowed, notes, resetAttempts } = req.body;
    const assignment = await TestAssignment.findById(req.params.id);
    if (!assignment) return errorResponse(res, 'Assignment not found', 404);

    if (startDate !== undefined) assignment.startDate = startDate ? new Date(startDate) : null;
    if (dueDate !== undefined) assignment.dueDate = dueDate ? new Date(dueDate) : null;
    if (status !== undefined) assignment.status = status;
    if (attemptsAllowed !== undefined) assignment.attemptsAllowed = attemptsAllowed;
    if (notes !== undefined) assignment.notes = notes;
    if (resetAttempts === true) assignment.attemptsUsed = 0;

    if (status === 'completed') assignment.completedAt = new Date();
    
    await assignment.save();
    const populated = await TestAssignment.findById(assignment._id)
      .populate('examId', 'title code subject duration totalMarks sections')
      .populate('userId', 'name email')
      .populate('assignedBy', 'name');
    
    successResponse(res, populated, 'Assignment updated successfully');
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function canTakeTest(req, res) {
  try {
    const assignment = await TestAssignment.findOne({ examId: req.params.examId, userId: req.userId });
    if (!assignment) {
      return successResponse(res, { canTake: false, reason: 'Test not assigned to you', assignment: null });
    }
    
    if (assignment.status === 'completed' && assignment.attemptsUsed >= assignment.attemptsAllowed) {
      return successResponse(res, { canTake: false, reason: 'Maximum attempts reached', assignment });
    }
    
    if (assignment.startDate && new Date() < new Date(assignment.startDate)) {
      return successResponse(res, { 
        canTake: false, 
        reason: `Test not available yet. Starts on ${new Date(assignment.startDate).toLocaleDateString()}`, 
        assignment,
        startsAt: assignment.startDate 
      });
    }
    
    if (assignment.dueDate && new Date() > new Date(assignment.dueDate)) {
      return successResponse(res, { canTake: false, reason: 'Assignment expired', assignment });
    }
    
    successResponse(res, {
      canTake: true, 
      assignment,
      attemptsRemaining: assignment.attemptsAllowed - assignment.attemptsUsed
    });
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function getAssignmentStats(req, res) {
  try {
    const examId = req.params.examId;
    const stats = await TestAssignment.aggregate([
      { $match: { examId: new mongoose.Types.ObjectId(examId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const totalAssigned = await TestAssignment.countDocuments({ examId });
    const completed = await TestAssignment.countDocuments({ examId, status: 'completed' });
    const pending = await TestAssignment.countDocuments({ examId, status: 'pending' });
    const inProgress = await TestAssignment.countDocuments({ examId, status: 'in_progress' });
    const results = await Result.find({ examId, status: 'completed' });
    const avgScore = results.length > 0 ? results.reduce((acc, r) => acc + r.totalScore, 0) / results.length : 0;
    successResponse(res, {
      totalAssigned, completed, pending, inProgress,
      completionRate: totalAssigned > 0 ? ((completed / totalAssigned) * 100).toFixed(1) : 0,
      averageScore: avgScore.toFixed(2),
      statusBreakdown: stats
    });
  } catch (error) {
    errorResponse(res, error.message);
  }
}
