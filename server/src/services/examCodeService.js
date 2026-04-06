import Exam from '../models/Exam.js';

export async function generateExamCode(subject) {
  const prefix = subject.substring(0, 3).toUpperCase();
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');

  const count = await Exam.countDocuments({
    code: { $regex: `^${prefix}${year}${month}` }
  });

  const sequence = String(count + 1).padStart(3, '0');
  return `${prefix}${year}${month}${sequence}`;
}
