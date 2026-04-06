import mongoose from 'mongoose';

const resultSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  institutionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    default: null
  },
  answers: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question'
    },
    selectedOptions: [String],
    numericalAnswer: Number,
    isMarkedForReview: Boolean,
    isVisited: Boolean,
    timeSpent: Number,
    submittedAt: Date
  }],
  totalScore: {
    type: Number,
    default: 0
  },
  correctAnswers: {
    type: Number,
    default: 0
  },
  wrongAnswers: {
    type: Number,
    default: 0
  },
  unattempted: {
    type: Number,
    default: 0
  },
  sectionScores: [{
    sectionName: String,
    score: Number,
    correct: Number,
    wrong: Number,
    unattempted: Number,
    timeSpent: Number
  }],
  accuracy: {
    type: Number,
    default: 0
  },
  rank: {
    type: Number,
    default: null
  },
  percentile: {
    type: Number,
    default: null
  },
  timeTaken: {
    type: Number,
    default: 0
  },
  startedAt: {
    type: Date,
    required: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'abandoned', 'timed_out'],
    default: 'in_progress'
  },
  tabSwitchCount: {
    type: Number,
    default: 0
  },
  fullscreenExitCount: {
    type: Number,
    default: 0
  },
  suspiciousActivity: [{
    type: { type: String },
    timestamp: Date,
    details: String
  }],
  timeAnalysis: [{
    questionId: mongoose.Schema.Types.ObjectId,
    timeSpent: Number,
    difficulty: String
  }],
  weakAreas: [String],
  strongAreas: [String],
  comparisonWithTopper: {
    topperScore: Number,
    difference: Number
  }
});

resultSchema.index({ userId: 1, examId: 1 });
resultSchema.index({ examId: 1, status: 1 });
resultSchema.index({ institutionId: 1 });
resultSchema.index({ status: 1, submittedAt: -1 });

export default mongoose.model('Result', resultSchema);