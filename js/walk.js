// Street View walker: steps through the stops of a palace.
const palace = loadPalace();
let index = 0, panorama, service;

const els = {
  count: document.getElementById("count"),
  fact: document.getElementById("fact"),
  scene: document.getElementById("scene"),
  prev: document.getElementById("prev"),
  next: document.getElementById("next"),
  status: document.getElementById("status")
};

// Called by the Maps script once it has loaded.
window.initWalk = function () {
  service = new google.maps.StreetViewService();
  // Create ONE panorama and reuse it; each creation counts toward billing.
  panorama = new google.maps.StreetViewPanorama(document.getElementById("pano"), {
    addressControl: false, fullscreenControl: false, motionTracking: false
  });
  els.prev.onclick = () => go(index - 1);
  els.next.onclick = () => go(index + 1);
  go(0);
};

function go(i) {
  if (i < 0 || i >= palace.stops.length) return;
  index = i;
  const s = palace.stops[i];
  els.count.textContent = `Stop ${i + 1} of ${palace.stops.length}`;
  els.fact.textContent = s.fact;
  els.scene.textContent = s.scene;
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
