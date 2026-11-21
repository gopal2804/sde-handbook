/* SDE Handbook progress tracker
 * - Per skill: tick sections (each h2) and mark the whole skill done.
 * - Per day: tick the days of the 20-day plan.
 * - Home dashboard: overall ring, per-category progress, skill cards, continue link.
 * - Export / import progress as JSON (move between devices); reset everything (inline confirm).
 * Progress lives in this browser's localStorage; every read/write is guarded so the site works without it.
 */
(function () {
  "use strict";

  var KEY = "sdeh-progress-v1";
  var SKILLS = [
    { slug: "01_DSA", title: "Data Structures & Algorithms", cat: "Foundations", icon: "🧮", blurb: "Complexity, every data structure, patterns, 150 problems" },
    { slug: "02_C_and_Cpp", title: "C and C++", cat: "Foundations", icon: "⚙️", blurb: "Memory, pointers, OOP, STL, templates, modern C++" },
    { slug: "03_Python", title: "Python", cat: "Foundations", icon: "🐍", blurb: "Core language to internals, async, testing, ecosystem" },
    { slug: "04_Scala_JVM_SpringBoot", title: "Scala, JVM & Spring Boot", cat: "Foundations", icon: "☕", blurb: "Functional Scala, JVM internals, Java, Spring" },
    { slug: "05_OOP_Design_Patterns_LLD", title: "OOP, Design Patterns & LLD", cat: "Foundations", icon: "🧩", blurb: "Pillars, SOLID, all 23 patterns, LLD problems" },
    { slug: "06_OS_Linux_Bash", title: "Operating Systems, Linux & Bash", cat: "Systems", icon: "🖥️", blurb: "Processes, memory, files, Linux admin, scripting" },
    { slug: "07_Multithreading_Concurrency", title: "Multithreading & Concurrency", cat: "Systems", icon: "🧵", blurb: "Races, locks, async, lock-free, classic problems" },
    { slug: "08_Computer_Networks", title: "Computer Networks", cat: "Systems", icon: "🌐", blurb: "OSI/TCP-IP, TCP, DNS, HTTP, TLS, load balancing" },
    { slug: "09_Databases_SQL_MySQL_MongoDB", title: "SQL, MySQL, MongoDB & Redis", cat: "Data & Storage", icon: "🗄️", blurb: "SQL from DDL to internals, MongoDB, Redis" },
    { slug: "10_Elasticsearch_DuckDB_Arrow_Parquet", title: "Elasticsearch, DuckDB, Arrow & Parquet", cat: "Data & Storage", icon: "🔎", blurb: "Search, columnar formats, embedded analytics" },
    { slug: "11_Storage_Systems", title: "Storage Systems, S3 & ECS", cat: "Data & Storage", icon: "💾", blurb: "Block/file/object, RAID, EC, OneFS, S3, ECS" },
    { slug: "12_Distributed_Systems", title: "Distributed Systems", cat: "Data & Storage", icon: "🕸️", blurb: "CAP, replication, consensus, failure handling" },
    { slug: "13_Kafka_RabbitMQ", title: "Kafka & RabbitMQ", cat: "Data & Storage", icon: "📨", blurb: "Logs vs brokers, delivery semantics, operations" },
    { slug: "14_System_Design_HLD", title: "System Design (HLD)", cat: "Design & Backend", icon: "🏗️", blurb: "Framework, building blocks, 18 worked designs" },
    { slug: "15_Backend_REST_Microservices_FastAPI", title: "Backend, REST, Microservices & FastAPI", cat: "Design & Backend", icon: "🔌", blurb: "APIs, auth, microservice patterns, FastAPI" },
    { slug: "16_Docker_Kubernetes", title: "Docker & Kubernetes", cat: "DevOps", icon: "🐳", blurb: "Containers, images, K8s objects, autoscaling" },
    { slug: "17_CICD_Git_Jenkins_Maven", title: "CI/CD, Git, Jenkins & Maven", cat: "DevOps", icon: "🔁", blurb: "Git, pipelines, Jenkins, Actions, GitLab, Maven" },
    { slug: "18_Observability", title: "Observability", cat: "DevOps", icon: "📈", blurb: "Prometheus, Grafana, Splunk, ELK, tracing" },
    { slug: "19_Security_DevSecOps", title: "Security & DevSecOps", cat: "DevOps", icon: "🛡️", blurb: "SAST, SCA, OWASP, crypto, threat modelling" },
    { slug: "20_LLMs_Prompting_OpenAI", title: "LLMs, Prompting & OpenAI API", cat: "AI Engineering", icon: "🤖", blurb: "How LLMs work, prompting, the OpenAI API" },
    { slug: "21_RAG_Agents_Evals_Guardrails", title: "RAG, Agents, Evals & Guardrails", cat: "AI Engineering", icon: "🧠", blurb: "Retrieval, agents, MCP, LangChain, evals" },
    { slug: "22_AI_Coding_Tools", title: "AI Coding Tools", cat: "AI Engineering", icon: "🛠️", blurb: "Copilot, Claude Code, Devin, governance" },
    { slug: "23_Chrome_Extensions", title: "Chrome Extensions", cat: "AI Engineering", icon: "🧷", blurb: "MV3, content scripts, service workers, publishing" },
    { slug: "24_Agile_Scrum_SDLC", title: "Agile, Scrum & SDLC", cat: "Process & Practice", icon: "🗂️", blurb: "SDLC, Scrum, Kanban, testing types" },
    { slug: "28_Practice_Questions", title: "Practice Questions & Mocks", cat: "Process & Practice", icon: "🎯", blurb: "~650 questions and 11 mock interviews" }
  ];
  var CATS = ["Foundations", "Systems", "Data & Storage", "Design & Backend", "DevOps", "AI Engineering", "Process & Practice"];
  var TOTAL_DAYS = 20;
  var BY_SLUG = {};
  SKILLS.forEach(function (s) { BY_SLUG[s.slug] = s; });

  /* ---------------- storage ---------------- */
  function emptyState() { return { version: 1, skills: {}, days: {}, last: null }; }
  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return emptyState();
      var s = JSON.parse(raw);
      if (!s || typeof s !== "object") return emptyState();
      s.skills = s.skills && typeof s.skills === "object" ? s.skills : {};
      s.days = s.days && typeof s.days === "object" ? s.days : {};
      return s;
    } catch (e) { return emptyState(); }
  }
  function save(s) { try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* private mode etc. */ } }
  function skillState(s, slug) {
    if (!s.skills[slug]) s.skills[slug] = { done: false, sections: {}, total: 0 };
    if (!s.skills[slug].sections) s.skills[slug].sections = {};
    return s.skills[slug];
  }

  /* ---------------- helpers ---------------- */
  function currentSlug() {
    var parts = window.location.pathname.split("/").filter(Boolean);
    var last = parts.length ? parts[parts.length - 1] : "";
    if (last === "index.html") last = parts[parts.length - 2] || "";
    return last;
  }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function checkedCount(st) { return Object.keys(st.sections || {}).filter(function (k) { return st.sections[k]; }).length; }
  function pct(slug, s) {
    var st = s.skills[slug];
    if (!st) return 0;
    if (st.done) return 100;
    if (!st.total) return checkedCount(st) ? 5 : 0;
    return Math.min(99, Math.round((checkedCount(st) / st.total) * 100));
  }
  function status(slug, s) {
    var st = s.skills[slug];
    if (st && st.done) return "done";
    if (st && checkedCount(st) > 0) return "progress";
    return "todo";
  }
  function siteRoot() {
    // the home page links resolve relative to the site root; works for /sde-handbook/ and local roots
    var base = document.querySelector("a.md-header__button.md-logo");
    return base ? base.getAttribute("href") : "./";
  }
  function ring(percent, size, stroke, label) {
    var r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - percent / 100);
    return '<svg class="hb-ring" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + " " + size + '" role="img" aria-label="' + percent + '% complete">' +
      '<circle class="hb-ring__track" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" stroke-width="' + stroke + '" fill="none"/>' +
      '<circle class="hb-ring__value" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" stroke-width="' + stroke + '" fill="none" stroke-dasharray="' + c.toFixed(2) + '" stroke-dashoffset="' + off.toFixed(2) + '" transform="rotate(-90 ' + size / 2 + " " + size / 2 + ')"/>' +
      '<text x="50%" y="48%" class="hb-ring__pct" text-anchor="middle" dominant-baseline="middle">' + percent + "%</text>" +
      (label ? '<text x="50%" y="66%" class="hb-ring__label" text-anchor="middle" dominant-baseline="middle">' + esc(label) + "</text>" : "") +
      "</svg>";
  }
  function toast(msg) {
    var t = el("div", "hb-toast", esc(msg));
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add("hb-toast--show"); });
    setTimeout(function () { t.classList.remove("hb-toast--show"); setTimeout(function () { t.remove(); }, 300); }, 2200);
  }

  /* ---------------- skill pages ---------------- */
  function enhanceSkillPage(slug) {
    var article = document.querySelector("article.md-content__inner");
    if (!article || article.dataset.hbDone) return;
    article.dataset.hbDone = "1";
    var s = load();
    var st = skillState(s, slug);
    var heads = Array.prototype.slice.call(article.querySelectorAll("h2[id]"));
    st.total = heads.length;
    s.last = slug;
    save(s);

    // progress card under the title
    var h1 = article.querySelector("h1");
    var card = el("div", "hb-skillbar");
    card.innerHTML =
      '<div class="hb-skillbar__info"><span class="hb-skillbar__label">Your progress</span>' +
      '<span class="hb-skillbar__count"></span></div>' +
      '<div class="hb-bar"><div class="hb-bar__fill"></div></div>' +
      '<button type="button" class="hb-btn hb-btn--primary hb-btn--small hb-skillbar__done"></button>';
    if (h1 && h1.nextSibling) h1.parentNode.insertBefore(card, h1.nextSibling); else article.prepend(card);

    function refresh() {
      var s2 = load(), st2 = skillState(s2, slug);
      var n = checkedCount(st2), total = st2.total || heads.length, p = pct(slug, s2);
      card.querySelector(".hb-skillbar__count").textContent = st2.done ? "Skill done ✓" : n + " of " + total + " sections read";
      card.querySelector(".hb-bar__fill").style.width = p + "%";
      card.classList.toggle("hb-skillbar--done", !!st2.done);
      var btn = card.querySelector(".hb-skillbar__done");
      btn.textContent = st2.done ? "Undo: mark as not done" : "Mark skill as done";
      heads.forEach(function (h) {
        var b = h.querySelector(".hb-sec");
        var on = !!st2.sections[h.id];
        if (b) { b.classList.toggle("hb-sec--on", on); b.setAttribute("aria-pressed", on ? "true" : "false"); b.title = on ? "Marked as read: click to undo" : "Mark this section as read"; }
      });
      decorateNav(s2);
    }

    card.querySelector(".hb-skillbar__done").addEventListener("click", function () {
      var s2 = load(), st2 = skillState(s2, slug);
      st2.done = !st2.done;
      save(s2); refresh();
      toast(st2.done ? "Nice! Skill marked as done." : "Skill marked as not done.");
    });

    heads.forEach(function (h) {
      var b = el("button", "hb-sec", '<span class="hb-sec__icon">✓</span><span class="hb-sec__text">Read</span>');
      b.type = "button";
      b.addEventListener("click", function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        var s2 = load(), st2 = skillState(s2, slug);
        st2.sections[h.id] = !st2.sections[h.id];
        if (!st2.sections[h.id]) delete st2.sections[h.id];
        var wasDone = st2.done;
        if (checkedCount(st2) === heads.length && heads.length > 0) st2.done = true;
        save(s2); refresh();
        if (!wasDone && st2.done) toast("All sections read: skill complete! 🎉");
      });
      h.appendChild(b);
    });
    refresh();
  }

  /* ---------------- 20-day plan page ---------------- */
  function enhancePlanPage() {
    var tables = document.querySelectorAll("article.md-content__inner table");
    tables.forEach(function (table) {
      var headers = Array.prototype.map.call(table.querySelectorAll("thead th"), function (th) { return th.textContent.trim(); });
      if (headers[0] !== "Day" || headers[headers.length - 1] !== "Done" || table.dataset.hbDone) return;
      table.dataset.hbDone = "1";
      var summary = el("div", "hb-days");
      table.closest(".md-typeset__table, table").before(summary);
      function refresh() {
        var s = load(), n = Object.keys(s.days).filter(function (k) { return s.days[k]; }).length;
        summary.innerHTML = '<strong>' + n + " of " + TOTAL_DAYS + ' days done</strong><div class="hb-bar"><div class="hb-bar__fill" style="width:' + Math.round(n / TOTAL_DAYS * 100) + '%"></div></div>';
      }
      table.querySelectorAll("tbody tr").forEach(function (tr) {
        var cells = tr.querySelectorAll("td");
        var day = parseInt(cells[0].textContent, 10);
        if (!day) return;
        var cell = cells[cells.length - 1];
        var box = el("button", "hb-daybox");
        box.type = "button";
        function paint() {
          var on = !!load().days[day];
          box.classList.toggle("hb-daybox--on", on);
          box.setAttribute("aria-pressed", on ? "true" : "false");
          box.textContent = on ? "✓" : "";
          box.title = on ? "Day " + day + " done: click to undo" : "Mark day " + day + " as done";
          tr.classList.toggle("hb-row--done", on);
        }
        box.addEventListener("click", function () {
          var s = load();
          if (s.days[day]) delete s.days[day]; else s.days[day] = true;
          save(s); paint(); refresh();
        });
        cell.textContent = ""; cell.appendChild(box); paint();
      });
      refresh();
    });
  }

  /* ---------------- sidebar badges ---------------- */
  function decorateNav(s) {
    s = s || load();
    document.querySelectorAll("a.md-nav__link[href], a.md-tabs__link[href]").forEach(function (a) {
      var slug;
      try { slug = new URL(a.href, window.location.href).pathname.split("/").filter(Boolean).pop(); } catch (e) { return; }
      if (!BY_SLUG[slug] || a.classList.contains("md-tabs__link")) return;
      var badge = a.querySelector(".hb-navbadge");
      if (!badge) { badge = el("span", "hb-navbadge"); a.appendChild(badge); }
      var stt = status(slug, s);
      badge.className = "hb-navbadge hb-navbadge--" + stt;
      badge.textContent = stt === "done" ? "✓" : stt === "progress" ? pct(slug, s) + "%" : "";
    });
  }

  /* ---------------- home dashboard ---------------- */
  function renderDashboard() {
    var root = document.getElementById("progress-dashboard");
    if (!root) return;
    var s = load();
    var doneSkills = SKILLS.filter(function (k) { return status(k.slug, s) === "done"; }).length;
    var inProg = SKILLS.filter(function (k) { return status(k.slug, s) === "progress"; }).length;
    var sectionsRead = SKILLS.reduce(function (a, k) { return a + (s.skills[k.slug] ? checkedCount(s.skills[k.slug]) : 0); }, 0);
    var daysDone = Object.keys(s.days).filter(function (k) { return s.days[k]; }).length;
    var overall = Math.round(SKILLS.reduce(function (a, k) { return a + pct(k.slug, s); }, 0) / SKILLS.length);

    var heroRing = document.getElementById("hb-hero-ring");
    if (heroRing) heroRing.innerHTML = ring(overall, 168, 14, "overall");
    var cont = document.getElementById("hb-continue");
    if (cont) { if (s.last && BY_SLUG[s.last]) { cont.hidden = false; cont.href = s.last + "/"; cont.textContent = "Continue: " + BY_SLUG[s.last].title; } else { cont.hidden = true; } }

    var html = '<div class="hb-stats">' +
      stat(doneSkills + "/" + SKILLS.length, "skills done") +
      stat(String(inProg), "in progress") +
      stat(String(sectionsRead), "sections read") +
      stat(daysDone + "/" + TOTAL_DAYS, "plan days done") +
      "</div>";

    CATS.forEach(function (cat) {
      var items = SKILLS.filter(function (k) { return k.cat === cat; });
      var catPct = Math.round(items.reduce(function (a, k) { return a + pct(k.slug, s); }, 0) / items.length);
      html += '<section class="hb-cat"><div class="hb-cat__head"><h3 class="hb-cat__title">' + esc(cat) + '</h3>' +
        '<span class="hb-cat__pct">' + catPct + '%</span></div><div class="hb-bar hb-bar--thin"><div class="hb-bar__fill" style="width:' + catPct + '%"></div></div><div class="hb-cards">';
      items.forEach(function (k) {
        var stt = status(k.slug, s), p = pct(k.slug, s);
        var label = stt === "done" ? "Done" : stt === "progress" ? p + "% read" : "Not started";
        html += '<a class="hb-card hb-card--' + stt + '" href="' + k.slug + '/">' +
          '<div class="hb-card__top"><span class="hb-card__icon">' + k.icon + '</span><span class="hb-pill hb-pill--' + stt + '">' + label + "</span></div>" +
          '<div class="hb-card__title">' + esc(k.title) + "</div>" +
          '<div class="hb-card__blurb">' + esc(k.blurb) + "</div>" +
          '<div class="hb-bar hb-bar--thin"><div class="hb-bar__fill" style="width:' + p + '%"></div></div></a>';
      });
      html += "</div></section>";
    });

    html += '<div class="hb-tools">' +
      '<div class="hb-tools__text"><strong>Your progress is saved in this browser.</strong> Export it to move to another device, or reset to start from the beginning.</div>' +
      '<div class="hb-tools__actions">' +
      '<button type="button" class="hb-btn hb-btn--ghost" data-hb="export">Export progress</button>' +
      '<button type="button" class="hb-btn hb-btn--ghost" data-hb="import">Import progress</button>' +
      '<button type="button" class="hb-btn hb-btn--danger" data-hb="reset">Reset all progress</button>' +
      '<input type="file" accept="application/json,.json" data-hb="file" hidden>' +
      "</div>" +
      '<div class="hb-confirm" hidden><span>This clears every ticked section, skill and day. It can\'t be undone (export first if you want a backup).</span>' +
      '<button type="button" class="hb-btn hb-btn--danger" data-hb="reset-yes">Yes, reset everything</button>' +
      '<button type="button" class="hb-btn hb-btn--ghost" data-hb="reset-no">Cancel</button></div></div>';

    root.innerHTML = html;

    root.querySelector('[data-hb="export"]').addEventListener("click", function () {
      var blob = new Blob([JSON.stringify(load(), null, 2)], { type: "application/json" });
      var a = el("a"); a.href = URL.createObjectURL(blob);
      a.download = "sde-handbook-progress-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
      toast("Progress exported.");
    });
    var file = root.querySelector('[data-hb="file"]');
    root.querySelector('[data-hb="import"]').addEventListener("click", function () { file.click(); });
    file.addEventListener("change", function () {
      var f = file.files && file.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var data = JSON.parse(reader.result);
          if (!data || typeof data !== "object" || typeof data.skills !== "object") throw new Error("bad file");
          save({ version: 1, skills: data.skills || {}, days: data.days || {}, last: data.last || null });
          renderDashboard(); decorateNav(); toast("Progress imported.");
        } catch (e) { toast("That file isn't a valid progress export."); }
      };
      reader.readAsText(f);
      file.value = "";
    });
    var confirmBox = root.querySelector(".hb-confirm");
    root.querySelector('[data-hb="reset"]').addEventListener("click", function () { confirmBox.hidden = false; });
    root.querySelector('[data-hb="reset-no"]').addEventListener("click", function () { confirmBox.hidden = true; });
    root.querySelector('[data-hb="reset-yes"]').addEventListener("click", function () {
      try { window.localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
      renderDashboard(); decorateNav(); toast("All progress cleared. Fresh start!");
    });
  }
  function stat(value, label) { return '<div class="hb-stat"><div class="hb-stat__value">' + esc(value) + '</div><div class="hb-stat__label">' + esc(label) + "</div></div>"; }

  /* ---------------- boot (works with Material's instant navigation) ---------------- */
  function init() {
    var slug = currentSlug();
    if (BY_SLUG[slug]) enhanceSkillPage(slug);
    if (slug === "plan") enhancePlanPage();
    renderDashboard();
    decorateNav();
  }
  if (window.document$ && typeof window.document$.subscribe === "function") window.document$.subscribe(init);
  else if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
