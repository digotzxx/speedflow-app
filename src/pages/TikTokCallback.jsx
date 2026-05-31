import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "../lib/apiClient";
import { supabase } from "../lib/supabase";
import {
  parseTikTokOAuthState,
  TIKTOK_CODE_VERIFIER_KEY,
  TIKTOK_MODE_KEY,
  TIKTOK_STATE_KEY,
} from "../lib/socialAuth";

const LOCAL_GROUPS_KEY = "socialflow_groups";
const LOCAL_ACCOUNTS_KEY = "socialflow_accounts";
const TIKTOK_REDIRECT_PATH = "/contas-sociais";
const handledCallbackKeys = new Set();

function readLocalList(key) {
  try {
    const stored = localStorage.getItem(key);
    const parsed = stored ? JSON.parse(stored) : [];

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalList(key, items) {
  localStorage.setItem(key, JSON.stringify(items));
}

function takeOAuthStorageValue(key) {
  const value = localStorage.getItem(key);
  localStorage.removeItem(key);

  return value;
}

async function readApiResponse(response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: text || "Resposta invalida do servidor." };
  }
}

async function exchangeTikTokCode({ code, state, scopes, codeVerifier, groupId, profileId }) {
  const response = await apiFetch("/api/auth/tiktok/callback", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify({
      code,
      state,
      scopes,
      code_verifier: codeVerifier,
      group_id: groupId || null,
      profile_id: profileId || null,
    }),
  });
  const payload = await readApiResponse(response);

  if (!response.ok) {
    throw new Error(
      payload.error_description ||
        payload.message ||
        payload.error ||
        "Erro ao finalizar conexao com TikTok.",
    );
  }

  return payload;
}

function redirectToSocialAccounts(navigate, delay = 1500) {
  window.setTimeout(() => navigate(TIKTOK_REDIRECT_PATH), delay);
}

function clearTikTokSession() {
  sessionStorage.removeItem(TIKTOK_STATE_KEY);
  sessionStorage.removeItem(TIKTOK_CODE_VERIFIER_KEY);
  sessionStorage.removeItem(TIKTOK_MODE_KEY);
  localStorage.removeItem(TIKTOK_STATE_KEY);
  localStorage.removeItem(TIKTOK_CODE_VERIFIER_KEY);
  localStorage.removeItem(TIKTOK_MODE_KEY);
}

function buildLocalAccount(account, selectedGroupId, oauthProfileId) {
  const accountId = account.account_id || account.provider_user_id;

  return {
    id: account.id || `tiktok-${accountId || Date.now()}`,
    platform: "TikTok Business",
    provider: "tiktok",
    account_id: accountId,
    provider_user_id: account.provider_user_id || accountId,
    display_name: account.display_name,
    username: account.username || account.display_name || "@tiktok_conectado",
    avatar_url: account.avatar_url || "",
    status: "Conectado",
    connection_status: account.status || "connected",
    group_id: selectedGroupId,
    profile_id: oauthProfileId || null,
    connected_at: new Date().toLocaleDateString("pt-BR"),
    connected_at_iso: account.connected_at || new Date().toISOString(),
    expires_at: account.expires_at || null,
    refresh_expires_at: account.refresh_expires_at || null,
    scopes: account.scopes || "",
    oauth_provider: "tiktok",
    oauth_code: null,
  };
}

