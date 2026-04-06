import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  KeyboardSensor,
  closestCenter,
  pointerWithin,
} from '@dnd-kit/core';
import type { UniqueIdentifier } from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { questionAPI, examAPI, questionBankAPI } from '../../lib/api';
import { Plus, GripVertical, Trash2, Edit2, Save, X, ChevronDown, ChevronRight, Check, BookOpen, FileQuestion, Layers, Search } from 'lucide-react';
import LaTeXRenderer from '../common/LaTeXRenderer';

interface Section {
  id: string;
  name: string;
  marksPerQuestion: number;
  questions: Question[];
}

interface Question {
  _id: string;
  questionText: string;
  type: string;
  difficulty?: string;
  marks: number;
  options?: { text: string; isCorrect: boolean }[];
}

interface ExamSectionEditorProps {
  examId: string;
  onClose?: () => void;
}

export default function ExamSectionEditor({ examId, onClose }: ExamSectionEditorProps) {
  const queryClient = useQueryClient();
  const [sections, setSections] = useState<Section[]>([]);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState('');
  const [editingMarks, setEditingMarks] = useState(4);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [activeType, setActiveType] = useState<'section' | 'question' | null>(null);
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: examData } = useQuery({
    queryKey: ['exam', examId],
    queryFn: () => examAPI.getById(examId),
  });

  const { data: questionsData } = useQuery({
    queryKey: ['exam-questions', examId],
    queryFn: () => questionAPI.getByExam(examId),
  });

  const allQuestions = questionsData?.data?.data || questionsData?.data || [];
  const exam = examData?.data?.data || examData?.data;

  useEffect(() => {
    if (exam?.sections) {
      const loadedSections = exam.sections.map((s: any, idx: number) => ({
        id: s._id || `section-${idx}`,
        name: s.name,
        marksPerQuestion: s.marksPerQuestion || 4,
        questions: (s.questions || []).map((q: any) => 
          allQuestions.find((aq: any) => aq._id === q._id || aq._id === q) || q
        ).filter(Boolean),
      }));
      setSections(loadedSections);
      setExpandedSections(new Set(loadedSections.map(s => s.id)));
    }
  }, [exam, allQuestions]);

  const saveMutation = useMutation({
    mutationFn: (data: { sections: any[] }) => examAPI.update(examId, { sections: data.sections }),
    onSuccess: () => {
      toast.success('Sections saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['exam', examId] });
      queryClient.invalidateQueries({ queryKey: ['exam-questions', examId] });
      queryClient.invalidateQueries({ queryKey: ['admin-exams'] });
    },
    onError: () => toast.error('Failed to save sections'),
  });

  const handleDragStart = (event: any) => {
    const { active } = event;
    setActiveId(active.id);
    
    const section = sections.find(s => s.id === active.id);
    if (section) {
      setActiveType('section');
      setDraggedItem(section);
    } else {
      setActiveType('question');
      for (const sec of sections) {
        const question = sec.questions.find(q => q._id === active.id);
        if (question) {
          setDraggedItem({ ...question, sourceSectionId: sec.id });
          break;
        }
      }
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    
    setActiveId(null);
    setActiveType(null);
    setDraggedItem(null);

    if (!over || active.id === over.id) return;

    setSections((prevSections) => {
      if (activeType === 'section') {
        const oldIndex = prevSections.findIndex(s => s.id === active.id);
        const newIndex = prevSections.findIndex(s => s.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          return arrayMove(prevSections, oldIndex, newIndex);
        }
        return prevSections;
      } else if (activeType === 'question') {
        const sourceSection = prevSections.find(s => s.questions.some(q => q._id === active.id));
        if (!sourceSection) return prevSections;

        const sourceIndex = sourceSection.questions.findIndex(q => q._id === active.id);
        
        const overQuestion = prevSections.flatMap(s => s.questions).find(q => q._id === over.id);
        const overSection = prevSections.find(s => s.id === over.id);
        
        let targetSection: Section | undefined;
        let targetIndex = -1;

        if (overQuestion) {
          targetSection = prevSections.find(s => s.questions.some(q => q._id === over.id));
          if (targetSection) {
            targetIndex = targetSection.questions.findIndex(q => q._id === over.id);
          }
        } else if (overSection) {
          targetSection = overSection;
          targetIndex = targetSection.questions.length;
        }

        if (!targetSection || targetIndex === -1) return prevSections;

        if (sourceSection.id === targetSection.id) {
          if (sourceIndex !== targetIndex) {
            const newQuestions = arrayMove(sourceSection.questions, sourceIndex, targetIndex);
            return prevSections.map(s => 
              s.id === sourceSection.id ? { ...s, questions: newQuestions } : s
            );
          }
        } else {
          const question = sourceSection.questions[sourceIndex];
          return prevSections.map(s => {
            if (s.id === sourceSection.id) {
              return { ...s, questions: s.questions.filter(q => q._id !== active.id) };
            }
            if (s.id === targetSection!.id) {
              const newQuestions = [...s.questions];
              newQuestions.splice(targetIndex, 0, question);
              return { ...s, questions: newQuestions };
            }
            return s;
          });
        }
      }
      return prevSections;
    });
  };

  const addSection = () => {
    const newSection: Section = {
      id: `section-new-${Date.now()}`,
      name: `Section ${sections.length + 1}`,
      marksPerQuestion: 4,
      questions: [],
    };
    setSections([...sections, newSection]);
    setExpandedSections(new Set([...expandedSections, newSection.id]));
    startEditingSection(newSection);
  };

  const deleteSection = (sectionId: string) => {
    if (confirm('Delete this section? Questions will be removed from this section.')) {
      setSections(sections.filter(s => s.id !== sectionId));
    }
  };

  const startEditingSection = (section: Section) => {
    setEditingSectionId(section.id);
    setEditingSectionName(section.name);
    setEditingMarks(section.marksPerQuestion);
  };

  const saveSectionEdit = () => {
    if (!editingSectionId) return;
    setSections(sections.map(s => 
      s.id === editingSectionId 
        ? { ...s, name: editingSectionName, marksPerQuestion: editingMarks }
        : s
    ));
    setEditingSectionId(null);
  };

  const addQuestionToSection = (sectionId: string, question: Question) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        if (s.questions.some(q => q._id === question._id)) {
          toast.error('Question already in this section');
          return s;
        }
        return { ...s, questions: [...s.questions, question] };
      }
      return s;
    }));
  };

  const removeQuestionFromSection = (sectionId: string, questionId: string) => {
    setSections(sections.map(s => 
      s.id === sectionId 
        ? { ...s, questions: s.questions.filter(q => q._id !== questionId) }
        : s
    ));
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const expandAll = () => {
    setExpandedSections(new Set(sections.map(s => s.id)));
  };

  const collapseAll = () => {
    setExpandedSections(new Set());
  };

  const handleSave = () => {
    const sectionsData = sections.map((s, idx) => ({
      name: s.name,
      marksPerQuestion: s.marksPerQuestion,
      questions: s.questions.map(q => q._id),
    }));
    saveMutation.mutate({ sections: sectionsData });
  };

  const totalQuestions = sections.reduce((acc, s) => acc + s.questions.length, 0);
  const totalMarks = sections.reduce((acc, s) => acc + (s.questions.length * s.marksPerQuestion), 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Exam Structure Editor
              </h2>
              <p className="text-indigo-200 text-sm mt-1">{exam?.title}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowQuestionBank(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Question
              </button>
              <button
                onClick={addSection}
                className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 hover:bg-indigo-50 rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Section
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
              <p className="text-2xl font-bold text-blue-700">{sections.length}</p>
              <p className="text-sm text-blue-600">Sections</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
              <p className="text-2xl font-bold text-green-700">{totalQuestions}</p>
              <p className="text-sm text-green-600">Questions</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 text-center border border-purple-100">
              <p className="text-2xl font-bold text-purple-700">{totalMarks}</p>
              <p className="text-sm text-purple-600">Total Marks</p>
            </div>
          </div>

          {sections.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-xl">
              <Layers className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 mb-4">No sections yet. Add sections to organize your exam.</p>
              <button
                onClick={addSection}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
              >
                Add First Section
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">{sections.length} sections • Drag to reorder</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={expandAll}
                  className="px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg font-medium transition-colors"
                >
                  Expand All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={collapseAll}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                >
                  Collapse All
                </button>
              </div>
            </div>
          )}

          <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {sections.map((section, sectionIndex) => (
                <SortableSection
                  key={section.id}
                  section={section}
                  sectionIndex={sectionIndex}
                  isExpanded={expandedSections.has(section.id)}
                  isEditing={editingSectionId === section.id}
                  editingName={editingSectionName}
                  editingMarks={editingMarks}
                  onToggle={() => toggleSection(section.id)}
                  onEdit={() => startEditingSection(section)}
                  onDelete={() => deleteSection(section.id)}
                  onNameChange={setEditingSectionName}
                  onMarksChange={setEditingMarks}
                  onSaveEdit={saveSectionEdit}
                  onCancelEdit={() => setEditingSectionId(null)}
                  onRemoveQuestion={(qId) => removeQuestionFromSection(section.id, qId)}
                />
              ))}
            </div>
          </SortableContext>

          <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <DragOverlay>
          {activeId && draggedItem && (
            <div className="bg-white rounded-lg shadow-2xl border-2 border-indigo-400 p-4 min-w-[300px]">
              <p className="font-semibold text-gray-900">
                {draggedItem.name || draggedItem.questionText?.slice(0, 60) || 'Item'}
                {(draggedItem.questionText?.length || 0) > 60 ? '...' : ''}
              </p>
              {draggedItem.questionText && (
                <p className="text-sm text-gray-500 mt-1">{draggedItem.marks} marks</p>
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {showQuestionBank && (
        <QuestionBankModal
          examId={examId}
          questions={allQuestions}
          onClose={() => setShowQuestionBank(false)}
          onAddQuestion={(sectionId, question) => {
            addQuestionToSection(sectionId, question);
          }}
          sections={sections}
        />
      )}
    </div>
  );
}

interface SectionCardProps {
  section: Section;
  sectionIndex: number;
  isExpanded: boolean;
  isEditing: boolean;
  editingName: string;
  editingMarks: number;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onNameChange: (name: string) => void;
  onMarksChange: (marks: number) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onRemoveQuestion: (questionId: string) => void;
}

function SortableSection({
  section,
  sectionIndex,
  isExpanded,
  isEditing,
  editingName,
  editingMarks,
  onToggle,
  onEdit,
  onDelete,
  onNameChange,
  onMarksChange,
  onSaveEdit,
  onCancelEdit,
  onRemoveQuestion,
}: SectionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-xl border-2 transition-all ${
        isDragging ? 'border-indigo-400 shadow-xl opacity-90 scale-[1.02]' : 
        isExpanded ? 'border-indigo-200' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div 
        className={`flex items-center gap-2 p-4 cursor-pointer ${isExpanded ? 'border-b border-gray-100' : ''}`}
        onClick={onToggle}
      >
        <div
          {...attributes}
          {...listeners}
          className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-5 h-5" />
        </div>
        
        {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}

        {isEditing ? (
          <div className="flex-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <input
              value={editingName}
              onChange={(e) => onNameChange(e.target.value)}
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              placeholder="Section name"
            />
            <input
              type="number"
              value={editingMarks}
              onChange={(e) => onMarksChange(parseInt(e.target.value) || 4)}
              className="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              min={1}
            />
            <span className="text-sm text-gray-500">marks</span>
            <button onClick={onSaveEdit} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg">
              <Check className="w-5 h-5" />
            </button>
            <button onClick={onCancelEdit} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-medium">#{sectionIndex + 1}</span>
                <h3 className="font-semibold text-gray-900">{section.name}</h3>
                {!isExpanded && section.questions.length > 0 && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                    {section.questions.length} Q
                  </span>
                )}
              </div>
              {isExpanded && (
                <p className="text-sm text-gray-500">
                  {section.questions.length} questions • {section.marksPerQuestion} marks each
                </p>
              )}
            </div>
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={onEdit}
                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={onDelete}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>

      {isExpanded && (
        <div className="p-4 bg-gray-50/50">
          {section.questions.length === 0 ? (
            <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg bg-white">
              <FileQuestion className="w-8 h-8 mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No questions in this section</p>
              <p className="text-xs text-gray-400 mt-1">Drag questions here or use "Add Question"</p>
            </div>
          ) : (
            <SortableContext items={section.questions.map(q => q._id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {section.questions.map((question, qIdx) => (
                  <SortableQuestion
                    key={question._id}
                    question={question}
                    index={qIdx}
                    onRemove={() => onRemoveQuestion(question._id)}
                  />
                ))}
              </div>
            </SortableContext>
          )}
        </div>
      )}
    </div>
  );
}

interface QuestionItemProps {
  question: Question;
  index: number;
  onRemove: () => void;
}

function SortableQuestion({ question, index, onRemove }: QuestionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-white rounded-lg border transition-all touch-none ${
        isDragging 
          ? 'border-indigo-400 shadow-lg scale-[1.02]' 
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="p-1 text-gray-400 cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-4 h-4" />
      </div>
      
      <span className="w-8 h-8 flex items-center justify-center bg-indigo-100 text-indigo-700 rounded-lg text-sm font-bold flex-shrink-0">
        {index + 1}
      </span>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 line-clamp-2">
          <LaTeXRenderer>{question.questionText.slice(0, 80)}{question.questionText.length > 80 ? '...' : ''}</LaTeXRenderer>
        </p>
        <div className="flex items-center gap-2 mt-1">
          {question.difficulty && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              question.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
              question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {question.difficulty}
            </span>
          )}
          <span className="text-xs text-gray-500">{question.marks} marks</span>
        </div>
      </div>
      
      <button
        onClick={onRemove}
        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

interface QuestionBankModalProps {
  examId: string;
  questions: Question[];
  onClose: () => void;
  onAddQuestion: (sectionId: string, question: Question) => void;
  sections: Section[];
}

function QuestionBankModal({ examId, questions, onClose, onAddQuestion, sections }: QuestionBankModalProps) {
  const [selectedSection, setSelectedSection] = useState(sections[0]?.id || '');
  const [search, setSearch] = useState('');
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());

  const { data: bankData, isLoading } = useQuery({
    queryKey: ['bank-questions', search],
    queryFn: () => questionBankAPI.getAll({ search: search || undefined, limit: 500 }),
  });

  const bankQuestions = bankData?.data?.data?.questions || bankData?.data?.questions || [];
  const existingQuestionIds = new Set(questions.map((q: any) => q._id));
  const allQuestions = bankQuestions.filter((q: any) => !existingQuestionIds.has(q._id));

  const filteredQuestions = allQuestions.filter((q: any) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      q.questionText?.toLowerCase().includes(searchLower) ||
      q.subject?.toLowerCase().includes(searchLower) ||
      q.topic?.toLowerCase().includes(searchLower) ||
      q.difficulty?.toLowerCase().includes(searchLower)
    );
  });

  const toggleQuestion = (qId: string) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(qId)) {
      newSelected.delete(qId);
    } else {
      newSelected.add(qId);
    }
    setSelectedQuestions(newSelected);
  };

  const handleAddSelected = async () => {
    if (!selectedSection) {
      toast.error('Please select a section');
      return;
    }
    const section = sections.find(s => s.id === selectedSection);
    if (!section) return;

    try {
      const selectedIds = Array.from(selectedQuestions);
      const response = await questionBankAPI.addToExam({
        examId,
        questionIds: selectedIds,
        section: section.name,
      });
      
      const newQuestions = response.data?.data || [];
      
      if (newQuestions.length > 0) {
        newQuestions.forEach((question: any) => {
          onAddQuestion(selectedSection, question);
        });
      } else {
        selectedIds.forEach(qId => {
          const question = allQuestions.find((q: any) => q._id === qId);
          if (question) {
            onAddQuestion(selectedSection, question);
          }
        });
      }
      
      toast.success(`${selectedQuestions.size} question(s) added to ${section.name}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add questions');
    }
    
    setSelectedQuestions(new Set());
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            Question Bank
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search questions by text, subject, topic..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 min-w-[180px]"
            >
              <option value="">Select Section</option>
              {sections.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Loading questions...</div>
          ) : filteredQuestions.length === 0 ? (
            <div className="text-center py-12">
              <FileQuestion className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No questions found</p>
              <p className="text-sm text-gray-400 mt-1">Try a different search or add questions to the bank first</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredQuestions.map((q: any) => (
                <label
                  key={q._id}
                  className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedQuestions.has(q._id)
                      ? 'border-indigo-400 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedQuestions.has(q._id)}
                    onChange={() => toggleQuestion(q._id)}
                    className="mt-1 w-5 h-5 text-indigo-600 rounded cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 line-clamp-2">
                      <LaTeXRenderer>{q.questionText}</LaTeXRenderer>
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {q.subject && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          {q.subject}
                        </span>
                      )}
                      {q.difficulty && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          q.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                          q.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {q.difficulty}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">{q.marks || 4} marks</span>
                      {q.options && <span className="text-xs text-gray-500">{q.options.length} options</span>}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <p className="text-sm text-gray-600">
            {selectedQuestions.size} of {filteredQuestions.length} selected
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleAddSelected}
              disabled={selectedQuestions.size === 0 || !selectedSection}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add to Section
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
