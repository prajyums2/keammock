import express from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/authController.js';
import { auth, adminOnly, superAdminOnly } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.post('/login', loginLimiter, [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], validate, authController.login);

router.get('/me', auth, authController.getMe);

// Admin-only: Create single user (any role)
router.post('/users', auth, adminOnly, [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('role').isIn(['super_admin', 'institution_admin', 'student']).withMessage('Valid role is required'),
], validate, authController.createUser);

// Admin-only: Bulk create users
router.post('/users/bulk', auth, adminOnly, [
  body('users').isArray({ min: 1, max: 500 }).withMessage('Users array (1-500) is required'),
], validate, authController.createBulkUsers);

// Admin-only: Legacy endpoint for students (still supported)
router.post('/students', auth, adminOnly, authController.createStudent);

// Admin-only: User management
router.get('/users', auth, adminOnly, authController.getAllUsers);
router.get('/users/:id', auth, adminOnly, authController.getUserById);
router.put('/users/:id', auth, adminOnly, authController.updateUser);
router.delete('/users/:id', auth, adminOnly, authController.deleteUser);
router.post('/users/:id/reset-password', auth, adminOnly, authController.resetPassword);
router.get('/stats/users', auth, adminOnly, authController.getUserStats);

export default router;
