// Shared data + helpers. A palace is just JSON.
const DEMO_PALACE = {
  title: "Demo: Cell Biology",
  stops: [
    { lat: 40.7580, heading: 0, pitch: 5, lng: -73.9855, 
      fact: "Mitochondria produce ATP",
      scene: "A giant glowing battery buzzes in the middle of the crossing, charging every phone in the crowd." },
    { lat: 40.7536, heading: 90, pitch: 5, lng: -73.9832, 
      fact: "The nucleus stores DNA",
      scene: "A vault door in the park wall is stuffed with spiral staircases of shiny ribbon." },
    { lat: 40.7532, heading: 270, pitch: 10, lng: -73.9822, 
      fact: "Ribosomes build proteins",
      scene: "Tiny chefs in hard hats are assembling burgers on top of the library lions." },
    { lat: 40.7527, heading: 180, pitch: 5, lng: -73.9772, 
      fact: "The cell membrane controls what enters and exits",
      scene: "A strict bouncer in the station doorway is checking tickets for every passing molecule." }
  ]
};

function savePalace(p) {
  try { localStorage.setItem("palace", JSON.stringify(p)); } catch (e) { console.warn(e); }
}
function loadPalace() {
  try {
    const raw = localStorage.getItem("palace");
    return raw ? JSON.parse(raw) : DEMO_PALACE;
  } catch (e) { return DEMO_PALACE; }
}
