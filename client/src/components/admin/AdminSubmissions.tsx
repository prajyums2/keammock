import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI, examAPI } from '../lib/api';
import { Search, Filter, Download, Eye, Calendar, User, Award, Clock, ChevronLeft, ChevronRight, FileSpreadsheet, Edit2, Save, XCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface Submission {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  examId: {
    _id: string;
    title: string;
    code: string;
    totalMarks: number;
  };
  totalScore: number;
  correctAnswers: number;
  wrongAnswers: number;
  unattempted: number;
  accuracy: number;
  timeTaken: number;
  status: string;
  submittedAt: string;
  tabSwitchCount: number;
}

export default function AdminSubmissions() {
  const [searchTerm, setSearchTerm] = useState('');
  const [examFilter, setExamFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [editingSubmission, setEditingSubmission] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const queryClient = useQueryClient();
  const itemsPerPage = 10;

  const { data: submissions, isLoading: submissionsLoading } = useQuery({
    queryKey: ['admin-submissions'],
    queryFn: () => adminAPI.getSubmissions(),
    staleTime: 1000 * 60 * 5,
  });

  const { data: exams } = useQuery({
    queryKey: ['exams-list'],
    queryFn: () => examAPI.getAll(),
    staleTime: 1000 * 60 * 5,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminAPI.updateSubmission(id, data),
    onSuccess: () => {
      toast.success('Submission updated');
      queryClient.invalidateQueries({ queryKey: ['admin-submissions'] });
      setEditingSubmission(null);
      setEditData({});
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to update'),
  });

  const recalculateMutation = useMutation({
    mutationFn: (id: string) => adminAPI.recalculateSubmission(id),
    onSuccess: () => {
      toast.success('Scores recalculated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-submissions'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to recalculate'),
  });

  const submissionList: Submission[] = submissions?.data?.data?.submissions || submissions?.data?.submissions || submissions?.data || [];
  const examList = exams?.data?.data || exams?.data || [];

  const filteredSubmissions = submissionList.filter(sub => {
    const matchesSearch = 
      sub.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.examId?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.examId?.code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesExam = examFilter === 'all' || sub.examId?._id === examFilter;
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    
    let matchesDate = true;
    if (dateRange.start) {
      matchesDate = matchesDate && new Date(sub.submittedAt) >= new Date(dateRange.start);
    }
    if (dateRange.end) {
      matchesDate = matchesDate && new Date(sub.submittedAt) <= new Date(dateRange.end + 'T23:59:59');
    }
    
    return matchesSearch && matchesExam && matchesStatus && matchesDate;
  });

  const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
  const paginatedSubmissions = filteredSubmissions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const startEditing = (submission: Submission) => {
    setEditingSubmission(submission._id);
    setEditData({
      status: submission.status,
      totalScore: submission.totalScore,
      correctAnswers: submission.correctAnswers,
      wrongAnswers: submission.wrongAnswers,
      unattempted: submission.unattempted,
      accuracy: submission.accuracy,
      timeTaken: submission.timeTaken,
    });
  };

  const cancelEditing = () => {
    setEditingSubmission(null);
    setEditData({});
  };

  const saveEdit = (id: string) => {
    updateMutation.mutate({ id, data: editData });
  };

  const handleExport = async (examId?: string) => {
    try {
      const response = await adminAPI.exportSubmissions(examId || 'all');
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `submissions-${examId || 'all'}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Export downloaded successfully');
    } catch (error) {
      toast.error('Failed to export submissions');
    }
  };

  if (submissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Student Submissions</h1>
          <p className="mt-2 text-gray-600">
            View and analyze all student test submissions
          </p>
        </div>
        <button
          onClick={() => handleExport()}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Export All to CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search student, exam..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={examFilter}
            onChange={(e) => setExamFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Exams</option>
            {examList.map((exam: any) => (
              <option key={exam._id} value={exam._id}>{exam.title}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
            <option value="abandoned">Abandoned</option>
            <option value="timed_out">Timed Out</option>
          </select>

          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Start Date"
          />

          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="End Date"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Total Submissions</p>
          <p className="text-2xl font-bold text-gray-900">{filteredSubmissions.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Completed</p>
          <p className="text-2xl font-bold text-green-600">
            {filteredSubmissions.filter(s => s.status === 'completed').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Avg Score</p>
          <p className="text-2xl font-bold text-blue-600">
            {filteredSubmissions.length > 0
              ? (filteredSubmissions.reduce((acc, s) => acc + s.totalScore, 0) / filteredSubmissions.length).toFixed(2)
              : '0'}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Tab Violations</p>
          <p className="text-2xl font-bold text-red-600">
            {filteredSubmissions.filter(s => s.tabSwitchCount > 0).length}
          </p>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Exam
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Accuracy
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedSubmissions.map((submission) => {
                const isEditing = editingSubmission === submission._id;
                return (
                <tr key={submission._id} className={`hover:bg-gray-50 ${isEditing ? 'bg-blue-50' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{submission.userId?.name}</p>
                        <p className="text-xs text-gray-500">{submission.userId?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{submission.examId?.title}</p>
                    <p className="text-xs text-gray-500">{submission.examId?.code}</p>
                  </td>
                  <td className="px-6 py-4">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editData.totalScore}
                        onChange={(e) => setEditData({ ...editData, totalScore: parseFloat(e.target.value) })}
                        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium">
                            {submission.totalScore.toFixed(2)} / {submission.examId?.totalMarks}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {submission.correctAnswers} correct • {submission.wrongAnswers} wrong • {submission.unattempted} unattempted
                        </div>
                      </>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editData.accuracy}
                        onChange={(e) => setEditData({ ...editData, accuracy: parseFloat(e.target.value) })}
                        className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                        step="0.1"
                      />
                    ) : (
                      <span className={`text-sm font-medium ${
                        submission.accuracy >= 70 ? 'text-green-600' :
                        submission.accuracy >= 40 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {submission.accuracy.toFixed(1)}%
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editData.timeTaken}
                        onChange={(e) => setEditData({ ...editData, timeTaken: parseInt(e.target.value) })}
                        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                    ) : (
                      <>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Clock className="w-3 h-3" />
                          {Math.floor(submission.timeTaken / 60)}m {submission.timeTaken % 60}s
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(submission.submittedAt).toLocaleDateString()}
                        </div>
                      </>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {isEditing ? (
                      <select
                        value={editData.status}
                        onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                        className="px-2 py-1 text-sm border border-gray-300 rounded"
                      >
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="abandoned">Abandoned</option>
                        <option value="timed_out">Timed Out</option>
                      </select>
                    ) : (
                      <>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          submission.status === 'completed' ? 'bg-green-100 text-green-800' :
                          submission.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                          submission.status === 'timed_out' ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {submission.status === 'in_progress' ? 'In Progress' : 
                           submission.status === 'timed_out' ? 'Timed Out' : 
                           submission.status}
                        </span>
                        {submission.tabSwitchCount > 0 && (
                          <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                            {submission.tabSwitchCount} violations
                          </span>
                        )}
                      </>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => saveEdit(submission._id)}
                            disabled={updateMutation.isPending}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                            title="Save"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg"
                            title="Cancel"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEditing(submission)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {submission.status !== 'completed' && (
                            <button
                              onClick={() => {
                                if (confirm('Recalculate scores for this submission?')) {
                                  recalculateMutation.mutate(submission._id);
                                }
                              }}
                              disabled={recalculateMutation.isPending}
                              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
                              title="Recalculate Scores"
                            >
                              <RefreshCw className={`w-4 h-4 ${recalculateMutation.isPending ? 'animate-spin' : ''}`} />
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedSubmission(submission)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredSubmissions.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No submissions found matching your criteria</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredSubmissions.length)} of {filteredSubmissions.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Submission Detail Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Submission Details</h2>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Student</p>
                  <p className="font-medium">{selectedSubmission.userId?.name}</p>
                  <p className="text-sm text-gray-500">{selectedSubmission.userId?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Exam</p>
                  <p className="font-medium">{selectedSubmission.examId?.title}</p>
                  <p className="text-sm text-gray-500">{selectedSubmission.examId?.code}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">{selectedSubmission.totalScore.toFixed(2)}</p>
                  <p className="text-sm text-gray-600">Total Score</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">{selectedSubmission.accuracy.toFixed(1)}%</p>
                  <p className="text-sm text-gray-600">Accuracy</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {Math.floor(selectedSubmission.timeTaken / 60)}m
                  </p>
                  <p className="text-sm text-gray-600">Time Taken</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Performance Breakdown</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-green-700">Correct Answers</span>
                    <span className="font-bold text-green-700">{selectedSubmission.correctAnswers}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <span className="text-red-700">Wrong Answers</span>
                    <span className="font-bold text-red-700">{selectedSubmission.wrongAnswers}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700">Unattempted</span>
                    <span className="font-bold text-gray-700">{selectedSubmission.unattempted}</span>
                  </div>
                </div>
              </div>

              {selectedSubmission.tabSwitchCount > 0 && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <p className="text-red-700 font-medium">
                    ⚠️ {selectedSubmission.tabSwitchCount} tab switch violations detected
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { X } from 'lucide-react';
