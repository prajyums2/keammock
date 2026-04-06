import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { examAPI, questionAPI, authAPI, testAssignmentAPI, adminAPI, institutionAPI } from '../lib/api';
import { useAuthStore } from '../lib/store';
import {
  Plus, Edit, Trash2, Copy, X, BookOpen, Users, FileText, BarChart3,
  Search, Loader2, Eye, Settings, Key, Download, Upload, AlertTriangle, UserPlus, Calendar, Shield, GraduationCap, CheckCircle, Layers
} from 'lucide-react';
import LaTeXRenderer from '../components/common/LaTeXRenderer';
import VisualTestPreview from '../components/admin/VisualTestPreview';
import BulkImportModal from '../components/admin/BulkImportModal';
import BulkUserImportModal from '../components/admin/BulkUserImportModal';
import QuestionBank from '../components/admin/QuestionBank';
import TestAssignment from '../components/admin/TestAssignment';
import ExamSectionEditor from '../components/admin/ExamSectionEditor';
import type { Exam, Question } from '../types';

const KEAM_SUBJECTS = ['Mathematics', 'Physics', 'Chemistry'];
const KEAM_TOPICS: Record<string, string[]> = {
  Mathematics: ['Algebra', 'Calculus', 'Trigonometry', 'Coordinate Geometry', 'Vectors', 'Probability', 'Statistics'],
  Physics: ['Mechanics', 'Optics', 'Thermodynamics', 'Electromagnetism', 'Modern Physics', 'Waves'],
  Chemistry: ['Organic Chemistry', 'Inorganic Chemistry', 'Physical Chemistry', 'Environmental Chemistry'],
};
const KEAM_SECTIONS = [
  { name: 'Mathematics', marksPerQuestion: 4 },
  { name: 'Physics', marksPerQuestion: 4 },
  { name: 'Chemistry', marksPerQuestion: 4 },
];

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'super_admin';
  const [activeTab, setActiveTab] = useState('exams');
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string | null>(null);
  const [showExamModal, setShowExamModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showBulkUserImportModal, setShowBulkUserImportModal] = useState(false);
  const [showSectionEditor, setShowSectionEditor] = useState(false);
  const [editExam, setEditExam] = useState<Exam | null>(null);
  const queryClient = useQueryClient();

  const { data: examsData } = useQuery({ queryKey: ['admin-exams'], queryFn: () => examAPI.getAll() });
  const exams: Exam[] = examsData?.data?.data || examsData?.data || [];

  const { data: questionsData } = useQuery({
    queryKey: ['questions', selectedExamId],
    queryFn: () => questionAPI.getByExamAdmin(selectedExamId!),
    enabled: !!selectedExamId,
  });
  const questions: Question[] = questionsData?.data?.data || questionsData?.data || [];
  const selectedExam = exams.find(e => e._id === selectedExamId);

  const deleteExamMutation = useMutation({
    mutationFn: (id: string) => examAPI.delete(id),
    onSuccess: () => { toast.success('Exam deleted'); queryClient.invalidateQueries({ queryKey: ['admin-exams'] }); },
  });

  const tabs = [
    { id: 'exams', label: 'Exams', icon: BookOpen },
    { id: 'questions', label: 'Question Bank', icon: FileText },
    { id: 'assignments', label: 'Assignments', icon: Calendar },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'submissions', label: 'Submissions', icon: FileText },
    { id: 'stats', label: 'Statistics', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-1 text-gray-600">Manage exams, questions, users, and monitor performance.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={() => { setEditExam(null); setShowExamModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 font-medium">
            <Plus className="w-4 h-4" /> New Exam
          </button>
        </div>
      </div>

      <div className="flex space-x-1 bg-gray-100 rounded-xl p-1">
        {tabs.map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id)} 
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'exams' && (
        <ExamsTab 
          exams={exams}
          questions={questions}
          selectedExam={selectedExam}
          selectedExamId={selectedExamId}
          setSelectedExamId={setSelectedExamId}
          setEditExam={setEditExam}
          setShowExamModal={setShowExamModal}
          setShowQuestionModal={setShowQuestionModal}
          setShowPreviewModal={setShowPreviewModal}
          setShowImportModal={setShowImportModal}
          setShowSectionEditor={setShowSectionEditor}
          deleteExamMutation={deleteExamMutation}
        />
      )}

      {activeTab === 'questions' && <QuestionBank />}
      {activeTab === 'assignments' && <TestAssignment />}
      {activeTab === 'users' && <UserManagement />}
      {activeTab === 'submissions' && <SubmissionList isSuperAdmin={isSuperAdmin} selectedInstitutionId={selectedInstitutionId} setSelectedInstitutionId={setSelectedInstitutionId} />}
      {activeTab === 'stats' && <StatsOverview isSuperAdmin={isSuperAdmin} selectedInstitutionId={selectedInstitutionId} setSelectedInstitutionId={setSelectedInstitutionId} />}

      {showExamModal && <ExamModal exam={editExam} onClose={() => { setShowExamModal(false); setEditExam(null); }} />}
      {showQuestionModal && selectedExamId && <QuestionModal examId={selectedExamId} exam={selectedExam} onClose={() => setShowQuestionModal(false)} />}
      {showPreviewModal && selectedExam && (
        <VisualTestPreview 
          exam={selectedExam} 
          questions={questions} 
          onClose={() => setShowPreviewModal(false)} 
        />
      )}
      {showImportModal && selectedExamId && (
        <BulkImportModal 
          examId={selectedExamId}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['questions', selectedExamId] });
          }}
        />
      )}
      {showBulkUserImportModal && <BulkUserImportModal onClose={() => setShowBulkUserImportModal(false)} />}
      
      {showSectionEditor && selectedExamId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl">
            <ExamSectionEditor 
              examId={selectedExamId} 
              onClose={() => setShowSectionEditor(false)} 
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ExamsTab({ exams, questions, selectedExam, selectedExamId, setSelectedExamId, setEditExam, setShowExamModal, setShowQuestionModal, setShowPreviewModal, setShowImportModal, setShowSectionEditor, deleteExamMutation }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Exams ({exams.length})</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {exams.length === 0 ? (
            <p className="p-8 text-center text-gray-500">No exams created yet. Click "New Exam" to create one.</p>
          ) : (
            exams.map(exam => (
              <div key={exam._id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900">{exam.title}</h3>
                    {exam.isActive ? (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">Active</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">Inactive</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                    <span>{exam.code}</span>
                    <span>{exam.duration} min</span>
                    <span>{exam.totalMarks} marks</span>
                    <span>{exam.sections?.map((s: any) => s.name).join(' + ')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { setSelectedExamId(exam._id); }} 
                    className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                      selectedExamId === exam._id 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-blue-700 bg-blue-50 hover:bg-blue-100'
                    }`}
                  >
                    <Eye className="w-4 h-4 inline mr-1" />
                    {selectedExamId === exam._id ? 'Selected' : 'View'} Questions
                  </button>
                  <button 
                    onClick={() => { setSelectedExamId(exam._id); setShowSectionEditor(true); }} 
                    className="px-3 py-1.5 text-sm text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg font-medium transition-colors"
                    title="Edit Sections & Questions"
                  >
                    <Layers className="w-4 h-4 inline mr-1" />
                    Sections
                  </button>
                  <button 
                    onClick={() => { setSelectedExamId(exam._id); setShowPreviewModal(true); }} 
                    className="p-2 text-gray-400 hover:text-blue-700 hover:bg-blue-50 rounded-lg" 
                    title="Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => { setEditExam(exam); setShowExamModal(true); }} 
                    className="p-2 text-gray-400 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => examAPI.duplicate(exam._id).then(() => { toast.success('Duplicated'); queryClient.invalidateQueries({ queryKey: ['admin-exams'] }); })} 
                    className="p-2 text-gray-400 hover:text-green-700 hover:bg-green-50 rounded-lg"
                    title="Duplicate"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => { if (confirm('Delete this exam?')) deleteExamMutation.mutate(exam._id); }} 
                    className="p-2 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedExamId && selectedExam && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{selectedExam.title}</h2>
              <p className="text-sm text-gray-500 mt-1">
                Questions ({questions.length}) • {selectedExam.sections?.map((s: any) => s.name).join(' + ')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowImportModal(true)} 
                className="flex items-center gap-2 px-4 py-2 text-green-700 bg-green-50 rounded-lg hover:bg-green-100 font-medium"
              >
                <Upload className="w-4 h-4" />
                Bulk Import
              </button>
              <button 
                onClick={() => setShowQuestionModal(true)} 
                className="flex items-center gap-2 px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 font-medium"
              >
                <Plus className="w-4 h-4" /> Add Question
              </button>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {questions.length === 0 ? (
              <p className="p-8 text-center text-gray-500">No questions yet. Add questions to this exam.</p>
            ) : (
              questions.map((q, i) => (
                <div key={q._id} className="p-4 flex items-start justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-gray-900">Q{i + 1}</span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">{q.section}</span>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{q.difficulty}</span>
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">+{q.marks}</span>
                      {q.negativeMarks > 0 && <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-xs">-{q.negativeMarks}</span>}
                    </div>
                    <p className="text-sm text-gray-700 mb-2">
                      <LaTeXRenderer>{q.questionText.length > 150 ? q.questionText.slice(0, 150) + '...' : q.questionText}</LaTeXRenderer>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {q.options?.map((opt, oi) => (
                        <span 
                          key={oi} 
                          className={`text-xs px-2 py-1 rounded ${
                            opt.isCorrect ? 'bg-green-100 text-green-800 font-medium' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {String.fromCharCode(65 + oi)}: <LaTeXRenderer>{opt.text.length > 25 ? opt.text.slice(0, 25) + '...' : opt.text}</LaTeXRenderer>
                        </span>
                      ))}
                    </div>
                  </div>
                  <button 
                    onClick={() => { if (confirm('Delete?')) questionAPI.delete(q._id).then(() => { toast.success('Deleted'); queryClient.invalidateQueries({ queryKey: ['questions', selectedExamId] }); }); }} 
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg ml-4"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function UserManagement() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'super_admin';
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addRole, setAddRole] = useState<'student' | 'institution_admin' | 'super_admin'>('student');
  const queryClient = useQueryClient();

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users', search, roleFilter],
    queryFn: () => authAPI.getUsers({ search, role: roleFilter === 'all' ? undefined : roleFilter }),
  });
  const users = usersData?.data?.data?.users || usersData?.data?.users || [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => authAPI.deleteUser(id),
    onSuccess: () => { toast.success('User deleted'); queryClient.invalidateQueries({ queryKey: ['users'] }); },
  });

  const downloadCredentials = (u: any) => {
    const csv = `Name,Email,Role,Password\n"${u.name}","${u.email}","${u.role}","${u.password}"`;
    downloadCSV(csv, `${u.name.replace(/\s+/g, '_')}_credentials.csv`);
  };

  const downloadAllCredentials = () => {
    const csv = `Name,Email,Role\n${users.map((u: any) => `"${u.name}","${u.email}","${u.role}"`).join('\n')}`;
    downloadCSV(csv, `users_list.csv`);
  };

  const resetPasswordMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authAPI.resetPassword(id, {});
      return res;
    },
    onSuccess: (response) => {
      const newPassword = response.data?.data?.password;
      if (newPassword) {
        toast.success(
          <div className="flex flex-col gap-1">
            <span>Password reset!</span>
            <span>New Password: <strong className="font-mono">{newPassword}</strong></span>
            <button onClick={() => navigator.clipboard.writeText(newPassword)} className="text-xs underline text-left">Copy password</button>
          </div>,
          { duration: 8000 }
        );
      } else {
        toast.success('Password reset successfully');
      }
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to reset password'),
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full flex items-center gap-1"><Shield className="w-3 h-3" />Super Admin</span>;
      case 'institution_admin':
        return <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full flex items-center gap-1"><Settings className="w-3 h-3" />Admin</span>;
      default:
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full flex items-center gap-1"><GraduationCap className="w-3 h-3" />Student</span>;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-gray-900">Users ({users.length})</h2>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-700"
          >
            <option value="all">All Users</option>
            <option value="student">Students</option>
            <option value="institution_admin">Admins</option>
            {isSuperAdmin && <option value="super_admin">Super Admins</option>}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-700 focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => downloadAllCredentials()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 font-medium text-sm"
          >
            <Download className="w-4 h-4" />
            Download All
          </button>
          <button
            onClick={() => setShowBulkImport(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium text-sm"
          >
            <Upload className="w-4 h-4" />
            Bulk Import
          </button>
          <button
            onClick={() => { setAddRole('student'); setShowAddModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium text-sm"
          >
            <UserPlus className="w-4 h-4" />
            Add User
          </button>
        </div>
      </div>
      {showBulkImport && <BulkUserImportModal onClose={() => { setShowBulkImport(false); queryClient.invalidateQueries({ queryKey: ['users'] }); }} />}
      {showAddModal && <AddUserModal onClose={() => setShowAddModal(false)} defaultRole={addRole} isSuperAdmin={isSuperAdmin} />}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target Year</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u: any) => (
                <tr key={u._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{u.name}</div>
                    <div className="text-xs text-gray-500">ID: {u._id.slice(-6)}</div>
                  </td>
                  <td className="px-6 py-4">{getRoleBadge(u.role)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{u.phone || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{u.targetYear || '—'}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          try {
                            const res = await authAPI.resetPassword(u._id, {});
                            const newPassword = res.data?.data?.password;
                            const csv = `Name,Email,Role,Password\n"${u.name}","${u.email}","${u.role}","${newPassword}"`;
                            downloadCSV(csv, `${u.name.replace(/\s+/g, '_')}_credentials.csv`);
                            toast.success('Password reset & credentials downloaded!');
                          } catch (err) {
                            toast.error('Failed to reset password');
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Reset & Download Credentials"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => resetPasswordMutation.mutate(u._id)}
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                        title="Reset Password"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { if (confirm('Delete this user?')) deleteMutation.mutate(u._id); }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {users.length === 0 && <p className="p-8 text-center text-gray-500">No users found.</p>}
      </div>
    </div>
  );
}

function AddUserModal({ onClose, defaultRole, isSuperAdmin }: { onClose: () => void; defaultRole: string; isSuperAdmin: boolean }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    defaultValues: { role: defaultRole }
  });
  const selectedRole = watch('role');
  const [showPassword, setShowPassword] = useState(false);

  const createMutation = useMutation({
    mutationFn: (data: any) => authAPI.createUser(data),
    onSuccess: (response) => {
      const data = response.data?.data;
      toast.success(`${selectedRole === 'student' ? 'Student' : selectedRole === 'institution_admin' ? 'Admin' : 'Super Admin'} created!`);
      toast.success(
        <div className="flex flex-col gap-1">
          <span>Password: <strong className="font-mono">{data.password}</strong></span>
          <button onClick={() => navigator.clipboard.writeText(data.password)} className="text-xs underline">Copy password</button>
        </div>,
        { duration: 10000 }
      );
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to create user'),
  });

  const onSubmit = (data: any) => {
    createMutation.mutate(data);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Add New User</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role *</label>
            <select {...register('role', { required: true })} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500">
              <option value="student">Student</option>
              <option value="institution_admin">Admin (Institution)</option>
              {isSuperAdmin && <option value="super_admin">Super Admin</option>}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input {...register('name', { required: true })} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" placeholder="Full name" />
              {errors.name && <p className="text-xs text-red-500 mt-1">Required</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input {...register('email', { required: true })} type="email" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" placeholder="email@example.com" />
              {errors.email && <p className="text-xs text-red-500 mt-1">Required</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input {...register('phone')} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" placeholder="+91 9876543210" />
            </div>
            {selectedRole === 'student' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Year</label>
                <select {...register('targetYear')} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500">
                  <option value="">Select Year</option>
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                  <option value={2028}>2028</option>
                </select>
              </div>
            )}
          </div>
          {selectedRole !== 'super_admin' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Institution Code</label>
              <input {...register('institutionCode')} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" placeholder="Leave empty for default" />
            </div>
          )}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">Auto-generated Password</p>
                <p className="text-xs text-blue-700 mt-1">A secure random password will be automatically generated and displayed after creation.</p>
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 font-medium">
              {createMutation.isPending ? 'Creating...' : `Create ${selectedRole === 'student' ? 'Student' : selectedRole === 'institution_admin' ? 'Admin' : 'Super Admin'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

function SubmissionList({ isSuperAdmin, selectedInstitutionId, setSelectedInstitutionId }: { isSuperAdmin: boolean; selectedInstitutionId: string | null; setSelectedInstitutionId: (id: string | null) => void }) {
  const { data: submissions, refetch, isLoading } = useQuery({ 
    queryKey: ['admin-submissions', selectedInstitutionId], 
    queryFn: () => adminAPI.getSubmissions({ institutionId: selectedInstitutionId }),
    staleTime: 1000 * 15,
    refetchOnWindowFocus: true,
  });
  const list = submissions?.data?.data?.submissions || submissions?.data?.submissions || [];

  const debugQuery = useQuery({
    queryKey: ['debug-status'],
    queryFn: () => adminAPI.debugStatus(),
    enabled: false,
  });

  const handleDebug = async () => {
    const res = await debugQuery.refetch();
    if (res.data) {
      console.log('Debug Status:', res.data.data);
      alert(JSON.stringify(res.data.data, null, 2));
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-gray-900">Submissions ({list.length})</h2>
          {isSuperAdmin && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Institution:</span>
              <select
                value={selectedInstitutionId || ''}
                onChange={(e) => setSelectedInstitutionId(e.target.value || null)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-700"
              >
                <option value="">All Institutions</option>
              </select>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isSuperAdmin && (
            <button onClick={handleDebug} className="text-xs px-3 py-1 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg">Debug</button>
          )}
          <button onClick={() => refetch()} className="text-sm text-blue-600 hover:underline">Refresh</button>
        </div>
      </div>
      {isLoading ? (
        <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Institution</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exam</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Accuracy</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.map((s: any) => (
                <tr key={s._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{s.userId?.name || 'Unknown'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{s.userId?.institutionId?.name || s.userId?.institutionId || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{s.examId?.title || '—'}</td>
                  <td className="px-6 py-4 text-sm font-bold text-blue-700">{s.totalScore}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{s.accuracy?.toFixed(1)}%</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      s.status === 'completed' ? 'bg-green-100 text-green-800' : 
                      s.status === 'timed_out' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>{s.status}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{s.submittedAt ? new Date(s.submittedAt).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <p className="p-8 text-center text-gray-500">No submissions yet.</p>}
        </div>
      )}
    </div>
  );
}

function StatsOverview({ isSuperAdmin, selectedInstitutionId, setSelectedInstitutionId }: { isSuperAdmin: boolean; selectedInstitutionId: string | null; setSelectedInstitutionId: (id: string | null) => void }) {
  const { data: stats, isLoading, refetch } = useQuery({ 
    queryKey: ['admin-stats', selectedInstitutionId], 
    queryFn: () => adminAPI.getStats({ institutionId: selectedInstitutionId }), 
    staleTime: 1000 * 10,
    refetchOnWindowFocus: true,
    refetchInterval: 1000 * 60,
  });
  const s = stats?.data?.data || stats?.data || {};
  const institutions = s.institutions || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-lg font-bold text-gray-900">Platform Statistics</h2>
        <button onClick={() => refetch()} className="text-sm text-blue-600 hover:underline">Refresh</button>
      </div>

      {isSuperAdmin && institutions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-4">Institutions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => setSelectedInstitutionId(null)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                !selectedInstitutionId 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="font-semibold text-gray-900">All Institutions</p>
              <p className="text-sm text-gray-500">View all data</p>
            </button>
            {institutions.map((inst: any) => (
              <button
                key={inst._id}
                onClick={() => setSelectedInstitutionId(inst._id)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  selectedInstitutionId === inst._id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-semibold text-gray-900">{inst.name}</p>
                <p className="text-sm text-gray-500">{inst.code || 'No code'}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {isSuperAdmin && selectedInstitutionId && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-blue-800 font-medium">
            Showing statistics for: {institutions.find((i: any) => i._id === selectedInstitutionId)?.name || 'Selected Institution'}
          </p>
          <button 
            onClick={() => setSelectedInstitutionId(null)}
            className="text-sm text-blue-600 hover:underline mt-1"
          >
            Clear filter to see all
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard label="Total Exams" value={s.totalTests || 0} color="blue" icon={<BookOpen className="w-5 h-5" />} />
        <StatCard label="Active Exams" value={s.activeTests || 0} color="green" icon={<CheckCircle className="w-5 h-5" />} />
        <StatCard label="Total Submissions" value={s.totalSubmissions || 0} color="purple" icon={<FileText className="w-5 h-5" />} />
        <StatCard label="Today" value={s.todaySubmissions || 0} color="orange" icon={<Calendar className="w-5 h-5" />} />
        <StatCard label="Total Students" value={s.totalStudents || 0} color="indigo" icon={<Users className="w-5 h-5" />} />
        <StatCard label="Total Users" value={s.totalUsers || 0} color="pink" icon={<Users className="w-5 h-5" />} />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4">Recent Submissions</h3>
          {s.recentSubmissions?.length > 0 ? (
            <div className="space-y-3">
              {s.recentSubmissions.slice(0, 5).map((r: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{r.userId?.name || 'Unknown'}</p>
                    <p className="text-sm text-gray-500">{r.examId?.title}</p>
                    {isSuperAdmin && r.userId?.institutionId?.name && (
                      <p className="text-xs text-gray-400">{r.userId.institutionId.name}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-600">{r.totalScore}</p>
                    <p className="text-xs text-gray-500">{new Date(r.submittedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No submissions yet</p>
          )}
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4">Performance Summary</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Average Score</span>
              <span className="font-bold text-gray-900">{s.averageScore || '0'}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Total Admins</span>
              <span className="font-bold text-purple-600">{s.totalAdmins || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Completion Rate</span>
              <span className="font-bold text-green-600">
                {s.totalStudents > 0 && s.totalSubmissions > 0 
                  ? ((s.totalSubmissions / (s.totalStudents * Math.max(s.totalTests, 1)) * 100).toFixed(1))
                  : '0'}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon?: React.ReactNode }) {
  const colors: Record<string, string> = { 
    blue: 'bg-blue-50 text-blue-700 border-blue-100', 
    green: 'bg-green-50 text-green-700 border-green-100', 
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    pink: 'bg-pink-50 text-pink-700 border-pink-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100' 
  };
  return (
    <div className={`rounded-xl p-5 border ${colors[color] || colors.blue}`}>
      <div className="flex items-center justify-between mb-2">
        {icon}
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <p className="text-sm opacity-80">{label}</p>
    </div>
  );
}

function ExamModal({ exam, onClose }: { exam: Exam | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit } = useForm({ 
    defaultValues: { 
      title: exam?.title || '', 
      duration: exam?.duration || 180, 
      totalMarks: exam?.totalMarks || 600, 
      isActive: exam?.isActive ?? true, 
      negativeMarking: exam?.negativeMarking ?? true, 
      negativeMarksPerWrong: exam?.negativeMarksPerWrong ?? 1, 
      description: exam?.description || '',
      passingMarks: exam?.passingMarks || 200,
    } 
  });
  const [sections, setSections] = useState(exam?.sections || KEAM_SECTIONS);

  const mutation = useMutation({
    mutationFn: (data: any) => exam ? examAPI.update(exam._id, { ...data, sections }) : examAPI.create({ ...data, sections }),
    onSuccess: () => { toast.success(exam ? 'Exam updated' : 'Exam created'); queryClient.invalidateQueries({ queryKey: ['admin-exams'] }); onClose(); },
  });

  const addSection = () => {
    setSections([...sections, { name: 'General', marksPerQuestion: 4 }]);
  };

  const removeSection = (index: number) => {
    if (sections.length > 1) {
      setSections(sections.filter((_, i) => i !== index));
    }
  };

  const updateSection = (index: number, field: string, value: any) => {
    const newSections = [...sections];
    newSections[index] = { ...newSections[index], [field]: value };
    setSections(newSections);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-900">{exam ? 'Edit Exam' : 'Create New Exam'}</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit(mutation.mutate)} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Exam Title *</label>
            <input {...register('title', { required: true })} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" placeholder="KEAM Mock Test 1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea {...register('description')} rows={2} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" placeholder="Exam description..." />
          </div>
          
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min) *</label>
              <input {...register('duration', { valueAsNumber: true })} type="number" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Marks *</label>
              <input {...register('totalMarks', { valueAsNumber: true })} type="number" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Passing Marks</label>
              <input {...register('passingMarks', { valueAsNumber: true })} type="number" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Neg. Marking</label>
              <input {...register('negativeMarksPerWrong', { valueAsNumber: true })} type="number" step="0.25" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input {...register('isActive')} type="checkbox" className="w-5 h-5 text-blue-600 rounded" />
              <span className="text-sm font-medium text-gray-700">Exam is Active (available to students)</span>
            </label>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">Sections</label>
              <button type="button" onClick={addSection} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                + Add Section
              </button>
            </div>
            <div className="space-y-3">
              {sections.map((section, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <select
                    value={section.name}
                    onChange={(e) => updateSection(idx, 'name', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Mathematics">Mathematics</option>
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="General">General</option>
                  </select>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Marks/Q:</span>
                    <input
                      type="number"
                      value={section.marksPerQuestion}
                      onChange={(e) => updateSection(idx, 'marksPerQuestion', parseInt(e.target.value))}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {sections.length > 1 && (
                    <button type="button" onClick={() => removeSection(idx)} className="p-2 text-gray-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-6 py-2.5 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 font-medium">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="px-6 py-2.5 bg-blue-700 text-white rounded-xl hover:bg-blue-800 disabled:opacity-50 font-medium">
              {exam ? 'Update Exam' : 'Create Exam'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function QuestionModal({ examId, exam, onClose }: { examId: string; exam: Exam | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [section, setSection] = useState(exam?.sections?.[0]?.name || 'Mathematics');
  const [questionText, setQuestionText] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [topic, setTopic] = useState('');
  const [solution, setSolution] = useState('');
  const [options, setOptions] = useState([{ text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim() || options.filter(o => o.text.trim()).length < 2 || !options.some(o => o.isCorrect)) {
      toast.error('Fill question, at least 2 options, and mark correct answer');
      return;
    }
    setIsSubmitting(true);
    try {
      await questionAPI.create({ 
        examId, section, type: 'MCQ', questionText, difficulty, topic, 
        options: options.filter(o => o.text.trim()),
        marks: 4, negativeMarks: 1,
        solution: solution ? { text: solution } : undefined
      });
      toast.success('Question added');
      queryClient.invalidateQueries({ queryKey: ['questions', examId] });
      setQuestionText('');
      setSolution('');
      setOptions([{ text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }]);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    setIsSubmitting(false);
  };

  const updateOption = (idx: number, field: string, value: any) => {
    const newOpts = [...options];
    if (field === 'isCorrect' && value) newOpts.forEach((o, i) => { if (i !== idx) o.isCorrect = false; });
    newOpts[idx] = { ...newOpts[idx], [field]: value };
    setOptions(newOpts);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-900">Add Question (MCQ)</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Section *</label>
              <select value={section} onChange={e => setSection(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500">
                {KEAM_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
              <select value={topic} onChange={e => setTopic(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500">
                <option value="">Select topic</option>
                {(KEAM_TOPICS[section] || []).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500">
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Question * <span className="text-gray-400 font-normal">(supports LaTeX: $x^2$, $$\int dx$$)</span>
            </label>
            <textarea 
              value={questionText} 
              onChange={e => setQuestionText(e.target.value)} 
              rows={3} 
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono text-sm" 
              placeholder="Enter your question here... Use $...$ for inline LaTeX, $$...$$ for block LaTeX" 
            />
            {questionText && (
              <div className="mt-2 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <span className="text-xs text-gray-500 font-medium mb-2 block">Preview:</span>
                <LaTeXRenderer>{questionText}</LaTeXRenderer>
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Options * (select correct answer)</label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-3">
                  <input type="radio" name="correct" checked={opt.isCorrect} onChange={() => updateOption(i, 'isCorrect', true)} className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-bold w-6 text-gray-600">{String.fromCharCode(65 + i)}.</span>
                  <input 
                    value={opt.text} 
                    onChange={e => updateOption(i, 'text', e.target.value)} 
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500" 
                    placeholder={`Option ${String.fromCharCode(65 + i)}`} 
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Solution (optional)</label>
            <textarea 
              value={solution} 
              onChange={e => setSolution(e.target.value)} 
              rows={2} 
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm" 
              placeholder="Explain the solution..." 
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-6 py-2.5 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 font-medium">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-blue-700 text-white rounded-xl hover:bg-blue-800 disabled:opacity-50 font-medium">
              {isSubmitting ? 'Adding...' : 'Add Question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
