import { Outlet } from 'react-router-dom';
import { PortalHeader } from './PortalHeader';
import { PortalFooter } from './PortalFooter';

export const PortalLayout = () => (
  <div className="min-h-screen flex flex-col bg-gray-50">
    <PortalHeader />
    <main className="flex-1">
      <Outlet />
    </main>
    <PortalFooter />
  </div>
);
