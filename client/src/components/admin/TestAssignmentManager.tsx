import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { testAssignmentAPI, examAPI, authAPI } from '../../lib/api';
import { 
  Plus, Trash2, Search, Calendar, Users, CheckCircle, X, 
  AlertCircle, Clock, BookOpen, Filter
} from 'lucide-react';

interface Exam {
  _id: string;
  title: string;
  code: string;
  subject: string;
  duration: number;
}

interface User {
  _id: string;
  name: string;
  email: string;
  college?: string;
  branch?: string;
}

export default function TestAssignmentManager() {
  const [showModal, setShowModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const queryClient = useQueryClient();

  const { data: assignmentsData, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['test-assignments', statusFilter],
    queryFn: () => testAssignmentAPI.getAll(statusFilter === 'all' ? {} : { status: statusFilter }),
    staleTime: 1000 * 60 * 5,
  });

  const assignments = assignmentsData?.data?.data || assignmentsData?.data || [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => testAssignmentAPI.delete(id),
    onSuccess: () => {
      toast.success('Assignment removed');
      queryClient.invalidateQueries({ queryKey: ['test-assignments'] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Test Assignments</h2>
          <p className="text-gray-600 mt-1">Assign tests to specific students</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Assign Test
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search assignments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Assignments Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {assignmentsLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : assignments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>No assignments found</p>
            <p className="text-sm mt-2">Create assignments to get started</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Test</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {assignments.map((assignment: any) => (
                <tr key={assignment._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{assignment.userId?.name}</div>
                        <div className="text-sm text-gray-500">{assignment.userId?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{assignment.examId?.title}</div>
                    <div className="text-sm text-gray-500">{assignment.examId?.code}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      assignment.status === 'completed' ? 'bg-green-100 text-green-800' :
                      assignment.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                      assignment.status === 'pending' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {assignment.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {assignment.dueDate 
                      ? new Date(assignment.dueDate).toLocaleDateString()
                      : 'No due date'
                    }
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => {
                        if (confirm('Remove this assignment?')) {
                          deleteMutation.mutate(assignment._id);
                        }
                      }}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Assignment Modal */}
      {showModal && (
        <AssignmentModal onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}

function AssignmentModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [attemptsAllowed, setAttemptsAllowed] = useState(1);
  const [notes, setNotes] = useState('');
  const [userSearch, setUserSearch] = useState('');

  const { data: examsData } = useQuery({
    queryKey: ['exams-for-assignment'],
    queryFn: () => examAPI.getAll(),
    staleTime: 1000 * 60 * 5,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users-for-assignment', userSearch],
    queryFn: () => authAPI.getUsers({ search: userSearch, role: 'user' }),
    staleTime: 1000 * 60 * 5,
  });

  const exams: Exam[] = examsData?.data?.data || examsData?.data || [];
  const users: User[] = usersData?.data?.data?.users || usersData?.data?.users || [];

  const createMutation = useMutation({
    mutationFn: () => testAssignmentAPI.create({
      examId: selectedExam,
      userIds: selectedUsers,
      dueDate: dueDate || null,
      attemptsAllowed,
      notes,
    }),
    onSuccess: () => {
      toast.success('Test assigned successfully');
      queryClient.invalidateQueries({ queryKey: ['test-assignments'] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to assign test');
    },
  });

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllUsers = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(u => u._id));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Assign Test to Students</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {/* Select Exam */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Test *
            </label>
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Choose a test...</option>
              {exams.map((exam) => (
                <option key={exam._id} value={exam._id}>
                  {exam.title} ({exam.code}) - {exam.subject}
                </option>
              ))}
            </select>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date (Optional)
              </label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attempts Allowed
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={attemptsAllowed}
                onChange={(e) => setAttemptsAllowed(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Add any notes for students..."
            />
          </div>

          {/* Select Students */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Select Students *
              </label>
              <button
                onClick={selectAllUsers}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {selectedUsers.length === users.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            
            <input
              type="text"
              placeholder="Search students..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-3"
            />

            <div className="border border-gray-300 rounded-lg max-h-64 overflow-y-auto">
              {users.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No students found
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <label
                      key={user._id}
                      className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user._id)}
                        onChange={() => toggleUser(user._id)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <div className="ml-3 flex-1">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {user.college && <span className="mr-2">{user.college}</span>}
                        {user.branch && <span className="px-2 py-1 bg-gray-100 rounded text-xs">{user.branch}</span>}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {selectedUsers.length} student(s) selected
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={() => createMutation.mutate()}
              disabled={!selectedExam || selectedUsers.length === 0 || createMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Assigning...' : `Assign to ${selectedUsers.length} Students`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}