import { Outlet } from "react-router-dom";
import { PortalHeader } from "./PortalHeader";
import { PortalFooter } from "./PortalFooter";
import { PortalMaintenancePage } from "./PortalMaintenancePage";
import { ContactWidget } from "./ContactWidget";
import { CompareBar } from "./PropertyCompare";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalTracking } from "@/hooks/usePortalTracking";

export const PortalLayout = () => {
  usePortalTracking();

  const { data } = useQuery({
    queryKey: ["portal-maintenance"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("portal_settings")
          .select("maintenance_mode, maintenance_whatsapp, contact_phone, hero_title_font, system_suspended")
          .limit(1)
          .single();
        if (error) throw error;
        return data as unknown as {
          maintenance_mode: boolean;
          maintenance_whatsapp: string;
          contact_phone: string | null;
          hero_title_font: string | null;
          system_suspended: boolean;
        };
      } catch (e) {
        console.error("[PortalLayout] Settings fetch error:", e);
        return {
          maintenance_mode: false,
          maintenance_whatsapp: "",
          contact_phone: null,
          hero_title_font: "Ubuntu",
          system_suspended: false,
        };
      }
    },
    staleTime: 30 * 1000,
    retry: 1,
  });

  if (data?.system_suspended) {
    return <PortalMaintenancePage systemSuspended={true} />;
  }

  if (data?.maintenance_mode) {
    return <PortalMaintenancePage whatsapp={data.maintenance_whatsapp || data.contact_phone || undefined} />;
  }

  const portalFont = data?.hero_title_font || "Ubuntu";

  return (
    <div
      className="portal-light min-h-screen flex flex-col bg-background text-foreground animate-fade-in"
      style={{ fontFamily: `'${portalFont}', sans-serif` }}
    >
      <PortalHeader />
      <main className="flex-1 bg-background">
        <Outlet />
      </main>
      <PortalFooter />
      <ContactWidget />
      <CompareBar />
    </div>
  );
};
