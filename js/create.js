const notesEl = document.getElementById("notes");
const countEl = document.getElementById("count");
const listEl = document.getElementById("facts");
const msgEl = document.getElementById("msg");
const extractBtn = document.getElementById("extract");
const buildBtn = document.getElementById("build");
const placeEl = document.getElementById("place");
LOCATIONS.forEach((l, i) => placeEl.add(new Option(l.name, i)));

// Upload: read a .txt/.md file into the textarea.
document.getElementById("file").onchange = async (e) => {
  const f = e.target.files[0];
  if (f) notesEl.value = await f.text();
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
    data.chunks.forEach(addRow);
    buildBtn.hidden = false;
    msgEl.textContent = "Edit, delete, or add chunks, then build your palace.";
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
  title.setAttribute("aria-label", "Chunk title");
  const detail = document.createElement("input");
  detail.type = "text"; detail.value = chunk.detail; detail.className = "d";
  detail.setAttribute("aria-label", "Chunk detail");
  const del = document.createElement("button");
  del.textContent = "Remove";
  del.onclick = () => li.remove();
  li.append(title, detail, del);
  listEl.appendChild(li);
}

buildBtn.onclick = () => {
  const chunks = [...listEl.children].map(li => ({
    title: li.querySelector(".t").value.trim(),
    detail: li.querySelector(".d").value.trim()
  })).filter(c => c.title || c.detail);
  if (!chunks.length) { msgEl.textContent = "Add at least one chunk."; return; }
  savePalace({ location: LOCATIONS[placeEl.value], chunks, pins: [] });
  location.href = "place.html";
};