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
  const [materials, setMaterials] = useState([]);
  const [worksheets, setWorksheets] = useState([]);

  const fetchAll = async () => {
    const [subRes, asgRes, stuRes, matRes, wsRes] = await Promise.all([
      api.get('/teacher/submissions'),
      api.get('/teacher/assignments'),
      api.get('/teacher/students'),
      api.get('/teacher/materials'),
      api.get('/teacher/worksheets'),
    ]);
    setSubmissions(subRes.data);
    setAssignments(asgRes.data);
    setStudents(stuRes.data);
    setMaterials(matRes.data);
    setWorksheets(wsRes.data);
  };

  useEffect(() => { fetchAll(); }, []);
  return { submissions, assignments, students, materials, worksheets, fetchAll };
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
    const needsKey = s.submission_type === 'text' || s.submission_type === 'pdf';
    if (needsKey && !asg?.answer_key) { openAnswerKey(asg); return; }
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
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      s.submission_type === 'text' ? 'bg-blue-100 text-blue-700' :
                      s.submission_type === 'pdf' ? 'bg-amber-100 text-amber-800' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {s.submission_type === 'text' ? '📝 Text' : s.submission_type === 'pdf' ? '📄 PDF' : '📷 Image'}
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
const DEPARTMENTS = ['IS', 'IT', 'CS', 'Cyber', 'Software'];

