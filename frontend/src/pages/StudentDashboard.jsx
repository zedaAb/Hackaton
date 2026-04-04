import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '../componenets/DashboardLayout';
import GradeCard from '../componenets/GradeCard';
import AnalysisModal from '../componenets/AnalysisModal';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

/* ── Overview ── */
const Overview = ({ stats, submissions, onViewAnalysis }) => {
  const gradedCount = submissions.filter((s) => s.status === 'graded').length;
  const pendingCount = submissions.filter((s) => s.status !== 'graded').length;
  const { user } = useAuth();

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Welcome back, {user?.name} 👋</h2>
      <p className="text-gray-400 text-sm mb-6">Here's your academic performance overview</p>
      {(user?.student_id || user?.department) && (
        <div className="flex items-center gap-3 mb-6">
          {user.student_id && (
            <span className="bg-gray-100 text-gray-700 text-xs px-3 py-1.5 rounded-lg font-mono">
              ID: {user.student_id}
            </span>
          )}
          {user.department && (
            <span className="bg-indigo-100 text-indigo-700 text-xs px-3 py-1.5 rounded-lg font-medium">
              Dept: {user.department}
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Exams', value: stats?.total ?? '—', color: 'text-indigo-600' },
          { label: 'Graded', value: gradedCount, color: 'text-green-600' },
          { label: 'Pending', value: pendingCount, color: 'text-yellow-500' },
          { label: 'Avg Grade', value: stats?.average_grade ? `${stats.average_grade}%` : '—', color: 'text-blue-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl shadow p-4 text-center">
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <h3 className="text-lg font-semibold text-gray-700 mb-4">Recent Submissions</h3>
      {submissions.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
          <p className="text-4xl mb-2">📭</p>
          <p>No submissions yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {submissions.slice(0, 4).map((s) => (
            <GradeCard key={s.id} submission={s} onViewAnalysis={onViewAnalysis} />
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Assignments ── */
const AssignmentsSection = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => { fetchAssignments(); }, []);

  const fetchAssignments = async () => {
    try {
      const { data } = await api.get('/student/assignments');
      setAssignments(data);
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      await api.post('/student/submit', { assignment_id: selected.id, answer_text: answer });
      setMessage('Submitted successfully!');
      setSelected(null);
      setAnswer('');
      fetchAssignments();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Submission failed');
    } finally { setSubmitting(false); }
  };

  const isOverdue = (d) => d && new Date(d) < new Date();

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Assignments</h2>
      <p className="text-gray-400 text-sm mb-6">View and submit your assignments</p>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {message}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400">
          <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          Loading...
        </div>
      ) : assignments.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
          <p className="text-4xl mb-2">📋</p>
          <p>No assignments available yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map((a) => (
            <div key={a.id} className="bg-white rounded-xl shadow border border-gray-100 p-5">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-800 text-base">{a.title}</h3>
                    {a.already_submitted && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Submitted</span>
                    )}
                    {isOverdue(a.due_date) && !a.already_submitted && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Overdue</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">By {a.teacher_name}</p>
                  {a.description && <p className="text-sm text-gray-600 mt-2">{a.description}</p>}
                  <div className="flex gap-4 mt-2 text-xs text-gray-400">
                    <span>Max marks: {a.max_marks}</span>
                    {a.due_date && (
                      <span className={isOverdue(a.due_date) ? 'text-red-500' : ''}>
                        Due: {new Date(a.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
                {!a.already_submitted && (
                  <button
                    onClick={() => { setSelected(a); setMessage(''); setAnswer(''); }}
                    className="ml-4 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 shrink-0"
                  >
                    Submit Answer
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Submit Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
            <div className="p-6 border-b flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{selected.title}</h3>
                <p className="text-sm text-gray-400 mt-0.5">Max marks: {selected.max_marks}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {selected.description && (
                <div className="bg-indigo-50 rounded-lg p-3 text-sm text-indigo-800">
                  <p className="font-medium mb-1">Instructions:</p>
                  <p>{selected.description}</p>
                </div>
              )}
              <textarea
                rows={10}
                placeholder="Write your answer here..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                required
              />
              <p className="text-xs text-gray-400">{answer.length} characters</p>
              {message && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{message}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setSelected(null)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={submitting || !answer.trim()} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                  {submitting ? 'Submitting...' : 'Submit Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Grades ── */
const GradesSection = ({ submissions, loading, onViewAnalysis }) => {
  const graded = submissions.filter((s) => s.status === 'graded');
  const pending = submissions.filter((s) => s.status !== 'graded');

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">My Grades</h2>
      <p className="text-gray-400 text-sm mb-6">Your graded exams with full AI analysis</p>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400">
          <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          Loading...
        </div>
      ) : (
        <>
          {/* Graded */}
          {graded.length > 0 && (
            <div className="mb-8">
              <h3 className="text-base font-semibold text-gray-700 mb-4">Graded ({graded.length})</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {graded.map((s) => (
                  <GradeCard key={s.id} submission={s} onViewAnalysis={onViewAnalysis} />
                ))}
              </div>
            </div>
          )}

          {/* Pending */}
          {pending.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-gray-700 mb-4">Awaiting Grade ({pending.length})</h3>
              <div className="space-y-3">
                {pending.map((s) => (
                  <div key={s.id} className="bg-white rounded-xl shadow border border-gray-100 p-4 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{s.assignment_title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Submitted {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-medium">
                      ⏳ Pending
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {submissions.length === 0 && (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
              <p className="text-4xl mb-2">📭</p>
              <p>No submissions yet.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

/* ── Root component ── */
const StudentDashboard = () => {
  const [submissions, setSubmissions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    Promise.all([api.get('/student/submissions'), api.get('/student/stats')])
      .then(([subRes, statRes]) => { setSubmissions(subRes.data); setStats(statRes.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleViewAnalysis = async (submission) => {
    if (submission.ai_analysis) { setSelected(submission); return; }
    try {
      const { data } = await api.get(`/student/analysis/${submission.id}`);
      setSelected(data);
    } catch (err) { console.error(err); }
  };

  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<Overview stats={stats} submissions={submissions} onViewAnalysis={handleViewAnalysis} />} />
        <Route path="assignments" element={<AssignmentsSection />} />
        <Route path="grades" element={<GradesSection submissions={submissions} loading={loading} onViewAnalysis={handleViewAnalysis} />} />
        <Route path="*" element={<Navigate to="/student" />} />
      </Routes>
      {selected && <AnalysisModal submission={selected} onClose={() => setSelected(null)} />}
    </DashboardLayout>
  );
};

export default StudentDashboard;
