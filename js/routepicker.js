// Route picker for create.html. Search anywhere, click the map to drop a start, optional
// via-points and an end. The route snaps to walkable streets (Routes API) and is checked
// against Street View coverage. create.js reads the result with routePicker.getRoute().
(function () {
  const MAX_POINTS = 1500;   // keep saved routes small, however long
  const MIN_SPACING_M = 20;  // metres between saved route points
  const infoEl = document.getElementById("route-info");
  const undoBtn = document.getElementById("route-undo");
  const clearBtn = document.getElementById("route-clear");

  let map, sv, AdvancedMarkerElement;
  let waypoints = [], markers = [], line = null, route = null, placeName = "", token = 0;

  const rad = d => d * Math.PI / 180;
  const num = (p, k) => (typeof p[k] === "function" ? p[k]() : p[k]);
  const say = t => { infoEl.textContent = t; };

  function dist(a, b) {
    const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
      Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
    return 2 * 6371000 * Math.asin(Math.sqrt(h));
  }

  // Evenly spaced points along a path.
  function resample(path, spacing) {
    const out = [path[0]];
    let carry = 0;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i], d = dist(a, b);
      if (!d) continue;
      let pos = spacing - carry;
      while (pos <= d) {
        const t = pos / d;
        out.push({ lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t });
        pos += spacing;
      }
      carry = d - (pos - spacing);
    }
    const end = path[path.length - 1];
    if (dist(out[out.length - 1], end) > 1) out.push(end);
    return out;
  }

  const hasPano = pt => new Promise(res =>
    sv.getPanorama({ location: pt, radius: 30, source: google.maps.StreetViewSource.OUTDOOR },
      (d, s) => res(s === "OK")));

  // Fraction of the route (sampled) that has Street View imagery.
  async function coverage(points, my) {
    const step = Math.max(1, Math.ceil(points.length / 50));
    const samples = points.filter((_, i) => i % step === 0);
    let ok = 0;
    for (let i = 0; i < samples.length; i += 8) {
      const res = await Promise.all(samples.slice(i, i + 8).map(hasPano));
      if (my !== token) return null; // route changed while checking
      ok += res.filter(Boolean).length;
    }
    return ok / samples.length;
  }

  function renderMarkers() {
    markers.forEach(m => (m.map = null));
    markers = waypoints.map((p, i) => {
      const dot = document.createElement("div");
      const isEnd = i === waypoints.length - 1 && i > 0;
      dot.className = "rp-dot " + (i === 0 ? "start" : isEnd ? "end" : "via");
      dot.textContent = i === 0 ? "A" : isEnd ? "B" : String(i);
      return new AdvancedMarkerElement({ map, position: p, content: dot, title: dot.textContent });
    });
  }

  async function update() {
    const my = ++token;
    route = null;
    document.dispatchEvent(new Event("route:changed"));
    if (line) { line.setMap(null); line = null; }
    renderMarkers();
    undoBtn.disabled = clearBtn.disabled = waypoints.length === 0;
    if (waypoints.length < 2) {
      say(waypoints.length ? "Now click where the walk should end." : "Click the map to set a start point.");
      return;
    }
    say("Finding a walking route...");
    try {
      const { Route } = await google.maps.importLibrary("routes");
      const { routes } = await Route.computeRoutes({
        origin: waypoints[0],
        destination: waypoints[waypoints.length - 1],
        intermediates: waypoints.slice(1, -1),
        travelMode: "WALKING",
        fields: ["path"]
      });
      if (my !== token) return;
      if (!routes || !routes.length) { say("No walking route between those points. Try different spots."); return; }

      const raw = routes[0].path.map(p => ({ lat: num(p, "lat"), lng: num(p, "lng") }));
      let length = 0;
      for (let i = 1; i < raw.length; i++) length += dist(raw[i - 1], raw[i]);
      const pts = resample(raw, Math.max(MIN_SPACING_M, length / MAX_POINTS));

      line = new google.maps.Polyline({ map, path: raw, strokeColor: "#d97736", strokeWeight: 5, strokeOpacity: 0.9 });
      route = {
        name: placeName ? `Walk near ${placeName}` : "Custom route",
        lengthM: Math.round(length),
        points: pts.map(p => [+p.lat.toFixed(5), +p.lng.toFixed(5)])
      };
      document.dispatchEvent(new Event("route:changed"));
      const km = (length / 1000).toFixed(length < 10000 ? 1 : 0);
      say(`Route: ${km} km. Checking Street View coverage...`);

      const frac = await coverage(pts, my);
      if (frac === null || my !== token) return;
      say(frac >= 0.95
        ? `Route: ${km} km. Street View covers the whole route.`
        : `Route: ${km} km. Street View covers about ${Math.round(frac * 100)}% of it. You can still use it, but there are gaps.`);
    } catch (e) {
      console.error(e);
      say("Couldn't get a walking route. Check that the Routes API is enabled for your Maps key.");
    }
  }

  async function init() {
    const { Map } = await google.maps.importLibrary("maps");
    ({ AdvancedMarkerElement } = await google.maps.importLibrary("marker"));
    sv = new google.maps.StreetViewService();

    map = new Map(document.getElementById("routemap"), {
      center: { lat: 42.4491, lng: -76.4835 }, zoom: 15,
      mapId: "DEMO_MAP_ID", streetViewControl: false, fullscreenControl: true, clickableIcons: false
    });
    new google.maps.StreetViewCoverageLayer().setMap(map);

    map.addListener("click", e => { waypoints.push(e.latLng.toJSON()); update(); });
    undoBtn.onclick = () => { waypoints.pop(); update(); };
    clearBtn.onclick = () => { waypoints = []; placeName = ""; update(); };
    update();

    try {
      const { PlaceAutocompleteElement } = await google.maps.importLibrary("places");
      const ac = new PlaceAutocompleteElement({});
      document.getElementById("search-slot").appendChild(ac);
      ac.addEventListener("gmp-select", async ({ placePrediction }) => {
        const place = placePrediction.toPlace();
        await place.fetchFields({ fields: ["displayName", "location", "viewport"] });
        placeName = place.displayName || "";
        if (place.viewport) map.fitBounds(place.viewport);
        else { map.setCenter(place.location); map.setZoom(16); }
      });
    } catch (e) {
      console.warn("Place search unavailable (enable Places API (New)):", e);
      document.getElementById("search-slot").textContent = "Search is unavailable, but you can still pan and zoom the map.";
    }
  }

  window.routePicker = { getRoute: () => route };

  window.initRoutePicker = init;
  if (!MAPS_API_KEY) { say("Add your Maps key to js/config.js to use the map."); return; }
  const tag = document.createElement("script");
  tag.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&v=weekly&loading=async&callback=initRoutePicker`;
  tag.async = true;
  document.head.appendChild(tag);
})();
