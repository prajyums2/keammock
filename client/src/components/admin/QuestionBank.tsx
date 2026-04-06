import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { BookOpen, Plus, Search, Filter, Trash2, CheckCircle, ChevronDown, ChevronRight, Upload, X, ArrowRight, BarChart3, Square, CheckSquare, Layers } from 'lucide-react';
import { questionBankAPI, examAPI } from '../../lib/api';
import LaTeXRenderer from '../common/LaTeXRenderer';
import BulkImportModal from './BulkImportModal';

const SUBJECTS = ['Mathematics', 'Physics', 'Chemistry'];
const TOPICS: Record<string, string[]> = {
  Mathematics: ['Algebra', 'Calculus', 'Trigonometry', 'Coordinate Geometry', 'Vectors', 'Probability', 'Statistics', 'Matrices', 'Sets & Relations', 'Limits & Continuity'],
  Physics: ['Mechanics', 'Optics', 'Thermodynamics', 'Electromagnetism', 'Modern Physics', 'Waves', 'Gravitation', 'Fluid Mechanics', 'SHM', 'Current Electricity'],
  Chemistry: ['Organic Chemistry', 'Inorganic Chemistry', 'Physical Chemistry', 'Environmental Chemistry', 'Biomolecules', 'Polymers', 'Chemistry in Everyday Life', 'Atomic Structure', 'Chemical Bonding', 'Equilibrium'],
};
const DIFFICULTIES = ['easy', 'medium', 'hard'];

