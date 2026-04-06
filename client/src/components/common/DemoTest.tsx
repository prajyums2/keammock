import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Play, Clock, Award, Target, ChevronRight, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { examAPI, questionAPI, resultAPI } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import type { Exam, Question } from '../../types';

interface DemoTestProps {
  onClose: () => void;
  onStart: (resultId: string) => void;
}

export default function DemoTest({ onClose, onStart }: DemoTestProps) {
  const { user } = useAuthStore();
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  const { data: examsData, isLoading } = useQuery({
    queryKey: ['demo-exams'],
    queryFn: () => examAPI.getAll({ active: true }),
  });

  const exams: Exam[] = examsData?.data?.data || examsData?.data || [];

  const startTestMutation = useMutation({
    mutationFn: (examId: string) => resultAPI.startTest(examId),
    onSuccess: (response) => {
      const resultId = response.data?.data?.resultId || response.data?.resultId;
      toast.success('Test started!');
      onStart(resultId);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to start test');
    },
  });

  const handleStartTest = (exam: Exam) => {
    setSelectedExam(exam);
    setShowInstructions(true);
  };

  const confirmStart = () => {
    if (selectedExam) {
      startTestMutation.mutate(selectedExam._id);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading available tests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-800 to-blue-900 text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-white/10 rounded-lg">
                <Play className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Start Test</h2>
                <p className="text-blue-200 text-sm">Select a test to begin your practice session</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-2xl">
              ×
            </button>
          </div>
        </div>

        {!showInstructions ? (
          <>
            {/* Exam Selection */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Available Tests</h3>
                <p className="text-gray-500 text-sm">Choose from the tests below to start practicing</p>
              </div>

              {exams.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-10 h-10 text-gray-400" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Tests Available</h4>
                  <p className="text-gray-500">Contact your administrator to set up tests.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {exams.map((exam) => (
                    <div 
                      key={exam._id}
                      className="border-2 border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer"
                      onClick={() => handleStartTest(exam)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-lg font-bold text-gray-900">{exam.title}</h4>
                            {exam.isActive && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">Active</span>
                            )}
                          </div>
                          {exam.description && (
                            <p className="text-gray-600 text-sm mb-3">{exam.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {exam.duration} mins
                            </span>
                            <span className="flex items-center">
                              <Target className="w-4 h-4 mr-1" />
                              {exam.totalMarks} marks
                            </span>
                            <span className="flex items-center">
                              <Award className="w-4 h-4 mr-1" />
                              {exam.sections?.map((s: any) => s.name).join(' + ')}
                            </span>
                            {exam.negativeMarking && (
                              <span className="text-red-600">
                                -{exam.negativeMarksPerWrong} for wrong answers
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                            <Play className="w-6 h-6" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Info Banner */}
            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <div className="flex items-center text-sm text-gray-500">
                <Info className="w-4 h-4 mr-2 text-blue-500" />
                <span>Your progress will be saved automatically during the test.</span>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Instructions */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4 mb-6">
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-amber-900">Important Instructions</h4>
                    <p className="text-amber-800 text-sm mt-1">Please read carefully before starting the test.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <InstructionItem 
                  title="Test Duration"
                  description={`This test has a duration of ${selectedExam?.duration} minutes. The test will be automatically submitted when time expires.`}
                />
                <InstructionItem 
                  title="Question Navigation"
                  description="You can navigate between questions using the Previous/Next buttons or by clicking on question numbers in the palette. All answers are saved automatically."
                />
                <InstructionItem 
                  title="Mark for Review"
                  description="Use the 'Mark for Review' feature to flag questions you want to revisit before final submission."
                />
                <InstructionItem 
                  title="Negative Marking"
                  description={selectedExam?.negativeMarking 
                    ? `There is negative marking: ${selectedExam.negativeMarksPerWrong} marks will be deducted for each wrong answer.`
                    : "There is no negative marking in this test."
                  }
                />
                <InstructionItem 
                  title="Anti-Cheat Measures"
                  description="Switching tabs or leaving fullscreen mode will be monitored. Multiple violations may result in automatic submission."
                />
                <InstructionItem 
                  title="Submission"
                  description="You can submit the test anytime before the timer expires. Once submitted, you cannot modify your answers."
                />
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <h4 className="font-bold text-gray-900 mb-3">Test Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="bg-white p-3 rounded-lg border border-gray-200">
                    <div className="text-2xl font-bold text-blue-600">{selectedExam?.totalMarks}</div>
                    <div className="text-xs text-gray-500">Total Marks</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-gray-200">
                    <div className="text-2xl font-bold text-green-600">{selectedExam?.duration}</div>
                    <div className="text-xs text-gray-500">Minutes</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-gray-200">
                    <div className="text-2xl font-bold text-purple-600">
                      {selectedExam?.sections?.reduce((acc: number, s: any) => acc + 1, 0) || 3}
                    </div>
                    <div className="text-xs text-gray-500">Sections</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-gray-200">
                    <div className={`text-2xl font-bold ${selectedExam?.negativeMarking ? 'text-red-600' : 'text-green-600'}`}>
                      {selectedExam?.negativeMarking ? 'Yes' : 'No'}
                    </div>
                    <div className="text-xs text-gray-500">Neg. Marking</div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-start">
                <input 
                  type="checkbox" 
                  id="agree" 
                  className="mt-1 w-5 h-5 text-blue-600 rounded mr-3"
                />
                <label htmlFor="agree" className="text-sm text-gray-700">
                  I have read and understood all the instructions. I agree to follow the test rules and regulations.
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-gray-100 flex justify-between">
              <button 
                onClick={() => setShowInstructions(false)}
                className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 font-medium transition-colors"
              >
                Back
              </button>
              <button 
                onClick={confirmStart}
                disabled={startTestMutation.isPending}
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 font-semibold transition-all shadow-lg flex items-center"
              >
                {startTestMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Start Test Now
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function InstructionItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-start p-4 bg-white rounded-xl border border-gray-200">
      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
        <CheckCircle className="w-4 h-4 text-blue-600" />
      </div>
      <div>
        <h5 className="font-semibold text-gray-900">{title}</h5>
        <p className="text-gray-600 text-sm mt-1">{description}</p>
      </div>
    </div>
  );
}
