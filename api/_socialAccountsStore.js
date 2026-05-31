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

function sanitizeProfileAccountLink(link) {
  const socialAccount = Array.isArray(link.social_accounts)
    ? link.social_accounts[0]
    : link.social_accounts;

  return {
    id: link.id,
    user_id: link.user_id,
    group_id: link.group_id,
    profile_id: link.profile_id,
    social_account_id: link.social_account_id,
    provider: link.provider,
    created_at: link.created_at,
    updated_at: link.updated_at,
    account: socialAccount ? sanitizeAccount(socialAccount) : null,
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
  let wasExisting = false;
  const { data: existingAccount, error: existingError } = await supabase
    .from("social_accounts")
    .select("id")
    .eq("user_id", userId)
    .eq("provider", account.provider || "tiktok")
    .eq("account_id", accountId)
    .maybeSingle();

  if (existingError) {
    logSupabaseError("verificar conta conectada existente", existingError);
  } else {
    wasExisting = Boolean(existingAccount);
  }

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

  return {
    ...sanitizeAccount(data),
    was_existing: wasExisting,
    action: wasExisting ? "updated" : "created",
  };
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

export async function listProfileAccountLinks(userId, profileId = null) {
  assertSupabaseConfigured();

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("social_profile_accounts")
    .select(
      `
      id,user_id,group_id,profile_id,social_account_id,provider,created_at,updated_at,
      social_accounts (
        id,provider,platform,account_id,provider_user_id,username,display_name,avatar_url,status,connected_at,created_at,updated_at,expires_at,refresh_expires_at,scopes
      )
    `,
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (profileId) {
    query = query.eq("profile_id", profileId);
  }

  const { data, error } = await query;

  if (error) {
    logSupabaseError("listar vinculos de perfil", error);
    throw new Error("Nao foi possivel carregar os vinculos dos perfis.");
  }

  return (data || []).map(sanitizeProfileAccountLink);
}

export async function linkAccountToProfile(userId, { groupId = null, profileId, socialAccountId, provider = "tiktok" }) {
  assertSupabaseConfigured();

  if (!profileId || !socialAccountId) {
    throw new Error("Perfil e conta social sao obrigatorios para criar o vinculo.");
  }

  const supabase = getSupabaseAdmin();
  const { data: account, error: accountError } = await supabase
    .from("social_accounts")
    .select("id,provider,status")
    .eq("id", socialAccountId)
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();

  if (accountError) {
    logSupabaseError("verificar conta social antes do vinculo", accountError);
    throw new Error("Nao foi possivel validar a conta TikTok escolhida.");
  }

  if (!account) {
    throw new Error("Conta TikTok nao encontrada para este usuario.");
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("social_profile_accounts")
    .upsert(
      {
        user_id: userId,
        group_id: groupId || null,
        profile_id: profileId,
        social_account_id: socialAccountId,
        provider,
        updated_at: now,
      },
      {
        onConflict: "user_id,profile_id,social_account_id",
      },
    )
    .select(
      `
      id,user_id,group_id,profile_id,social_account_id,provider,created_at,updated_at,
      social_accounts (
        id,provider,platform,account_id,provider_user_id,username,display_name,avatar_url,status,connected_at,created_at,updated_at,expires_at,refresh_expires_at,scopes
      )
    `,
    )
    .single();

  if (error) {
    logSupabaseError("criar vinculo de perfil", error);
    throw new Error("Nao foi possivel usar esta conta TikTok no perfil.");
  }

  return sanitizeProfileAccountLink(data);
}

export async function unlinkAccountFromProfile(userId, { id = null, profileId = null, socialAccountId = null }) {
  assertSupabaseConfigured();

  const supabase = getSupabaseAdmin();
  let query = supabase.from("social_profile_accounts").delete().eq("user_id", userId);

  if (id) {
    query = query.eq("id", id);
  } else if (profileId && socialAccountId) {
    query = query.eq("profile_id", profileId).eq("social_account_id", socialAccountId);
  } else {
    throw new Error("Informe o vinculo ou a conta do perfil para remover.");
  }

  const { error } = await query;

  if (error) {
    logSupabaseError("remover vinculo de perfil", error);
    throw new Error("Nao foi possivel remover a conta TikTok deste perfil.");
  }

  return true;
}

export async function disconnectProvider(userId, provider, accountId = null) {
  assertSupabaseConfigured();

  const now = new Date().toISOString();
  const supabase = getSupabaseAdmin();
  let query = supabase
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

  if (accountId) {
    query = query.eq("account_id", accountId);
  }

  const { error } = await query;

  if (error) {
    logSupabaseError("desconectar conta", error);
    throw new Error("Nao foi possivel desconectar a conta TikTok.");
  }

  return true;
}
