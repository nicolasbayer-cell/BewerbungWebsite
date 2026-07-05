/* ==========================================================================
   Nicolas — script_BIO.js
   --------------------------------------------------------------------------
   Organized structure:

   1) Shared helpers
   2) Theme
   3) Card tilt
   4) Hero gallery
   5) Roadmap (Three.js)
   6) Projects modal
   7) Safe app bootstrap

   Tip for future edits:
   - If code uses a variable like `scrollEl`, add it INSIDE the same function
     where that variable is declared.
   - Prefer adding new behavior inside the matching init function:
       initTheme()
       initTilt()
       initGallery()
       initRoadmap()
       initProjects()
   ========================================================================== */

const qs  = (s, el = document) => el.querySelector(s);
const qsa = (s, el = document) => [...el.querySelectorAll(s)];

function setCurrentYear() {
  const yearEl = qs("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

/* =========================
   THEME
========================= */

function initTheme() {
  const root = document.documentElement;
  const storedTheme = localStorage.getItem("theme");
  if (storedTheme) root.setAttribute("data-theme", storedTheme);

  qs("#themeBtn")?.addEventListener("click", () => {
    const nextTheme = root.getAttribute("data-theme") === "light" ? "" : "light";
    nextTheme ? root.setAttribute("data-theme", nextTheme) : root.removeAttribute("data-theme");
    localStorage.setItem("theme", nextTheme);
  });
}

/* =========================
   TILT CARDS
========================= */

function initTilt() {
  qsa("[data-tilt]").forEach(card => {
    let raf = null;

    card.addEventListener("mousemove", e => {
      const r  = card.getBoundingClientRect();
      const rx = ((e.clientY - r.top)  / r.height - .5) * -7;
      const ry = ((e.clientX - r.left) / r.width  - .5) *  9;

      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-2px)`;
      });
    });

    const reset = () => {
      if (raf) cancelAnimationFrame(raf);
      card.style.transform = "";
    };

    card.addEventListener("mouseleave", reset);
  });
}

/* =========================
   HERO GALLERY
========================= */

function initGallery() {
  const gallery = qs("#heroGallery");
  if (!gallery) return;
  const slides = qsa(".galSlide", gallery);
  const dots   = qsa(".galDot",   gallery);
  const prev   = qs(".galPrev",   gallery);
  const next   = qs(".galNext",   gallery);

  let current  = 0;
  let timer    = null;

  function goTo(idx) {
    if (!slides.length) return;
    slides[current].classList.remove("galActive");
    dots[current]?.classList.remove("galDotActive");

    current = (idx + slides.length) % slides.length;

    slides[current].classList.add("galActive");
    dots[current]?.classList.add("galDotActive");
  }

  function startAuto() {
    clearInterval(timer);
    timer = setInterval(() => goTo(current + 1), 4200);
  }

  prev?.addEventListener("click", () => { goTo(current - 1); startAuto(); });
  next?.addEventListener("click", () => { goTo(current + 1); startAuto(); });
  dots.forEach(d => d.addEventListener("click", () => { goTo(+d.dataset.idx); startAuto(); }));

  gallery.addEventListener("mouseenter", () => clearInterval(timer));
  gallery.addEventListener("mouseleave", startAuto);

  // swipe
  let tx = 0;
  gallery.addEventListener("touchstart", e => { tx = e.touches[0].clientX; }, { passive: true });
  gallery.addEventListener("touchend",   e => {
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 40) { goTo(current + (dx < 0 ? 1 : -1)); startAuto(); }
  }, { passive: true });

  startAuto();
}

/* =========================
   ROADMAP (THREE.JS)
========================= */
function initRoadmap() {
  try {
  const canvas   = qs("#roadCanvas");
  const panelEl  = qs("#roadPanel");
  const progFill = qs("#progFill");
  const msRoot   = qs("#msData");
  if (!canvas || !panelEl || !msRoot || !window.THREE) return;

  const MS = qsa(".ms", msRoot).map(el => ({
  title : el.dataset.title || "",
  sub   : el.dataset.sub   || "",
  col   : el.dataset.col   || "teal",
  img   : el.dataset.img   || "",
  html  : qsa("p", el).map(p => p.outerHTML).join("")
}));
  const N = MS.length;

  const PAL = {
    teal  : { c: 0x0ea5a0, hex: "#0ea5a0", hi: 0x2dd4bf },
    orange: { c: 0xf97316, hex: "#f97316", hi: 0xfb923c }
  };

  // Cards
  const scrollEl = document.createElement("div");
  scrollEl.className = "roadScroll";
  panelEl.appendChild(scrollEl);

  MS.forEach((m, i) => {
    const card = document.createElement("article");
    card.className     = "roadCard";
    card.dataset.index = i;
    card.dataset.col   = m.col;
    card.innerHTML = `
  <div class="cardTop">
    <div class="cardNum">${String(i + 1).padStart(2, "0")}</div>

    <div>
      <div class="cardTitle">${m.title}</div>
      <div class="cardSub">${m.sub}</div>
    </div>
  </div>

  <div class="cardContent">
  ${m.img ? `
    <div class="cardHeroSide">
      <img src="${m.img}" alt="${m.title}">
    </div>
  ` : ""}

  <div class="cardBody">
    ${m.html}
  </div>
</div>
`;
    scrollEl.appendChild(card);

    const img = card.querySelector(".cardHeroSide img");
    if (img) {
      const updatePortrait = () => {
        if (img.naturalHeight > img.naturalWidth) {
          card.classList.add("portraitImg");
        } else {
          card.classList.remove("portraitImg");
        }
      };
      img.addEventListener("load", updatePortrait);
      if (img.complete) updatePortrait();
    }
  });
  const cards = qsa(".roadCard", scrollEl);

  function applyCardHeights() {
    const h = panelEl.clientHeight;
    if (h < 100) return;
    cards.forEach(c => { c.style.height = h + "px"; });
  }

  requestAnimationFrame(() => {
    setTimeout(() => {
      applyCardHeights();
      setActive(0);
      onScroll();
    }, 60);
  });

window.addEventListener("resize", () => {
    applyCardHeights();
    if (cards[activeIdx]) scrollEl.scrollTop = cards[activeIdx].offsetTop;
    resize();
  }); // <-- Hier schließt das Window-Event!

  // 2. Der ResizeObserver komplett EIGENSTÄNDIG AUẞERHALB
  const resizeObserver = new ResizeObserver(() => {
    applyCardHeights();
    resize();
  });

  if (canvas.parentElement) {
    resizeObserver.observe(canvas.parentElement);
  }

  /* THREE setup */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));

  const scene = new THREE.Scene();

  // Keep fog but not too dense (so organoids & path stay visible)
  scene.fog = new THREE.FogExp2(0x091420, 0.018);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 260);
  scene.add(camera);

  scene.add(new THREE.AmbientLight(0xb8e8e0, 0.45));
  const keyL = new THREE.DirectionalLight(0xfff0d8, 0.85);
  keyL.position.set(8, 14, 5);
  scene.add(keyL);

  const bioT = new THREE.PointLight(0x0ea5a0, 1.3, 26);
  bioT.position.set(0, 4, 0);
  scene.add(bioT);

  const bioO = new THREE.PointLight(0xf97316, 0.75, 22);
  bioO.position.set(3, -2, -10);
  scene.add(bioO);

  /* Path */
  const SPACING = 7.5;
  const pathPts = [];
  for (let i = 0; i < N; i++) {
    const t = i / Math.max(1, N - 1);
    pathPts.push(new THREE.Vector3(
      Math.sin(t * Math.PI * 1.6) * 1.8,
      Math.cos(t * Math.PI * 0.9) * 0.65,
      -i * SPACING
    ));
  }
  const mainCurve = new THREE.CatmullRomCurve3(pathPts, false, "catmullrom", 0.5);

  // visible core tube
  scene.add(new THREE.Mesh(
    new THREE.TubeGeometry(mainCurve, N * 32, 0.06, 10, false),
    new THREE.MeshStandardMaterial({
      color: 0x0ea5a0, emissive: 0x0ea5a0, emissiveIntensity: 0.55,
      transparent: true, opacity: 0.95, roughness: 0.15, metalness: 0.05
    })
  ));

  // soft outer glow body
  scene.add(new THREE.Mesh(
    new THREE.TubeGeometry(mainCurve, N * 20, 0.22, 10, false),
    new THREE.MeshStandardMaterial({
      color: 0x0ea5a0, transparent: true, opacity: 0.055,
      roughness: 0.9, metalness: 0, side: THREE.BackSide
    })
  ));

  // Helix strands
  function helixPoints(offset, amplitude, freq) {
    const pts = [];
    const samples = N * 28;
    for (let s = 0; s <= samples; s++) {
      const tt   = s / samples;
      const base = mainCurve.getPoint(tt);
      const angle = tt * Math.PI * 2 * freq + offset;
      pts.push(new THREE.Vector3(
        base.x + Math.cos(angle) * amplitude,
        base.y + Math.sin(angle) * amplitude,
        base.z
      ));
    }
    return pts;
  }

  [0, Math.PI].forEach((off, idx) => {
    const hPts  = helixPoints(off, 0.55, 5);
    const hCurve = new THREE.CatmullRomCurve3(hPts);
    scene.add(new THREE.Mesh(
      new THREE.TubeGeometry(hCurve, N * 28, 0.018, 6, false),
      new THREE.MeshStandardMaterial({
        color: idx === 0 ? 0x0ea5a0 : 0xf97316,
        emissive: idx === 0 ? 0x0ea5a0 : 0xf97316,
        emissiveIntensity: 0.4,
        transparent: true, opacity: 0.55,
        roughness: 0.2, metalness: 0.05
      })
    ));
  });

  // rungs
  const rungCount = N * 10;
  for (let r = 0; r < rungCount; r++) {
    const tt     = r / rungCount;
    const base  = mainCurve.getPoint(tt);
    const angle = tt * Math.PI * 2 * 5;
    const pA = new THREE.Vector3(
      base.x + Math.cos(angle) * 0.55,
      base.y + Math.sin(angle) * 0.55,
      base.z
    );
    const pB = new THREE.Vector3(
      base.x + Math.cos(angle + Math.PI) * 0.55,
      base.y + Math.sin(angle + Math.PI) * 0.55,
      base.z
    );
    const rungGeo = new THREE.BufferGeometry().setFromPoints([pA, pB]);
    scene.add(new THREE.Line(rungGeo, new THREE.LineBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.10
    })));
  }

  /* ✅ Organelles around the path (mitochondria / golgi / vesicles)
     - placed around the focal trajectory (NOT inside it)
     - always visible: fog disabled for their materials + subtle glow
  */
  const organelles = [];

  // helper: build a local frame from the curve (tangent + normal/binormal)
  function getFrame(t) {
    const tangent = mainCurve.getTangent(t).normalize();
    // pick a stable "up" that isn't parallel to tangent
    const up = Math.abs(tangent.y) > 0.9 ? new THREE.Vector3(1,0,0) : new THREE.Vector3(0,1,0);
    const normal = new THREE.Vector3().crossVectors(up, tangent).normalize();
    const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();
    return { tangent, normal, binormal };
  }

  function makeGlowSprite(colorLike) {
    const col = (colorLike && colorLike.isColor) ? colorLike : new THREE.Color(colorLike);
    const r = Math.round(col.r * 255);
    const g = Math.round(col.g * 255);
    const b = Math.round(col.b * 255);

    const c = document.createElement("canvas");
    c.width = 256; c.height = 256;
    const ctx = c.getContext("2d");

    const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 120);
    grad.addColorStop(0.00, `rgba(${r},${g},${b},0.38)`);
    grad.addColorStop(0.35, `rgba(${r},${g},${b},0.16)`);
    grad.addColorStop(1.00, `rgba(${r},${g},${b},0.00)`);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const spr = new THREE.Sprite(mat);
    spr.scale.set(4.8, 4.8, 1);
    return spr;
  }

  function createMitochondrion(mainColor, glowColor, seed) {
    const g = new THREE.Group();

    // Capsule/bean silhouette
    const outerGeo = new THREE.CapsuleGeometry(0.50, 1.20, 10, 22);
    outerGeo.rotateZ(Math.PI / 2);

    // gentle bend + micro bumps
    const pos = outerGeo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);

      v.y += Math.sin((v.x + seed) * 1.05) * 0.06;

      const n =
        Math.sin((v.x + seed) * 3.0) * 0.014 +
        Math.sin((v.y - seed) * 2.7) * 0.011 +
        Math.sin((v.z + seed * 0.7) * 2.9) * 0.011;

      v.multiplyScalar(1 + n);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    outerGeo.computeVertexNormals();

    // Outer membrane (less glassy, more microscopy-like)
    const outerMat = new THREE.MeshStandardMaterial({
      color: mainColor,
      roughness: 0.55,
      metalness: 0.0,
      transparent: true,
      opacity: 0.62,
      emissive: new THREE.Color(glowColor),
      emissiveIntensity: 0.04,
      depthWrite: false,
      fog: false
    });
    const outer = new THREE.Mesh(outerGeo, outerMat);
    g.add(outer);

    // Inner membrane shell (double membrane feel)
    const innerMat = new THREE.MeshStandardMaterial({
      color: glowColor,
      roughness: 0.75,
      metalness: 0.0,
      transparent: true,
      opacity: 0.16,
      emissive: new THREE.Color(glowColor),
      emissiveIntensity: 0.02,
      depthWrite: false,
      fog: false
    });
    const inner = new THREE.Mesh(outerGeo.clone(), innerMat);
    inner.scale.setScalar(0.90);
    g.add(inner);

    // Edge highlight ring to suggest membrane rim
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.52, 0.020, 10, 64),
      new THREE.MeshBasicMaterial({
        color: glowColor,
        transparent: true,
        opacity: 0.22,
        depthWrite: false
      })
    );
    rim.rotation.y = Math.PI / 2;
    rim.scale.set(1.8, 1.1, 1.0);
    g.add(rim);

    // Cristae ribbons (internal folds)
    const cristae = new THREE.Group();
    const ribbonMat = new THREE.MeshStandardMaterial({
      color: glowColor,
      roughness: 0.65,
      metalness: 0.0,
      transparent: true,
      opacity: 0.58,
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: false
    });

    for (let k = 0; k < 7; k++) {
      const geo = new THREE.PlaneGeometry(1.45, 0.20, 18, 2);
      const p = geo.attributes.position;
      const vv = new THREE.Vector3();

      for (let i = 0; i < p.count; i++) {
        vv.fromBufferAttribute(p, i);
        vv.y += Math.sin(vv.x * 3.0 + k * 0.85 + seed) * 0.065;
        vv.z += Math.sin(vv.x * 1.25 + seed) * 0.028;
        p.setXYZ(i, vv.x, vv.y, vv.z);
      }
      geo.computeVertexNormals();

      const rib = new THREE.Mesh(geo, ribbonMat);
      rib.position.y = (k - 3) * 0.10;
      rib.rotation.y = (k % 2 === 0 ? 0.34 : -0.34);
      rib.scale.setScalar(0.72);
      cristae.add(rib);
    }
    g.add(cristae);

    // Very subtle glow (keep shape readable)
    const glow = makeGlowSprite(new THREE.Color(glowColor));
    glow.scale.set(2.1, 2.1, 1);
    glow.material.opacity = 0.16;
    g.add(glow);

    g.userData = { type:"mito", outer, inner, rim, cristae, seed, baseY:0 };
    return g;
  }

  function createGolgi(mainColor, glowColor, seed) {
    const g = new THREE.Group();

    const mat = new THREE.MeshStandardMaterial({
      color: mainColor,
      emissive: new THREE.Color(glowColor),
      emissiveIntensity: 0.04,
      roughness: 0.78,
      metalness: 0.0,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: false
    });

    // stacked curved sheets (clear Golgi identity)
    const stackCount = 9;
    for (let i = 0; i < stackCount; i++) {
      const geo = new THREE.PlaneGeometry(1.85 - i*0.10, 0.20, 28, 2);
      const p = geo.attributes.position;
      const v = new THREE.Vector3();

      for (let j = 0; j < p.count; j++) {
        v.fromBufferAttribute(p, j);
        v.z += Math.sin((v.x / 2.0) * Math.PI) * 0.30;     // arc
        v.y += Math.sin(v.x * 4.2 + seed + i*0.55) * 0.018; // ripple
        p.setXYZ(j, v.x, v.y, v.z);
      }
      geo.computeVertexNormals();

      const slab = new THREE.Mesh(geo, mat);
      slab.position.y = (i - (stackCount-1)/2) * 0.095;
      slab.rotation.y = Math.sin(seed*0.45 + i*0.22) * 0.20;
      slab.rotation.x = 0.10;
      g.add(slab);
    }

    // small budding vesicles
    const vesMat = new THREE.MeshStandardMaterial({
      color: mainColor,
      emissive: new THREE.Color(glowColor),
      emissiveIntensity: 0.05,
      transparent: true,
      opacity: 0.84,
      roughness: 0.78,
      metalness: 0.0,
      depthWrite: false,
      fog: false
    });
    for (let i = 0; i < 12; i++) {
      const r = 0.05 + Math.random()*0.045;
      const ves = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 14), vesMat);
      ves.position.set(0.85 + Math.random()*0.45, (Math.random()-0.5)*0.55, (Math.random()-0.5)*0.55);
      g.add(ves);
    }

    const glow = makeGlowSprite(new THREE.Color(glowColor));
    glow.scale.set(1.9, 1.9, 1);
    glow.material.opacity = 0.10;
    g.add(glow);

    g.userData = { type:"golgi", seed, baseY:0 };
    return g;
  }

  function createVesicleCloud(mainColor, glowColor, seed) {
    const g = new THREE.Group();

    const mat = new THREE.MeshStandardMaterial({
      color: mainColor,
      emissive: new THREE.Color(glowColor),
      emissiveIntensity: 0.04,
      roughness: 0.82,
      transparent: true,
      opacity: 0.88,
      metalness: 0.0,
      depthWrite: false,
      fog: false
    });

    const count = 40;
    for (let i = 0; i < count; i++) {
      const r = 0.035 + Math.random()*0.05;
      const s = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 14), mat);
      s.position.set(
        (Math.random()-0.5)*1.9,
        (Math.random()-0.5)*1.5,
        (Math.random()-0.5)*1.9
      );
      g.add(s);
    }

    const glow = makeGlowSprite(new THREE.Color(glowColor));
    glow.scale.set(1.6, 1.6, 1);
    glow.material.opacity = 0.07;
    g.add(glow);

    g.userData = { type:"ves", seed, baseY:0 };
    return g;
  }

  function clearOrganelles() {
    organelles.forEach(o => scene.remove(o));
    organelles.length = 0;
  }

  function placeOrganelles() {
    clearOrganelles();

    const totalZ = (N - 1) * SPACING;
    const safety = 1.35; // keep outside the tube/helix zone
    const nearPerMilestone = 2;

    // Put organelles around milestones (near the path, but offset outward)
    for (let i = 0; i < N; i++) {
      const t = i / Math.max(1, N - 1);
      const base = mainCurve.getPoint(t);
      const fr = getFrame(t);

      for (let k = 0; k < nearPerMilestone; k++) {
        const typePick = (i + k) % 3; // 0 mito, 1 golgi, 2 vesicles
        const useOrange = ((i * 7 + k) % 5 === 0);
        const colName = useOrange ? "orange" : "teal";
        const pal = PAL[colName];
        const seed = i * 1.33 + k * 0.77 + 3.1;

        let obj;
        if (typePick === 0) obj = createMitochondrion(pal.c, pal.hi, seed);
        else if (typePick === 1) obj = createGolgi(pal.c, pal.hi, seed);
        else obj = createVesicleCloud(pal.c, pal.hi, seed);

        // offset around the path using normal/binormal
        const ang = (k * 2.3 + i * 0.9) % (Math.PI * 2);
        const radius = safety + 1.5 + (typePick === 0 ? 0.6 : 0.0) + Math.random()*1.4;

        const off = fr.normal.clone().multiplyScalar(Math.cos(ang) * radius)
          .add(fr.binormal.clone().multiplyScalar(Math.sin(ang) * radius));

        obj.position.copy(base).add(off);

        // slight z jitter (still around trajectory)
        obj.position.z += (Math.random() - 0.5) * 1.6;

        // scale by type
        const s = (typePick === 0) ? (0.66 + Math.random()*0.16)
                : (typePick === 1) ? (0.58 + Math.random()*0.14)
                : (0.54 + Math.random()*0.12);
        obj.scale.setScalar(s);

        // orient roughly along tangent
        const look = base.clone().add(fr.tangent);
        obj.lookAt(look);

        obj.userData.baseY = obj.position.y;
        scene.add(obj);
        organelles.push(obj);
      }
    }

    // Add some extra distant “background organelles”
    const extra = 10;
    for (let i = 0; i < extra; i++) {
      const t = Math.random();
      const base = mainCurve.getPoint(t);
      const fr = getFrame(t);

      const colName = (i % 3 === 0) ? "orange" : "teal";
      const pal = PAL[colName];
      const seed = 40 + i * 1.17;

      const typePick = i % 3;
      const obj = (typePick === 0)
        ? createMitochondrion(pal.c, pal.hi, seed)
        : (typePick === 1)
          ? createGolgi(pal.c, pal.hi, seed)
          : createVesicleCloud(pal.c, pal.hi, seed);

      const ang = Math.random() * Math.PI * 2;
      const radius = 5.0 + Math.random()*8.0;
      const off = fr.normal.clone().multiplyScalar(Math.cos(ang) * radius)
        .add(fr.binormal.clone().multiplyScalar(Math.sin(ang) * radius));

      obj.position.copy(base).add(off);
      obj.position.z += (Math.random() - 0.5) * 5.0;

      const s = 0.75 + Math.random()*0.8;
      obj.scale.setScalar(s);

      obj.userData.baseY = obj.position.y;
      scene.add(obj);
      organelles.push(obj);
    }
  }

  placeOrganelles();
  /* Nodes (milestones) */
  const nodeGroup = new THREE.Group();
  scene.add(nodeGroup);
  const nodes = [];

  const outerRingG = new THREE.TorusGeometry(0.68, 0.024, 12, 64);
  const innerRingG = new THREE.TorusGeometry(0.44, 0.018, 10, 56);
  const nucleusG   = new THREE.SphereGeometry(0.20, 20, 20);
  const chromatinG = new THREE.SphereGeometry(0.04, 8, 8);
  const spikeLen   = 0.35;

  function rRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function makeLabel(title, colorHex) {
    const c = document.createElement("canvas");
    c.width = 520; c.height = 118;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);

    ctx.fillStyle = "rgba(9,20,32,.80)";
    rRect(ctx, 12, 18, 496, 82, 42);
    ctx.fill();

    ctx.strokeStyle = colorHex + "66";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = colorHex;
    ctx.beginPath(); ctx.arc(52, 59, 8, 0, Math.PI * 2); ctx.fill();

    const g = ctx.createRadialGradient(52, 59, 0, 52, 59, 22);
    g.addColorStop(0, colorHex + "44"); g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(52, 59, 22, 0, Math.PI * 2); ctx.fill();

    ctx.font = "600 28px 'Inter', system-ui, sans-serif";
    ctx.fillStyle = "rgba(238,247,255,.94)";
    ctx.textBaseline = "middle";
    ctx.fillText(title.length > 24 ? title.slice(0, 24) + "…" : title, 74, 60);

    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 1, depthWrite: false });
    const spr = new THREE.Sprite(mat);
    spr.scale.set(3.05, 0.72, 1);
    return spr;
  }

  for (let i = 0; i < N; i++) {
    const g   = new THREE.Group();
    const col = PAL[MS[i].col] || PAL.teal;
    g.position.copy(pathPts[i]);

    const outerMat = new THREE.MeshStandardMaterial({
      color: col.c, emissive: col.c, emissiveIntensity: 0.15,
      roughness: 0.3, metalness: 0.2,
      transparent: true, opacity: 0.65, side: THREE.DoubleSide
    });
    const outerRing = new THREE.Mesh(outerRingG, outerMat);
    outerRing.rotation.x = Math.PI / 2;
    g.add(outerRing);

    const innerMat = new THREE.MeshStandardMaterial({
      color: col.c, emissive: col.c, emissiveIntensity: 0.25,
      roughness: 0.2, metalness: 0.3,
      transparent: true, opacity: 0.80, side: THREE.DoubleSide
    });
    const innerRing = new THREE.Mesh(innerRingG, innerMat);
    innerRing.rotation.x = Math.PI / 2;
    g.add(innerRing);

    const nucMat = new THREE.MeshStandardMaterial({
      color: col.hi, emissive: col.hi, emissiveIntensity: 0.40,
      roughness: 0.12, metalness: 0.55,
      transparent: true, opacity: 0.90
    });
    const nucleus = new THREE.Mesh(nucleusG, nucMat);
    g.add(nucleus);

    const chromGroup = new THREE.Group();
    const chromCount = 5;
    const chromMats  = [];
    for (let k = 0; k < chromCount; k++) {
      const angle = (k / chromCount) * Math.PI * 2;
      const cm = new THREE.MeshBasicMaterial({ color: col.hi, transparent: true, opacity: 0.55 });
      const cs = new THREE.Mesh(chromatinG, cm);
      cs.position.set(Math.cos(angle) * 0.30, Math.sin(angle) * 0.30, 0);
      chromGroup.add(cs);
      chromMats.push(cm);
    }
    g.add(chromGroup);

    const ciliaGroup = new THREE.Group();
    const ciliaCount = 12;
    for (let k = 0; k < ciliaCount; k++) {
      const angle = (k / ciliaCount) * Math.PI * 2;
      const cGeo  = new THREE.CylinderGeometry(0.006, 0.003, spikeLen, 4);
      const cMat  = new THREE.MeshBasicMaterial({ color: col.c, transparent: true, opacity: 0 });
      const cMesh = new THREE.Mesh(cGeo, cMat);
      const r = 0.72;
      cMesh.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
      cMesh.rotation.z = -angle + Math.PI / 2;
      cMesh.rotation.y = angle;
      ciliaGroup.add(cMesh);
    }
    g.add(ciliaGroup);

    const label = makeLabel(MS[i].title, col.hex);
    label.position.set(0.4, 1.30, 0);
    g.add(label);

    const stemGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.22, 0),
      new THREE.Vector3(0.15, 1.18, 0)
    ]);
    const stemLine = new THREE.Line(stemGeo, new THREE.LineBasicMaterial({
      color: col.c, transparent: true, opacity: 0.18
    }));
    g.add(stemLine);

    g.userData = {
      index: i,
      outerRing, innerRing, nucleus, chromGroup, ciliaGroup, label, stemLine,
      outerMat, innerMat, nucMat, chromMats,
      ciliaMeshes: [...ciliaGroup.children],
      labelMat: label.material,
      stemMat: stemLine.material,
      o: 0.2, oTarget: 0.2
    };
    nodeGroup.add(g);
    nodes.push(g);
  }

  /* Raycaster click */
  const ray   = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  canvas.addEventListener("click", e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width ) * 2 - 1;
    mouse.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    ray.setFromCamera(mouse, camera);
    const hits = ray.intersectObjects(nodeGroup.children, true);
    if (!hits.length) return;
    let obj = hits[0].object;
    while (obj.parent && obj.parent !== nodeGroup) obj = obj.parent;
    const idx = obj?.userData?.index ?? obj?.parent?.userData?.index;
    if (typeof idx === "number" && cards[idx]) scrollEl.scrollTop = cards[idx].offsetTop;
  });

  /* Resize */
function resize() {
    if (!canvas.parentElement) return;
    
    // Wir messen den Container, NICHT das Canvas selbst!
    const r = canvas.parentElement.getBoundingClientRect(); 
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();

  /* Scroll mechanics */
  let activeIdx = 0;
  let targetZ   = pathPts[0].z + 5.5;
  let camZ      = targetZ;

  function getCardH() { return panelEl.clientHeight || 600; }
  function activeFromScroll() {
    const h = getCardH();
    return Math.min(N - 1, Math.round(scrollEl.scrollTop / h));
  }
  function floatPos() {
    const h = getCardH();
    return Math.min(N - 1, scrollEl.scrollTop / h);
  }

  function setActive(idx) {
    activeIdx = Math.max(0, Math.min(idx, N - 1));
    cards.forEach((c, j) => {
      c.classList.toggle("isActive",   j === activeIdx);
      c.classList.toggle("isInactive", j !== activeIdx);
    });

    nodes.forEach((n, i) => {
      const d = i - activeIdx;
      if      (d <  0) n.userData.oTarget = 0.015;
      else if (d === 0) n.userData.oTarget = 1.0;
      else if (d === 1) n.userData.oTarget = 0.40;
      else              n.userData.oTarget = 0.22;
    });
  }

  function onScroll() {
    const idx = activeFromScroll();
    if (idx !== activeIdx) setActive(idx);

    const pos = floatPos();
    if (progFill) progFill.style.width = `${(pos / Math.max(1, N - 1)) * 100}%`;

    const i0 = Math.floor(pos), i1 = Math.min(N - 1, i0 + 1);
    const f  = pos - i0;
    targetZ = nodes[i0].position.z + (nodes[i1].position.z - nodes[i0].position.z) * f + 5.5;
  }

  scrollEl.addEventListener("scroll", onScroll, { passive: true });

  /* Animation */
  const clock = new THREE.Clock();
  const damp  = (cur, tgt, l, dt) => tgt + (cur - tgt) * Math.exp(-l * dt);

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, clock.getDelta());
    const t  = clock.getElapsedTime();

    camZ += (targetZ - camZ) * 0.06;

    const pos = floatPos();
    const i0  = Math.floor(pos), i1 = Math.min(N - 1, i0 + 1);
    const f   = pos - i0;
    const p0  = nodes[i0].position, p1 = nodes[i1].position;
    const px  = p0.x + (p1.x - p0.x) * f;
    const py  = p0.y + (p1.y - p0.y) * f;

    camera.position.z = camZ;
    camera.position.x = damp(camera.position.x, px * 0.48, 8, dt);
    camera.position.y = damp(camera.position.y, py * 0.26 + 2.7 + Math.sin(t * 0.32) * 0.07, 8, dt);
    camera.lookAt(px * 0.26, py * 0.18, (p0.z + (p1.z - p0.z) * f) - 2.4);

    const bioPos = mainCurve.getPoint(Math.max(0, Math.min(1, pos / Math.max(1, N - 1))));
    bioT.position.lerp(bioPos, 0.05);

    // animate organelles (subtle drift, breathing, rotation)
    organelles.forEach((o, i) => {
      const seed = o.userData?.seed ?? (i * 0.7);
      o.rotation.y += 0.0012;
      o.rotation.x += 0.0009;

      // float
      o.position.y = o.userData.baseY + Math.sin(t * 0.55 + seed) * 0.22;

      // type-specific micro animation
      if (o.userData?.type === "mito") {
        // tiny cristae ripple
        if (o.userData.cristae) {
          o.userData.cristae.children.forEach((rib, k) => {
            rib.rotation.z = Math.sin(t*0.9 + seed + k*0.7) * 0.10;
          });
        }

        if (o.userData.body) o.userData.body.rotation.z += 0.002;
        const b = 1 + Math.sin(t * 0.9 + seed) * 0.03;
        if (o.userData.body) o.userData.body.scale.setScalar(b);
        if (o.userData.shell) o.userData.shell.scale.setScalar(1.03 * b);
      } else if (o.userData?.type === "golgi") {
        o.rotation.z += 0.0008;
      } else {
        // vesicles: gentle expansion
        const b = 1 + Math.sin(t * 1.1 + seed) * 0.02;
        o.scale.setScalar(o.scale.x * 0 + o.scale.x); // keep base (no-op)
        o.children.forEach(ch => { if (ch.isMesh) ch.scale.setScalar(b); });
      }
    });

    nodes.forEach((n, i) => {
      const ud = n.userData;
      ud.o = damp(ud.o, ud.oTarget, 9, dt);
      const o = ud.o;

      ud.outerMat.opacity = o * 0.68;
      ud.innerMat.opacity = o * 0.82;
      ud.nucMat.opacity   = o * 0.90;
      ud.chromMats.forEach(m => { m.opacity = o * 0.55; });
      ud.labelMat.opacity = i === activeIdx ? Math.min(1, o) : o * 0.45;
      ud.stemMat.opacity  = o * 0.18;

      if (i === activeIdx) {
        ud.outerRing.rotation.z += 0.010;
        ud.innerRing.rotation.z -= 0.018;
        const sc = 1.0 + Math.sin(t * 2.2) * 0.08;
        ud.nucleus.scale.setScalar(sc);
        ud.nucMat.emissiveIntensity = 0.50 + Math.sin(t * 2.2) * 0.18;
        ud.chromGroup.rotation.z += 0.022;
        ud.chromGroup.rotation.y += 0.010;

        ud.ciliaMeshes.forEach((cm, k) => {
          cm.material.opacity = damp(cm.material.opacity, 0.55, 6, dt);
          cm.scale.y = 1.0 + Math.sin(t * 2.8 + k * 0.5) * 0.22;
        });

        const rs = 1.0 + Math.sin(t * 1.6) * 0.04;
        ud.outerRing.scale.setScalar(rs);
      } else {
        ud.outerRing.rotation.z += 0.003;
        ud.innerRing.rotation.z -= 0.005;
        ud.chromGroup.rotation.z += 0.006;
        ud.nucleus.scale.setScalar(1);
        ud.nucMat.emissiveIntensity = 0.22;
        ud.outerRing.scale.setScalar(1);
        ud.ciliaMeshes.forEach(cm => {
          cm.material.opacity = damp(cm.material.opacity, 0, 8, dt);
        });
      }
    });

    renderer.render(scene, camera); 
  }

  

  setActive(0);
  onScroll();
  animate();
  } catch (e) {
    console.error("Roadmap init failed:", e);
    // show a small fallback hint in the panel if canvas init fails
    const panel = document.querySelector("#roadPanel");
    if (panel && !panel.querySelector(".roadError")) {
      const div = document.createElement("div");
      div.className = "roadError";
      div.style.padding = "18px";
      div.style.color = "rgba(238,247,255,.74)";
      div.style.fontFamily = "DM Mono, monospace";
      div.style.fontSize = ".85rem";
      div.style.borderTop = "1px solid rgba(255,255,255,.08)";
      div.textContent = "Roadmap could not start (check console).";
      panel.appendChild(div);
    }
  }
}

/* =========================
   PROJECT MODAL
========================= */

function initProjects(){

  const cards = qsa(".projCard");

  // ── Build modal DOM once ──
  const modal = document.createElement("div");
  modal.className = "projModal";
  modal.setAttribute("aria-modal","true");
  modal.setAttribute("role","dialog");
  modal.innerHTML = `
    <div class="projModalPanel">
      <button class="projModalClose" aria-label="Close">✕</button>
      <div class="projModalBar"></div>
      <div class="projModalInner">
        <div class="projModalMeta">
          <span class="projModalN"></span>
          <span class="projModalTag"></span>
        </div>
        <h2 class="projModalTitle"></h2>
        <div class="projModalBody"></div>
        <div class="projModalFooter"></div>
        <div class="projModalImages"></div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const panel      = modal.querySelector(".projModalPanel");
  const bar        = modal.querySelector(".projModalBar");
  const closeBtn   = modal.querySelector(".projModalClose");
  const elN        = modal.querySelector(".projModalN");
  const elTag      = modal.querySelector(".projModalTag");
  const elTitle    = modal.querySelector(".projModalTitle");
  const elBody     = modal.querySelector(".projModalBody");
  const elFooter   = modal.querySelector(".projModalFooter");
  const elImages   = modal.querySelector(".projModalImages");

  function openModal(card){
    // colour theme
    modal.classList.remove("modalTeal","modalOrange","modalMuted");
    if(card.classList.contains("projTeal"))   modal.classList.add("modalTeal");
    else if(card.classList.contains("projOrange")) modal.classList.add("modalOrange");
    else modal.classList.add("modalMuted");

    // populate from card
    elN.textContent    = card.querySelector(".projN")?.textContent   ?? "";
    elTag.textContent  = card.querySelector(".projTag")?.textContent  ?? "";
    elTitle.innerHTML  = card.querySelector("h3")?.innerHTML          ?? "";

    // paragraphs
    elBody.innerHTML = [...card.querySelectorAll(".projScroll > p")]
      .map(p => p.outerHTML).join("");

    // button
    const btn = card.querySelector(".projBtn");
    elFooter.innerHTML = btn
      ? `<a class="projModalBtn" href="${btn.getAttribute("href")}">${btn.textContent}</a>`
      : "";

    // images — clone all figures (modal shows all three)
    elImages.innerHTML = "";
    card.querySelectorAll(".projFigure").forEach(fig => {
      const clone = fig.cloneNode(true);
      // remap classes to modal variants
      const slot = clone.querySelector(".projImgSlot");
      if(slot) slot.className = "projModalImgSlot";
      const cap  = clone.querySelector(".projCaption");
      if(cap)  cap.className  = "projModalCaption";
      clone.className = "projModalFigure";
      elImages.appendChild(clone);
    });

    panel.scrollTop = 0;
    modal.classList.add("modalOpen");
    document.body.classList.add("noScroll");
  }

  function closeModal(){
    modal.classList.remove("modalOpen");
    document.body.classList.remove("noScroll");
  }

  cards.forEach(card => {
    card.addEventListener("click", e => {
      if (e.target.closest("a, button")) return;
      openModal(card);
    });
  });

  closeBtn.addEventListener("click", closeModal);

  // click backdrop (outside panel) to close
  modal.addEventListener("click", e => {
    if(!panel.contains(e.target)) closeModal();
  });

  document.addEventListener("keydown", e => {
    if(e.key === "Escape") closeModal();
  });

}

/* =========================
   SAFE BOOTSTRAP
========================= */

function safeInit(name, fn) {
  try {
    fn();
    console.log(`${name} init`);
  } catch (e) {
    console.error(`${name} failed:`, e);
  }
}

function initApp() {
  setCurrentYear();

  safeInit("Theme", initTheme);
  safeInit("Tilt", initTilt);
  safeInit("Gallery", initGallery);
  safeInit("Roadmap", initRoadmap);
  safeInit("Projects", initProjects);
}

initApp();

