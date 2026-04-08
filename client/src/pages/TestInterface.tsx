import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { resultAPI, examAPI } from '../lib/api';
import {
  Clock, ChevronLeft, ChevronRight, Flag, AlertTriangle,
  Save, Shield, Eye, Eraser, CheckCircle, StickyNote
} from 'lucide-react';
import LaTeXRenderer from '../components/common/LaTeXRenderer';

export default function TestInterface() {
  const { resultId } = useParams<{ resultId: string }>();
  const navigate = useNavigate();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<any[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [scratchpadText, setScratchpadText] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [disconnectCount, setDisconnectCount] = useState(0);

  const answersRef = useRef(answers);
  const timeRemainingRef = useRef(timeRemaining);
  const examRef = useRef(exam);
  const tabSwitchCountRef = useRef(tabSwitchCount);
  const isSubmittingRef = useRef(false);
  const questionStartTime = useRef(Date.now());

  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { timeRemainingRef.current = timeRemaining; }, [timeRemaining]);
  useEffect(() => { examRef.current = exam; }, [exam]);
  useEffect(() => { tabSwitchCountRef.current = tabSwitchCount; }, [tabSwitchCount]);

  const { data: resultData, isLoading: resultLoading } = useQuery({
    queryKey: ['test-result', resultId],
    queryFn: () => resultAPI.getById(resultId!),
    enabled: !!resultId,
    retry: 2,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    const init = async () => {
      try {
        const result = resultData?.data?.data || resultData?.data;
        if (!result) return;
        if (result.status === 'completed') { toast.error('Test already completed'); navigate('/'); return; }

        setAnswers(result.answers || []);
        setExam(result.examId);

        const duration = result.examId.duration * 60;
        const elapsed = Math.floor((Date.now() - new Date(result.startedAt).getTime()) / 1000);
        const remaining = Math.max(0, duration - elapsed);
        if (remaining <= 0) { toast.error('Test time expired'); setTimeRemaining(0); setLoading(false); return; }
        setTimeRemaining(remaining);

        const qRes: any = await examAPI.getQuestions(result.examId._id, { shuffle: result.examId.allowShuffle });
        let qs = qRes.data?.data || qRes.data || [];
        if (result.examId.allowShuffle) qs = shuffleArray([...qs]);
        setQuestions(qs);
        setLoading(false);

        setTimeout(() => { try { document.documentElement.requestFullscreen(); } catch {} }, 1000);
      } catch (err: any) { setError(err.response?.data?.message || 'Failed to load test'); setLoading(false); }
    };
    init();
  }, [resultData, navigate]);

  useEffect(() => {
    if (!loading) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) { clearInterval(timer); toast.error('Time is up!'); handleSubmitTest(); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [loading]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && tabSwitchCountRef.current < 3) {
        const n = tabSwitchCountRef.current + 1;
        setTabSwitchCount(n);
        if (n >= 3) { toast.error('Test submitted due to violations!'); handleSubmitTest(); }
        else { setWarningMessage(`Warning ${n}/3: Tab switching detected.`); setShowWarning(true); }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Window blur detection - different from tab switch
  useEffect(() => {
    if (loading) return;
    
    let blurCount = 0;
    const handleBlur = () => {
      blurCount++;
      if (blurCount >= 3 && tabSwitchCountRef.current >= 3) {
        toast.error('Test submitted due to violations!');
        handleSubmitTest();
      } else if (blurCount > tabSwitchCountRef.current) {
        // Sync blur count with tab switch count for unified tracking
        const newCount = Math.max(tabSwitchCountRef.current, blurCount);
        if (newCount >= 3) {
          toast.error('Test submitted due to violations!');
          handleSubmitTest();
        } else {
          toast.warning(`Warning ${newCount}/3: Window lost focus.`);
        }
      }
    };
    
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [loading]);

  // Prevent PrintScreen key
  useEffect(() => {
    if (loading) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        toast.error('Screenshots are not allowed during the test');
      }
    };
    document.addEventListener('keyup', handleKeyDown);
    return () => document.removeEventListener('keyup', handleKeyDown);
  }, [loading]);

  // Periodic heartbeat to detect connection issues
  useEffect(() => {
    if (loading) return;
    
    const heartbeatInterval = setInterval(() => {
      // Just trigger a save to keep session alive
      saveProgressMutation.mutate();
    }, 60000); // Every minute
    
    return () => clearInterval(heartbeatInterval);
  }, [loading]);

  // Prevent iframe embedding (anti-cheat)
  useEffect(() => {
    if (window.self !== window.top) {
      window.top.location = window.self.location;
    }
  }, []);

  // Disable drag and drop
  useEffect(() => {
    if (loading) return;
    const preventDrag = (e: Event) => e.preventDefault();
    document.addEventListener('dragstart', preventDrag, true);
    document.addEventListener('drop', preventDrag, true);
    return () => {
      document.removeEventListener('dragstart', preventDrag, true);
      document.removeEventListener('drop', preventDrag, true);
    };
  }, [loading]);

  useEffect(() => {
    if (loading) return;
    const prevent = (e: Event) => { e.preventDefault(); e.stopPropagation(); return false; };
    const preventKeys = (e: KeyboardEvent) => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) || (e.ctrlKey && (e.key === 'u' || e.key === 's' || e.key === 'p'))) { e.preventDefault(); toast.error('This action is not allowed'); return false; }
    };
    document.body.style.userSelect = 'none';
    document.addEventListener('copy', prevent, true);
    document.addEventListener('cut', prevent, true);
    document.addEventListener('paste', prevent, true);
    document.addEventListener('contextmenu', prevent, true);
    document.addEventListener('keydown', preventKeys, true);
    return () => { document.body.style.userSelect = ''; document.removeEventListener('copy', prevent, true); document.removeEventListener('cut', prevent, true); document.removeEventListener('paste', prevent, true); document.removeEventListener('contextmenu', prevent, true); document.removeEventListener('keydown', preventKeys, true); };
  }, [loading]);

  // Network disconnect detection
  useEffect(() => {
    if (loading) return;
    
    const handleOnline = () => {
      setIsOnline(true);
      saveProgressMutation.mutate();
      toast.success('Connection restored. Progress saved.');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      const count = disconnectCount + 1;
      setDisconnectCount(count);
      if (count >= 2) {
        toast.error('Test submitted due to connection issues.');
        handleSubmitTest();
      } else {
        toast.error(`Connection lost! Warning ${count}/2. Reconnecting...`);
      }
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loading, disconnectCount]);

  const saveProgressMutation = useMutation({
    mutationFn: () => resultAPI.saveProgress({ resultId, answers: answersRef.current, timeTaken: (examRef.current?.duration || 0) * 60 - timeRemainingRef.current, tabSwitchCount: tabSwitchCountRef.current }),
    onSuccess: () => setLastSavedAt(new Date()),
  });

  const submitMutation = useMutation({
    mutationFn: () => resultAPI.submitTest(resultId!),
    onSuccess: () => { try { document.exitFullscreen(); } catch {} toast.success('Test submitted!'); navigate(`/results/${resultId}`); },
    onError: () => { isSubmittingRef.current = false; },
  });

  const handleSubmitTest = useCallback(() => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    submitMutation.mutate();
  }, []);

  const handleSubmit = () => {
    const attempted = answersRef.current.filter(a => a.selectedOptions?.length > 0).length;
    if (confirm(`Attempted ${attempted}/${questions.length}. Submit?`)) handleSubmitTest();
  };

  const updateAnswer = (updates: any) => {
    const q = questions[currentQuestionIndex];
    if (!q) return;
    setAnswers(prev => {
      const idx = prev.findIndex(a => a.questionId === q._id);
      const newA = [...prev];
      const entry = { questionId: q._id, selectedOptions: [], numericalAnswer: null, isMarkedForReview: false, isVisited: true, timeSpent: Math.floor((Date.now() - questionStartTime.current) / 1000), ...updates };
      if (idx >= 0) newA[idx] = { ...newA[idx], ...updates };
      else newA.push(entry);
      return newA;
    });
    questionStartTime.current = Date.now();
  };

  const clearResponse = () => {
    const q = questions[currentQuestionIndex];
    if (!q) return;
    setAnswers(prev => {
      const idx = prev.findIndex(a => a.questionId === q._id);
      const newA = [...prev];
      if (idx >= 0) newA[idx] = { ...newA[idx], selectedOptions: [] };
      else newA.push({ questionId: q._id, selectedOptions: [], numericalAnswer: null, isMarkedForReview: false, isVisited: true, timeSpent: 0 });
      return newA;
    });
  };

  const navigateToQuestion = (idx: number) => {
    setCurrentQuestionIndex(idx);
    questionStartTime.current = Date.now();
    const q = questions[idx];
    if (q) setAnswers(prev => { const exists = prev.find(a => a.questionId === q._id); return exists ? prev : [...prev, { questionId: q._id, selectedOptions: [], numericalAnswer: null, isMarkedForReview: false, isVisited: true, timeSpent: 0 }]; });
  };

  const getStatus = (qId: string) => {
    const a = answers.find(x => x.questionId === qId);
    if (!a || !a.isVisited) return 'not-visited';
    if (a.isMarkedForReview) return 'review';
    if (a.selectedOptions?.length > 0) return 'answered';
    return 'not-answered';
  };

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers.find(a => a.questionId === currentQuestion?._id);

  const formatTime = (s: number) => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  if (loading || resultLoading) return <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100"><div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-700 mb-4"></div><p className="text-lg text-gray-600">Loading test...</p></div>;
  if (error) return <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4"><div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center"><AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" /><h2 className="text-2xl font-bold mb-2">Error</h2><p className="text-gray-600 mb-6">{error}</p><button onClick={() => navigate('/')} className="px-6 py-3 bg-blue-700 text-white rounded-lg">Return to Dashboard</button></div></div>;
  if (!exam || questions.length === 0) return <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100"><p className="text-lg text-gray-600">No questions available</p><button onClick={() => navigate('/')} className="mt-4 px-6 py-2 bg-blue-700 text-white rounded-lg">Back</button></div>;

  return (
    <div className="min-h-screen bg-gray-50 select-none">
      {showWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center mb-4"><AlertTriangle className="w-8 h-8 text-orange-500 mr-3" /><h3 className="text-xl font-bold">Warning</h3></div>
            <p className="text-gray-700 mb-6">{warningMessage}</p>
            <div className="flex justify-end"><button onClick={() => setShowWarning(false)} className="px-4 py-2 bg-blue-700 text-white rounded-lg">I Understand</button></div>
          </div>
        </div>
      )}

      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Shield className="w-6 h-6 text-green-600" />
              <div><h1 className="text-xl font-bold text-gray-900">{exam.title}</h1></div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <Eye className="w-4 h-4 text-green-600" /><span className="font-medium">Secured</span>
              </div>
              <div className={`flex items-center space-x-1 text-xs px-2 py-1 rounded ${isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></span>
                <span>{isOnline ? 'Online' : 'Offline'}</span>
              </div>
              {lastSavedAt && <div className="flex items-center space-x-1 text-xs text-gray-500"><CheckCircle className="w-3 h-3" /><span>Saved {lastSavedAt.toLocaleTimeString()}</span></div>}
              <div className={`flex items-center font-mono text-xl font-bold px-4 py-2 rounded-lg ${timeRemaining < 300 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100'}`}>
                <Clock className="w-5 h-5 mr-2" />{formatTime(timeRemaining)}
              </div>
              <button onClick={() => setShowScratchpad(!showScratchpad)} className={`p-2 rounded-lg ${showScratchpad ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}><StickyNote className="w-5 h-5" /></button>
              <button onClick={handleSubmit} disabled={submitMutation.isPending} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50">{submitMutation.isPending ? 'Submitting...' : 'Submit'}</button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">Q{currentQuestionIndex + 1} of {questions.length}</span>
                  <span className="text-sm text-gray-500">{currentQuestion.section}</span>
                  {currentQuestion.difficulty && <span className={`px-2 py-1 rounded text-xs font-medium ${currentQuestion.difficulty === 'easy' ? 'bg-green-100 text-green-800' : currentQuestion.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{currentQuestion.difficulty}</span>}
                </div>
                <span className="text-sm font-semibold text-gray-700">+{currentQuestion.marks} / -{currentQuestion.negativeMarks}</span>
              </div>

              <div className="text-lg text-gray-900 leading-relaxed mb-8"><LaTeXRenderer>{currentQuestion.questionText}</LaTeXRenderer></div>

              <div className="space-y-3">
                {currentQuestion.options?.map((option: any, index: number) => (
                  <label key={index} className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${currentAnswer?.selectedOptions?.includes(option.text) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name={`q-${currentQuestion._id}`} checked={currentAnswer?.selectedOptions?.includes(option.text) || false} onChange={() => updateAnswer({ selectedOptions: [option.text] })} className="mt-1 w-4 h-4 text-blue-600" />
                    <span className="ml-3 text-gray-700 flex-1"><span className="font-semibold mr-2">{String.fromCharCode(65 + index)}.</span><LaTeXRenderer>{option.text}</LaTeXRenderer></span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button onClick={() => navigateToQuestion(Math.max(0, currentQuestionIndex - 1))} disabled={currentQuestionIndex === 0} className="flex items-center px-6 py-3 text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 font-medium"><ChevronLeft className="w-5 h-5 mr-2" />Previous</button>
              <div className="flex items-center space-x-3">
                <button onClick={clearResponse} className="flex items-center px-4 py-3 text-orange-600 bg-orange-50 border-2 border-orange-200 rounded-lg hover:bg-orange-100 font-medium"><Eraser className="w-5 h-5 mr-2" />Clear</button>
                <button onClick={() => updateAnswer({ isMarkedForReview: !currentAnswer?.isMarkedForReview })} className={`flex items-center px-6 py-3 rounded-lg font-medium ${currentAnswer?.isMarkedForReview ? 'bg-purple-100 text-purple-700 border-2 border-purple-300' : 'text-purple-600 bg-white border-2 border-purple-300'}`}><Flag className="w-5 h-5 mr-2" />{currentAnswer?.isMarkedForReview ? 'Unmark' : 'Review'}</button>
                <button onClick={() => { saveProgressMutation.mutate(); toast.success('Saved!'); }} className="flex items-center px-6 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium"><Save className="w-5 h-5 mr-2" />Save</button>
                <button onClick={() => navigateToQuestion(Math.min(questions.length - 1, currentQuestionIndex + 1))} disabled={currentQuestionIndex === questions.length - 1} className="flex items-center px-6 py-3 bg-blue-700 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 font-medium">Save & Next <ChevronRight className="w-5 h-5 ml-2" /></button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sticky top-24">
              <h3 className="font-bold text-gray-900 mb-4">Question Palette</h3>
              <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                <div className="flex items-center"><div className="w-3 h-3 bg-green-500 rounded mr-1"></div><span>Answered: {answers.filter(a => a.selectedOptions?.length > 0).length}</span></div>
                <div className="flex items-center"><div className="w-3 h-3 bg-red-500 rounded mr-1"></div><span>Not Answered: {answers.filter(a => a.isVisited && !a.selectedOptions?.length).length}</span></div>
                <div className="flex items-center"><div className="w-3 h-3 bg-purple-500 rounded mr-1"></div><span>Review: {answers.filter(a => a.isMarkedForReview).length}</span></div>
                <div className="flex items-center"><div className="w-3 h-3 bg-gray-200 rounded mr-1"></div><span>Not Visited: {questions.length - answers.filter(a => a.isVisited).length}</span></div>
              </div>
              <div className="grid grid-cols-5 gap-2 mb-4 max-h-64 overflow-y-auto">
                {questions.map((q, idx) => {
                  const status = getStatus(q._id);
                  return <button key={q._id} onClick={() => navigateToQuestion(idx)} className={`w-10 h-10 rounded-lg text-sm font-semibold transition-all ${idx === currentQuestionIndex ? 'ring-2 ring-blue-500 ring-offset-2' : ''} ${status === 'answered' ? 'bg-green-500 text-white' : status === 'review' ? 'bg-purple-500 text-white' : status === 'not-answered' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'}`}>{idx + 1}</button>;
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between text-sm mb-2"><span className="text-gray-600">Progress</span><span className="font-semibold">{Math.round((answers.filter(a => a.isVisited).length / questions.length) * 100)}%</span></div>
                <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-blue-700 h-2 rounded-full transition-all" style={{ width: `${(answers.filter(a => a.isVisited).length / questions.length) * 100}%` }}></div></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showScratchpad && (
        <div className="fixed bottom-4 right-4 bg-white rounded-xl shadow-2xl border-2 border-gray-200 p-4 w-80 z-50">
          <div className="flex items-center justify-between mb-3 border-b border-gray-200 pb-2">
            <span className="font-bold text-gray-900">Scratchpad</span>
            <button onClick={() => setShowScratchpad(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
          </div>
          <textarea value={scratchpadText} onChange={e => setScratchpadText(e.target.value)} rows={12} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-700 focus:border-transparent" placeholder="Use this space for rough work..." />
        </div>
      )}
    </div>
  );
}

function shuffleArray(arr: any[]) {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}
