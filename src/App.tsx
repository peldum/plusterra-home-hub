import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import { OneSignalProvider } from "@/components/OneSignalProvider";
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
import Communications from "./pages/Communications";
import OwnersPage from "./pages/OwnersPage";
import OwnerDetailPage from "./pages/OwnerDetailPage";
import QAChecklist from "./pages/QAChecklist";
import MyFavorites from "./pages/MyFavorites";
import KeyWithdrawalPage from "./pages/KeyWithdrawalPage";
import KeyControlPage from "./pages/KeyControlPage";
import KeyScannerPage from "./pages/KeyScannerPage";
import AgentFinances from "./pages/AgentFinances";
import Buildings from "./pages/Buildings";
import BuildingDetailPage from "./pages/BuildingDetailPage";
import Pipeline from "./pages/Pipeline";
import MisMetasPage from "./pages/MisMetasPage";
import MyPortalProfile from "./pages/MyPortalProfile";
import MyPlanPage from "./pages/MyPlanPage";
import NotFound from "./pages/NotFound";
import AccessDenied from "./pages/AccessDenied";
import HelpCenter from "./pages/HelpCenter";
import NotificationsHistory from "./pages/NotificationsHistory";
import AuditFinanciero from "./pages/AuditFinanciero";
import RolesPermissions from "./pages/RolesPermissions";
import CentroControl from "./pages/CentroControl";
import PortalWebConfig from "./pages/PortalWebConfig";
import PortalLeads from "./pages/PortalLeads";
import BlogAdmin from "./pages/BlogAdmin";
import { PortalLayout } from "./components/portal/PortalLayout";
import { PortalErrorBoundary } from "./components/portal/PortalErrorBoundary";
import PortalHome from "./pages/portal/PortalHome";
import PortalListings from "./pages/portal/PortalListings";
import PortalDetail from "./pages/portal/PortalDetail";
import PortalMap from "./pages/portal/PortalMap";
import PortalAgentProfile from "./pages/portal/PortalAgentProfile";
import PortalAgentsList from "./pages/portal/PortalAgentsList";
import PortalAbout from "./pages/portal/PortalAbout";
import PortalContact from "./pages/portal/PortalContact";
import PortalProjects from "./pages/portal/PortalProjects";
import PortalShowroom from "./pages/portal/PortalShowroom";
import PortalShowroomDetail from "./pages/portal/PortalShowroomDetail";
import PortalBlog from "./pages/portal/PortalBlog";
import PortalBlogPost from "./pages/portal/PortalBlogPost";
import PortalQuiz from "./pages/portal/PortalQuiz";
import { ComparePage } from "./components/portal/PropertyCompare";

type AppRole = 'superadmin' | 'admin' | 'agent' | 'accounting' | 'secretaria';

const queryClient = new QueryClient();

// Routes that agents AND secretaria cannot access (accounting/Gerente now has admin access)
const AGENT_DENIED: AppRole[] = ['agent', 'secretaria'];
const SUPERADMIN_ONLY: AppRole[] = ['admin', 'agent', 'accounting', 'secretaria'];
const ADMIN_PLUS_ONLY: AppRole[] = ['agent', 'secretaria'];
const AGENT_ONLY_DENIED: AppRole[] = ['agent'];

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <OneSignalProvider />
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
                <Route path="/comunicaciones" element={<Communications />} />
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
                <Route path="/control-llaves" element={<ProtectedRoute denyRoles={['agent'] as AppRole[]}><KeyControlPage /></ProtectedRoute>} />
                <Route path="/retiro-llaves" element={<ProtectedRoute denyRoles={['admin', 'superadmin', 'accounting', 'secretaria'] as AppRole[]}><KeyScannerPage /></ProtectedRoute>} />
                <Route path="/kpi-ejecutivo" element={<ProtectedRoute denyRoles={SUPERADMIN_ONLY}><ExecutiveKPI /></ProtectedRoute>} />
                <Route path="/insight" element={<ProtectedRoute denyRoles={SUPERADMIN_ONLY}><InsightPage /></ProtectedRoute>} />
                <Route path="/propietarios" element={<ProtectedRoute denyRoles={AGENT_DENIED}><OwnersPage /></ProtectedRoute>} />
                <Route path="/propietarios/:id" element={<ProtectedRoute denyRoles={AGENT_DENIED}><OwnerDetailPage /></ProtectedRoute>} />
                <Route path="/edificios" element={<Buildings />} />
                <Route path="/edificios/:id" element={<BuildingDetailPage />} />
                <Route path="/pipeline" element={<Pipeline />} />
                <Route path="/mis-metas" element={<ProtectedRoute denyRoles={['admin', 'superadmin', 'accounting', 'secretaria'] as AppRole[]}><MisMetasPage /></ProtectedRoute>} />
                <Route path="/mi-perfil-portal" element={<ProtectedRoute denyRoles={['admin', 'superadmin', 'accounting', 'secretaria'] as AppRole[]}><MyPortalProfile /></ProtectedRoute>} />
                <Route path="/mi-plan" element={<ProtectedRoute denyRoles={['admin', 'superadmin', 'accounting', 'secretaria'] as AppRole[]}><MyPlanPage /></ProtectedRoute>} />
                <Route path="/qa" element={<ProtectedRoute denyRoles={SUPERADMIN_ONLY}><QAChecklist /></ProtectedRoute>} />
                <Route path="/portal-admin" element={<ProtectedRoute denyRoles={ADMIN_PLUS_ONLY}><PortalWebConfig /></ProtectedRoute>} />
                <Route path="/portal-admin/leads" element={<ProtectedRoute denyRoles={AGENT_ONLY_DENIED}><PortalLeads /></ProtectedRoute>} />
                <Route path="/portal-admin/blog" element={<ProtectedRoute denyRoles={ADMIN_PLUS_ONLY}><BlogAdmin /></ProtectedRoute>} />
                <Route path="/roles-permisos" element={<ProtectedRoute denyRoles={SUPERADMIN_ONLY}><RolesPermissions /></ProtectedRoute>} />
                <Route path="/centro-control" element={<ProtectedRoute denyRoles={SUPERADMIN_ONLY}><CentroControl /></ProtectedRoute>} />
                <Route path="/notificaciones" element={<NotificationsHistory />} />
                <Route path="/auditoria-financiera" element={<ProtectedRoute denyRoles={['agent', 'secretaria'] as AppRole[]}><AuditFinanciero /></ProtectedRoute>} />
                <Route path="/ayuda" element={<HelpCenter />} />
              </Route>

              {/* Portal Público — sin auth */}
              <Route path="/portal" element={<PortalLayout />}>
                <Route index element={<PortalHome />} />
                <Route path="propiedades" element={<PortalListings />} />
                <Route path="propiedades/:id" element={<PortalDetail />} />
                <Route path="mapa" element={<PortalMap />} />
                <Route path="agentes" element={<PortalAgentsList />} />
                <Route path="agentes/:id" element={<PortalAgentProfile />} />
                <Route path="nosotros" element={<PortalAbout />} />
                <Route path="contacto" element={<PortalContact />} />
                <Route path="proyectos" element={<PortalShowroom />} />
                <Route path="proyectos/:id" element={<PortalShowroomDetail />} />
                <Route path="blog" element={<PortalBlog />} />
                <Route path="blog/:slug" element={<PortalBlogPost />} />
                <Route path="quiz" element={<PortalQuiz />} />
                <Route path="comparar" element={<ComparePage />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
