import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Bootstrap: create initial superadmin user
// This should only work when there are NO users in the system
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // SECURITY: Check if any users exist — if they do, this endpoint is disabled
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true });

    if (count && count > 0) {
      return new Response(
        JSON.stringify({ error: "El sistema ya tiene usuarios. Use la función create-user." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, password, full_name } = await req.json();

    // SECURITY: Validate all inputs
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Email inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!full_name || typeof full_name !== "string" || full_name.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Nombre completo requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return new Response(JSON.stringify({ error: "La contraseña debe tener al menos 8 caracteres" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate password strength
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasUppercase || !hasLowercase || !hasNumber) {
      return new Response(JSON.stringify({ error: "La contraseña debe contener mayúsculas, minúsculas y números" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create superadmin user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name.trim() },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Assign superadmin role
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUser.user.id, role: "superadmin" });

    return new Response(
      JSON.stringify({ success: true, message: "SuperAdmin creado exitosamente" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
