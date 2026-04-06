import express from 'express';
import * as bookmarkController from '../controllers/bookmarkController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.get('/my-mistakes', auth, bookmarkController.getMyMistakes);
router.get('/all', auth, bookmarkController.getAllBookmarks);
router.get('/stats/overview', auth, bookmarkController.getBookmarkStats);
router.post('/', auth, bookmarkController.createBookmark);
router.put('/:id', auth, bookmarkController.updateBookmark);
router.delete('/:id', auth, bookmarkController.deleteBookmark);

export default router;
