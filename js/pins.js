// Converts between screen positions and Street View directions, and draws pins with interactive cards.
const FOV_AT_ZOOM1 = 90;
let FOV_BASIS = "width";
const ASSUMED_DIST = 15;
const MAX_SHOW = 60;

const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];

function basis(h, p) {
  h = rad(h); p = rad(p);
  return {
    F: [Math.cos(p)*Math.sin(h), Math.cos(p)*Math.cos(h), Math.sin(p)],
    R: [Math.cos(h), -Math.sin(h), 0],
    U: [-Math.sin(p)*Math.sin(h), -Math.sin(p)*Math.cos(h), Math.cos(p)]
  };
}

function focal(panorama) {
  const r = document.getElementById("stage").getBoundingClientRect();
  const size = FOV_BASIS === "width" ? r.width : Math.max(r.width, r.height);
  const f1 = (size / 2) / Math.tan(rad(FOV_AT_ZOOM1) / 2);
  return f1 * Math.pow(2, panorama.getZoom() - 1);
}

function clickToDirection(panorama, container, clientX, clientY) {
  const r = container.getBoundingClientRect();
  const dx = clientX - r.left - r.width / 2;
  const dy = clientY - r.top - r.height / 2;
  const pov = panorama.getPov(), B = basis(pov.heading, pov.pitch), f = focal(panorama);
  const D = [0, 1, 2].map(i => f*B.F[i] + dx*B.R[i] - dy*B.U[i]);
  const len = Math.hypot(...D);
  return { heading: (deg(Math.atan2(D[0], D[1])) + 360) % 360, pitch: deg(Math.asin(D[2] / len)) };
}

function directionToScreen(panorama, container, heading, pitch) {
  const r = container.getBoundingClientRect();
  const pov = panorama.getPov(), B = basis(pov.heading, pov.pitch), f = focal(panorama);
  const D = basis(heading, pitch).F;
  const x = dot(D, B.R), y = dot(D, B.U), z = dot(D, B.F);
  if (z <= 0.05) return null;
  return { x: r.width / 2 + f * x / z, y: r.height / 2 - f * y / z };
}

function aim(pin, here) {
  const k = 111320, cosLat = Math.cos(rad(pin.lat));
  const hh = rad(pin.heading);
  const east = (pin.lng - here.lng()) * k * cosLat + Math.sin(hh) * ASSUMED_DIST;
  const north = (pin.lat - here.lat()) * k + Math.cos(hh) * ASSUMED_DIST;
  const dist = Math.hypot(east, north);
  if (dist < 2 || dist > MAX_SHOW) return null;
  const height = ASSUMED_DIST * Math.tan(rad(pin.pitch));
  return { heading: (deg(Math.atan2(east, north)) + 360) % 360, pitch: deg(Math.atan2(height, dist)) };
}

// Quiz mode helper: does a typed guess roughly match a chunk's title (or detail if there's no title)?
function matchesGuess(guess, chunk) {
  const words = t => (t || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 2);
  const g = new Set(words(guess));
  if (!g.size) return false;
  const t = words(chunk.title);
  const base = t.length ? t : words(chunk.detail);
  if (!base.length) return false;
  return base.filter(w => g.has(w)).length / base.length >= 0.5;
}

