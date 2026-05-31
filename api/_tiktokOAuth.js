import {
  saveConnectedAccount,
  sendJson,
  sendNoContent,
} from "./_socialAccountsStore.js";
import { requireUser } from "./_auth.js";

const TIKTOK_TOKEN_ENDPOINT = "https://open.tiktokapis.com/v2/oauth/token/";
const TIKTOK_USER_INFO_ENDPOINT = "https://open.tiktokapis.com/v2/user/info/";
const CODE_VERIFIER_PATTERN = /^[A-Za-z0-9\-._~]{43,128}$/;
const USER_INFO_FIELDS = "open_id,union_id,avatar_url,display_name";

function mask(value) {
  if (!value) return null;
  if (value.length <= 10) return "********";

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

async function parseBody(req) {
  if (req.body) {
    if (typeof req.body === "string") {
      try {
        return JSON.parse(req.body);
      } catch {
        return {};
      }
    }

    return req.body;
  }

  return new Promise((resolve, reject) => {
    let rawBody = "";

    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      rawBody += chunk;
      if (rawBody.length > 100_000) {
        reject(new Error("Corpo da requisicao muito grande."));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(rawBody ? JSON.parse(rawBody) : {});
      } catch {
        reject(new Error("JSON invalido."));
      }
    });
    req.on("error", reject);
  });
}

function getTikTokConfig() {
  return {
    clientKey: process.env.TIKTOK_CLIENT_KEY || "",
    clientSecret: process.env.TIKTOK_CLIENT_SECRET || "",
    redirectUri: process.env.TIKTOK_REDIRECT_URI || "",
  };
}

function validateConfig(config) {
  const missing = [];

  if (!config.clientKey) missing.push("TIKTOK_CLIENT_KEY");
  if (!config.clientSecret) missing.push("TIKTOK_CLIENT_SECRET");
  if (!config.redirectUri) missing.push("TIKTOK_REDIRECT_URI");

  return missing;
}

function mapTikTokError(error, errorDescription = "") {
  const normalized = `${error || ""} ${errorDescription || ""}`.toLowerCase();

  if (normalized.includes("invalid_client")) {
    return "Client Key ou Client Secret do TikTok esta incorreto.";
  }

  if (normalized.includes("redirect_uri") || normalized.includes("redirect uri")) {
    return "A Redirect URI do TikTok esta diferente da configurada no painel.";
  }

  if (normalized.includes("invalid_grant")) {
    return "O codigo de autorizacao expirou, ja foi usado ou o PKCE esta incorreto.";
  }

  if (normalized.includes("scope_not_authorized") || normalized.includes("scope")) {
    return "O app TikTok ainda nao tem aprovacao para uma ou mais permissoes solicitadas.";
  }

  return "Erro ao trocar codigo por token do TikTok.";
}

async function readTikTokResponse(response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: "invalid_response", error_description: text || "Resposta invalida do TikTok." };
  }
}

async function exchangeCodeForToken({ code, codeVerifier, config }) {
  const tokenBody = new URLSearchParams({
    client_key: config.clientKey,
    client_secret: config.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: config.redirectUri,
    code_verifier: codeVerifier,
  });

  const tokenResponse = await fetch(TIKTOK_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cache-Control": "no-cache",
    },
    body: tokenBody,
  });
  const tokenData = await readTikTokResponse(tokenResponse);

  if (!tokenResponse.ok || tokenData.error) {
    return {
      ok: false,
      status: tokenResponse.ok ? 400 : tokenResponse.status,
      data: tokenData,
    };
  }

  return { ok: true, status: 200, data: tokenData };
}

