// palace = { location, route: {name, points: [[lat,lng],...], lengthM}, chunks: [{title, detail}], pins: [{chunk, pano, lat, lng, heading, pitch}] }
function savePalace(p) {
  try { localStorage.setItem("palace2", JSON.stringify(p)); } catch (e) { console.warn(e); }
}
function loadPalace() {
  try { const r = localStorage.getItem("palace2"); return r ? JSON.parse(r) : null; }
  catch (e) { return null; }
}