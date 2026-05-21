import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_ROLES = ["superadmin", "admin", "agent", "accounting", "secretaria"];
const VALID_STATUSES = ["active", "blocked"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // SECURITY: Require auth
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

    if (!callerRole || !["superadmin", "admin", "accounting", "secretaria"].includes(callerRole.role)) {
      return new Response(JSON.stringify({ error: "No tiene permisos para gestionar usuarios" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, user_id } = body;

    // SECURITY: Validate action and user_id
    if (!action || !["update", "delete"].includes(action)) {
      return new Response(JSON.stringify({ error: "Acción no válida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!user_id || typeof user_id !== "string") {
      return new Response(JSON.stringify({ error: "user_id requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SECURITY: Prevent self-modification of role/status
    if (user_id === caller.id && (body.role || body.status)) {
      return new Response(JSON.stringify({ error: "No puede modificar su propio rol o estado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SECURITY: Check target user's role for privilege escalation prevention
    const { data: targetRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user_id)
      .single();

    // Non-superadmin cannot modify superadmin users
    if (callerRole.role !== "superadmin" && targetRole?.role === "superadmin") {
      return new Response(JSON.stringify({ error: "No puede modificar un SuperAdmin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      const { full_name, phone, role, status, monthly_fee, birth_date } = body;

      // SECURITY: secretaria/accounting cannot change role or status (silently ignored)
      const canChangeRoleStatus = ["superadmin", "admin"].includes(callerRole.role);

      // SECURITY: Validate inputs
      if (full_name && (typeof full_name !== "string" || full_name.length > 100)) {
        return new Response(JSON.stringify({ error: "Nombre inválido" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (phone !== undefined && phone !== null && typeof phone !== "string") {
        return new Response(JSON.stringify({ error: "Teléfono inválido" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (role && !VALID_ROLES.includes(role)) {
        return new Response(JSON.stringify({ error: "Rol inválido" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // SECURITY: Only superadmin can assign superadmin/admin roles
      if (role && ["superadmin", "admin"].includes(role) && callerRole.role !== "superadmin") {
        return new Response(JSON.stringify({ error: "Solo SuperAdmin puede asignar roles Admin o SuperAdmin" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (status && !VALID_STATUSES.includes(status)) {
        return new Response(JSON.stringify({ error: "Estado inválido" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (monthly_fee !== undefined && (typeof monthly_fee !== "number" || monthly_fee < 0 || monthly_fee > 999999)) {
        return new Response(JSON.stringify({ error: "Canon mensual inválido" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (birth_date !== undefined && birth_date !== null && birth_date !== "") {
        if (typeof birth_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(birth_date)) {
          return new Response(JSON.stringify({ error: "Fecha de nacimiento inválida" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Update profile
      const profileUpdate: Record<string, any> = {};
      if (full_name) profileUpdate.full_name = full_name.trim();
      if (phone !== undefined) profileUpdate.phone = phone ? phone.trim() : null;
      if (status) profileUpdate.status = status;
      if (monthly_fee !== undefined) profileUpdate.monthly_fee = monthly_fee;
      if (birth_date !== undefined) profileUpdate.birth_date = birth_date || null;

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
        await supabaseAdmin.auth.admin.updateUserById(user_id, { ban_duration: "876000h" });
      } else if (status === "active") {
        await supabaseAdmin.auth.admin.updateUserById(user_id, { ban_duration: "none" });
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete") {
      // SECURITY: Cannot delete superadmin
      if (targetRole?.role === "superadmin") {
        return new Response(JSON.stringify({ error: "No se puede eliminar un SuperAdmin" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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
    console.error("manage-user error:", error);
    return new Response(JSON.stringify({ error: (error as Error)?.message || "Error interno del servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
