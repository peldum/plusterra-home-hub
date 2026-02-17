import { useAuth } from '@/contexts/AuthContext';
import AgentDashboard from './AgentDashboard';
import AdminDashboard from './AdminDashboard';

const Dashboard = () => {
  const { role } = useAuth();

  if (role === 'agent') {
    return <AgentDashboard />;
  }

  return <AdminDashboard />;
};

export default Dashboard;
