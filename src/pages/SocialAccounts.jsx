import { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus,
  FolderPlus,
  Camera,
  Music2,
  Trash2,
  RefreshCw,
  Users,
  Folder,
  UserRound,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { apiFetch } from "../lib/apiClient";
import {
  connectInstagram,
  connectTikTok,
  getTikTokAddAnotherStartUrl,
  startTikTokAuth,
} from "../lib/socialAuth";

const LOCAL_GROUPS_KEY = "socialflow_groups";
const LOCAL_PROFILES_KEY = "socialflow_profiles";
const LOCAL_ACCOUNTS_KEY = "socialflow_accounts";

function readLocalItems(key) {
  try {
    const stored = localStorage.getItem(key);
    const parsed = stored ? JSON.parse(stored) : [];

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalItems(key, items) {
  localStorage.setItem(key, JSON.stringify(items));
}

function mergeById(remoteItems, localItems) {
  const itemsById = new Map();

  remoteItems.forEach((item) => {
    itemsById.set(String(item.id), item);
  });
  localItems.forEach((item) => {
    itemsById.set(String(item.id), item);
  });

  return [...itemsById.values()];
}

function createLocalId(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomUUID()}`;
}

function isLocalId(id) {
  return typeof id === "string" && id.startsWith("local-");
}

function saveLocalItem(key, item) {
  const items = readLocalItems(key).filter((currentItem) => String(currentItem.id) !== String(item.id));
  writeLocalItems(key, [item, ...items]);
}

function removeLocalItem(key, id) {
  const items = readLocalItems(key).filter((item) => String(item.id) !== String(id));
  writeLocalItems(key, items);
}

function groupAccounts(accounts, groupId) {
  return accounts.filter((account) => String(account.group_id) === String(groupId));
}

function isTikTokAccount(account) {
  return (
    account.provider === "tiktok" ||
    account.oauth_provider === "tiktok" ||
    account.platform?.toLowerCase().includes("tiktok")
  );
}

function isDisconnected(account) {
  return account.connection_status === "disconnected" || account.status === "disconnected";
}

function maskAccountId(accountId) {
  if (!accountId) return "ID nao informado";
  const value = String(accountId);
  if (value.length <= 10) return value;

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function formatDate(value) {
  if (!value) return "Data nao informada";

  try {
    return new Date(value).toLocaleDateString("pt-BR");
  } catch {
    return "Data nao informada";
  }
}

function getTokenStatus(account) {
  if (!account.expires_at) return "Token ativo";

  const expiresAt = new Date(account.expires_at).getTime();
  if (Number.isNaN(expiresAt)) return "Token ativo";

  const days = Math.ceil((expiresAt - Date.now()) / 86_400_000);
  if (days < 0) return "Token expirado";
  if (days === 0) return "Token expira hoje";

  return `Token expira em ${days} dia${days === 1 ? "" : "s"}`;
}

function normalizeApiAccount(account, fallbackGroupId) {
  return {
    id: account.id || `${account.provider}-${account.account_id || account.provider_user_id}`,
    platform: account.provider === "tiktok" ? "TikTok Business" : account.provider,
    provider: account.provider,
    account_id: account.account_id || account.provider_user_id,
    provider_user_id: account.provider_user_id || account.account_id,
    display_name: account.display_name,
    username: account.username || account.display_name || account.provider,
    avatar_url: account.avatar_url || "",
    status: account.status === "connected" ? "Conectado" : account.status || "Conectado",
    connection_status: account.status,
    group_id: account.group_id || fallbackGroupId,
    profile_id: account.profile_id || null,
    connected_at: account.connected_at
      ? new Date(account.connected_at).toLocaleDateString("pt-BR")
      : new Date().toLocaleDateString("pt-BR"),
    connected_at_iso: account.connected_at,
    expires_at: account.expires_at || null,
    refresh_expires_at: account.refresh_expires_at || null,
    scopes: account.scopes || "",
    oauth_provider: account.provider,
  };
}

async function fetchApiSocialAccounts(fallbackGroupId) {
  try {
    const response = await apiFetch("/api/social-accounts", {
      credentials: "include",
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || "Nao foi possivel carregar as contas conectadas.");
    }

    const payload = await response.json();
    if (!payload.success || !Array.isArray(payload.accounts)) {
      return [];
    }

    return payload.accounts.map((account) => normalizeApiAccount(account, fallbackGroupId));
  } catch (error) {
    console.warn("Falha ao carregar contas sociais do backend:", error);
    return [];
  }
}

async function fetchApiProfileAccountLinks() {
  try {
    const response = await apiFetch("/api/social-accounts/profile-accounts", {
      credentials: "include",
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || "Nao foi possivel carregar os vinculos dos perfis.");
    }

    const payload = await response.json();
    if (!payload.success || !Array.isArray(payload.links)) {
      return [];
    }

    return payload.links;
  } catch (error) {
    console.warn("Falha ao carregar vinculos de contas dos perfis:", error);
    return [];
  }
}

async function fetchSocialData() {
  const { data: groupsData, error: groupsError } = await supabase
    .from("social_groups")
    .select("*")
    .order("created_at", { ascending: false });

  if (groupsError) {
    console.warn("Falha ao carregar grupos no Supabase:", groupsError);
  }

  const { data: profilesData, error: profilesError } = await supabase
    .from("social_profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (profilesError) {
    console.warn("Falha ao carregar perfis no Supabase:", profilesError);
  }

  const mergedGroups = mergeById(groupsData || [], readLocalItems(LOCAL_GROUPS_KEY));
  const [apiAccountsData, profileAccountLinksData] = await Promise.all([
    fetchApiSocialAccounts(mergedGroups[0]?.id || 1),
    fetchApiProfileAccountLinks(),
  ]);

  return {
    groupsData: mergedGroups,
    profilesData: mergeById(profilesData || [], readLocalItems(LOCAL_PROFILES_KEY)),
    accountsData: mergeById(apiAccountsData, readLocalItems(LOCAL_ACCOUNTS_KEY)),
    profileAccountLinksData,
  };
}

export default function SocialAccounts() {
  const autoStartTikTokRef = useRef(false);
  const [groups, setGroups] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [profileAccountLinks, setProfileAccountLinks] = useState([]);

  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [addTikTokModal, setAddTikTokModal] = useState(null);
  const [chooseTikTokModal, setChooseTikTokModal] = useState(null);
  const [showChromeTip, setShowChromeTip] = useState(false);

  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");

  const [profileName, setProfileName] = useState("");
  const [profileDescription, setProfileDescription] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");

  const applyLoadedData = useCallback(({ groupsData, profilesData, accountsData, profileAccountLinksData }) => {
    setGroups(groupsData);
    setProfiles(profilesData);
    setAccounts(accountsData);
    setProfileAccountLinks(profileAccountLinksData || []);
    setSelectedGroupId((currentGroupId) =>
      groupsData.some((group) => String(group.id) === String(currentGroupId))
        ? currentGroupId
        : groupsData[0]?.id || "",
    );
  }, []);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchSocialData();
      applyLoadedData(data);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Erro ao carregar dados.");
    }
  }, [applyLoadedData]);

  useEffect(() => {
    let active = true;

    fetchSocialData()
      .then((data) => {
        if (active) {
          applyLoadedData(data);
        }
      })
      .catch((error) => {
        if (active) {
          console.error(error);
          alert(error instanceof Error ? error.message : "Erro ao carregar dados.");
        }
      });

    return () => {
      active = false;
    };
  }, [applyLoadedData]);

  useEffect(() => {
    if (autoStartTikTokRef.current) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("start_tiktok") !== "add_another") return;

    autoStartTikTokRef.current = true;
    params.delete("start_tiktok");
    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`;
    window.history.replaceState({}, "", nextUrl);

    connectTikTok({
      groupId: selectedGroupId || groups[0]?.id || 1,
      mode: "add_another",
    });
  }, [groups, selectedGroupId]);

  async function createGroup(e) {
    e.preventDefault();

    const name = groupName.trim();
    const description = groupDescription.trim() || "Grupo de perfis sociais";

    if (!name) {
      alert("Digite o nome do grupo.");
      return;
    }

    const { data, error } = await supabase
      .from("social_groups")
      .insert({ name, description })
      .select()
      .single();

    if (error) {
      console.warn("Grupo salvo localmente porque o Supabase bloqueou a escrita:", error);
      saveLocalItem(LOCAL_GROUPS_KEY, {
        id: createLocalId("local-group"),
        name,
        description,
        created_at: new Date().toISOString(),
      });
    } else if (data) {
      removeLocalItem(LOCAL_GROUPS_KEY, data.id);
    }

    setGroupName("");
    setGroupDescription("");
    setGroupModalOpen(false);
    await loadData();
  }

  async function createProfile(e) {
    e.preventDefault();

    const name = profileName.trim();
    const description = profileDescription.trim() || "Perfil social";

    if (!name) {
      alert("Digite o nome do perfil.");
      return;
    }

    if (!selectedGroupId) {
      alert("Crie ou selecione um grupo.");
      return;
    }

    const profile = {
      group_id: selectedGroupId,
      name,
      description,
    };
    const { data, error } = isLocalId(selectedGroupId)
      ? { data: null, error: { message: "Perfil pertence a um grupo local." } }
      : await supabase.from("social_profiles").insert(profile).select().single();

    if (error) {
      console.warn("Perfil salvo localmente porque o Supabase bloqueou a escrita:", error);
      saveLocalItem(LOCAL_PROFILES_KEY, {
        id: createLocalId("local-profile"),
        ...profile,
        created_at: new Date().toISOString(),
      });
    } else if (data) {
      removeLocalItem(LOCAL_PROFILES_KEY, data.id);
    }

    setProfileName("");
    setProfileDescription("");
    setProfileModalOpen(false);
    await loadData();
  }

  async function removeProfile(id) {
    const confirmRemove = window.confirm("Remover este perfil?");
    if (!confirmRemove) return;

    if (isLocalId(id)) {
      removeLocalItem(LOCAL_PROFILES_KEY, id);
      await loadData();
      return;
    }

    const { error } = await supabase.from("social_profiles").delete().eq("id", id);

    if (error) {
      console.warn("Falha ao remover perfil no Supabase:", error);
      removeLocalItem(LOCAL_PROFILES_KEY, id);
      return;
    }

    await loadData();
  }

  async function removeGroup(id) {
    const confirmRemove = window.confirm("Remover este grupo? Os perfis ficarao sem grupo.");
    if (!confirmRemove) return;

    if (isLocalId(id)) {
      removeLocalItem(LOCAL_GROUPS_KEY, id);
      writeLocalItems(
        LOCAL_PROFILES_KEY,
        readLocalItems(LOCAL_PROFILES_KEY).filter((profile) => String(profile.group_id) !== String(id)),
      );
      await loadData();
      return;
    }

    const { error } = await supabase.from("social_groups").delete().eq("id", id);

    if (error) {
      console.warn("Falha ao remover grupo no Supabase:", error);
      removeLocalItem(LOCAL_GROUPS_KEY, id);
      return;
    }

    await loadData();
  }

  async function disconnectTikTokAccount(account) {
    const confirmDisconnect = window.confirm("Desconectar esta conta TikTok?");
    if (!confirmDisconnect) return;

    try {
      const response = await apiFetch("/api/social-accounts/tiktok/disconnect", {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          account_id: account.account_id || account.provider_user_id || null,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload.success === false) {
        throw new Error(payload.message || "Nao foi possivel desconectar o TikTok.");
      }
    } catch (error) {
      console.warn("Falha ao desconectar TikTok no backend:", error);
      alert(error instanceof Error ? error.message : "Nao foi possivel desconectar o TikTok.");
      return;
    }

    writeLocalItems(
      LOCAL_ACCOUNTS_KEY,
      readLocalItems(LOCAL_ACCOUNTS_KEY).filter(
        (currentAccount) =>
          String(currentAccount.id) !== String(account.id) &&
          String(currentAccount.account_id || "") !== String(account.account_id || "") &&
          String(currentAccount.provider_user_id || "") !== String(account.provider_user_id || ""),
      ),
    );

    await loadData();
  }

  function connectGroupInstagram(groupId, profileId = null) {
    connectInstagram({ groupId, profileId });
  }

  function connectGroupTikTok(groupId, profileId = null) {
    connectTikTok({ groupId, profileId });
  }

  function openChooseTikTokModal(groupId, profileId) {
    if (isLocalId(profileId)) {
      alert("Este perfil ainda esta salvo apenas neste navegador. Salve o perfil no Supabase antes de vincular uma conta TikTok.");
      return;
    }

    setChooseTikTokModal({ groupId: isLocalId(groupId) ? null : groupId, profileId });
  }

  function openAddAnotherTikTokModal(groupId, profileId = null) {
    setShowChromeTip(false);
    setAddTikTokModal({ groupId, profileId });
  }

  function openTikTokAccountSwitcher() {
    window.open("https://www.tiktok.com", "_blank", "noopener,noreferrer");
  }

  async function copyTikTokIncognitoLink() {
    const link = getTikTokAddAnotherStartUrl();

    try {
      await navigator.clipboard.writeText(link);
      alert("Link copiado. Abra uma janela anonima, cole o link e entre na outra conta TikTok.");
    } catch (error) {
      console.warn("Falha ao copiar link TikTok:", error);
      window.prompt("Copie este link e abra em uma janela anonima:", link);
    }
  }

  function continueAddAnotherTikTok() {
    const context = addTikTokModal || chooseTikTokModal || {};
    setAddTikTokModal(null);
    connectTikTok({
      groupId: context.groupId,
      profileId: context.profileId,
      mode: "add_another",
    });
  }

  function openTikTokOAuthForProfile() {
    if (!chooseTikTokModal) return;

    const context = chooseTikTokModal;
    setChooseTikTokModal(null);
    startTikTokAuth({
      mode: "add_another",
      groupId: context.groupId,
      profileId: context.profileId,
      openInNewWindow: true,
    });
  }

  async function linkTikTokToProfile(account) {
    if (!chooseTikTokModal) return;

    try {
      const response = await apiFetch("/api/social-accounts/profile-accounts", {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          group_id: chooseTikTokModal.groupId,
          profile_id: chooseTikTokModal.profileId,
          social_account_id: account.social_account_id || account.id,
          provider: "tiktok",
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload.success === false) {
        throw new Error(payload.message || "Nao foi possivel usar esta conta TikTok no perfil.");
      }

      setChooseTikTokModal(null);
      await loadData();
    } catch (error) {
      console.warn("Falha ao vincular TikTok ao perfil:", error);
      alert(error instanceof Error ? error.message : "Nao foi possivel usar esta conta TikTok no perfil.");
    }
  }

  async function unlinkTikTokFromProfile(account) {
    const confirmRemove = window.confirm("Remover esta conta TikTok deste perfil?");
    if (!confirmRemove) return;

    try {
      const response = await apiFetch("/api/social-accounts/profile-accounts", {
        method: "DELETE",
        credentials: "include",
        body: JSON.stringify({
          id: account.profile_account_link_id,
          profile_id: account.profile_id,
          social_account_id: account.social_account_id,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload.success === false) {
        throw new Error(payload.message || "Nao foi possivel remover a conta TikTok deste perfil.");
      }

      await loadData();
    } catch (error) {
      console.warn("Falha ao remover vinculo TikTok:", error);
      alert(error instanceof Error ? error.message : "Nao foi possivel remover a conta TikTok deste perfil.");
    }
  }

  function prepareTikTokGroupUse(account) {
    const displayName = account.display_name || account.username || "Conta TikTok";
    alert(
      `A conta ${displayName} ja esta salva no SpeedFlow. A associacao direta a grupos sera habilitada quando o vinculo persistente de contas e grupos estiver disponivel.`,
    );
  }

  async function addProfileSlot(groupId) {
    const nextProfileNumber =
      profiles.filter((profile) => String(profile.group_id) === String(groupId)).length + 1;
    const profile = {
      group_id: groupId,
      name: `Perfil ${String(nextProfileNumber).padStart(2, "0")}`,
      description: "Conecte Instagram ou TikTok",
    };

    const { data, error } = isLocalId(groupId)
      ? { data: null, error: { message: "Perfil pertence a um grupo local." } }
      : await supabase.from("social_profiles").insert(profile).select().single();

    if (error) {
      console.warn("Perfil salvo localmente porque o Supabase bloqueou a escrita:", error);
      saveLocalItem(LOCAL_PROFILES_KEY, {
        id: createLocalId("local-profile"),
        ...profile,
        created_at: new Date().toISOString(),
      });
    } else if (data) {
      removeLocalItem(LOCAL_PROFILES_KEY, data.id);
    }

    await loadData();
  }

  function getLinkedProfileAccounts(profileId) {
    return profileAccountLinks
      .filter((link) => String(link.profile_id) === String(profileId) && link.account)
      .map((link) => ({
        ...normalizeApiAccount(link.account, link.group_id),
        id: `profile-link-${link.id}`,
        profile_account_link_id: link.id,
        social_account_id: link.social_account_id,
        group_id: link.group_id,
        profile_id: link.profile_id,
      }));
  }

  function renderTikTokAccountCard(account, index) {
    const displayName = account.display_name || account.username || "Perfil TikTok";
    const disconnected = isDisconnected(account);
    const connectedStatus = disconnected ? "Desconectada" : "Conta conectada";

    return (
      <div className="tiktok-account-card" key={account.id || account.account_id}>
        <div className="tiktok-account-main">
          {account.avatar_url ? (
            <img src={account.avatar_url} alt={displayName} />
          ) : (
            <div className="tiktok-account-fallback">
              <Music2 size={18} />
            </div>
          )}

          <div className="tiktok-account-info">
            <div className="tiktok-account-title">
              <strong>{displayName}</strong>
              {index === 0 && <span>Conta principal</span>}
            </div>
            <small>{account.platform || account.provider || "TikTok Business"}</small>
            <code>{maskAccountId(account.account_id || account.provider_user_id)}</code>
          </div>
        </div>

        <div className="tiktok-account-meta">
          <span className={disconnected ? "status-off" : "status-on"}>{connectedStatus}</span>
          <span>Conectada em {formatDate(account.connected_at_iso || account.connected_at)}</span>
          <span>{getTokenStatus(account)}</span>
        </div>

        <div className="connected-account-actions">
          <button onClick={() => connectGroupTikTok(account.group_id || defaultTikTokGroupId, account.profile_id)}>
            <RefreshCw size={13} />
            Reconectar
          </button>

          <button onClick={() => prepareTikTokGroupUse(account)}>
            <Folder size={13} />
            Usar em grupo
          </button>

          <button className="danger" onClick={() => disconnectTikTokAccount(account)}>
            <Trash2 size={13} />
            Desconectar
          </button>
        </div>
      </div>
    );
  }

  function renderConnectedAccount(account, groupId, profileId = null) {
    const tiktokAccount = isTikTokAccount(account);
    const displayName = account.display_name || account.username || account.platform;
    const disconnected = isDisconnected(account);
    const connectedStatus =
      disconnected
        ? "Desconectado"
        : account.connection_status === "connected" || account.status === "Conectado"
        ? "Conectado"
        : account.status || "Conectado";

    return (
      <div className="connected-account-card" key={account.id}>
        <div className="connected-account-main">
          {account.avatar_url ? (
            <img src={account.avatar_url} alt={displayName} />
          ) : (
            <div className="connected-account-fallback">
              {account.platform?.includes("Instagram") ? <Camera size={16} /> : <Music2 size={16} />}
            </div>
          )}

          <div>
            <strong>{displayName}</strong>
            <span>{connectedStatus}</span>
          </div>
        </div>

        {tiktokAccount && disconnected && (
          <div className="connected-account-actions">
            <button onClick={() => connectGroupTikTok(groupId, profileId)}>
              <Plus size={13} />
              Reconectar
            </button>

            <button
              className="danger"
              onClick={() =>
                account.profile_account_link_id
                  ? unlinkTikTokFromProfile(account)
                  : disconnectTikTokAccount(account)
              }
            >
              <Trash2 size={13} />
              {account.profile_account_link_id ? "Remover do perfil" : "Desconectar"}
            </button>
          </div>
        )}

        {tiktokAccount && !disconnected && (
          <div className="connected-account-actions">
            <button onClick={() => connectGroupTikTok(groupId, profileId)}>
              <RefreshCw size={13} />
              Reconectar
            </button>

            <button
              className="danger"
              onClick={() =>
                account.profile_account_link_id
                  ? unlinkTikTokFromProfile(account)
                  : disconnectTikTokAccount(account)
              }
            >
              <Trash2 size={13} />
              {account.profile_account_link_id ? "Remover do perfil" : "Desconectar"}
            </button>
          </div>
        )}
      </div>
    );
  }

  const totalProfiles = profiles.length;
  const totalGroups = groups.length;
  const totalAccounts = accounts.length;
  const tiktokAccounts = accounts.filter(isTikTokAccount);
  const connectedTikTokAccounts = tiktokAccounts.filter((account) => !isDisconnected(account));
  const defaultTikTokGroupId = selectedGroupId || groups[0]?.id || 1;

  return (
    <div className="channels-page">
      <div className="channels-header">
        <div>
          <h1>Contas sociais</h1>
          <p>Conecte e gerencie suas redes sociais por grupos e perfis.</p>
        </div>

        <div className="channels-actions">
          <button className="outline-action" onClick={loadData}>
            <RefreshCw size={16} />
            Atualizar
          </button>

          <button className="outline-action" onClick={() => setGroupModalOpen(true)}>
            <FolderPlus size={16} />
            Criar Grupo
          </button>

        </div>
      </div>

      <div className="channels-stats">
        <div>
          <Users size={20} />
          <strong>{totalProfiles}</strong>
          <span>Perfis criados</span>
        </div>

        <div>
          <Folder size={20} />
          <strong>{totalGroups}</strong>
          <span>Grupos criados</span>
        </div>

        <div>
          <Camera size={20} />
          <strong>{totalAccounts}</strong>
          <span>Contas conectadas</span>
        </div>
      </div>

      <section className="tiktok-accounts-section">
        <div className="tiktok-section-header">
          <div>
            <h2>Contas TikTok conectadas</h2>
            <p>
              {connectedTikTokAccounts.length} conta{connectedTikTokAccounts.length === 1 ? "" : "s"} TikTok
              conectada{connectedTikTokAccounts.length === 1 ? "" : "s"}
            </p>
          </div>

          <button className="primary-action" onClick={() => openAddAnotherTikTokModal(defaultTikTokGroupId)}>
            <Plus size={16} />
            Adicionar nova conta TikTok
          </button>
        </div>

        <div className="tiktok-howto-box">
          <strong>Melhor forma de conectar várias contas</strong>
          <p>
            Para conectar várias contas TikTok, repita este processo para cada perfil: clique em Adicionar
            nova conta TikTok, copie o link, abra uma janela anônima ou outro perfil do Chrome, cole o link,
            faça login no SpeedFlow, entre no TikTok com a conta desejada, autorize e volte para Contas
            Sociais para conferir se apareceu um novo card.
          </p>
        </div>

        {tiktokAccounts.length === 0 ? (
          <div className="tiktok-empty-state">
            <Music2 size={18} />
            <span>Nenhuma conta TikTok salva ainda.</span>
          </div>
        ) : (
          <div className="tiktok-accounts-grid">
            {tiktokAccounts.map((account, index) => renderTikTokAccountCard(account, index))}
          </div>
        )}
      </section>

      <div className="channels-section-title">
        <span>CANAIS SOCIAIS</span>
        <strong>{totalProfiles}</strong>
      </div>

      <p className="channels-subtitle">Crie grupos e adicione varios perfis dentro deles.</p>

      {groups.length === 0 ? (
        <div className="empty-social-state">
          <p>Nenhum grupo criado ainda.</p>
          <button onClick={() => setGroupModalOpen(true)}>
            <FolderPlus size={16} />
            Criar primeiro grupo
          </button>
        </div>
      ) : (
        <div className="groups-layout">
          {groups.map((group) => {
            const groupProfiles = profiles.filter((profile) => String(profile.group_id) === String(group.id));
            const connectedGroupAccounts = groupAccounts(accounts, group.id).filter(
              (account) => !account.profile_id,
            );

            return (
              <div className="group-box" key={group.id}>
                <div className="group-box-header">
                  <div>
                    <h2>{group.name}</h2>
                    <p>{group.description}</p>
                  </div>

                  <div className="group-header-actions">
                    <span>{groupProfiles.length} perfil(is)</span>
                    <button className="group-delete-button" onClick={() => removeGroup(group.id)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {connectedGroupAccounts.length > 0 && (
                  <div className="group-connected-accounts">
                    {connectedGroupAccounts.map((account) => renderConnectedAccount(account, group.id))}
                  </div>
                )}

                {groupProfiles.length === 0 ? (
                  <div className="empty-group-message">
                    <p>Nenhum perfil dentro deste grupo.</p>
                    <button onClick={() => addProfileSlot(group.id)}>
                      <Plus size={16} />
                      Adicionar perfil
                    </button>
                  </div>
                ) : (
                  <div className="profiles-grid">
                    {groupProfiles.map((profile) => {
                      const profileAccounts = [
                        ...accounts.filter((account) => String(account.profile_id) === String(profile.id)),
                        ...getLinkedProfileAccounts(profile.id),
                      ];

                      return (
                        <div className="profile-card" key={profile.id}>
                          <div className="profile-card-top">
                            <div className="profile-info">
                              <div className="profile-icon">
                                <UserRound size={20} />
                              </div>

                              <div>
                                <h3>{profile.name}</h3>
                                <p>{profile.description}</p>
                              </div>
                            </div>

                            <button
                              className="delete-profile-btn"
                              onClick={() => removeProfile(profile.id)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>

                          <div className="profile-connected">
                            {profileAccounts.length === 0 ? (
                              <p>Nenhuma conta conectada</p>
                            ) : (
                              profileAccounts.map((account) =>
                                renderConnectedAccount(account, group.id, profile.id),
                              )
                            )}
                          </div>

                          <div className="profile-connect-area">
                            <div>
                              <strong>Conectar conta ao perfil</strong>
                              <span>Escolha uma rede social para vincular diretamente a este perfil.</span>
                            </div>

                            <div className="connect-platforms profile-connect-buttons">
                              <button onClick={() => connectGroupInstagram(group.id, profile.id)}>
                                <Plus size={14} />
                                Instagram
                              </button>

                              <button onClick={() => openChooseTikTokModal(group.id, profile.id)}>
                                <Plus size={14} />
                                TikTok
                              </button>
                            </div>
                          </div>
                        </div>
      );
                    })}
                    <button className="add-profile-card" onClick={() => addProfileSlot(group.id)}>
                      <Plus size={22} />
                      <span>Adicionar perfil</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {groupModalOpen && (
        <div className="modal-bg">
          <div className="social-modal">
            <div className="modal-top">
              <div>
                <h2>Criar grupo</h2>
                <p>Exemplo: Cliente A, Loja Principal, Projeto X.</p>
              </div>

              <button onClick={() => setGroupModalOpen(false)}>x</button>
            </div>

            <form className="social-form" onSubmit={createGroup}>
              <label>Nome do grupo</label>
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Ex: Cliente A"
              />

              <label>Descricao</label>
              <input
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="Ex: Perfis do cliente A"
              />

              <div className="modal-buttons">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setGroupModalOpen(false)}
                >
                  Cancelar
                </button>

                <button type="submit" className="save-button">
                  Criar grupo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {profileModalOpen && (
        <div className="modal-bg">
          <div className="social-modal">
            <div className="modal-top">
              <div>
                <h2>Criar perfil</h2>
                <p>Adicione um perfil dentro de um grupo.</p>
              </div>

              <button onClick={() => setProfileModalOpen(false)}>x</button>
            </div>

            <form className="social-form" onSubmit={createProfile}>
              <label>Grupo</label>
              <select value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)}>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>

              <label>Nome do perfil</label>
              <input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Ex: Perfil 1"
              />

              <label>Descricao</label>
              <input
                value={profileDescription}
                onChange={(e) => setProfileDescription(e.target.value)}
                placeholder="Ex: Instagram e TikTok da loja"
              />

              <div className="modal-buttons">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setProfileModalOpen(false)}
                >
                  Cancelar
                </button>

                <button type="submit" className="save-button">
                  Criar perfil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {chooseTikTokModal && (
        <div className="modal-bg">
          <div className="social-modal">
            <div className="modal-top">
              <div>
                <h2>Adicionar TikTok ao perfil</h2>
                <p>
                  Escolha uma conta ja salva ou abra a autorizacao oficial do TikTok para conectar
                  outra conta.
                </p>
              </div>

              <button onClick={() => setChooseTikTokModal(null)}>x</button>
            </div>

            <div className="tiktok-modal-tip">
              <strong>Usar conta ja salva</strong>
            </div>

            {tiktokAccounts.length === 0 ? (
              <div className="tiktok-empty-state">
                <Music2 size={18} />
                <span>Nenhuma conta TikTok salva ainda.</span>
              </div>
            ) : (
              <div className="tiktok-accounts-grid">
                {tiktokAccounts.map((account) => {
                  const displayName = account.display_name || account.username || "Perfil TikTok";
                  const alreadyLinked = profileAccountLinks.some(
                    (link) =>
                      String(link.profile_id) === String(chooseTikTokModal.profileId) &&
                      String(link.social_account_id) === String(account.social_account_id || account.id),
                  );

                  return (
                    <div className="tiktok-account-card" key={`chooser-${account.id || account.account_id}`}>
                      <div className="tiktok-account-main">
                        {account.avatar_url ? (
                          <img src={account.avatar_url} alt={displayName} />
                        ) : (
                          <div className="tiktok-account-fallback">
                            <Music2 size={18} />
                          </div>
                        )}

                        <div className="tiktok-account-info">
                          <div className="tiktok-account-title">
                            <strong>{displayName}</strong>
                            <span>{isDisconnected(account) ? "disconnected" : "connected"}</span>
                          </div>
                          <small>{account.platform || account.provider || "TikTok Business"}</small>
                          <code>{maskAccountId(account.account_id || account.provider_user_id)}</code>
                        </div>
                      </div>

                      <div className="connected-account-actions">
                        <button
                          className="save-button"
                          disabled={alreadyLinked || isDisconnected(account)}
                          onClick={() => linkTikTokToProfile(account)}
                        >
                          {alreadyLinked ? "Ja esta neste perfil" : "Usar esta conta neste perfil"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="tiktok-modal-tip">
              <strong>Conectar nova conta TikTok</strong>
              <p>
                Para conectar uma conta diferente, vamos abrir a tela oficial do TikTok. Se o TikTok
                entrar automaticamente na mesma conta, saia/troque de conta no TikTok e tente novamente.
              </p>
              <p>
                Para garantir outra conta, abra o TikTok, saia da conta atual ou troque de perfil,
                depois clique em Abrir conexao TikTok.
              </p>
            </div>

            <div className="modal-buttons">
              <button type="button" className="save-button" onClick={openTikTokOAuthForProfile}>
                Abrir conexao TikTok
              </button>

              <button type="button" className="cancel-button" onClick={openTikTokAccountSwitcher}>
                Abrir TikTok para trocar/sair da conta
              </button>

              <button type="button" className="cancel-button" onClick={() => setChooseTikTokModal(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {addTikTokModal && (
        <div className="modal-bg">
          <div className="social-modal">
            <div className="modal-top">
              <div>
                <h2>Adicionar nova conta TikTok</h2>
                <p>
                  Para adicionar outra conta TikTok, voce precisa autorizar um perfil diferente. O TikTok
                  pode usar automaticamente a conta ja logada neste navegador. A forma mais segura e abrir
                  o link em uma janela anonima ou em outro perfil do Chrome.
                </p>
              </div>

              <button onClick={() => setAddTikTokModal(null)}>x</button>
            </div>

            <p className="tiktok-modal-tip">
              Melhor opcao: copie o link, abra uma janela anonima, cole o link e entre na outra conta
              TikTok.
            </p>

            <div className="modal-buttons">
              <button type="button" className="cancel-button" onClick={copyTikTokIncognitoLink}>
                Copiar link para janela anonima
              </button>

              <button type="button" className="cancel-button" onClick={openTikTokAccountSwitcher}>
                Abrir TikTok para sair/trocar conta
              </button>

              <button type="button" className="save-button" onClick={continueAddAnotherTikTok}>
                Continuar neste navegador
              </button>

              <button type="button" className="cancel-button" onClick={() => setShowChromeTip(true)}>
                Como usar varios perfis no Chrome
              </button>
            </div>

            {showChromeTip && (
              <p className="tiktok-modal-tip">
                Crie outro perfil no Chrome, entre em outra conta TikTok nesse perfil e abra o link
                copiado.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
