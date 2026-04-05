import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', form);
      login(data.user, data.token);
      navigate(`/${data.user.role}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-900 transition-colors duration-700">
      {/* Background Blooms */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/20 mix-blend-multiply filter blur-[128px] animate-pulse duration-[10s]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[700px] h-[700px] rounded-full bg-blue-600/10 mix-blend-multiply filter blur-[128px] animate-pulse duration-[8s]"></div>

      <div className="relative z-10 w-full max-w-md px-6 animate-fade-in-up">
        {/* Back to Home */}
        <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 group">
          <span className="group-hover:-translate-x-1 transition-transform">←</span>
          <span className="text-sm font-bold tracking-widest uppercase">Back to Home</span>
        </Link>

        {/* Login Card */}
        <div className="glass-card p-8 md:p-10 rounded-[2.5rem] border-white/20 border-2 shadow-[0_50px_100px_rgba(0,0,0,0.3)]">
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(79,70,229,0.2)] mb-6 group hover:scale-110 transition-transform duration-500 ring-1 ring-white/20">
              <img src="/logo.png" alt="AI Grader Logo" className="w-14 h-14 object-contain rounded-full" />
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight">AI <span className="gradient-text">Grader</span></h2>
            <p className="text-slate-400 text-sm mt-3 font-medium tracking-wide uppercase">Sign in to your platform</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold p-4 rounded-2xl mb-6 flex items-center gap-3 animate-fade-in">
              <span className="text-lg leading-none">⚠️</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5 text-center">
              <div className="relative group">
                <input
                  type="text"
                  placeholder="Student ID or Email"
                  className="w-full bg-slate-800/85 border border-slate-600/80 rounded-2xl px-6 py-4 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-400/70 shadow-inner transition-all"
                  value={form.identifier}
                  onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                  required
                />
              </div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-2">
                Student ID <span className="mx-1 opacity-30">|</span> Teacher Email
              </p>
            </div>

            <input
              type="password"
              placeholder="Password"
              className="w-full bg-slate-800/85 border border-slate-600/80 rounded-2xl px-6 py-4 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-400/70 shadow-inner transition-all"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg shadow-2xl shadow-indigo-500/20 hover:bg-indigo-500 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all duration-300 mt-4 leading-none"
            >
              {loading ? 'SIGNING IN...' : 'SIGN IN'}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-white/5 flex flex-col items-center gap-4">
               <p className="text-sm font-medium text-slate-500">
                Don't have an account?{' '}
                <Link to="/register" className="text-indigo-400 hover:text-white transition-colors font-bold ml-1">REGISTER</Link>
              </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
