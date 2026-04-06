import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { examAPI, resultAPI, testAssignmentAPI } from '../lib/api';
import { Clock, Award, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import type { Exam } from '../types';
import { useState } from 'react';

export default function ExamDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['exam', id],
    queryFn: () => examAPI.getById(id!),
    staleTime: 1000 * 60 * 5,
  });

  const exam: Exam = data?.data?.data || data?.data;

  const startMutation = useMutation({
    mutationFn: () => resultAPI.startTest(id!),
    onSuccess: (res: any) => {
      const resultId = res.data?.data?.resultId || res.data?.resultId;
      toast.success('Test started! Good luck!');
      navigate(`/test/${resultId}`);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to start test'),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div></div>;
  if (!exam) return <div className="text-center py-12 text-gray-600">Exam not found</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 rounded-2xl shadow-xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">{exam.title}</h1>
        <p className="text-blue-200">{exam.description || 'KEAM B.Tech Mock Test'}</p>
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-white/10 rounded-xl p-4 text-center"><Clock className="w-6 h-6 text-blue-200 mx-auto mb-2" /><p className="text-2xl font-bold">{exam.duration}</p><p className="text-sm text-blue-200">Minutes</p></div>
          <div className="bg-white/10 rounded-xl p-4 text-center"><Award className="w-6 h-6 text-blue-200 mx-auto mb-2" /><p className="text-2xl font-bold">{exam.totalMarks}</p><p className="text-sm text-blue-200">Total Marks</p></div>
          <div className="bg-white/10 rounded-xl p-4 text-center"><FileText className="w-6 h-6 text-blue-200 mx-auto mb-2" /><p className="text-2xl font-bold">{exam.sections?.length || 3}</p><p className="text-sm text-blue-200">Sections</p></div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Exam Instructions</h2>
        <div className="space-y-3 text-sm text-gray-700">
          <p className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />This test contains 150 Multiple Choice Questions (MCQs) with 5 options each.</p>
          <p className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />Each correct answer awards <strong>+4 marks</strong>. Each wrong answer deducts <strong>-1 mark</strong>. Unattempted questions carry 0 marks.</p>
          <p className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />Total duration is <strong>{exam.duration} minutes</strong>. The timer starts once you begin the test.</p>
          <p className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />You can navigate between questions using the question palette on the right.</p>
          <p className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />Use "Mark for Review" to flag questions you want to revisit.</p>
          <p className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />Use "Clear Response" to remove your selected answer.</p>
          <p className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />Do not switch tabs or minimize the browser. <strong>3 violations will auto-submit your test.</strong></p>
          <p className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />The test will auto-submit when time runs out.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Sections</h2>
        <div className="grid grid-cols-3 gap-4">
          {exam.sections?.map((s: any) => (
            <div key={s.name} className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="font-semibold text-gray-900">{s.name}</p>
            </div>
          )) || KEAM_SECTIONS.map(s => <div key={s.name} className="bg-gray-50 rounded-lg p-4 text-center"><p className="font-semibold text-gray-900">{s.name}</p></div>)}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-1 w-5 h-5 text-blue-700 rounded" />
          <span className="text-sm text-gray-700">I have read and understood all the instructions. I agree that switching tabs, minimizing the browser, or exiting fullscreen 3 times will result in automatic test submission.</span>
        </label>
        <button onClick={() => startMutation.mutate()} disabled={!agreed || startMutation.isPending} className="mt-4 w-full py-4 px-6 bg-blue-700 text-white font-semibold rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          {startMutation.isPending ? 'Starting...' : 'Start Test'}
        </button>
      </div>
    </div>
  );
}

const KEAM_SECTIONS = [{ name: 'Mathematics' }, { name: 'Physics' }, { name: 'Chemistry' }];
