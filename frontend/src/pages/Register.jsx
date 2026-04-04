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

  const inputCls = 'w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-blue-50 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <h2 className="text-3xl font-bold text-indigo-700 mb-1 text-center">AI Grader</h2>
        <p className="text-center text-gray-400 text-sm mb-6">Create Student Account</p>

        {error && <p className="bg-red-50 text-red-600 text-sm p-3 rounded mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" placeholder="Full Name" className={inputCls}
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />

          <input type="text" placeholder="Student ID (e.g. STU-2024-001)" className={inputCls}
            value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} required />
          
          <select className={inputCls} value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })} required>
            <option value="">Select Department</option>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>

          <input type="email" placeholder="Email (optional)" className={inputCls}
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />

          <input type="password" placeholder="Password" className={inputCls}
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            
          <input type="password" placeholder="Confirm Password" className={inputCls}
            value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required />

          <button type="submit" disabled={loading}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 mt-2">
            {loading ? 'Creating account...' : 'Complete Registration'}
          </button>
        </form>

        <p className="text-xs text-gray-400 mt-4 text-center">
          Students log in with their Student ID and password
        </p>

        <p className="text-center text-sm text-gray-400 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
