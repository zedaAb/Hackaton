import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className={`min-h-screen flex flex-col relative overflow-hidden transition-colors duration-700 ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      
      {/* Navbar overlay for mobile */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-3xl animate-fade-in">
          <button 
            onClick={() => setIsMenuOpen(false)}
            className="absolute top-8 right-8 text-white text-4xl font-light hover:rotate-90 transition-transform duration-300"
          >
            &times;
          </button>
          <div className="flex flex-col items-center gap-10 animate-fade-in-up uppercase tracking-widest text-sm font-bold">
            <button
              onClick={() => { setIsDarkMode(!isDarkMode); setIsMenuOpen(false); }}
              className="px-10 py-4 rounded-2xl bg-white/5 border border-white/10 text-white flex items-center gap-3 hover:bg-white/10 transition-all shadow-2xl"
            >
              {isDarkMode ? '☀️ LIGHT MODE' : '🌙 DARK MODE'}
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-14 py-5 rounded-2xl bg-indigo-600 text-white shadow-2xl shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-all"
            >
              SIGN IN
            </button>
          </div>
        </div>
      )}

      {/* Background Blooms */}
      <div className={`absolute top-[-20%] left-[-10%] w-[800px] h-[800px] rounded-full mix-blend-multiply filter blur-[128px] animate-pulse duration-[15s] ${isDarkMode ? 'bg-indigo-600/20' : 'bg-indigo-500/10'}`}></div>
      <div className={`absolute bottom-[-10%] right-[-10%] w-[900px] h-[900px] rounded-full mix-blend-multiply filter blur-[128px] animate-pulse duration-[10s] ${isDarkMode ? 'bg-blue-600/10' : 'bg-blue-400/10'}`}></div>
      <div className={`absolute top-[40%] right-[-5%] w-[400px] h-[400px] rounded-full mix-blend-multiply filter blur-[96px] animate-pulse duration-[12s] ${isDarkMode ? 'bg-purple-600/10' : 'bg-purple-400/5'}`}></div>

      {/* Navbar */}
      <nav className="relative z-10 flex justify-between items-center px-6 md:px-12 py-8 w-full max-w-7xl mx-auto animate-fade-in">
        <div className="flex items-center gap-4 transition-all hover:scale-105 duration-500 cursor-pointer group" onClick={() => navigate('/')}>
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center glass-card border-none bg-white/10 shadow-[0_0_30px_rgba(79,70,229,0.15)] group-hover:shadow-indigo-500/25 transition-all ring-1 ring-white/10">
            <img src="/logo.png" alt="AI Grader" className="w-8 h-8 md:w-10 md:h-10 object-contain rounded-full" />
          </div>
          <h1 className={`text-2xl md:text-3xl font-black tracking-tight transition-colors ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            AI <span className="gradient-text">Grader</span>
          </h1>
        </div>
        
        <div className="hidden md:flex items-center gap-6">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl transition-all hover:rotate-6 ${isDarkMode ? 'bg-white/5 text-yellow-300 border border-white/10 hover:bg-white/10' : 'bg-white text-slate-700 border border-slate-200 hover:shadow-lg shadow-sm'}`}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          
          <button
            onClick={() => navigate('/login')}
            className={`px-8 py-3 rounded-2xl text-sm font-black tracking-wide uppercase transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 shadow-2xl ${isDarkMode ? 'bg-indigo-600 text-white shadow-indigo-500/30 hover:bg-indigo-500' : 'bg-white text-indigo-700 border border-slate-200 hover:shadow-indigo-500/10'}`}
          >
            Sign In
          </button>
        </div>

        <button 
          onClick={() => setIsMenuOpen(true)}
          className={`md:hidden p-3 rounded-2xl border transition-all ${isDarkMode ? 'border-white/10 text-white bg-white/5 hover:bg-white/10' : 'border-slate-200 text-slate-600 bg-white shadow-sm'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>
      </nav>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center max-w-5xl mx-auto py-12 md:py-24">
        <div className="animate-fade-in-up">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black tracking-[0.2em] uppercase mb-10 glass-card bg-opacity-20 border-none shadow-none ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
             <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Next generation AI grading
          </div>
          
          <h2 className={`text-5xl md:text-8xl font-black tracking-tighter mb-8 leading-[1.05] transition-colors ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Grading with <br />
            <span className="gradient-text">Absolute</span> Precision.
          </h2>
          
          <p className={`text-lg md:text-xl mb-14 max-w-2xl mx-auto leading-relaxed font-medium transition-colors ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Empowering educators through lightning-fast evaluation and deeply intelligent student feedback cycles. Experience the AI revolution in academia.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-5 justify-center delay-300">
            <button
              onClick={() => navigate('/register')}
              className="px-12 py-5 rounded-3xl bg-indigo-600 text-white font-black text-lg shadow-[0_20px_50px_rgba(79,70,229,0.4)] hover:bg-indigo-500 hover:scale-105 active:scale-95 transition-all duration-300"
            >
              Get Started for Free →
            </button>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
            {[
                { icon: '🎯', title: 'Smart Extraction', desc: 'Read complex handwriting and OCR with high accuracy.' },
                { icon: '⚡', title: 'Instant Analysis', desc: 'Grade hundred of papers in seconds, not hours.' },
                { icon: '📝', title: 'Deep Insights', desc: 'Detailed rubrics and personalized improvement tips.' }
            ].map((f, i) => (
                <div key={i} className={`p-8 rounded-3xl glass-card transition-all hover:-translate-y-2 group cursor-pointer ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-white shadow-lg shadow-slate-200/40'}`}>
                    <div className="text-4xl mb-6 group-hover:scale-110 transition-transform duration-300">{f.icon}</div>
                    <h3 className={`font-bold text-lg mb-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{f.title}</h3>
                    <p className={`text-sm leading-relaxed opacity-70 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{f.desc}</p>
                </div>
            ))}
        </div>
      </main>

      <footer className={`relative z-10 py-16 px-6 border-t transition-colors ${isDarkMode ? 'border-white/5 bg-slate-900/50' : 'border-slate-200 bg-white/50 backdrop-blur-xl'}`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex flex-col items-center md:items-start gap-4">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="AI Grader" className="w-8 h-8 opacity-40 grayscale hover:grayscale-0 transition-all duration-700 cursor-pointer rounded-full" />
              <span className={`font-bold tracking-tight ${isDarkMode ? 'text-slate-300' : 'text-slate-900'}`}>AI Grader</span>
            </div>
            <p className={`text-xs font-semibold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Built for the hackers of tomorrow.
            </p>
          </div>
          <div className="flex gap-10">
            {['Privacy', 'Ethics', 'Legal', 'Support'].map(item => (
              <a key={item} href="#" className={`text-sm font-bold transition-all hover:text-indigo-500 ${isDarkMode ? 'text-slate-500 hover:text-white' : 'text-slate-400'}`}>
                {item}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
