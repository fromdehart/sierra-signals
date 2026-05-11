import { google } from "googleapis";
import { dbSaveSetting, dbLoadSettings } from "./db.js";

function getClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `http://127.0.0.1:${process.env.PORT || 3002}/auth/google/callback`
  );
}

export function getAuthUrl() {
  return getClient().generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/gmail.compose"],
    prompt: "consent",
  });
}

export async function exchangeCode(code) {
  const client = getClient();
  const { tokens } = await client.getToken(code);
  return tokens;
}

export function saveTokens(tokens) {
  dbSaveSetting("gmailTokens", tokens);
}

export function loadTokens() {
  const settings = dbLoadSettings();
  return settings.gmailTokens || null;
}

function encodeSubject(subject) {
  if (/[^\x00-\x7F]/.test(subject)) {
    return "=?UTF-8?B?" + Buffer.from(subject, "utf8").toString("base64") + "?=";
  }
  return subject;
}

export async function createDraft({ to, subject, body }) {
  const tokens = loadTokens();
  if (!tokens) throw new Error("Gmail not connected");

  const client = getClient();
  client.setCredentials(tokens);

  // Persist refreshed tokens automatically
  client.on("tokens", updated => {
    saveTokens({ ...tokens, ...updated });
  });

  const gmail = google.gmail({ version: "v1", auth: client });

  const headers = [
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    ...(to ? ["To: " + to] : []),
    "Subject: " + encodeSubject(subject),
  ].join("\n");

  // Blank line between headers and body is required by RFC 2822
  const raw = Buffer.from(headers + "\n\n" + (body || ""), "utf8").toString("base64url");

  await gmail.users.drafts.create({
    userId: "me",
    requestBody: { message: { raw } },
  });
}
