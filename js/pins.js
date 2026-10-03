// Converts between screen positions and Street View directions, and draws pins.
const FOV_AT_ZOOM1 = 90;  // tuning knob: if pins drift as you turn or zoom, try 80-100
let FOV_BASIS = "width";   // "width" or "max" (press b to toggle)
const ASSUMED_DIST = 15;  // meters: guess for how far away a pin's target is
const MAX_SHOW = 60;      // hide a pin when you're farther than this from it

const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];

// Camera axes in (east, north, up) for a heading and pitch in degrees.
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
  // FOV_AT_ZOOM1 is the field of view at zoom 1; each zoom step doubles the magnification.
  const f1 = (size / 2) / Math.tan(rad(FOV_AT_ZOOM1) / 2);
  return f1 * Math.pow(2, panorama.getZoom() - 1);
}

// Screen click -> {heading, pitch}
function clickToDirection(panorama, container, clientX, clientY) {
  const r = container.getBoundingClientRect();
  const dx = clientX - r.left - r.width / 2;
  const dy = clientY - r.top - r.height / 2;
  const pov = panorama.getPov(), B = basis(pov.heading, pov.pitch), f = focal(panorama, r.width);
  const D = [0, 1, 2].map(i => f*B.F[i] + dx*B.R[i] - dy*B.U[i]);
  const len = Math.hypot(...D);
  return { heading: (deg(Math.atan2(D[0], D[1])) + 360) % 360, pitch: deg(Math.asin(D[2] / len)) };
}

// {heading, pitch} -> screen position, or null if it's behind the camera
function directionToScreen(panorama, container, heading, pitch) {
  const r = container.getBoundingClientRect();
  const pov = panorama.getPov(), B = basis(pov.heading, pov.pitch), f = focal(panorama, r.width);
  const D = basis(heading, pitch).F;
  const x = dot(D, B.R), y = dot(D, B.U), z = dot(D, B.F);
  if (z <= 0.05) return null;
  return { x: r.width / 2 + f * x / z, y: r.height / 2 - f * y / z };
}

// Re-aim a pin from a different panorama position. Returns {heading, pitch} or null.
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

// Draws pins over the panorama and keeps them in place as the camera moves.
function createPinLayer(panorama, container, overlay) {
  let pins = [], els = [];

  function draw() {
    const current = panorama.getPano();
    const here = panorama.getPosition();
    pins.forEach((pin, i) => {
      let dir = { heading: pin.heading, pitch: pin.pitch };
      if (pin.pano !== current) dir = here ? aim(pin, here) : null;
      const pos = dir ? directionToScreen(panorama, container, dir.heading, dir.pitch) : null;
      if (!pos) { els[i].style.display = "none"; return; }
      els[i].style.display = "block";
      els[i].style.transform = `translate(${pos.x}px, ${pos.y}px)`;
    });
  }

  function set(newPins, labelFn, onClick) {
    overlay.innerHTML = "";
    pins = newPins;
    els = pins.map((pin, i) => {
      const el = document.createElement("button");
      el.className = "pin";
      el.textContent = labelFn(pin, i);
      el.onclick = () => onClick && onClick(pin, i);
      overlay.appendChild(el);
      return el;
    });
    draw();
  }

  ["pov_changed", "zoom_changed", "pano_changed", "position_changed"]
    .forEach(ev => panorama.addListener(ev, draw));
  window.addEventListener("resize", draw);
  return { set, draw };
}