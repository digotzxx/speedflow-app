import { getSupabaseAdmin } from "./_supabaseAdmin.js";
import { sendJson } from "./_socialAccountsStore.js";

export async function requireUser(req, res) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

  if (!token) {
    sendJson(res, 401, {
      success: false,
      message: "Usuario nao autenticado.",
    });
    return null;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      sendJson(res, 401, {
        success: false,
        message: "Sessao invalida ou expirada.",
      });
      return null;
    }

    return data.user;
  } catch (error) {
    sendJson(res, 500, {
      success: false,
      message:
        error instanceof Error && error.message === "Supabase admin env vars missing"
          ? "Banco de dados nao configurado. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY na Vercel."
          : "Nao foi possivel validar sua sessao.",
    });
    return null;
  }
}