export default function TikTokCallback() {
  const [status, setStatus] = useState("Conectando TikTok...");
  const [message, setMessage] = useState("Aguarde enquanto finalizamos a conexao.");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    async function handleCallback() {
      const callbackKey = searchParams.toString();
      if (handledCallbackKeys.has(callbackKey)) {
        return;
      }
      handledCallbackKeys.add(callbackKey);

      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");
      const scopes = searchParams.get("scopes");

      if (error) {
        setStatus("Falha na conexao com TikTok");
        setMessage(errorDescription || "O TikTok nao autorizou a conexao.");
        clearTikTokSession();
        redirectToSocialAccounts(navigate, 2500);
        return;
      }

      if (!code) {
        setStatus("Falha na conexao com TikTok");
        setMessage("Codigo de autorizacao nao encontrado na URL de retorno.");
        redirectToSocialAccounts(navigate, 2500);
        return;
      }

      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session?.user) {
          setStatus("Login necessario");
          setMessage("Entre na sua conta para concluir a conexao com TikTok.");
          navigate("/login", { replace: true, state: { from: { pathname: "/auth/callback/tiktok" } } });
          return;
        }

        const expectedState =
          sessionStorage.getItem(TIKTOK_STATE_KEY) || localStorage.getItem(TIKTOK_STATE_KEY);
        const parsedState = parseTikTokOAuthState(state);
        const codeVerifier =
          sessionStorage.getItem(TIKTOK_CODE_VERIFIER_KEY) || localStorage.getItem(TIKTOK_CODE_VERIFIER_KEY);
        const oauthMode =
          parsedState?.mode ||
          sessionStorage.getItem(TIKTOK_MODE_KEY) ||
          localStorage.getItem(TIKTOK_MODE_KEY) ||
          (expectedState?.startsWith("add_another.") ? "add_another" : "connect");

        if (!expectedState || expectedState !== state) {
          setStatus("Falha na conexao com TikTok");
          setMessage("Falha na validacao de seguranca. Inicie a conexao novamente.");
          redirectToSocialAccounts(navigate, 2500);
          return;
        }

        if (!codeVerifier) {
          setStatus("Falha na conexao com TikTok");
          setMessage("Sessao OAuth expirada. Clique em conectar TikTok novamente.");
          redirectToSocialAccounts(navigate, 2500);
          return;
        }

        setStatus("Conectando TikTok...");
        setMessage("Trocando codigo de autorizacao pelo access token.");
        const oauthGroupId = takeOAuthStorageValue("tiktok_oauth_group_id");
        const oauthProfileId = takeOAuthStorageValue("tiktok_oauth_profile_id");
        const selectedProfileId = parsedState?.profileId || oauthProfileId || null;
        const selectedGroupIdFromState = parsedState?.groupId || oauthGroupId || null;
        const payload = await exchangeTikTokCode({
          code,
          state,
          scopes,
          codeVerifier,
          groupId: selectedGroupIdFromState,
          profileId: selectedProfileId,
        });
        clearTikTokSession();

        const existingGroups = readLocalList(LOCAL_GROUPS_KEY);
        const existingAccounts = readLocalList(LOCAL_ACCOUNTS_KEY);
        const defaultGroup = {
          id: 1,
          name: "Grupo Principal",
          description: "Contas principais do negocio",
        };
        const groups = existingGroups.length > 0 ? existingGroups : [defaultGroup];
        const selectedGroupId = selectedGroupIdFromState || groups[0].id;
        const account = buildLocalAccount(payload.account || {}, selectedGroupId, selectedProfileId);
        const accountsWithoutDuplicate = existingAccounts.filter(
          (currentAccount) =>
            String(currentAccount.account_id || "") !== String(account.account_id || "") &&
            String(currentAccount.provider_user_id || "") !== String(account.provider_user_id || "") &&
            String(currentAccount.id) !== String(account.id),
        );

        writeLocalList(LOCAL_GROUPS_KEY, groups);
        writeLocalList(LOCAL_ACCOUNTS_KEY, [account, ...accountsWithoutDuplicate]);

        const successTitle = payload.title || (
          payload.action === "updated"
            ? "Essa conta TikTok ja estava conectada"
            : "Nova conta TikTok conectada com sucesso"
        );
        const successMessage = payload.message || (
          payload.action === "updated"
            ? "O TikTok retornou o mesmo perfil ja salvo. Para adicionar outra conta, use janela anonima, outro navegador ou outro perfil do Chrome."
            : "Esse perfil foi salvo como uma nova conta TikTok no SpeedFlow."
        );

        setStatus(successTitle);
        setMessage(`${successMessage} Redirecionando para Contas Sociais...`);
        redirectToSocialAccounts(navigate, oauthMode === "add_another" ? 2200 : 1500);
      } catch (callbackError) {
        console.error("TikTok callback error:", callbackError);
        setStatus("Falha na conexao com TikTok");
        setMessage(
          callbackError instanceof Error
            ? callbackError.message
            : "Erro ao conectar TikTok.",
        );
        redirectToSocialAccounts(navigate, 3000);
      }
    }

    handleCallback();
  }, [navigate, searchParams]);

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="auth-top">
          <h1>{status}</h1>
          <p>{message}</p>
        </div>

        <div className="auth-actions">
          <Link to={TIKTOK_REDIRECT_PATH} className="button primary">
            Voltar para Contas Sociais
          </Link>
        </div>
      </div>
    </div>
  );
}
