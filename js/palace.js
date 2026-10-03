const LOCATIONS = [
  { name: "Engineering Quad", lat: 42.4446, lng: -76.4822 },
  { name: "Arts Quad", lat: 42.4491, lng: -76.4835 },
  { name: "Times Square (test spot)", lat: 40.7580, lng: -73.9855 }
];

// palace = { location, chunks: [{title, detail}], pins: [{chunk, pano, lat, lng, heading, pitch}] }
function savePalace(p) {
  try { localStorage.setItem("palace2", JSON.stringify(p)); } catch (e) { console.warn(e); }
}
function loadPalace() {
  try { const r = localStorage.getItem("palace2"); return r ? JSON.parse(r) : null; }
  catch (e) { return null; }
}