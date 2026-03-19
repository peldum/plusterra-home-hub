import { useAuth } from '@/contexts/AuthContext';
import AgentDashboard from './AgentDashboard';
import AdminDashboard from './AdminDashboard';

const Dashboard = () => {
  const { role } = useAuth();

  // Agents get their own dashboard; everyone else (admin, superadmin, accounting, secretaria) gets the full admin view
  if (role === 'agent') return <AgentDashboard />;

  return <AdminDashboard />;
};

export default Dashboard;

