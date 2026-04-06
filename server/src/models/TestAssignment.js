import mongoose from 'mongoose';

const testAssignmentSchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'expired'],
    default: 'pending'
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  startDate: {
    type: Date,
    default: null
  },
  dueDate: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  resultId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Result',
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  attemptsAllowed: {
    type: Number,
    default: 1
  },
  attemptsUsed: {
    type: Number,
    default: 0
  }
});

testAssignmentSchema.index({ examId: 1, userId: 1 }, { unique: true });

export default mongoose.model('TestAssignment', testAssignmentSchema);
