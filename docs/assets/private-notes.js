/* Private notes: Markdown notes stored in Firestore (collection private_notes), readable only by the site owner.
 * Who the owner is lives ONLY in the Firestore rules (firestore.rules): the site never contains the notes,
 * and for anyone else the database refuses to send them. The page at /private/ shows:
 *   - signed out: "sign in"
 *   - signed in, not the owner: "this page is private" (+ the account ID, needed once to set up the rules)
 *   - owner: the notes, rendered from Markdown, with upload / edit / download / delete
 */
const MARKED = "https://cdn.jsdelivr.net/npm/marked@12.0.2/lib/marked.esm.js";
const PURIFY = "https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.es.mjs";
const MAX_BYTES = 900000;   // Firestore documents can be up to 1 MiB

let libs = null;            // { marked, DOMPurify }
let notes = null;           // [{ id, title, md, updatedAt }] once loaded for the owner
let loadingFor = null;      // uid the notes were loaded for
let editing = false;

function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function toast(m) { if (window.HBProgress && window.HBProgress.toast) window.HBProgress.toast(m); }
function root() { return document.getElementById("hb-private"); }
function auth() { return window.HBAuth || null; }
function slug(t) { return String(t).toLowerCase().replace(/<[^>]+>/g, "").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-"); }
function noteIdFromName(name) { return name.replace(/\.(md|markdown|txt)$/i, "").replace(/[^A-Za-z0-9_-]+/g, "_").slice(0, 120); }
function titleOf(md, id) { const m = /^#\s+(.+)$/m.exec(md); return (m ? m[1] : id.replace(/^\d+_/, "").replace(/_/g, " ")).trim(); }
function currentId() { return new URLSearchParams(window.location.search).get("note"); }
function when(ts) {
  try { const d = ts && ts.toDate ? ts.toDate() : ts ? new Date(ts) : null; return d ? d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : ""; }
  catch (e) { return ""; }
}

async function loadLibs() {
  if (!libs) {
    const [m, p] = await Promise.all([import(MARKED), import(PURIFY)]);
    libs = { marked: m.marked, DOMPurify: p.default };
  }
  return libs;
}

async function loadNotes(a) {
  const { fsMod } = a.fb;
  const snap = await fsMod.getDocs(fsMod.collection(a.fb.db, "private_notes"));
  notes = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((x, y) => x.id.localeCompare(y.id));
  loadingFor = a.user.uid;
}

function message(html) { const r = root(); if (r) r.innerHTML = '<div class="hb-private__msg">' + html + "</div>"; }

/* ---------------- render ---------------- */
async function render() {
  const r = root();
  if (!r || editing) return;
  const a = auth();
  if (!a || !a.fb) { message("🔒 <strong>This page is private.</strong>"); return; }
  if (!a.user) { message("🔒 <strong>This page is private.</strong> Sign in (top right) to see your notes."); return; }
  if (!a.ownerChecked) { message("Checking access…"); return; }
  if (!a.isOwner) {
    message("🔒 <strong>This page is private to the site owner.</strong>" +
      '<details class="hb-private__setup"><summary>Setting this up?</summary>Your account ID is <code>' + esc(a.user.uid) +
      "</code>. Put it in the Firestore rules as the owner (see firestore.rules).</details>");
    return;
  }
  try {
    if (!notes || loadingFor !== a.user.uid) { message("Loading your notes…"); await loadNotes(a); }
    await loadLibs();
  } catch (e) { message("Couldn't load your notes. Check your connection and refresh."); return; }
  if (editing) return;
  draw();
}

function rewriteLinks(container) {
  const ids = new Set(notes.map((n) => n.id));
  container.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href");
    const m = /^(?:\.\/)?([A-Za-z0-9_-]+)\.md(#.*)?$/.exec(href);
    if (!m) { if (/^https?:/i.test(href)) { a.target = "_blank"; a.rel = "noopener"; } return; }
    a.setAttribute("href", ids.has(m[1]) ? "?note=" + encodeURIComponent(m[1]) + (m[2] || "") : "../" + m[1] + "/" + (m[2] || ""));
  });
}

function draw() {
  const r = root();
  const id = currentId();
  const note = notes.find((n) => n.id === id) || notes[0] || null;

  let html = '<div class="hb-private__bar">' +
    '<div class="hb-private__tabs">' +
    notes.map((n) => '<a class="hb-private__tab' + (note && n.id === note.id ? " hb-private__tab--on" : "") + '" href="?note=' + encodeURIComponent(n.id) + '">' + esc(n.title || n.id) + "</a>").join("") +
    "</div>" +
    '<div class="hb-private__tools">' +
    '<button type="button" class="hb-btn hb-btn--primary hb-btn--small" data-pn="upload">Upload .md files</button>' +
    (notes.length ? '<button type="button" class="hb-btn hb-btn--ghost hb-btn--small" data-pn="download-all">Download all</button>' : "") +
    '<input type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" multiple hidden data-pn="file">' +
    "</div></div>";

  if (!note) {
    html += '<div class="hb-private__msg">No private notes yet. Click <strong>Upload .md files</strong> to add your Markdown notes. Only you can see them.</div>';
    r.innerHTML = html; wire(null); return;
  }

  const { marked, DOMPurify } = libs;
  const body = DOMPurify.sanitize(marked.parse(note.md || "", { gfm: true, breaks: true }));
  html += '<div class="hb-private__meta"><span>🔒 Only you can see this · updated ' + esc(when(note.updatedAt)) + "</span>" +
    '<span class="hb-private__noteactions">' +
    '<button type="button" class="hb-btn hb-btn--ghost hb-btn--small" data-pn="edit">Edit</button>' +
    '<button type="button" class="hb-btn hb-btn--ghost hb-btn--small" data-pn="download">Download</button>' +
    '<button type="button" class="hb-btn hb-btn--danger hb-btn--small" data-pn="delete">Delete</button></span></div>' +
    '<div class="hb-confirm" hidden data-pn="confirm"><span>Delete “' + esc(note.title || note.id) + "” from your account? Download it first if you want a copy. This can't be undone.</span>" +
    '<button type="button" class="hb-btn hb-btn--danger" data-pn="delete-yes">Yes, delete</button>' +
    '<button type="button" class="hb-btn hb-btn--ghost" data-pn="delete-no">Cancel</button></div>' +
    '<details class="hb-private__toc"><summary>Contents</summary><ul></ul></details>' +
    '<div class="hb-private__body">' + body + "</div>";
  r.innerHTML = html;

  const bodyEl = r.querySelector(".hb-private__body");
  const firstH1 = bodyEl.querySelector("h1");
  if (firstH1 && !firstH1.previousElementSibling) firstH1.remove();   // it's already the page title
  const toc = r.querySelector(".hb-private__toc ul");
  const used = {};
  bodyEl.querySelectorAll("h1, h2, h3").forEach((h) => {
    let s = slug(h.textContent) || "section";
    if (used[s]) s += "_" + used[s]++; else used[s] = 1;
    h.id = s;
    if (h.tagName === "H2") toc.insertAdjacentHTML("beforeend", '<li><a href="#' + esc(s) + '">' + esc(h.textContent) + "</a></li>");
  });
  if (!toc.children.length) r.querySelector(".hb-private__toc").remove();
  bodyEl.querySelectorAll("table").forEach((t) => { const w = document.createElement("div"); w.className = "md-typeset__table"; t.before(w); w.appendChild(t); });
  rewriteLinks(bodyEl);
  const title = document.querySelector("article.md-content__inner > h1");
  if (title) title.textContent = "🔒 " + (note.title || note.id);
  wire(note);
  if (window.location.hash) { const t = document.getElementById(decodeURIComponent(window.location.hash.slice(1))); if (t) t.scrollIntoView(); }
}

/* ---------------- actions ---------------- */
function download(name, text) {
  const blob = new Blob([text], { type: "text/markdown" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
}

async function saveNote(id, md) {
  const a = auth();
  const { fsMod } = a.fb;
  const data = { title: titleOf(md, id), md, updatedAt: fsMod.serverTimestamp() };
  await fsMod.setDoc(fsMod.doc(a.fb.db, "private_notes", id), data);
  const i = notes.findIndex((n) => n.id === id);
  const local = { id, title: data.title, md, updatedAt: new Date() };
  if (i >= 0) notes[i] = local; else { notes.push(local); notes.sort((x, y) => x.id.localeCompare(y.id)); }
}

function wire(note) {
  const r = root();
  const q = (k) => r.querySelector('[data-pn="' + k + '"]');
  const file = q("file");
  q("upload").addEventListener("click", () => file.click());
  file.addEventListener("change", async () => {
    const files = Array.from(file.files || []);
    file.value = "";
    let ok = 0, last = null;
    for (const f of files) {
      if (f.size > MAX_BYTES) { toast(f.name + " is too big (max ~900 KB)."); continue; }
      const id = noteIdFromName(f.name);
      if (!id) continue;
      try { await saveNote(id, await f.text()); ok++; last = id; }
      catch (e) { toast("Couldn't upload " + f.name + "."); }
    }
    if (ok) {
      toast(ok === 1 ? "Note uploaded." : ok + " notes uploaded.");
      history.replaceState(null, "", "?note=" + encodeURIComponent(last));
      draw();
    }
  });
  const all = q("download-all");
  if (all) all.addEventListener("click", () => { notes.forEach((n, i) => setTimeout(() => download(n.id + ".md", n.md || ""), i * 400)); });
  if (!note) return;
  q("download").addEventListener("click", () => download(note.id + ".md", note.md || ""));
  q("delete").addEventListener("click", () => { q("confirm").hidden = false; });
  q("delete-no").addEventListener("click", () => { q("confirm").hidden = true; });
  q("delete-yes").addEventListener("click", async () => {
    const a = auth();
    try {
      await a.fb.fsMod.deleteDoc(a.fb.fsMod.doc(a.fb.db, "private_notes", note.id));
      notes = notes.filter((n) => n.id !== note.id);
      history.replaceState(null, "", window.location.pathname);
      toast("Note deleted."); draw();
    } catch (e) { toast("Couldn't delete the note. Try again."); }
  });
  q("edit").addEventListener("click", () => openEditor(note));
}

function beforeUnload(e) { e.preventDefault(); e.returnValue = ""; }

function openEditor(note) {
  editing = true;
  window.addEventListener("beforeunload", beforeUnload);
  const r = root();
  r.innerHTML = '<div class="hb-private__meta"><span>Editing <strong>' + esc(note.id) + ".md</strong> (Markdown)</span>" +
    '<span class="hb-private__noteactions"><button type="button" class="hb-btn hb-btn--primary hb-btn--small" data-pn="save">Save</button>' +
    '<button type="button" class="hb-btn hb-btn--ghost hb-btn--small" data-pn="cancel">Cancel</button></span></div>' +
    '<textarea class="hb-private__editor" spellcheck="true" aria-label="Note text (Markdown)"></textarea>';
  const ta = r.querySelector("textarea");
  ta.value = note.md || "";
  ta.focus();
  const close = () => { editing = false; window.removeEventListener("beforeunload", beforeUnload); draw(); };
  r.querySelector('[data-pn="cancel"]').addEventListener("click", () => {
    if (ta.value !== (note.md || "") && !window.confirm("Discard your changes?")) return;
    close();
  });
  r.querySelector('[data-pn="save"]').addEventListener("click", async (ev) => {
    if (new Blob([ta.value]).size > MAX_BYTES) { toast("This note is too big (max ~900 KB)."); return; }
    ev.target.disabled = true;
    try { await saveNote(note.id, ta.value); toast("Saved."); close(); }
    catch (e) { ev.target.disabled = false; toast("Couldn't save. Check your connection and try again."); }
  });
}

/* ---------------- boot ---------------- */
window.addEventListener("hb:auth", () => { if (!(auth() && auth().user)) { notes = null; loadingFor = null; } render(); });
window.addEventListener("popstate", () => { if (root() && notes && !editing) draw(); });
if (window.document$ && typeof window.document$.subscribe === "function") window.document$.subscribe(() => { editing = false; render(); });
else render();
