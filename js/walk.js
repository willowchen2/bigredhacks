const palace = loadPalace();
const pins = palace ? [...palace.pins].sort((a, b) => a.chunk - b.chunk) : [];
let index = 0, panorama, service, layer;
const states = pins.map(() => 0); // per pin: 0 = number only, 1 = term shown, 2 = term + definition shown

const $ = id => document.getElementById(id);
const els = { count: $("count"), bar: $("bar"), instr: $("instr"), prev: $("prev"), next: $("next"), reveal: $("reveal"), status: $("status") };
const TEXT = [
  "Look around: which term belongs at this pin? Try to recall it, then reveal it.",
  "Now try to recall the definition before you reveal it.",
  "Got it? Move on to the next stop."
];
const REVEAL_LABEL = ["Show term", "Show definition", "Hide again"];

window.initWalk = function () {
  if (!pins.length) {
    els.instr.textContent = "No pins yet. Go back and place your terms first.";
    els.prev.disabled = els.next.disabled = els.reveal.disabled = true;
    return;
  }
  service = new google.maps.StreetViewService();
  panorama = new google.maps.StreetViewPanorama($("pano"), {
    addressControl: false, fullscreenControl: false, motionTracking: false
  });
  layer = createPinLayer(panorama, $("stage"), $("overlay"));
  els.prev.onclick = () => go(index - 1);
  els.next.onclick = () => go(index + 1);
  els.reveal.onclick = () => tap(index);
  go(0);
};

// Tapping the current pin steps through: number -> term -> definition -> hidden again.
function tap(i) {
  if (i !== index) return go(i);
  states[i] = (states[i] + 1) % 3;
  render();
}

function render() {
  layer.set(pins, palace.chunks, { revealStates: states, onTap: tap });
  const last = index === pins.length - 1, st = states[index];
  els.count.textContent = `Stop ${index + 1} of ${pins.length}`;
  els.bar.style.width = `${((index + 1) / pins.length) * 100}%`;
  els.instr.textContent = st === 2 && last ? "That's the whole walk! Go back to stop 1 and try again from memory." : TEXT[st];
  els.reveal.textContent = REVEAL_LABEL[st];
  els.prev.disabled = index === 0;
  els.next.disabled = last;
}

function go(i) {
  if (i < 0 || i >= pins.length) return;
  index = i;
  states[i] = 0; // arriving at a stop starts hidden, so you can test yourself
  els.status.textContent = "";
  render();

  const pin = pins[i];
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