async function fetchTikTokUserInfo(accessToken) {
  const userResponse = await fetch(`${TIKTOK_USER_INFO_ENDPOINT}?fields=${USER_INFO_FIELDS}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const userData = await readTikTokResponse(userResponse);

  if (!userResponse.ok || (userData.error && userData.error.code !== "ok")) {
    return {
      ok: false,
      status: userResponse.ok ? 400 : userResponse.status,
      data: userData,
    };
  }

  return { ok: true, status: 200, data: userData };
}

function buildConnectedAccount({ tokenData, user, scopes }) {
  const now = Date.now();
  const expiresAt = tokenData.expires_in
    ? new Date(now + tokenData.expires_in * 1000).toISOString()
    : null;
  const refreshExpiresAt = tokenData.refresh_expires_in
    ? new Date(now + tokenData.refresh_expires_in * 1000).toISOString()
    : null;

  return {
    id: `tiktok-${user.open_id || tokenData.open_id || now}`,
    provider: "tiktok",
    provider_user_id: user.open_id || tokenData.open_id || "",
    union_id: user.union_id || tokenData.union_id || null,
    display_name: user.display_name || "TikTok conectado",
    avatar_url: user.avatar_url || "",
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: expiresAt,
    refresh_expires_at: refreshExpiresAt,
    scopes: scopes || tokenData.scope || tokenData.scopes || "",
    connected_at: new Date(now).toISOString(),
    status: "connected",
    raw_profile: user,
  };
}

export async function handleTikTokOAuthCallback(req, res) {
  if (req.method === "OPTIONS") {
    sendNoContent(res);
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { success: false, message: "Metodo nao permitido." });
    return;
  }

  try {
    const body = await parseBody(req);
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const codeVerifier = typeof body.code_verifier === "string" ? body.code_verifier.trim() : "";
    const scopes = typeof body.scopes === "string" ? body.scopes : "";
    const config = getTikTokConfig();
    const missingConfig = validateConfig(config);

    console.log("[TikTok OAuth] callback recebido");
    console.log("[TikTok OAuth] code presente:", Boolean(code));
    console.log("[TikTok OAuth] code_verifier presente:", Boolean(codeVerifier));
    console.log("[TikTok OAuth] redirect_uri:", config.redirectUri || null);

    if (!code) {
      sendJson(res, 400, { success: false, message: "Parametro code ausente." });
      return;
    }

    if (!codeVerifier) {
      sendJson(res, 400, {
        success: false,
        message: "Sessao OAuth expirada. Tente conectar novamente.",
      });
      return;
    }

    if (!CODE_VERIFIER_PATTERN.test(codeVerifier)) {
      sendJson(res, 400, {
        success: false,
        message: "code_verifier invalido para o fluxo PKCE.",
      });
      return;
    }

    const userSession = await requireUser(req, res);
    if (!userSession) return;

    if (missingConfig.length > 0) {
      sendJson(res, 500, {
        success: false,
        message: "Variaveis de ambiente do TikTok ausentes no backend.",
        missing: missingConfig,
      });
      return;
    }

    const tokenResult = await exchangeCodeForToken({ code, codeVerifier, config });

    if (!tokenResult.ok) {
      const tokenData = tokenResult.data;
      sendJson(res, 400, {
        success: false,
        message: mapTikTokError(tokenData?.error, tokenData?.error_description),
        error: tokenData?.error,
        error_description: tokenData?.error_description,
        log_id: tokenData?.log_id,
      });
      return;
    }

    const tokenData = tokenResult.data;
    console.log("[TikTok OAuth] access_token recebido:", mask(tokenData.access_token));
    console.log("[TikTok OAuth] refresh_token recebido:", mask(tokenData.refresh_token));

    if (!tokenData.access_token) {
      sendJson(res, 400, {
        success: false,
        message: "TikTok nao retornou access_token.",
      });
      return;
    }

    const userResult = await fetchTikTokUserInfo(tokenData.access_token);

    if (!userResult.ok) {
      const userError = userResult.data?.error || {};
      sendJson(res, 400, {
        success: false,
        message: mapTikTokError(userError.code, userError.message),
        error: userError.code,
        error_description: userError.message,
        log_id: userError.log_id,
      });
      return;
    }

    const user = userResult.data?.data?.user || {};
    const account = buildConnectedAccount({ tokenData, user, scopes });

    const publicAccount = await saveConnectedAccount(userSession.id, account);

    sendJson(res, 200, {
      success: true,
      message: "TikTok conectado com sucesso.",
      account: publicAccount,
    });
  } catch (error) {
    sendJson(res, 500, {
      success: false,
      message: error instanceof Error ? error.message : "Falha ao concluir OAuth do TikTok.",
    });
  }
}
