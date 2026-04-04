import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';

const DEPARTMENTS = ['IS', 'IT', 'CS', 'Cyber', 'Software'];

const roles = [
  { value: 'student', label: 'Student', icon: '🎓', desc: 'View your grades and AI feedback' },
  { value: 'teacher', label: 'Teacher', icon: '📚', desc: 'Upload exams and trigger AI grading' },
  { value: 'admin',   label: 'Admin',   icon: '🛡️', desc: 'Manage users and monitor the system' },
];

const Register = () => {
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState('');
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    student_id: '', department: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const roleInfo = roles.find((r) => r.value === selectedRole);

  const handleRoleSelect = (role) => { setSelectedRole(role); setStep(2); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword)
      return setError('Passwords do not match');
    if (selectedRole === 'student') {
      if (!form.student_id.trim()) return setError('Student ID is required');
      if (!form.department) return setError('Please select your department');
    }
    setLoading(true);
    try {
      await api.post('/auth/register', {
        name: form.name,
        email: form.email || undefined,
        password: form.password,
        role: selectedRole,
        student_id: selectedRole === 'student' ? form.student_id.trim() : undefined,
        department: selectedRole === 'student' ? form.department : undefined,
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
        <p className="text-center text-gray-400 text-sm mb-6">Create your account</p>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2].map((n) => (
            <div key={n} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= n ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>{n}</div>
              {n < 2 && <div className={`h-1 w-12 rounded ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1 — Role */}
        {step === 1 && (
          <div>
            <p className="text-center text-gray-600 text-sm mb-4 font-medium">Select your role</p>
            <div className="space-y-3">
              {roles.map((role) => (
                <button key={role.value} onClick={() => handleRoleSelect(role.value)}
                  className="w-full flex items-center gap-4 border-2 border-gray-100 rounded-xl px-4 py-3 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left">
                  <span className="text-3xl">{role.icon}</span>
                  <div>
                    <p className="font-semibold text-gray-800">{role.label}</p>
                    <p className="text-xs text-gray-400">{role.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — Form */}
        {step === 2 && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5">
                <span>{roleInfo?.icon}</span>
                <span className="text-sm font-medium text-indigo-700 capitalize">{selectedRole}</span>
              </div>
              <button onClick={() => { setStep(1); setError(''); }}
                className="text-xs text-gray-400 hover:text-indigo-600">Change role</button>
            </div>

            {error && <p className="bg-red-50 text-red-600 text-sm p-3 rounded mb-4">{error}</p>}

            <form onSubmit={handleSubmit} className="space-y-3">
              <input type="text" placeholder="Full Name" className={inputCls}
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />

              {/* Student-specific fields */}
              {selectedRole === 'student' && (
                <>
                  <input type="text" placeholder="Student ID (e.g. STU-2024-001)" className={inputCls}
                    value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} required />
                  <select className={inputCls} value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })} required>
                    <option value="">Select Department</option>
                    {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </>
              )}

              {/* Email — optional for students, required for others */}
              <input type="email"
                placeholder={selectedRole === 'student' ? 'Email (optional)' : 'Email'}
                className={inputCls}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required={selectedRole !== 'student'}
              />

              <input type="password" placeholder="Password" className={inputCls}
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              <input type="password" placeholder="Confirm Password" className={inputCls}
                value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required />

              <button type="submit" disabled={loading}
                className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">
                {loading ? 'Creating account...' : `Register as ${selectedRole}`}
              </button>
            </form>

            {selectedRole === 'student' && (
              <p className="text-xs text-gray-400 mt-3 text-center">
                Students log in with their Student ID and password
              </p>
            )}
          </div>
        )}

        <p className="text-center text-sm text-gray-400 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
