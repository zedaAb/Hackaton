import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(true);

  return (
    <div className={`min-h-screen flex flex-col relative overflow-hidden transition-colors duration-700 ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      
      {/* Dynamic Background Elements */}
      <div className={`absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full mix-blend-multiply filter blur-[128px] animate-pulse ${isDarkMode ? 'bg-indigo-600 opacity-50' : 'bg-indigo-300 opacity-60'}`}></div>
      <div className={`absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full mix-blend-multiply filter blur-[128px] ${isDarkMode ? 'bg-blue-600 opacity-40' : 'bg-blue-300 opacity-50'}`}></div>

      {/* Navbar */}
      <nav className="relative z-10 flex justify-between items-center px-8 py-6 w-full max-w-7xl mx-auto animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-blue-400 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="text-white font-bold text-xl">AI</span>
          </div>
          <h1 className={`text-2xl font-bold tracking-tight transition-colors ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Grader</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-transform hover:scale-110 ${isDarkMode ? 'bg-white/10 text-yellow-300 hover:bg-white/20' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
            title="Toggle Theme"
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          
          <button
            onClick={() => navigate('/login')}
            className={`backdrop-blur-md border text-sm font-semibold px-6 py-2.5 rounded-full hover:scale-105 transition-all duration-300 ${isDarkMode ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-white border-slate-200 text-indigo-700 hover:bg-slate-100 shadow-sm'}`}
          >
            Sign In
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 mt-6 mb-20">
        <div className={`animate-fade-in-up inline-flex items-center gap-2 border backdrop-blur-md text-xs font-semibold px-4 py-1.5 rounded-full mb-8 tracking-wide uppercase shadow-lg ${isDarkMode ? 'bg-indigo-500/20 border-indigo-400/30 text-indigo-200 shadow-indigo-500/10' : 'bg-indigo-100 border-indigo-200 text-indigo-700 shadow-indigo-200/50'}`}>
          <span className={`w-2 h-2 rounded-full animate-pulse ${isDarkMode ? 'bg-indigo-400' : 'bg-indigo-500'}`}></span>
          Powered by Gemini AI
        </div>
        
        <h2 className={`animate-fade-in-up delay-100 text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text leading-tight max-w-4xl mb-6 tracking-tight drop-shadow-sm bg-gradient-to-r ${isDarkMode ? 'from-white via-indigo-100 to-blue-200' : 'from-slate-900 via-indigo-800 to-blue-900'}`}>
          Automated Exam Grading at the Speed of Light.
        </h2>
        
        <p className={`animate-fade-in-up delay-200 text-lg md:text-xl max-w-2xl mb-12 font-light leading-relaxed transition-colors ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
          Teachers upload exam photos, AI reads and grades them instantly.
          Students get deeply detailed feedback. Elevate your institution's educational workflow permanently.
        </p>
        
        <div className="animate-fade-in-up delay-300 flex justify-center w-full">
          <button
            onClick={() => navigate('/register')}
            className={`group relative font-bold px-10 py-4 rounded-full text-lg transition-all duration-300 overflow-hidden hover:-translate-y-1 ${isDarkMode ? 'bg-white text-indigo-900 shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)]' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:shadow-xl hover:bg-indigo-700'}`}
          >
            <span className="relative z-10 flex items-center gap-2">
              Get Started for Free
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </span>
          </button>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="animate-fade-in-up delay-400 relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 px-4 md:px-8 pb-24 max-w-6xl mx-auto w-full">
        {[
          { icon: '📸', title: 'Upload Exam Photos', desc: 'Securely upload high-resolution photos or PDFs of handwritten exams in bulk instantly.' },
          { icon: '🤖', title: 'AI Evaluates Instantly', desc: 'Gemini intelligently extracts handwriting, matches against your custom rubrics, and grades it.' },
          { icon: '📊', title: 'Advanced Analytics', desc: 'Students receive comprehensive breakdown reports, and admins track systemic performance.' },
        ].map((f, i) => (
          <div 
            key={f.title} 
            className={`group backdrop-blur-xl border rounded-3xl p-8 hover:-translate-y-2 transition-all duration-500 cursor-default ${isDarkMode ? 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-indigo-400/50 shadow-2xl' : 'bg-white border-slate-200 text-slate-800 hover:shadow-xl hover:border-indigo-300 shadow-md'}`}
            style={{ animationDelay: `${i * 150}ms` }}
          >
            <div className={`w-14 h-14 border rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-inner group-hover:scale-110 transition-transform duration-500 bg-gradient-to-br ${isDarkMode ? 'from-indigo-500/20 to-blue-500/20 border-white/10 text-white' : 'from-indigo-50 to-blue-50 border-indigo-100 text-indigo-600'}`}>
              {f.icon}
            </div>
            <h3 className={`font-bold text-xl mb-3 tracking-wide ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{f.title}</h3>
            <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className={`animate-fade-in-up delay-500 relative z-10 border-t pt-16 pb-8 mt-auto ${isDarkMode ? 'border-white/10 bg-slate-900/80 backdrop-blur-3xl' : 'border-slate-200 bg-white/80 backdrop-blur-3xl'}`}>
        <div className="max-w-7xl mx-auto px-8 w-full">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <span className="text-white font-bold text-xl">AI</span>
                </div>
                <span className={`text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Grader</span>
              </div>
              <p className={`text-sm leading-relaxed max-w-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Empowering academic institutions with bleeding-edge artificial intelligence to eliminate grading overhead and significantly improve student feedback cycles.
              </p>
            </div>
            
            <div>
              <h4 className={`font-bold mb-6 tracking-wider uppercase text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-900'}`}>Platform</h4>
              <ul className={`space-y-3 text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                <li><button onClick={() => navigate('/login')} className={`transition-colors ${isDarkMode ? 'hover:text-white' : 'hover:text-indigo-600'}`}>Teacher Portal</button></li>
                <li><button onClick={() => navigate('/login')} className={`transition-colors ${isDarkMode ? 'hover:text-white' : 'hover:text-indigo-600'}`}>Student Dashboard</button></li>
                <li><button onClick={() => navigate('/login')} className={`transition-colors ${isDarkMode ? 'hover:text-white' : 'hover:text-indigo-600'}`}>Admin Operations</button></li>
              </ul>
            </div>
            
            <div>
              <h4 className={`font-bold mb-6 tracking-wider uppercase text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-900'}`}>Legal & Support</h4>
              <ul className={`space-y-3 text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                <li><a href="#" className={`transition-colors ${isDarkMode ? 'hover:text-white' : 'hover:text-indigo-600'}`}>Privacy Policy</a></li>
                <li><a href="#" className={`transition-colors ${isDarkMode ? 'hover:text-white' : 'hover:text-indigo-600'}`}>Terms of Service</a></li>
                <li><a href="#" className={`transition-colors ${isDarkMode ? 'hover:text-white' : 'hover:text-indigo-600'}`}>Help Center Documentation</a></li>
              </ul>
            </div>
          </div>
          
          <div className={`border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm font-medium ${isDarkMode ? 'border-white/10 text-slate-500' : 'border-slate-200 text-slate-500'}`}>
            <p>&copy; {new Date().getFullYear()} AI Grader System Platform. All rights reserved globally.</p>
            <p className="flex items-center gap-1">
              Engineered with <span className="text-red-500 animate-pulse">❤</span> for Educators
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
