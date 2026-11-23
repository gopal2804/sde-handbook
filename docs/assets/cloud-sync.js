/* Sign in with Google + sync progress across devices (Firebase Auth + Cloud Firestore).
 * - Signed out: nothing changes, progress stays in this browser (progress.js).
 * - Signed in: progress is merged item by item with the copy in the account (newest change wins for each tick),
 *   then kept in sync live: a tick on the phone shows up on the laptop.
 * Loaded as an ES module; if Firebase isn't configured or can't load, the sign-in button simply doesn't appear.
 */
import { firebaseConfig, SITE_ID } from "./firebase-config.js";

const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
const P = window.HBProgress;

const ICON_USER = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2.25c-3.75 0-7.5 1.9-7.5 4.5V21h15v-2.25c0-2.6-3.75-4.5-7.5-4.5Z"/></svg>';

let fb = null;            // { auth, db, ... } once loaded
let user = null;
let status = "idle";      // idle | syncing | synced | offline | error
let remote = null;        // last state seen in the account
let unsubscribe = null;
let pushTimer = null;
let applyingRemote = false;
let menuOpen = false;

function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function toast(m) { if (P && P.toast) P.toast(m); }

/* ---------------- UI: header button + menu ---------------- */
function ensureButton() {
  const inner = document.querySelector(".md-header__inner");
  if (!inner) return null;
  let wrap = inner.querySelector(".hb-auth");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = "hb-auth";
    wrap.innerHTML =
      '<button type="button" class="hb-auth__btn md-header__button" aria-haspopup="true" aria-expanded="false"></button>' +
      '<div class="hb-auth__menu" role="dialog" aria-label="Account" hidden></div>';
    const anchor = inner.querySelector(".md-search");
    inner.insertBefore(wrap, anchor || null);
    wrap.querySelector(".hb-auth__btn").addEventListener("click", (e) => {
      e.stopPropagation();
      if (!user) { signIn(); return; }
      setMenu(!menuOpen);
    });
    wrap.querySelector(".hb-auth__menu").addEventListener("click", (e) => {
      const b = e.target.closest("[data-hb-auth]");
      if (!b) return;
      if (b.dataset.hbAuth === "signout") doSignOut();
      if (b.dataset.hbAuth === "sync") { pushNow(); }
    });
  }
  return wrap;
}
document.addEventListener("click", (e) => { if (menuOpen && !e.target.closest(".hb-auth")) setMenu(false); });
document.addEventListener("keydown", (e) => { if (menuOpen && e.key === "Escape") setMenu(false); });

function setMenu(open) {
  menuOpen = open;
  const wrap = ensureButton();
  if (!wrap) return;
  wrap.querySelector(".hb-auth__menu").hidden = !open;
  wrap.querySelector(".hb-auth__btn").setAttribute("aria-expanded", open ? "true" : "false");
}

const STATUS_TEXT = {
  idle: "Connecting…",
  syncing: "Syncing…",
  synced: "✓ Progress synced across your devices",
  offline: "Offline: changes will sync when you're back online",
  error: "Couldn't sync right now. Your progress is still saved on this device."
};

function paint() {
  const wrap = ensureButton();
  if (wrap) {
    const btn = wrap.querySelector(".hb-auth__btn");
    if (!user) {
      btn.innerHTML = ICON_USER + '<span class="hb-auth__label">Sign in</span>';
      btn.title = "Sign in with Google to sync your progress across devices";
      btn.setAttribute("aria-label", "Sign in with Google to sync your progress");
      btn.classList.remove("hb-auth__btn--in");
      setMenu(false);
    } else {
      const name = user.displayName || user.email || "Signed in";
      const initial = esc(name.trim().charAt(0).toUpperCase());
      const avatar = user.photoURL
        ? '<img class="hb-auth__avatar" src="' + esc(user.photoURL) + '" alt="" referrerpolicy="no-referrer">'
        : '<span class="hb-auth__avatar hb-auth__avatar--letter">' + initial + "</span>";
      btn.innerHTML = avatar + '<span class="hb-auth__dot hb-auth__dot--' + status + '"></span>';
      btn.title = name + ": " + STATUS_TEXT[status];
      btn.setAttribute("aria-label", "Account: " + name + ". " + STATUS_TEXT[status]);
      btn.classList.add("hb-auth__btn--in");
      wrap.querySelector(".hb-auth__menu").innerHTML =
        '<div class="hb-auth__who"><strong>' + esc(user.displayName || "Signed in") + "</strong>" +
        (user.email ? '<span>' + esc(user.email) + "</span>" : "") + "</div>" +
        '<div class="hb-auth__status hb-auth__status--' + status + '">' + esc(STATUS_TEXT[status]) + "</div>" +
        '<div class="hb-auth__actions">' +
        (status === "error" || status === "offline" ? '<button type="button" class="hb-btn hb-btn--ghost hb-btn--small" data-hb-auth="sync">Try again</button>' : "") +
        '<button type="button" class="hb-btn hb-btn--ghost hb-btn--small" data-hb-auth="signout">Sign out</button></div>';
    }
  }
  // the dashboard's "where is my progress saved" text
  const txt = document.querySelector('[data-hb="sync-text"]');
  if (txt) {
    txt.innerHTML = user
      ? "<strong>Signed in as " + esc(user.email || user.displayName) + ".</strong> Your progress syncs across your devices: sign in with the same Google account on your phone to continue there."
      : "<strong>Your progress is saved in this browser.</strong> Sign in (top right) to sync it across your devices, or export it as a file. Reset starts from the beginning.";
  }
}
function setStatus(s) { status = s; paint(); }

