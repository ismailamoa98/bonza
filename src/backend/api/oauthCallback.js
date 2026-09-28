// api/oauthCallback.js — public loyalty OAuth callback; exchanges code, stores refresh token, redirects back.
const env = require("../config/env");
const prisma = require("../config/database");
const oauth = require("../services/loyaltyOAuth");
const { logger } = require("../utils/logger");

const CONN_FLAG = { gmail: "gmailConnected", outlook: "outlookConnected" };
const REFRESH_COL = { gmail: "gmailRefreshToken", outlook: "outlookRefreshToken" };

function redirectApp(res, from, params) {
  const page = from === "onboarding" ? "onboarding" : "settings";
  const q = new URLSearchParams(params).toString();
  res.redirect(`${env.FRONTEND_URL}/${page}?${q}`);
}

async function oauthCallback(req, res) {
  const { provider } = req.params;
  const { code, state, error } = req.query;
  let from = "settings";

  try {
    if (!oauth.PROVIDERS.includes(provider)) return redirectApp(res, from, { loyaltyError: "bad_provider" });
    if (error) return redirectApp(res, from, { loyaltyError: String(error) });
    if (!state || !code) return redirectApp(res, from, { loyaltyError: "missing_params" });

    let claims;
    try {
      claims = oauth.verifyState(state);
    } catch {
      return redirectApp(res, from, { loyaltyError: "invalid_state" });
    }
    from = claims.from || "settings";
    if (claims.provider !== provider) return redirectApp(res, from, { loyaltyError: "provider_mismatch" });

    const { refreshToken } = await oauth.exchangeCode(provider, code);

    const data = { [CONN_FLAG[provider]]: true };
    if (refreshToken) data[REFRESH_COL[provider]] = refreshToken;
    await prisma.user.update({ where: { id: claims.userId }, data });

    // Hand off to the "Gathering your points" loading page — it runs the deep sync with live progress and
    // continues once the parse is complete (rather than blocking the redirect on an inline parse).
    const q = new URLSearchParams({ from, provider }).toString();
    return res.redirect(`${env.FRONTEND_URL}/points/connecting?${q}`);
  } catch (err) {
    logger.error(`[oauthCallback] ${provider} failed`, err);
    return redirectApp(res, from, { loyaltyError: "oauth_failed" });
  }
}

module.exports = { oauthCallback };
