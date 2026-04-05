import { useState } from 'react';
import Navbar from './Navbar';

const DashboardLayout = ({ children, pendingGrading = 0 }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-5 py-4 bg-indigo-800 text-white sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain bg-white/10 rounded p-0.5" />
          <span className="font-bold tracking-tight">AI Grader</span>
        </div>
        <button 
          onClick={() => setSidebarOpen(true)}
          className="p-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        
        <main className="flex-1 p-4 md:p-8 md:ml-56 overflow-y-auto print:ml-0 print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
