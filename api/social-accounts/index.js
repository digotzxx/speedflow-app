import { listConnectedAccounts, sendJson, sendNoContent } from "../_socialAccountsStore.js";
import { requireUser } from "../_auth.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    sendNoContent(res);
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { success: false, message: "Metodo nao permitido." });
    return;
  }

  try {
    const user = await requireUser(req, res);
    if (!user) return;

    sendJson(res, 200, {
      success: true,
      accounts: await listConnectedAccounts(user.id),
    });
  } catch (error) {
    sendJson(res, 500, {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Nao foi possivel carregar as contas conectadas.",
    });
  }
}
