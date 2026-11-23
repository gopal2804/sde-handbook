/* Private notes & files: stored in Firestore, readable only by the site owner.
 * Who the owner is lives ONLY in the Firestore rules (firestore.rules): the site never contains the content,
 * and for anyone else the database refuses to send it.
 *   private_notes/{id}                 Markdown notes { title, md, updatedAt }: rendered and editable in the browser
 *   private_files/{id}                 any other file { name, type, size, chunks, updatedAt }
 *   private_files/{id}/chunks/{n}      the file's bytes, split into pieces of < 1 MB (Firestore's document limit)
 * The page at /private/ shows "sign in" (signed out), "this page is private" (other accounts) or the content (owner).
 */
const MARKED = "https://cdn.jsdelivr.net/npm/marked@12.0.2/lib/marked.esm.js";
const PURIFY = "https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.es.mjs";
const MAX_NOTE = 900000;               // bytes of Markdown text in one note
const CHUNK = 900000;                  // bytes per file piece
const MAX_FILE = 25 * 1024 * 1024;     // 25 MB per file
const TEXT_EXT = /\.(txt|csv|tsv|json|ya?ml|xml|log|ini|toml|conf|cfg|env\.example|py|js|mjs|ts|tsx|jsx|java|scala|kt|go|rs|c|h|cpp|hpp|cc|cs|rb|php|sh|bash|zsh|sql|html?|css|scss|tex|bib|gitignore|dockerfile)$/i;

let libs = null;            // { marked, DOMPurify }
let notes = null;           // [{ id, title, md, updatedAt }]
let files = null;           // [{ id, name, type, size, chunks, updatedAt }]
let loadingFor = null;      // uid the content was loaded for
let editing = false;
let busy = false;           // an upload is running
const blobs = {};           // file id → { blob, url, ver }

