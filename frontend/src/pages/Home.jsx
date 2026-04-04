import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-indigo-600 to-blue-500 flex flex-col">
      {/* Navbar */}
      <nav className="flex justify-between items-center px-8 py-5">
        <h1 className="text-white text-2xl font-bold tracking-wide">AI Grader</h1>
        <button
          onClick={() => navigate('/login')}
          className="bg-white text-indigo-700 text-sm font-semibold px-5 py-2 rounded-full hover:bg-indigo-50 transition"
        >
          Login
        </button>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <span className="bg-white/20 text-white text-xs font-medium px-4 py-1.5 rounded-full mb-6 tracking-wide uppercase">
          Powered by Gemini AI
        </span>
        <h2 className="text-5xl font-extrabold text-white leading-tight max-w-2xl mb-4">
          Automated Exam Grading with AI
        </h2>
        <p className="text-indigo-100 text-lg max-w-xl mb-10">
          Teachers upload exam photos, AI reads and grades them instantly.
          Students get detailed feedback. Admins keep everything in check.
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/register')}
            className="bg-white text-indigo-700 font-bold px-8 py-3 rounded-full text-sm hover:bg-indigo-50 shadow-lg transition"
          >
            Get Started
          </button>
          <button
            onClick={() => navigate('/login')}
            className="border-2 border-white text-white font-bold px-8 py-3 rounded-full text-sm hover:bg-white/10 transition"
          >
            Login
          </button>
        </div>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-8 pb-16 max-w-5xl mx-auto w-full">
        {[
          { icon: '📸', title: 'Upload Exam Photos', desc: 'Teachers simply upload a photo of the student\'s handwritten exam.' },
          { icon: '🤖', title: 'AI Grades Instantly', desc: 'Gemini AI reads, extracts text, and grades with detailed feedback.' },
          { icon: '📊', title: 'Track Performance', desc: 'Students and admins get real-time grade reports and analytics.' },
        ].map((f) => (
          <div key={f.title} className="bg-white/10 backdrop-blur rounded-2xl p-5 text-white">
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="font-bold text-lg mb-1">{f.title}</h3>
            <p className="text-indigo-100 text-sm">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;
