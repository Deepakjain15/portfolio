/* Deepak Jain portfolio: page behaviour.
   Needs gsap, ScrollTrigger and (optionally) Lenis loaded first. Everything degrades to a plain page without them. */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var hasGsap = typeof gsap !== "undefined";
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  // Console errors are collected so the "checks" section can report them honestly.
  var errors = [];
  window.addEventListener("error", function (e) { errors.push(e.message || "error"); });
  var origError = console.error;
  console.error = function () { errors.push(Array.prototype.slice.call(arguments).join(" ")); origError.apply(console, arguments); };

  // Run counter, remembered per browser.
  var runs = 1;
  try { runs = (parseInt(localStorage.getItem("dj-runs") || "0", 10) || 0) + 1; localStorage.setItem("dj-runs", String(runs)); } catch (e) {}
  $$("[data-runs]").forEach(function (el) { el.textContent = runs; });

  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  // ---- Hero entrance ----
  if (hasGsap && !reduce) {
    gsap.from(".display .w", { yPercent: 115, duration: 1, ease: "power4.out", stagger: 0.09, delay: 0.1 });
    gsap.from([".kicker", ".role", ".lede", ".hero .cta", ".facts"], { y: 22, opacity: 0, duration: 0.9, ease: "power3.out", stagger: 0.09, delay: 0.35 });
    gsap.from(".stage-wrap", { y: 30, opacity: 0, duration: 1, ease: "power3.out", delay: 0.3 });
  }

  // ---- Smooth scroll (desktop, motion allowed) and anchor links ----
  var lenis = null;
  if (hasGsap && typeof Lenis !== "undefined" && fine && !reduce) {
    lenis = new Lenis({ lerp: 0.1 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      var target = id.length > 1 ? $(id) : null;
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: -70 });
      else target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    });
  });

  // ---- Scroll progress, reveals, section titles, counters ----
  if (hasGsap && !reduce) {
    gsap.to("#progress", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: true } });
    $$("[data-reveal]").forEach(function (el) {
      gsap.from(el, { y: 30, opacity: 0, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 92%", once: true } });
    });
    $$(".sec-title, .contact .big").forEach(function (el) {
      gsap.from(el, { y: 40, opacity: 0, duration: 1, ease: "power4.out", scrollTrigger: { trigger: el, start: "top 90%", once: true } });
    });
    $$("[data-count]").forEach(function (el) {
      var target = parseInt(el.getAttribute("data-count"), 10), suffix = el.getAttribute("data-suffix") || "", o = { v: 0 };
      ScrollTrigger.create({ trigger: el, start: "top 90%", once: true, onEnter: function () {
        gsap.to(o, { v: target, duration: 1.4, ease: "power2.out", onUpdate: function () { el.textContent = Math.round(o.v) + suffix; } });
      } });
    });
    window.addEventListener("load", function () { ScrollTrigger.refresh(); });
  }

  // ---- Cursor ring, hover previews and magnetic buttons (desktop, motion allowed) ----
  if (hasGsap && fine && !reduce) {
    var cur = $("#cursor"), cx = gsap.quickTo(cur, "x", { duration: 0.25, ease: "power3" }), cy = gsap.quickTo(cur, "y", { duration: 0.25, ease: "power3" });
    window.addEventListener("pointermove", function (e) { cur.classList.add("on"); cx(e.clientX); cy(e.clientY); }, { passive: true });
    document.addEventListener("pointerover", function (e) {
      var hot = e.target.closest("a, button, summary");
      cur.classList.toggle("big", !!hot);
      var row = e.target.closest("details.run[data-preview]");
      cur.setAttribute("data-label", hot && row && e.target.closest("summary") && !row.open ? "View" : "");
    });
    document.documentElement.addEventListener("pointerleave", function () { cur.classList.remove("on"); });

    var preview = $("#preview"), pimg = preview && $("img", preview), shown = false;
    if (preview && pimg) {
      var px = gsap.quickTo(preview, "x", { duration: 0.45, ease: "power3" }), py = gsap.quickTo(preview, "y", { duration: 0.45, ease: "power3" });
      var show = function (row, e) {
        if (row.open) return;
        shown = true;
        pimg.src = row.getAttribute("data-preview");
        gsap.set(preview, { x: e.clientX + 28, y: e.clientY - 90 });
        gsap.to(preview, { opacity: 1, scale: 1, duration: 0.35, ease: "power3.out", overwrite: "auto" });
      };
      var hide = function () {
        if (!shown) return;
        shown = false;
        gsap.to(preview, { opacity: 0, scale: 0.92, duration: 0.25, ease: "power2.in", overwrite: "auto" });
      };
      $$("details.run[data-preview]").forEach(function (row) {
        var summary = $("summary", row);
        summary.addEventListener("pointerenter", function (e) { show(row, e); });
        summary.addEventListener("pointermove", function (e) { if (!shown) show(row, e); else { px(e.clientX + 28); py(e.clientY - 90); } }, { passive: true });
        summary.addEventListener("pointerleave", hide);
        row.addEventListener("toggle", hide);
      });
      // Safety nets: the page can move under a still cursor, so a "pointer left" event may never arrive.
      window.addEventListener("scroll", hide, { passive: true });
      window.addEventListener("blur", hide);
      document.addEventListener("pointermove", function (e) { if (shown && !e.target.closest("details.run[data-preview] summary")) hide(); }, { passive: true });
    }
    $$(".mag").forEach(function (el) {
      var qx = gsap.quickTo(el, "x", { duration: 0.4, ease: "power3" }), qy = gsap.quickTo(el, "y", { duration: 0.4, ease: "power3" });
      el.addEventListener("pointermove", function (e) { var r = el.getBoundingClientRect(); qx((e.clientX - r.left - r.width / 2) * 0.22); qy((e.clientY - r.top - r.height / 2) * 0.3); }, { passive: true });
      el.addEventListener("pointerleave", function () { qx(0); qy(0); });
    });
  }

  // ---- Live checks: a small in-browser subset of site-check ----
  var defs = [
    ["No sideways scrolling", function () { var d = document.documentElement; return { ok: d.scrollWidth <= d.clientWidth + 1, note: d.scrollWidth + "px content, " + d.clientWidth + "px window" }; }],
    ["Every image has alt text", function () { var imgs = $$("img"); var bad = imgs.filter(function (i) { return !i.hasAttribute("alt"); }).length; return { ok: bad === 0, note: imgs.length + " images, " + bad + " missing" }; }],
    ["One main heading", function () { var n = $$("h1").length; return { ok: n === 1, note: n + " h1" }; }],
    ["Headings never skip a level", function () { var hs = $$("h1,h2,h3,h4"), prev = 0, skips = 0; hs.forEach(function (h) { var lv = parseInt(h.tagName.charAt(1), 10); if (prev && lv - prev > 1) skips++; prev = lv; }); return { ok: skips === 0, note: hs.length + " headings, " + skips + " skips" }; }],
    ["Every link has a destination", function () { var as = $$("a"), bad = as.filter(function (a) { return !a.getAttribute("href"); }).length; return { ok: bad === 0, note: as.length + " links, " + bad + " empty" }; }],
    ["No console errors since load", function () { return { ok: errors.length === 0, note: errors.length + " errors" }; }],
    ["Loaded in under 3 seconds", function () { var n = performance.getEntriesByType && performance.getEntriesByType("navigation")[0]; if (!n || !n.loadEventEnd) return { skip: true, note: "timing not available here" }; var ms = Math.round(n.loadEventEnd); return { ok: ms < 3000, note: ms + " ms" }; }]
  ];
  var list = $("#checkList"), summary = $("#summary"), runBtn = $("#runChecks");
  function resetList() {
    list.innerHTML = "";
    defs.forEach(function (d) {
      var li = document.createElement("li");
      li.innerHTML = '<span class="ico">o</span><span class="name"></span><span class="note"></span>';
      $(".name", li).textContent = d[0];
      list.appendChild(li);
    });
  }
  resetList();
  runBtn.addEventListener("click", function () {
    resetList(); summary.textContent = "Running..."; summary.style.color = ""; runBtn.disabled = true;
    var t0 = performance.now(), passed = 0, failed = 0, skipped = 0, rows = list.children, i = 0;
    (function step() {
      if (i >= defs.length) {
        summary.textContent = passed + " passed, " + failed + " failed" + (skipped ? ", " + skipped + " skipped" : "") + ". Took " + Math.round(performance.now() - t0) + " ms. AI calls: 0. Tokens: 0.";
        summary.style.color = failed ? "var(--fail)" : "var(--pass)"; runBtn.disabled = false; return;
      }
      var r; try { r = defs[i][1](); } catch (e) { r = { ok: false, note: "check crashed" }; }
      var li = rows[i], ico = $(".ico", li);
      if (r.skip) { ico.textContent = "-"; skipped++; }
      else if (r.ok) { ico.textContent = "ok"; li.className = "pass"; passed++; }
      else { ico.textContent = "x"; li.className = "fail"; failed++; }
      $(".note", li).textContent = r.note;
      i++; setTimeout(step, reduce ? 0 : 260);
    })();
  });

  // ---- Copy email ----
  var copyBtn = $("#copy"), emailEl = $("#email");
  copyBtn.addEventListener("click", function () {
    function done(ok) { copyBtn.textContent = ok ? "Copied" : "Press Ctrl+C"; setTimeout(function () { copyBtn.textContent = "Copy email"; }, 1800); }
    function select() { var r = document.createRange(); r.selectNodeContents(emailEl); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); done(false); }
    try { navigator.clipboard.writeText(emailEl.textContent.trim()).then(function () { done(true); }, select); } catch (e) { select(); }
  });
})();
