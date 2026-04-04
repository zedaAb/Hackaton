import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '../componenets/DashboardLayout';
import api from '../api/axios';

const useAdminData = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  const fetchAll = async () => {
    const [statRes, userRes, subRes] = await Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/users'),
      api.get('/admin/submissions'),
    ]);
    setStats(statRes.data);
    setUsers(userRes.data);
    setSubmissions(subRes.data);
  };

  useEffect(() => { fetchAll(); }, []);
  return { stats, users, submissions, fetchAll };
};

/* ── Overview ── */
const Overview = ({ stats }) => {
  const roleCount = (role) => stats?.users?.find((u) => u.role === role)?.count ?? 0;
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Admin Overview</h2>
      <p className="text-gray-400 text-sm mb-6">System-wide statistics</p>
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Students', value: roleCount('student'), color: 'text-blue-600' },
            { label: 'Teachers', value: roleCount('teacher'), color: 'text-purple-600' },
            { label: 'Total Submissions', value: stats.submissions?.total, color: 'text-indigo-600' },
            { label: 'Avg Grade', value: stats.submissions?.avg_grade ? `${stats.submissions.avg_grade}%` : '—', color: 'text-green-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl shadow p-5 text-center">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Users ── */
const UsersSection = ({ users, fetchAll }) => {
  const [message, setMessage] = useState('');

  const handleDelete = async (id) => {
    if (!confirm('Delete this user?')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setMessage('User deleted');
      fetchAll();
    } catch { setMessage('Delete failed'); }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Users</h2>
      <p className="text-gray-400 text-sm mb-6">Manage all registered users</p>
      {message && (
        <div className="mb-4 bg-indigo-50 text-indigo-700 px-4 py-2 rounded text-sm flex justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')}>&times;</button>
        </div>
      )}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Joined</th>
              <th className="px-4 py-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs capitalize ${
                    u.role === 'admin' ? 'bg-red-100 text-red-700' :
                    u.role === 'teacher' ? 'bg-purple-100 text-purple-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>{u.role}</span>
                </td>
                <td className="px-4 py-3 text-gray-400">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <button onClick={() => handleDelete(u.id)} className="text-red-500 hover:text-red-700 text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No users</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ── Submissions ── */
const SubmissionsSection = ({ submissions }) => (
  <div>
    <h2 className="text-2xl font-bold text-gray-800 mb-1">All Submissions</h2>
    <p className="text-gray-400 text-sm mb-6">Monitor all grading activity</p>
    <div className="bg-white rounded-xl shadow overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="px-4 py-3 text-left">Student</th>
            <th className="px-4 py-3 text-left">Assignment</th>
            <th className="px-4 py-3 text-left">Teacher</th>
            <th className="px-4 py-3 text-left">Grade</th>
            <th className="px-4 py-3 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((s) => (
            <tr key={s.id} className="border-t hover:bg-gray-50">
              <td className="px-4 py-3">{s.student_name}</td>
              <td className="px-4 py-3">{s.assignment_title}</td>
              <td className="px-4 py-3 text-gray-500">{s.teacher_name}</td>
              <td className="px-4 py-3 font-semibold">{s.grade != null ? `${s.grade}%` : '—'}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded-full text-xs ${s.status === 'graded' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {s.status}
                </span>
              </td>
            </tr>
          ))}
          {submissions.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No submissions</td></tr>}
        </tbody>
      </table>
    </div>
  </div>
);

/* ── Root ── */
const AdminDashboard = () => {
  const { stats, users, submissions, fetchAll } = useAdminData();
  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<Overview stats={stats} />} />
        <Route path="users" element={<UsersSection users={users} fetchAll={fetchAll} />} />
        <Route path="submissions" element={<SubmissionsSection submissions={submissions} />} />
        <Route path="*" element={<Navigate to="/admin" />} />
      </Routes>
    </DashboardLayout>
  );
};

export default AdminDashboard;
