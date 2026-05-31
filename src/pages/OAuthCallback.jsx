import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

const LOCAL_GROUPS_KEY = "socialflow_groups";
const LOCAL_ACCOUNTS_KEY = "socialflow_accounts";
const handledCallbackKeys = new Set();

function loadLocalGroups() {
  try {
    const stored = localStorage.getItem(LOCAL_GROUPS_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function loadLocalAccounts() {
  try {
    const stored = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveLocalGroups(groups) {
  localStorage.setItem(LOCAL_GROUPS_KEY, JSON.stringify(groups));
}

function saveLocalAccounts(accounts) {
  localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
}

function getOAuthGroupId(provider) {
  const key = `${provider}_oauth_group_id`;
  const groupId = localStorage.getItem(key);
  localStorage.removeItem(key);

  return groupId;
}

function getOAuthProfileId(provider) {
  const key = `${provider}_oauth_profile_id`;
  const profileId = localStorage.getItem(key);
  localStorage.removeItem(key);

  return profileId;
}

async function saveAccountToSupabase(account) {
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    return;
  }

  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;

    if (!userId) return;

    const provider = account.oauth_provider || "instagram";
    const accountId = String(account.account_id || account.provider_user_id || account.id);
    const now = new Date().toISOString();

    await supabase.from("social_accounts").upsert(
      {
        user_id: userId,
        provider,
        platform: provider,
        account_id: accountId,
        provider_user_id: account.provider_user_id || accountId,
        username: account.username || null,
        display_name: account.display_name || account.username || null,
        avatar_url: account.avatar_url || null,
        status: account.status === "Conectado" ? "connected" : account.status || "connected",
        connected_at: now,
        disconnected_at: null,
        raw_data: account,
        updated_at: now,
      },
      { onConflict: "user_id,provider,account_id" },
    );
  } catch (error) {
    console.warn("Falha ao salvar conta na Supabase:", error);
  }
}

async function saveGroupToSupabase(group) {
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    return;
  }

  try {
    await supabase.from("social_groups").upsert(group);
  } catch (error) {
    console.warn("Falha ao salvar grupo na Supabase:", error);
  }
}

export default function OAuthCallback() {
  const [status, setStatus] = useState("Aguarde enquanto conectamos sua conta...");
  const [message, setMessage] = useState("");
  const { provider } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    async function handleCallback() {
      const callbackKey = `${provider || "unknown"}:${searchParams.toString()}`;
      if (handledCallbackKeys.has(callbackKey)) {
        return;
      }
      handledCallbackKeys.add(callbackKey);

      try {
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const existingGroups = loadLocalGroups() || [];
        const existingAccounts = loadLocalAccounts() || [];
        const oauthGroupId = getOAuthGroupId(provider);
        const oauthProfileId = getOAuthProfileId(provider);

        if (!code) {
          setStatus("Falha na conexao");
          setMessage("Codigo de autorizacao ausente. Verifique a URL de retorno e tente novamente.");
          return;
        }

        if (provider !== "instagram") {
          setStatus("Falha na conexao");
          setMessage("Provedor de autenticacao invalido.");
          return;
        }

        if (provider === "instagram") {
          const expectedState = localStorage.getItem("instagram_oauth_state");
          if (!expectedState || expectedState !== state) {
            setStatus("Falha na conexao");
            setMessage("Falha na validacao de seguranca do Instagram. Atualize a pagina e tente novamente.");
            return;
          }

          localStorage.removeItem("instagram_oauth_state");
        }

        const defaultGroup = {
          id: 1,
          name: "Grupo Principal",
          description: "Contas principais do negocio",
        };
        const groups = existingGroups.length > 0 ? existingGroups : [defaultGroup];
        saveLocalGroups(groups);
        await saveGroupToSupabase(defaultGroup);
        const selectedGroupId = oauthGroupId || groups[0].id;

        const platform = "Instagram Business";
        const username = "@instagram_conectado";
        const account = {
          id: Date.now(),
          platform,
          username,
          status: "Conectado",
          group_id: selectedGroupId,
          profile_id: oauthProfileId || null,
          connected_at: new Date().toLocaleDateString("pt-BR"),
          oauth_provider: provider,
          oauth_code: provider === "instagram" ? code : null,
        };

        const updatedAccounts = [account, ...existingAccounts];
        saveLocalAccounts(updatedAccounts);
        await saveAccountToSupabase(account);

        setStatus("Conta conectada com sucesso!");
        setMessage(`Sua conta ${platform} foi salva. Redirecionando para Contas Sociais...`);
        setTimeout(() => navigate("/contas-sociais"), 1800);
      } catch (error) {
        setStatus("Falha na conexao");
        setMessage(error instanceof Error ? error.message : "Nao foi possivel concluir o OAuth.");
      }
    }

    handleCallback();
  }, [navigate, provider, searchParams]);

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="auth-top">
          <h1>{status}</h1>
          <p>{message}</p>
        </div>

        <div className="auth-actions">
          <Link to="/contas-sociais" className="button primary">
            Voltar para Contas Sociais
          </Link>
        </div>
      </div>
    </div>
  );
}
