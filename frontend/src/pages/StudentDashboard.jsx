import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '../componenets/DashboardLayout';
import GradeCard from '../componenets/GradeCard';
import AnalysisModal from '../componenets/AnalysisModal';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const FILE_BASE = 'http://localhost:5000/';

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
  const [responseMode, setResponseMode] = useState('text'); // 'text' | 'pdf'
  const [pdfFile, setPdfFile] = useState(null);
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
      if (responseMode === 'pdf') {
        if (!pdfFile) {
          setMessage('Please upload your answer as a PDF');
          setSubmitting(false);
          return;
        }
        const fd = new FormData();
        fd.append('assignment_id', String(selected.id));
        fd.append('answer_pdf', pdfFile);
        await api.post('/student/submit', fd);
      } else {
        await api.post('/student/submit', { assignment_id: selected.id, answer_text: answer });
      }
      setMessage('Submitted successfully!');
      setSelected(null);
      setAnswer('');
      setPdfFile(null);
      setResponseMode('text');
      fetchAssignments();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
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
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${a.assignment_format === 'pdf' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                      {a.assignment_format === 'pdf' ? 'PDF' : 'Text'}
                    </span>
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
                    onClick={() => {
                      setSelected(a);
                      setMessage('');
                      setAnswer('');
                      setPdfFile(null);
                      setResponseMode('text');
                    }}
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
              {selected.assignment_format === 'pdf' && selected.assignment_pdf_url && (
                <a
                  href={`${FILE_BASE}${selected.assignment_pdf_url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-indigo-600 font-medium hover:underline"
                >
                  📄 Open assignment PDF
                </a>
              )}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Your response</p>
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => { setResponseMode('text'); setPdfFile(null); }}
                    className={`flex-1 text-xs py-2 rounded-lg border ${responseMode === 'text' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600'}`}
                  >
                    Type answer
                  </button>
                  <button
                    type="button"
                    onClick={() => { setResponseMode('pdf'); setAnswer(''); }}
                    className={`flex-1 text-xs py-2 rounded-lg border ${responseMode === 'pdf' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600'}`}
                  >
                    Upload PDF
                  </button>
                </div>
                {responseMode === 'text' ? (
                  <>
                    <textarea
                      rows={10}
                      placeholder="Write your answer here..."
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      required={responseMode === 'text'}
                    />
                    <p className="text-xs text-gray-400 mt-1">{answer.length} characters</p>
                  </>
                ) : (
                  <div>
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      className="w-full text-sm text-gray-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700"
                      onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                    />
                    {pdfFile && <p className="text-xs text-green-600 mt-2">✓ {pdfFile.name}</p>}
                    <p className="text-xs text-gray-400 mt-2">Submit your work as a single PDF file.</p>
                  </div>
                )}
              </div>
              {message && (
                <p className={`text-sm px-3 py-2 rounded ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {message}
                </p>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => setSelected(null)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
                <button
                  type="submit"
                  disabled={submitting || (responseMode === 'text' ? !answer.trim() : !pdfFile)}
                  className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
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

/* ── Materials ── */
const MaterialsSection = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/student/materials')
      .then((res) => setMaterials(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Reading Materials</h2>
      <p className="text-gray-400 text-sm mb-6">PDFs and reading materials uploaded for your department</p>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400">
          <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          Loading materials...
        </div>
      ) : materials.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
          <p className="text-4xl mb-2">📚</p>
          <p>No reading materials available yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {materials.map((m) => (
            <div key={m.id} className="bg-white rounded-xl shadow border border-gray-100 p-5">
              <div className="flex justify-between items-start flex-wrap gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 text-lg">{m.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">Uploaded by {m.teacher_name}</p>
                  {m.description && <p className="text-sm text-gray-600 mt-2">{m.description}</p>}
                </div>
                <a
                  href={`${FILE_BASE}${m.file_url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-100 whitespace-nowrap"
                >
                  📄 View PDF
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Worksheets ── */
const WorksheetsSection = () => {
  const [worksheets, setWorksheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [feedback, setFeedback] = useState(null);

  const fetchWorksheets = () => {
    setLoading(true);
    api.get('/student/worksheets')
      .then((res) => setWorksheets(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWorksheets();
  }, []);

  const handleSubmit = async (e, wsId) => {
    e.preventDefault();
    const answer_text = answers[wsId];
    if (!answer_text?.trim()) return;
    
    setSubmittingId(wsId);
    try {
      const res = await api.post('/student/worksheets/submit', { worksheet_id: wsId, answer_text });
      setFeedback({ wsId, analysis: res.data.submission.ai_analysis });
      fetchWorksheets();
    } catch (err) {
      alert('Error submitting worksheet');
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Interactive Worksheets</h2>
      <p className="text-gray-400 text-sm mb-6">Complete course worksheets and get instant AI evaluation.</p>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400">
          <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          Loading worksheets...
        </div>
      ) : worksheets.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
          <p className="text-4xl mb-2">📄</p>
          <p>No worksheets available right now.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {worksheets.map((ws) => (
            <div key={ws.id} className="bg-white rounded-xl shadow border border-gray-100 p-6 relative">
              {ws.already_submitted && (
                <span className="absolute top-4 right-4 bg-green-100 text-green-800 text-xst font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                  Submitted
                </span>
              )}

              <div className="mb-4">
                <h3 className="font-semibold text-gray-800 text-xl">{ws.title}</h3>
                <p className="text-sm text-gray-500 mt-1">Course: <span className="font-semibold text-indigo-600">{ws.course}</span> | By {ws.teacher_name}</p>
              </div>
              
              <div className="bg-gray-50 border rounded-lg p-4 mb-4 text-sm text-gray-700 whitespace-pre-wrap">
                {ws.description}
              </div>

              {ws.file_url && (
                <div className="mb-4">
                  <a href={`${FILE_BASE}${ws.file_url}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-100">
                    📄 View Worksheet Document
                  </a>
                </div>
              )}

              {ws.attached_materials && ws.attached_materials.length > 0 && (
                <div className="mb-6 bg-white border border-indigo-100 rounded-lg p-4 shadow-sm">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    📚 Required Course Materials
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {ws.attached_materials.map(m => (
                      <a key={m.id} href={`${FILE_BASE}${m.file_url}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2 rounded-md hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-colors group">
                        <span className="text-xl group-hover:scale-110 transition-transform">📄</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{m.title}</p>
                          <p className="text-xs text-indigo-600 mt-0.5">Click to study</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {!ws.already_submitted ? (
                <form onSubmit={(e) => handleSubmit(e, ws.id)}>
                  <textarea
                    placeholder="Type your answer here..."
                    className="w-full border rounded-lg p-3 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-3"
                    value={answers[ws.id] || ''}
                    onChange={(e) => setAnswers({ ...answers, [ws.id]: e.target.value })}
                    required
                  />
                  <button
                    type="submit"
                    disabled={submittingId === ws.id || !answers[ws.id]?.trim()}
                    className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {submittingId === ws.id ? 'Evaluating instantly...' : 'Submit Answer for AI Grading'}
                  </button>
                </form>
              ) : (
                <div className="text-sm bg-gray-50 border border-green-200 p-4 rounded-lg">
                  <p className="font-semibold text-green-700 mb-1">✓ You have already submitted this worksheet.</p>
                  <p className="text-gray-500">Go to your Grades section if you want to view past results (if supported), or check the feedback above when you submitted.</p>
                </div>
              )}

              {/* Instant Feedback Dropdown */}
              {feedback?.wsId === ws.id && (
                 <div className="mt-6 border-t pt-6 animation-fade-in">
                   <h4 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                     🤖 Instant AI Feedback 
                     <span className={`text-sm px-2 py-0.5 rounded-full ${feedback.analysis.overall_grade >= 80 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {feedback.analysis.marks_awarded != null && feedback.analysis.max_marks
                          ? feedback.analysis.marks_awarded + ' / ' + feedback.analysis.max_marks + ' (' + Math.round((feedback.analysis.marks_awarded / feedback.analysis.max_marks) * 100) + '%)'
                          : feedback.analysis.overall_grade + '%'}
                     </span>
                   </h4>
                   <p className="text-sm text-gray-600 mb-4">{feedback.analysis.summary}</p>
                   
                   <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div className="bg-green-50 p-3 rounded shadow-sm">
                        <p className="font-bold text-green-800 mb-1">Strengths</p>
                        <ul className="list-disc pl-4 space-y-1 text-green-700">
                          {feedback.analysis.strengths?.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                      <div className="bg-red-50 p-3 rounded shadow-sm">
                        <p className="font-bold text-red-800 mb-1">Areas for Improvement</p>
                        <ul className="list-disc pl-4 space-y-1 text-red-700">
                          {feedback.analysis.weaknesses?.map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                      </div>
                   </div>
                 </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── AI QA Section (Conversational Tutor & Testing) ── */
const AIQASection = () => {
  const [materials, setMaterials] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Chat state
  const [activeSession, setActiveSession] = useState(null);
  const [message, setMessage] = useState('');
  const [chatting, setChatting] = useState(false);
  const [evaluating, setEvaluating] = useState(false);

  const fetchHistory = () => {
    setLoading(true);
    Promise.all([
      api.get('/student/materials'),
      api.get('/student/qa/history')
    ])
      .then(([matRes, histRes]) => {
        setMaterials(matRes.data);
        setHistory(histRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchHistory(); }, []);

  const handleSendMessage = async (e, isNewSessionParams = null) => {
    if (e) e.preventDefault();
    const msgToSend = message.trim();
    if (!msgToSend && !isNewSessionParams) return;
    
    setChatting(true);
    try {
      const payload = isNewSessionParams 
        ? { material_id: isNewSessionParams.materialId, message: "Hello! I would like to explore this module." } 
        : { session_id: activeSession.id, message: msgToSend };
      
      const res = await api.post('/student/qa/chat', payload);
      setActiveSession(res.data);
      setMessage('');
      fetchHistory(); // Refresh session list
    } catch {
      alert('Error communicating with AI tutor');
    } finally {
      setChatting(false);
    }
  };

  const handleEvaluate = async () => {
    if (!activeSession) return;
    setEvaluating(true);
    try {
      const res = await api.post('/student/qa/evaluate', { session_id: activeSession.id });
      setActiveSession(res.data);
      fetchHistory();
    } catch {
      alert('Error evaluating session');
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">AI QA Tutor</h2>
      <p className="text-gray-400 text-sm mb-6">Chat with your AI teacher about any material. Ask questions or request an evaluation!</p>

      {!activeSession ? (
        <>
          {/* Start New Session */}
          <div className="bg-white rounded-xl shadow border border-gray-100 p-6 mb-8">
            <h3 className="font-semibold text-gray-800 mb-4">Start a new study session:</h3>
            <div className="flex flex-wrap gap-3">
              {materials.length === 0 ? (
                <p className="text-sm text-gray-400">No materials available to study.</p>
              ) : (
                materials.map(m => (
                  <button
                    key={m.id}
                    onClick={() => handleSendMessage(null, { materialId: m.id })}
                    disabled={chatting}
                    className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-2 rounded-lg text-sm hover:bg-indigo-100 transition-colors flex items-center gap-2"
                  >
                    🚀 Start <strong>{m.title}</strong>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* History */}
          <h3 className="font-semibold text-gray-800 mb-4">Past Sessions</h3>
          {loading ? (
            <div className="text-gray-400 text-sm flex items-center gap-2"><div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />Loading history...</div>
          ) : history.length === 0 ? (
            <p className="text-gray-400 text-sm">No study sessions initiated yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {history.map(h => (
                <div key={h.id} className="bg-white rounded-lg border p-4 shadow-sm hover:border-indigo-300 transition-all cursor-pointer" onClick={() => setActiveSession(h)}>
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">📚 {h.material_title}</p>
                    {h.grade !== null ? (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${h.grade >= 80 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>Score: {h.grade}</span>
                    ) : (
                      <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded">Active</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{(h.chat_history || []).length / 2} interactions</p>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Active Chat Session */
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col h-[600px] overflow-hidden animation-fade-in relative">
          {/* Header */}
          <div className="bg-indigo-800 p-4 flex justify-between items-center text-white shrink-0">
            <div className="flex items-center gap-3">
               <button onClick={() => setActiveSession(null)} className="text-indigo-200 hover:text-white transition-colors bg-indigo-700/50 p-1.5 rounded-full">
                 🔙 Back
               </button>
               <div>
                 <h3 className="font-bold text-sm">Chatting with AI Tutor</h3>
                 <p className="text-xs text-indigo-300">Target Material: ID {activeSession.material_id}</p>
               </div>
            </div>
            {activeSession.grade === null && (
              <button 
                onClick={handleEvaluate} 
                disabled={evaluating}
                className="bg-green-500 hover:bg-green-400 text-xs font-bold px-4 py-2 rounded-lg text-white shadow-sm transition-colors"
               >
                {evaluating ? 'Evaluating...' : 'Finish & Evaluate Me'}
              </button>
            )}
          </div>
          
          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
             {(activeSession.chat_history || []).map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'}`}>
                    {msg.role !== 'user' && <p className="text-[10px] font-bold text-indigo-400 mb-1">AI Tutor</p>}
                    {msg.text}
                  </div>
                </div>
             ))}
             {chatting && (
                <div className="flex justify-start">
                   <div className="bg-white border border-gray-100 text-gray-400 text-xs px-4 py-3 rounded-2xl rounded-bl-none shadow-sm flex gap-2 items-center">
                     <span className="animate-bounce">●</span><span className="animate-bounce delay-75">●</span><span className="animate-bounce delay-150">●</span>
                   </div>
                </div>
             )}
          </div>

          {/* Footer Form OR Grade Visual */}
          {activeSession.grade !== null ? (
            <div className="bg-indigo-50 border-t border-indigo-100 p-5 shrink-0">
               <h4 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
                 🏆 Evaluation Result
                 <span className={`px-2 py-0.5 rounded text-xs ${activeSession.grade >= 80 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{activeSession.grade} / 100</span>
               </h4>
               <p className="text-sm text-indigo-800 mb-4">{activeSession.ai_feedback}</p>
               {activeSession.ai_analysis && (
                 <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="bg-white p-3 rounded-lg border border-green-100 shadow-sm">
                      <p className="font-bold text-green-700 mb-1">Strengths</p>
                      <ul className="list-disc pl-4 text-gray-600">{(activeSession.ai_analysis.strengths || []).map((s,i)=><li key={i}>{s}</li>)}</ul>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-red-100 shadow-sm">
                      <p className="font-bold text-red-700 mb-1">Area for Improvement</p>
                      <ul className="list-disc pl-4 text-gray-600">{(activeSession.ai_analysis.weaknesses || []).map((w,i)=><li key={i}>{w}</li>)}</ul>
                    </div>
                 </div>
               )}
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="bg-white border-t p-3 flex gap-3 items-end shrink-0">
               <textarea 
                  rows={2}
                  className="flex-1 w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white resize-none transition-colors"
                  placeholder="Ask a question or request a conceptual test..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                     if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); }
                  }}
               />
               <button type="submit" disabled={!message.trim() || chatting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-3 rounded-xl disabled:opacity-50 transition-colors">
                  <span className="text-xl leading-none">🚀</span>
               </button>
            </form>
          )}

        </div>
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
        <Route path="materials" element={<MaterialsSection />} />
        <Route path="worksheets" element={<WorksheetsSection />} />
        <Route path="qa" element={<AIQASection />} />
        <Route path="*" element={<Navigate to="/student" />} />
      </Routes>
      {selected && <AnalysisModal submission={selected} onClose={() => setSelected(null)} />}
    </DashboardLayout>
  );
};

export default StudentDashboard;
