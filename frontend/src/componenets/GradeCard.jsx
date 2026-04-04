const GradeCard = ({ submission, onViewAnalysis }) => {
  const gradeColor =
    submission.grade >= 80 ? 'text-green-600' :
    submission.grade >= 60 ? 'text-yellow-600' : 'text-red-500';

  const analysis = submission.ai_analysis;
  const questions = analysis?.questions || [];
  const totalMarks = questions.reduce((s, q) => s + (q.marks_total || 0), 0);
  const earnedMarks = questions.reduce((s, q) => s + (q.marks_awarded || 0), 0);

  return (
    <div className="bg-white rounded-xl shadow border border-gray-100 p-5 flex flex-col gap-3">
      {/* Top row */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-gray-800">{submission.assignment_title}</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(submission.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="text-right">
          <span className={`text-3xl font-extrabold ${gradeColor}`}>
            {submission.status === 'graded' ? `${submission.grade}` : '—'}
          </span>
          {submission.status === 'graded' && (
            <span className="text-gray-400 text-sm">/100</span>
          )}
          {analysis?.grade_letter && (
            <p className={`text-sm font-bold ${gradeColor}`}>{analysis.grade_letter} · {analysis.performance_level}</p>
          )}
        </div>
      </div>

      {/* Status badge */}
      <span className={`self-start text-xs px-2.5 py-1 rounded-full font-medium ${
        submission.status === 'graded' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
      }`}>
        {submission.status}
      </span>

      {/* Mini score bar if graded */}
      {submission.status === 'graded' && totalMarks > 0 && (
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Score</span>
            <span>{earnedMarks}/{totalMarks} marks</span>
          </div>
          <div className="bg-gray-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                submission.grade >= 80 ? 'bg-green-500' :
                submission.grade >= 60 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${submission.grade}%` }}
            />
          </div>
        </div>
      )}

      {/* Summary */}
      {analysis?.summary && (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2.5 line-clamp-2">
          {analysis.summary}
        </p>
      )}

      {/* View full analysis button */}
      {submission.status === 'graded' && (
        <button
          onClick={() => onViewAnalysis(submission)}
          className="mt-1 w-full bg-indigo-600 text-white text-sm py-2 rounded-lg hover:bg-indigo-700 font-medium"
        >
          View Full Analysis
        </button>
      )}
    </div>
  );
};

export default GradeCard;
