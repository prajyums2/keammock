import mongoose from 'mongoose';

const bookmarkSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  resultId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Result',
    required: true
  },
  isCorrect: {
    type: Boolean,
    required: true
  },
  userAnswer: {
    type: mongoose.Schema.Types.Mixed
  },
  correctAnswer: {
    type: mongoose.Schema.Types.Mixed
  },
  notes: {
    type: String,
    default: ''
  },
  tags: [String],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
bookmarkSchema.index({ userId: 1, isCorrect: 1 });
bookmarkSchema.index({ userId: 1, examId: 1 });

export default mongoose.model('Bookmark', bookmarkSchema);