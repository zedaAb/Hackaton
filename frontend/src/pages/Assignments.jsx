import { useEffect, useState } from 'react';
import Navbar from '../componenets/Navbar';
import api from '../api/axios';

const Assignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // assignment to submit
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const { data } = await api.get('/student/assignments');
      setAssignments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!answer.trim()) return;
    setSubmitting(true);
    setMessage('');
    try {
      await api.post('/student/submit', {
        assignment_id: selected.id,
        answer_text: answer,
      });
      setMessage('Submitted successfully!');
      setSelected(null);
      setAnswer('');
      fetchAssignments();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const isOverdue = (due_date) => due_date && new Date(due_date) < new Date();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Assignments</h2>
          <p className="text-gray-400 text-sm mt-1">View and submit your assignments</p>
        </div>

        {message && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
            message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
          }`}>
            {message}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-gray-400">
            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            Loading assignments...
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
                      <h3 className="font-semibold text-gray-800 text-lg">{a.title}</h3>
                      {a.already_submitted && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                          ✓ Submitted
                        </span>
                      )}
                      {isOverdue(a.due_date) && !a.already_submitted && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                          Overdue
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">By {a.teacher_name}</p>
                    {a.description && (
                      <p className="text-sm text-gray-600 mt-2">{a.description}</p>
                    )}
                    <div className="flex gap-4 mt-2 text-xs text-gray-400">
                      <span>Max marks: {a.max_marks}</span>
                      {a.due_date && (
                        <span className={isOverdue(a.due_date) ? 'text-red-500' : ''}>
                          Due: {new Date(a.due_date).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
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
      </div>

      {/* Submit Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
            <div className="p-6 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{selected.title}</h3>
                  <p className="text-sm text-gray-400 mt-0.5">Max marks: {selected.max_marks}</p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  &times;
                </button>
              </div>
              {selected.description && (
                <div className="mt-3 bg-indigo-50 rounded-lg p-3 text-sm text-indigo-800">
                  <p className="font-medium mb-1">Assignment Instructions:</p>
                  <p>{selected.description}</p>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Answer
                </label>
                <textarea
                  rows={10}
                  placeholder="Write your answer here. Be detailed and clear..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-400 mt-1">{answer.length} characters</p>
              </div>

              {message && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{message}</p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !answer.trim()}
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

export default Assignments;
