import {
  linkAccountToProfile,
  listProfileAccountLinks,
  sendJson,
  sendNoContent,
  unlinkAccountFromProfile,
} from "../_socialAccountsStore.js";
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

  try {
    const user = await requireUser(req, res);
    if (!user) return;

    if (req.method === "GET") {
      const requestUrl = new URL(req.url || "/api/social-accounts/profile-accounts", "http://localhost");
      const profileId = requestUrl.searchParams.get("profile_id");

      sendJson(res, 200, {
        success: true,
        links: await listProfileAccountLinks(user.id, profileId),
      });
      return;
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      const link = await linkAccountToProfile(user.id, {
        groupId: body.group_id || body.groupId || null,
        profileId: body.profile_id || body.profileId,
        socialAccountId: body.social_account_id || body.socialAccountId,
        provider: body.provider || "tiktok",
      });

      sendJson(res, 200, {
        success: true,
        link,
      });
      return;
    }

    if (req.method === "DELETE") {
      const body = await readBody(req);
      await unlinkAccountFromProfile(user.id, {
        id: body.id || null,
        profileId: body.profile_id || body.profileId || null,
        socialAccountId: body.social_account_id || body.socialAccountId || null,
      });

      sendJson(res, 200, {
        success: true,
      });
      return;
    }

    sendJson(res, 405, { success: false, message: "Metodo nao permitido." });
  } catch (error) {
    sendJson(res, 500, {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Nao foi possivel atualizar o vinculo da conta social.",
    });
  }
}
