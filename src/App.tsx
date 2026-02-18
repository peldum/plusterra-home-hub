import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
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
import NotFound from "./pages/NotFound";
import AccessDenied from "./pages/AccessDenied";

type AppRole = 'superadmin' | 'admin' | 'agent' | 'accounting';

const queryClient = new QueryClient();

// Routes that agents cannot access
const AGENT_DENIED: AppRole[] = ['agent'];

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/acceso-denegado" element={<AccessDenied />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/propiedades" element={<ProtectedRoute><Properties /></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute denyRoles={AGENT_DENIED}><Clients /></ProtectedRoute>} />
            <Route path="/finanzas" element={<ProtectedRoute><Finances /></ProtectedRoute>} />
            <Route path="/contratos" element={<ProtectedRoute><Contracts /></ProtectedRoute>} />
            <Route path="/inventario" element={<ProtectedRoute denyRoles={AGENT_DENIED}><Inventory /></ProtectedRoute>} />
            <Route path="/agentes" element={<ProtectedRoute denyRoles={AGENT_DENIED}><Agents /></ProtectedRoute>} />
            <Route path="/proveedores" element={<ProtectedRoute denyRoles={AGENT_DENIED}><Providers /></ProtectedRoute>} />
            <Route path="/mantenimiento" element={<ProtectedRoute><Maintenance /></ProtectedRoute>} />
            <Route path="/configuracion" element={<ProtectedRoute denyRoles={AGENT_DENIED}><Settings /></ProtectedRoute>} />
            <Route path="/disponibles" element={<ProtectedRoute><AvailableProperties /></ProtectedRoute>} />
            <Route path="/kpi-ejecutivo" element={<ProtectedRoute denyRoles={AGENT_DENIED}><ExecutiveKPI /></ProtectedRoute>} />
            <Route path="/insight" element={<ProtectedRoute denyRoles={AGENT_DENIED}><InsightPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
