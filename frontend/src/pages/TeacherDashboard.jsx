import React, { useEffect, useState } from 'react';
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
    <div className="animate-fade-in">
      <h2 className="text-3xl font-black text-slate-900 mb-2 leading-none uppercase tracking-tighter">Welcome, <span className="gradient-text">{user?.name}</span> 👋</h2>
      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-10">Teacher Dashboard Analytics</p>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {[
          { label: 'Total Submissions', value: submissions.length, icon: '📊', color: 'from-indigo-500 to-indigo-600' },
          { label: 'Graded', value: graded, icon: '✅', color: 'from-emerald-500 to-emerald-600' },
          { label: 'Pending', value: pending, icon: '⏳', color: 'from-amber-500 to-orange-600' },
          { label: 'Assignments', value: assignments.length, icon: '📋', color: 'from-blue-500 to-blue-600' },
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
      
      {noKey > 0 && (
        <div className="bg-amber-50/50 border border-amber-200/50 backdrop-blur-md rounded-2xl p-5 text-sm text-amber-800 mb-8 flex items-center gap-4 animate-fade-in-up">
          <div className="text-2xl bg-white rounded-xl w-10 h-10 flex items-center justify-center shadow-sm">⚠️</div>
          <p className="font-medium">
            <span className="font-black">{noKey}</span> assignment{noKey > 1 ? 's' : ''} missing an answer key. Set them in <span className="underline italic">Assignments</span> before grading.
          </p>
        </div>
      )}
    </div>
  );
};

