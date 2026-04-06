import { useState, useEffect } from 'react';
import { Eye, X, Clock, ChevronLeft, ChevronRight, Flag, CheckCircle, BookOpen, Settings, PanelRightClose, PanelRight } from 'lucide-react';
import LaTeXRenderer from '../common/LaTeXRenderer';
import type { Exam, Question } from '../../types';

interface VisualTestPreviewProps {
  exam: Exam;
  questions: Question[];
  onClose: () => void;
}

export default function VisualTestPreview({ exam, questions, onClose }: VisualTestPreviewProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [showInfo, setShowInfo] = useState(true);

  const currentQuestion = questions[currentQuestionIndex];
  
  const answeredCount = Object.values(selectedAnswers).filter(a => a.length > 0).length;
  const reviewCount = markedForReview.size;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'n') {
        setCurrentQuestionIndex(i => Math.min(questions.length - 1, i + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'p') {
        setCurrentQuestionIndex(i => Math.max(0, i - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [questions.length]);

  const handleOptionSelect = (optionText: string) => {
    if (!currentQuestion) return;
    
    setSelectedAnswers(prev => {
      const current = prev[currentQuestion._id] || [];
      if (currentQuestion.type === 'MCQ') {
        return { ...prev, [currentQuestion._id]: [optionText] };
      } else {
        const newSelection = current.includes(optionText)
          ? current.filter(o => o !== optionText)
          : [...current, optionText];
        return { ...prev, [currentQuestion._id]: newSelection };
      }
    });
  };

  const toggleReview = () => {
    if (!currentQuestion) return;
    setMarkedForReview(prev => {
      const newSet = new Set(prev);
      if (newSet.has(currentQuestion._id)) {
        newSet.delete(currentQuestion._id);
      } else {
        newSet.add(currentQuestion._id);
      }
      return newSet;
    });
  };

  const getQuestionStatus = (questionId: string) => {
    if (markedForReview.has(questionId)) return 'review';
    if (selectedAnswers[questionId]?.length > 0) return 'answered';
    return 'not-visited';
  };

  if (!currentQuestion) {
    return (
      <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Questions</h3>
          <p className="text-gray-600 mb-6">This exam doesn't have any questions yet. Add questions to preview.</p>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-800 to-blue-900 text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-white/10 rounded-lg">
                <Eye className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Preview: {exam.title}</h2>
                <p className="text-blue-200 text-sm">Student View Simulation • Admin Mode</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center px-4 py-2 bg-white/10 rounded-xl">
                <Clock className="w-5 h-5 mr-2" />
                <span className="font-mono text-lg font-bold">{exam.duration}:00</span>
              </div>
              <button
                onClick={() => setShowInfo(!showInfo)}
                className={`p-2 rounded-lg transition-colors ${showInfo ? 'bg-white/20' : 'hover:bg-white/10'}`}
                title={showInfo ? 'Hide Sidebar' : 'Show Sidebar'}
              >
                {showInfo ? <PanelRightClose className="w-5 h-5" /> : <PanelRight className="w-5 h-5" />}
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden bg-gray-50">
          {/* Question Area */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              {/* Question Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold shadow-sm">
                    Q{currentQuestionIndex + 1}
                  </div>
                  <span className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg text-sm font-semibold">
                    {currentQuestion.section}
                  </span>
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase ${
                    currentQuestion.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                    currentQuestion.difficulty === 'medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {currentQuestion.difficulty}
                  </span>
                  {currentQuestion.topic && (
                    <span className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium">
                      {currentQuestion.topic}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
                  <span className="text-sm text-gray-500">Marks:</span>
                  <span className="font-bold text-blue-700">+{currentQuestion.marks}</span>
                  {exam.negativeMarking && (
                    <span className="font-bold text-red-600">-{exam.negativeMarksPerWrong}</span>
                  )}
                </div>
              </div>

              {/* Question Card */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
                <div className="bg-gradient-to-r from-gray-50 to-white p-6 border-b border-gray-100">
                  <div className="flex items-center text-xs text-gray-500 mb-3">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </div>
                  <div className="text-lg text-gray-900 leading-relaxed font-medium">
                    <LaTeXRenderer>{currentQuestion.questionText}</LaTeXRenderer>
                  </div>
                </div>

                {/* Options */}
                <div className="p-6 space-y-3">
                  {currentQuestion.options?.map((option, index) => {
                    const isSelected = selectedAnswers[currentQuestion._id]?.includes(option.text);
                    const isCorrect = option.isCorrect;
                    
                    return (
                      <label
                        key={index}
                        className={`flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50 shadow-sm' 
                            : isCorrect
                            ? 'border-green-400 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-4 font-bold text-sm transition-colors ${
                          isSelected 
                            ? 'bg-blue-600 text-white' 
                            : isCorrect
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {isSelected ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : isCorrect ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : (
                            String.fromCharCode(65 + index)
                          )}
                        </div>
                        <div className="flex-1">
                          <span className="text-gray-800 text-base leading-relaxed">
                            <LaTeXRenderer>{option.text}</LaTeXRenderer>
                          </span>
                          {isCorrect && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              Correct Answer
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Solution */}
                {currentQuestion.solution?.text && (
                  <div className="mx-6 mb-6 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl">
                    <div className="flex items-start">
                      <div className="p-1 bg-amber-100 rounded-lg mr-3 mt-0.5">
                        <CheckCircle className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-amber-900 mb-1">Solution</h4>
                        <p className="text-amber-800 text-sm leading-relaxed">
                          <LaTeXRenderer>{currentQuestion.solution.text}</LaTeXRenderer>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="flex items-center px-6 py-3 text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 font-semibold transition-all"
                >
                  <ChevronLeft className="w-5 h-5 mr-2" />
                  Previous
                </button>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={toggleReview}
                    className={`flex items-center px-5 py-3 rounded-xl font-semibold transition-all ${
                      markedForReview.has(currentQuestion._id)
                        ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md'
                        : 'text-purple-700 bg-white border-2 border-purple-200 hover:bg-purple-50'
                    }`}
                  >
                    <Flag className="w-5 h-5 mr-2" />
                    {markedForReview.has(currentQuestion._id) ? 'Marked Review' : 'Mark for Review'}
                  </button>

                  <button
                    onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                    disabled={currentQuestionIndex === questions.length - 1}
                    className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-40 font-semibold shadow-md transition-all"
                  >
                    Next
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className={`bg-white border-l border-gray-200 overflow-y-auto transition-all duration-300 ${showInfo ? 'w-80' : 'w-16'}`}>
            {showInfo ? (
              <div className="p-5">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center">
                  <div className="p-1.5 bg-blue-100 rounded-lg mr-2">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                  </div>
                  Question Navigator
                </h3>
                
                {/* Progress */}
                <div className="mb-5 p-4 bg-gradient-to-br from-blue-50 to-slate-50 rounded-xl">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-bold text-blue-700">{answeredCount}/{questions.length}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all" 
                      style={{ width: `${(answeredCount / questions.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Legend */}
                <div className="space-y-2 mb-5">
                  <div className="flex items-center text-sm">
                    <div className="w-4 h-4 bg-gradient-to-br from-green-400 to-green-500 rounded mr-3 shadow-sm"></div>
                    <span className="text-gray-700">Answered ({answeredCount})</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-4 h-4 bg-gradient-to-br from-purple-400 to-purple-500 rounded mr-3 shadow-sm"></div>
                    <span className="text-gray-700">Review ({reviewCount})</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-4 h-4 bg-gray-200 border-2 border-gray-300 rounded mr-3"></div>
                    <span className="text-gray-700">Not Visited ({questions.length - answeredCount})</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-4 h-4 bg-gradient-to-br from-green-300 to-green-400 border-2 border-green-500 rounded mr-3"></div>
                    <span className="text-gray-700">Correct</span>
                  </div>
                </div>

                {/* Question Grid */}
                <div className="mb-5">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">All Questions</h4>
                  <div className="grid grid-cols-6 gap-2">
                    {questions.map((q, idx) => {
                      const status = getQuestionStatus(q._id);
                      const isCorrect = q.options?.some(o => o.isCorrect);
                      
                      return (
                        <button
                          key={q._id}
                          onClick={() => setCurrentQuestionIndex(idx)}
                          className={`w-9 h-9 rounded-lg text-xs font-bold transition-all ${
                            idx === currentQuestionIndex
                              ? 'ring-2 ring-blue-500 ring-offset-2'
                              : ''
                          } ${
                            status === 'answered' 
                              ? isCorrect 
                                ? 'bg-gradient-to-br from-green-400 to-green-500 text-white shadow-sm' 
                                : 'bg-gradient-to-br from-green-400 to-green-500 text-white shadow-sm' 
                              : status === 'review' 
                              ? 'bg-gradient-to-br from-purple-400 to-purple-500 text-white shadow-sm' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Test Info */}
                <div className="pt-4 border-t border-gray-100">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Test Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Duration</span>
                      <span className="font-semibold text-gray-900">{exam.duration} mins</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Questions</span>
                      <span className="font-semibold text-gray-900">{questions.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Marks</span>
                      <span className="font-semibold text-blue-700">{exam.totalMarks}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Negative Marking</span>
                      <span className={`font-semibold ${exam.negativeMarking ? 'text-red-600' : 'text-green-600'}`}>
                        {exam.negativeMarking ? `-${exam.negativeMarksPerWrong}` : 'No'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 flex flex-col items-center space-y-3">
                <button
                  onClick={() => setShowInfo(true)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  title="Show Navigator"
                >
                  <BookOpen className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
