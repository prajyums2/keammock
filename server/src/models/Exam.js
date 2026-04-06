import mongoose from 'mongoose';

const examSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  code: { type: String, required: true },
  institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution' },
  duration: { type: Number, required: true },
  totalMarks: { type: Number, required: true },
  passingMarks: { type: Number, default: 0 },
  negativeMarking: { type: Boolean, default: true },
  negativeMarksPerWrong: { type: Number, default: 1 },
  sections: [{
    name: String,
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
    marksPerQuestion: Number
  }],
  instructions: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  allowShuffle: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

examSchema.index({ institutionId: 1, isActive: 1 });
examSchema.index({ code: 1 });

export default mongoose.model('Exam', examSchema);