const UploadSection = ({ assignments, fetchAll }) => {
  const [form, setForm] = useState({ department: '', assignment_id: '' });
  const [questionFile, setQuestionFile] = useState(null);
  const [teacherFile, setTeacherFile] = useState(null);
  const [studentFiles, setStudentFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [results, setResults] = useState(null);

  const handleStudentFiles = (e) => {
    setStudentFiles(Array.from(e.target.files));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!form.department) return setMessage('Please select a department');
    if (!questionFile)    return setMessage('Please upload the exam question image');
    if (!teacherFile)     return setMessage('Please upload the teacher answer image');
    if (studentFiles.length === 0) return setMessage('Please upload at least one student answer image');

    setUploading(true);
    setMessage('');
    setResults(null);

    const fd = new FormData();
    fd.append('department', form.department);
    if (form.assignment_id) fd.append('assignment_id', form.assignment_id);
    fd.append('question_image', questionFile);
    fd.append('teacher_answer_image', teacherFile);
    studentFiles.forEach((f) => fd.append('student_answer_images', f));

    try {
      const { data } = await api.post('/teacher/upload-exam', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage(data.message);
      setResults(data.results);
      setForm({ department: '', assignment_id: '' });
      setQuestionFile(null);
      setTeacherFile(null);
      setStudentFiles([]);
      fetchAll();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const FileBox = ({ label, icon, hint, file, onChange, multiple }) => (
    <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 hover:border-indigo-300 transition-colors">
      <p className="text-sm font-medium text-gray-700 mb-1">{icon} {label}</p>
      {hint && <p className="text-xs text-gray-400 mb-2">{hint}</p>}
      <input type="file" accept="image/*,.pdf" multiple={multiple}
        className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 file:text-xs"
        onChange={onChange}
      />
      {!multiple && file && (
        <p className="text-xs text-green-600 mt-1">✓ {file.name}</p>
      )}
      {multiple && studentFiles.length > 0 && (
        <div className="mt-2 space-y-1">
          {studentFiles.map((f, i) => (
            <p key={i} className="text-xs text-green-600">✓ {f.name}</p>
          ))}
          <p className="text-xs text-indigo-600 font-medium">{studentFiles.length} student paper(s) selected</p>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Upload Exam</h2>
      <p className="text-gray-400 text-sm mb-6">
        Upload 1 question + 1 teacher answer + multiple student papers. AI will identify each student from their paper.
      </p>

      <div className="bg-white rounded-xl shadow p-6 max-w-2xl">
        {message && (
          <div className={`mb-4 px-4 py-2 rounded text-sm flex justify-between items-center ${
            message.includes('failed') || message.includes('error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'
          }`}>
            <span>{message}</span>
            <button onClick={() => setMessage('')}>&times;</button>
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-5">
          {/* Department dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              required
            >
              <option value="">— Select Department —</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            {form.department && (
              <p className="text-xs text-indigo-600 mt-1">
                Student papers will be matched to <strong>{form.department}</strong> students
              </p>
            )}
          </div>

          {/* Assignment — optional */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assignment <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={form.assignment_id}
              onChange={(e) => setForm({ ...form, assignment_id: e.target.value })}
            >
              <option value="">— No assignment (general exam) —</option>
              {assignments.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
            </select>
          </div>

          {/* Single images */}
          <FileBox label="Exam Question" icon="📄" hint="One photo of the exam question paper"
            file={questionFile} onChange={(e) => setQuestionFile(e.target.files[0])} />
          <FileBox label="Teacher's Correct Answer" icon="📘" hint="One photo of the model answer / marking scheme"
            file={teacherFile} onChange={(e) => setTeacherFile(e.target.files[0])} />

          {/* Multiple student images */}
          <FileBox label="Student Answer Papers" icon="📝"
            hint="Select ALL student answer papers at once. AI will read each paper, extract the student ID and name, and match them automatically."
            multiple onChange={handleStudentFiles} />

          <div className="bg-indigo-50 rounded-lg p-3 text-xs text-indigo-700 space-y-1">
            <p>💡 Make sure each student paper has their <strong>Student ID</strong> and <strong>Name</strong> written clearly at the top.</p>
            <p>After uploading, go to <strong>AI Grading</strong> to grade each submission.</p>
          </div>

          <button type="submit" disabled={uploading}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {uploading ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing {studentFiles.length} paper(s)...</>
            ) : (
              `Upload ${studentFiles.length > 0 ? studentFiles.length + ' Student Paper(s)' : 'Exam'}`
            )}
          </button>
        </form>

        {/* Upload results */}
        {results && (
          <div className="mt-6 border-t pt-4">
            <h4 className="font-semibold text-gray-700 mb-3 text-sm">Upload Results</h4>
            <div className="space-y-2">
              {results.map((r, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg text-xs ${
                  r.status === 'created'   ? 'bg-green-50 text-green-800' :
                  r.status === 'unmatched' ? 'bg-orange-50 text-orange-800' :
                  'bg-gray-50 text-gray-600'
                }`}>
                  <span className="text-base shrink-0">
                    {r.status === 'created' ? '✅' : r.status === 'unmatched' ? '⚠️' : '⏭️'}
                  </span>
                  <div>
                    <p className="font-medium">{r.file}</p>
                    {r.status === 'created' && (
                      <p>Matched to: <strong>{r.student_name}</strong>
                        {r.extracted_id && ` (ID: ${r.extracted_id})`}
                      </p>
                    )}
                    {r.status === 'unmatched' && (
                      <p>
                        Extracted: ID={r.extracted_id || '?'}, Name={r.extracted_name || '?'} — {r.message}
                      </p>
                    )}
                    {r.status === 'skipped' && <p>{r.message}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const FILE_BASE = 'http://localhost:5000/';

/* ── Assignments ── */
const AssignmentsSection = ({ assignments, fetchAll }) => {
  const [mode, setMode] = useState('text'); // 'text' | 'pdf'
  const [form, setForm] = useState({ title: '', description: '', due_date: '', max_marks: 100, department: '' });
  const [pdfFile, setPdfFile] = useState(null);
  const [creating, setCreating] = useState(false);
  const [answerKeyModal, setAnswerKeyModal] = useState(null);
  const [answerKeyText, setAnswerKeyText] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [message, setMessage] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.department) return setMessage('Please select a department');
    setCreating(true);
    try {
      if (mode === 'pdf') {
        if (!pdfFile) {
          setMessage('Please choose a PDF file for the assignment');
          setCreating(false);
          return;
        }
        const fd = new FormData();
        fd.append('title', form.title);
        if (form.description) fd.append('description', form.description);
        if (form.due_date) fd.append('due_date', form.due_date);
        fd.append('max_marks', String(form.max_marks || 100));
        fd.append('department', form.department);
        fd.append('assignment_pdf', pdfFile);
        await api.post('/teacher/assignments/pdf', fd);
      } else {
        await api.post('/teacher/assignments', form);
      }
      setMessage('Assignment created');
      setForm({ title: '', description: '', due_date: '', max_marks: 100, department: '' });
      setPdfFile(null);
      fetchAll();
    } catch {
      setMessage('Failed to create assignment');
    } finally {
      setCreating(false);
    }
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
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setMode('text')}
              className={`flex-1 text-xs py-2 rounded-lg border ${mode === 'text' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              📝 Text assignment
            </button>
            <button
              type="button"
              onClick={() => setMode('pdf')}
              className={`flex-1 text-xs py-2 rounded-lg border ${mode === 'pdf' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              📄 PDF assignment
            </button>
          </div>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                required
              >
                <option value="">— Select Department —</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <input type="text" placeholder="Title" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            {mode === 'text' ? (
              <textarea
                placeholder="Full assignment text / questions / instructions for students"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                rows={5}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
              />
            ) : (
              <>
                <textarea
                  placeholder="Optional short note (shown with the PDF)"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Assignment PDF (required)</label>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    className="w-full text-sm text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700"
                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  />
                  {pdfFile && <p className="text-xs text-green-600 mt-1">✓ {pdfFile.name}</p>}
                </div>
              </>
            )}
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
            <button type="submit" disabled={creating} className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
              {creating ? 'Creating…' : 'Create Assignment'}
            </button>
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
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${a.assignment_format === 'pdf' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                    {a.assignment_format === 'pdf' ? 'PDF' : 'Text'}
                  </span>
                  {a.department && (
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      {a.department}
                    </span>
                  )}
                  {a.assignment_format === 'pdf' && a.assignment_pdf_url && (
                    <a href={`${FILE_BASE}${a.assignment_pdf_url}`} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-600 underline">
                      View PDF
                    </a>
                  )}
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

/* ── Materials ── */
const MaterialsSection = ({ materials, fetchAll }) => {
  const [form, setForm] = useState({ title: '', description: '', department: '' });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!form.department) return setMessage('Please select a department');
    if (!file) return setMessage('Please upload a PDF file');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      if (form.description) fd.append('description', form.description);
      fd.append('department', form.department);
      fd.append('material_file', file);
      await api.post('/teacher/materials', fd);
      setMessage('Material uploaded successfully');
      setForm({ title: '', description: '', department: '' });
      setFile(null);
      fetchAll();
    } catch {
      setMessage('Failed to upload material');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Reading Materials</h2>
      <p className="text-gray-400 text-sm mb-6">Upload PDFs or reading matters for specific departments</p>

      {message && (
        <div className={`mb-4 px-4 py-2 rounded text-sm flex justify-between ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          <span>{message}</span>
          <button onClick={() => setMessage('')}>&times;</button>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-semibold text-gray-700 mb-4">Upload New Material</h3>
          <form onSubmit={handleUpload} className="space-y-3">
            <div>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                required
              >
                <option value="">— Select Department —</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <input type="text" placeholder="Title" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <textarea
              placeholder="Short description (optional)"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Material PDF File (required)</label>
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="w-full text-sm text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
              />
              {file && <p className="text-xs text-green-600 mt-1">✓ {file.name}</p>}
            </div>
            <button type="submit" disabled={uploading} className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
              {uploading ? 'Uploading…' : 'Upload Material'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-semibold text-gray-700 mb-4">My Materials</h3>
          <ul className="space-y-3 max-h-[500px] overflow-y-auto">
            {materials?.map((m) => (
              <li key={m.id} className="border rounded-xl px-4 py-3 text-sm">
                <div className="flex justify-between items-start">
                  <p className="font-medium text-gray-800">{m.title}</p>
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full shrink-0">
                    {m.department}
                  </span>
                </div>
                {m.description && <p className="text-gray-400 text-xs mt-0.5">{m.description}</p>}
                <a href={`${FILE_BASE}${m.file_url}`} target="_blank" rel="noreferrer" className="inline-block mt-2 text-xs text-indigo-600 underline">
                  View Material PDF
                </a>
              </li>
            ))}
            {(!materials || materials.length === 0) && <p className="text-gray-400 text-sm">No materials uploaded yet</p>}
          </ul>
        </div>
      </div>
    </div>
  );
};

/* ── Worksheets ── */
const WorksheetsSection = ({ worksheets, fetchAll, materials }) => {
  const [form, setForm] = useState({ title: '', course: '', department: '', description: '', answer_key: '' });
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      Object.keys(form).forEach(key => fd.append(key, form[key]));
      if (file) fd.append('worksheet_file', file);
      if (selectedMaterials.length > 0) fd.append('material_ids', JSON.stringify(selectedMaterials));

      await api.post('/teacher/worksheets', fd);
      setMessage('Worksheet created successfully!');
      setForm({ title: '', course: '', department: '', description: '', answer_key: '' });
      setSelectedMaterials([]);
      setFile(null);
      fetchAll();
    } catch {
      setMessage('Failed to create worksheet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Worksheets (Auto-Graded)</h2>
      <p className="text-gray-400 text-sm mb-6">Create instant-feedback worksheets for specific courses and departments.</p>

      {message && (
        <div className={`mb-4 px-4 py-2 rounded text-sm flex justify-between ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          <span>{message}</span>
          <button onClick={() => setMessage('')}>&times;</button>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-semibold text-gray-700 mb-4">Create Worksheet</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="Worksheet Title" className="border rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-400" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              <input type="text" placeholder="Course Name" className="border rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-400" value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} required />
            </div>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={form.department}
              onChange={(e) => {
                setForm({ ...form, department: e.target.value });
                setSelectedMaterials([]);
              }}
              required
            >
              <option value="">— Select Target Department —</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>

            {form.department && (
              <div className="border border-indigo-100 bg-indigo-50/30 p-3 rounded-lg">
                <p className="text-xs font-semibold text-indigo-800 mb-2">Attach Course Materials (Optional)</p>
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {materials?.filter(m => m.department === form.department).map(m => (
                    <label key={m.id} className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="mt-1 rounded text-indigo-600 focus:ring-indigo-500"
                        checked={selectedMaterials.includes(m.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedMaterials([...selectedMaterials, m.id]);
                          else setSelectedMaterials(selectedMaterials.filter(id => id !== m.id));
                        }}
                      />
                      <span>{m.title}</span>
                    </label>
                  ))}
                  {materials?.filter(m => m.department === form.department).length === 0 && (
                    <span className="text-xs text-gray-400 italic">No materials found for this department.</span>
                  )}
                </div>
              </div>
            )}

            <textarea
              placeholder="Worksheet Questions / Description"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Worksheet Document (PDF or Image) (Optional)</label>
              <input
                type="file"
                accept="application/pdf,image/*"
                className="w-full text-sm text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file && <p className="text-xs text-green-600 mt-1">✓ {file.name}</p>}
            </div>
            <textarea
              placeholder="Answer Key (Used by AI to instantly evaluate students)"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              rows={3}
              value={form.answer_key}
              onChange={(e) => setForm({ ...form, answer_key: e.target.value })}
              required
            />
            <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
              {loading ? 'Publishing Worksheet…' : 'Publish Worksheet'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-semibold text-gray-700 mb-4">My Worksheets</h3>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {worksheets?.map((ws) => (
              <div key={ws.id} className="border rounded-xl p-4 text-sm relative">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-gray-800">{ws.title}</h4>
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full mr-2 shrink-0">{ws.course}</span>
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full shrink-0">{ws.department}</span>
                  </div>
                  <span className="text-xs text-gray-500 font-medium">
                    {ws.submission_count} submission(s)
                  </span>
                </div>
                <p className="text-gray-500 line-clamp-2 text-xs mb-1">{ws.description}</p>
                {ws.file_url && (
                  <a href={`${FILE_BASE}${ws.file_url}`} target="_blank" rel="noreferrer" className="inline-block text-xs text-indigo-600 underline">
                    View Worksheet File
                  </a>
                )}
                {ws.attached_materials && ws.attached_materials.length > 0 && (
                  <div className="mt-2 border-t pt-2 border-gray-100">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Attached Materials</p>
                    <div className="flex flex-wrap gap-1">
                      {ws.attached_materials.map(m => (
                        <a key={m.id} href={`${FILE_BASE}${m.file_url}`} target="_blank" rel="noreferrer" className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100 hover:bg-indigo-100 transition-colors">
                          📄 {m.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {(!worksheets || worksheets.length === 0) && <p className="text-gray-400 text-sm">No worksheets created yet.</p>}
          </div>
        </div>
      </div>
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
    const asg = assignmentMap[s.assignment_id];
    const needsKey = s.submission_type === 'text' || s.submission_type === 'pdf';
    if (needsKey && !asg?.answer_key) {
      setMessage('Set an answer key for this assignment under Assignments first.');
      return;
    }
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
          src={`http://localhost:5001/${url}`}
          alt={label}
          className="w-20 h-20 object-cover rounded-lg border border-gray-200 cursor-pointer hover:scale-105 transition-transform"
          onClick={() => window.open(`http://localhost:5001/${url}`, '_blank')}
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
                      {s.student_code && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">{s.student_code}</span>
                      )}
                      {s.student_department && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{s.student_department}</span>
                      )}
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Awaiting grade</span>
                    </div>
                    <p className="text-sm text-gray-500">{s.assignment_title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Uploaded {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>

                  {/* Previews: image exams vs assignment submissions */}
                  {s.submission_type === 'image' && s.question_image_url ? (
                    <div className="flex gap-3">
                      <ImagePreview url={s.question_image_url} label="Question" />
                      <ImagePreview url={s.teacher_answer_image_url} label="Teacher Ans" />
                      <ImagePreview url={s.image_url} label="Student Ans" />
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 text-right">
                      {s.submission_type === 'pdf' ? '📄 Student submitted PDF' : '📝 Student typed answer'}
                    </div>
                  )}

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
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium text-gray-800 text-sm">{s.student_name}</h4>
                    {s.student_code && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">{s.student_code}</span>}
                    {s.student_department && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{s.student_department}</span>}
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
  const { submissions, assignments, students, materials, worksheets, fetchAll } = useTeacherData();

  return (
    <DashboardLayout pendingGrading={submissions.filter((s) => s.status !== 'graded' && s.status !== 'pending').length}>
      <Routes>
        <Route index element={<Overview submissions={submissions} assignments={assignments} />} />
        <Route path="submissions" element={<SubmissionsSection submissions={submissions} assignments={assignments} fetchAll={fetchAll} />} />
        <Route path="assignments" element={<AssignmentsSection assignments={assignments} fetchAll={fetchAll} />} />
        <Route path="upload" element={<UploadSection assignments={assignments} fetchAll={fetchAll} />} />
        <Route path="grading" element={<AIGradingSection submissions={submissions} assignments={assignments} fetchAll={fetchAll} />} />
        <Route path="materials" element={<MaterialsSection materials={materials} fetchAll={fetchAll} />} />
        <Route path="worksheets" element={<WorksheetsSection worksheets={worksheets} materials={materials} fetchAll={fetchAll} />} />
        <Route path="*" element={<Navigate to="/teacher" />} />
      </Routes>
    </DashboardLayout>
  );
};

export default TeacherDashboard;