/* ── Submissions ── */
const SubmissionsSection = ({ submissions, assignments, fetchAll }) => {
  const [grading, setGrading] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [analysisModal, setAnalysisModal] = useState(null);
  const [answerKeyModal, setAnswerKeyModal] = useState(null);
  const [answerKeyText, setAnswerKeyText] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [message, setMessage] = useState('');

  const assignmentMap = Object.fromEntries(assignments.map((a) => [a.id, a]));
  
  // Data processing for Student "Excel" View
  const uniqueAssignments = Array.from(new Set(submissions.map(s => s.assignment_title))).filter(Boolean).sort();
  const studentMap = {};
  submissions.forEach(s => {
    if (!studentMap[s.student_id]) {
      studentMap[s.student_id] = { 
        name: s.student_name, 
        code: s.student_code || 'N/A', 
        dept: s.student_department || 'N/A', 
        grades: {} 
      };
    }
    studentMap[s.student_id].grades[s.assignment_title] = s.grade !== null ? Number(s.grade) : s.status;
  });
  const sortedStudents = Object.values(studentMap).sort((a,b) => a.name.localeCompare(b.name));

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

  const handleExportCSV = () => {
    let csv = `Student Name,Student ID,Department,${uniqueAssignments.join(',')},Average Grade\n`;
    sortedStudents.forEach(stu => {
      let total = 0, count = 0;
      const gradesStr = uniqueAssignments.map(title => {
        const g = stu.grades[title];
        if (typeof g === 'number') { total += g; count++; return `${Math.round(g)}%`;}
        return g || 'N/A';
      }).join(',');
      const avg = count > 0 ? `${(total/count).toFixed(1)}%` : 'N/A';
      csv += `${stu.name},${stu.code},${stu.dept},${gradesStr},${avg}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Gradebook_Export.csv`;
    a.click();
  };

  return (
    <div className="print:m-0 print:p-0 animate-fade-in">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-10 print:hidden gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 mb-2 leading-none uppercase tracking-tighter">Submissions & <span className="gradient-text">Grades</span></h2>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Evaluate student work and manage platform performance</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => setViewMode('list')}
            className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 border ${viewMode === 'list' ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
          >
            Chronological List
          </button>
          <button 
            onClick={() => setViewMode('student')}
            className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 border ${viewMode === 'student' ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
          >
             Gradebook Grid
          </button>
          
          {viewMode === 'student' && (
            <div className="flex gap-3">
              <button onClick={() => window.print()} className="px-5 py-3 rounded-2xl text-xs font-black uppercase border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 flex items-center gap-2">
                🖨️ Print
              </button>
              <button onClick={handleExportCSV} className="px-5 py-3 rounded-2xl text-xs font-black uppercase border bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95">
                📊 Export
              </button>
            </div>
          )}
        </div>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-2 rounded text-sm flex justify-between ${message.includes('failed') || message.includes('Please') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="ml-4 opacity-60 hover:opacity-100">&times;</button>
        </div>
      )}

      {viewMode === 'list' ? (
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
            {Object.values(
              submissions.reduce((acc, s) => {
                if (!acc[s.student_id]) acc[s.student_id] = [];
                acc[s.student_id].push(s);
                return acc;
              }, {})
            ).sort((a, b) => a[0].student_name.localeCompare(b[0].student_name))
             .map((group) => (
              <React.Fragment key={`group-${group[0].student_id}`}>
                {group.map((s, index) => {
                  const asg = assignmentMap[s.assignment_id];
                  const hasKey = !!asg?.answer_key;
                  return (
                    <tr key={s.id} className="border-t hover:bg-gray-50">
                      {index === 0 && (
                        <td className="px-4 py-3 font-semibold align-top border-r bg-white" rowSpan={group.length}>
                          {s.student_name}
                        </td>
                      )}
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
              </React.Fragment>
            ))}
            {submissions.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No submissions yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-600 border-b">
              <tr>
                <th className="px-4 py-3 text-left">Student Name</th>
                <th className="px-4 py-3 text-left">Student ID</th>
                <th className="px-4 py-3 text-left">Department</th>
                {uniqueAssignments.map(title => (
                  <th key={title} className="px-4 py-3 text-left">{title}</th>
                ))}
                <th className="px-4 py-3 text-left font-bold text-indigo-700">Average</th>
              </tr>
            </thead>
            <tbody>
              {sortedStudents.map((stu, i) => {
                 let total = 0, count = 0;
                 return (
                   <tr key={stu.code + '-' + i} className="border-t hover:bg-gray-50">
                     <td className="px-4 py-3 font-medium">{stu.name}</td>
                     <td className="px-4 py-3 text-gray-500">{stu.code}</td>
                     <td className="px-4 py-3">{stu.dept}</td>
                     {uniqueAssignments.map(title => {
                       const g = stu.grades[title];
                       if (typeof g === 'number') { total += g; count++; }
                       return (
                         <td key={title} className="px-4 py-3">
                           {g !== undefined ? (typeof g === 'number' ? <span className="font-semibold">{Math.round(g)}%</span> : <span className="text-yellow-600 text-xs px-2 py-1 bg-yellow-50 rounded-full">{g}</span>) : <span className="text-gray-300">—</span>}
                         </td>
                       );
                     })}
                     <td className="px-4 py-3 font-bold text-indigo-700">
                       {count > 0 ? `${(total/count).toFixed(1)}%` : <span className="text-gray-300">—</span>}
                     </td>
                   </tr>
                 )
              })}
              {sortedStudents.length === 0 && (
                <tr><td colSpan={uniqueAssignments.length + 4} className="px-4 py-8 text-center text-gray-400">No student data available</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

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

// Exam Types
const EXAM_TYPES = ['Midterm Exam', 'Final Exam'];

const UploadSection = ({ assignments, fetchAll }) => {
  const [form, setForm] = useState({ department: '', exam_type: '' });
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
    if (!form.exam_type)  return setMessage('Please select whether this is a Midterm or Final Exam');
    if (!questionFile)    return setMessage('Please upload the exam question image');
    if (!teacherFile)     return setMessage('Please upload the teacher answer image');
    if (studentFiles.length === 0) return setMessage('Please upload at least one student answer image');

    setUploading(true);
    setMessage('');
    setResults(null);

    const fd = new FormData();
    fd.append('department', form.department);
    fd.append('exam_type', form.exam_type);
    fd.append('question_image', questionFile);
    fd.append('teacher_answer_image', teacherFile);
    studentFiles.forEach((f) => fd.append('student_answer_images', f));

    try {
      const { data } = await api.post('/teacher/upload-exam', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage(data.message);
      setResults(data.results);
      setForm({ department: '', exam_type: '' });
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
    <div className="group relative border-2 border-dashed border-slate-200 rounded-[2rem] p-6 hover:border-indigo-400 hover:bg-slate-50/50 transition-all cursor-pointer">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xl group-hover:scale-110 transition-transform duration-300">{icon}</span>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{label}</p>
      </div>
      {hint && <p className="text-[10px] text-slate-400 mb-4 font-medium opacity-80">{hint}</p>}
      <input type="file" accept="image/*,.pdf" multiple={multiple}
        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        onChange={onChange}
      />
      
      {!multiple && file && (
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl text-[10px] font-black animate-fade-in w-fit">
          <span className="text-sm">✓</span> {file.name}
        </div>
      )}
      {multiple && studentFiles.length > 0 && (
        <div className="space-y-2 animate-fade-in">
          <p className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl w-fit">
            {studentFiles.length} papers selected
          </p>
          <div className="flex flex-wrap gap-2">
             {studentFiles.slice(0, 3).map((f, i) => (
                <span key={i} className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg border border-slate-200">{f.name}</span>
             ))}
             {studentFiles.length > 3 && <span className="text-[9px] text-slate-400 font-bold">+{studentFiles.length - 3} more</span>}
          </div>
        </div>
      )}
      {(!file && (!multiple || studentFiles.length === 0)) && (
          <p className="text-[10px] font-bold text-slate-300 group-hover:text-indigo-300 transition-colors">Click or drag to upload</p>
      )}
    </div>
  );

  return (
    <div className="animate-fade-in">
      <h2 className="text-3xl font-black text-slate-900 mb-2 leading-none uppercase tracking-tighter">Bulk <span className="gradient-text">Exam</span> Upload</h2>
      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-10">AI will automatically identify students and match papers</p>

      <div className="glass-card !bg-white p-8 md:p-12 rounded-[3.5rem] border-slate-100 shadow-2xl shadow-slate-200/50 max-w-4xl">
        {message && (
          <div className={`mb-8 px-6 py-4 rounded-3xl text-sm font-bold flex justify-between items-center animate-fade-in ${
            message.includes('failed') || message.includes('error') ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'
          }`}>
            <span className="flex items-center gap-3">
              {message.includes('failed') ? '⚠️' : '✅'}
              {message}
            </span>
            <button onClick={() => setMessage('')} className="opacity-40 hover:opacity-100">&times;</button>
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Department dropdown */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">
                Department <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 transition-all appearance-none cursor-pointer"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                required
              >
                <option value="">— Select —</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Exam Type */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">
                Exam Type <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 transition-all appearance-none cursor-pointer"
                value={form.exam_type}
                onChange={(e) => setForm({ ...form, exam_type: e.target.value })}
                required
              >
                <option value="">— Select —</option>
                {EXAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FileBox label="Exam Question" icon="📄" hint="One clear photo"
              file={questionFile} onChange={(e) => setQuestionFile(e.target.files[0])} />
            <FileBox label="Teacher Key" icon="📘" hint="Model answer paper"
              file={teacherFile} onChange={(e) => setTeacherFile(e.target.files[0])} />
          </div>

          <div className="md:col-span-2">
            <FileBox label="Student Papers" icon="📝"
              hint="Bulk select all student papers. AI identifies ID & Name."
              multiple onChange={handleStudentFiles} />
          </div>

          <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-2xl p-5 text-sm text-indigo-800 space-y-2">
            <p className="flex items-center gap-2 font-bold text-[11px] uppercase tracking-widest text-indigo-400">
              <span className="text-lg">💡</span> Best Practice
            </p>
            <p className="font-medium opacity-80 leading-relaxed">Ensure Student IDs and Names are written in <span className="underline">clear, dark ink</span> at the top of every page for maximum AI accuracy.</p>
          </div>

          <button type="submit" disabled={uploading}
            className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black text-lg shadow-2xl shadow-indigo-500/30 hover:bg-indigo-500 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition-all duration-300 flex items-center justify-center gap-3 uppercase tracking-widest leading-none">
            {uploading ? (
              <><span className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
              Processing {studentFiles.length} papers...</>
            ) : (
              `Process ${studentFiles.length > 0 ? studentFiles.length + ' Submissions' : 'Complete Exam'}`
            )}
          </button>
        </form>

        {/* Upload results */}
        {results && (
          <div className="mt-12 border-t border-slate-100 pt-10">
            <h4 className="font-black text-slate-900 mb-6 text-sm uppercase tracking-tighter">Evaluation Results</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((r, i) => (
                <div key={i} className={`flex items-start gap-4 p-5 rounded-3xl text-xs transition-all hover:scale-[1.02] ${
                  r.status === 'created'   ? 'bg-emerald-50 text-emerald-800 border-2 border-emerald-100' :
                  r.status === 'unmatched' ? 'bg-orange-50 text-orange-800 border-2 border-orange-100' :
                  'bg-slate-50 text-slate-600 border-2 border-slate-100 opacity-60'
                }`}>
                  <span className="text-xl shrink-0">
                    {r.status === 'created' ? '✅' : r.status === 'unmatched' ? '⚠️' : '⏭️'}
                  </span>
                  <div>
                    <p className="font-black mb-1 truncate w-full">{r.file}</p>
                    {r.status === 'created' && (
                      <p className="font-bold opacity-80">Matched: <span className="text-emerald-600">{r.student_name}</span>
                        {r.extracted_id && ` [ID: ${r.extracted_id}]`}
                      </p>
                    )}
                    {r.status === 'unmatched' && (
                      <p className="font-bold opacity-80 italic">
                        {r.message} <span className="opacity-40">(ID={r.extracted_id || '?'})</span>
                      </p>
                    )}
                    {r.status === 'skipped' && <p className="font-medium">{r.message}</p>}
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
  const [mode, setMode] = useState('text');
  const [form, setForm] = useState({ title: '', description: '', due_date: '', max_marks: 100, department: '' });
  const [pdfFile, setPdfFile] = useState(null);
  const [creating, setCreating] = useState(false);
  const [answerKeyModal, setAnswerKeyModal] = useState(null);
  const [answerKeyText, setAnswerKeyText] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [message, setMessage] = useState('');
  const [expandedAsgId, setExpandedAsgId] = useState(null);
  const [asgSubmissions, setAsgSubmissions] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [gradingId, setGradingId] = useState(null);
  const [gradeMessage, setGradeMessage] = useState('');
  const [answerViewModal, setAnswerViewModal] = useState(null);
  const [analysisModal, setAnalysisModal] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.department) return setMessage('Please select a department');
    setCreating(true);
    try {
      if (mode === 'pdf') {
        if (!pdfFile) { setMessage('Please choose a PDF file for the assignment'); setCreating(false); return; }
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
      setMessage('Assignment successfully deployed');
      setForm({ title: '', description: '', due_date: '', max_marks: 100, department: '' });
      setPdfFile(null);
      fetchAll();
    } catch {
      setMessage('Deployment failed. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const openAnswerKey = (a) => { setAnswerKeyModal(a); setAnswerKeyText(a.answer_key || ''); };

  const handleSaveAnswerKey = async () => {
    setSavingKey(true);
    try {
      await api.put(`/teacher/assignments/${answerKeyModal.id}/answer-key`, { answer_key: answerKeyText });
      setMessage('Rubric saved successfully');
      setAnswerKeyModal(null);
      fetchAll();
      if (expandedAsgId === answerKeyModal.id) loadSubmissions(answerKeyModal.id);
    } catch { setMessage('Failed to save rubric'); } finally { setSavingKey(false); }
  };

  const loadSubmissions = async (asgId) => {
    setLoadingSubs(true);
    try {
      const { data } = await api.get(`/teacher/assignments/${asgId}/submissions`);
      setAsgSubmissions(data);
    } catch { setGradeMessage('Failed to load submissions'); }
    finally { setLoadingSubs(false); }
  };

  const toggleExpand = (asgId) => {
    if (expandedAsgId === asgId) { setExpandedAsgId(null); setAsgSubmissions([]); }
    else { setExpandedAsgId(asgId); loadSubmissions(asgId); setGradeMessage(''); }
  };

  const handleGrade = async (sub, asg) => {
    if (!asg.answer_key) { setGradeMessage('Set an answer key first before grading.'); return; }
    setGradingId(sub.id);
    setGradeMessage('');
    try {
      const { data } = await api.post(`/teacher/grade/${sub.id}`);
      setGradeMessage(`✓ ${sub.student_name} graded — ${data.analysis?.overall_grade ?? '?'}%`);
      if (data.analysis) setAnalysisModal({ ai_analysis: data.analysis, assignment_title: asg.title });
      loadSubmissions(expandedAsgId);
      fetchAll();
    } catch (err) {
      setGradeMessage('Grading failed: ' + (err.response?.data?.message || err.message));
    } finally { setGradingId(null); }
  };

  const handleViewAnalysis = async (sub) => {
    try {
      const { data } = await api.get(`/teacher/analysis/${sub.id}`);
      setAnalysisModal(data);
    } catch { setGradeMessage('Could not load analysis'); }
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-3xl font-black text-slate-900 mb-2 leading-none uppercase tracking-tighter">Academic <span className="gradient-text">Assignments</span></h2>
      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-10">Create and manage rubrics for automated evaluation</p>

      {message && (
        <div className={`mb-10 px-6 py-4 rounded-3xl text-sm font-bold border flex justify-between items-center ${message.includes('Failed') ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
          <span className="flex items-center gap-3">
             {message.includes('Failed') ? '⚠️' : '✅'}
             {message}
          </span>
          <button onClick={() => setMessage('')} className="opacity-40 hover:opacity-100">&times;</button>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-10">
        {/* Create form */}
        <div className="glass-card !bg-white p-8 md:p-10 rounded-[3rem] border-slate-100 shadow-2xl shadow-slate-200/40">
          <h3 className="text-xl font-black text-slate-900 mb-8 leading-none uppercase tracking-tighter">Configure <span className="text-indigo-600">New Item</span></h3>
          <div className="flex gap-4 mb-8">
            <button
              type="button"
              onClick={() => setMode('text')}
              className={`flex-1 text-[10px] font-black uppercase tracking-widest py-4 rounded-2xl border-2 transition-all ${mode === 'text' ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}
            >
               Standard Text
            </button>
            <button
              type="button"
              onClick={() => setMode('pdf')}
              className={`flex-1 text-[10px] font-black uppercase tracking-widest py-4 rounded-2xl border-2 transition-all ${mode === 'pdf' ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}
            >
               PDF Document
            </button>
          </div>
          <form onSubmit={handleCreate} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Department</label>
              <select
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 transition-all appearance-none cursor-pointer"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                required
              >
                <option value="">— Select Department —</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            
            <div>
               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Assignment Title</label>
               <input type="text" placeholder="Title" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>

            {mode === 'text' ? (
              <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Instructions / Rubric</label>
                  <textarea
                    placeholder="Full assignment text or grading instructions..."
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-medium text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all min-h-[160px]"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    required
                  />
              </div>
            ) : (
              <>
                <textarea
                  placeholder="Optional short note for students..."
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-medium text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Attachment (PDF)</label>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-2xl file:border-0 file:bg-indigo-50 file:text-indigo-700 file:text-xs file:font-black file:uppercase"
                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  />
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Due Date</label>
                <input type="datetime-local" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-sans" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Max Marks</label>
                <input type="number" min="1" max="1000" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" value={form.max_marks} onChange={(e) => setForm({ ...form, max_marks: e.target.value })} />
              </div>
            </div>
            <button type="submit" disabled={creating} className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black text-lg shadow-2xl shadow-indigo-500/30 hover:bg-indigo-500 active:scale-[0.98] transition-all duration-300 uppercase tracking-widest leading-none">
              {creating ? 'DEPLOYING…' : 'CREATE ASSIGNMENT'}
            </button>
          </form>
        </div>

        {/* List */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-semibold text-gray-700 mb-4">My Assignments</h3>
          <ul className="space-y-3 max-h-[600px] overflow-y-auto">
            {assignments.map((a) => (
              <li key={a.id} className="border rounded-xl text-sm overflow-hidden">
                {/* Assignment header */}
                <div className="px-4 py-3">
                  <div className="flex justify-between items-start">
                    <p className="font-medium text-gray-800">{a.title}</p>
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full ml-2 shrink-0">{a.submission_count} submissions</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${a.assignment_format === 'pdf' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                      {a.assignment_format === 'pdf' ? 'PDF' : 'Text'}
                    </span>
                    {a.department && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{a.department}</span>}
                    {a.assignment_format === 'pdf' && a.assignment_pdf_url && (
                      <a href={`${FILE_BASE}${a.assignment_pdf_url}`} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-600 underline">View PDF</a>
                    )}
                  </div>
                  {a.description && <p className="text-gray-400 text-xs mt-0.5 line-clamp-1">{a.description}</p>}
                  <div className="flex gap-3 mt-1 text-xs text-gray-400">
                    <span>Max: {a.max_marks}</span>
                    {a.due_date && <span>Due: {new Date(a.due_date).toLocaleDateString()}</span>}
                  </div>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {a.answer_key
                      ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">&#10003; Answer key set</span>
                      : <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">&#9888; No answer key</span>
                    }
                    <button onClick={() => openAnswerKey(a)} className="text-xs text-indigo-600 underline hover:text-indigo-800">
                      {a.answer_key ? 'Edit' : 'Set answer key'}
                    </button>
                    {Number(a.submission_count) > 0 && (
                      <button
                        onClick={() => toggleExpand(a.id)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                          expandedAsgId === a.id
                            ? 'bg-indigo-600 text-white'
                            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                        }`}
                      >
                        {expandedAsgId === a.id ? '&#9650; Hide' : `&#128203; Grade Submissions (${a.submission_count})`}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded submissions panel */}
                {expandedAsgId === a.id && (
                  <div className="border-t bg-gray-50 px-4 py-3">
                    {gradeMessage && (
                      <div className={`mb-3 px-3 py-2 rounded text-xs flex justify-between ${
                        gradeMessage.includes('failed') || gradeMessage.includes('Set') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                      }`}>
                        <span>{gradeMessage}</span>
                        <button onClick={() => setGradeMessage('')}>&times;</button>
                      </div>
                    )}
                    {loadingSubs ? (
                      <p className="text-xs text-gray-400 text-center py-4">Loading submissions...</p>
                    ) : asgSubmissions.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4">No submissions yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {asgSubmissions.map((sub) => (
                          <div key={sub.id} className="bg-white border border-gray-100 rounded-lg px-3 py-2.5 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-gray-800 text-xs">{sub.student_name}</span>
                                {sub.student_code && <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">{sub.student_code}</span>}
                                {sub.student_department && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">{sub.student_department}</span>}
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                  sub.status === 'graded' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                }`}>{sub.status}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                {sub.status === 'graded' && sub.grade != null && (
                                  <span className={`text-sm font-bold ${
                                    sub.grade >= 80 ? 'text-green-600' : sub.grade >= 60 ? 'text-yellow-600' : 'text-red-500'
                                  }`}>{sub.grade}%</span>
                                )}
                                {sub.answer_text && (
                                  <button
                                    onClick={() => setAnswerViewModal({ text: sub.answer_text, title: `${sub.student_name}'s Answer` })}
                                    className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 hover:bg-blue-100"
                                  >
                                    &#128196; View Answer
                                  </button>
                                )}
                                {sub.answer_pdf_url && (
                                  <a
                                    href={`${FILE_BASE}${sub.answer_pdf_url}`}
                                    target="_blank" rel="noreferrer"
                                    className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-100 hover:bg-amber-100"
                                  >
                                    &#128196; View PDF
                                  </a>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {sub.status !== 'graded' ? (
                                <button
                                  onClick={() => handleGrade(sub, a)}
                                  disabled={gradingId === sub.id}
                                  className="bg-indigo-600 text-white text-[10px] px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
                                >
                                  {gradingId === sub.id ? (
                                    <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Grading...</>
                                  ) : '&#129302; Grade with AI'}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleViewAnalysis(sub)}
                                  className="bg-green-600 text-white text-[10px] px-3 py-1.5 rounded-lg hover:bg-green-700"
                                >
                                  View Analysis
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
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
                <p className="text-sm text-gray-400">{answerKeyModal.title} &middot; Max {answerKeyModal.max_marks} marks</p>
              </div>
              <button onClick={() => setAnswerKeyModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                &#128161; List each question with expected answer, key points, and marks. AI will grade against this.
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

      {answerViewModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setAnswerViewModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex justify-between items-center">
              <h3 className="font-bold text-gray-800">{answerViewModal.title}</h3>
              <button onClick={() => setAnswerViewModal(null)} className="text-gray-400 text-2xl hover:text-gray-600">&times;</button>
            </div>
            <div className="p-5">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-xl p-4 max-h-[60vh] overflow-y-auto border border-gray-100">{answerViewModal.text}</pre>
            </div>
          </div>
        </div>
      )}

      {analysisModal && <AnalysisModal submission={analysisModal} onClose={() => setAnalysisModal(null)} />}
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
  const [answerModal, setAnswerModal] = useState(null); // { text, title }
  const [answerKeyModal, setAnswerKeyModal] = useState(null);
  const [answerKeyText, setAnswerKeyText] = useState('');
  const [savingKey, setSavingKey] = useState(false);

  const assignmentMap = Object.fromEntries(assignments.map((a) => [a.id, a]));
  const pending = submissions.filter((s) => s.status === 'submitted');
  const graded = submissions.filter((s) => s.status === 'graded');

  const openSetKey = (asg) => { setAnswerKeyModal(asg); setAnswerKeyText(asg?.answer_key || ''); };
  const handleSaveKey = async () => {
    setSavingKey(true);
    try {
      await api.put(`/teacher/assignments/${answerKeyModal.id}/answer-key`, { answer_key: answerKeyText });
      setMessage('Answer key saved! You can now grade this assignment.');
      setAnswerKeyModal(null);
      fetchAll();
    } catch { setMessage('Failed to save answer key'); } finally { setSavingKey(false); }
  };

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

  const [modalImage, setModalImage] = useState(null);

  const ImagePreview = ({ url, label }) => {
    if (!url) return null;
    const fullUrl = `http://localhost:5000/${url.replace(/^\/+/, '')}`;
    return (
      <button
        onClick={() => setModalImage(fullUrl)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-100 shadow-sm"
      >
        <span>📷</span> {label}
      </button>
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
            {pending.map((s) => {
              const asg = assignmentMap[s.assignment_id];
              const hasAnswerKey = !!asg?.answer_key;
              const canGrade = s.submission_type === 'image' || hasAnswerKey;
              return (
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

                  {/* Previews */}
                  {s.submission_type === 'image' && s.question_image_url ? (
                    <div className="flex gap-3 flex-wrap">
                      <ImagePreview url={s.question_image_url} label="Question" />
                      <ImagePreview url={s.teacher_answer_image_url} label="Teacher Ans" />
                      <ImagePreview url={s.image_url} label="Student Ans" />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 mt-2">
                      {hasAnswerKey ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full border border-green-200">
                          &#10003; Answer key set
                        </span>
                      ) : (
                        <button
                          onClick={() => openSetKey(asg)}
                          className="inline-flex items-center gap-1 text-xs text-orange-700 bg-orange-50 px-2 py-1 rounded-lg border border-orange-200 hover:bg-orange-100"
                        >
                          &#9888; Set Answer Key first
                        </button>
                      )}
                      {s.submission_type === 'pdf' && s.answer_pdf_url ? (
                        <a
                          href={`http://localhost:5000/${s.answer_pdf_url}`}
                          target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-lg hover:bg-amber-100 border border-amber-100"
                        >
                          📄 View Student PDF
                        </a>
                      ) : s.answer_text ? (
                        <button
                          onClick={() => setAnswerModal({ text: s.answer_text, title: `${s.student_name}'s Answer` })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-100 border border-blue-100"
                        >
                          📝 View Student Answer
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No student answer yet</span>
                      )}
                    </div>
                  )}

                  {/* Grade button */}
                  <div className="flex items-center">
                    {canGrade && (
                      <button
                        onClick={() => handleGrade(s)}
                        disabled={grading === s.id}
                        className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        {grading === s.id ? (
                          <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Grading...</>
                        ) : (
                          <> 🤖 Grade with AI </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Student Answer text modal */}
      {answerModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setAnswerModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex justify-between items-center">
              <h3 className="font-bold text-gray-800">{answerModal.title}</h3>
              <button onClick={() => setAnswerModal(null)} className="text-gray-400 text-2xl hover:text-gray-600">&times;</button>
            </div>
            <div className="p-5">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-xl p-4 max-h-[60vh] overflow-y-auto border border-gray-100">{answerModal.text}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Set Answer Key modal */}
      {answerKeyModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setAnswerKeyModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-800">Set Answer Key</h3>
                <p className="text-sm text-gray-400">{answerKeyModal?.title}</p>
              </div>
              <button onClick={() => setAnswerKeyModal(null)} className="text-gray-400 text-2xl hover:text-gray-600">&times;</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                💡 List each question with the expected answer and marks. AI will grade the student's response against this.
              </div>
              <textarea
                rows={8}
                placeholder={`Q1 (10 marks): What is photosynthesis?\nExpected: Process plants use to convert sunlight, water and CO2 into glucose.\nKey points: light energy, chlorophyll, glucose, oxygen.\n\nQ2 (5 marks): ...`}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                value={answerKeyText}
                onChange={e => setAnswerKeyText(e.target.value)}
              />
              <div className="flex gap-3">
                <button onClick={() => setAnswerKeyModal(null)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
                <button onClick={handleSaveKey} disabled={savingKey || !answerKeyText.trim()} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                  {savingKey ? 'Saving...' : 'Save & Grade'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {modalImage && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md flex items-center justify-center z-[1000] p-4 md:p-10" onClick={() => setModalImage(null)}>
          <div className="relative w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setModalImage(null)}
              className="absolute top-0 right-0 md:-top-5 md:-right-5 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center text-3xl transition-all hover:rotate-90 z-[70] shadow-2xl border border-white/10"
            >
              &times;
            </button>
            <div className="w-full h-full flex items-center justify-center overflow-hidden">
                <img 
                  src={modalImage} 
                  alt="Preview" 
                  className="max-w-full max-h-full object-contain rounded-2xl shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/5 animate-fade-in"
                />
            </div>
          </div>
        </div>
      )}
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
