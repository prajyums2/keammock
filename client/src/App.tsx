import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { useAuthStore } from './lib/store';
import { authAPI } from './lib/api';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import ExamDetails from './pages/ExamDetails';
import PreTestInstructions from './pages/PreTestInstructions';
import TestInterface from './pages/TestInterface';
import Results from './pages/Results';
import MyMistakes from './pages/MyMistakes';
import Layout from './components/common/Layout';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

function App() {
  const { isAuthenticated, user, setAuth, logout } = useAuthStore();
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !user) {
      authAPI.getMe()
        .then((res: any) => {
          const userData = res.data?.data || res.data;
          if (userData && userData.id) setAuth(userData, token);
          else logout();
        })
        .catch(() => logout())
        .finally(() => setAuthLoading(false));
    } else {
      setAuthLoading(false);
    }
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
          <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" />} />
          <Route path="/" element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}>
            <Route index element={
              user?.role === 'super_admin' ? <AdminDashboard /> :
              user?.role === 'institution_admin' ? <AdminDashboard /> :
              <Dashboard />
            } />
            <Route path="exam/:id" element={<ExamDetails />} />
            <Route path="exam/:id/instructions" element={<PreTestInstructions />} />
            <Route path="test/:resultId" element={<TestInterface />} />
            <Route path="results/:id" element={<Results />} />
            <Route path="my-mistakes" element={<MyMistakes />} />
          </Route>
        </Routes>
      </Router>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}

export default App;
