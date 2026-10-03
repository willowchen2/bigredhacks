// Quiz mode: pins hide their facts. Find a pin, try to recall it, click to reveal, then grade yourself.
const palace = loadPalace();
if (!palace) location.href = "create.html";

const QUIZ_KEY = "quiz1";
const bankEl = document.getElementById("bank");
const hintEl = document.getElementById("hint");
const progressEl = document.getElementById("progress");
const summaryEl = document.getElementById("summary");
const nextBtn = document.getElementById("next-pin");
const restartBtn = document.getElementById("restart");

const pins = palace ? palace.pins : [];
let panorama, service, layer;

// ---- quiz state: { order: [chunkIdx...], revealed: {}, guesses: {}, results: {} } ----
function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function freshState() {
  return { order: shuffle(pins.map(p => p.chunk)), revealed: {}, guesses: {}, results: {} };
}
function loadQuiz() {
  try {
    const s = JSON.parse(localStorage.getItem(QUIZ_KEY));
    const have = pins.map(p => p.chunk).sort((a, b) => a - b).join(",");
    const saved = s && Array.isArray(s.order) ? s.order.slice().sort((a, b) => a - b).join(",") : null;
    if (s && saved === have) return s; // same set of pins as last time
  } catch (e) { /* fall through */ }
  return freshState();
}
function saveQuiz() {
  try { localStorage.setItem(QUIZ_KEY, JSON.stringify(state)); } catch (e) { console.warn(e); }
}
let state = loadQuiz();

const pinFor = chunk => pins.find(p => p.chunk === chunk);

// ---- map ----
window.initQuiz = function () {
  if (!pins.length) return;
  service = new google.maps.StreetViewService();
  panorama = new google.maps.StreetViewPanorama(document.getElementById("pano"), {
    addressControl: false, fullscreenControl: false, motionTracking: false, enableCloseButton: false
  });
  layer = createPinLayer(panorama, document.getElementById("stage"), document.getElementById("overlay"));
  refresh();
  const firstOpen = state.order.find(c => !state.results[c]);
  jumpTo(firstOpen !== undefined ? firstOpen : state.order[0], false);
};

// Move the camera to a pin's spot (without revealing anything).
function jumpTo(chunk, openCard = true) {
  const pin = pinFor(chunk);
  if (!pin || !service) return;
  const show = id => {
    panorama.setPano(id);
    panorama.setPov({ heading: pin.heading, pitch: pin.pitch });
    panorama.setVisible(true);
    if (openCard) layer.setActiveCard(pins.indexOf(pin));
  };
  service.getPanorama({ pano: pin.pano }, (d, s) => {
    if (s === "OK") return show(pin.pano);
    service.getPanorama({ location: { lat: pin.lat, lng: pin.lng }, radius: 50 }, (d2, s2) => {
      if (s2 === "OK") show(d2.location.pano);
      else hintEl.textContent = "Couldn't load Street View for that pin.";
    });
  });
}

// ---- rendering ----
function refresh(activeIdx = null) {
  renderPanel();
  if (layer) {
    layer.set(pins, palace.chunks, {
      activePinIndex: activeIdx,
      quiz: {
        state,
        onReveal: (pin, i) => { state.revealed[pin.chunk] = true; saveQuiz(); refresh(i); },
        onGrade: (pin, i, right) => { state.results[pin.chunk] = right ? "right" : "wrong"; saveQuiz(); refresh(i); },
        onReset: (pin, i) => {
          delete state.revealed[pin.chunk]; delete state.results[pin.chunk]; delete state.guesses[pin.chunk];
          saveQuiz(); refresh(i);
        }
      }
    });
  }
}

function renderPanel() {
  bankEl.innerHTML = "";
  summaryEl.hidden = true;

  if (!pins.length) {
    hintEl.textContent = "You haven't placed any pins yet. Place your facts on the map first, then come back to quiz yourself.";
    progressEl.textContent = "";
    nextBtn.hidden = restartBtn.hidden = true;
    const a = document.createElement("a");
    a.className = "btn";
    a.href = "place.html";
    a.textContent = "Place your pins";
    bankEl.after(a);
    return;
  }

  hintEl.textContent = "Every pin hides a fact. Look around, click a pin, guess what you stored there, then reveal the answer.";
  const total = pins.length;
  const right = state.order.filter(c => state.results[c] === "right").length;
  const wrong = state.order.filter(c => state.results[c] === "wrong").length;
  progressEl.textContent = `${right + wrong} of ${total} graded \u00b7 ${right} remembered`;

  state.order.forEach((chunk, n) => {
    const li = document.createElement("li");
    const r = state.results[chunk];
    const mark = r === "right" ? "\u2713 " : r === "wrong" ? "\u2717 " : state.revealed[chunk] ? "\u25d0 " : "\u25cb ";
    li.textContent = `${mark}Pin ${n + 1}`;
    if (r) li.classList.add(r);
    li.tabIndex = 0;
    li.onclick = () => jumpTo(chunk);
    li.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); jumpTo(chunk); } };
    bankEl.appendChild(li);
  });

  nextBtn.disabled = right + wrong === total;

  if (right + wrong === total) {
    summaryEl.hidden = false;
    summaryEl.innerHTML = "";
    const h = document.createElement("strong");
    h.textContent = `You remembered ${right} of ${total}.`;
    summaryEl.appendChild(h);
    if (wrong) {
      const retry = document.createElement("button");
      retry.type = "button";
      retry.textContent = "Retry missed pins";
      retry.onclick = retryMissed;
      summaryEl.appendChild(retry);
    }
  }
}

function retryMissed() {
  state.order.forEach(c => {
    if (state.results[c] === "wrong") {
      delete state.results[c]; delete state.revealed[c]; delete state.guesses[c];
    }
  });
  saveQuiz();
  refresh();
  const next = state.order.find(c => !state.results[c]);
  if (next !== undefined) jumpTo(next, false);
}

nextBtn.onclick = () => {
  const next = state.order.find(c => !state.results[c]);
  if (next !== undefined) jumpTo(next, false);
};
restartBtn.onclick = () => {
  if (!confirm("Restart the quiz? Your results will be cleared and the pins reshuffled.")) return;
  state = freshState();
  saveQuiz();
  refresh();
  jumpTo(state.order[0], false);
};

if (!pins.length) renderPanel();
else {
  const tag = document.createElement("script");
  tag.src = `https://maps.googleapis.com/maps/api/js?key=${window.MAPS_API_KEY}&callback=initQuiz`;
  tag.async = true;
  document.head.appendChild(tag);
}
