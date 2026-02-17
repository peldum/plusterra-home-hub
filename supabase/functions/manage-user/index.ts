import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is admin/superadmin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (!caller) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    if (!callerRole || !["superadmin", "admin"].includes(callerRole.role)) {
      return new Response(JSON.stringify({ error: "Solo administradores pueden gestionar usuarios" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, user_id, full_name, phone, role, status } = await req.json();

    if (!action || !user_id) {
      return new Response(JSON.stringify({ error: "Faltan campos requeridos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      // Update profile
      const profileUpdate: Record<string, string> = {};
      if (full_name) profileUpdate.full_name = full_name;
      if (phone !== undefined) profileUpdate.phone = phone || null;
      if (status) profileUpdate.status = status;

      if (Object.keys(profileUpdate).length > 0) {
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update(profileUpdate)
          .eq("id", user_id);
        if (profileError) throw profileError;
      }

      // Update role if provided
      if (role) {
        const { error: roleError } = await supabaseAdmin
          .from("user_roles")
          .update({ role })
          .eq("user_id", user_id);
        if (roleError) throw roleError;
      }

      // If blocking, also ban the user in auth
      if (status === "blocked") {
        await supabaseAdmin.auth.admin.updateUserById(user_id, { ban_duration: "876000h" }); // ~100 years
      } else if (status === "active") {
        await supabaseAdmin.auth.admin.updateUserById(user_id, { ban_duration: "none" });
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete") {
      // Check for linked contracts
      const { count: contractCount } = await supabaseAdmin
        .from("contracts")
        .select("*", { count: "exact", head: true })
        .or(`created_by.eq.${user_id},responsible_agent_id.eq.${user_id}`);

      if ((contractCount ?? 0) > 0) {
        return new Response(
          JSON.stringify({ error: "No se puede eliminar: el agente tiene contratos vinculados. Use 'Bloquear' en su lugar." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check for linked commissions
      const { count: commissionCount } = await supabaseAdmin
        .from("commissions")
        .select("*", { count: "exact", head: true })
        .eq("agent_id", user_id);

      if ((commissionCount ?? 0) > 0) {
        return new Response(
          JSON.stringify({ error: "No se puede eliminar: el agente tiene comisiones vinculadas. Use 'Bloquear' en su lugar." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check for linked properties
      const { count: propCount } = await supabaseAdmin
        .from("properties")
        .select("*", { count: "exact", head: true })
        .eq("captor_agent_id", user_id);

      if ((propCount ?? 0) > 0) {
        return new Response(
          JSON.stringify({ error: "No se puede eliminar: el agente tiene propiedades vinculadas. Use 'Bloquear' en su lugar." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Safe to delete
      await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id);
      await supabaseAdmin.from("profiles").delete().eq("id", user_id);
      await supabaseAdmin.auth.admin.deleteUser(user_id);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Acción no válida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
