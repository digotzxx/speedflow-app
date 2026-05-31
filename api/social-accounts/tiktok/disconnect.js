import { disconnectProvider, sendJson, sendNoContent } from "../../_socialAccountsStore.js";
import { requireUser } from "../../_auth.js";

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

    const body = await parseBody(req);
    const accountId = typeof body.account_id === "string" ? body.account_id.trim() : null;

    if (!accountId) {
      sendJson(res, 400, {
        success: false,
        message: "Identificador da conta TikTok ausente.",
      });
      return;
    }

    await disconnectProvider(user.id, "tiktok", accountId);

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
