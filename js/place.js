const palace = loadPalace();
if (!palace) location.href = "create.html";

const stageEl = document.getElementById("stage");
const overlayEl = document.getElementById("overlay");
const bankEl = document.getElementById("bank");
const hintEl = document.getElementById("hint");
const dateEl = document.getElementById("date");
let baseDate = null; // the imagery date where the user started
const DEFAULT_HINT = "Walk around, then tap a chunk and tap the scene, or drag a chunk onto it. Tap a pin to send it back.";
let panorama, service, layer, selected = null;

// Drag ghost that looks like a pin (tip at the cursor)
const dragImg = new Image(30, 40);
dragImg.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='30' height='40' viewBox='0 0 30 40'%3E%3Cpath d='M15 38C15 38 2 24 2 14a13 13 0 1 1 26 0c0 10-13 24-13 24z' fill='%23f2b134' stroke='%230d1527' stroke-width='2'/%3E%3C/svg%3E";

window.initPlace = function () {
  service = new google.maps.StreetViewService();
  panorama = new google.maps.StreetViewPanorama(document.getElementById("pano"), {
    addressControl: false, fullscreenControl: false, motionTracking: false, enableCloseButton: false
  });
  layer = createPinLayer(panorama, stageEl, overlayEl);
  panorama.addListener("pano_changed", updateDate);
  service.getPanorama({ location: { lat: palace.location.lat, lng: palace.location.lng }, radius: 200 }, (data, status) => {
    if (status === "OK") { panorama.setPano(data.location.pano); panorama.setVisible(true); }
    else hintEl.textContent = "No Street View near this location. Go back and choose another.";
  });
  hintEl.textContent = DEFAULT_HINT;
  refresh();
};

function refresh() {
  bankEl.innerHTML = "";
  palace.chunks.forEach((c, i) => {
    const li = document.createElement("li");
    const placed = palace.pins.some(p => p.chunk === i);
    li.textContent = `${placed ? "✓ " : ""}${i + 1}. ${c.title || c.detail}`;
    li.draggable = true;
    if (placed) li.classList.add("placed");
    if (selected === i) li.classList.add("selected");
    li.onclick = () => select(i);
    li.ondragstart = e => {
      e.dataTransfer.setData("text/plain", String(i));
      e.dataTransfer.setDragImage(dragImg, 15, 38);
    };
    bankEl.appendChild(li);
  });
  if (layer) layer.set(palace.pins, p => p.chunk + 1, removePin);
}

function select(i) {
  selected = selected === i ? null : i;
  panorama.setOptions({ clickToGo: selected === null }); // don't walk away while placing
  document.body.classList.toggle("placing", selected !== null);
  hintEl.textContent = selected === null ? DEFAULT_HINT : "Now tap where it belongs in the scene.";
  refresh();
}

function placePin(i, x, y) {
  const dir = clickToDirection(panorama, stageEl, x, y);
  const pos = panorama.getPosition();
  palace.pins = palace.pins.filter(p => p.chunk !== i); // one pin per chunk
  palace.pins.push({ chunk: i, pano: panorama.getPano(), lat: pos.lat(), lng: pos.lng(), ...dir });
  savePalace(palace);
  selected = null;
  document.body.classList.remove("placing");
  hintEl.textContent = DEFAULT_HINT;
  refresh();
  // Turn click-to-walk back on only AFTER this click is over, so Street View doesn't move us.
  setTimeout(() => panorama.setOptions({ clickToGo: true }), 400);
}

function removePin(pin) {
  palace.pins = palace.pins.filter(p => p !== pin);
  savePalace(palace);
  refresh();
}

function updateDate() {
  const id = panorama.getPano();
  if (!id) return;
  service.getPanorama({ pano: id }, (d, s) => {
    if (s !== "OK" || !d.imageDate) return;
    if (!baseDate) baseDate = d.imageDate;
    dateEl.textContent = d.imageDate === baseDate
      ? `Imagery from ${d.imageDate}`
      : `Imagery from ${d.imageDate}. It may look different from ${baseDate}, where you started.`;
  });
}

// Tap to place: ignore taps that were really camera drags.
let down = null;
stageEl.addEventListener("pointerdown", e => { down = { x: e.clientX, y: e.clientY }; }, true);
stageEl.addEventListener("click", e => {
  if (selected === null || e.target.closest(".pin")) return;
  if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
  e.stopPropagation();   // keep Street View from also treating this as a "walk here" click
  e.preventDefault();
  placePin(selected, e.clientX, e.clientY);
}, true);

// Drag and drop from the bank (desktop).
stageEl.addEventListener("dragover", e => e.preventDefault());
stageEl.addEventListener("drop", e => {
  e.preventDefault();
  const i = Number(e.dataTransfer.getData("text/plain"));
  if (!Number.isNaN(i)) placePin(i, e.clientX, e.clientY);
});

// Escape cancels a selection.
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && selected !== null) select(selected);
});

// Live tuning: [ and ] change the field of view, b toggles how it's measured.
document.addEventListener("keydown", e => {
  if (e.key === "[" || e.key === "]") FOV_AT_ZOOM1 += e.key === "]" ? 5 : -5;
  else if (e.key === "b") FOV_BASIS = FOV_BASIS === "width" ? "max" : "width";
  else return;
  layer.draw();
  hintEl.textContent = `Tuning: FOV ${FOV_AT_ZOOM1}, basis ${FOV_BASIS}`;
});

const tag = document.createElement("script");
tag.src = `https://maps.googleapis.com/maps/api/js?key=${window.MAPS_API_KEY}&callback=initPlace`;
tag.async = true;
document.head.appendChild(tag);