function createPinLayer(panorama, container, overlay) {
  let pins = [], chunks = [], els = [];
  let activePinIndex = null;
  let onRemoveCallback = null;
  let onSelectCallback = null;
  let onTapCallback = null;
  let revealStates = null; // walk mode: 0 = number only, 1 = term, 2 = term + definition
  let quiz = null; // { state: {revealed, guesses, results}, onReveal, onGrade, onReset }

  function draw() {
    const current = panorama.getPano();
    const here = panorama.getPosition();
    pins.forEach((pin, i) => {
      let dir = { heading: pin.heading, pitch: pin.pitch };
      if (pin.pano !== current) dir = here ? aim(pin, here) : null;
      const pos = dir ? directionToScreen(panorama, container, dir.heading, dir.pitch) : null;
      if (!pos) {
        if (els[i]) els[i].style.display = "none";
        return;
      }
      if (els[i]) {
        els[i].style.display = "block";
        els[i].style.transform = `translate(${pos.x}px, ${pos.y}px)`;
      }
    });
  }

  function setActiveCard(index) {
    if (revealStates) return;
    activePinIndex = index;
    els.forEach((el, i) => {
      const popup = el.querySelector(".pin-card-popup");
      const badge = el.querySelector(".pin-badge");
      if (popup) {
        const isOpen = (i === activePinIndex);
        popup.hidden = !isOpen;
        if (badge) badge.classList.toggle("active", isOpen);
      }
    });
  }

  // Quiz mode: the pin hides its fact until the user reveals it.
  function buildQuizAnchor(pin, i, chunk) {
    const st = quiz.state, key = pin.chunk;
    const revealed = !!st.revealed[key];
    const result = st.results[key]; // "right" | "wrong" | undefined
    const guess = st.guesses[key] || "";

    const anchor = document.createElement("div");
    anchor.className = "pin-anchor";

    const marker = document.createElement("button");
    marker.type = "button";
    marker.className = "pin-marker" + (result ? " quiz-" + result : "");
    marker.setAttribute("aria-label", result ? chunk.title : "Hidden term. Select to recall it.");

    const badge = document.createElement("div");
    badge.className = "pin-badge " + (result ? "quiz-" + result : "quiz-hidden");
    const num = document.createElement("span");
    num.className = "badge-num";
    num.textContent = result === "right" ? "\u2713" : result === "wrong" ? "\u2717" : "?";
    const bt = document.createElement("span");
    bt.className = "badge-title";
    bt.textContent = result ? (chunk.title || "Stop") : "Recall this";
    badge.append(num, bt);

    const card = document.createElement("div");
    card.className = "pin-card-popup quiz-card";
    card.hidden = (i !== activePinIndex);
    ["click", "keydown", "keyup", "pointerdown"].forEach(ev => card.addEventListener(ev, e => e.stopPropagation()));

    const header = document.createElement("div");
    header.className = "pin-card-header";
    const tag = document.createElement("span");
    tag.className = "pin-card-tag";
    tag.textContent = revealed ? "Answer" : "Recall";
    header.appendChild(tag);
    card.appendChild(header);

    const mk = (tagName, cls, text) => {
      const el = document.createElement(tagName);
      if (cls) el.className = cls;
      if (text !== undefined) el.textContent = text;
      return el;
    };

    if (!revealed) {
      card.appendChild(mk("p", "pin-card-detail", "Which term did you place at this spot? Try to remember it, then reveal."));
      const input = document.createElement("input");
      input.type = "text";
      input.className = "quiz-guess";
      input.placeholder = "Your guess (optional)";
      input.value = guess;
      input.setAttribute("aria-label", "Your guess");
      input.addEventListener("input", () => { st.guesses[key] = input.value; });
      const reveal = mk("button", "quiz-btn quiz-reveal", "Reveal answer");
      reveal.type = "button";
      const doReveal = () => { st.guesses[key] = input.value; quiz.onReveal(pin, i); };
      reveal.onclick = doReveal;
      input.addEventListener("keydown", e => { if (e.key === "Enter") doReveal(); });
      card.append(input, reveal);
    } else {
      if (guess.trim()) {
        card.appendChild(mk("p", "quiz-your-guess", "Your guess: " + guess.trim()));
        const ok = matchesGuess(guess, chunk);
        card.appendChild(mk("p", "quiz-verdict " + (ok ? "ok" : "off"), ok ? "Looks like a match" : "Doesn't look like a match"));
      }
      card.appendChild(mk("h4", "pin-card-title", chunk.title || "Stop " + (pin.chunk + 1)));
      card.appendChild(mk("p", "pin-card-detail", chunk.detail || "No details provided."));
      const row = mk("div", "quiz-grade-row");
      if (!result) {
        const got = mk("button", "quiz-btn quiz-got", "I got it");
        const missed = mk("button", "quiz-btn quiz-missed", "I missed it");
        got.type = missed.type = "button";
        got.onclick = () => quiz.onGrade(pin, i, true);
        missed.onclick = () => quiz.onGrade(pin, i, false);
        row.append(got, missed);
      } else {
        row.appendChild(mk("span", "quiz-result " + result, result === "right" ? "Marked as remembered" : "Marked as missed"));
        const again = mk("button", "quiz-btn quiz-again", "Try again");
        again.type = "button";
        again.onclick = () => quiz.onReset(pin, i);
        row.appendChild(again);
      }
      card.appendChild(row);
    }

    const toggle = (e) => {
      e.stopPropagation();
      setActiveCard(activePinIndex !== i ? i : null);
      if (onSelectCallback) onSelectCallback(pin, i);
    };
    marker.onclick = toggle;
    badge.onclick = toggle;

    anchor.append(marker, badge, card);
    overlay.appendChild(anchor);
    return anchor;
  }

  function set(newPins, newChunksOrLabelFn, clickOrOptions) {
    overlay.innerHTML = "";
    pins = newPins;

if (Array.isArray(newChunksOrLabelFn) && newChunksOrLabelFn.length > 0) {
  chunks = newChunksOrLabelFn;
} else {
  const saved = (typeof loadPalace === "function") ? loadPalace() : null;
  chunks = saved?.chunks || [];
}

    quiz = (clickOrOptions && typeof clickOrOptions === "object" && clickOrOptions.quiz) || null;
    if (typeof clickOrOptions === "object" && clickOrOptions !== null) {
      onRemoveCallback = clickOrOptions.onRemove || null;
      onSelectCallback = clickOrOptions.onSelect || null;
      activePinIndex = clickOrOptions.activePinIndex ?? null;
      revealStates = clickOrOptions.revealStates || null;
      onTapCallback = clickOrOptions.onTap || null;
    } else if (typeof clickOrOptions === "function") {
      onRemoveCallback = clickOrOptions;
    }

    els = pins.map((pin, i) => {
      const chunk = chunks[pin.chunk] || { title: `Stop ${pin.chunk + 1}`, detail: "" };
      const st = revealStates ? revealStates[i] : 2;
      if (quiz) return buildQuizAnchor(pin, i, chunk);
      const anchor = document.createElement("div");
      anchor.className = "pin-anchor";

      // 1. Teardrop Marker
      const marker = document.createElement("button");
      marker.className = "pin-marker";
      marker.setAttribute("aria-label", st >= 1 ? chunk.title : `Pin ${pin.chunk + 1}`);
      marker.textContent = "";

      // 2. Floating Pill with Key Term
      const badge = document.createElement("div");
      badge.className = "pin-badge";
      const num = document.createElement("span");
      num.className = "badge-num";
      num.textContent = String(pin.chunk + 1);
      badge.appendChild(num);
      if (st >= 1) {
        const t = document.createElement("span");
        t.className = "badge-title";
        t.textContent = chunk.title || "Stop";
        badge.appendChild(t);
      }

      // 3. Floating Popup Card directly where the pin is located
      const card = document.createElement("div");
      card.className = "pin-card-popup";
      card.hidden = revealStates ? st < 2 : (i !== activePinIndex);

      const header = document.createElement("div");
      header.className = "pin-card-header";

      const tag = document.createElement("span");
      tag.className = "pin-card-tag";
      tag.textContent = `Stop ${pin.chunk + 1}`;
      header.appendChild(tag);

      if (onRemoveCallback) {
        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "pin-card-del";
        delBtn.title = "Remove pin";
        delBtn.innerHTML = "✕ Remove";
        delBtn.onclick = (e) => {
          e.stopPropagation();
          onRemoveCallback(pin, i);
        };
        header.appendChild(delBtn);
      }

      const titleEl = document.createElement("h4");
      titleEl.className = "pin-card-title";
      titleEl.textContent = chunk.title;

      const detailEl = document.createElement("p");
      detailEl.className = "pin-card-detail";
      detailEl.textContent = chunk.detail || "No details provided.";

      card.append(header, titleEl, detailEl);

      const toggle = (e) => {
        e.stopPropagation();
        if (onTapCallback) { onTapCallback(i); return; }
        const willOpen = (activePinIndex !== i);
        setActiveCard(willOpen ? i : null);
        if (onSelectCallback) onSelectCallback(pin, i);
      };

      marker.onclick = toggle;
      badge.onclick = toggle;

      anchor.append(marker, badge, card);
      overlay.appendChild(anchor);
      return anchor;
    });

    draw();
  }

  overlay.addEventListener("click", (e) => {
    if (!e.target.closest(".pin-anchor")) {
      setActiveCard(null);
    }
  });

  ["pov_changed", "zoom_changed", "pano_changed", "position_changed"]
    .forEach(ev => panorama.addListener(ev, draw));
  window.addEventListener("resize", draw);

  return { set, draw, setActiveCard };
}