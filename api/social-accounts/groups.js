import { saveSocialGroup, sendJson, sendNoContent } from "../_socialAccountsStore.js";
import { requireUser } from "../_auth.js";

async function readBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string") {
    return JSON.parse(req.body || "{}");
  }

  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
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

    const body = await readBody(req);
    const group = await saveSocialGroup(user.id, {
      name: body.name,
      description: body.description,
    });

    sendJson(res, 200, {
      success: true,
      group,
    });
  } catch (error) {
    sendJson(res, 500, {
      success: false,
      message: error instanceof Error ? error.message : "Nao foi possivel salvar o grupo social.",
    });
  }
}
