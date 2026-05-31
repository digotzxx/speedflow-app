import { disconnectProvider, sendJson, sendNoContent } from "../../_socialAccountsStore.js";
import { requireUser } from "../../_auth.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    sendNoContent(res);
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { success: false, message: "Metodo nao permitido." });
    return;
  }

  try {
    const user = await requireUser(req, res);
    if (!user) return;

    await disconnectProvider(user.id, "tiktok");

    sendJson(res, 200, {
      success: true,
      message: "TikTok desconectado com sucesso.",
    });
  } catch (error) {
    sendJson(res, 500, {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Nao foi possivel desconectar a conta TikTok.",
    });
  }
}
