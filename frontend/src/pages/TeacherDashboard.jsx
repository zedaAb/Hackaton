import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '../componenets/DashboardLayout';
import AnalysisModal from '../componenets/AnalysisModal';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

/* ── shared data hook ── */
const useTeacherData = () => {
  const [submissions, setSubmissions] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);

  const fetchAll = async () => {
    const [subRes, asgRes, stuRes] = await Promise.all([
      api.get('/teacher/submissions'),
      api.get('/teacher/assignments'),
      api.get('/teacher/students'),
    ]);
    setSubmissions(subRes.data);
    setAssignments(asgRes.data);
    setStudents(stuRes.data);
  };

  useEffect(() => { fetchAll(); }, []);
  return { submissions, assignments, students, fetchAll };
};

/* ── Overview ── */
const Overview = ({ submissions, assignments }) => {
  const { user } = useAuth();
  const graded = submissions.filter((s) => s.status === 'graded').length;
  const pending = submissions.filter((s) => s.status !== 'graded').length;
  const noKey = assignments.filter((a) => !a.answer_key).length;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Welcome, {user?.name} 👋</h2>
      <p className="text-gray-400 text-sm mb-6">Teacher dashboard overview</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Submissions', value: submissions.length, color: 'text-indigo-600' },
          { label: 'Graded', value: graded, color: 'text-green-600' },
          { label: 'Pending', value: pending, color: 'text-yellow-500' },
          { label: 'Assignments', value: assignments.length, color: 'text-blue-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl shadow p-4 text-center">
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>
      {noKey > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-700 mb-6">
          ⚠ {noKey} assignment{noKey > 1 ? 's' : ''} missing an answer key. Go to Assignments to set them before grading.
        </div>
      )}
    </div>
  );
};

