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

function logSupabaseError(step, error) {
  console.error(`[Social Accounts] ${step} falhou no Supabase:`, {
    message: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
  });
}

function normalizeScopes(scopes) {
  if (Array.isArray(scopes)) {
    return scopes.filter(Boolean).map(String);
  }

  if (typeof scopes === "string") {
    return scopes
      .split(/[,\s]+/)
      .map((scope) => scope.trim())
      .filter(Boolean);
  }

  return [];
}

export function sanitizeAccount(account) {
  return {
    id: account.id,
    provider: account.provider,
    platform: account.platform,
    account_id: account.account_id,
    provider_user_id: account.account_id || account.provider_user_id,
    username: account.username,
    display_name: account.display_name,
    avatar_url: account.avatar_url,
    status: account.status,
    connected_at: account.connected_at,
    created_at: account.created_at,
    updated_at: account.updated_at,
    expires_at: account.expires_at,
    refresh_expires_at: account.refresh_expires_at,
    scopes: account.scopes,
  };
}

function buildAccountRow({ userId, account }) {
  const now = new Date().toISOString();

  return {
    user_id: userId,
    provider: account.provider || "tiktok",
    platform: account.platform || account.provider || "tiktok",
    account_id: account.account_id || account.provider_user_id,
    provider_user_id: account.provider_user_id || account.account_id,
    username: account.username || account.display_name || null,
    display_name: account.display_name,
    avatar_url: account.avatar_url,
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    expires_at: account.expires_at,
    refresh_expires_at: account.refresh_expires_at,
    scopes: normalizeScopes(account.scopes),
    status: "connected",
    connected_at: account.connected_at || now,
    disconnected_at: null,
    raw_profile: account.raw_profile || null,
    raw_data: account.raw_data || null,
    updated_at: now,
  };
}

export async function saveConnectedAccount(userId, account) {
  assertSupabaseConfigured();

  const accountId = account.account_id || account.provider_user_id;
  if (!accountId) {
    console.error("[Social Accounts] salvar conta falhou: TikTok nao retornou account_id/open_id");
    throw new Error("TikTok nao retornou o identificador da conta.");
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("social_accounts")
    .upsert(buildAccountRow({ userId, account }), {
      onConflict: "user_id,provider,account_id",
    })
    .select(
      "id,provider,platform,account_id,provider_user_id,username,display_name,avatar_url,status,connected_at,created_at,updated_at,expires_at,refresh_expires_at,scopes",
    )
    .single();

  if (error) {
    logSupabaseError("salvar conta conectada", error);
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
      "id,provider,platform,account_id,provider_user_id,username,display_name,avatar_url,status,connected_at,created_at,updated_at,expires_at,refresh_expires_at,scopes",
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    logSupabaseError("listar contas conectadas", error);
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
    logSupabaseError("desconectar conta", error);
    throw new Error("Nao foi possivel desconectar a conta TikTok.");
  }

  return true;
}
