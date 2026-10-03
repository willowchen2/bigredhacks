const palace = loadPalace();
const pins = palace ? [...palace.pins].sort((a, b) => a.chunk - b.chunk) : [];
let index = 0, panorama, service;


// Quiz mode: pins show "?" and their fact stays hidden until the pin is tapped.
let quiz = new URLSearchParams(location.search).get("quiz") === "1";
const revealed = new Set();   // chunk indexes the user has revealed this session
let shown = null;             // chunk index currently displayed in the card (quiz mode)


const els = {
  count: document.getElementById("count"),
  fact: document.getElementById("fact"),
  detail: document.getElementById("detail"),
  scene: document.getElementById("scene"),
  prev: document.getElementById("prev"),
  next: document.getElementById("next"),
  status: document.getElementById("status"),
  detail: document.getElementById("detail"),
  quizToggle: document.getElementById("quizToggle"), quizReset: document.getElementById("quizReset")
};

window.initWalk = function () {
  if (!pins.length) {
    els.fact.textContent = "No pins yet";
    els.detail.textContent = "Go back and place your chunks first.";
    els.prev.disabled = els.next.disabled = true;
    return;
  }
  service = new google.maps.StreetViewService();
  panorama = new google.maps.StreetViewPanorama(document.getElementById("pano"), {
    addressControl: false, fullscreenControl: false, motionTracking: false
  });
  layer = createPinLayer(panorama, document.getElementById("stage"), document.getElementById("overlay"));
  layer.set(pins, palace ? palace.chunks : [], {
    onSelect: (pin, i) => go(i),
    activePinIndex: 0
  });
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
  if (i < 0 || i >= pins.length) return;
  index = i;
  const pin = pins[i], chunk = palace.chunks[pin.chunk];
  els.count.textContent = `Pin ${i + 1} of ${pins.length}`;
  els.fact.textContent = chunk.title;
  els.detail.textContent = chunk.detail || "";
  els.scene.textContent = chunk.scene || "";
  els.prev.disabled = i === 0;
  els.next.disabled = i === pins.length - 1;
  els.status.textContent = "";

  const show = id => {
    panorama.setPano(id);
    panorama.setPov({ heading: pin.heading, pitch: pin.pitch });
    panorama.setVisible(true);
  };
  service.getPanorama({ pano: pin.pano }, (d, s) => {
    if (s === "OK") return show(pin.pano);
    service.getPanorama({ location: { lat: pin.lat, lng: pin.lng }, radius: 50 }, (d2, s2) => {
      if (s2 === "OK") show(d2.location.pano);
      else els.status.textContent = "Couldn't load Street View for this pin.";
    });
  });
}

const tag = document.createElement("script");
tag.src = `https://maps.googleapis.com/maps/api/js?key=${window.MAPS_API_KEY}&callback=initWalk`;
tag.async = true;
document.head.appendChild(tag);