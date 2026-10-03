// Receives the Google ID token from the browser, verifies it, and starts a session.
const { createRemoteJWKSet, jwtVerify } = require("jose");
const { startSession } = require("../_session");

const GOOGLE_KEYS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  const { credential } = req.body || {};
  if (typeof credential !== "string") return res.status(400).json({ error: "Missing credential" });

  try {
    const { payload } = await jwtVerify(credential, GOOGLE_KEYS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: process.env.GOOGLE_CLIENT_ID
    });
    if (!payload.email_verified) return res.status(401).json({ error: "Email not verified" });

    const user = {
      sub: payload.sub, // Google's stable user id: use this as the key in the database later
      email: payload.email,
      name: payload.name || payload.email,
      picture: payload.picture || ""
    };
    await startSession(res, user);
    return res.status(200).json({ user });
  } catch (e) {
    console.error("Google sign-in failed:", e.message);
    return res.status(401).json({ error: "Sign-in failed. Try again." });
  }
};
