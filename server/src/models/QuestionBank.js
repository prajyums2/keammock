import mongoose from 'mongoose';

const questionBankSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true
  },
  questionImage: {
    type: String,
    default: null
  },
  type: {
    type: String,
    enum: ['MCQ', 'MSQ', 'NAT'],
    default: 'MCQ'
  },
  subject: {
    type: String,
    required: true,
    enum: ['Mathematics', 'Physics', 'Chemistry']
  },
  topic: {
    type: String,
    required: true
  },
  subtopic: {
    type: String,
    default: ''
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  options: [{
    text: String,
    image: String,
    isCorrect: Boolean
  }],
  correctAnswer: {
    type: mongoose.Schema.Types.Mixed
  },
  marks: {
    type: Number,
    default: 1
  },
  negativeMarks: {
    type: Number,
    default: 0
  },
  solution: {
    text: String,
    image: String,
    videoUrl: String
  },
  explanation: {
    type: String,
    default: ''
  },
  hints: [String],
  tags: [String],
  year: {
    type: Number,
    default: null
  },
  source: {
    type: String,
    default: ''
  },
  usageCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster searching
questionBankSchema.index({ subject: 1, topic: 1, difficulty: 1 });
questionBankSchema.index({ tags: 1 });
questionBankSchema.index({ type: 1 });

export default mongoose.model('QuestionBank', questionBankSchema);