import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { resultAPI } from '../lib/api';
import { ArrowLeft, Award, Clock, CheckCircle, XCircle, HelpCircle, TrendingUp, Target, BarChart3, PieChart, AlertTriangle, Zap, BookOpen, Timer, Eye, FileText } from 'lucide-react';
import LaTeXRenderer from '../components/common/LaTeXRenderer';
import { PieChart as RePieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import type { Result } from '../types';
import { useState } from 'react';

export default function Results() {
  const { id } = useParams<{ id: string }>();
  const [showReview, setShowReview] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['result', id], queryFn: () => resultAPI.getById(id!), staleTime: 1000 * 60 * 5 });
  const { data: analyticsData } = useQuery({ queryKey: ['result-analytics', id], queryFn: () => resultAPI.getAnalytics(id!), enabled: !!id, staleTime: 1000 * 60 * 5 });
  const { data: allResults } = useQuery({ queryKey: ['my-results'], queryFn: () => resultAPI.getMyResults(), staleTime: 1000 * 60 * 5 });

  const result: Result = data?.data?.data || data?.data;
  const analytics = analyticsData?.data?.data || analyticsData?.data;

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div></div>;
  if (!result) return <div className="text-center py-12 text-gray-600">Result not found</div>;

  const exam = result.examId as any;
  const totalQuestions = result.correctAnswers + result.wrongAnswers + result.unattempted;
  const attemptedQuestions = result.correctAnswers + result.wrongAnswers;

  const pieData = [
    { name: 'Correct', value: result.correctAnswers, color: '#22c55e' },
    { name: 'Wrong', value: result.wrongAnswers, color: '#ef4444' },
    { name: 'Unattempted', value: result.unattempted, color: '#9ca3af' },
  ];

  const sectionData = result.sectionScores?.map((s) => {
    const total = s.correct + s.wrong + s.unattempted;
    return { name: s.sectionName, score: s.score, correct: s.correct, wrong: s.wrong, accuracy: total > 0 ? ((s.correct / total) * 100).toFixed(1) : '0.0' };
  }) || [];

  const trendData = (allResults?.data?.data || allResults?.data || [])
    .filter((r: any) => r.status === 'completed' && r.submittedAt)
    .sort((a: any, b: any) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime())
    .map((r: any, i: number) => ({ test: (r.examId as any)?.title?.substring(0, 15) || `Test ${i + 1}`, score: r.totalScore }));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Link to="/" className="inline-flex items-center text-gray-600 hover:text-gray-900"><ArrowLeft className="w-4 h-4 mr-2" />Back to Dashboard</Link>

      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-2xl shadow-xl p-8 text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div><h1 className="text-3xl font-bold mb-2">{exam.title}</h1><p className="text-blue-100">{exam.code}</p></div>
          <div className="mt-4 md:mt-0 text-right"><p className="text-blue-200 text-sm">Completed</p><p className="text-lg">{new Date(result.submittedAt).toLocaleDateString()}</p></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/10 rounded-xl p-4"><p className="text-blue-200 text-sm">Total Score</p><p className="text-4xl font-bold">{result.totalScore}</p><p className="text-sm text-blue-200">out of {exam.totalMarks}</p></div>
          <div className="bg-white/10 rounded-xl p-4"><p className="text-blue-200 text-sm">Accuracy</p><p className="text-4xl font-bold">{result.accuracy.toFixed(1)}%</p><p className="text-sm text-blue-200">{result.correctAnswers}/{attemptedQuestions}</p></div>
          <div className="bg-white/10 rounded-xl p-4"><p className="text-blue-200 text-sm">Percentile</p><p className="text-4xl font-bold">{result.percentile?.toFixed(1) || '-'}%</p></div>
          <div className="bg-white/10 rounded-xl p-4"><p className="text-blue-200 text-sm">Time</p><p className="text-4xl font-bold">{Math.floor(result.timeTaken / 60)}</p><p className="text-sm text-blue-200">minutes</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard icon={CheckCircle} label="Correct" value={result.correctAnswers} color="green" total={totalQuestions} />
        <StatCard icon={XCircle} label="Wrong" value={result.wrongAnswers} color="red" total={totalQuestions} />
        <StatCard icon={HelpCircle} label="Unattempted" value={result.unattempted} color="gray" total={totalQuestions} />
        <StatCard icon={Timer} label="Avg Time/Q" value={`${Math.round((result.timeTaken / totalQuestions) / 60 * 10) / 10}m`} color="purple" total={null} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><PieChart className="w-5 h-5 mr-2 text-blue-600" />Answer Distribution</h3>
          <div className="h-64"><ResponsiveContainer width="100%" height="100%"><RePieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{pieData.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip /></RePieChart></ResponsiveContainer></div>
          <div className="flex justify-center space-x-6 mt-4">{pieData.map(item => <div key={item.name} className="flex items-center"><div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></div><span className="text-sm text-gray-600">{item.name}: {item.value}</span></div>)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><BarChart3 className="w-5 h-5 mr-2 text-blue-600" />Section-wise Performance</h3>
          <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={sectionData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="correct" fill="#22c55e" name="Correct" radius={[4, 4, 0, 0]} /><Bar dataKey="wrong" fill="#ef4444" name="Wrong" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </div>
      </div>

      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-green-50 rounded-xl p-6 border border-green-200"><h3 className="text-lg font-bold text-green-900 mb-3 flex items-center"><Zap className="w-5 h-5 mr-2" />Strong Areas</h3>{analytics.strongAreas?.length > 0 ? <ul className="space-y-2">{analytics.strongAreas.map((a: string, i: number) => <li key={i} className="flex items-center text-green-800"><CheckCircle className="w-4 h-4 mr-2" />{a}</li>)}</ul> : <p className="text-green-700">Keep practicing!</p>}</div>
          <div className="bg-red-50 rounded-xl p-6 border border-red-200"><h3 className="text-lg font-bold text-red-900 mb-3 flex items-center"><BookOpen className="w-5 h-5 mr-2" />Areas for Improvement</h3>{analytics.weakAreas?.length > 0 ? <ul className="space-y-2">{analytics.weakAreas.map((a: string, i: number) => <li key={i} className="flex items-center text-red-800"><AlertTriangle className="w-4 h-4 mr-2" />{a}</li>)}</ul> : <p className="text-red-700">Great job! No weak areas.</p>}</div>
        </div>
      )}



      {trendData.length > 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><TrendingUp className="w-5 h-5 mr-2 text-indigo-600" />Performance Trend</h3>
          <div className="h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={trendData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="test" tick={{ fontSize: 11 }} /><YAxis /><Tooltip /><Line type="monotone" dataKey="score" stroke="#1d4ed8" strokeWidth={2} dot={{ fill: '#1d4ed8' }} /></LineChart></ResponsiveContainer></div>
        </div>
      )}

      <div className="flex gap-4">
        <button onClick={() => setShowReview(!showReview)} className="flex items-center px-6 py-3 bg-white border-2 border-blue-700 text-blue-700 rounded-lg hover:bg-blue-50 font-medium"><Eye className="w-5 h-5 mr-2" />{showReview ? 'Hide' : 'Review'} Questions</button>
      </div>

      {showReview && result.answers && result.answers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100"><h3 className="text-lg font-bold text-gray-900 flex items-center"><FileText className="w-5 h-5 mr-2" />Question Review</h3></div>
          <div className="divide-y divide-gray-100">
            {result.answers.map((answer, idx) => {
              const q = (answer as any).questionId;
              if (!q) return null;
              const isAttempted = answer.selectedOptions?.length > 0;
              const wasCorrect = isAttempted && q.options?.find((o: any) => o.text === answer.selectedOptions[0])?.isCorrect;
              return (
                <div key={idx} className={`p-6 border-l-4 ${!isAttempted ? 'border-l-gray-300 bg-gray-50' : wasCorrect ? 'border-l-green-500 bg-green-50' : 'border-l-red-500 bg-red-50'}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-bold">Q{idx + 1}</span>
                    <span className="text-sm text-gray-500">{q.section}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${wasCorrect ? 'bg-green-100 text-green-800' : isAttempted ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}>{wasCorrect ? 'Correct' : isAttempted ? 'Wrong' : 'Skipped'}</span>
                  </div>
                  <p className="text-gray-900 mb-3"><LaTeXRenderer>{q.questionText}</LaTeXRenderer></p>
                  {q.options?.map((opt: any, oi: number) => {
                    const isSelected = answer.selectedOptions?.includes(opt.text);
                    return (
                      <div key={oi} className={`flex items-center px-3 py-2 rounded-lg text-sm mb-1 ${opt.isCorrect ? 'bg-green-100 border border-green-300' : isSelected ? 'bg-red-100 border border-red-300' : 'bg-white border border-gray-200'}`}>
                        <span className="font-medium mr-2 w-6">{String.fromCharCode(65 + oi)}.</span><span className="flex-1"><LaTeXRenderer>{opt.text}</LaTeXRenderer></span>
                        {opt.isCorrect && <CheckCircle className="w-4 h-4 text-green-600 ml-2" />}
                        {isSelected && !opt.isCorrect && <XCircle className="w-4 h-4 text-red-600 ml-2" />}
                      </div>
                    );
                  })}
                  {q.solution && <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 mt-3"><span className="font-medium">Solution: </span><LaTeXRenderer>{q.solution.text}</LaTeXRenderer></div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {result.sectionScores && result.sectionScores.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100"><h3 className="text-lg font-bold text-gray-900">Section Analysis</h3></div>
          <div className="divide-y divide-gray-100">
            {result.sectionScores.map((section, i) => {
              const total = section.correct + section.wrong + section.unattempted;
              const accuracy = total > 0 ? (section.correct / total) * 100 : 0;
              return (
                <div key={i} className="p-6">
                  <div className="flex items-center justify-between mb-3"><h4 className="font-semibold text-lg">{section.sectionName}</h4><span className={`px-4 py-1 rounded-full text-sm font-bold ${accuracy >= 70 ? 'bg-green-100 text-green-800' : accuracy >= 40 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{accuracy.toFixed(1)}%</span></div>
                  <div className="grid grid-cols-4 gap-4 mb-3">
                    <div className="text-center"><p className="text-2xl font-bold text-green-600">{section.correct}</p><p className="text-xs text-gray-500">Correct</p></div>
                    <div className="text-center"><p className="text-2xl font-bold text-red-600">{section.wrong}</p><p className="text-xs text-gray-500">Wrong</p></div>
                    <div className="text-center"><p className="text-2xl font-bold text-gray-500">{section.unattempted}</p><p className="text-xs text-gray-500">Unattempted</p></div>
                    <div className="text-center"><p className="text-2xl font-bold text-blue-600">{section.score}</p><p className="text-xs text-gray-500">Score</p></div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2"><div className={`h-2 rounded-full ${accuracy >= 70 ? 'bg-green-500' : accuracy >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${accuracy}%` }}></div></div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        <Link to="/" className="px-6 py-3 bg-blue-700 text-white rounded-lg hover:bg-blue-800 font-medium">Back to Dashboard</Link>
        <button onClick={() => window.print()} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">Print Results</button>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, total }: { icon: any; label: string; value: string | number; color: string; total: number | null }) {
  const colors: Record<string, string> = { green: 'bg-green-100 text-green-600', red: 'bg-red-100 text-red-600', gray: 'bg-gray-100 text-gray-600', purple: 'bg-purple-100 text-purple-600' };
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center mb-4"><div className={`p-3 rounded-lg ${colors[color]}`}><Icon className="w-6 h-6" /></div><div className="ml-4"><p className="text-sm text-gray-500">{label}</p><p className="text-2xl font-bold text-gray-900">{value}</p></div></div>
      {total !== null && <div className="w-full bg-gray-200 rounded-full h-2"><div className={`bg-${color === 'gray' ? 'gray' : color === 'green' ? 'green' : 'red'}-500 h-2 rounded-full`} style={{ width: `${total > 0 ? ((typeof value === 'number' ? value : 0) / total) * 100 : 0}%` }}></div></div>}
    </div>
  );
}
