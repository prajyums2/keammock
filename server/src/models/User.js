import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['super_admin', 'institution_admin', 'student'],
    default: 'student'
  },
  institutionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    default: null
  },
  phone: {
    type: String,
    default: ''
  },
  stream: {
    type: String,
    default: 'PCM'
  },
  targetYear: {
    type: Number,
    default: null
  },
  examsTaken: [{
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam'
    },
    score: Number,
    rank: Number,
    completedAt: Date
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('User', userSchema);
