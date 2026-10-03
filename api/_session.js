// Shared helpers for the signed session cookie. The leading underscore keeps
// Vercel from exposing this file as a public route.
const { SignJWT, jwtVerify } = require("jose");

const COOKIE = "session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secretKey() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET missing or shorter than 32 chars");
  return new TextEncoder().encode(s);
}

function cookie(value, maxAge) {
  const parts = [`${COOKIE}=${value}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${maxAge}`];
  // Secure cookies need https; skip locally so `vercel dev` works in every browser.
  if (["production", "preview"].includes(process.env.VERCEL_ENV)) parts.push("Secure");
  return parts.join("; ");
}

async function startSession(res, user) {
  const token = await new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.sub)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secretKey());
  res.setHeader("Set-Cookie", cookie(token, MAX_AGE));
}

function endSession(res) {
  res.setHeader("Set-Cookie", cookie("", 0));
}

function readCookie(req, name) {
  for (const part of (req.headers.cookie || "").split(";")) {
    const i = part.indexOf("=");
    if (i > -1 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

// Returns {sub, email, name, picture} or null. Use this in any API route that needs a login.
async function getUser(req) {
  const token = readCookie(req, COOKIE);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    return { sub: payload.sub, email: payload.email, name: payload.name, picture: payload.picture };
  } catch {
    return null;
  }
}

module.exports = { startSession, endSession, getUser };
