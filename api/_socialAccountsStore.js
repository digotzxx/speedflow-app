import { getSupabaseAdmin, hasSupabaseAdminEnv } from "./_supabaseAdmin.js";

function assertSupabaseConfigured() {
  if (hasSupabaseAdminEnv()) return;

  throw new Error(
    "Banco de dados nao configurado. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY na Vercel.",
  );
}

export function sendJson(res, statusCode, payload) {
  if (typeof res.status === "function") {
    res.status(statusCode).json(payload);
    return;
  }

  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

export function sendNoContent(res) {
  res.statusCode = 204;
  res.end();
}

export function sanitizeAccount(account) {
  return {
    id: account.id,
    provider: account.provider,
    provider_user_id: account.provider_user_id,
    display_name: account.display_name,
    avatar_url: account.avatar_url,
    status: account.status,
    connected_at: account.connected_at,
    expires_at: account.expires_at,
    refresh_expires_at: account.refresh_expires_at,
    scopes: account.scopes,
  };
}

function buildAccountRow({ userId, account }) {
  const now = new Date().toISOString();

  return {
    user_id: userId,
    provider: account.provider,
    provider_user_id: account.provider_user_id,
    display_name: account.display_name,
    avatar_url: account.avatar_url,
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    expires_at: account.expires_at,
    refresh_expires_at: account.refresh_expires_at,
    scopes: account.scopes,
    status: "connected",
    connected_at: account.connected_at || now,
    disconnected_at: null,
    raw_profile: account.raw_profile || null,
    updated_at: now,
  };
}

export async function saveConnectedAccount(userId, account) {
  assertSupabaseConfigured();

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("social_accounts")
    .upsert(buildAccountRow({ userId, account }), {
      onConflict: "user_id,provider,provider_user_id",
    })
    .select(
      "id,provider,provider_user_id,display_name,avatar_url,status,connected_at,expires_at,refresh_expires_at,scopes",
    )
    .single();

  if (error) {
    console.error("[Social Accounts] erro ao salvar no Supabase:", error.message);
    throw new Error("Conta TikTok autorizada, mas houve erro ao salvar no banco.");
  }

  return sanitizeAccount(data);
}

export async function listConnectedAccounts(userId) {
  assertSupabaseConfigured();

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("social_accounts")
    .select(
      "id,provider,provider_user_id,display_name,avatar_url,status,connected_at,expires_at,refresh_expires_at,scopes",
    )
    .eq("user_id", userId)
    .order("connected_at", { ascending: false });

  if (error) {
    console.error("[Social Accounts] erro ao listar no Supabase:", error.message);
    throw new Error("Nao foi possivel carregar as contas conectadas.");
  }

  return (data || []).map(sanitizeAccount);
}

export async function disconnectProvider(userId, provider) {
  assertSupabaseConfigured();

  const now = new Date().toISOString();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("social_accounts")
    .update({
      status: "disconnected",
      access_token: null,
      refresh_token: null,
      disconnected_at: now,
      updated_at: now,
    })
    .eq("user_id", userId)
    .eq("provider", provider);

  if (error) {
    console.error("[Social Accounts] erro ao desconectar no Supabase:", error.message);
    throw new Error("Nao foi possivel desconectar a conta TikTok.");
  }

  return true;
}
