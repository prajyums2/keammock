export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'institution_admin' | 'student';
  institutionId?: string;
  phone?: string;
  stream?: string;
  targetYear?: number;
}

export interface Institution {
  _id: string;
  name: string;
  code: string;
  email: string;
  phone?: string;
  address?: string;
  adminId?: string;
  isActive: boolean;
  maxStudents: number;
}

export interface Exam {
  _id: string;
  title: string;
  description: string;
  code: string;
  duration: number;
  totalMarks: number;
  passingMarks: number;
  negativeMarking: boolean;
  negativeMarksPerWrong: number;
  sections: Section[];
  instructions: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  institutionId?: string;
  createdBy: User;
  createdAt: string;
}

export interface Section {
  name: 'Mathematics' | 'Physics' | 'Chemistry';
  questions: string[];
  marksPerQuestion: number;
}

export interface Option {
  text: string;
  image?: string;
  isCorrect: boolean;
}

export interface Question {
  _id: string;
  examId: string;
  questionNumber: number;
  type: 'MCQ';
  section: 'Mathematics' | 'Physics' | 'Chemistry';
  questionText: string;
  questionImage?: string;
  options: Option[];
  correctAnswer?: string;
  marks: number;
  negativeMarks: number;
  solution?: {
    text: string;
    image?: string;
  };
  difficulty: 'easy' | 'medium' | 'hard';
  topic?: string;
}

export interface Answer {
  questionId: string;
  selectedOptions: string[];
  numericalAnswer: number | null;
  isMarkedForReview: boolean;
  isVisited: boolean;
  timeSpent: number;
}

export interface SectionScore {
  sectionName: string;
  score: number;
  correct: number;
  wrong: number;
  unattempted: number;
  timeSpent?: number;
}

export interface Result {
  _id: string;
  userId: string | User;
  examId: string | Exam;
  answers: Answer[];
  totalScore: number;
  correctAnswers: number;
  wrongAnswers: number;
  unattempted: number;
  sectionScores: SectionScore[];
  accuracy: number;
  rank?: number;
  percentile?: number;
  timeTaken: number;
  startedAt: string;
  submittedAt: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  tabSwitchCount?: number;
  fullscreenExitCount?: number;
  suspiciousActivity?: Array<{ type: string; details: string; timestamp: string }>;
  weakAreas?: string[];
  strongAreas?: string[];
  timeAnalysis?: Array<{
    questionId?: string;
    questionNumber?: number;
    timeSpent: number;
    difficulty?: string;
    isCorrect?: boolean;
  }>;
  comparisonWithTopper?: {
    topperScore: number;
    difference: number;
  };
}

export interface TestAssignment {
  _id: string;
  examId: string | Exam;
  userId: string | User;
  assignedBy: string | User;
  status: 'pending' | 'in_progress' | 'completed';
  attemptsAllowed: number;
  attemptsUsed: number;
  dueDate?: string;
  notes?: string;
  assignedAt: string;
  resultId?: string | Result;
}

export interface Bookmark {
  _id: string;
  userId: string | User;
  questionId: string | Question;
  examId: string | Exam;
  resultId?: string | Result;
  isCorrect: boolean;
  userAnswer?: any;
  correctAnswer?: any;
  notes?: string;
  tags?: string[];
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
}
