import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  questionNumber: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['MCQ', 'MSQ', 'NAT'],
    default: 'MCQ'
  },
  section: {
    type: String,
    required: true,
    enum: ['Mathematics', 'Physics', 'Chemistry']
  },
  questionText: {
    type: String,
    required: true
  },
  questionImage: {
    type: String,
    default: null
  },
  options: [{
    text: String,
    image: String,
    isCorrect: Boolean
  }],
  correctAnswer: {
    type: String
  },
  marks: {
    type: Number,
    default: 4
  },
  negativeMarks: {
    type: Number,
    default: 1
  },
  solution: {
    text: String,
    image: String
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  topic: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Question', questionSchema);
