import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import { OneSignalProvider } from "@/components/OneSignalProvider";
import { QueryLoopBoundary } from "@/components/errors/QueryLoopBoundary";
import { QueryLoopDetectedError, AuthExpiredError, resetQueryLoopGuard } from "@/lib/queryLoopGuard";
import { installQueryTelemetry } from "@/lib/queryTelemetry";
import { useEffect } from "react";
import { isPortalDomain, isAdminDomain } from "@/lib/portalDomain";
import { PortalPrefixRedirect } from "@/components/portal/PortalPrefixRedirect";
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

import ExecutiveKPI from "./pages/ExecutiveKPI";
import InsightPage from "./pages/Insight";
import AvailableProperties from "./pages/AvailableProperties";
import Communications from "./pages/Communications";
import OwnersPage from "./pages/OwnersPage";
import MorososPage from "./pages/MorososPage";
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
import AgendaPage from "./pages/AgendaPage";

import TareasInternas from "./pages/TareasInternas";
import NotFound from "./pages/NotFound";
import AccessDenied from "./pages/AccessDenied";
import HelpCenter from "./pages/HelpCenter";
import NotificationsHistory from "./pages/NotificationsHistory";
import AuditFinanciero from "./pages/AuditFinanciero";
import RolesPermissions from "./pages/RolesPermissions";
import CentroControl from "./pages/CentroControl";
import ReporteActividad from "./pages/ReporteActividad";
import HistorialActualizaciones from "./pages/HistorialActualizaciones";
import ClientRequestsPage from "./pages/ClientRequestsPage";
import PrivatePropertiesPage from "./pages/PrivatePropertiesPage";
import PortalWebConfig from "./pages/PortalWebConfig";
import PortalLeads from "./pages/PortalLeads";
import BlogAdmin from "./pages/BlogAdmin";
import { lazy, Suspense } from "react";
import { PortalLayout } from "./components/portal/PortalLayout";
import { PortalErrorBoundary } from "./components/portal/PortalErrorBoundary";
import { Loader2 } from "lucide-react";

// Lazy-loaded portal pages for code-splitting
const PortalHome = lazy(() => import("./pages/portal/PortalHome"));
const PortalListings = lazy(() => import("./pages/portal/PortalListings"));
const PortalDetail = lazy(() => import("./pages/portal/PortalDetail"));
const PortalMap = lazy(() => import("./pages/portal/PortalMap"));
const PortalAgentProfile = lazy(() => import("./pages/portal/PortalAgentProfile"));
const PortalAgentsList = lazy(() => import("./pages/portal/PortalAgentsList"));
const PortalAbout = lazy(() => import("./pages/portal/PortalAbout"));
const PortalContact = lazy(() => import("./pages/portal/PortalContact"));
const PortalShowroom = lazy(() => import("./pages/portal/PortalShowroom"));
const PortalShowroomDetail = lazy(() => import("./pages/portal/PortalShowroomDetail"));
const PortalBlog = lazy(() => import("./pages/portal/PortalBlog"));
const PortalBlogPost = lazy(() => import("./pages/portal/PortalBlogPost"));
const PortalQuiz = lazy(() => import("./pages/portal/PortalQuiz"));
const ComparePage = lazy(() => import("./components/portal/PropertyCompare").then(m => ({ default: m.ComparePage })));

const PortalSuspense = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="flex justify-center items-center min-h-[40vh]"><Loader2 className="w-8 h-8 animate-spin text-[#00447C]" /></div>}>
    {children}
  </Suspense>
);

type AppRole = 'superadmin' | 'admin' | 'agent' | 'accounting' | 'secretaria';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof QueryLoopDetectedError) return false;
        if (error instanceof AuthExpiredError) return false;
        if (error instanceof Error && error.message.includes('QueryLoopGuard')) return false;
        // Don't retry on 401-style auth errors
        const msg = error instanceof Error ? error.message : '';
        if (msg.includes('JWT expired') || msg.includes('PGRST303') || msg.includes('Sesión expirada')) return false;
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 30_000,
    },
  },
});

// Wire up React Query → fetch telemetry so the loop guard can resolve the
// exact queryKey that's looping (origin debugging for SuperAdmin).
installQueryTelemetry(queryClient);

