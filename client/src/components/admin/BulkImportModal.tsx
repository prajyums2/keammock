import { useState, useRef, useCallback } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Upload, FileText, X, CheckCircle, AlertCircle, Download, FileJson, Table, ChevronRight, ChevronDown, Eye, Trash2, GripVertical, Search, Plus, Minus } from 'lucide-react';
import { questionBankAPI, examAPI } from '../../lib/api';
import LaTeXRenderer from '../common/LaTeXRenderer';

interface BulkImportModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  examId?: string;
}

interface QuestionPreview {
  questionText: string;
  type: string;
  subject: string;
  topic: string;
  difficulty: string;
  marks: number;
  options?: { text: string; isCorrect: boolean }[];
  correctAnswer?: any;
  solution?: { text: string };
  [key: string]: any;
}

export default function BulkImportModal({ onClose, onSuccess, examId }: BulkImportModalProps) {
  const [activeTab, setActiveTab] = useState<'json' | 'csv'>('json');
  const [jsonData, setJsonData] = useState('');
  const [csvData, setCsvData] = useState('');
  const [preview, setPreview] = useState<QuestionPreview[]>([]);
  const [errors, setErrors] = useState<{ row: number; field: string; message: string }[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set());
  const [showPreviewDetails, setShowPreviewDetails] = useState<Record<number, boolean>>({});
  const [targetExam, setTargetExam] = useState(examId || '');
  const [targetSection, setTargetSection] = useState('Mathematics');
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { data: examsData } = useQuery({ queryKey: ['admin-exams'], queryFn: () => examAPI.getAll() });
  const exams = examsData?.data?.data || examsData?.data || [];

  const importMutation = useMutation({
    mutationFn: async (data: { questions: any[]; examId?: string; section?: string }) => {
      const payload = { questions: data.questions };
      if (data.examId && data.section) {
        const bankResult = await questionBankAPI.importJSON(payload);
        const imported = bankResult.data.data?.questions || bankResult.data.questions || [];
        await questionBankAPI.addToExam({
          examId: data.examId,
          questionIds: imported.map((q: any) => q._id),
          section: data.section,
          shuffleOptions: false
        });
        return bankResult;
      }
      return questionBankAPI.importJSON(payload);
    },
    onSuccess: (data) => {
      const imported = data.data.data?.imported || data.data.imported;
      toast.success(`${imported} questions imported successfully!`);
      queryClient.invalidateQueries({ queryKey: ['question-bank'] });
      queryClient.invalidateQueries({ queryKey: ['questions', examId || targetExam] });
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to import questions');
    },
  });

  const validateAndPreview = useCallback(() => {
    const data = activeTab === 'json' ? jsonData : csvData;
    if (!data.trim()) {
      toast.error('Please enter data to import');
      return;
    }

    let questions: QuestionPreview[] = [];
    const validationErrors: { row: number; field: string; message: string }[] = [];

    try {
      if (activeTab === 'json') {
        const parsed = JSON.parse(data);
        questions = Array.isArray(parsed) ? parsed : parsed.questions || [];
      } else {
        questions = parseCSV(data);
      }

      if (questions.length === 0) {
        toast.error('No questions found in the data');
        return;
      }

      questions.forEach((q, index) => {
        const row = index + 1;
        if (!q.questionText?.trim()) {
          validationErrors.push({ row, field: 'questionText', message: 'Missing question text' });
        }
        if (!q.type) {
          validationErrors.push({ row, field: 'type', message: 'Missing question type' });
        } else if (!['MCQ', 'MSQ', 'NAT'].includes(q.type)) {
          validationErrors.push({ row, field: 'type', message: `Invalid type "${q.type}". Use MCQ, MSQ, or NAT` });
        }
        if (!q.subject) {
          validationErrors.push({ row, field: 'subject', message: 'Missing subject' });
        }
        if (!q.topic) {
          validationErrors.push({ row, field: 'topic', message: 'Missing topic' });
        }
        
        if (q.type === 'MCQ' || q.type === 'MSQ') {
          if (!q.options || q.options.length < 2) {
            validationErrors.push({ row, field: 'options', message: 'MCQ/MSQ must have at least 2 options' });
          }
          const correctCount = q.options?.filter((o: any) => o.isCorrect).length || 0;
          if (q.type === 'MCQ' && correctCount !== 1) {
            validationErrors.push({ row, field: 'options', message: 'MCQ must have exactly one correct answer' });
          }
          if (q.type === 'MSQ' && correctCount < 1) {
            validationErrors.push({ row, field: 'options', message: 'MSQ must have at least one correct answer' });
          }
        }
        
        if (q.type === 'NAT') {
          if (!q.correctAnswer) {
            validationErrors.push({ row, field: 'correctAnswer', message: 'NAT questions require correctAnswer with min/max' });
          }
        }
      });

      setPreview(questions);
      setErrors(validationErrors);
      setSelectedQuestions(new Set(questions.map((_, i) => i)));
      setIsPreviewMode(true);
    } catch (error) {
      toast.error('Invalid JSON format. Please check your data.');
    }
  }, [activeTab, jsonData, csvData]);

  const parseCSV = (csv: string): QuestionPreview[] => {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const questions: QuestionPreview[] = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = parseCSVLine(lines[i]);
      const q: QuestionPreview = { questionText: '', type: 'MCQ', subject: '', topic: '', difficulty: 'medium', marks: 4 };
      
      headers.forEach((header, idx) => {
        const value = values[idx]?.trim().replace(/^"|"$/g, '') || '';
        if (header === 'options' && value) {
          q.options = value.split('|').map((opt, oi) => ({
            text: opt.trim(),
            isCorrect: false
          }));
        } else if (header === 'correctOptions' && value && q.options) {
          const correctIndices = value.split('|').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
          correctIndices.forEach(idx => {
            if (q.options && q.options[idx]) q.options[idx].isCorrect = true;
          });
        } else if (header === 'correctAnswer') {
          try {
            q.correctAnswer = JSON.parse(value);
          } catch {
            q.correctAnswer = value;
          }
        } else if (header === 'marks' || header === 'difficulty') {
          q[header] = isNaN(Number(value)) ? value : Number(value);
        } else {
          q[header] = value;
        }
      });
      
      questions.push(q);
    }
    return questions;
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const handleDragStart = (event: any) => {
    setDraggedId(event.active.id);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setDraggedId(null);
    
    if (!over || active.id === over.id) return;
    
    const oldIndex = preview.findIndex((_, idx) => idx === active.id);
    const newIndex = preview.findIndex((_, idx) => idx === over.id);
    
    if (oldIndex !== -1 && newIndex !== -1) {
      setPreview(arrayMove(preview, oldIndex, newIndex));
      const newSelected = new Set<number>();
      preview.forEach((_, idx) => {
        if (selectedQuestions.has(idx)) {
          if (idx === oldIndex) newSelected.add(newIndex);
          else if (idx > oldIndex && idx <= newIndex) newSelected.add(idx - 1);
          else if (idx < oldIndex && idx >= newIndex) newSelected.add(idx + 1);
          else newSelected.add(idx);
        }
      });
      setSelectedQuestions(newSelected);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (file.name.endsWith('.json')) {
        setActiveTab('json');
        setJsonData(content);
      } else if (file.name.endsWith('.csv')) {
        setActiveTab('csv');
        setCsvData(content);
      } else {
        toast.error('Please upload a JSON or CSV file');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (selectedQuestions.size === 0) {
      toast.error('Please select at least one question');
      return;
    }
    
    const selected = preview.filter((_, idx) => selectedQuestions.has(idx));
    const importData = {
      questions: selected,
      examId: targetExam || undefined,
      section: targetSection
    };
    
    importMutation.mutate(importData);
  };

  const toggleQuestionSelection = (index: number) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedQuestions(newSelected);
  };

  const selectAll = () => {
    if (selectedQuestions.size === preview.length) {
      setSelectedQuestions(new Set());
    } else {
      setSelectedQuestions(new Set(preview.map((_, i) => i)));
    }
  };

  const downloadTemplate = (format: 'json' | 'csv') => {
    if (format === 'json') {
      const template = {
        description: "KEAM Question Bank Import Template",
        instructions: "Each object represents one question. MCQ/MSQ need options array, NAT needs correctAnswer with min/max.",
        questions: [
          {
            questionText: "If $x + \\frac{1}{x} = 2$, then the value of $x^{2024} + \\frac{1}{x^{2024}}$ is:",
            type: "MCQ",
            subject: "Mathematics",
            topic: "Algebra",
            difficulty: "medium",
            marks: 4,
            options: [
              { text: "0", isCorrect: false },
              { text: "1", isCorrect: true },
              { text: "2", isCorrect: false },
              { text: "-1", isCorrect: false }
            ],
            solution: { text: "Given $x + \\frac{1}{x} = 2$, we can square both sides to get $x^2 + 2 + \\frac{1}{x^2} = 4$, so $x^2 + \\frac{1}{x^2} = 2$. Continuing this pattern, $x^n + \\frac{1}{x^n} = 2$ for all $n$, so answer is 2 for $n=2024$." }
          },
          {
            questionText: "The velocity of a particle is given by $v = 3t^2 + 2t + 1$. The acceleration at $t = 2s$ is:",
            type: "MCQ",
            subject: "Physics",
            topic: "Mechanics",
            difficulty: "easy",
            marks: 4,
            options: [
              { text: "$10 \\text{ m/s}^2$", isCorrect: false },
              { text: "$12 \\text{ m/s}^2$", isCorrect: false },
              { text: "$14 \\text{ m/s}^2$", isCorrect: true },
              { text: "$16 \\text{ m/s}^2$", isCorrect: false }
            ],
            solution: { text: "$a = \\frac{dv}{dt} = 6t + 2$. At $t = 2s$, $a = 6(2) + 2 = 14 \\text{ m/s}^2$" }
          }
        ]
      };
      
      const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
      downloadBlob(blob, 'keam_questions_template.json');
    } else {
      const template = `questionText,type,subject,topic,difficulty,marks,options,correctOptions,solution
"If $x + 1/x = 2$, find $x^{10} + 1/x^{10}$",MCQ,Mathematics,Algebra,medium,4,"0|1|2|-1",1,Solution explanation here
"A particle moves with v = 4t + 2. Find acceleration at t=3s",MCQ,Physics,Mechanics,easy,4,"8 m/s²|10 m/s²|14 m/s²|12 m/s²",2,Use a = dv/dt = 4 m/s²`;
      
      const blob = new Blob([template], { type: 'text/csv' });
      downloadBlob(blob, 'keam_questions_template.csv');
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const errorCount = errors.length;
  const validCount = preview.length - new Set(errors.map(e => e.row)).size;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-800 to-blue-900 text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-white/10 rounded-lg">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Bulk Import Questions</h2>
                <p className="text-blue-200 text-sm">Import questions from JSON or CSV format</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {!isPreviewMode ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex space-x-4 mb-6">
              <button
                onClick={() => setActiveTab('json')}
                className={`flex items-center px-5 py-3 rounded-xl font-semibold transition-all ${
                  activeTab === 'json'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FileJson className="w-5 h-5 mr-2" />
                JSON Format
              </button>
              <button
                onClick={() => setActiveTab('csv')}
                className={`flex items-center px-5 py-3 rounded-xl font-semibold transition-all ${
                  activeTab === 'csv'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Table className="w-5 h-5 mr-2" />
                CSV Format
              </button>
            </div>

            <div className="mb-6">
              <div 
                className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-blue-400', 'bg-blue-50'); }}
                onDragLeave={(e) => { e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50'); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                  const file = e.dataTransfer.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const content = ev.target?.result as string;
                      if (file.name.endsWith('.json')) {
                        setActiveTab('json');
                        setJsonData(content);
                      } else if (file.name.endsWith('.csv')) {
                        setActiveTab('csv');
                        setCsvData(content);
                      } else {
                        toast.error('Please upload a JSON or CSV file');
                      }
                    };
                    reader.readAsText(file);
                  }
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".json,.csv"
                  className="hidden"
                />
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-700 font-medium mb-1">Click to upload or drag and drop</p>
                <p className="text-gray-500 text-sm">JSON or CSV files only</p>
              </div>
            </div>

            <div className="mb-6 p-5 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200">
              <div className="flex items-start">
                <div className="p-2 bg-green-100 rounded-lg mr-3 mt-0.5">
                  <Download className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-green-900 mb-1">Download Template</h3>
                  <p className="text-green-700 text-sm mb-3">Get a pre-formatted template with example KEAM questions</p>
                  <div className="flex space-x-4">
                    <button
                      onClick={() => downloadTemplate('json')}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2"
                    >
                      Download JSON Template
                    </button>
                    <button
                      onClick={() => downloadTemplate('csv')}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2"
                    >
                      Download CSV Template
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6 p-5 bg-gray-50 rounded-2xl">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-blue-600" />
                Format Instructions
              </h3>
              {activeTab === 'json' ? (
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Required Fields</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• <code className="bg-gray-200 px-1 rounded">questionText</code> - The question content</li>
                      <li>• <code className="bg-gray-200 px-1 rounded">type</code> - MCQ, MSQ, or NAT</li>
                      <li>• <code className="bg-gray-200 px-1 rounded">subject</code> - Mathematics, Physics, Chemistry</li>
                      <li>• <code className="bg-gray-200 px-1 rounded">topic</code> - Topic name</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">For MCQ/MSQ</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• <code className="bg-gray-200 px-1 rounded">options</code> - Array of option objects</li>
                      <li>• Each option has <code className="bg-gray-200 px-1 rounded">text</code> and <code className="bg-gray-200 px-1 rounded">isCorrect</code></li>
                      <li>• Use LaTeX for math: <code className="bg-gray-200 px-1 rounded">$...$</code></li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">CSV Format</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• First row: column headers</li>
                      <li>• Options: separated by | (pipe)</li>
                      <li>• correctOptions: indices 0-based (e.g., "1" for option B)</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Example</h4>
                    <code className="text-xs bg-gray-200 p-2 rounded block">
                      questionText,type,subject,topic<br/>
                      "2+2=?",MCQ,Math,Arithmetic
                    </code>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paste your {activeTab.toUpperCase()} data here:
              </label>
              <textarea
                value={activeTab === 'json' ? jsonData : csvData}
                onChange={(e) => activeTab === 'json' ? setJsonData(e.target.value) : setCsvData(e.target.value)}
                rows={12}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm bg-gray-50"
                placeholder={activeTab === 'json' ? '[\n  {\n    "questionText": "...",\n    "type": "MCQ",\n    "subject": "Mathematics"\n  }\n]' : 'questionText,type,subject,topic,...'}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
              <button
                onClick={onClose}
                className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={validateAndPreview}
                disabled={!jsonData.trim() && !csvData.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium disabled:opacity-50 transition-colors flex items-center"
              >
                Preview & Validate
                <ChevronRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                  <div className="text-3xl font-bold text-blue-700">{preview.length}</div>
                  <div className="text-blue-600 text-sm">Total Questions</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                  <div className="text-3xl font-bold text-green-700">{validCount}</div>
                  <div className="text-green-600 text-sm">Valid Questions</div>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
                  <div className="text-3xl font-bold text-amber-700">{errorCount}</div>
                  <div className="text-amber-600 text-sm">Validation Errors</div>
                </div>
              </div>

              <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Add to Exam (optional)</label>
                    <select
                      value={targetExam}
                      onChange={(e) => setTargetExam(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Import to Question Bank only</option>
                      {exams.map((exam: any) => (
                        <option key={exam._id} value={exam._id}>{exam.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
                    <select
                      value={targetSection}
                      onChange={(e) => setTargetSection(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Mathematics">Mathematics</option>
                      <option value="Physics">Physics</option>
                      <option value="Chemistry">Chemistry</option>
                    </select>
                  </div>
                </div>
              </div>

              {errors.length > 0 && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center mb-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                    <h4 className="font-bold text-red-800">Validation Errors ({errors.length})</h4>
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {errors.slice(0, 10).map((error, idx) => (
                      <div key={idx} className="text-sm text-red-700 flex items-start">
                        <span className="font-mono bg-red-100 px-1.5 rounded mr-2 text-xs">Row {error.row}</span>
                        <span>{error.message}</span>
                      </div>
                    ))}
                    {errors.length > 10 && (
                      <div className="text-sm text-red-600 italic">
                        ...and {errors.length - 10} more errors
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Question Preview (Drag to reorder)</h3>
                <button
                  onClick={selectAll}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {selectedQuestions.size === preview.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <SortableContext items={preview.map((_, idx) => idx)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {preview.map((q, idx) => {
                    const hasErrors = errors.some(e => e.row === idx + 1);
                    const isSelected = selectedQuestions.has(idx);
                    const isExpanded = showPreviewDetails[idx];
                    
                    return (
                      <SortableQuestionItem
                        key={idx}
                        idx={idx}
                        question={q}
                        isSelected={isSelected}
                        hasErrors={hasErrors}
                        isExpanded={isExpanded}
                        errors={errors.filter(e => e.row === idx + 1)}
                        onToggleSelect={() => toggleQuestionSelection(idx)}
                        onToggleExpand={() => setShowPreviewDetails({ ...showPreviewDetails, [idx]: !isExpanded })}
                      />
                    );
                  })}
                </div>
              </SortableContext>

              <div className="flex justify-between items-center pt-6 mt-6 border-t border-gray-100">
                <button
                  onClick={() => setIsPreviewMode(false)}
                  className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 font-medium transition-colors"
                >
                  Back to Edit
                </button>
                <button
                  onClick={handleImport}
                  disabled={selectedQuestions.size === 0 || importMutation.isPending}
                  className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 disabled:opacity-50 font-semibold transition-all shadow-md flex items-center"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  {importMutation.isPending ? 'Importing...' : `Import ${selectedQuestions.size} Questions`}
                </button>
              </div>
              <DragOverlay>
                {draggedId !== null && (
                  <div className="bg-white rounded-lg shadow-2xl border-2 border-blue-400 p-4">
                    <p className="font-medium text-gray-900">
                      Q{draggedId + 1}: {preview[draggedId]?.questionText?.slice(0, 50)}...
                    </p>
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          </div>
        )}
      </div>
    </div>
  );
}

interface SortableQuestionItemProps {
  idx: number;
  question: QuestionPreview;
  isSelected: boolean;
  hasErrors: boolean;
  isExpanded: boolean;
  errors: { row: number; field: string; message: string }[];
  onToggleSelect: () => void;
  onToggleExpand: () => void;
}

function SortableQuestionItem({ idx, question, isSelected, hasErrors, isExpanded, errors, onToggleSelect, onToggleExpand }: SortableQuestionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: idx });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border-2 rounded-xl overflow-hidden transition-all ${
        isDragging ? 'border-blue-400 shadow-lg opacity-90 scale-[1.02]' :
        hasErrors ? 'border-red-300 bg-red-50' : 
        isSelected ? 'border-blue-300 bg-blue-50' : 
        'border-gray-200'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div
              {...attributes}
              {...listeners}
              className="p-1 text-gray-400 cursor-grab active:cursor-grabbing mt-1"
            >
              <GripVertical className="w-5 h-5" />
            </div>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              className="mt-1 w-5 h-5 text-blue-600 rounded cursor-pointer"
            />
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-bold text-gray-700">Q{idx + 1}</span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">{question.type}</span>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{question.subject}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  question.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                  question.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
                  'bg-amber-100 text-amber-700'
                }`}>{question.difficulty}</span>
                {hasErrors && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                    {errors.length} error{errors.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-gray-800 text-sm line-clamp-2"><LaTeXRenderer>{question.questionText}</LaTeXRenderer></p>
              {question.options && (
                <div className="mt-2 text-xs text-gray-600">
                  Options: {question.options.map(o => <span key={o.text}><LaTeXRenderer>{o.text}</LaTeXRenderer></span>).reduce((prev: any, curr: any, i: number) => [prev, i > 0 ? ' | ' : '', curr])}
                  <span className="ml-2 text-green-600">
                    (Correct: {question.options.filter(o => o.isCorrect).map((_, i) => String.fromCharCode(65 + i)).join(', ')})
                  </span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onToggleExpand}
            className="p-1 hover:bg-gray-100 rounded text-gray-500"
          >
            {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-100 bg-white">
          <div className="p-4 bg-gray-50 rounded-lg mt-3">
            <div className="text-sm font-medium text-gray-700 mb-2">Full Question:</div>
            <div className="text-gray-800">
              <LaTeXRenderer>{question.questionText}</LaTeXRenderer>
            </div>
            {question.options && (
              <div className="mt-3 space-y-2">
                <div className="text-sm font-medium text-gray-700">Options:</div>
                {question.options.map((opt, oi) => (
                  <div 
                    key={oi} 
                    className={`text-sm p-2 rounded ${opt.isCorrect ? 'bg-green-100 text-green-800 font-medium' : 'bg-gray-100 text-gray-700'}`}
                  >
                    {String.fromCharCode(65 + oi)}. <LaTeXRenderer>{opt.text}</LaTeXRenderer>
                  </div>
                ))}
              </div>
            )}
            {question.solution?.text && (
              <div className="mt-3 p-3 bg-amber-50 rounded text-sm">
                <div className="font-medium text-amber-800 mb-1">Solution:</div>
                <div className="text-amber-700"><LaTeXRenderer>{question.solution.text}</LaTeXRenderer></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