/* ---------------- Firebase ---------------- */
async function loadFirebase() {
  const [appMod, authMod, fsMod] = await Promise.all([
    import(SDK + "firebase-app.js"),
    import(SDK + "firebase-auth.js"),
    import(SDK + "firebase-firestore.js")
  ]);
  const app = appMod.initializeApp(firebaseConfig);
  const auth = authMod.getAuth(app);
  const db = fsMod.getFirestore(app);
  return { app, auth, db, authMod, fsMod };
}

function docRef() { return fb.fsMod.doc(fb.db, "users", user.uid, "sites", SITE_ID); }

async function signIn() {
  if (!fb) return;
  const provider = new fb.authMod.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await fb.authMod.signInWithPopup(fb.auth, provider);
  } catch (e) {
    const code = (e && e.code) || "";
    if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
      try { await fb.authMod.signInWithRedirect(fb.auth, provider); } catch (e2) { toast("Sign-in didn't work. Please try again."); }
    } else if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
      /* the user closed the window: nothing to do */
    } else if (code === "auth/unauthorized-domain") {
      toast("Sign-in isn't enabled for this web address yet.");
    } else if (code === "auth/network-request-failed") {
      toast("No internet connection. Try signing in again later.");
    } else {
      toast("Sign-in didn't work. Please try again.");
    }
  }
}

async function doSignOut() {
  setMenu(false);
  try { await fb.authMod.signOut(fb.auth); toast("Signed out. Your progress stays on this device."); }
  catch (e) { toast("Couldn't sign out. Please try again."); }
}

function stopListening() { if (unsubscribe) { unsubscribe(); unsubscribe = null; } remote = null; clearTimeout(pushTimer); }

function parseRemote(snap) {
  if (!snap.exists()) return null;
  try { const d = snap.data(); return d && typeof d.state === "string" ? JSON.parse(d.state) : null; } catch (e) { return null; }
}

// a state arrived from the account: merge it into this device, and send back anything only this device had
function onRemote(snap) {
  const incoming = parseRemote(snap);
  if (snap.metadata && snap.metadata.hasPendingWrites) return;   // our own write echoing back
  remote = incoming;
  const local = P.load();
  const merged = P.merge(local, incoming);
  if (!P.same(merged, local)) {
    applyingRemote = true;
    P.writeLocal(merged);
    applyingRemote = false;
    P.rerender();
  }
  if (!incoming || !P.same(merged, incoming)) schedulePush(0);
  else setStatus("synced");
}

function schedulePush(delay) {
  if (!user || !fb) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushNow, delay == null ? 800 : delay);
}

async function pushNow() {
  if (!user || !fb) return;
  const merged = P.merge(P.load(), remote);
  setStatus(navigator.onLine === false ? "offline" : "syncing");
  try {
    await fb.fsMod.setDoc(docRef(), { state: JSON.stringify(merged), updatedAt: fb.fsMod.serverTimestamp(), v: 1 });
    remote = merged;
    setStatus("synced");
  } catch (e) {
    setStatus(navigator.onLine === false ? "offline" : "error");
  }
}

function onUser(u) {
  stopListening();
  user = u || null;
  if (!user) { setStatus("idle"); return; }
  setStatus("syncing");
  unsubscribe = fb.fsMod.onSnapshot(
    docRef(),
    { includeMetadataChanges: false },
    onRemote,
    () => setStatus(navigator.onLine === false ? "offline" : "error")
  );
}

/* ---------------- boot ---------------- */
async function boot() {
  if (!P || !firebaseConfig || !firebaseConfig.apiKey) return;   // sign-in not configured: browser-only progress
  try { fb = await loadFirebase(); } catch (e) { return; }      // SDK blocked or offline: stay browser-only
  paint();
  // handle the result of a redirect sign-in (used only when popups are blocked)
  fb.authMod.getRedirectResult(fb.auth).catch(() => {});
  fb.authMod.onAuthStateChanged(fb.auth, onUser);
  window.addEventListener("hb:changed", () => { if (!applyingRemote) schedulePush(); });
  window.addEventListener("hb:rendered", paint);
  window.addEventListener("online", () => { if (user) pushNow(); });
  window.addEventListener("offline", () => { if (user) setStatus("offline"); });
  // Material's instant navigation swaps the page: put the button back and refresh the text
  if (window.document$ && typeof window.document$.subscribe === "function") window.document$.subscribe(paint);
}
boot();