function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function toast(m) { if (window.HBProgress && window.HBProgress.toast) window.HBProgress.toast(m); }
function root() { return document.getElementById("hb-private"); }
function auth() { return window.HBAuth || null; }
function fs() { return auth().fb.fsMod; }
function db() { return auth().fb.db; }
function slug(t) { return String(t).toLowerCase().replace(/<[^>]+>/g, "").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-"); }
function idFrom(name) { return name.replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 120); }
function noteIdFromName(name) { return idFrom(name.replace(/\.(md|markdown)$/i, "")); }
function isNoteFile(f) { return /\.(md|markdown)$/i.test(f.name) && f.size <= MAX_NOTE; }
function titleOf(md, id) { const m = /^#\s+(.+)$/m.exec(md); return (m ? m[1] : id.replace(/^\d+_/, "").replace(/_/g, " ")).trim(); }
function params() { return new URLSearchParams(window.location.search); }
function when(ts) {
  try { const d = ts && ts.toDate ? ts.toDate() : ts ? new Date(ts) : null; return d ? d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : ""; }
  catch (e) { return ""; }
}
function sizeText(n) { return n < 1024 ? n + " B" : n < 1048576 ? (n / 1024).toFixed(0) + " KB" : (n / 1048576).toFixed(1) + " MB"; }
function fileKind(f) {
  const t = f.type || "", n = f.name || "";
  if (/^image\//.test(t)) return "image";
  if (t === "application/pdf" || /\.pdf$/i.test(n)) return "pdf";
  if (/^video\//.test(t)) return "video";
  if (/^audio\//.test(t)) return "audio";
  if (/^text\//.test(t) || /^application\/(json|xml|x-yaml|yaml|javascript|x-sh|sql)$/.test(t) || TEXT_EXT.test(n)) return "text";
  return "other";
}
const ICON = { note: "📝", pdf: "📕", image: "🖼️", video: "🎬", audio: "🎧", text: "📄", other: "📎" };

async function loadLibs() {
  if (!libs) {
    const [m, p] = await Promise.all([import(MARKED), import(PURIFY)]);
    libs = { marked: m.marked, DOMPurify: p.default };
  }
  return libs;
}

async function loadAll(a) {
  const [ns, fsnap] = await Promise.all([
    fs().getDocs(fs().collection(db(), "private_notes")),
    fs().getDocs(fs().collection(db(), "private_files"))
  ]);
  notes = ns.docs.map((d) => ({ id: d.id, ...d.data() })).sort((x, y) => x.id.localeCompare(y.id));
  files = fsnap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((x, y) => (x.name || x.id).localeCompare(y.name || y.id));
  loadingFor = a.user.uid;
}

function message(html) { const r = root(); if (r) r.innerHTML = '<div class="hb-private__msg">' + html + "</div>"; }

/* ---------------- render ---------------- */
async function render() {
  const r = root();
  if (!r || editing || busy) return;
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
    if (!notes || !files || loadingFor !== a.user.uid) { message("Loading your notes…"); await loadAll(a); }
    await loadLibs();
  } catch (e) { message("Couldn't load your notes. Check your connection and refresh."); return; }
  if (editing || busy) return;
  draw();
}

// which item the address points to: ?note=… or ?file=…, else the first one
function selected() {
  const p = params();
  const n = p.get("note"), f = p.get("file");
  if (n) { const x = notes.find((i) => i.id === n); if (x) return { kind: "note", item: x }; }
  if (f) { const x = files.find((i) => i.id === f); if (x) return { kind: "file", item: x }; }
  if (notes.length) return { kind: "note", item: notes[0] };
  if (files.length) return { kind: "file", item: files[0] };
  return null;
}

function tabsHtml(sel) {
  const tab = (href, label, icon, on) => '<a class="hb-private__tab' + (on ? " hb-private__tab--on" : "") + '" href="' + href + '" data-pn-nav>' + icon + " " + esc(label) + "</a>";
  return notes.map((n) => tab("?note=" + encodeURIComponent(n.id), n.title || n.id, ICON.note, sel && sel.kind === "note" && sel.item.id === n.id)).join("") +
    files.map((f) => tab("?file=" + encodeURIComponent(f.id), f.name || f.id, ICON[fileKind(f)], sel && sel.kind === "file" && sel.item.id === f.id)).join("");
}

function draw() {
  const r = root();
  if (!r) return;
  const sel = selected();
  let html = '<div class="hb-private__bar">' +
    '<div class="hb-private__tabs">' + tabsHtml(sel) + "</div>" +
    '<div class="hb-private__tools">' +
    '<button type="button" class="hb-btn hb-btn--primary hb-btn--small" data-pn="upload">Upload files</button>' +
    (notes.length + files.length ? '<button type="button" class="hb-btn hb-btn--ghost hb-btn--small" data-pn="download-all">Download all</button>' : "") +
    '<input type="file" multiple hidden data-pn="file">' +
    "</div></div>" +
    '<div class="hb-private__status" data-pn="status" hidden></div>';

  if (!sel) {
    html += '<div class="hb-private__msg">Nothing here yet. Click <strong>Upload files</strong> to add notes (.md) or any other file: PDF, Word, images, text… up to 25 MB each. Only you can see them.</div>';
    r.innerHTML = html; wire(null); return;
  }
  html += sel.kind === "note" ? noteHtml(sel.item) : fileHtml(sel.item);
  r.innerHTML = html;
  const title = document.querySelector("article.md-content__inner > h1");
  if (title) title.textContent = "🔒 " + (sel.kind === "note" ? sel.item.title || sel.item.id : sel.item.name || sel.item.id);
  if (sel.kind === "note") decorateNote(sel.item); else showFile(sel.item);
  wire(sel);
}

function actionsHtml(item, canEdit, extra) {
  return '<div class="hb-private__meta"><span>🔒 Only you can see this · ' + (extra ? esc(extra) + " · " : "") + "updated " + esc(when(item.updatedAt)) + "</span>" +
    '<span class="hb-private__noteactions">' +
    (canEdit ? '<button type="button" class="hb-btn hb-btn--ghost hb-btn--small" data-pn="edit">Edit</button>' : "") +
    '<button type="button" class="hb-btn hb-btn--ghost hb-btn--small" data-pn="download">Download</button>' +
    '<button type="button" class="hb-btn hb-btn--danger hb-btn--small" data-pn="delete">Delete</button></span></div>' +
    '<div class="hb-confirm" hidden data-pn="confirm"><span>Delete “' + esc(item.title || item.name || item.id) + "” from your account? Download it first if you want a copy. This can't be undone.</span>" +
    '<button type="button" class="hb-btn hb-btn--danger" data-pn="delete-yes">Yes, delete</button>' +
    '<button type="button" class="hb-btn hb-btn--ghost" data-pn="delete-no">Cancel</button></div>';
}

/* ---------------- notes ---------------- */
function noteHtml(note) {
  const { marked, DOMPurify } = libs;
  const body = DOMPurify.sanitize(marked.parse(note.md || "", { gfm: true, breaks: true }));
  return actionsHtml(note, true, "") +
    '<details class="hb-private__toc"><summary>Contents</summary><ul></ul></details>' +
    '<div class="hb-private__body">' + body + "</div>";
}

function decorateNote() {
  const r = root();
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
  // links: other private notes → ?note=…, public pages → ../page/, outside links open in a new tab
  const ids = new Set(notes.map((n) => n.id));
  bodyEl.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href");
    const m = /^(?:\.\/)?([A-Za-z0-9_-]+)\.md(#.*)?$/.exec(href);
    if (!m) { if (/^https?:/i.test(href)) { a.target = "_blank"; a.rel = "noopener"; } return; }
    if (ids.has(m[1])) { a.setAttribute("href", "?note=" + encodeURIComponent(m[1]) + (m[2] || "")); a.setAttribute("data-pn-nav", ""); }
    else a.setAttribute("href", "../" + m[1] + "/" + (m[2] || ""));
  });
  if (window.location.hash) { const t = document.getElementById(decodeURIComponent(window.location.hash.slice(1))); if (t) t.scrollIntoView(); }
}

/* ---------------- files ---------------- */
function fileHtml(f) {
  return actionsHtml(f, false, sizeText(f.size || 0)) + '<div class="hb-private__preview" data-pn="preview"><div class="hb-private__msg">Loading the file…</div></div>';
}

async function fileBlob(f) {
  const ver = String(f.updatedAt && f.updatedAt.seconds || f.updatedAt || "") + ":" + f.size;
  const hit = blobs[f.id];
  if (hit && hit.ver === ver) return hit;
  const snaps = await Promise.all(Array.from({ length: f.chunks || 0 }, (_, i) => fs().getDoc(fs().doc(db(), "private_files", f.id, "chunks", String(i)))));
  const parts = snaps.map((s) => { if (!s.exists()) throw new Error("missing piece"); return s.data().data.toUint8Array(); });
  const blob = new Blob(parts, { type: f.type || "application/octet-stream" });
  if (hit) URL.revokeObjectURL(hit.url);
  blobs[f.id] = { blob, url: URL.createObjectURL(blob), ver };
  return blobs[f.id];
}

async function showFile(f) {
  const box = root().querySelector('[data-pn="preview"]');
  let b;
  try { b = await fileBlob(f); }
  catch (e) { if (box.isConnected) box.innerHTML = '<div class="hb-private__msg">Couldn\'t load this file. Check your connection and try again.</div>'; return; }
  if (!box.isConnected) return;   // the user switched to another item meanwhile
  const kind = fileKind(f);
  const open = '<p><a class="hb-btn hb-btn--ghost hb-btn--small" href="' + b.url + '" target="_blank" rel="noopener">Open in a new tab</a></p>';
  if (kind === "image") box.innerHTML = '<img class="hb-private__img" src="' + b.url + '" alt="' + esc(f.name) + '">';
  else if (kind === "pdf") box.innerHTML = open + '<iframe class="hb-private__frame" src="' + b.url + '" title="' + esc(f.name) + '"></iframe>';
  else if (kind === "video") box.innerHTML = '<video class="hb-private__img" src="' + b.url + '" controls></video>';
  else if (kind === "audio") box.innerHTML = '<audio src="' + b.url + '" controls></audio>';
  else if (kind === "text") { const t = await b.blob.text(); box.innerHTML = '<pre class="hb-private__text"><code></code></pre>'; box.querySelector("code").textContent = t; }
  else box.innerHTML = '<div class="hb-private__msg">This file type (' + esc(f.type || f.name.split(".").pop()) + ") can't be shown in the browser. Click <strong>Download</strong> to open it on this device.</div>";
}

/* ---------------- saving ---------------- */
async function saveNote(id, md) {
  const data = { title: titleOf(md, id), md, updatedAt: fs().serverTimestamp() };
  await fs().setDoc(fs().doc(db(), "private_notes", id), data);
  const local = { id, title: data.title, md, updatedAt: new Date() };
  const i = notes.findIndex((n) => n.id === id);
  if (i >= 0) notes[i] = local; else { notes.push(local); notes.sort((x, y) => x.id.localeCompare(y.id)); }
}

async function saveFile(file, onProgress) {
  const id = idFrom(file.name);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const n = Math.max(1, Math.ceil(bytes.length / CHUNK));
  const old = files.find((x) => x.id === id);
  for (let i = 0; i < n; i++) {
    await fs().setDoc(fs().doc(db(), "private_files", id, "chunks", String(i)), { data: fs().Bytes.fromUint8Array(bytes.subarray(i * CHUNK, (i + 1) * CHUNK)) });
    onProgress((i + 1) / n);
  }
  if (old) for (let i = n; i < (old.chunks || 0); i++) await fs().deleteDoc(fs().doc(db(), "private_files", id, "chunks", String(i)));
  const meta = { name: file.name, type: file.type || "", size: bytes.length, chunks: n, updatedAt: fs().serverTimestamp() };
  await fs().setDoc(fs().doc(db(), "private_files", id), meta);   // written last, so a half-finished upload never shows up
  const local = { id, ...meta, updatedAt: new Date() };
  const i = files.findIndex((x) => x.id === id);
  if (i >= 0) files[i] = local; else files.push(local);
  files.sort((x, y) => (x.name || x.id).localeCompare(y.name || y.id));
  return id;
}

async function deleteItem(sel) {
  if (sel.kind === "note") {
    await fs().deleteDoc(fs().doc(db(), "private_notes", sel.item.id));
    notes = notes.filter((n) => n.id !== sel.item.id);
  } else {
    await fs().deleteDoc(fs().doc(db(), "private_files", sel.item.id));   // metadata first: the file disappears at once
    for (let i = 0; i < (sel.item.chunks || 0); i++) { try { await fs().deleteDoc(fs().doc(db(), "private_files", sel.item.id, "chunks", String(i))); } catch (e) { /* leftover piece */ } }
    files = files.filter((f) => f.id !== sel.item.id);
  }
}

function download(name, blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

function guard(e) { e.preventDefault(); e.returnValue = ""; }

/* ---------------- wiring ---------------- */
function wire(sel) {
  const r = root();
  const q = (k) => r.querySelector('[data-pn="' + k + '"]');
  const input = q("file");
  q("upload").addEventListener("click", () => input.click());
  input.addEventListener("change", async () => {
    const list = Array.from(input.files || []);
    input.value = "";
    if (!list.length) return;
    const status = q("status");
    busy = true; window.addEventListener("beforeunload", guard);
    let ok = 0, last = null;
    for (const f of list) {
      status.hidden = false;
      try {
        if (isNoteFile(f)) { status.textContent = "Uploading " + f.name + "…"; const id = noteIdFromName(f.name); await saveNote(id, await f.text()); last = "?note=" + encodeURIComponent(id); ok++; }
        else if (f.size > MAX_FILE) { toast(f.name + " is too big (max 25 MB)."); }
        else { const id = await saveFile(f, (p) => { status.textContent = "Uploading " + f.name + "… " + Math.round(p * 100) + "%"; }); last = "?file=" + encodeURIComponent(id); ok++; }
      } catch (e) { toast("Couldn't upload " + f.name + "."); }
    }
    busy = false; window.removeEventListener("beforeunload", guard);
    if (ok) { toast(ok === 1 ? "Uploaded." : ok + " files uploaded."); history.pushState(null, "", last); }
    draw();
  });
  const all = q("download-all");
  if (all) all.addEventListener("click", async () => {
    let i = 0;
    for (const n of notes) setTimeout(() => download(n.id + ".md", new Blob([n.md || ""], { type: "text/markdown" })), 400 * i++);
    for (const f of files) {
      try { const b = await fileBlob(f); setTimeout(() => download(f.name, b.blob), 400 * i++); }
      catch (e) { toast("Couldn't download " + f.name + "."); }
    }
  });
  if (!sel) return;
  q("download").addEventListener("click", async () => {
    if (sel.kind === "note") download(sel.item.id + ".md", new Blob([sel.item.md || ""], { type: "text/markdown" }));
    else { try { download(sel.item.name, (await fileBlob(sel.item)).blob); } catch (e) { toast("Couldn't download the file."); } }
  });
  q("delete").addEventListener("click", () => { q("confirm").hidden = false; });
  q("delete-no").addEventListener("click", () => { q("confirm").hidden = true; });
  q("delete-yes").addEventListener("click", async () => {
    try { await deleteItem(sel); history.pushState(null, "", window.location.pathname); toast("Deleted."); draw(); }
    catch (e) { toast("Couldn't delete it. Try again."); }
  });
  const edit = q("edit");
  if (edit) edit.addEventListener("click", () => openEditor(sel.item));
}

function openEditor(note) {
  editing = true;
  window.addEventListener("beforeunload", guard);
  const r = root();
  r.innerHTML = '<div class="hb-private__meta"><span>Editing <strong>' + esc(note.id) + ".md</strong> (Markdown)</span>" +
    '<span class="hb-private__noteactions"><button type="button" class="hb-btn hb-btn--primary hb-btn--small" data-pn="save">Save</button>' +
    '<button type="button" class="hb-btn hb-btn--ghost hb-btn--small" data-pn="cancel">Cancel</button></span></div>' +
    '<textarea class="hb-private__editor" spellcheck="true" aria-label="Note text (Markdown)"></textarea>';
  const ta = r.querySelector("textarea");
  ta.value = note.md || "";
  ta.focus();
  const close = () => { editing = false; window.removeEventListener("beforeunload", guard); draw(); };
  r.querySelector('[data-pn="cancel"]').addEventListener("click", () => {
    if (ta.value !== (note.md || "") && !window.confirm("Discard your changes?")) return;
    close();
  });
  r.querySelector('[data-pn="save"]').addEventListener("click", async (ev) => {
    if (new Blob([ta.value]).size > MAX_NOTE) { toast("This note is too big (max ~900 KB)."); return; }
    ev.target.disabled = true;
    try { await saveNote(note.id, ta.value); toast("Saved."); close(); }
    catch (e) { ev.target.disabled = false; toast("Couldn't save. Check your connection and try again."); }
  });
}

/* ---------------- boot ---------------- */
// Switch between notes/files ourselves: the site's instant navigation doesn't reload a page when only ?note= changes.
// Capture phase on window, so this runs before the theme's own link handler.
window.addEventListener("click", (e) => {
  const a = e.target.closest && e.target.closest("#hb-private a[data-pn-nav]");
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  e.preventDefault(); e.stopPropagation();
  if (editing || busy || !notes) return;
  history.pushState(null, "", a.getAttribute("href"));
  draw();
  const h = window.location.hash && document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
  if (!h) window.scrollTo({ top: 0 });
}, true);
window.addEventListener("popstate", () => { if (root() && notes && !editing && !busy) draw(); });
window.addEventListener("hb:auth", () => { if (!(auth() && auth().user)) { notes = null; files = null; loadingFor = null; } render(); });
if (window.document$ && typeof window.document$.subscribe === "function") window.document$.subscribe(() => { editing = false; render(); });
else render();
