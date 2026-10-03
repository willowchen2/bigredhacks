const $ = id => document.getElementById(id);
const notesEl = $("notes"), countEl = $("count"), listEl = $("facts"), msgEl = $("msg");
const extractBtn = $("extract"), buildMsg = $("build-msg"), emptyEl = $("facts-empty");

// Upload: read a .txt/.md file into the textarea.
$("file").onchange = async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  notesEl.value = await f.text();
  $("file-name").textContent = f.name;
  refresh();
};

extractBtn.onclick = async () => {
  msgEl.textContent = "Reading your notes...";
  extractBtn.disabled = true;
  try {
    const res = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: notesEl.value, count: countEl.value })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Something went wrong.");
    listEl.innerHTML = "";
    data.chunks.forEach(c => addRow(c));
    msgEl.textContent = "Done! Review your terms in step 2.";
    refresh();
    $("step2").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (e) {
    msgEl.textContent = e.message;
  } finally {
    extractBtn.disabled = false;
  }
};

function addRow(chunk) {
  const li = document.createElement("li");
  const title = document.createElement("input");
  title.type = "text"; title.value = chunk.title; title.className = "t";
  title.placeholder = "Term"; title.setAttribute("aria-label", "Term");
  const detail = document.createElement("textarea");
  detail.value = chunk.detail; detail.className = "d"; detail.rows = 2;
  detail.placeholder = "Definition"; detail.setAttribute("aria-label", "Definition");
  const del = document.createElement("button");
  del.textContent = "Remove";
  del.onclick = () => { li.remove(); refresh(); };
  li.append(title, detail, del);
  listEl.appendChild(li);
  return li;
}

$("add-term").onclick = () => {
  addRow({ title: "", detail: "" }).querySelector(".t").focus();
  refresh();
};

const getTerms = () => [...listEl.children].map(li => ({
  title: li.querySelector(".t").value.trim(),
  detail: li.querySelector(".d").value.trim()
}));

// Progress: step 1 = notes or terms exist, step 2 = every term has a term + definition, step 3 = route chosen.
function refresh() {
  const terms = getTerms();
  emptyEl.hidden = terms.length > 0;
  const done = [
    notesEl.value.trim().length >= 20 || terms.length > 0,
    terms.length > 0 && terms.every(t => t.title && t.detail),
    !!(window.routePicker && routePicker.getRoute())
  ];
  document.querySelectorAll("#progress li").forEach((li, i) => {
    li.classList.toggle("done", done[i]);
    li.classList.toggle("current", !done[i] && done.slice(0, i).every(Boolean));
    li.querySelector(".pn").textContent = done[i] ? "✓" : String(i + 1);
  });
  $("progress-fill").style.width = `${(done.filter(Boolean).length / 3) * 100}%`;
}
notesEl.addEventListener("input", refresh);
listEl.addEventListener("input", refresh);
document.addEventListener("route:changed", refresh);
refresh();

$("build").onclick = () => {
  const chunks = getTerms().filter(c => c.title || c.detail);
  const route = window.routePicker && routePicker.getRoute();
  if (!chunks.length) { buildMsg.textContent = "Add at least one term first (step 1 or 2)."; return; }
  if (!route) { buildMsg.textContent = "Choose a walking route first (step 3): click a start and an end on the map."; return; }
  const [lat, lng] = route.points[0];
  savePalace({ location: { name: route.name, lat, lng }, route, chunks, pins: [] });
  location.href = "place.html";
};
