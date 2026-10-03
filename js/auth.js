// Sign in with Google (Google Identity Services). Loaded by nav.js on every page.
(async function () {
  const slot = document.getElementById("auth");
  if (!slot) return;

  let state;
  try {
    const r = await fetch("/api/auth/me");
    state = await r.json();
  } catch (e) {
    return; // no API available (e.g. plain static server): just hide the sign-in UI
  }

  window.currentUser = state.user;
  document.dispatchEvent(new CustomEvent("auth:ready", { detail: state.user }));

  if (state.user) {
    const name = document.createElement("span");
    name.textContent = state.user.name;
    const out = document.createElement("button");
    out.textContent = "Sign out";
    out.onclick = async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      location.reload();
    };
    slot.append(name, out);
    return;
  }

  if (!state.clientId) return;
  const s = document.createElement("script");
  s.src = "https://accounts.google.com/gsi/client";
  s.async = true;
  s.onload = () => {
    google.accounts.id.initialize({
      client_id: state.clientId,
      callback: async ({ credential }) => {
        const r = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential })
        });
        if (r.ok) location.reload();
        else slot.title = "Sign-in failed. Try again.";
      }
    });
    google.accounts.id.renderButton(slot, { theme: "outline", size: "medium", text: "signin_with" });
  };
  document.head.appendChild(s);
})();
