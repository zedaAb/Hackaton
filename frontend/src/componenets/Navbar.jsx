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
          className="fixed inset-0 bg-black/50 z-40 md:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-indigo-800 flex flex-col transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        print:hidden
      `}>
        {/* Logo & Mobile Close */}
        <div className="px-5 py-5 border-b border-indigo-700 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <img src="/logo.png" alt="AI Grader Logo" className="w-11 h-11 rounded-lg object-contain bg-white/10 p-1" />
              <h1 className="text-white text-base font-bold tracking-wide leading-tight">AI Grader</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold uppercase shrink-0">
                {user?.name?.[0]}
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-medium leading-tight truncate w-32">{user?.name}</p>
                <p className="text-indigo-300 text-xs capitalize">{user?.role}</p>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="md:hidden p-2 text-indigo-300 hover:text-white"
          >
            <span className="text-2xl font-light">&times;</span>
          </button>
        </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map((link) => {
          const active = location.pathname === link.to;
          const showBadge = link.to.includes('grading') && pendingGrading > 0;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-white text-indigo-700'
                  : 'text-indigo-200 hover:bg-indigo-700 hover:text-white'
              }`}
            >
              <span>{link.icon}</span>
              <span className="flex-1">{link.label}</span>
              {showBadge && (
                <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {pendingGrading}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-indigo-700">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white bg-red-600 hover:bg-red-700 transition-colors"
        >
          <span>🚪</span> Logout
        </button>
      </div>
    </aside>
    </>
  );
};

export default Navbar;
