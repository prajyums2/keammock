import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { examAPI, resultAPI, testAssignmentAPI } from '../lib/api';
import { useAuthStore } from '../lib/store';
import { Clock, Award, BookOpen, TrendingUp, Calendar, ArrowRight, Play, Target, BarChart3, CheckCircle } from 'lucide-react';
import DemoTest from '../components/common/DemoTest';
import type { Exam, Result } from '../types';

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'super_admin' || user?.role === 'institution_admin';
  const [showDemoTest, setShowDemoTest] = useState(false);

  const { data: exams, isLoading: examsLoading, refetch: refetchExams } = useQuery({
    queryKey: ['exams'],
    queryFn: () => examAPI.getAll({ active: true }),
    enabled: isAdmin, // Only fetch for admins
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
  });

  const { data: results, isLoading: resultsLoading, refetch: refetchResults } = useQuery({
    queryKey: ['my-results'],
    queryFn: () => resultAPI.getMyResults(),
    enabled: !isAdmin,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
  });

  const { data: assignments, refetch: refetchAssignments } = useQuery({
    queryKey: ['my-assignments'],
    queryFn: () => testAssignmentAPI.getMyAssignments(),
    enabled: !isAdmin,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
  });


  const resultList: Result[] = results?.data?.data || results?.data || [];
  const assignmentList = assignments?.data?.data || assignments?.data || [];
  const completedTests = resultList.filter(r => r.status === 'completed');
  const assignedExams = assignmentList.filter((a: any) => a.examId);
  const pendingTests = assignedExams.filter((a: any) => a.status !== 'completed');
  
  const totalScore = completedTests.reduce((acc, r) => acc + r.totalScore, 0);
  const avgAccuracy = completedTests.length > 0 
    ? (completedTests.reduce((acc, r) => acc + r.accuracy, 0) / completedTests.length).toFixed(1)
    : '0';
  const bestScore = completedTests.length > 0
    ? Math.max(...completedTests.map(r => r.totalScore))
    : 0;
  const totalTime = completedTests.reduce((acc, r) => acc + r.timeTaken, 0);

  if (examsLoading || resultsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.name?.split(' ')[0]}!</h1>
          <p className="mt-1 text-gray-600">
            {isAdmin ? 'Manage your exams and students' : 'Continue your KEAM preparation journey'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowDemoTest(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 font-semibold shadow-lg transition-all"
          >
            <Play className="w-5 h-5" />
            Preview Test
          </button>
        )}
      </div>

      {/* Stats Cards */}
      {!isAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard 
            icon={BookOpen} 
            label="Assigned Tests" 
            value={assignedExams.length} 
            color="blue" 
            bg="from-blue-50 to-blue-100"
          />
          <StatCard 
            icon={CheckCircle} 
            label="Tests Completed" 
            value={completedTests.length} 
            color="green"
            bg="from-green-50 to-green-100"
          />
          <StatCard 
            icon={Target} 
            label="Best Score" 
            value={bestScore} 
            color="purple"
            bg="from-purple-50 to-purple-100"
          />
          <StatCard 
            icon={TrendingUp} 
            label="Avg. Accuracy" 
            value={`${avgAccuracy}%`} 
            color="orange"
            bg="from-orange-50 to-orange-100"
          />
        </div>
      )}

      {/* Assigned Tests */}
      {!isAdmin && assignmentList.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">My Assigned Tests</h2>
                  <p className="text-sm text-gray-500">Tests assigned by your administrator</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm font-medium rounded-full">
                {pendingTests.length} pending
              </span>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {assignmentList.slice(0, 3).map((a: any) => {
              const exam = a.examId;
              const now = new Date();
              const startDate = a.startDate ? new Date(a.startDate) : null;
              const dueDate = a.dueDate ? new Date(a.dueDate) : null;
              const isCompleted = a.status === 'completed' && a.attemptsUsed >= a.attemptsAllowed;
              const isNotStarted = startDate && now < startDate;
              const isOverdue = dueDate && dueDate < now;
              const canStart = !isNotStarted && !isOverdue && !isCompleted;
              
              return (
                <div key={a._id} className="p-5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{exam?.title}</h3>
                        {isCompleted ? (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">Completed</span>
                        ) : isNotStarted ? (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">Not Started</span>
                        ) : isOverdue ? (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">Overdue</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">Available</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {exam?.duration} mins
                        </span>
                        <span className="flex items-center gap-1">
                          <Target className="w-4 h-4" />
                          {exam?.totalMarks} marks
                        </span>
                        <span>Attempts: {a.attemptsUsed}/{a.attemptsAllowed}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                        {startDate && !isCompleted && (
                          <span>Starts: {startDate.toLocaleDateString()}</span>
                        )}
                        {dueDate && !isCompleted && (
                          <span className={isOverdue ? 'text-red-600' : ''}>
                            Due: {dueDate.toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    {canStart && (
                      <button 
                        onClick={() => {
                          navigate(`/exam/${exam._id}/instructions`);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                      >
                        <Play className="w-4 h-4" />
                        Start
                      </button>
                    )}
                    {isNotStarted && (
                      <span className="px-3 py-1 text-xs text-gray-500 bg-gray-100 rounded-lg">
                        Wait for {startDate.toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming Tests - Shows assigned tests for students */}
        {!isAdmin && assignedExams.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Upcoming Tests</h2>
                    <p className="text-sm text-gray-500">Your assigned tests</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {assignedExams.slice(0, 4).map((a: any) => {
                const exam = a.examId;
                const dueDate = a.dueDate ? new Date(a.dueDate) : null;
                const startDate = a.startDate ? new Date(a.startDate) : null;
                const now = new Date();
                const isNotStarted = startDate && now < startDate;
                const isOverdue = dueDate && dueDate < now;
                const isCompleted = a.status === 'completed' && a.attemptsUsed >= a.attemptsAllowed;
                const canStart = !isNotStarted && !isOverdue && !isCompleted;
                
                return (
                  <div key={a._id} className="p-5 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{exam?.title}</h3>
                          {isCompleted ? (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">Completed</span>
                          ) : isNotStarted ? (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">Not Started</span>
                          ) : isOverdue ? (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">Overdue</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">Available</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {exam?.duration} mins
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="w-4 h-4" />
                            {exam?.totalMarks} marks
                          </span>
                          <span>Attempts: {a.attemptsUsed}/{a.attemptsAllowed}</span>
                        </div>
                        {(startDate || dueDate) && (
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                            {startDate && (
                              <span>Starts: {startDate.toLocaleDateString()}</span>
                            )}
                            {dueDate && (
                              <span className={isOverdue ? 'text-red-600' : ''}>
                                Due: {dueDate.toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {canStart && (
                        <button
                          onClick={() => {
                            navigate(`/exam/${exam._id}/instructions`);
                          }}
                          className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                        >
                          Start <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : !isAdmin ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-gray-400" />
              </div>
              <h4 className="font-medium text-gray-900 mb-2">No Tests Assigned</h4>
              <p className="text-gray-500 text-sm">Your administrator will assign tests for you.</p>
            </div>
          </div>
        ) : null}

        {/* Recent Results / Performance */}
        {!isAdmin ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Recent Results</h2>
                    <p className="text-sm text-gray-500">Your test performance history</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {completedTests.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="w-8 h-8 text-gray-400" />
                  </div>
                  <h4 className="font-medium text-gray-900 mb-2">No Results Yet</h4>
                  <p className="text-gray-500 text-sm">Complete a test to see your results here.</p>
                </div>
              ) : (
                completedTests.slice(0, 5).map((result) => (
                  <Link 
                    key={result._id} 
                    to={`/results/${result._id}`}
                    className="block p-5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{(result.examId as any)?.title || 'Test'}</h3>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(result.submittedAt).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {Math.floor(result.timeTaken / 60)}m
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">{result.totalScore}</div>
                        <div className="text-xs text-gray-500">/{result.accuracy.toFixed(0)}%</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <span className="text-green-600 font-medium">{result.correctAnswers} correct</span>
                      <span className="text-red-600 font-medium">{result.wrongAnswers} wrong</span>
                      <span className="text-gray-500">{result.unattempted} skipped</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
            {completedTests.length > 0 && (
              <div className="p-4 bg-gray-50">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xl font-bold text-gray-900">{totalScore}</div>
                    <div className="text-xs text-gray-500">Total Score</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-gray-900">{avgAccuracy}%</div>
                    <div className="text-xs text-gray-500">Avg Accuracy</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-gray-900">{Math.floor(totalTime / 60)}m</div>
                    <div className="text-xs text-gray-500">Time Spent</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Admin Quick Actions */
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Quick Actions</h2>
            </div>
            <div className="p-6 space-y-4">
              <QuickAction 
                icon={<BookOpen className="w-5 h-5" />}
                title="Manage Exams"
                description="Create and manage mock tests"
                color="blue"
                onClick={() => navigate('/admin/exams')}
              />
              <QuickAction 
                icon={<Users className="w-5 h-5" />}
                title="Manage Students"
                description="Add and manage student accounts"
                color="green"
                onClick={() => navigate('/admin/students')}
              />
              <QuickAction 
                icon={<BarChart3 className="w-5 h-5" />}
                title="View Analytics"
                description="Check platform performance"
                color="purple"
                onClick={() => navigate('/admin/analytics')}
              />
            </div>
          </div>
        )}
      </div>

      {/* Demo Test Modal */}
      {showDemoTest && (
        <DemoTest 
          onClose={() => setShowDemoTest(false)} 
          onStart={(resultId) => {
            setShowDemoTest(false);
            navigate(`/test/${resultId}`);
          }}
        />
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bg }: { icon: any; label: string; value: string | number; color: string; bg: string }) {
  const colors: Record<string, string> = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600',
  };
  
  return (
    <div className={`bg-gradient-to-br ${bg} rounded-2xl p-5 border border-gray-100`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className={`w-6 h-6 ${colors[color]}`} />
      </div>
      <div className={`text-3xl font-bold ${colors[color]}`}>{value}</div>
      <div className="text-sm text-gray-600 mt-1">{label}</div>
    </div>
  );
}

function QuickAction({ icon, title, description, color, onClick }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  color: string;
  onClick: () => void;
}) {
  const bgColors: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
  };
  
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-left"
    >
      <div className={`p-3 rounded-xl ${bgColors[color]}`}>
        {icon}
      </div>
      <div>
        <h4 className="font-semibold text-gray-900">{title}</h4>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </button>
  );
}

function Users({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}
