/* Deepak Jain portfolio: interactive 3D map of projects and skills (Three.js).
   Drag to rotate; click a node (or a button under the map) to bring it forward.
   Falls back to a plain list if WebGL or Three.js is unavailable. */
(function () {
  "use strict";
  var stage = document.getElementById("stage"), canvas = document.getElementById("map");
  var info = document.getElementById("info"), picks = document.getElementById("picks"), fallback = document.getElementById("fallback");
  if (!stage || !canvas) return;
  function useFallback() { fallback.hidden = false; stage.hidden = true; info.hidden = true; picks.hidden = true; }
  if (typeof THREE === "undefined") { useFallback(); return; }

  var coarse = window.matchMedia("(pointer: coarse)").matches;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: !coarse, alpha: true }); } catch (e) { useFallback(); return; }

  var css = getComputedStyle(document.documentElement);
  function col(name) { return css.getPropertyValue(name).trim() || "#888888"; }
  var cAccent = col("--accent"), cInk = col("--ink"), cMuted = col("--muted");

  var DATA = [
    { id: "rank", label: "RankOTest", proj: 1, p: [-0.9, 0.35, 0.5], text: "Production assessment and hiring platform. 40+ releases across 5 portals and 6 user roles." },
    { id: "flow", label: "AI Workflow CLI", proj: 1, p: [1.2, 0.7, -0.3], text: "TypeScript CLI: plan, implement, test, review, fix. Runs offline with recorded responses." },
    { id: "asst", label: "Assistant Agent", proj: 1, p: [0.2, -1.1, 0.9], text: "Prototype that sorts messages into notes, tasks and questions, and answers from your notes." },
    { id: "ts", label: "TypeScript", text: "Used in RankOTest and the workflow CLI." },
    { id: "react", label: "React", text: "Builds the RankOTest portals." },
    { id: "node", label: "Node.js", text: "RankOTest backend and APIs." },
    { id: "mongo", label: "MongoDB", text: "RankOTest data layer." },
    { id: "redis", label: "Redis", text: "Rate limiting and caching in RankOTest." },
    { id: "aws", label: "Docker + EC2", text: "Release deploys for RankOTest and Vidrohi Awaz, which run live on Docker and AWS EC2." },
    { id: "claude", label: "Claude Code", text: "Planning, review and impact analysis, with tests behind every AI change." },
    { id: "lg", label: "LangGraph", text: "Routes messages in the assistant prototype." },
    { id: "py", label: "Python", text: "Used for the assistant prototype." }
  ];
  var EDGES = [["rank", "ts"], ["rank", "react"], ["rank", "node"], ["rank", "mongo"], ["rank", "redis"], ["rank", "aws"], ["flow", "ts"], ["flow", "claude"], ["flow", "asst"], ["asst", "py"], ["asst", "lg"], ["asst", "claude"]];

  // Skills sit on a sphere around the projects.
  var skills = DATA.filter(function (d) { return !d.proj; });
  skills.forEach(function (d, i) {
    var y = 1 - (i / (skills.length - 1)) * 2, r = Math.sqrt(1 - y * y), phi = i * 2.399963;
    d.p = [Math.cos(phi) * r * 2.8, y * 2.0, Math.sin(phi) * r * 2.8];
  });

  // Soft glow and ring textures drawn once on a canvas.
  function texture(draw) {
    var c = document.createElement("canvas"); c.width = c.height = 128;
    draw(c.getContext("2d")); return new THREE.CanvasTexture(c);
  }
  var glowTex = texture(function (g) {
    var r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.35, "rgba(255,255,255,.35)"); r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  });
  var ringTex = texture(function (g) { g.lineWidth = 3; g.strokeStyle = "#fff"; g.beginPath(); g.arc(64, 64, 58, 0, Math.PI * 2); g.stroke(); });

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
  camera.position.z = 8.2;
  var group = new THREE.Group();
  group.rotation.x = 0.12;
  scene.add(group);

  var nodes = {}, meshes = [];
  DATA.forEach(function (d, i) {
    var mat = new THREE.MeshBasicMaterial({ color: d.proj ? cAccent : cMuted, transparent: true });
    var mesh = new THREE.Mesh(new THREE.SphereGeometry(d.proj ? 0.27 : 0.13, 24, 24), mat);
    mesh.position.set(d.p[0], d.p[1], d.p[2]);
    mesh.userData.id = d.id;
    group.add(mesh); meshes.push(mesh);

    var extras = [];
    if (d.proj) {
      var glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(cAccent), transparent: true, opacity: 0.38, depthWrite: false }));
      glow.scale.setScalar(1.9); mesh.add(glow);
      var ring = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex, color: new THREE.Color(cAccent), transparent: true, opacity: 0.55, depthWrite: false }));
      ring.scale.setScalar(1.3); mesh.add(ring); extras.push(ring);
    }
    var lbl = document.createElement("span");
    lbl.className = "lbl" + (d.proj ? " proj" : ""); lbl.textContent = d.label;
    stage.appendChild(lbl);
    nodes[d.id] = { d: d, mesh: mesh, lbl: lbl, s: 1, w: 70, ring: extras[0], phase: i };
  });

  var pts = [];
  EDGES.forEach(function (e) { pts.push.apply(pts, nodes[e[0]].d.p.concat(nodes[e[1]].d.p)); });
  var geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  group.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: cMuted, transparent: true, opacity: 0.35 })));

  function measureLabels() { Object.keys(nodes).forEach(function (k) { nodes[k].w = nodes[k].lbl.getBoundingClientRect().width || 70; }); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureLabels);

  // ---- Selection ----
  var sel = null, follow = false, ty = 0, tx = 0.12, tz = 8.2, dragging = false, moved = 0, lx = 0, ly = 0, raf = 0, running = false;
  var DEFAULT_TITLE = "Drag to rotate. Click a node.", DEFAULT_TEXT = "Large nodes are projects. Lines show what each one uses.";
  function setInfo(title, text) {
    info.textContent = "";
    var b = document.createElement("b"); b.textContent = title;
    var s = document.createElement("span"); s.textContent = text;
    info.appendChild(b); info.appendChild(s);
  }
  function paint() {
    Object.keys(nodes).forEach(function (k) {
      var n = nodes[k];
      n.mesh.material.color.set(sel === k ? (n.d.proj ? cAccent : cInk) : (n.d.proj ? cAccent : cMuted));
    });
    Array.prototype.forEach.call(picks.querySelectorAll("button[data-id]"), function (b) { b.classList.toggle("on", b.getAttribute("data-id") === sel); });
  }
  function clear() { sel = null; follow = false; tz = 8.2; setInfo(DEFAULT_TITLE, DEFAULT_TEXT); paint(); }
  function select(id) {
    if (sel === id) { clear(); return; }
    sel = id; follow = true;
    var p = nodes[id].d.p;
    ty = -Math.atan2(p[0], p[2]); tx = 0.12; tz = 6.3;
    setInfo(nodes[id].d.label, nodes[id].d.text); paint();
  }
  DATA.filter(function (d) { return d.proj; }).forEach(function (d) {
    var b = document.createElement("button");
    b.type = "button"; b.textContent = d.label; b.setAttribute("data-id", d.id);
    b.addEventListener("click", function () { select(d.id); });
    picks.appendChild(b);
  });
  var reset = document.createElement("button");
  reset.type = "button"; reset.textContent = "Reset view"; reset.addEventListener("click", clear);
  picks.appendChild(reset);

  // ---- Pointer input ----
  var ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), v = new THREE.Vector3();
  function hit(e) {
    var r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    var h = ray.intersectObjects(meshes, false);
    return h.length ? h[0].object.userData.id : null;
  }
  canvas.addEventListener("pointerdown", function (e) { dragging = true; moved = 0; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = "grabbing"; });
  canvas.addEventListener("pointermove", function (e) {
    if (!dragging) { canvas.style.cursor = hit(e) ? "pointer" : "grab"; return; }
    var dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
    moved += Math.abs(dx) + Math.abs(dy);
    group.rotation.y += dx * 0.007;
    group.rotation.x = Math.max(-0.8, Math.min(0.8, group.rotation.x + dy * 0.005));
    follow = false;
  });
  canvas.addEventListener("pointerup", function (e) {
    dragging = false; canvas.style.cursor = "grab";
    if (moved < 6) { var id = hit(e); if (id) select(id); else if (sel) clear(); }
  });

  // ---- Layout and drawing ----
  function resize() {
    var w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  // Labels: place near each node, fade with depth, and nudge down when two would overlap.
  function place(t) {
    var w = stage.clientWidth, h = stage.clientHeight, items = [], placed = [];
    group.updateMatrixWorld(true);
    Object.keys(nodes).forEach(function (k) {
      var n = nodes[k];
      n.mesh.getWorldPosition(v);
      var z = v.z; v.project(camera);
      items.push({ n: n, k: k, z: z, x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h + (n.d.proj ? 20 : 12) * n.s * (8.2 / camera.position.z) });
      n.mesh.material.opacity = Math.max(0.4, Math.min(1, 0.55 + z * 0.16));
    });
    items.sort(function (a, b) { return b.z - a.z; });
    items.forEach(function (it) {
      var bw = it.n.w, bh = 16, bx = it.x - bw / 2, by = it.y, tries = 0;
      function overlaps() { return placed.some(function (p) { return bx < p.x + p.w && bx + bw > p.x && by < p.y + p.h && by + bh > p.y; }); }
      while (tries < 4 && overlaps()) { by += bh; tries++; }
      placed.push({ x: bx, y: by, w: bw, h: bh });
      it.n.lbl.style.transform = "translate(" + it.x.toFixed(1) + "px," + by.toFixed(1) + "px) translate(-50%,0)";
      it.n.lbl.style.opacity = (sel === it.k ? 1 : Math.max(0.3, Math.min(1, 0.55 + it.z * 0.18))).toFixed(2);
      if (it.n.ring) { var s = 1.3 + 0.1 * Math.sin(t * 1.6 + it.n.phase); it.n.ring.scale.setScalar(s); }
    });
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    var t = (now || 0) / 1000, k = reduce ? 1 : 0.09;
    if (sel && follow) {
      var d = ty - group.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
      group.rotation.y += d * k; group.rotation.x += (tx - group.rotation.x) * k;
    } else if (!sel && !dragging && !reduce) { group.rotation.y += 0.0022; }
    camera.position.z += (tz - camera.position.z) * k;
    Object.keys(nodes).forEach(function (id) {
      var n = nodes[id], target = sel === id ? 1.6 : 1;
      n.s += (target - n.s) * k; n.mesh.scale.setScalar(n.s);
    });
    place(t); renderer.render(scene, camera);
  }
  resize(); measureLabels();
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
  // Draw only while the map is on screen.
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      var on = es[0].isIntersecting;
      if (on && !running) { running = true; raf = requestAnimationFrame(frame); }
      if (!on && running) { running = false; cancelAnimationFrame(raf); }
    }).observe(stage);
  } else { running = true; raf = requestAnimationFrame(frame); }
})();