// Routes that agents cannot access (secretaria now has same access as gerente)
const AGENT_DENIED: AppRole[] = ['agent'];
const SUPERADMIN_ONLY: AppRole[] = ['admin', 'agent', 'accounting', 'secretaria'];
const ADMIN_PLUS_ONLY: AppRole[] = ['agent', 'secretaria'];
const AGENT_ONLY_DENIED: AppRole[] = ['agent'];

/** Shared portal child routes (reused for both /portal and / on portal domain) */
const portalChildren = (
  <>
    <Route index element={<PortalSuspense><PortalHome /></PortalSuspense>} />
    <Route path="propiedades" element={<PortalSuspense><PortalListings /></PortalSuspense>} />
    <Route path="propiedades/:id" element={<PortalSuspense><PortalDetail /></PortalSuspense>} />
    <Route path="mapa" element={<PortalSuspense><PortalMap /></PortalSuspense>} />
    <Route path="agentes" element={<PortalSuspense><PortalAgentsList /></PortalSuspense>} />
    <Route path="agentes/:id" element={<PortalSuspense><PortalAgentProfile /></PortalSuspense>} />
    <Route path="nosotros" element={<PortalSuspense><PortalAbout /></PortalSuspense>} />
    <Route path="contacto" element={<PortalSuspense><PortalContact /></PortalSuspense>} />
    <Route path="proyectos" element={<PortalSuspense><PortalShowroom /></PortalSuspense>} />
    <Route path="proyectos/:id" element={<PortalSuspense><PortalShowroomDetail /></PortalSuspense>} />
    <Route path="blog" element={<PortalSuspense><PortalBlog /></PortalSuspense>} />
    <Route path="blog/:slug" element={<PortalSuspense><PortalBlogPost /></PortalSuspense>} />
    <Route path="quiz" element={<PortalSuspense><PortalQuiz /></PortalSuspense>} />
    <Route path="comparar" element={<PortalSuspense><ComparePage /></PortalSuspense>} />
  </>
);

// Resetea el contador del loop guard al cambiar de ruta para que un loop
// disparado en una pantalla no quede arrastrado al navegar a otra.
const RouteLoopGuardReset = () => {
  const location = useLocation();
  useEffect(() => {
    resetQueryLoopGuard();
  }, [location.pathname]);
  return null;
};

