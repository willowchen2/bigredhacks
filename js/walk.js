// Street View walker: steps through the stops of a palace.
const palace = loadPalace();
let index = 0, panorama, service;

// Quiz mode: pins show "?" and their fact stays hidden until the pin is tapped.
let quiz = new URLSearchParams(location.search).get("quiz") === "1";
const revealed = new Set();   // chunk indexes the user has revealed this session
let shown = null;             // chunk index currently displayed in the card (quiz mode)

const els = {
<<<<<<< Updated upstream
  count: document.getElementById("count"),
  fact: document.getElementById("fact"),
  scene: document.getElementById("scene"),
  prev: document.getElementById("prev"),
  next: document.getElementById("next"),
  status: document.getElementById("status")
=======
  count: document.getElementById("count"), fact: document.getElementById("fact"),
  detail: document.getElementById("detail"), scene: document.getElementById("scene"),
  prev: document.getElementById("prev"), next: document.getElementById("next"),
  status: document.getElementById("status"),
  quizToggle: document.getElementById("quizToggle"), quizReset: document.getElementById("quizReset")
>>>>>>> Stashed changes
};

// Called by the Maps script once it has loaded.
window.initWalk = function () {
  service = new google.maps.StreetViewService();
  // Create ONE panorama and reuse it; each creation counts toward billing.
  panorama = new google.maps.StreetViewPanorama(document.getElementById("pano"), {
    addressControl: false, fullscreenControl: false, motionTracking: false
  });
<<<<<<< Updated upstream
=======
  layer = createPinLayer(panorama, document.getElementById("stage"), document.getElementById("overlay"));
>>>>>>> Stashed changes
  els.prev.onclick = () => go(index - 1);
  els.next.onclick = () => go(index + 1);
  els.quizToggle.onclick = () => { quiz = !quiz; shown = null; renderPins(); renderCard(); };
  els.quizReset.onclick = () => { revealed.clear(); shown = null; renderPins(); renderCard(); };
  go(0);
};

// (Re)draw the pins. In quiz mode they read "?" until revealed.
function renderPins() {
  layer.set(
    pins,
    p => (quiz && !revealed.has(p.chunk)) ? "?" : p.chunk + 1,
    quiz ? onQuizPin : undefined
  );
  Array.from(document.getElementById("overlay").children).forEach((el, i) => {
    el.classList.toggle("unrevealed", quiz && !revealed.has(pins[i].chunk));
    el.classList.toggle("active", quiz && shown === pins[i].chunk);
    el.setAttribute("aria-label", quiz && !revealed.has(pins[i].chunk) ? "Hidden pin" : `Pin ${pins[i].chunk + 1}`);
  });
}

// Tapping a pin reveals it; tapping the revealed pin again hides the answer.
function onQuizPin(pin) {
  if (shown === pin.chunk) shown = null;
  else { shown = pin.chunk; revealed.add(pin.chunk); }
  renderPins();
  renderCard();
}

function renderCard() {
  els.quizToggle.textContent = `Quiz mode: ${quiz ? "on" : "off"}`;
  els.quizToggle.setAttribute("aria-pressed", String(quiz));
  els.quizReset.hidden = !quiz;

  if (!quiz) {
    const chunk = palace.chunks[pins[index].chunk];
    els.count.textContent = `Pin ${index + 1} of ${pins.length}`;
    els.fact.textContent = chunk.title;
    els.detail.textContent = chunk.detail || "";
    els.scene.textContent = chunk.scene || "";
  } else if (shown === null) {
    els.count.textContent = `Quiz · ${revealed.size} of ${pins.length} revealed`;
    els.fact.textContent = "What does this pin stand for?";
    els.detail.textContent = "Look around, guess, then tap a pin to check yourself. Use Back and Next stop to visit other pins.";
    els.scene.textContent = "";
  } else {
    const chunk = palace.chunks[shown];
    els.count.textContent = `Quiz · ${revealed.size} of ${pins.length} revealed`;
    els.fact.textContent = chunk.title;
    els.detail.textContent = chunk.detail || "";
    els.scene.textContent = chunk.scene || "";
  }
}

function go(i) {
  if (i < 0 || i >= palace.stops.length) return;
  index = i;
<<<<<<< Updated upstream
  const s = palace.stops[i];
  els.count.textContent = `Stop ${i + 1} of ${palace.stops.length}`;
  els.fact.textContent = s.fact;
  els.scene.textContent = s.scene;
=======
  const pin = pins[i];
  shown = null;            // moving to a new spot hides any revealed answer
  renderPins();
  renderCard();
>>>>>>> Stashed changes
  els.prev.disabled = i === 0;
  els.next.disabled = i === palace.stops.length - 1;
  els.status.textContent = "";
  // Snap to the nearest panorama; some spots have no coverage.
  service.getPanorama({ location: { lat: s.lat, lng: s.lng }, radius: 50 }, (data, status) => {
    if (status === "OK") {
      panorama.setPano(data.location.pano);
      panorama.setPov({ heading: s.heading || 0, pitch: s.pitch || 0 });
      panorama.setVisible(true);
    } else {
      els.status.textContent = "No Street View here. Pick a different spot for this stop.";
    }
  });
}

const tag = document.createElement("script");
tag.src = `https://maps.googleapis.com/maps/api/js?key=${window.MAPS_API_KEY}&callback=initWalk`;
tag.async = true;
document.head.appendChild(tag);
