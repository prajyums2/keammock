import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { examAPI, resultAPI, testAssignmentAPI } from '../lib/api';
import { Clock, Award, AlertTriangle, CheckCircle, FileText, Shield, Monitor, Calculator, BookOpen } from 'lucide-react';

export default function PreTestInstructions() {
  const { id: examId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['exam', examId],
    queryFn: () => examAPI.getById(examId!),
    staleTime: 1000 * 60 * 5,
  });

  const exam = data?.data?.data || data?.data;

  const { data: assignmentData } = useQuery({
    queryKey: ['assignment', examId],
    queryFn: () => testAssignmentAPI.getMyAssignments(),
    staleTime: 1000 * 30,
    enabled: !!examId,
  });

  const assignments = assignmentData?.data?.data || assignmentData?.data || [];
  const assignment = assignments.find((a: any) => a.examId?._id === examId || a.examId === examId);

  // Check if user has assignment for this exam
  const hasAssignment = !!assignment;

  const startMutation = useMutation({
    mutationFn: () => resultAPI.startTest(examId!),
    onSuccess: (res: any) => {
      const resultId = res.data?.data?.resultId || res.data?.resultId;
      toast.success('Test started! Good luck!');
      navigate(`/test/${resultId}`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to start test');
      if (err.response?.data?.message?.includes('not assigned') || err.response?.data?.message?.includes('Access denied')) {
        navigate('/');
      }
    },
  });

  useEffect(() => {
    // If no assignment found, redirect to dashboard
    if (!isLoading && !assignment) {
      toast.error('This test is not assigned to you');
      navigate('/');
      return;
    }

    if (assignment) {
      const now = new Date();
      const startDate = assignment.startDate ? new Date(assignment.startDate) : null;
      const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;
      
      if (startDate && now < startDate) {
        toast.error('This test is not available yet');
        navigate('/');
        return;
      }
      
      if (dueDate && now > dueDate) {
        toast.error('This test has expired');
        navigate('/');
        return;
      }
    }
  }, [assignment, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading exam details...</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Exam Not Found</h2>
          <p className="text-gray-600 mb-6">This exam doesn't exist or you don't have access to it.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-700 text-white rounded-lg hover:bg-blue-800 font-medium"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const attemptInfo = assignment ? {
    used: assignment.attemptsUsed,
    allowed: assignment.attemptsAllowed,
    remaining: assignment.attemptsAllowed - assignment.attemptsUsed
  } : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-2xl shadow-xl p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <Shield className="w-8 h-8 text-blue-200" />
              <span className="text-blue-200 text-sm font-medium">Pre-Test Instructions</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">{exam.title}</h1>
            <p className="text-blue-100">{exam.description || 'KEAM B.Tech Mock Test'}</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
                <Clock className="w-6 h-6 text-blue-200 mx-auto mb-2" />
                <p className="text-2xl font-bold">{exam.duration}</p>
                <p className="text-sm text-blue-200">Minutes</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
                <Award className="w-6 h-6 text-blue-200 mx-auto mb-2" />
                <p className="text-2xl font-bold">{exam.totalMarks}</p>
                <p className="text-sm text-blue-200">Total Marks</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
                <FileText className="w-6 h-6 text-blue-200 mx-auto mb-2" />
                <p className="text-2xl font-bold">{exam.sections?.length || 3}</p>
                <p className="text-sm text-blue-200">Sections</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
                <BookOpen className="w-6 h-6 text-blue-200 mx-auto mb-2" />
                <p className="text-2xl font-bold">
                  {exam.sections?.reduce((acc: number, s: any) => acc + (s.questions?.length || 0), 0) || '?'}
                </p>
                <p className="text-sm text-blue-200">Questions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Attempt Information */}
        {attemptInfo && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Attempt Information</h3>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-gray-700">Attempts Used: <strong>{attemptInfo.used}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-700">Attempts Remaining: <strong>{attemptInfo.remaining}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                <span className="text-gray-700">Total Allowed: <strong>{attemptInfo.allowed}</strong></span>
              </div>
            </div>
            {attemptInfo.remaining <= 0 && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-red-700 font-medium">
                  You have used all your attempts for this test. No further attempts are allowed.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Exam Sections */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Exam Structure
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {exam.sections?.map((s: any, idx: number) => (
              <div key={idx} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </span>
                  <p className="font-semibold text-gray-900">{s.name}</p>
                </div>
                <p className="text-sm text-gray-600">
                  {s.questions?.length || 0} Questions • {s.marksPerQuestion || 4} marks each
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Important Instructions
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-100">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Marking Scheme</p>
                  <p className="text-sm text-gray-600 mt-1">
                    <span className="text-green-700 font-semibold">+{exam.negativeMarking ? 4 : exam.totalMarks / (exam.sections?.reduce((acc: number, s: any) => acc + (s.questions?.length || 0), 0) || 150)} marks</span> for correct answer
                    {exam.negativeMarking && (
                      <span className="text-red-600 font-semibold"> • -{exam.negativeMarksPerWrong || 1} mark</span>
                    )} for wrong answer • 0 for unattempted
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Time Management</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Total duration is <strong>{exam.duration} minutes</strong>. The timer starts once you begin the test and cannot be paused.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg border border-purple-100">
                <Monitor className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Proctoring</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Do not switch tabs, minimize the browser, or exit fullscreen. <strong className="text-red-600">3 violations will auto-submit your test.</strong>
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-100">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Auto-Submit</p>
                  <p className="text-sm text-gray-600 mt-1">
                    The test will automatically submit when time runs out. You can also submit manually at any time.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-2">Test Features</h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                  Navigate between questions using the question palette
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                  Use "Mark for Review" to flag questions
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                  Use "Clear Response" to remove your answer
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                  Scratchpad available for rough calculations
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                  Progress auto-saved periodically
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                  Options are randomized (shuffled)
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Agreement */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 w-5 h-5 text-blue-700 rounded border-gray-300 focus:ring-blue-700"
            />
            <span className="text-sm text-gray-700">
              I have read and understood all the instructions. I agree to the following terms:
              <ul className="mt-2 space-y-1 text-gray-600">
                <li>• Switching tabs, minimizing the browser, or exiting fullscreen 3 times will result in automatic test submission.</li>
                <li>• The test will auto-submit when time runs out.</li>
                <li>• I should not share my screen or allow others to observe during the test.</li>
              </ul>
            </span>
          </label>
          
          <div className="mt-6 flex gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex-1 py-4 px-6 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => startMutation.mutate()}
              disabled={!agreed || startMutation.isPending || (attemptInfo?.remaining ?? 1) <= 0}
              className="flex-[2] py-4 px-6 bg-gradient-to-r from-blue-700 to-indigo-700 text-white font-semibold rounded-lg hover:from-blue-800 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {startMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Starting...
                </span>
              ) : (
                'Start Test'
              )}
            </button>
          </div>
        </div>

        {/* System Requirements */}
        <div className="bg-gray-100 rounded-xl p-4 text-center text-sm text-gray-600">
          <p>For best experience, use a stable internet connection and keep your browser updated.</p>
        </div>
      </div>
    </div>
  );
}