const App = () => {
  const onPortalDomain = isPortalDomain();
  const onAdminDomain = isAdminDomain();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <OneSignalProvider />
              <QueryLoopBoundary>
                <RouteLoopGuardReset />
                <Routes>
                  {/*
                   * PORTAL DOMAIN (plusterra.com.py):
                   * - Portal routes mounted at root /
                   * - /portal/* redirects to /* (strip prefix)
                   * - Admin routes blocked
                   */}
                  {onPortalDomain && (
                    <>
                      <Route path="/" element={<PortalErrorBoundary><PortalLayout /></PortalErrorBoundary>}>
                        {portalChildren}
                      </Route>
                      {/* Redirect /portal/* → /* so old links still work */}
                      <Route path="/portal" element={<PortalPrefixRedirect />} />
                      <Route path="/portal/*" element={<PortalPrefixRedirect />} />
                      {/* Block admin routes on portal domain */}
                      <Route path="/login" element={<Navigate to="/" replace />} />
                      <Route path="*" element={<NotFound />} />
                    </>
                  )}

                  {/*
                   * ADMIN DOMAIN (pluspy.app):
                   * - /portal/* redirects to external plusterra.com.py
                   * - All admin routes work normally
                   */}
                  {onAdminDomain && (
                    <>
                      <Route path="/login" element={<Login />} />
                      <Route path="/acceso-denegado" element={<AccessDenied />} />
                      <Route path="/retiro-llave" element={<KeyWithdrawalPage />} />

                      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/propiedades" element={<Properties />} />
                        <Route path="/disponibles" element={<AvailableProperties />} />
                        <Route path="/comunicaciones" element={<Communications />} />
                        <Route path="/clientes" element={<ProtectedRoute denyRoles={AGENT_DENIED}><Clients /></ProtectedRoute>} />
                        <Route path="/finanzas" element={<ProtectedRoute denyRoles={AGENT_DENIED}><Finances /></ProtectedRoute>} />
                        <Route path="/mis-finanzas" element={<ProtectedRoute denyRoles={['admin', 'superadmin', 'accounting', 'secretaria'] as AppRole[]}><AgentFinances /></ProtectedRoute>} />
                        <Route path="/contratos" element={<Contracts />} />
                        <Route path="/agentes" element={<ProtectedRoute denyRoles={AGENT_ONLY_DENIED}><Agents /></ProtectedRoute>} />
                        <Route path="/proveedores" element={<ProtectedRoute denyRoles={AGENT_DENIED}><Providers /></ProtectedRoute>} />
                        <Route path="/mantenimiento" element={<ProtectedRoute denyRoles={AGENT_DENIED}><Maintenance /></ProtectedRoute>} />
                        <Route path="/configuracion" element={<ProtectedRoute denyRoles={ADMIN_PLUS_ONLY}><Settings /></ProtectedRoute>} />
                        <Route path="/mis-favoritos" element={<ProtectedRoute denyRoles={['admin', 'superadmin', 'accounting', 'secretaria'] as AppRole[]}><MyFavorites /></ProtectedRoute>} />
                        <Route path="/control-llaves" element={<ProtectedRoute denyRoles={['agent'] as AppRole[]}><KeyControlPage /></ProtectedRoute>} />
                        <Route path="/retiro-llaves" element={<ProtectedRoute denyRoles={['admin', 'superadmin', 'accounting', 'secretaria'] as AppRole[]}><KeyScannerPage /></ProtectedRoute>} />
                        <Route path="/kpi-ejecutivo" element={<ProtectedRoute denyRoles={SUPERADMIN_ONLY}><ExecutiveKPI /></ProtectedRoute>} />
                        <Route path="/insight" element={<ProtectedRoute denyRoles={SUPERADMIN_ONLY}><InsightPage /></ProtectedRoute>} />
                        <Route path="/propietarios" element={<ProtectedRoute denyRoles={AGENT_ONLY_DENIED}><OwnersPage /></ProtectedRoute>} />
                        <Route path="/propietarios/:id" element={<ProtectedRoute denyRoles={AGENT_ONLY_DENIED}><OwnerDetailPage /></ProtectedRoute>} />
                        <Route path="/edificios" element={<Buildings />} />
                        <Route path="/morosos" element={<ProtectedRoute denyRoles={AGENT_DENIED}><MorososPage /></ProtectedRoute>} />
                        <Route path="/edificios/:id" element={<BuildingDetailPage />} />
                        <Route path="/pipeline" element={<Pipeline />} />
                        <Route path="/mi-agenda" element={<ProtectedRoute denyRoles={['admin', 'superadmin', 'accounting', 'secretaria'] as AppRole[]}><AgendaPage /></ProtectedRoute>} />
                        <Route path="/mis-metas" element={<ProtectedRoute denyRoles={['admin', 'superadmin', 'accounting', 'secretaria'] as AppRole[]}><MisMetasPage /></ProtectedRoute>} />
                        <Route path="/mi-perfil-portal" element={<ProtectedRoute denyRoles={['admin', 'superadmin', 'accounting', 'secretaria'] as AppRole[]}><MyPortalProfile /></ProtectedRoute>} />
                        <Route path="/mi-plan" element={<ProtectedRoute denyRoles={['admin', 'superadmin', 'accounting', 'secretaria'] as AppRole[]}><MyPlanPage /></ProtectedRoute>} />
                        <Route path="/qa" element={<ProtectedRoute denyRoles={SUPERADMIN_ONLY}><QAChecklist /></ProtectedRoute>} />
                        <Route path="/portal-admin" element={<ProtectedRoute denyRoles={ADMIN_PLUS_ONLY}><PortalWebConfig /></ProtectedRoute>} />
                        <Route path="/portal-admin/leads" element={<ProtectedRoute denyRoles={AGENT_ONLY_DENIED}><PortalLeads /></ProtectedRoute>} />
                        <Route path="/portal-admin/blog" element={<ProtectedRoute denyRoles={ADMIN_PLUS_ONLY}><BlogAdmin /></ProtectedRoute>} />
                        <Route path="/roles-permisos" element={<ProtectedRoute denyRoles={SUPERADMIN_ONLY}><RolesPermissions /></ProtectedRoute>} />
                        <Route path="/centro-control" element={<ProtectedRoute denyRoles={SUPERADMIN_ONLY}><CentroControl /></ProtectedRoute>} />
                        <Route path="/reporte-actividad" element={<ProtectedRoute denyRoles={SUPERADMIN_ONLY}><ReporteActividad /></ProtectedRoute>} />
                        <Route path="/historial-actualizaciones" element={<ProtectedRoute denyRoles={SUPERADMIN_ONLY}><HistorialActualizaciones /></ProtectedRoute>} />
                        <Route path="/pedidos-clientes" element={<ClientRequestsPage />} />
                        <Route path="/cartera-privada" element={<ProtectedRoute denyRoles={SUPERADMIN_ONLY}><PrivatePropertiesPage /></ProtectedRoute>} />
                        <Route path="/notificaciones" element={<NotificationsHistory />} />
                        <Route path="/auditoria-financiera" element={<ProtectedRoute denyRoles={AGENT_DENIED}><AuditFinanciero /></ProtectedRoute>} />
                        <Route path="/tareas-internas" element={<ProtectedRoute denyRoles={AGENT_DENIED}><TareasInternas /></ProtectedRoute>} />
                        <Route path="/ayuda" element={<HelpCenter />} />
                        <Route path="/ayuda" element={<HelpCenter />} />
                      </Route>

                      {/* Redirect /portal/* to external portal domain */}
                      <Route path="/portal" element={<PortalPrefixRedirect />} />
                      <Route path="/portal/*" element={<PortalPrefixRedirect />} />
                      <Route path="*" element={<NotFound />} />
                    </>
                  )}

                  {/*
                   * DEV / PREVIEW domains (localhost, lovable.app, etc.):
                   * Everything works as before — both admin and portal
                   */}
                  {!onPortalDomain && !onAdminDomain && (
                    <>
                      <Route path="/login" element={<Login />} />
                      <Route path="/acceso-denegado" element={<AccessDenied />} />
                      <Route path="/retiro-llave" element={<KeyWithdrawalPage />} />

                      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/propiedades" element={<Properties />} />
                        <Route path="/disponibles" element={<AvailableProperties />} />
                        <Route path="/comunicaciones" element={<Communications />} />
                        <Route path="/clientes" element={<ProtectedRoute denyRoles={AGENT_DENIED}><Clients /></ProtectedRoute>} />
                        <Route path="/finanzas" element={<ProtectedRoute denyRoles={AGENT_DENIED}><Finances /></ProtectedRoute>} />
                        <Route path="/mis-finanzas" element={<ProtectedRoute denyRoles={['admin', 'superadmin', 'accounting', 'secretaria'] as AppRole[]}><AgentFinances /></ProtectedRoute>} />
                        <Route path="/contratos" element={<Contracts />} />
                        
                        <Route path="/agentes" element={<ProtectedRoute denyRoles={AGENT_ONLY_DENIED}><Agents /></ProtectedRoute>} />
                        <Route path="/proveedores" element={<ProtectedRoute denyRoles={AGENT_DENIED}><Providers /></ProtectedRoute>} />
                        <Route path="/mantenimiento" element={<ProtectedRoute denyRoles={AGENT_DENIED}><Maintenance /></ProtectedRoute>} />
                        <Route path="/configuracion" element={<ProtectedRoute denyRoles={ADMIN_PLUS_ONLY}><Settings /></ProtectedRoute>} />
                        <Route path="/mis-favoritos" element={<ProtectedRoute denyRoles={['admin', 'superadmin', 'accounting', 'secretaria'] as AppRole[]}><MyFavorites /></ProtectedRoute>} />
                        <Route path="/control-llaves" element={<ProtectedRoute denyRoles={['agent'] as AppRole[]}><KeyControlPage /></ProtectedRoute>} />
                        <Route path="/retiro-llaves" element={<ProtectedRoute denyRoles={['admin', 'superadmin', 'accounting', 'secretaria'] as AppRole[]}><KeyScannerPage /></ProtectedRoute>} />
                        <Route path="/kpi-ejecutivo" element={<ProtectedRoute denyRoles={SUPERADMIN_ONLY}><ExecutiveKPI /></ProtectedRoute>} />
                        <Route path="/insight" element={<ProtectedRoute denyRoles={SUPERADMIN_ONLY}><InsightPage /></ProtectedRoute>} />
                        <Route path="/propietarios" element={<ProtectedRoute denyRoles={AGENT_ONLY_DENIED}><OwnersPage /></ProtectedRoute>} />
                        <Route path="/propietarios/:id" element={<ProtectedRoute denyRoles={AGENT_ONLY_DENIED}><OwnerDetailPage /></ProtectedRoute>} />
                        <Route path="/edificios" element={<Buildings />} />
                        <Route path="/morosos" element={<ProtectedRoute denyRoles={AGENT_DENIED}><MorososPage /></ProtectedRoute>} />
                        <Route path="/edificios/:id" element={<BuildingDetailPage />} />
                        <Route path="/pipeline" element={<Pipeline />} />
                        <Route path="/mi-agenda" element={<ProtectedRoute denyRoles={['admin', 'superadmin', 'accounting', 'secretaria'] as AppRole[]}><AgendaPage /></ProtectedRoute>} />
                        <Route path="/mis-metas" element={<ProtectedRoute denyRoles={['admin', 'superadmin', 'accounting', 'secretaria'] as AppRole[]}><MisMetasPage /></ProtectedRoute>} />
                        <Route path="/mi-perfil-portal" element={<ProtectedRoute denyRoles={['admin', 'superadmin', 'accounting', 'secretaria'] as AppRole[]}><MyPortalProfile /></ProtectedRoute>} />
                        <Route path="/mi-plan" element={<ProtectedRoute denyRoles={['admin', 'superadmin', 'accounting', 'secretaria'] as AppRole[]}><MyPlanPage /></ProtectedRoute>} />
                        <Route path="/qa" element={<ProtectedRoute denyRoles={SUPERADMIN_ONLY}><QAChecklist /></ProtectedRoute>} />
                        <Route path="/portal-admin" element={<ProtectedRoute denyRoles={ADMIN_PLUS_ONLY}><PortalWebConfig /></ProtectedRoute>} />
                        <Route path="/portal-admin/leads" element={<ProtectedRoute denyRoles={AGENT_ONLY_DENIED}><PortalLeads /></ProtectedRoute>} />
                        <Route path="/portal-admin/blog" element={<ProtectedRoute denyRoles={ADMIN_PLUS_ONLY}><BlogAdmin /></ProtectedRoute>} />
                        <Route path="/roles-permisos" element={<ProtectedRoute denyRoles={SUPERADMIN_ONLY}><RolesPermissions /></ProtectedRoute>} />
                        <Route path="/centro-control" element={<ProtectedRoute denyRoles={SUPERADMIN_ONLY}><CentroControl /></ProtectedRoute>} />
                        <Route path="/reporte-actividad" element={<ProtectedRoute denyRoles={SUPERADMIN_ONLY}><ReporteActividad /></ProtectedRoute>} />
                        <Route path="/historial-actualizaciones" element={<ProtectedRoute denyRoles={SUPERADMIN_ONLY}><HistorialActualizaciones /></ProtectedRoute>} />
                        <Route path="/pedidos-clientes" element={<ClientRequestsPage />} />
                        <Route path="/cartera-privada" element={<ProtectedRoute denyRoles={SUPERADMIN_ONLY}><PrivatePropertiesPage /></ProtectedRoute>} />
                        <Route path="/notificaciones" element={<NotificationsHistory />} />
                        <Route path="/auditoria-financiera" element={<ProtectedRoute denyRoles={['agent', 'secretaria'] as AppRole[]}><AuditFinanciero /></ProtectedRoute>} />
                        <Route path="/tareas-internas" element={<ProtectedRoute denyRoles={AGENT_DENIED}><TareasInternas /></ProtectedRoute>} />
                        <Route path="/ayuda" element={<HelpCenter />} />
                      </Route>

                      {/* Portal Público — dev mode */}
                      <Route path="/portal" element={<PortalErrorBoundary><PortalLayout /></PortalErrorBoundary>}>
                        {portalChildren}
                      </Route>

                      <Route path="*" element={<NotFound />} />
                    </>
                  )}
                </Routes>
              </QueryLoopBoundary>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
