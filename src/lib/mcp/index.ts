import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchProperties from "./tools/search-properties";
import getProperty from "./tools/get-property";
import listContracts from "./tools/list-contracts";
import listPendingReceivables from "./tools/list-pending-receivables";
import listPipelineDeals from "./tools/list-pipeline-deals";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "plusterra-home-hub",
  title: "Plusterra Home Hub",
  version: "0.1.0",
  instructions:
    "Herramientas del sistema de gestión inmobiliaria Plusterra. Usá search_properties y get_property para el catálogo interno, list_contracts para contratos, list_pending_receivables para morosos y deudas pendientes, y list_pipeline_deals para oportunidades del CRM. Todos los datos respetan los permisos del usuario conectado.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchProperties, getProperty, listContracts, listPendingReceivables, listPipelineDeals],
});
