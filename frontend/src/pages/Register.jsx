import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';

const DEPARTMENTS = ['IS', 'IT', 'CS', 'Cyber', 'Software'];

const Register = () => {
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    student_id: '', department: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword)
      return setError('Passwords do not match');
    if (!form.student_id.trim()) return setError('Student ID is required');
    if (!form.department) return setError('Please select your department');
    
    setLoading(true);
    try {
      await api.post('/auth/register', {
        name: form.name,
        email: form.email || undefined,
        password: form.password,
        role: 'student',
        student_id: form.student_id.trim(),
        department: form.department,
      });
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full bg-white/5 border-2 border-white/20 rounded-2xl px-6 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all";

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-900 transition-colors duration-700 py-12">
      {/* Background Blooms */}
      <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full bg-indigo-600/10 mix-blend-multiply filter blur-[128px] animate-pulse duration-[15s]"></div>
      <div className="absolute bottom-[-20%] left-[-10%] w-[900px] h-[900px] rounded-full bg-blue-600/10 mix-blend-multiply filter blur-[128px] animate-pulse duration-[12s]"></div>

      <div className="relative z-10 w-full max-w-lg px-6 animate-fade-in-up">
        {/* Back to Home */}
        <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 group">
          <span className="group-hover:-translate-x-1 transition-transform">←</span>
          <span className="text-xs font-bold tracking-widest uppercase">Back to landing</span>
        </Link>

        {/* Register Card */}
        <div className="glass-card p-8 md:p-12 rounded-[3rem] border-white/20 border-2 shadow-[0_50px_100px_rgba(0,0,0,0.4)]">
          <div className="flex flex-col items-center mb-10 text-center">
            <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(79,70,229,0.2)] mb-6 group hover:scale-110 transition-transform duration-500 ring-1 ring-white/20">
              <img src="/logo.png" alt="AI Grader Logo" className="w-14 h-14 object-contain rounded-full" />
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight">Join <span className="gradient-text">AI Grader</span></h2>
            <p className="text-slate-500 text-xs mt-3 font-bold tracking-[0.2em] uppercase">Student Enrollment</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold p-4 rounded-2xl mb-6 flex items-center gap-3 animate-fade-in">
              <span className="text-lg leading-none">⚠️</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
                 <input type="text" placeholder="Full Name" className={inputCls}
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>

            <input type="text" placeholder="Student ID" className={inputCls}
              value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} required />
            
            <select className={`${inputCls} appearance-none cursor-pointer`} value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })} required>
              <option value="" className="bg-slate-900">Select Dept</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d} className="bg-slate-900">{d}</option>)}
            </select>

            <div className="md:col-span-2">
                 <input type="email" placeholder="Email Address (Optional)" className={inputCls}
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>

            <input type="password" placeholder="Password" className={inputCls}
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              
            <input type="password" placeholder="Confirm" className={inputCls}
              value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required />

            <button type="submit" disabled={loading}
              className="md:col-span-2 bg-indigo-600 text-white py-4 mt-4 rounded-2xl font-black text-lg shadow-2xl shadow-indigo-500/20 hover:bg-indigo-500 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all duration-300 uppercase tracking-widest leading-none">
              {loading ? 'CREATING...' : 'REGISTER ACCOUNT'}
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-white/5 flex flex-col items-center">
               <p className="text-sm font-medium text-slate-500">
                Already have an account?{' '}
                <Link to="/login" className="text-indigo-400 hover:text-white transition-colors font-bold ml-1">SIGN IN</Link>
              </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
