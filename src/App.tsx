import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Properties from "./pages/Properties";
import Clients from "./pages/Clients";
import Finances from "./pages/Finances";
import Contracts from "./pages/Contracts";
import Agents from "./pages/Agents";
import Providers from "./pages/Providers";
import Maintenance from "./pages/Maintenance";
import Settings from "./pages/Settings";
import Inventory from "./pages/Inventory";
import ExecutiveKPI from "./pages/ExecutiveKPI";
import InsightPage from "./pages/Insight";
import AvailableProperties from "./pages/AvailableProperties";
import OwnersPage from "./pages/OwnersPage";
import QAChecklist from "./pages/QAChecklist";
import MyFavorites from "./pages/MyFavorites";
import KeyWithdrawalPage from "./pages/KeyWithdrawalPage";
import KeyControlPage from "./pages/KeyControlPage";
import KeyScannerPage from "./pages/KeyScannerPage";
import AgentFinances from "./pages/AgentFinances";
import NotFound from "./pages/NotFound";
import AccessDenied from "./pages/AccessDenied";

type AppRole = 'superadmin' | 'admin' | 'agent' | 'accounting' | 'secretaria';

const queryClient = new QueryClient();

// Routes that agents AND secretaria cannot access
const AGENT_DENIED: AppRole[] = ['agent', 'secretaria'];
// Routes restricted to superadmin only
const SUPERADMIN_ONLY: AppRole[] = ['admin', 'agent', 'accounting', 'secretaria'];
// Routes for admin+ (not agent, not secretaria, not accounting)
const ADMIN_PLUS_ONLY: AppRole[] = ['agent', 'accounting', 'secretaria'];
// Routes only agents cannot access (secretaria CAN access in read mode)
const AGENT_ONLY_DENIED: AppRole[] = ['agent'];

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Routes WITHOUT persistent sidebar */}
            <Route path="/login" element={<Login />} />
            <Route path="/acceso-denegado" element={<AccessDenied />} />
            <Route path="/retiro-llave" element={<KeyWithdrawalPage />} />

            {/* Routes WITH persistent sidebar (AppShell) */}
            <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/propiedades" element={<Properties />} />
              <Route path="/disponibles" element={<AvailableProperties />} />
              <Route path="/clientes" element={<ProtectedRoute denyRoles={AGENT_DENIED}><Clients /></ProtectedRoute>} />
              <Route path="/finanzas" element={<ProtectedRoute denyRoles={AGENT_DENIED}><Finances /></ProtectedRoute>} />
              <Route path="/mis-finanzas" element={<ProtectedRoute denyRoles={['admin', 'superadmin', 'accounting', 'secretaria'] as AppRole[]}><AgentFinances /></ProtectedRoute>} />
              <Route path="/contratos" element={<Contracts />} />
              <Route path="/inventario" element={<ProtectedRoute denyRoles={AGENT_DENIED}><Inventory /></ProtectedRoute>} />
              <Route path="/agentes" element={<ProtectedRoute denyRoles={AGENT_ONLY_DENIED}><Agents /></ProtectedRoute>} />
              <Route path="/proveedores" element={<ProtectedRoute denyRoles={AGENT_DENIED}><Providers /></ProtectedRoute>} />
              <Route path="/mantenimiento" element={<ProtectedRoute denyRoles={AGENT_DENIED}><Maintenance /></ProtectedRoute>} />
              <Route path="/configuracion" element={<ProtectedRoute denyRoles={ADMIN_PLUS_ONLY}><Settings /></ProtectedRoute>} />
              <Route path="/mis-favoritos" element={<ProtectedRoute denyRoles={['admin', 'superadmin', 'accounting', 'secretaria'] as AppRole[]}><MyFavorites /></ProtectedRoute>} />
              <Route path="/control-llaves" element={<ProtectedRoute denyRoles={['agent', 'accounting'] as AppRole[]}><KeyControlPage /></ProtectedRoute>} />
              <Route path="/retiro-llaves" element={<ProtectedRoute denyRoles={['admin', 'superadmin', 'accounting', 'secretaria'] as AppRole[]}><KeyScannerPage /></ProtectedRoute>} />
              <Route path="/kpi-ejecutivo" element={<ProtectedRoute denyRoles={SUPERADMIN_ONLY}><ExecutiveKPI /></ProtectedRoute>} />
              <Route path="/insight" element={<ProtectedRoute denyRoles={SUPERADMIN_ONLY}><InsightPage /></ProtectedRoute>} />
              <Route path="/propietarios" element={<ProtectedRoute denyRoles={AGENT_DENIED}><OwnersPage /></ProtectedRoute>} />
              <Route path="/qa" element={<ProtectedRoute denyRoles={SUPERADMIN_ONLY}><QAChecklist /></ProtectedRoute>} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
