import { supabase } from "./supabase";

const DEFAULT_APP_URL = "https://compra-garantida.store";
const APP_URL = (import.meta.env.VITE_APP_URL || DEFAULT_APP_URL).replace(/\/$/, "");

const INSTAGRAM_CLIENT_ID = import.meta.env.VITE_INSTAGRAM_CLIENT_ID;
export const TIKTOK_CLIENT_KEY = import.meta.env.VITE_TIKTOK_CLIENT_KEY || "sbaw8xtug27cw6f5jl";
export const TIKTOK_REDIRECT_URI = `${APP_URL}/auth/callback/tiktok`;
// video.list e video.upload precisam estar aprovados no TikTok Developer para funcionarem em producao.
export const TIKTOK_SCOPE = "user.info.basic,video.list,video.upload";
export const TIKTOK_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
export const TIKTOK_STATE_KEY = "tiktok_oauth_state";
export const TIKTOK_CODE_VERIFIER_KEY = "tiktok_code_verifier";
export const TIKTOK_MODE_KEY = "tiktok_oauth_mode";

function base64UrlEncode(value) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function createCodeVerifier() {
  const randomValues = crypto.getRandomValues(new Uint8Array(64));

  return base64UrlEncode(randomValues);
}

function encodeOAuthState(payload) {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);

  return base64UrlEncode(bytes);
}

export function parseTikTokOAuthState(state) {
  if (!state) return null;

  if (state.startsWith("add_another.") || state.startsWith("connect.")) {
    const [mode, nonce] = state.split(".");

    return { mode, nonce };
  }

  try {
    const normalized = state.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

async function createCodeChallenge(codeVerifier) {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(codeVerifier));

  return base64UrlEncode(digest);
}

async function createTikTokPkcePair() {
  const codeVerifier = createCodeVerifier();
  const codeChallenge = await createCodeChallenge(codeVerifier);

  return { codeVerifier, codeChallenge };
}

function saveOAuthContext(provider, context) {
  const groupKey = `${provider}_oauth_group_id`;
  const profileKey = `${provider}_oauth_profile_id`;

  localStorage.removeItem(groupKey);
  localStorage.removeItem(profileKey);

  if (context.groupId !== undefined && context.groupId !== null && context.groupId !== "") {
    localStorage.setItem(groupKey, String(context.groupId));
  }

  if (context.profileId !== undefined && context.profileId !== null && context.profileId !== "") {
    localStorage.setItem(profileKey, String(context.profileId));
  }
}

export function buildTikTokAuthorizationUrl(state, codeChallenge) {
  const params = new URLSearchParams({
    client_key: TIKTOK_CLIENT_KEY,
    scope: TIKTOK_SCOPE,
    response_type: "code",
    redirect_uri: TIKTOK_REDIRECT_URI,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return `${TIKTOK_AUTH_URL}?${params.toString()}`;
}

export function getTikTokAddAnotherStartUrl() {
  return `${APP_URL}/contas-sociais?start_tiktok=add_another`;
}

export async function connectInstagram(context = {}) {
  if (!INSTAGRAM_CLIENT_ID) {
    alert("Falta configurar VITE_INSTAGRAM_CLIENT_ID no arquivo .env");
    return;
  }

  const redirectUri = `${APP_URL}/auth/callback/instagram`;
  const csrfState = crypto.randomUUID();
  localStorage.setItem("instagram_oauth_state", csrfState);
  saveOAuthContext("instagram", context);

  const params = new URLSearchParams({
    client_id: INSTAGRAM_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "instagram_basic,instagram_content_publish,instagram_manage_insights,instagram_manage_comments",
    state: csrfState,
  });

  window.location.href = `https://www.facebook.com/v16.0/dialog/oauth?${params.toString()}`;
}

export async function connectTikTok(context = {}) {
  if (!TIKTOK_CLIENT_KEY) {
    alert("Falta configurar VITE_TIKTOK_CLIENT_KEY no arquivo .env");
    return;
  }

  const shouldOpenPopup = context.openInPopup || context.openInNewWindow;
  const authWindow = shouldOpenPopup
    ? window.open("about:blank", "tiktok_oauth", "width=520,height=760,noopener,noreferrer")
    : null;

  if (authWindow) {
    authWindow.opener = null;
  }

  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) {
    authWindow?.close();
    alert("Entre na sua conta antes de conectar o TikTok.");
    window.location.href = "/login";
    return;
  }

  const mode = context.mode === "add_another" ? "add_another" : "connect";
  const csrfState = encodeOAuthState({
    mode,
    groupId: context.groupId || null,
    profileId: context.profileId || null,
    nonce: crypto.randomUUID(),
  });
  const { codeVerifier, codeChallenge } = await createTikTokPkcePair();

  localStorage.removeItem(TIKTOK_STATE_KEY);
  localStorage.removeItem(TIKTOK_MODE_KEY);
  sessionStorage.setItem(TIKTOK_STATE_KEY, csrfState);
  sessionStorage.setItem(TIKTOK_CODE_VERIFIER_KEY, codeVerifier);
  sessionStorage.setItem(TIKTOK_MODE_KEY, mode);
  localStorage.setItem(TIKTOK_STATE_KEY, csrfState);
  localStorage.setItem(TIKTOK_CODE_VERIFIER_KEY, codeVerifier);
  localStorage.setItem(TIKTOK_MODE_KEY, mode);
  saveOAuthContext("tiktok", context);

  const oauthUrl = buildTikTokAuthorizationUrl(csrfState, codeChallenge);

  if (authWindow) {
    authWindow.location.href = oauthUrl;
    return;
  }

  window.location.href = oauthUrl;
}

export async function startTikTokAuth(context = {}) {
  return connectTikTok(context);
}
