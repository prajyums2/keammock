import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { authAPI } from '../lib/api';
import { useAuthStore } from '../lib/store';
import { Monitor, Lock, Eye, EyeOff, Shield, UserPlus, AlertCircle } from 'lucide-react';

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      const response: any = await authAPI.register(data);
      const resData = response.data?.data || response.data;
      setAuth(resData.user, resData.token);
      toast.success('Registration successful!');
      navigate('/');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-slate-100 to-slate-200 py-12 px-4">
      <div className="max-w-lg w-full space-y-8 bg-white p-8 rounded-2xl shadow-2xl">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-lg">
            <Monitor className="h-9 w-9 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">KEAM Mock Test Platform</h2>
          <p className="mt-2 text-sm text-gray-600">Professional Computer-Based Test System</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-amber-900 text-sm">Student Registration Notice</h4>
              <p className="text-amber-800 text-xs mt-1">
                Students cannot register themselves. Your credentials will be provided by the administrator. 
                Please contact your institution admin or check your email for login details.
              </p>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">For Administrators Only</span>
          </div>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <input 
                {...register('name', { required: 'Name is required' })} 
                type="text" 
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-700 focus:border-transparent" 
                placeholder="Your full name" 
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message as string}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input 
                {...register('email', { required: 'Email is required', pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Invalid email' } })} 
                type="email" 
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-700 focus:border-transparent" 
                placeholder="you@institution.edu" 
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message as string}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <div className="mt-1 relative">
                <input 
                  {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Min 6 characters' } })} 
                  type={showPassword ? 'text' : 'password'} 
                  className="block w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-700 focus:border-transparent" 
                  placeholder="Min 6 characters" 
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message as string}</p>}
            </div>

            <input type="hidden" {...register('role')} value="institution_admin" />
          </div>

          <button 
            type="submit" 
            disabled={isLoading} 
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all"
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              <span className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Register Admin Account
              </span>
            )}
          </button>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <a href="/login" className="font-medium text-blue-700 hover:text-blue-600">Sign in</a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
