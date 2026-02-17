import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Check if any users exist
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

    if (!email || !password || !full_name) {
      return new Response(JSON.stringify({ error: "Faltan campos requeridos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create superadmin user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
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
      JSON.stringify({ success: true, message: "SuperAdmin creado exitosamente", user_id: newUser.user.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
