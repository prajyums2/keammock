import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Calendar, Users, CheckCircle, X, Search, Clock, AlertTriangle, Trash2, RefreshCw, Edit2, Save, XCircle } from 'lucide-react';
import { examAPI, authAPI, testAssignmentAPI } from '../../lib/api';

export default function TestAssignment() {
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [attemptsAllowed, setAttemptsAllowed] = useState(1);
  const [showStudentSelect, setShowStudentSelect] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const queryClient = useQueryClient();

  const { data: examsData, isLoading: examsLoading } = useQuery({
    queryKey: ['admin-exams'],
    queryFn: () => examAPI.getAll(),
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
  });

  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ['students', studentSearch],
    queryFn: () => authAPI.getUsers({ role: 'student', search: studentSearch, limit: 100 }),
    enabled: showStudentSelect,
    staleTime: 1000 * 30,
  });

  const { data: assignmentsData, isLoading: assignmentsLoading, refetch: refetchAssignments } = useQuery({
    queryKey: ['all-assignments'],
    queryFn: () => testAssignmentAPI.getAll({ limit: 200 }),
    staleTime: 1000 * 15,
    refetchOnWindowFocus: true,
  });

  const exams = examsData?.data?.data || examsData?.data || [];
  const students = studentsData?.data?.data?.users || studentsData?.data?.users || [];
  const assignments = assignmentsData?.data?.data?.assignments || assignmentsData?.data?.assignments || [];

  const createAssignmentMutation = useMutation({
    mutationFn: (data: { examId: string; userIds: string[]; startDate?: string; dueDate?: string; attemptsAllowed: number }) => 
      testAssignmentAPI.create(data),
    onSuccess: (response) => {
      const result = response.data?.data || response.data;
      toast.success(`${result.assignments?.length || 0} test(s) assigned successfully!`);
      if (result.errors?.length > 0) {
        toast.error(`${result.errors.length} failed (already assigned)`);
      }
      queryClient.invalidateQueries({ queryKey: ['all-assignments'] });
      resetForm();
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to assign test'),
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => testAssignmentAPI.update(id, data),
    onSuccess: () => {
      toast.success('Assignment updated successfully');
      queryClient.invalidateQueries({ queryKey: ['all-assignments'] });
      setEditingId(null);
      setEditData({});
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to update assignment'),
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: (id: string) => testAssignmentAPI.delete(id),
    onSuccess: () => {
      toast.success('Assignment deleted');
      queryClient.invalidateQueries({ queryKey: ['all-assignments'] });
    },
  });

  const resetForm = () => {
    setSelectedExam('');
    setSelectedStudents(new Set());
    setStartDate('');
    setDueDate('');
    setAttemptsAllowed(1);
    setShowStudentSelect(false);
    setStudentSearch('');
  };

  const toggleStudentSelection = (id: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedStudents(newSelected);
  };

  const toggleSelectAllStudents = () => {
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(students.map((s: any) => s._id)));
    }
  };

  const handleAssign = () => {
    if (!selectedExam) {
      toast.error('Please select a test');
      return;
    }
    if (selectedStudents.size === 0) {
      toast.error('Please select at least one student');
      return;
    }
    createAssignmentMutation.mutate({
      examId: selectedExam,
      userIds: Array.from(selectedStudents),
      startDate: startDate || undefined,
      dueDate: dueDate || undefined,
      attemptsAllowed
    });
  };

  const startEditing = (assignment: any) => {
    setEditingId(assignment._id);
    setEditData({
      startDate: assignment.startDate ? new Date(assignment.startDate).toISOString().slice(0, 16) : '',
      dueDate: assignment.dueDate ? new Date(assignment.dueDate).toISOString().slice(0, 16) : '',
      status: assignment.status,
      attemptsAllowed: assignment.attemptsAllowed,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = (assignmentId: string) => {
    updateAssignmentMutation.mutate({
      id: assignmentId,
      data: {
        startDate: editData.startDate || null,
        dueDate: editData.dueDate || null,
        status: editData.status,
        attemptsAllowed: editData.attemptsAllowed,
      }
    });
  };

  const selectedExamData = exams.find((e: any) => e._id === selectedExam);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Calendar className="w-7 h-7 mr-2 text-purple-600" />
            Test Assignments
          </h2>
          <p className="text-gray-600 mt-1">Assign tests to students with scheduling</p>
        </div>
        <button
          onClick={() => refetchAssignments()}
          className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Create Assignment Card */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Assign New Test</h3>
          <p className="text-gray-600 text-sm mt-1">Select a test and students to assign</p>
        </div>

        <div className="p-6">
          {/* Step 1: Select Exam */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Step 1: Select Test *</label>
            {examsLoading ? (
              <div className="p-4 text-center text-gray-500">Loading exams...</div>
            ) : exams.length === 0 ? (
              <div className="p-6 text-center text-gray-500 bg-gray-50 rounded-xl">
                No exams available. Create an exam first.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {exams.map((exam: any) => (
                  <button
                    key={exam._id}
                    onClick={() => {
                      setSelectedExam(exam._id);
                      setShowStudentSelect(true);
                    }}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selectedExam === exam._id 
                        ? 'border-purple-500 bg-purple-50' 
                        : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{exam.title}</h4>
                      {selectedExam === exam._id && (
                        <CheckCircle className="w-5 h-5 text-purple-600" />
                      )}
                    </div>
                    <div className="text-sm text-gray-500 space-y-1">
                      <p className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {exam.duration} mins
                      </p>
                      <p className="flex items-center">
                        <span className="font-medium mr-1">{exam.totalMarks}</span> marks
                      </p>
                      <p className="flex items-center">
                        {exam.isActive ? (
                          <span className="text-green-600">Active</span>
                        ) : (
                          <span className="text-gray-400">Inactive</span>
                        )}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Step 2: Select Students */}
          {showStudentSelect && selectedExam && (
            <div className="mb-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">Step 2: Select Students *</label>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={toggleSelectAllStudents}
                    className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                  >
                    {selectedStudents.size === students.length ? 'Deselect All' : 'Select All'}
                  </button>
                  <span className="text-sm text-gray-500">
                    {selectedStudents.size} selected
                  </span>
                </div>
              </div>

              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search students..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-xl">
                {studentsLoading ? (
                  <div className="p-6 text-center text-gray-500">Loading students...</div>
                ) : students.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    No students found
                  </div>
                ) : (
                  students.map((student: any) => (
                    <label
                      key={student._id}
                      className={`flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                        selectedStudents.has(student._id) ? 'bg-purple-50' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedStudents.has(student._id)}
                        onChange={() => toggleStudentSelection(student._id)}
                        className="w-5 h-5 text-purple-600 rounded mr-3"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{student.name}</p>
                        <p className="text-sm text-gray-500">{student.email}</p>
                      </div>
                      {student.targetYear && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          {student.targetYear}
                        </span>
                      )}
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Step 3: Schedule Settings */}
          {selectedStudents.size > 0 && (
            <div className="mb-6 pt-6 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-3">Step 3: Schedule Settings</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Start Date (Optional)</label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Leave empty for immediate access</p>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Due Date (Optional)</label>
                  <input
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Leave empty for no deadline</p>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Attempts Allowed</label>
                  <select
                    value={attemptsAllowed}
                    onChange={(e) => setAttemptsAllowed(parseInt(e.target.value))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                  >
                    <option value={1}>1 attempt</option>
                    <option value={2}>2 attempts</option>
                    <option value={3}>3 attempts</option>
                    <option value={5}>5 attempts</option>
                    <option value={999}>Unlimited</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Summary & Submit */}
          {selectedExam && selectedStudents.size > 0 && (
            <div className="pt-6 border-t border-gray-200">
              <div className="bg-purple-50 rounded-xl p-4 mb-4">
                <h4 className="font-semibold text-purple-900 mb-2">Assignment Summary</h4>
                <div className="text-sm text-purple-700 space-y-1">
                  <p><strong>Test:</strong> {selectedExamData?.title}</p>
                  <p><strong>Students:</strong> {selectedStudents.size} selected</p>
                  {startDate && <p><strong>Starts:</strong> {new Date(startDate).toLocaleString()}</p>}
                  {dueDate && <p><strong>Due:</strong> {new Date(dueDate).toLocaleString()}</p>}
                  <p><strong>Attempts:</strong> {attemptsAllowed === 999 ? 'Unlimited' : attemptsAllowed}</p>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={resetForm}
                  className="px-6 py-2.5 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  disabled={createAssignmentMutation.isPending}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 font-medium flex items-center"
                >
                  {createAssignmentMutation.isPending ? (
                    'Assigning...'
                  ) : (
                    <>
                      <Calendar className="w-5 h-5 mr-2" />
                      Assign to {selectedStudents.size} Student{selectedStudents.size > 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Existing Assignments */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">All Assignments ({assignments.length})</h3>
          </div>
        </div>

        {assignmentsLoading ? (
          <div className="p-8 text-center text-gray-500">Loading assignments...</div>
        ) : assignments.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Assignments Yet</h4>
            <p className="text-gray-500">Assign tests to students to see them here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Test</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Schedule</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attempts</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {assignments.map((a: any) => {
                  const exam = a.examId;
                  const student = a.userId;
                  const now = new Date();
                  const startDateObj = a.startDate ? new Date(a.startDate) : null;
                  const dueDateObj = a.dueDate ? new Date(a.dueDate) : null;
                  const isNotStarted = startDateObj && now < startDateObj;
                  const isOverdue = dueDateObj && now > dueDateObj && a.status !== 'completed';
                  const isEditing = editingId === a._id;
                  
                  return (
                    <tr key={a._id} className={`hover:bg-gray-50 ${isEditing ? 'bg-purple-50' : ''}`}>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{exam?.title || 'Unknown'}</p>
                        <p className="text-xs text-gray-500">{exam?.code || ''}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{student?.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-500">{student?.email || ''}</p>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {isEditing ? (
                          <div className="space-y-2">
                            <div>
                              <label className="text-xs text-gray-500">Start Date</label>
                              <input
                                type="datetime-local"
                                value={editData.startDate}
                                onChange={(e) => setEditData({ ...editData, startDate: e.target.value })}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500">Due Date</label>
                              <input
                                type="datetime-local"
                                value={editData.dueDate}
                                onChange={(e) => setEditData({ ...editData, dueDate: e.target.value })}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            {startDateObj && (
                              <p className={isNotStarted ? 'text-blue-600' : 'text-gray-600'}>
                                <strong>Start:</strong> {startDateObj.toLocaleString()}
                              </p>
                            )}
                            {dueDateObj && (
                              <p className={isOverdue ? 'text-red-600' : 'text-gray-600'}>
                                <strong>Due:</strong> {dueDateObj.toLocaleString()}
                              </p>
                            )}
                            {!startDateObj && !dueDateObj && (
                              <span className="text-gray-400">No schedule set</span>
                            )}
                          </>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {isEditing ? (
                          <select
                            value={editData.attemptsAllowed}
                            onChange={(e) => setEditData({ ...editData, attemptsAllowed: parseInt(e.target.value) })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          >
                            <option value={1}>1</option>
                            <option value={2}>2</option>
                            <option value={3}>3</option>
                            <option value={5}>5</option>
                            <option value={999}>Unlimited</option>
                          </select>
                        ) : (
                          <>
                            <span className="font-medium">{a.attemptsUsed}</span> / <span>{a.attemptsAllowed === 999 ? '∞' : a.attemptsAllowed}</span>
                            {a.attemptsUsed > 0 && (
                              <button
                                onClick={() => {
                                  if (confirm('Reset attempts used to 0?')) {
                                    updateAssignmentMutation.mutate({
                                      id: a._id,
                                      data: { resetAttempts: true }
                                    });
                                  }
                                }}
                                className="ml-2 text-xs text-blue-600 hover:underline"
                                title="Reset attempts"
                              >
                                Reset
                              </button>
                            )}
                          </>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <select
                            value={editData.status}
                            onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="expired">Expired</option>
                          </select>
                        ) : (
                          <>
                            {a.status === 'completed' ? (
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Completed</span>
                            ) : isNotStarted ? (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">Scheduled</span>
                            ) : isOverdue ? (
                              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">Expired</span>
                            ) : a.status === 'in_progress' ? (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">In Progress</span>
                            ) : (
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">Pending</span>
                            )}
                          </>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => saveEdit(a._id)}
                                disabled={updateAssignmentMutation.isPending}
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
                                onClick={() => startEditing(a)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Delete this assignment?')) {
                                    deleteAssignmentMutation.mutate(a._id);
                                  }
                                }}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
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
        )}
      </div>
    </div>
  );
}
