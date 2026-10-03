const palace = loadPalace();
const pins = palace ? [...palace.pins].sort((a, b) => a.chunk - b.chunk) : [];
let index = 0, panorama, service, layer;

const els = {
  count: document.getElementById("count"), fact: document.getElementById("fact"),
  detail: document.getElementById("detail"), scene: document.getElementById("scene"),
  prev: document.getElementById("prev"), next: document.getElementById("next"),
  status: document.getElementById("status")
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
});  els.prev.onclick = () => go(index - 1);
  els.next.onclick = () => go(index + 1);
  go(0);
};

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