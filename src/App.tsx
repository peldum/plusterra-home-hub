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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/propiedades" element={<ProtectedRoute><Properties /></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
            <Route path="/finanzas" element={<ProtectedRoute><Finances /></ProtectedRoute>} />
            <Route path="/contratos" element={<ProtectedRoute><Contracts /></ProtectedRoute>} />
            <Route path="/inventario" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
            <Route path="/agentes" element={<ProtectedRoute><Agents /></ProtectedRoute>} />
            <Route path="/proveedores" element={<ProtectedRoute><Providers /></ProtectedRoute>} />
            <Route path="/mantenimiento" element={<ProtectedRoute><Maintenance /></ProtectedRoute>} />
            <Route path="/configuracion" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/kpi-ejecutivo" element={<ProtectedRoute><ExecutiveKPI /></ProtectedRoute>} />
            <Route path="/insight" element={<ProtectedRoute><InsightPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;