import { useAuth } from '@/contexts/AuthContext';
import AgentDashboard from './AgentDashboard';
import AdminDashboard from './AdminDashboard';
import SecretariaDashboard from './SecretariaDashboard';

const Dashboard = () => {
  const { role } = useAuth();

  if (role === 'agent') return <AgentDashboard />;
  if (role === 'secretaria') return <SecretariaDashboard />;

  return <AdminDashboard />;
};

export default Dashboard;

