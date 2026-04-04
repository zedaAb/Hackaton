const ScoreBar = ({ value, max }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const color = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-600 w-16 text-right">{value}/{max}</span>
    </div>
  );
};

const Badge = ({ text, color }) => (
  <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium ${color}`}>{text}</span>
);

const AnalysisModal = ({ submission, onClose }) => {
  if (!submission) return null;
  const a = submission.ai_analysis;
  if (!a) return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
        <p className="text-gray-500">No analysis available yet.</p>
        <button onClick={onClose} className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm">Close</button>
      </div>
    </div>
  );

  const gradeColor =
    a.overall_grade >= 80 ? 'text-green-600' :
    a.overall_grade >= 60 ? 'text-yellow-600' : 'text-red-500';

  const gradeBg =
    a.overall_grade >= 80 ? 'bg-green-50 border-green-200' :
    a.overall_grade >= 60 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8">

        {/* Header */}
        <div className={`rounded-t-2xl border-b p-6 ${gradeBg}`}>
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-800">{submission.assignment_title}</h2>
              <p className="text-sm text-gray-500 mt-0.5">AI Grading Report</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
          </div>
          <div className="flex items-end gap-4 mt-4">
            <div>
              <span className={`text-6xl font-extrabold ${gradeColor}`}>{a.overall_grade}</span>
              <span className="text-2xl text-gray-400 font-bold">/100</span>
            </div>
            <div className="mb-2">
              <span className={`text-3xl font-bold ${gradeColor}`}>{a.grade_letter}</span>
              <p className="text-sm text-gray-500">{a.performance_level}</p>
            </div>
          </div>
          {a.summary && <p className="mt-3 text-sm text-gray-600 bg-white/60 rounded-lg p-3">{a.summary}</p>}
        </div>

        <div className="p-6 space-y-6">

          {/* Per-question breakdown */}
          {a.questions?.length > 0 && (
            <section>
              <h3 className="font-bold text-gray-700 mb-3 text-base">Question Breakdown</h3>
              <div className="space-y-4">
                {a.questions.map((q, i) => (
                  <div key={i} className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-semibold text-gray-700 text-sm">Q{q.question_number}: {q.question_text}</p>
                          {q.question_type && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              q.question_type === 'explanation' ? 'bg-purple-100 text-purple-700' :
                              q.question_type === 'calculation' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>{q.question_type}</span>
                          )}
                        </div>
                      </div>
                      <span className={`text-sm font-bold ml-4 shrink-0 ${
                        q.score_percentage >= 80 ? 'text-green-600' :
                        q.score_percentage >= 60 ? 'text-yellow-600' : 'text-red-500'
                      }`}>
                        {q.marks_awarded}/{q.marks_total}
                      </span>
                    </div>
                    <ScoreBar value={q.marks_awarded} max={q.marks_total} />

                    {q.teacher_answer_summary && (
                      <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg p-3">
                        <p className="text-xs text-blue-600 font-medium mb-1">📘 Expected Answer:</p>
                        <p className="text-xs text-blue-800">{q.teacher_answer_summary}</p>
                      </div>
                    )}

                    {q.student_answer && (
                      <div className="mt-2 bg-white border rounded-lg p-3">
                        <p className="text-xs text-gray-400 mb-1 font-medium">Student Answer:</p>
                        <p className="text-sm text-gray-700">{q.student_answer}</p>
                      </div>
                    )}

                    {q.grading_rationale && (
                      <div className="mt-2 bg-yellow-50 border border-yellow-100 rounded-lg p-3">
                        <p className="text-xs text-yellow-700 font-medium mb-1">⚖ Grading Rationale:</p>
                        <p className="text-xs text-yellow-800">{q.grading_rationale}</p>
                      </div>
                    )}

                    <p className="text-sm text-gray-600 mt-2">{q.feedback}</p>

                    <div className="grid grid-cols-2 gap-3 mt-3">
                      {q.correct_points?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-green-700 mb-1">✓ Correct</p>
                          <ul className="space-y-0.5">
                            {q.correct_points.map((p, j) => (
                              <li key={j} className="text-xs text-green-700 bg-green-50 rounded px-2 py-1">{p}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {q.missed_points?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-red-600 mb-1">✗ Missed</p>
                          <ul className="space-y-0.5">
                            {q.missed_points.map((p, j) => (
                              <li key={j} className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{p}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-2 gap-4">
            {a.strengths?.length > 0 && (
              <section className="bg-green-50 rounded-xl p-4">
                <h3 className="font-bold text-green-700 mb-2 text-sm">💪 Strengths</h3>
                <ul className="space-y-1">
                  {a.strengths.map((s, i) => (
                    <li key={i} className="text-xs text-green-800 flex gap-1.5">
                      <span>•</span><span>{s}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {a.weaknesses?.length > 0 && (
              <section className="bg-red-50 rounded-xl p-4">
                <h3 className="font-bold text-red-600 mb-2 text-sm">⚠ Areas to Improve</h3>
                <ul className="space-y-1">
                  {a.weaknesses.map((w, i) => (
                    <li key={i} className="text-xs text-red-700 flex gap-1.5">
                      <span>•</span><span>{w}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Recommendations */}
          {a.recommendations?.length > 0 && (
            <section>
              <h3 className="font-bold text-gray-700 mb-3 text-base">📋 Recommendations</h3>
              <div className="space-y-2">
                {a.recommendations.map((r, i) => (
                  <div key={i} className="flex gap-3 bg-indigo-50 rounded-xl p-3">
                    <span className="bg-indigo-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0">{i + 1}</span>
                    <div>
                      <p className="text-xs font-semibold text-indigo-700">{r.area}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{r.suggestion}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Study Resources */}
          {a.study_resources?.length > 0 && (
            <section>
              <h3 className="font-bold text-gray-700 mb-2 text-base">📚 Topics to Review</h3>
              <div className="flex flex-wrap gap-2">
                {a.study_resources.map((r, i) => (
                  <Badge key={i} text={r} color="bg-blue-100 text-blue-700" />
                ))}
              </div>
            </section>
          )}

          {/* Extracted Text */}
          {a.extracted_text && (
            <section>
              <details className="bg-gray-50 rounded-xl">
                <summary className="px-4 py-3 text-sm font-semibold text-gray-600 cursor-pointer">
                  📄 View Extracted Text
                </summary>
                <pre className="px-4 pb-4 text-xs text-gray-500 whitespace-pre-wrap">{a.extracted_text}</pre>
              </details>
            </section>
          )}
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-medium hover:bg-indigo-700"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisModal;
