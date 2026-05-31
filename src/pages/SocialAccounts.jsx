import { useCallback, useEffect, useState } from "react";
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
import { connectInstagram, connectTikTok } from "../lib/socialAuth";

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

function normalizeApiAccount(account, fallbackGroupId) {
  return {
    id: account.id || `${account.provider}-${account.provider_user_id}`,
    platform: account.provider === "tiktok" ? "TikTok Business" : account.provider,
    provider: account.provider,
    provider_user_id: account.provider_user_id,
    display_name: account.display_name,
    username: account.display_name || account.provider,
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
  const apiAccountsData = await fetchApiSocialAccounts(mergedGroups[0]?.id || 1);

  return {
    groupsData: mergedGroups,
    profilesData: mergeById(profilesData || [], readLocalItems(LOCAL_PROFILES_KEY)),
    accountsData: mergeById(apiAccountsData, readLocalItems(LOCAL_ACCOUNTS_KEY)),
  };
}

export default function SocialAccounts() {
  const [groups, setGroups] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [accounts, setAccounts] = useState([]);

  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");

  const [profileName, setProfileName] = useState("");
  const [profileDescription, setProfileDescription] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");

  const applyLoadedData = useCallback(({ groupsData, profilesData, accountsData }) => {
    setGroups(groupsData);
    setProfiles(profilesData);
    setAccounts(accountsData);
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
          String(currentAccount.provider_user_id || "") !== String(account.provider_user_id || ""),
      ),
    );

    await loadData();
  }

  async function syncTikTokAccount() {
    await loadData();
    alert("Conta TikTok sincronizada.");
  }

  function connectGroupInstagram(groupId, profileId = null) {
    connectInstagram({ groupId, profileId });
  }

  function connectGroupTikTok(groupId, profileId = null) {
    connectTikTok({ groupId, profileId });
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

  function renderConnectedAccount(account, groupId, profileId = null) {
    const tiktokAccount = isTikTokAccount(account);
    const displayName = account.display_name || account.username || account.platform;
    const disconnected = account.connection_status === "disconnected" || account.status === "disconnected";
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
              Conectar novamente
            </button>
          </div>
        )}

        {tiktokAccount && !disconnected && (
          <div className="connected-account-actions">
            <button onClick={() => syncTikTokAccount(account)}>
              <RefreshCw size={13} />
              Sincronizar
            </button>

            <button className="danger" onClick={() => disconnectTikTokAccount(account)}>
              <Trash2 size={13} />
              Desconectar
            </button>
          </div>
        )}
      </div>
    );
  }

  const totalProfiles = profiles.length;
  const totalGroups = groups.length;
  const totalAccounts = accounts.length;

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
                      const profileAccounts = accounts.filter(
                        (account) => String(account.profile_id) === String(profile.id),
                      );

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

                              <button onClick={() => connectGroupTikTok(group.id, profile.id)}>
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
    </div>
  );
}
