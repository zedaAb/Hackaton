import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';

const roles = [
  { value: 'student', label: 'Student', icon: '🎓', desc: 'View your grades and AI feedback' },
  { value: 'teacher', label: 'Teacher', icon: '📚', desc: 'Upload exams and trigger AI grading' },
  { value: 'admin', label: 'Admin', icon: '🛡️', desc: 'Manage users and monitor the system' },
];

const Register = () => {
  const [step, setStep] = useState(1); // step 1: pick role, step 2: fill form
  const [selectedRole, setSelectedRole] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      return setError('Passwords do not match');
    }
    setLoading(true);
    try {
      await api.post('/auth/register', {
        name: form.name,
        email: form.email,
        password: form.password,
        role: selectedRole,
      });
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const roleInfo = roles.find((r) => r.value === selectedRole);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-blue-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <h2 className="text-3xl font-bold text-indigo-700 mb-1 text-center">AI Grader</h2>
        <p className="text-center text-gray-400 text-sm mb-6">Create your account</p>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            step >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'
          }`}>1</div>
          <div className={`h-1 w-12 rounded ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-200'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            step >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'
          }`}>2</div>
        </div>

        {/* Step 1: Role Selection */}
        {step === 1 && (
          <div>
            <p className="text-center text-gray-600 text-sm mb-4 font-medium">Select your role</p>
            <div className="space-y-3">
              {roles.map((role) => (
                <button
                  key={role.value}
                  onClick={() => handleRoleSelect(role.value)}
                  className="w-full flex items-center gap-4 border-2 border-gray-100 rounded-xl px-4 py-3 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left"
                >
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

        {/* Step 2: Registration Form */}
        {step === 2 && (
          <div>
            {/* Selected role badge */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5">
                <span>{roleInfo?.icon}</span>
                <span className="text-sm font-medium text-indigo-700 capitalize">{selectedRole}</span>
              </div>
              <button
                onClick={() => { setStep(1); setError(''); }}
                className="text-xs text-gray-400 hover:text-indigo-600"
              >
                Change role
              </button>
            </div>

            {error && (
              <p className="bg-red-50 text-red-600 text-sm p-3 rounded mb-4">{error}</p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Full Name"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <input
                type="email"
                placeholder="Email"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <input
                type="password"
                placeholder="Confirm Password"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Creating account...' : `Register as ${selectedRole}`}
              </button>
            </form>
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
