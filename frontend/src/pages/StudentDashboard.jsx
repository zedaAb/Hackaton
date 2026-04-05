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
    <div className="animate-fade-in">
      <h2 className="text-3xl font-black text-slate-900 mb-2 leading-none uppercase tracking-tighter">Welcome Back, <span className="gradient-text">{user?.name}</span> 👋</h2>
      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-10">Student Performance Analytics</p>
      
      {(user?.student_id || user?.department) && (
        <div className="flex items-center gap-3 mb-10">
          {user.student_id && (
            <span className="bg-slate-900 text-white text-[10px] px-4 py-2 rounded-xl font-black tracking-widest shadow-lg shadow-slate-900/20">
              ID: {user.student_id}
            </span>
          )}
          {user.department && (
            <span className="bg-white border border-slate-100 text-indigo-600 text-[10px] px-4 py-2 rounded-xl font-black tracking-widest shadow-sm uppercase">
              {user.department}
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {[
          { label: 'Total Exams', value: stats?.total ?? '0', icon: '📝', color: 'from-indigo-500 to-indigo-600' },
          { label: 'Graded', value: gradedCount, icon: '✅', color: 'from-emerald-500 to-emerald-600' },
          { label: 'Pending', value: pendingCount, icon: '⏳', color: 'from-amber-500 to-orange-600' },
          { label: 'Avg Grade', value: stats?.average_grade ? `${stats.average_grade}%` : '0%', icon: '📈', color: 'from-blue-500 to-blue-600' },
        ].map((s) => (
          <div key={s.label} className="glass-card !bg-white p-6 rounded-[2rem] border-slate-100 hover:shadow-indigo-500/10 transition-all group overflow-hidden relative">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${s.color} opacity-[0.03] rounded-bl-[4rem]`}></div>
            <div className="flex items-center gap-4 mb-4">
               <span className="text-2xl group-hover:scale-110 transition-transform">{s.icon}</span>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
            </div>
            <p className={`text-4xl font-black text-slate-900 tracking-tight`}>{s.value}</p>
          </div>
        ))}
      </div>

      <h3 className="text-xl font-black text-slate-900 mb-6 leading-none uppercase tracking-tighter">Recent <span className="text-indigo-600">Evaluations</span></h3>
      {submissions.length === 0 ? (
        <div className="glass-card !bg-white rounded-[3rem] p-16 text-center border-slate-50 shadow-xl shadow-slate-100/50">
          <p className="text-6xl mb-6 grayscale opacity-40">📭</p>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No activity recorded yet</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
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
    <div className="animate-fade-in">
      <h2 className="text-3xl font-black text-slate-900 mb-2 leading-none uppercase tracking-tighter">Academic <span className="gradient-text">Assignments</span></h2>
      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-10">Submit your work for automated AI evaluation</p>

      {message && (
        <div className={`mb-10 px-6 py-4 rounded-3xl text-sm font-bold border flex justify-between items-center animate-fade-in ${message.includes('success') ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
          <span className="flex items-center gap-3">
             {message.includes('success') ? '✅' : '⚠️'}
             {message}
          </span>
          <button onClick={() => setMessage('')} className="opacity-40 hover:opacity-100">&times;</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-3 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
          <div className="w-5 h-5 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          Synchronizing Curriculum...
        </div>
      ) : assignments.length === 0 ? (
        <div className="glass-card !bg-white rounded-[3rem] p-16 text-center border-slate-50 shadow-xl shadow-slate-100/50">
          <p className="text-6xl mb-6 grayscale opacity-40">📋</p>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No active assignments found</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {assignments.map((a) => (
            <div key={a.id} className="glass-card !bg-white rounded-[2.5rem] p-8 border-slate-100 hover:shadow-2xl hover:shadow-slate-200/50 transition-all group">
              <div className="flex justify-between items-start gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap mb-3">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none uppercase tracking-tighter">{a.title}</h3>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${a.assignment_format === 'pdf' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}>
                      {a.assignment_format === 'pdf' ? 'PDF ATTACHMENT' : 'TEXT RESPONSE'}
                    </span>
                    {a.already_submitted && (
                      <span className="text-[9px] font-black bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-100 uppercase tracking-widest">✓ COMPLETED</span>
                    )}
                    {isOverdue(a.due_date) && !a.already_submitted && (
                      <span className="text-[9px] font-black bg-red-50 text-red-600 px-3 py-1 rounded-full border border-red-100 uppercase tracking-widest">OVERDUE</span>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-4">Instructor: {a.teacher_name}</p>
                  {a.description && <p className="text-sm text-slate-600 font-medium leading-relaxed mb-6 max-w-3xl">{a.description}</p>}
                  
                  <div className="flex flex-wrap gap-6 mt-2">
                    <div className="flex flex-col">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Point Potential</span>
                       <span className="text-sm font-black text-slate-900">{a.max_marks} Points</span>
                    </div>
                    {a.due_date && (
                      <div className="flex flex-col">
                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 font-sans">Deadline</span>
                         <span className={`text-sm font-black ${isOverdue(a.due_date) ? 'text-red-500' : 'text-slate-900'}`}>
                           {new Date(a.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                         </span>
                      </div>
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
                    className="bg-slate-900 text-white text-xs font-black uppercase tracking-widest px-8 py-4 rounded-2xl hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-slate-900/10 shrink-0"
                  >
                    SUBMIT WORK
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
    <div className="animate-fade-in">
      <h2 className="text-3xl font-black text-slate-900 mb-2 leading-none uppercase tracking-tighter">Academic <span className="gradient-text">Grades</span></h2>
      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-10">Historical overview of your evaluated submissions</p>

      {loading ? (
        <div className="flex items-center gap-3 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
          <div className="w-5 h-5 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          Fetching Performance Data...
        </div>
      ) : (
        <>
          {/* Graded */}
          {graded.length > 0 && (
            <div className="mb-12">
              <h3 className="text-xl font-black text-slate-900 mb-6 leading-none uppercase tracking-tighter">Graded <span className="text-emerald-600">Items</span> ({graded.length})</h3>
              <div className="grid gap-6 md:grid-cols-2">
                {graded.map((s) => (
                  <GradeCard key={s.id} submission={s} onViewAnalysis={onViewAnalysis} />
                ))}
              </div>
            </div>
          )}

          {/* Pending */}
          {pending.length > 0 && (
            <div>
              <h3 className="text-xl font-black text-slate-900 mb-6 leading-none uppercase tracking-tighter">Evaluation <span className="text-amber-500">Pending</span> ({pending.length})</h3>
              <div className="grid gap-4">
                {pending.map((s) => (
                  <div key={s.id} className="glass-card !bg-white rounded-[2rem] p-6 border-slate-100 flex justify-between items-center transition-all hover:scale-[1.01]">
                    <div>
                      <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{s.assignment_title}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        SUBMITTED: {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <span className="text-[9px] font-black bg-amber-50 text-amber-700 px-4 py-2 rounded-full border border-amber-100 uppercase tracking-widest animate-pulse">
                      ⏳ PENDING
                    </span>
                  </div>
                ))}
              </div>
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
    <div className="animate-fade-in">
      <h2 className="text-3xl font-black text-slate-900 mb-2 leading-none uppercase tracking-tighter">Knowledge <span className="gradient-text">Vault</span></h2>
      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-10">Curated academic materials for your current semester</p>

      {loading ? (
        <div className="flex items-center gap-3 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
          <div className="w-5 h-5 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          Accessing Repositories...
        </div>
      ) : materials.length === 0 ? (
        <div className="glass-card !bg-white rounded-[3rem] p-16 text-center border-slate-50 shadow-xl shadow-slate-100/50">
          <p className="text-6xl mb-6 grayscale opacity-40">📚</p>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No study materials available yet</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {materials.map((m) => (
            <div key={m.id} className="glass-card !bg-white rounded-[2.5rem] p-8 border-slate-100 hover:shadow-2xl hover:shadow-slate-200/50 transition-all group relative overflow-hidden">
               <div className="absolute -top-4 -right-4 w-16 h-16 bg-slate-50 rounded-full group-hover:bg-indigo-50 transition-colors"></div>
               <div className="relative z-10">
                  <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-xl mb-6 shadow-xl shadow-slate-900/10 group-hover:scale-110 group-hover:bg-indigo-600 transition-all">📄</div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight leading-snug mb-2 uppercase tracking-tighter">{m.title}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Instructor: {m.teacher_name}</p>
                  {m.description && <p className="text-xs text-slate-500 font-medium leading-relaxed mb-8 opacity-80">{m.description}</p>}
                  
                  <a
                    href={`${FILE_BASE}${m.file_url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-900 text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl transition-all w-full justify-center group-hover:shadow-lg group-hover:shadow-slate-900/10"
                  >
                    Download PDF
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
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
    <div className="animate-fade-in">
      <h2 className="text-3xl font-black text-slate-900 mb-2 leading-none uppercase tracking-tighter">Interactive <span className="gradient-text">Worksheets</span></h2>
      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-10">Real-time AI evaluation for modular course tasks</p>

      {loading ? (
        <div className="flex items-center gap-3 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
          <div className="w-5 h-5 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          Compiling Modules...
        </div>
      ) : worksheets.length === 0 ? (
        <div className="glass-card !bg-white rounded-[3rem] p-16 text-center border-slate-50 shadow-xl shadow-slate-100/50">
          <p className="text-6xl mb-6 grayscale opacity-40">📄</p>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No active worksheets available</p>
        </div>
      ) : (
        <div className="grid gap-10">
          {worksheets.map((ws) => (
            <div key={ws.id} className="glass-card !bg-white rounded-[3rem] p-10 border-slate-100 shadow-2xl shadow-slate-200/30 group">
              <div className="flex flex-col lg:flex-row gap-10">
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap mb-4">
                     <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase tracking-tighter">{ws.title}</h3>
                     {ws.already_submitted && (
                       <span className="text-[9px] font-black bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-100 uppercase tracking-widest">✓ COMPLETED</span>
                     )}
                  </div>
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-6">Module: {ws.course} | Instructor: {ws.teacher_name}</p>
                  
                  <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 mb-8 font-medium text-slate-600 text-sm leading-relaxed max-w-4xl">
                    {ws.description}
                  </div>

                  {ws.attached_materials && ws.attached_materials.length > 0 && (
                    <div className="mb-10">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Preparatory Materials
                      </h4>
                      <div className="grid sm:grid-cols-2 gap-4">
                        {ws.attached_materials.map(m => (
                          <a key={m.id} href={`${FILE_BASE}${m.file_url}`} target="_blank" rel="noreferrer" className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-100 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group">
                            <span className="text-2xl opacity-40 group-hover:opacity-100 transition-opacity">📄</span>
                            <p className="text-xs font-bold text-slate-700 truncate group-hover:text-indigo-600">{m.title}</p>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {!ws.already_submitted ? (
                    <form onSubmit={(e) => handleSubmit(e, ws.id)} className="space-y-6">
                      <textarea
                        placeholder="Construct your response here..."
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] p-8 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 focus:bg-white resize-none transition-all duration-300 min-h-[160px]"
                        value={answers[ws.id] || ''}
                        onChange={(e) => setAnswers({ ...answers, [ws.id]: e.target.value })}
                        required
                      />
                      <button
                        type="submit"
                        disabled={submittingId === ws.id || !answers[ws.id]?.trim()}
                        className="bg-slate-900 text-white text-xs font-black uppercase tracking-widest px-10 py-5 rounded-2xl hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-slate-900/10 disabled:opacity-50"
                      >
                        {submittingId === ws.id ? (
                           <span className="flex items-center gap-3">
                              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                              AI EVALUATING...
                           </span>
                        ) : 'SUBMIT FOR SEMANTIC GRADING'}
                      </button>
                    </form>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[2rem] flex items-center gap-4 text-emerald-800">
                       <span className="text-3xl">✅</span>
                       <div>
                          <p className="font-black text-sm uppercase tracking-widest mb-1">Module Finalized</p>
                          <p className="text-xs font-medium opacity-80">Your response has been verified and graded by the AI system.</p>
                       </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Instant Feedback Dropdown */}
              {feedback?.wsId === ws.id && (
                 <div className="mt-12 border-t border-slate-100 pt-10 animate-fade-in">
                    <div className="flex items-center gap-4 mb-8">
                       <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl shadow-lg shadow-indigo-600/20">🤖</div>
                       <div>
                          <h4 className="font-black text-lg text-slate-900 uppercase tracking-tighter leading-none mb-1">AI Cognitive Feedback</h4>
                          <div className="flex items-center gap-2">
                             <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${feedback.analysis.overall_grade >= 80 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                Mastery: {feedback.analysis.overall_grade}%
                             </span>
                          </div>
                       </div>
                    </div>
                    
                    <p className="text-sm text-slate-600 font-medium leading-relaxed mb-8 max-w-4xl italic">"{feedback.analysis.summary}"</p>
                    
                    <div className="grid md:grid-cols-2 gap-8">
                       <div className="bg-emerald-50/50 border border-emerald-100 p-6 rounded-[2rem]">
                          <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-4">Core Strengths</p>
                          <ul className="space-y-2">
                             {feedback.analysis.strengths?.map((s, i) => (
                               <li key={i} className="text-xs text-emerald-900/70 font-bold flex gap-3">
                                  <span className="text-emerald-400">●</span> {s}
                               </li>
                             ))}
                          </ul>
                       </div>
                       <div className="bg-amber-50/50 border border-amber-100 p-6 rounded-[2rem]">
                          <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-4">Expansion Areas</p>
                          <ul className="space-y-2">
                             {feedback.analysis.weaknesses?.map((w, i) => (
                               <li key={i} className="text-xs text-amber-900/70 font-bold flex gap-3">
                                  <span className="text-amber-400">●</span> {w}
                               </li>
                             ))}
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
    <div className="animate-fade-in">
      <h2 className="text-3xl font-black text-slate-900 mb-2 leading-none uppercase tracking-tighter">AI <span className="gradient-text">Tutor</span> Hub</h2>
      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-10">Personalized study sessions with real-time semantic analysis</p>

      {!activeSession ? (
        <>
          {/* Start New Session */}
          <div className="glass-card !bg-white p-10 rounded-[3rem] border-slate-100 shadow-2xl shadow-slate-200/40 mb-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl"></div>
            <h3 className="text-xl font-black text-slate-900 mb-6 leading-none uppercase tracking-tighter">Initiate <span className="text-indigo-600">Deep Learning</span></h3>
            <div className="flex flex-wrap gap-4">
              {materials.length === 0 ? (
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-loose">Establishing curriculum... No materials found.</p>
              ) : (
                materials.map(m => (
                  <button
                    key={m.id}
                    onClick={() => handleSendMessage(null, { materialId: m.id })}
                    disabled={chatting}
                    className="bg-white border-2 border-slate-100 text-slate-700 font-black text-[10px] uppercase tracking-widest px-6 py-4 rounded-2xl hover:border-indigo-500 hover:text-indigo-600 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 flex items-center gap-3 active:scale-95"
                  >
                    🚀 ANALYZE: {m.title}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* History */}
          <h3 className="text-xl font-black text-slate-900 mb-6 leading-none uppercase tracking-tighter">Learning <span className="text-slate-400">Archives</span></h3>
          {loading ? (
            <div className="flex items-center gap-3 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
               <div className="w-5 h-5 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
               Decrypting Archives...
            </div>
          ) : history.length === 0 ? (
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">No previous learning sessions found</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {history.map(h => (
                <div key={h.id} className="glass-card !bg-white rounded-[2.5rem] p-6 border-slate-100 hover:shadow-2xl hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all cursor-pointer group" onClick={() => setActiveSession(h)}>
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                       <span className="text-lg">📚</span> {h.material_title}
                    </p>
                    {h.grade !== null ? (
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black border uppercase tracking-widest ${h.grade >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                        Score: {h.grade}
                      </span>
                    ) : (
                      <span className="bg-slate-900 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-slate-900/20">RESUME</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{(h.chat_history || []).length / 2} Modules Covered</p>
                    <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Active Chat Session */
        <div className="glass-card !bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 border-slate-100 flex flex-col h-[700px] overflow-hidden animation-fade-in relative">
          {/* Header */}
          <div className="bg-slate-900 px-8 py-6 flex justify-between items-center text-white shrink-0 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-500 via-transparent to-transparent"></div>
            <div className="flex items-center gap-6 relative z-10">
               <button onClick={() => setActiveSession(null)} className="text-slate-400 hover:text-white transition-all bg-white/5 hover:bg-white/10 p-3 rounded-2xl group">
                 <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
               </button>
               <div>
                  <h3 className="font-black text-lg uppercase tracking-tighter leading-none">AI <span className="text-indigo-400">Tutor</span></h3>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1 opacity-80 italic">{activeSession.material_title}</p>
               </div>
            </div>
            {activeSession.grade === null && (
              <button 
                onClick={handleEvaluate} 
                disabled={evaluating}
                className="bg-indigo-600 hover:bg-indigo-500 text-[10px] font-black px-6 py-4 rounded-2xl text-white shadow-xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 uppercase tracking-widest relative z-10 leading-none"
               >
                {evaluating ? 'EVALUATING...' : 'FINISH & SCORE'}
              </button>
            )}
          </div>
          
          {/* Body */}
          <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/30 custom-scrollbar">
             {(activeSession.chat_history || []).map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-[2rem] px-6 py-4 text-sm font-medium shadow-sm leading-relaxed ${msg.role === 'user' ? 'bg-slate-900 text-white rounded-br-none shadow-xl shadow-slate-900/10' : 'bg-white border border-slate-100 text-slate-800 rounded-bl-none'}`}>
                    {msg.role !== 'user' && <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-2 border-b border-indigo-50 pb-1">Mastery Insights</p>}
                    {msg.text}
                  </div>
                </div>
             ))}
             {chatting && (
                <div className="flex justify-start">
                   <div className="bg-white border border-slate-100 text-slate-300 text-xs px-6 py-4 rounded-[1.5rem] rounded-bl-none shadow-sm flex gap-1 items-center">
                     <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"></span>
                     <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce delay-100"></span>
                     <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce delay-200"></span>
                   </div>
                </div>
             )}
          </div>

          {/* Footer Form OR Grade Visual */}
          <div className="bg-white border-t border-slate-100 p-8 shrink-0">
          {activeSession.grade !== null ? (
            <div className="animate-fade-in-up">
               <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-3xl bg-indigo-600 flex items-center justify-center text-white text-2xl shadow-xl shadow-indigo-600/30">🏆</div>
                  <div>
                    <h4 className="font-black text-xl text-slate-900 uppercase tracking-tighter leading-none mb-1">Session Summary</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accuracy: <span className={activeSession.grade >= 80 ? 'text-emerald-500' : 'text-amber-500'}>{activeSession.grade}% Mastery</span></p>
                  </div>
               </div>
               <p className="text-sm text-slate-600 font-medium mb-8 leading-relaxed italic">"{activeSession.ai_feedback}"</p>
               {activeSession.ai_analysis && (
                 <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-[2rem] p-6">
                       <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                         <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Conceptual Strengths
                       </p>
                       <ul className="space-y-2 text-xs font-bold text-emerald-900/70">{(activeSession.ai_analysis.strengths || []).map((s,i)=><li key={i} className="flex gap-2"><span>-</span> {s}</li>)}</ul>
                    </div>
                    <div className="bg-amber-50/50 border border-amber-100 rounded-[2rem] p-6">
                       <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                         <span className="w-2 h-2 rounded-full bg-amber-500"></span> Targeted Improvements
                       </p>
                       <ul className="space-y-2 text-xs font-bold text-amber-900/70">{(activeSession.ai_analysis.weaknesses || []).map((w,i)=><li key={i} className="flex gap-2"><span>-</span> {w}</li>)}</ul>
                    </div>
                 </div>
               )}
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="flex gap-4 items-end">
               <div className="flex-1 relative">
                  <textarea 
                    rows={2}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] px-8 py-5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 focus:bg-white resize-none transition-all duration-300"
                    placeholder="Ask about concepts or request a mini-quiz..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                       if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); }
                    }}
                  />
                  <div className="absolute bottom-4 right-6 text-[9px] font-black text-slate-300 uppercase tracking-widest pointer-events-none">Press Enter to send</div>
               </div>
               <button type="submit" disabled={!message.trim() || chatting} className="bg-slate-900 hover:bg-slate-800 text-white font-black p-5 rounded-[1.5rem] disabled:opacity-50 transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-slate-900/20">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
               </button>
            </form>
          )}
          </div>
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
