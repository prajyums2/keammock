import mongoose from 'mongoose';

export async function createIndexes() {
  try {
    const collections = mongoose.connection.db.collections();
    
    const Result = mongoose.model('Result');
    await Result.collection.createIndex({ userId: 1 });
    await Result.collection.createIndex({ examId: 1 });
    await Result.collection.createIndex({ status: 1 });
    await Result.collection.createIndex({ examId: 1, status: 1 });
    await Result.collection.createIndex({ examId: 1, totalScore: -1 });
    await Result.collection.createIndex({ submittedAt: -1 });

    const Exam = mongoose.model('Exam');
    await Exam.collection.createIndex({ isActive: 1 });
    await Exam.collection.createIndex({ code: 1 }, { unique: true });
    await Exam.collection.createIndex({ subject: 1 });

    const TestAssignment = mongoose.model('TestAssignment');
    await TestAssignment.collection.createIndex({ userId: 1 });
    await TestAssignment.collection.createIndex({ examId: 1 });
    await TestAssignment.collection.createIndex({ userId: 1, examId: 1 }, { unique: true });
    await TestAssignment.collection.createIndex({ status: 1 });

    const User = mongoose.model('User');
    await User.collection.createIndex({ email: 1 }, { unique: true });

    const Question = mongoose.model('Question');
    await Question.collection.createIndex({ examId: 1 });
    await Question.collection.createIndex({ examId: 1, section: 1 });

    const Bookmark = mongoose.model('Bookmark');
    await Bookmark.collection.createIndex({ userId: 1 });
    await Bookmark.collection.createIndex({ userId: 1, questionId: 1 }, { unique: true });

    const Device = mongoose.model('Device');
    await Device.collection.createIndex({ userId: 1 });
    await Device.collection.createIndex({ deviceId: 1 });

    console.log('✅ MongoDB indexes created');
  } catch (error) {
    console.error('❌ Error creating indexes:', error.message);
  }
}
