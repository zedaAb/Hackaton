import Navbar from './Navbar';

const DashboardLayout = ({ children, pendingGrading = 0 }) => (
  <div className="flex min-h-screen bg-gray-50">
    <Navbar pendingGrading={pendingGrading} />
    <main className="ml-56 flex-1 p-8 overflow-y-auto">
      {children}
    </main>
  </div>
);

export default DashboardLayout;