export default function QuestionBank() {
  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [showAddToExamModal, setShowAddToExamModal] = useState(false);

  const queryClient = useQueryClient();

  const { data: questionsData, isLoading } = useQuery({
    queryKey: ['question-bank', search, filterSubject, filterTopic, filterDifficulty],
    queryFn: () => questionBankAPI.getAll({ 
      search: search || undefined,
      subject: filterSubject || undefined,
      topic: filterTopic || undefined,
      difficulty: filterDifficulty || undefined,
      limit: 200 
    }),
  });

  const { data: statsData } = useQuery({
    queryKey: ['question-bank-stats'],
    queryFn: () => questionBankAPI.getStats(),
  });

  const { data: examsData } = useQuery({
    queryKey: ['admin-exams'],
    queryFn: () => examAPI.getAll(),
  });

  const questions = questionsData?.data?.data?.questions || questionsData?.data?.questions || [];
  const stats = statsData?.data?.data || statsData?.data || {};
  const exams = examsData?.data?.data || examsData?.data || [];

  const filteredTopics = useMemo(() => {
    return filterSubject ? TOPICS[filterSubject] || [] : [];
  }, [filterSubject]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => questionBankAPI.delete(id),
    onSuccess: () => {
      toast.success('Question deleted');
      queryClient.invalidateQueries({ queryKey: ['question-bank'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to delete'),
  });

  const addToExamMutation = useMutation({
    mutationFn: (data: { examId: string; questionIds: string[]; section: string }) => 
      questionBankAPI.addToExam(data),
    onSuccess: (data, vars) => {
      toast.success(`${vars.questionIds.length} questions added to exam`);
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['exam-questions', vars.examId] });
      queryClient.invalidateQueries({ queryKey: ['exam', vars.examId] });
      queryClient.invalidateQueries({ queryKey: ['admin-exams'] });
      setSelectedQuestions(new Set());
      setShowAddToExamModal(false);
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to add questions'),
  });

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedQuestions(newExpanded);
  };

  const toggleQuestionSelection = (id: string) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedQuestions(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedQuestions.size === questions.length) {
      setSelectedQuestions(new Set());
    } else {
      setSelectedQuestions(new Set(questions.map((q: any) => q._id)));
    }
  };

  const clearFilters = () => {
    setSearch('');
    setFilterSubject('');
    setFilterTopic('');
    setFilterDifficulty('');
  };

  const hasActiveFilters = search || filterSubject || filterTopic || filterDifficulty;

  const handleAddToExam = (examId: string, section: string) => {
    addToExamMutation.mutate({
      examId,
      questionIds: Array.from(selectedQuestions),
      section
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <BookOpen className="w-7 h-7 mr-2 text-blue-600" />
            Question Bank
          </h2>
          <p className="text-gray-600 mt-1">Manage and organize your question repository</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium transition-colors"
          >
            <Upload className="w-5 h-5 mr-2" />
            Bulk Import
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
          <div className="text-3xl font-bold text-blue-700">{stats.total || questions.length}</div>
          <div className="text-blue-600 text-sm">Total Questions</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
          <div className="text-3xl font-bold text-green-700">
            {stats.bySubject?.find((s: any) => s._id === 'Mathematics')?.count || 0}
          </div>
          <div className="text-green-600 text-sm">Mathematics</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
          <div className="text-3xl font-bold text-purple-700">
            {stats.bySubject?.find((s: any) => s._id === 'Physics')?.count || 0}
          </div>
          <div className="text-purple-600 text-sm">Physics</div>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
          <div className="text-3xl font-bold text-amber-700">
            {stats.bySubject?.find((s: any) => s._id === 'Chemistry')?.count || 0}
          </div>
          <div className="text-amber-600 text-sm">Chemistry</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions, topics, or tags..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center px-4 py-2.5 rounded-xl font-medium transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter className="w-5 h-5 mr-2" />
            Filters
            {hasActiveFilters && (
              <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {[filterSubject, filterTopic, filterDifficulty, search].filter(Boolean).length}
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center px-4 py-2.5 text-gray-600 hover:text-gray-900"
            >
              <X className="w-5 h-5 mr-1" />
              Clear
            </button>
          )}
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <select
                value={filterSubject}
                onChange={(e) => { setFilterSubject(e.target.value); setFilterTopic(''); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Subjects</option>
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
              <select
                value={filterTopic}
                onChange={(e) => setFilterTopic(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={!filterSubject}
              >
                <option value="">All Topics</option>
                {filteredTopics.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
              <select
                value={filterDifficulty}
                onChange={(e) => setFilterDifficulty(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Difficulties</option>
                {DIFFICULTIES.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Selection Bar */}
      {selectedQuestions.size > 0 && (
        <div className="bg-blue-600 rounded-xl p-4 text-white flex items-center justify-between">
          <div className="flex items-center">
            <CheckSquare className="w-5 h-5 mr-3" />
            <span className="font-medium">{selectedQuestions.size} question{selectedQuestions.size > 1 ? 's' : ''} selected</span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSelectedQuestions(new Set())}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
            >
              Clear Selection
            </button>
            <button
              onClick={() => setShowAddToExamModal(true)}
              className="px-4 py-2 bg-white text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium transition-colors flex items-center"
            >
              <Layers className="w-4 h-4 mr-2" />
              Add to Exam
            </button>
          </div>
        </div>
      )}

      {/* Questions List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={selectedQuestions.size === questions.length && questions.length > 0}
                onChange={toggleSelectAll}
                className="w-5 h-5 text-blue-600 rounded mr-3"
              />
              <h3 className="font-bold text-gray-900">
                Questions ({questions.length})
              </h3>
            </label>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <BarChart3 className="w-4 h-4" />
            <span>{selectedQuestions.size > 0 ? `${selectedQuestions.size} selected` : 'None selected'}</span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading questions...</div>
        ) : questions.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No questions found</h3>
            <p className="text-gray-500 mb-4">Import questions from JSON/CSV or add them manually.</p>
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Import Questions
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {questions.map((q: any) => {
              const isExpanded = expandedQuestions.has(q._id);
              const isSelected = selectedQuestions.has(q._id);
              
              return (
                <div 
                  key={q._id} 
                  className={`transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleQuestionSelection(q._id)}
                          className="mt-1 w-5 h-5 text-blue-600 rounded"
                        />
                        <div className="flex-1">
                          <div className="flex items-center flex-wrap gap-2 mb-2">
                            <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-semibold">
                              {q.subject}
                            </span>
                            <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs">
                              {q.topic}
                            </span>
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                              q.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                              q.difficulty === 'medium' ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {q.difficulty}
                            </span>
                            {q.usageCount > 0 && (
                              <span className="text-xs text-gray-500">
                                Used {q.usageCount}x
                              </span>
                            )}
                          </div>
                          <p className="text-gray-800 mb-2">
                            <LaTeXRenderer>{q.questionText.length > 150 ? q.questionText.slice(0, 150) + '...' : q.questionText}</LaTeXRenderer>
                          </p>
                          {q.options && (
                            <div className="text-sm text-gray-600 flex flex-wrap gap-2">
                              {q.options.map((opt: any, i: number) => (
                                <span 
                                  key={i} 
                                  className={`px-2 py-1 rounded ${
                                    opt.isCorrect ? 'bg-green-100 text-green-700 font-medium' : 'bg-gray-50 text-gray-600'
                                  }`}
                                >
                                  {String.fromCharCode(65 + i)}. <LaTeXRenderer>{opt.text.length > 30 ? opt.text.slice(0, 30) + '...' : opt.text}</LaTeXRenderer>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => toggleQuestionSelection(q._id)}
                          className={`p-2 rounded-lg transition-colors ${isSelected ? 'text-blue-600 bg-blue-100' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}
                          title={isSelected ? 'Remove from selection' : 'Add to selection'}
                        >
                          {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                        </button>
                        <button
                          onClick={() => toggleExpand(q._id)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                          {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this question?')) deleteMutation.mutate(q._id);
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 border-t border-gray-100 bg-gray-50 -mt-px">
                      <div className="p-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">Full Question</h4>
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                              <LaTeXRenderer>{q.questionText}</LaTeXRenderer>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">Options</h4>
                            <div className="space-y-2">
                              {q.options?.map((opt: any, i: number) => (
                                <div 
                                  key={i} 
                                  className={`p-3 rounded-lg ${
                                    opt.isCorrect ? 'bg-green-100 border border-green-300' : 'bg-white border border-gray-200'
                                  }`}
                                >
                                  <span className="font-semibold mr-2">{String.fromCharCode(65 + i)}.</span>
                                  <LaTeXRenderer>{opt.text}</LaTeXRenderer>
                                  {opt.isCorrect && (
                                    <span className="ml-2 inline-flex items-center text-green-700 text-xs">
                                      <CheckCircle className="w-3 h-3 mr-1" /> Correct
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        {q.solution?.text && (
                          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                            <h4 className="text-sm font-semibold text-amber-900 mb-2">Solution</h4>
                            <p className="text-amber-800"><LaTeXRenderer>{q.solution.text}</LaTeXRenderer></p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add to Exam Modal */}
      {showAddToExamModal && (
        <AddToExamModal
          exams={exams}
          selectedCount={selectedQuestions.size}
          onClose={() => setShowAddToExamModal(false)}
          onConfirm={handleAddToExam}
          isLoading={addToExamMutation.isPending}
        />
      )}

      {showImportModal && (
        <BulkImportModal 
          onClose={() => setShowImportModal(false)} 
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['question-bank'] });
          }}
        />
      )}
    </div>
  );
}

function AddToExamModal({ exams, selectedCount, onClose, onConfirm, isLoading }: {
  exams: any[];
  selectedCount: number;
  onClose: () => void;
  onConfirm: (examId: string, section: string) => void;
  isLoading: boolean;
}) {
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  const selectedExamData = exams.find(e => e._id === selectedExam);
  const examSections = selectedExamData?.sections?.map((s: any) => s.name) || [];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-900">Add to Exam</h3>
          <p className="text-gray-500 text-sm mt-1">{selectedCount} questions selected</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Exam</label>
            <select
              value={selectedExam}
              onChange={(e) => {
                setSelectedExam(e.target.value);
                setSelectedSection('');
              }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose an exam...</option>
              {exams.map(exam => (
                <option key={exam._id} value={exam._id}>{exam.title}</option>
              ))}
            </select>
            {exams.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">No exams available. Create an exam first.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Section {!selectedExam && <span className="text-gray-400">(select exam first)</span>}
            </label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              disabled={!selectedExam}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Select section...</option>
              {examSections.map((section: string) => (
                <option key={section} value={section}>{section}</option>
              ))}
            </select>
            {selectedExam && examSections.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">This exam has no sections. Use the Section Editor to add sections.</p>
            )}
          </div>
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (selectedExam && selectedSection) {
                onConfirm(selectedExam, selectedSection);
              }
            }}
            disabled={!selectedExam || !selectedSection || isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {isLoading ? 'Adding...' : 'Add Questions'}
          </button>
        </div>
      </div>
    </div>
  );
}
