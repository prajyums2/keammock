import Bookmark from '../models/Bookmark.js';
import Result from '../models/Result.js';
import mongoose from 'mongoose';
import { successResponse, errorResponse } from '../services/utils.js';

export async function getMyMistakes(req, res) {
  try {
    const { page = 1, limit = 20, subject, topic } = req.query;

    let query = { userId: req.userId, isCorrect: false };
    if (subject) query.subject = subject;
    if (topic) query.topic = topic;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const bookmarks = await Bookmark.find(query)
      .populate('questionId')
      .populate('examId', 'title subject code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Bookmark.countDocuments(query);

    const stats = await Bookmark.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.userId), isCorrect: false } },
      { $group: { _id: '$examId', count: { $sum: 1 } } }
    ]);

    successResponse(res, {
      bookmarks, total, stats,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function getAllBookmarks(req, res) {
  try {
    const { page = 1, limit = 20, isCorrect } = req.query;

    let query = { userId: req.userId };
    if (isCorrect !== undefined) {
      query.isCorrect = isCorrect === 'true';
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const bookmarks = await Bookmark.find(query)
      .populate('questionId')
      .populate('examId', 'title subject code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Bookmark.countDocuments(query);

    successResponse(res, {
      bookmarks, total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function createBookmark(req, res) {
  try {
    const { questionId, examId, resultId, isCorrect, userAnswer, correctAnswer, notes, tags } = req.body;

    const existing = await Bookmark.findOne({ userId: req.userId, questionId });

    if (existing) {
      existing.isCorrect = isCorrect;
      existing.userAnswer = userAnswer;
      existing.correctAnswer = correctAnswer;
      if (notes) existing.notes = notes;
      if (tags) existing.tags = tags;
      await existing.save();
      return successResponse(res, existing, 'Bookmark updated');
    }

    const bookmark = new Bookmark({
      userId: req.userId, questionId, examId, resultId,
      isCorrect, userAnswer, correctAnswer, notes, tags
    });

    await bookmark.save();
    successResponse(res, bookmark, 'Bookmark created', 201);
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function updateBookmark(req, res) {
  try {
    const { notes, tags } = req.body;

    const bookmark = await Bookmark.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { notes, tags },
      { new: true }
    );

    if (!bookmark) return errorResponse(res, 'Bookmark not found', 404);
    successResponse(res, bookmark, 'Bookmark updated');
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function deleteBookmark(req, res) {
  try {
    const bookmark = await Bookmark.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });

    if (!bookmark) return errorResponse(res, 'Bookmark not found', 404);
    successResponse(res, null, 'Bookmark deleted');
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function getBookmarkStats(req, res) {
  try {
    const totalMistakes = await Bookmark.countDocuments({ userId: req.userId, isCorrect: false });
    const totalBookmarks = await Bookmark.countDocuments({ userId: req.userId });

    const mistakesByExam = await Bookmark.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.userId), isCorrect: false } },
      { $group: { _id: '$examId', count: { $sum: 1 } } },
      { $lookup: { from: 'exams', localField: '_id', foreignField: '_id', as: 'exam' } },
      { $unwind: '$exam' },
      { $project: { examTitle: '$exam.title', count: 1 } }
    ]);

    successResponse(res, { totalMistakes, totalBookmarks, mistakesByExam });
  } catch (error) {
    errorResponse(res, error.message);
  }
}
