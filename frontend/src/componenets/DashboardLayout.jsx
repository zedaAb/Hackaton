import { useState } from 'react';
import Navbar from './Navbar';

const DashboardLayout = ({ children, pendingGrading = 0 }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg-main)] print:bg-white text-slate-900 transition-colors duration-500">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 glass-card bg-indigo-900/95 !border-none text-white sticky top-0 z-40 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center p-1.5 shadow-inner ring-1 ring-white/20">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain rounded-full" />
          </div>
          <span className="font-black tracking-tight text-xl uppercase">AI <span className="text-indigo-400">Grader</span></span>
        </div>
        <button 
          onClick={() => setSidebarOpen(true)}
          className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 shadow-lg"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>
      </header>

      <div className="flex">
        <Navbar 
          pendingGrading={pendingGrading} 
          isOpen={isSidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />
        
        <main className="flex-1 min-h-screen md:ml-64 p-6 md:p-14 overflow-y-auto print:ml-0 print:p-0 transition-all duration-500">
          <div className="max-w-7xl mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
