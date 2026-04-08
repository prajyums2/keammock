import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

const unwrap = (res: any) => res.data?.data || res.data;

export const authAPI = {
  login: (data: any) => api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/students', data),
  createUser: (data: any) => api.post('/auth/users', data),
  createBulkUsers: (data: any) => api.post('/auth/users/bulk', data),
  createStudent: (data: any) => api.post('/auth/students', data),
  createBulkStudents: (data: any) => api.post('/auth/users/bulk', data),
  getMe: () => api.get('/auth/me'),
  getUsers: (params?: any) => api.get('/auth/users', { params }),
  getUserById: (id: string) => api.get(`/auth/users/${id}`),
  updateUser: (id: string, data: any) => api.put(`/auth/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/auth/users/${id}`),
  resetPassword: (id: string, data: any) => api.post(`/auth/users/${id}/reset-password`, data),
  getUserStats: () => api.get('/auth/stats/users'),
};

export const examAPI = {
  getAll: (params?: any) => api.get('/exams', { params }),
  getById: (id: string) => api.get(`/exams/${id}`),
  create: (data: any) => api.post('/exams', data),
  update: (id: string, data: any) => api.put(`/exams/${id}`, data),
  delete: (id: string) => api.delete(`/exams/${id}`),
  getQuestions: (id: string, params?: any) => api.get(`/exams/${id}/questions`, { params }),
  duplicate: (id: string) => api.post(`/exams/${id}/duplicate`),
  getStats: (id: string) => api.get(`/exams/stats/${id}`),
};

export const questionAPI = {
  getByExam: (examId: string) => api.get(`/questions/exam/${examId}`),
  getByExamAdmin: (examId: string) => api.get(`/questions/admin/exam/${examId}`),
  create: (data: any) => api.post('/questions', data),
  createBulk: (data: any) => api.post('/questions/bulk', data),
  update: (id: string, data: any) => api.put(`/questions/${id}`, data),
  delete: (id: string) => api.delete(`/questions/${id}`),
  reorder: (examId: string, data: any) => api.post(`/questions/reorder/${examId}`, data),
};

export const resultAPI = {
  getMyResults: () => api.get('/results/my-results'),
  getById: (id: string) => api.get(`/results/${id}`),
  getAnalytics: (id: string) => api.get(`/results/${id}/analytics`),
  startTest: (examId: string) => api.post('/results/start', { examId }),
  saveProgress: (data: any) => api.post('/results/save-progress', data),
  submitTest: (resultId: string) => api.post('/results/submit', { resultId }),
  getLeaderboard: (examId: string) => api.get(`/results/leaderboard/${examId}`),
};

export const questionBankAPI = {
  getAll: (params?: any) => api.get('/question-bank', { params }),
  getById: (id: string) => api.get(`/question-bank/${id}`),
  create: (data: any) => api.post('/question-bank', data),
  importJSON: (data: any) => api.post('/question-bank/import-json', data),
  addToExam: (data: any) => api.post('/question-bank/add-to-exam', data),
  update: (id: string, data: any) => api.put(`/question-bank/${id}`, data),
  delete: (id: string) => api.delete(`/question-bank/${id}`),
  getStats: () => api.get('/question-bank/stats/overview'),
};

export const testAssignmentAPI = {
  getAll: (params?: any) => api.get('/assignments/all', { params }),
  getMyAssignments: () => api.get('/assignments/my-assignments'),
  create: (data: any) => api.post('/assignments', data),
  update: (id: string, data: any) => api.put(`/assignments/${id}`, data),
  delete: (id: string) => api.delete(`/assignments/${id}`),
  canTakeTest: (examId: string) => api.get(`/assignments/can-take/${examId}`),
  getStats: (examId: string) => api.get(`/assignments/stats/${examId}`),
};

export const adminAPI = {
  getSubmissions: (params?: any) => api.get('/admin/submissions', { params }),
  getSubmissionById: (id: string) => api.get(`/admin/submission/${id}`),
  updateSubmission: (id: string, data: any) => api.put(`/admin/submission/${id}`, data),
  recalculateSubmission: (id: string) => api.post(`/admin/submission/${id}/recalculate`),
  getStats: (params?: any) => api.get('/admin/stats/overview', { params }),
  getExamStats: (examId: string) => api.get(`/admin/stats/exam/${examId}`),
  exportSubmissions: (examId: string) => api.get(`/admin/export/${examId}`),
  getUserDevices: (userId: string) => api.get(`/admin/devices/${userId}`),
  deleteDevice: (deviceId: string) => api.delete(`/admin/devices/${deviceId}`),
  debugStatus: () => api.get('/admin/debug/status'),
};

export const bookmarkAPI = {
  getMyMistakes: (params?: any) => api.get('/bookmarks/my-mistakes', { params }),
  getAll: (params?: any) => api.get('/bookmarks/all', { params }),
  create: (data: any) => api.post('/bookmarks', data),
  update: (id: string, data: any) => api.put(`/bookmarks/${id}`, data),
  delete: (id: string) => api.delete(`/bookmarks/${id}`),
  getStats: () => api.get('/bookmarks/stats/overview'),
};

export const deviceAPI = {
  register: (data: any) => api.post('/devices/register', data),
  getMyDevices: () => api.get('/devices/my-devices'),
  update: (id: string, data: any) => api.put(`/devices/${id}`, data),
  deactivate: (id: string) => api.post(`/devices/deactivate/${id}`),
  verify: (deviceId: string) => api.post('/devices/verify', { deviceId }),
};

export const institutionAPI = {
  getAll: (params?: any) => api.get('/institutions', { params }),
  getById: (id: string) => api.get(`/institutions/${id}`),
  create: (data: any) => api.post('/institutions', data),
  update: (id: string, data: any) => api.put(`/institutions/${id}`, data),
  delete: (id: string) => api.delete(`/institutions/${id}`),
  getStudents: (id: string) => api.get(`/institutions/${id}/students`),
  getStats: () => api.get('/institutions/stats'),
};
