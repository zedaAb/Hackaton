import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';

const studentLinks = [
  { to: '/student', label: 'Overview', icon: '🏠' },
  { to: '/student/assignments', label: 'Assignments', icon: '📋' },
  { to: '/student/grades', label: 'My Grades', icon: '📊' },
  { to: '/student/materials', label: 'Materials', icon: '📚' },
  { to: '/student/worksheets', label: 'Worksheets', icon: '📄' },
  { to: '/student/qa', label: 'AI QA Tutor', icon: '🤖' },
];

const teacherLinks = [
  { to: '/teacher', label: 'Overview', icon: '🏠' },
  { to: '/teacher/submissions', label: 'Submissions', icon: '📝' },
  { to: '/teacher/grading', label: 'AI Grading', icon: '🤖' },
  { to: '/teacher/upload', label: 'Upload Exam', icon: '📷' },
  { to: '/teacher/assignments', label: 'Assignments', icon: '📋' },
  { to: '/teacher/materials', label: 'Materials', icon: '📚' },
  { to: '/teacher/worksheets', label: 'Worksheets', icon: '📄' },
];

const adminLinks = [
  { to: '/admin', label: 'Overview', icon: '🏠' },
  { to: '/admin/users', label: 'Users', icon: '👥' },
  { to: '/admin/submissions', label: 'Submissions', icon: '📝' },
  { to: '/admin/register-teacher', label: 'Register Teacher', icon: '👨‍🏫' },
];

const Navbar = ({ pendingGrading = 0, isOpen = false, onClose = () => {} }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const links =
    user?.role === 'teacher' ? teacherLinks :
    user?.role === 'admin' ? adminLinks :
    studentLinks;

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-40 md:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 flex flex-col transform transition-all duration-500 ease-[cubic-bezier(0.33,1,0.68,1)]
        ${isOpen ? 'translate-x-0 shadow-[0_0_80px_rgba(0,0,0,0.5)]' : '-translate-x-full md:translate-x-0 md:shadow-[20px_0_50px_rgba(0,0,0,0.2)]'}
        print:hidden border-r border-white/5
      `}>
        
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Logo & Mobile Close */}
        <div className="relative px-6 py-10 flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full flex items-center justify-center glass-card border-none bg-white/10 shadow-[0_0_20px_rgba(79,70,229,0.1)] group-hover:shadow-indigo-500/20 transition-all ring-1 ring-white/10">
                <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain rounded-full" />
              </div>
              <h1 className="text-white text-xl font-black tracking-tighter leading-none">AI <span className="gradient-text">Grader</span></h1>
            </div>
            <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* User Profile Hook */}
          <div className="glass-card p-4 rounded-3xl border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-all cursor-default group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-sm font-black uppercase shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
                {user?.name?.[0]}
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-black truncate">{user?.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold opacity-80">{user?.role}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="relative flex-1 px-4 py-2 space-y-2 overflow-y-auto custom-scrollbar">
          {links.map((link) => {
            const active = location.pathname === link.to;
            const showBadge = link.to.includes('grading') && pendingGrading > 0;
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => { if(window.innerWidth < 768) onClose(); }}
                className={`group flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-300 ${
                  active
                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/30 translate-x-1'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="text-lg transition-transform group-hover:scale-110">{link.icon}</span>
                <span className="flex-1 tracking-wide">{link.label}</span>
                {showBadge && (
                  <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-bounce">
                    {pendingGrading}
                  </span>
                )}
                {active && <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,1)]"></div>}
              </Link>
            );
          })}
        </nav>

        {/* Footer Area */}
        <div className="p-4 border-t border-white/5 bg-slate-900/50 backdrop-blur-md">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-sm"
          >
           LOGOUT
          </button>
        </div>
      </aside>
    </>
  );
};

export default Navbar;
