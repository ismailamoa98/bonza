// services/loyaltyOAuth.js — Gmail/Outlook OAuth: signed state, code exchange, refresh-token access.
const { google } = require("googleapis");
const jwt = require("jsonwebtoken");
const env = require("../config/env");

const PROVIDERS = ["gmail", "outlook"];

const STATE_SECRET = process.env.CLERK_SECRET_KEY || "bonza_oauth_state_dev";
const signState = (payload) => jwt.sign(payload, STATE_SECRET, { expiresIn: "10m" });
const verifyState = (token) => jwt.verify(token, STATE_SECRET);

const GMAIL_SCOPE = ["https://www.googleapis.com/auth/gmail.readonly"];
const MS_SCOPE = "offline_access Mail.Read";
const MS_AUTH = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const MS_TOKEN = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

function redirectUri(provider) {
  return `${env.OAUTH_REDIRECT_BASE}/auth/${provider}/callback`;
}

function isConfigured(provider) {
  if (provider === "gmail") return env.hasGmailOAuth;
  if (provider === "outlook") return env.hasOutlookOAuth;
  return false;
}

function googleClient() {
  return new google.auth.OAuth2(env.GMAIL_CLIENT_ID, env.GMAIL_CLIENT_SECRET, redirectUri("gmail"));
}

async function msToken(params) {
  const res = await fetch(MS_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.MICROSOFT_CLIENT_ID,
      client_secret: env.MICROSOFT_CLIENT_SECRET,
      redirect_uri: redirectUri("outlook"),
      scope: MS_SCOPE,
      ...params,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || "Microsoft token exchange failed");
  return data;
}

function authUrl(provider, state) {
  if (provider === "gmail") {
    return googleClient().generateAuthUrl({
      access_type: "offline",
      prompt: "consent", // force a refresh_token every time
      scope: GMAIL_SCOPE,
      state,
    });
  }
  if (provider === "outlook") {
    const q = new URLSearchParams({
      client_id: env.MICROSOFT_CLIENT_ID,
      response_type: "code",
      redirect_uri: redirectUri("outlook"),
      response_mode: "query",
      scope: MS_SCOPE,
      state,
    });
    return `${MS_AUTH}?${q.toString()}`;
  }
  throw new Error(`Unsupported provider: ${provider}`);
}

async function exchangeCode(provider, code) {
  if (provider === "gmail") {
    const { tokens } = await googleClient().getToken(code);
    return { refreshToken: tokens.refresh_token || null, accessToken: tokens.access_token || null };
  }
  if (provider === "outlook") {
    const t = await msToken({ grant_type: "authorization_code", code });
    return { refreshToken: t.refresh_token || null, accessToken: t.access_token || null };
  }
  throw new Error(`Unsupported provider: ${provider}`);
}

async function accessFromRefresh(provider, refreshToken) {
  if (!refreshToken) throw new Error("No stored refresh token");
  if (provider === "gmail") {
    const client = googleClient();
    client.setCredentials({ refresh_token: refreshToken });
    const { token } = await client.getAccessToken();
    return token;
  }
  if (provider === "outlook") {
    const t = await msToken({ grant_type: "refresh_token", refresh_token: refreshToken });
    return t.access_token;
  }
  throw new Error(`Unsupported provider: ${provider}`);
}

module.exports = {
  PROVIDERS,
  isConfigured,
  authUrl,
  exchangeCode,
  accessFromRefresh,
  redirectUri,
  signState,
  verifyState,
};
