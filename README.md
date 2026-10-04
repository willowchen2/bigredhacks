# Locus Lane 🧠 🚶 🗺️ 

Turn your notes into a "memory palace" (Loci Memory Method) you can walk on real Google Street View. Paste your terms, pick a route familiar to you, pin each term to a landmark, then rewalk the path to memorize them.

## How it works

1. **Create:** upload or paste notes, split them into terms and definitions, and choose a walking route on the map.
2. **Place pins:** move along the route in Street View and pin each term to a landmark.
3. **Walk & memorize:** rewalk the path. Each pin shows only its number until you reveal the term, then the definition.
4. **Quiz:** test yourself. Pins are shuffled and hide their terms. Look around, click a pin, type a guess (optional), reveal the answer, then mark whether you got it. Remembered pins turn green and missed ones red, and you can retry just the missed pins. Quiz progress is saved in your browser.

## Setup

```
npm install
```

### API keys you need to add

| Key | Where it goes | Where to get it |
| --- | --- | --- |
| Google Maps API key | `js/config.js` | Google Cloud Console → APIs & Services → Credentials → Create credentials → API key |
| Google OAuth Client ID | `.env` as `GOOGLE_CLIENT_ID` | Google Cloud Console → Credentials → Create credentials → OAuth client ID → Web application |
| Session secret | `.env` as `SESSION_SECRET` | Make your own: run `openssl rand -base64 32` |
| Gemini API key | `.env` as `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) |

**`js/config.js`** (gitignored, so each teammate creates their own):

```js
window.MAPS_API_KEY = "your-maps-key";
```

**`.env`** in the project root (gitignored):

```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
SESSION_SECRET=your-random-string
GEMINI_API_KEY=your-gemini-key
```

`.env.example` is only a template. Never put real keys in it.

### Google Cloud settings

**For the Maps key**, enable these in APIs & Services → Library (same project as the key):
- Maps JavaScript API
- Routes API
- Places API (New)

If the key has API restrictions, add all three to its allowed list. Under application restrictions, allow `http://localhost:3000/*` and your production URL.

**For the OAuth client:**
- Authorized JavaScript origins: `http://localhost:3000` and your production URL. No redirect URIs are needed.
- If the OAuth consent screen is in Testing mode, add every teammate's email as a test user.

## Run locally

```
npx vercel login
npx vercel dev
```

Open `http://localhost:3000`. When asked to link a project, answer **N** (you don't need access to the team's Vercel project). A plain static server won't work, because the sign-in and AI routes live in `/api`.

## Deploy

Add `GOOGLE_CLIENT_ID`, `SESSION_SECRET`, and `GEMINI_API_KEY` in Vercel → Settings → Environment Variables.

## Credits

Made at BigRed//Hacks 2026 by Willow, Mylan, and Vaishnavi 🌿