/* ── Submissions ── */
const SubmissionsSection = ({ submissions, assignments, fetchAll }) => {
  const [grading, setGrading] = useState(null);
  const [analysisModal, setAnalysisModal] = useState(null);
  const [answerKeyModal, setAnswerKeyModal] = useState(null);
  const [answerKeyText, setAnswerKeyText] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [message, setMessage] = useState('');

  const assignmentMap = Object.fromEntries(assignments.map((a) => [a.id, a]));

  const openAnswerKey = (asg) => { setAnswerKeyModal(asg); setAnswerKeyText(asg.answer_key || ''); };

  const handleSaveAnswerKey = async () => {
    setSavingKey(true);
    try {
      await api.put(`/teacher/assignments/${answerKeyModal.id}/answer-key`, { answer_key: answerKeyText });
      setMessage('Answer key saved');
      setAnswerKeyModal(null);
      fetchAll();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed');
    } finally { setSavingKey(false); }
  };

  const handleGrade = async (s) => {
    const asg = assignmentMap[s.assignment_id];
    if (!asg?.answer_key) { openAnswerKey(asg); return; }
    setGrading(s.id);
    try {
      const { data } = await api.post(`/teacher/grade/${s.id}`);
      setMessage('AI grading complete');
      fetchAll();
      if (data.analysis) setAnalysisModal({ ai_analysis: data.analysis, assignment_title: s.assignment_title });
    } catch (err) {
      setMessage('Grading failed: ' + (err.response?.data?.message || err.message));
    } finally { setGrading(null); }
  };

  const handleViewAnalysis = async (s) => {
    try {
      const { data } = await api.get(`/teacher/analysis/${s.id}`);
      setAnalysisModal(data);
    } catch { setMessage('Could not load analysis'); }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Submissions</h2>
      <p className="text-gray-400 text-sm mb-6">Grade student submissions with AI</p>

      {message && (
        <div className={`mb-4 px-4 py-2 rounded text-sm flex justify-between ${message.includes('failed') || message.includes('Please') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="ml-4 opacity-60 hover:opacity-100">&times;</button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">Student</th>
              <th className="px-4 py-3 text-left">Assignment</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Grade</th>
              <th className="px-4 py-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((s) => {
              const asg = assignmentMap[s.assignment_id];
              const hasKey = !!asg?.answer_key;
              return (
                <tr key={s.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{s.student_name}</td>
                  <td className="px-4 py-3">{s.assignment_title}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${s.submission_type === 'text' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {s.submission_type === 'text' ? '📝 Text' : '📷 Image'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${s.status === 'graded' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold">{s.grade != null ? `${s.grade}%` : '—'}</td>
                  <td className="px-4 py-3">
                    {s.status !== 'graded' && (
                      !hasKey ? (
                        <button onClick={() => openAnswerKey(asg)} className="text-xs bg-orange-100 text-orange-700 px-3 py-1.5 rounded hover:bg-orange-200">
                          ⚠ Set Answer Key
                        </button>
                      ) : (
                        <button onClick={() => handleGrade(s)} disabled={grading === s.id} className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1">
                          {grading === s.id ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Grading...</> : 'Grade with AI'}
                        </button>
                      )
                    )}
                    {s.status === 'graded' && (
                      <button onClick={() => handleViewAnalysis(s)} className="bg-green-600 text-white text-xs px-3 py-1.5 rounded hover:bg-green-700">
                        View Analysis
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {submissions.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No submissions yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {analysisModal && <AnalysisModal submission={analysisModal} onClose={() => setAnalysisModal(null)} />}

      {answerKeyModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
            <div className="p-6 border-b flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Answer Key / Marking Scheme</h3>
                <p className="text-sm text-gray-400 mt-0.5">{answerKeyModal.title}</p>
              </div>
              <button onClick={() => setAnswerKeyModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                💡 List each question with expected answer, key points, and marks. AI will grade against this.
              </div>
              <textarea
                rows={10}
                placeholder={`Q1 (10 marks): What is photosynthesis?\nExpected: Process by which plants use sunlight, water and CO2 to produce glucose and oxygen.\nKey points: light energy, chlorophyll, glucose, oxygen release.\n\nQ2 (10 marks): ...`}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                value={answerKeyText}
                onChange={(e) => setAnswerKeyText(e.target.value)}
              />
              <div className="flex gap-3">
                <button onClick={() => setAnswerKeyModal(null)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
                <button onClick={handleSaveAnswerKey} disabled={savingKey || !answerKeyText.trim()} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                  {savingKey ? 'Saving...' : 'Save Answer Key'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Upload Exam ── */
const UploadSection = ({ students, assignments, fetchAll }) => {
  const [form, setForm] = useState({ student_id: '', assignment_id: '' });
  const [files, setFiles] = useState({ question_image: null, teacher_answer_image: null, student_answer_image: null });
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!files.question_image) return setMessage('Please upload the exam question image');
    if (!files.teacher_answer_image) return setMessage('Please upload the teacher answer image');
    if (!files.student_answer_image) return setMessage('Please upload the student answer image');

    setUploading(true);
    const fd = new FormData();
    fd.append('student_id', form.student_id);
    fd.append('assignment_id', form.assignment_id);
    fd.append('question_image', files.question_image);
    fd.append('teacher_answer_image', files.teacher_answer_image);
    fd.append('student_answer_image', files.student_answer_image);
    try {
      await api.post('/teacher/upload-exam', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMessage('Exam uploaded successfully. You can now grade it with AI.');
      setForm({ student_id: '', assignment_id: '' });
      setFiles({ question_image: null, teacher_answer_image: null, student_answer_image: null });
      fetchAll();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Upload failed');
    } finally { setUploading(false); }
  };

  const FileInput = ({ label, field, icon, hint }) => (
    <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 hover:border-indigo-300 transition-colors">
      <label className="block text-sm font-medium text-gray-700 mb-1">{icon} {label}</label>
      {hint && <p className="text-xs text-gray-400 mb-2">{hint}</p>}
      <input
        type="file" accept="image/*,.pdf"
        className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 file:text-xs"
        onChange={(e) => setFiles({ ...files, [field]: e.target.files[0] })}
      />
      {files[field] && <p className="text-xs text-green-600 mt-1">✓ {files[field].name}</p>}
    </div>
  );

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Upload Exam</h2>
      <p className="text-gray-400 text-sm mb-6">Upload 3 images — the AI will compare student vs teacher answer to grade</p>

      <div className="bg-white rounded-xl shadow p-6 max-w-2xl">
        {message && (
          <div className={`mb-4 px-4 py-2 rounded text-sm flex justify-between ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            <span>{message}</span>
            <button onClick={() => setMessage('')}>&times;</button>
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} required>
              <option value="">Select Student</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.assignment_id} onChange={(e) => setForm({ ...form, assignment_id: e.target.value })} required>
              <option value="">Select Assignment</option>
              {assignments.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
            </select>
          </div>

          <div className="space-y-3">
            <FileInput label="Exam Question" field="question_image" icon="📄" hint="Photo of the exam question paper" />
            <FileInput label="Teacher's Correct Answer" field="teacher_answer_image" icon="📘" hint="Photo of the model answer / marking scheme" />
            <FileInput label="Student's Answer" field="student_answer_image" icon="📝" hint="Photo of the student's handwritten answer" />
          </div>

          <div className="bg-indigo-50 rounded-lg p-3 text-xs text-indigo-700">
            💡 After uploading, go to <strong>Submissions</strong> and click <strong>Grade with AI</strong>. The AI will read all 3 images and grade the student's answer against yours.
          </div>

          <button type="submit" disabled={uploading} className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {uploading ? 'Uploading...' : 'Upload All 3 Images'}
          </button>
        </form>
      </div>
    </div>
  );
};

/* ── Assignments ── */
const AssignmentsSection = ({ assignments, fetchAll }) => {
  const [form, setForm] = useState({ title: '', description: '', due_date: '', max_marks: 100 });
  const [answerKeyModal, setAnswerKeyModal] = useState(null);
  const [answerKeyText, setAnswerKeyText] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [message, setMessage] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/teacher/assignments', form);
      setMessage('Assignment created');
      setForm({ title: '', description: '', due_date: '', max_marks: 100 });
      fetchAll();
    } catch { setMessage('Failed to create assignment'); }
  };

  const openAnswerKey = (a) => { setAnswerKeyModal(a); setAnswerKeyText(a.answer_key || ''); };

  const handleSaveAnswerKey = async () => {
    setSavingKey(true);
    try {
      await api.put(`/teacher/assignments/${answerKeyModal.id}/answer-key`, { answer_key: answerKeyText });
      setMessage('Answer key saved');
      setAnswerKeyModal(null);
      fetchAll();
    } catch { setMessage('Failed to save'); } finally { setSavingKey(false); }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Assignments</h2>
      <p className="text-gray-400 text-sm mb-6">Create assignments and manage answer keys</p>

      {message && (
        <div className={`mb-4 px-4 py-2 rounded text-sm flex justify-between ${message.includes('Failed') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          <span>{message}</span>
          <button onClick={() => setMessage('')}>&times;</button>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Create form */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-semibold text-gray-700 mb-4">Create New Assignment</h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <input type="text" placeholder="Title" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <textarea placeholder="Description / Instructions for students" className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Due Date</label>
                <input type="datetime-local" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Max Marks</label>
                <input type="number" min="1" max="1000" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.max_marks} onChange={(e) => setForm({ ...form, max_marks: e.target.value })} />
              </div>
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700">Create Assignment</button>
          </form>
        </div>

        {/* List */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-semibold text-gray-700 mb-4">My Assignments</h3>
          <ul className="space-y-3 max-h-[500px] overflow-y-auto">
            {assignments.map((a) => (
              <li key={a.id} className="border rounded-xl px-4 py-3 text-sm">
                <div className="flex justify-between items-start">
                  <p className="font-medium text-gray-800">{a.title}</p>
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full ml-2 shrink-0">{a.submission_count} submissions</span>
                </div>
                {a.description && <p className="text-gray-400 text-xs mt-0.5 line-clamp-1">{a.description}</p>}
                <div className="flex gap-3 mt-1 text-xs text-gray-400">
                  <span>Max: {a.max_marks}</span>
                  {a.due_date && <span>Due: {new Date(a.due_date).toLocaleDateString()}</span>}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {a.answer_key
                    ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Answer key set</span>
                    : <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">⚠ No answer key</span>
                  }
                  <button onClick={() => openAnswerKey(a)} className="text-xs text-indigo-600 underline hover:text-indigo-800">
                    {a.answer_key ? 'Edit' : 'Set answer key'}
                  </button>
                </div>
              </li>
            ))}
            {assignments.length === 0 && <p className="text-gray-400 text-sm">No assignments yet</p>}
          </ul>
        </div>
      </div>

      {answerKeyModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
            <div className="p-6 border-b flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Answer Key / Marking Scheme</h3>
                <p className="text-sm text-gray-400">{answerKeyModal.title} · Max {answerKeyModal.max_marks} marks</p>
              </div>
              <button onClick={() => setAnswerKeyModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                💡 List each question with expected answer, key points, and marks. AI will grade against this.
              </div>
              <textarea
                rows={12}
                placeholder={`Q1 (10 marks): What is photosynthesis?\nExpected: Process by which plants use sunlight, water and CO2...\nKey points: light energy, chlorophyll, glucose, oxygen.\n\nQ2 (10 marks): ...`}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                value={answerKeyText}
                onChange={(e) => setAnswerKeyText(e.target.value)}
              />
              <div className="flex gap-3">
                <button onClick={() => setAnswerKeyModal(null)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
                <button onClick={handleSaveAnswerKey} disabled={savingKey || !answerKeyText.trim()} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                  {savingKey ? 'Saving...' : 'Save Answer Key'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── AI Grading ── */
const AIGradingSection = ({ submissions, assignments, fetchAll }) => {
  const [grading, setGrading] = useState(null);
  const [analysisModal, setAnalysisModal] = useState(null);
  const [message, setMessage] = useState('');

  const assignmentMap = Object.fromEntries(assignments.map((a) => [a.id, a]));
  const pending = submissions.filter((s) => s.status === 'submitted');
  const graded = submissions.filter((s) => s.status === 'graded');

  const handleGrade = async (s) => {
    setGrading(s.id);
    setMessage('');
    try {
      const { data } = await api.post(`/teacher/grade/${s.id}`);
      setMessage(`✓ Graded ${s.student_name} — ${data.analysis?.overall_grade ?? '?'}/100`);
      fetchAll();
      if (data.analysis) setAnalysisModal({ ai_analysis: data.analysis, assignment_title: s.assignment_title });
    } catch (err) {
      setMessage('Grading failed: ' + (err.response?.data?.message || err.message));
    } finally { setGrading(null); }
  };

  const handleViewAnalysis = async (s) => {
    try {
      const { data } = await api.get(`/teacher/analysis/${s.id}`);
      setAnalysisModal(data);
    } catch { setMessage('Could not load analysis'); }
  };

  const ImagePreview = ({ url, label }) => {
    if (!url) return null;
    return (
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs text-gray-400">{label}</span>
        <img
          src={`http://localhost:5000/${url}`}
          alt={label}
          className="w-20 h-20 object-cover rounded-lg border border-gray-200 cursor-pointer hover:scale-105 transition-transform"
          onClick={() => window.open(`http://localhost:5000/${url}`, '_blank')}
        />
      </div>
    );
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">AI Grading</h2>
      <p className="text-gray-400 text-sm mb-6">
        Review uploaded exams and trigger AI grading. AI compares student answer against teacher answer.
      </p>

      {message && (
        <div className={`mb-4 px-4 py-2 rounded text-sm flex justify-between items-center ${
          message.includes('failed') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
        }`}>
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="ml-4 opacity-60 hover:opacity-100">&times;</button>
        </div>
      )}

      {/* Pending grading */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-base font-semibold text-gray-700">Awaiting Grading</h3>
          {pending.length > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{pending.length}</span>
          )}
        </div>

        {pending.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
            <p className="text-4xl mb-2">✅</p>
            <p>All submissions have been graded.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((s) => (
              <div key={s.id} className="bg-white rounded-xl shadow border border-gray-100 p-5">
                <div className="flex justify-between items-start flex-wrap gap-4">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="font-semibold text-gray-800">{s.student_name}</h4>
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Awaiting grade</span>
                    </div>
                    <p className="text-sm text-gray-500">{s.assignment_title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Uploaded {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>

                  {/* Image previews */}
                  <div className="flex gap-3">
                    <ImagePreview url={s.question_image_url} label="Question" />
                    <ImagePreview url={s.teacher_answer_image_url} label="Teacher Ans" />
                    <ImagePreview url={s.image_url} label="Student Ans" />
                  </div>

                  {/* Grade button */}
                  <div className="flex items-center">
                    <button
                      onClick={() => handleGrade(s)}
                      disabled={grading === s.id}
                      className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {grading === s.id ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Grading...
                        </>
                      ) : (
                        <> 🤖 Grade with AI </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Already graded */}
      {graded.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-gray-700 mb-4">Recently Graded</h3>
          <div className="space-y-3">
            {graded.map((s) => (
              <div key={s.id} className="bg-white rounded-xl shadow border border-gray-100 p-4 flex justify-between items-center flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-800 text-sm">{s.student_name}</h4>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Graded</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{s.assignment_title}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-2xl font-bold ${
                    s.grade >= 80 ? 'text-green-600' : s.grade >= 60 ? 'text-yellow-600' : 'text-red-500'
                  }`}>
                    {s.grade}%
                  </span>
                  <button
                    onClick={() => handleViewAnalysis(s)}
                    className="bg-green-600 text-white text-xs px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    View Analysis
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {analysisModal && <AnalysisModal submission={analysisModal} onClose={() => setAnalysisModal(null)} />}
    </div>
  );
};

/* ── Root ── */
const TeacherDashboard = () => {
  const { submissions, assignments, students, fetchAll } = useTeacherData();
  const pendingGrading = submissions.filter((s) => s.status === 'submitted').length;

  return (
    <DashboardLayout pendingGrading={pendingGrading}>
      <Routes>
        <Route index element={<Overview submissions={submissions} assignments={assignments} />} />
        <Route path="submissions" element={<SubmissionsSection submissions={submissions} assignments={assignments} fetchAll={fetchAll} />} />
        <Route path="grading" element={<AIGradingSection submissions={submissions} assignments={assignments} fetchAll={fetchAll} />} />
        <Route path="upload" element={<UploadSection students={students} assignments={assignments} fetchAll={fetchAll} />} />
        <Route path="assignments" element={<AssignmentsSection assignments={assignments} fetchAll={fetchAll} />} />
        <Route path="*" element={<Navigate to="/teacher" />} />
      </Routes>
    </DashboardLayout>
  );
};

export default TeacherDashboard;
