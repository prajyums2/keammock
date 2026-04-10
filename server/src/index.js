import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import examRoutes from './routes/exams.js';
import questionRoutes from './routes/questions.js';
import resultRoutes from './routes/results.js';
import questionBankRoutes from './routes/questionBank.js';
import testAssignmentRoutes from './routes/testAssignments.js';
import adminRoutes from './routes/admin.js';
import bookmarkRoutes from './routes/bookmarks.js';
import deviceRoutes from './routes/devices.js';
import institutionRoutes from './routes/institutions.js';
import { seedAdmin } from './seed/seedAdmin.js';
import { createIndexes } from './services/indexService.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Rate limiting for all API routes
app.use('/api/', apiLimiter);

// Database connection
let dbConnection = null;

async function connectDB() {
  try {
    dbConnection = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/keam_mock');
    console.log('MongoDB connected');
    await seedAdmin();
    await createIndexes();
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
}

connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/question-bank', questionBankRoutes);
app.use('/api/assignments', testAssignmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/institutions', institutionRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(async () => {
    if (dbConnection) {
      await mongoose.connection.close();
    }
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(async () => {
    if (dbConnection) {
      await mongoose.connection.close();
    }
    console.log('Server closed');
    process.exit(0);
  });
});
