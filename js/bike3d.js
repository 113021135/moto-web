// Interactive 3D KESTREL K6 sport bike for the hero.
// Loads the Sketchfab model from assets/models/ when it is there (see data.js > model);
// otherwise uses a bike built from primitives in code. Three modes:
//   Showroom: drag to spin, hold to rev, click for a wheelie, change the paint.
//   Explore:  numbered dots on the parts, info card, exploded view, x-ray.
//   Ride:     W/A/S/D or arrows (or the touch pad) to ride around the grid.
(async () => {
  'use strict';

  const D = window.SITE;
  const stage = document.getElementById('bike-stage');
  const hero = document.getElementById('ride');
  const $ = (id) => document.getElementById(id);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = !!window.gsap;

  let THREE, OrbitControls, GLTFLoader, EffectComposer, RenderPass, UnrealBloomPass, OutputPass, RoomEnvironment;
  try {
    const probe = document.createElement('canvas');
    if (!probe.getContext('webgl2') && !probe.getContext('webgl')) throw new Error('WebGL unavailable');
    [THREE, { OrbitControls }, { GLTFLoader }, { EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }, { RoomEnvironment }] =
      await Promise.all([
        import('three'),
        import('three/addons/controls/OrbitControls.js'),
        import('three/addons/loaders/GLTFLoader.js'),
        import('three/addons/postprocessing/EffectComposer.js'),
        import('three/addons/postprocessing/RenderPass.js'),
        import('three/addons/postprocessing/UnrealBloomPass.js'),
        import('three/addons/postprocessing/OutputPass.js'),
        import('three/addons/environments/RoomEnvironment.js'),
      ]);
  } catch {
    // No WebGL or offline: show the drawn bike, hide everything that only drives the 3D one
    stage.classList.add('no-webgl');
    stage.innerHTML = window.bikeSVG ? window.bikeSVG() : '';
    ['hero-controls', 'panel-explore', 'panel-ride'].forEach((id) => { $(id).hidden = true; });
    document.querySelector('.modes-wrap').hidden = true;
    $('hero-sub').textContent = 'The 3D bike could not load in this browser, so here is the drawing.';
    return;
  }

  const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const INK = 0x0b0c0a;
  const ORANGE = 0xff6b1a; // default paint
  const CYAN = 0x2fd4ff; // night grid and part glow
  const PINK = 0xff4f9a; // rim light

  // ---------- Renderer, scene, camera ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  stage.append(renderer.domElement);

  // Two looks: showroom/explore = daylight workshop bay, ride = night run. frame() blends between them.
  // Day colours are set brighter than the CSS concrete (#e9e5dc) so they land on it after ACES tone mapping.
  const linear = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.LinearSRGBColorSpace);
  const PALETTE = {
    day: { bg: linear(1.21, 1.037, 0.753), sky: new THREE.Color(0xfff1dc), floor: new THREE.Color(0x9a9384), hemi: 0.55, lamp: 0.6, smoke: new THREE.Color(0x8a8b84) },
    night: { bg: new THREE.Color(INK), sky: new THREE.Color(0xd8dcf0), floor: new THREE.Color(INK), hemi: 0.6, lamp: 0, smoke: new THREE.Color(0xb0a8d8) },
  };
  let night = 0; // 0 = day bay, 1 = night

  const scene = new THREE.Scene();
  scene.background = PALETTE.day.bg.clone();
  scene.fog = new THREE.Fog(PALETTE.day.bg, 9, 20);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  pmrem.dispose();

  const HOME_TARGET = V3(0, 0.9, 0);
  const HOME_DIR = V3(0.62, 0.24, 0.75).normalize();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80);
  camera.position.copy(HOME_TARGET).addScaledVector(HOME_DIR, 9.5);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(HOME_TARGET);
  controls.enableDamping = true;
  controls.enableZoom = false; // keep the mouse wheel for page scrolling
  controls.enablePan = false;
  controls.minPolarAngle = 0.5;
  controls.maxPolarAngle = 1.5;
  controls.autoRotate = !reduceMotion;
  controls.autoRotateSpeed = 0.6;
  renderer.domElement.style.touchAction = 'pan-y'; // vertical swipes still scroll the page on phones
  let resumeSpin;
  controls.addEventListener('start', () => { controls.autoRotate = false; clearTimeout(resumeSpin); });
  controls.addEventListener('end', () => {
    if (!reduceMotion && mode === 'showroom') resumeSpin = setTimeout(() => { controls.autoRotate = true; }, 3000);
  });

  const hemi = new THREE.HemisphereLight(PALETTE.day.sky, PALETTE.day.floor, PALETTE.day.hemi);
  scene.add(hemi);
  const lamp = new THREE.DirectionalLight(0xfff4e2, PALETTE.day.lamp); // lift lamp straight above the bay
  lamp.position.set(0.3, 8, 0.6);
  scene.add(lamp);
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(4, 6, 3);
  scene.add(key);
  const rimLight = new THREE.PointLight(PINK, 30, 12, 2);
  rimLight.position.set(-3, 2.5, -3);
  scene.add(rimLight);

  // ---------- Hierarchy: rig (heading) > lean (roll) > pivot (wheelie) > bike ----------
  const rig = new THREE.Group();
  const lean = new THREE.Group();
  const pivot = new THREE.Group(); // wheelies pivot on the rear tyre's contact point
  const bike = new THREE.Group();
  pivot.position.x = -1.42;
  bike.position.x = 1.42;
  rig.add(lean);
  lean.add(pivot);
  pivot.add(bike);
  scene.add(rig);

  // ---------- Materials (cloned per part later, so a part can glow on its own) ----------
  const M = {
    paint: new THREE.MeshPhysicalMaterial({ color: ORANGE, metalness: 0.3, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06 }),
    gloss: new THREE.MeshPhysicalMaterial({ color: 0x111214, metalness: 0.2, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 }),
    alu: new THREE.MeshStandardMaterial({ color: 0xa7adb3, metalness: 0.85, roughness: 0.3 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x24272a, metalness: 0.55, roughness: 0.45 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xd8dbd4, metalness: 1, roughness: 0.22, envMapIntensity: 0.6 }),
    ti: new THREE.MeshStandardMaterial({ color: 0x8d8f91, metalness: 1, roughness: 0.35, envMapIntensity: 0.6 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x0d0e0c, roughness: 0.92 }),
    seat: new THREE.MeshStandardMaterial({ color: 0x1a1c1d, roughness: 0.85 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xb08d3c, metalness: 0.8, roughness: 0.35 }),
    spring: new THREE.MeshStandardMaterial({ color: 0xd8b21c, metalness: 0.4, roughness: 0.4 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x1a2416, metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.6 }),
    // Colours above 1 so only the lights pass the bloom threshold
    head: new THREE.MeshBasicMaterial({ color: new THREE.Color(9, 9.5, 8) }),
    tail: new THREE.MeshBasicMaterial({ color: new THREE.Color(10, 0.4, 0.3) }),
    screen: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 1.3, 0.35) }),
  };
  const XRAY_SOURCES = new Set([M.paint, M.gloss, M.seat, M.glass]);

  // ---------- Geometry helpers ----------
  const mesh = (geo, mat, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    return m;
  };
  const group = (...children) => {
    const g = new THREE.Group();
    if (children.length) g.add(...children);
    return g;
  };
  // Narrow the nose and tail in plan view, like real bodywork
  const bodyTaper = (x) => (x > 1.1 ? 1 - 0.58 * Math.min(1, (x - 1.1) / 0.95) : x < -0.9 ? 1 - 0.62 * Math.min(1, (-0.9 - x) / 0.95) : 1);
  // A side profile (x, y points) pushed out to a width, centred on z = 0
  function extrude(pts, depth, mat, { bevel = 0.04, smooth = false, taper = false } = {}) {
    const v = pts.map(([x, y]) => new THREE.Vector2(x, y));
    const shape = new THREE.Shape();
    shape.moveTo(v[0].x, v[0].y);
    if (smooth) shape.splineThru([...v.slice(1), v[0]]);
    else v.slice(1).forEach((p) => shape.lineTo(p.x, p.y));
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 10 });
    geo.translate(0, 0, -depth / 2);
    if (taper) {
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) * bodyTaper(p.getX(i)));
      geo.computeVertexNormals();
    }
    return new THREE.Mesh(geo, mat);
  }
  // A round tube from a to b (optionally tapered)
  function strut(a, b, r, mat, rEnd = r) {
    const s = V3(...a);
    const e = V3(...b);
    const m = mesh(new THREE.CylinderGeometry(rEnd, r, s.distanceTo(e), 18), mat);
    m.position.copy(s).lerp(e, 0.5);
    m.quaternion.setFromUnitVectors(V3(0, 1, 0), e.sub(s).normalize());
    return m;
  }
  const tube = (points, r, mat) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => V3(...p))), 64, r, 10), mat);

  // ---------- Livery decal drawn on a canvas ----------
  const decalCanvas = document.createElement('canvas');
  decalCanvas.width = 1024;
  decalCanvas.height = 512;
  const decalTex = new THREE.CanvasTexture(decalCanvas);
  decalTex.colorSpace = THREE.SRGBColorSpace;
  decalTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  function drawDecal() {
    const g = decalCanvas.getContext('2d');
    g.clearRect(0, 0, 1024, 512);
    const slab = (color, pts) => {
      g.fillStyle = color;
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.fill();
    };
    slab('#0b0c0a', [[0, 380], [1024, 250], [1024, 512], [0, 512]]); // black lower sweep
    slab('#f1f4ea', [[0, 350], [1024, 222], [1024, 246], [0, 374]]); // white pinstripe
    g.font = 'italic 900 150px Archivo, "Arial Black", sans-serif';
    g.lineWidth = 14;
    g.strokeStyle = '#0b0c0a';
    g.fillStyle = '#f1f4ea';
    g.strokeText('K6', 60, 230);
    g.fillText('K6', 60, 230);
    g.font = 'italic 800 64px Archivo, "Arial Black", sans-serif';
    g.fillStyle = '#0b0c0a';
    g.fillText('KESTREL', 70, 95);
    decalTex.needsUpdate = true;
  }
  drawDecal();
  document.fonts?.ready.then(drawDecal);
  const decalMat = new THREE.MeshBasicMaterial({ map: decalTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  XRAY_SOURCES.add(decalMat);

  // ---------- Parts registry: explode offsets, per-part materials, raycast lookup ----------
  const partInfo = new Map(D.parts.map((p, i) => [p.id, { ...p, n: i + 1 }]));
  let pieces = []; // { obj, base, off (bike space), local (parent space) }
  let partMats = new Map(); // part id -> Set of its own material clones
  let xrayMats = new Set();
  let paintMats = new Set();

  function register(obj, partId, offset) {
    const def = partInfo.get(partId);
    const cache = new Map();
    const swap = (mat) => {
      if (!cache.has(mat)) {
        const c = mat.clone();
        cache.set(mat, c);
        if (!partMats.has(partId)) partMats.set(partId, new Set());
        partMats.get(partId).add(c);
        if (XRAY_SOURCES.has(mat) || mat.userData.xray) xrayMats.add(c);
        if (mat === M.paint) paintMats.add(c);
      }
      return cache.get(mat);
    };
    obj.traverse((o) => {
      o.userData.part = partId;
      if (o.isMesh) o.material = Array.isArray(o.material) ? o.material.map(swap) : swap(o.material);
    });
    pieces.push({ obj, base: obj.position.clone(), off: V3(...(offset || def.explode)), local: V3() });
  }

  // Explode offsets are written in bike space; convert each to its parent's space once
  function measurePieces() {
    scene.updateMatrixWorld(true);
    for (const p of pieces) {
      const w0 = p.obj.getWorldPosition(V3());
      const w1 = bike.localToWorld(bike.worldToLocal(w0.clone()).add(p.off));
      p.local.copy(p.obj.parent.worldToLocal(w1)).sub(p.obj.parent.worldToLocal(w0.clone()));
    }
  }
  const bikeX = (o) => bike.worldToLocal(o.getWorldPosition(V3())).x;

  // ---------- The hand-built sport bike ----------
  const FRONT = 1.45;
  const REAR = -1.42;
  const AXLE_Y = 0.6;
  const spinners = [];

  function wheel(x, wide) {
    const spin = group();
    const tyre = mesh(new THREE.TorusGeometry(0.49, 0.11, 22, 64), M.rubber);
    tyre.scale.z = wide;
    spin.add(tyre, mesh(new THREE.TorusGeometry(0.38, 0.03, 10, 64), M.dark));
    for (const z of [-0.045, 0.045]) spin.add(mesh(new THREE.TorusGeometry(0.385, 0.01, 6, 64), M.paint, 0, 0, z)); // rim stripes
    for (let i = 0; i < 6; i++) {
      const spoke = mesh(new THREE.BoxGeometry(0.045, 0.32, 0.05), M.dark);
      const a = (i * Math.PI) / 3;
      spoke.position.set(Math.cos(a) * 0.21, Math.sin(a) * 0.21, 0);
      spoke.rotation.z = a - Math.PI / 2 + 0.25; // a little swept, like cast spokes
      spin.add(spoke);
    }
    const hub = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.24, 18), M.alu);
    hub.rotation.x = Math.PI / 2;
    spin.add(hub);
    spinners.push(spin);
    const g = group(spin);
    g.position.set(x, AXLE_Y, 0);
    return g;
  }

  function disc(x, z, r) {
    const d = group(mesh(new THREE.CylinderGeometry(r, r, 0.012, 48), M.chrome), mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, 0.016, 24), M.dark));
    d.rotation.x = Math.PI / 2;
    d.position.set(x, AXLE_Y, z);
    return d;
  }

  function buildProcedural() {
    const proc = group();
    const add = (obj, part, offset) => { proc.add(obj); register(obj, part, offset); };

    // Wheels
    add(wheel(FRONT, 1.15), 'wheels', [1.4, 0, 0]);
    add(wheel(REAR, 1.45), 'wheels', [-1.3, 0, 0]);

    // Brakes: two front discs with calipers, one rear
    const caliper = (x, y, z, rot) => {
      const c = mesh(new THREE.BoxGeometry(0.17, 0.21, 0.07), M.gold, x, y, z);
      c.rotation.z = rot;
      return c;
    };
    add(group(disc(FRONT, 0.13, 0.3), disc(FRONT, -0.13, 0.3), caliper(FRONT - 0.2, AXLE_Y + 0.19, 0.17, 0.75), caliper(FRONT - 0.2, AXLE_Y + 0.19, -0.17, 0.75)), 'brakes', [1.4, 0, 0.7]);
    add(group(disc(REAR, -0.13, 0.21), caliper(REAR + 0.06, AXLE_Y - 0.2, -0.16, -0.3)), 'brakes', [-1.3, 0, -0.7]);

    // Front suspension: upside-down fork, triple clamps, fender
    const top = [1.12, 1.55];
    const at = (t) => [FRONT + (top[0] - FRONT) * t, AXLE_Y + (top[1] - AXLE_Y) * t];
    const fork = group();
    for (const z of [-0.17, 0.17]) {
      fork.add(strut([FRONT, AXLE_Y, z], [...at(0.45), z], 0.03, M.chrome));
      fork.add(strut([...at(0.38), z], [...top, z], 0.055, M.dark));
    }
    fork.add(mesh(new THREE.BoxGeometry(0.14, 0.05, 0.5), M.alu, ...at(0.8), 0), mesh(new THREE.BoxGeometry(0.14, 0.04, 0.48), M.alu, ...top, 0));
    const fender = mesh(new THREE.TorusGeometry(0.64, 0.04, 8, 28, Math.PI * 0.55), M.paint, FRONT, AXLE_Y, 0);
    fender.rotation.z = 0.7;
    fender.scale.z = 2.6;
    fork.add(fender);
    add(fork, 'front-suspension');

    // Frame: twin aluminium spars, steering head, subframe
    const frame = group();
    const spar = [[1.0, 1.36], [1.12, 1.5], [0.9, 1.52], [0.35, 1.32], [-0.2, 1.18], [-0.42, 1.0], [-0.42, 0.66], [-0.24, 0.62], [-0.22, 0.92], [0.3, 1.12], [0.88, 1.3]];
    for (const z of [-0.22, 0.22]) {
      const s = extrude(spar, 0.07, M.alu, { bevel: 0.02 });
      s.position.z = z;
      frame.add(s, strut([-0.3, 1.1, z * 0.7], [-1.3, 1.48, z * 0.45], 0.022, M.dark));
    }
    frame.add(strut([1.06, 1.35, 0], [1.16, 1.58, 0], 0.07, M.alu));
    add(frame, 'frame');

    // Engine: crankcase, forward-tilted cylinders, head, covers, radiator
    const block = mesh(new THREE.BoxGeometry(0.42, 0.5, 0.52), M.dark, 0.62, 0.92, 0);
    const head = mesh(new THREE.BoxGeometry(0.32, 0.16, 0.5), M.gloss, 0.8, 1.18, 0);
    const radiator = mesh(new THREE.BoxGeometry(0.09, 0.62, 0.6), M.dark, 1.0, 0.95, 0);
    block.rotation.z = -0.5;
    head.rotation.z = -0.5;
    radiator.rotation.z = -0.15;
    const engine = group(mesh(new THREE.BoxGeometry(0.95, 0.42, 0.5), M.dark, 0.25, 0.55, 0), block, head, radiator);
    for (const z of [-0.27, 0.27]) {
      const cover = mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.05, 32), M.alu, 0.12, 0.56, z);
      cover.rotation.x = Math.PI / 2;
      engine.add(cover);
    }
    add(engine, 'engine');

    // Exhaust: four headers into one, side silencer
    const exhaust = group();
    for (let k = 0; k < 4; k++) {
      const z = -0.18 + k * 0.12;
      exhaust.add(tube([[0.86, 1.0, z], [1.03, 0.7, z], [0.92, 0.3, z * 0.8], [0.45, 0.17, z * 0.5], [0, 0.2, z * 0.3], [-0.3, 0.33, 0.14]], 0.034, M.ti));
    }
    exhaust.add(strut([-0.32, 0.4, 0.3], [-1.05, 0.78, 0.3], 0.115, M.ti, 0.09), strut([-1.03, 0.77, 0.3], [-1.1, 0.8, 0.3], 0.092, M.gloss));
    add(exhaust, 'exhaust');

    // Rear suspension: swingarm, shock with spring, chain and sprockets
    const rearSus = group();
    for (const z of [-0.17, 0.17]) {
      const arm = extrude([[-0.4, 0.92], [-0.25, 0.86], [-0.3, 0.66], [REAR, 0.55], [REAR - 0.08, 0.6], [REAR, 0.68]], 0.06, M.alu, { bevel: 0.02 });
      arm.position.z = z;
      rearSus.add(arm);
    }
    const coil = [];
    for (let i = 0; i <= 140; i++) {
      const t = i / 140;
      const a = t * Math.PI * 2 * 7;
      coil.push([-0.48 + 0.1 * t + Math.cos(a) * 0.06, 0.55 + 0.45 * t, Math.sin(a) * 0.06]);
    }
    rearSus.add(tube(coil, 0.012, M.spring), strut([-0.48, 0.5, 0], [-0.38, 1.04, 0], 0.025, M.chrome));
    add(rearSus, 'rear-suspension');

    // Chain drive on the left side: front and rear sprockets (with teeth) and the chain loop
    const CZ = -0.25;
    const sprocket = (x, r) => {
      const s = group(mesh(new THREE.CylinderGeometry(r, r, 0.02, 30), M.alu), mesh(new THREE.TorusGeometry(r, 0.012, 6, Math.round(r * 160)), M.dark));
      s.children[0].rotation.x = Math.PI / 2;
      s.position.set(x, AXLE_Y, CZ);
      return s;
    };
    add(group(sprocket(-0.22, 0.07), sprocket(REAR, 0.16),
      strut([-0.22, 0.67, CZ], [REAR, 0.76, CZ], 0.016, M.dark), strut([-0.22, 0.53, CZ], [REAR, 0.44, CZ], 0.016, M.dark)), 'chain');

    // Bodywork: cowl with screen, lights and livery; tank; tail; seat; ram air intake
    const cowl = group(
      extrude([[0.92, 1.5], [1.2, 1.62], [1.5, 1.58], [1.82, 1.42], [2.02, 1.3], [1.95, 1.22], [1.5, 1.27], [1.08, 1.18], [0.86, 1.0], [0.8, 0.62],
        [0.66, 0.36], [0.15, 0.3], [0.22, 0.55], [0.5, 0.95], [0.7, 1.28]], 0.62, M.paint, { bevel: 0.05, smooth: true, taper: true }),
      extrude([[1.2, 1.6], [1.42, 1.84], [1.66, 1.6], [1.48, 1.56]], 0.36, M.glass, { bevel: 0.02, taper: true }),
    );
    for (const z of [-0.13, 0.13]) {
      const h = mesh(new THREE.BoxGeometry(0.2, 0.045, 0.07), M.head, 1.86, 1.34, z);
      h.rotation.set(0, z > 0 ? -0.25 : 0.25, -0.45);
      cowl.add(h);
    }
    for (const side of [1, -1]) {
      const d = mesh(new THREE.PlaneGeometry(0.95, 0.47), decalMat, 0.45, 0.82, 0.362 * side);
      if (side < 0) d.rotation.y = Math.PI;
      cowl.add(d);
    }
    add(cowl, 'fairing', [0.3, 1.0, 0]);
    add(extrude([[0.05, 1.28], [0.22, 1.55], [0.62, 1.62], [0.92, 1.5], [0.72, 1.25], [0.3, 1.2]], 0.66, M.paint, { bevel: 0.05, smooth: true }), 'fairing', [0, 1.35, 0]);
    add(group(
      extrude([[-0.12, 1.3], [-0.7, 1.38], [-1.35, 1.58], [-1.82, 1.72], [-1.84, 1.64], [-1.4, 1.44], [-0.75, 1.18], [-0.25, 1.08]], 0.46, M.paint, { bevel: 0.04, smooth: true, taper: true }),
      mesh(new THREE.BoxGeometry(0.04, 0.05, 0.2), M.tail, -1.83, 1.66, 0),
    ), 'fairing', [-0.4, 1.0, 0]);
    add(extrude([[-0.08, 1.33], [-0.72, 1.41], [-0.74, 1.49], [-0.06, 1.42]], 0.4, M.seat, { bevel: 0.04 }), 'fairing', [-0.3, 1.6, 0]);
    add(mesh(new THREE.BoxGeometry(0.12, 0.1, 0.16), M.gloss, 1.99, 1.25, 0), 'intake');

    // Cockpit: clip-ons, grips, mirrors, instrument panel
    const cockpit = group();
    for (const z of [-1, 1]) {
      cockpit.add(
        strut([1.1, 1.55, 0.14 * z], [1.0, 1.5, 0.36 * z], 0.022, M.dark),
        strut([1.0, 1.5, 0.36 * z], [0.97, 1.48, 0.46 * z], 0.03, M.rubber),
        strut([1.3, 1.6, 0.25 * z], [1.32, 1.7, 0.33 * z], 0.012, M.dark),
        mesh(new THREE.BoxGeometry(0.06, 0.08, 0.16), M.gloss, 1.32, 1.72, 0.37 * z),
      );
    }
    const dash = mesh(new THREE.BoxGeometry(0.1, 0.14, 0.26), M.dark, 1.18, 1.63, 0);
    dash.rotation.z = 0.5;
    const screen = mesh(new THREE.PlaneGeometry(0.2, 0.11), M.screen, 1.12, 1.66, 0);
    screen.rotation.set(0, -Math.PI / 2, -0.5);
    cockpit.add(dash, screen);
    add(cockpit, 'cockpit');

    return proc;
  }

  const proc = buildProcedural();
  bike.add(proc);
  let exhaustTip = V3(-1.12, 0.8, 0.3);

  // ---------- Ground: concrete bay with painted lines by day, neon grid by night; slides as you rev or ride ----------
  const groundMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uOffset: { value: new THREE.Vector2() },
      uHeading: { value: 0 },
      uColor: { value: new THREE.Color(CYAN) },
      uFloor: { value: PALETTE.day.bg.clone() },
      uPaint: { value: linear(1.2, 0.42, 0) }, // floor-paint yellow after tone mapping
      uNight: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec2 uOffset;
      uniform float uHeading;
      uniform vec3 uColor;
      uniform vec3 uFloor;
      uniform vec3 uPaint;
      uniform float uNight;
      varying vec2 vUv;
      float gridLine(float v) {
        float d = 0.5 - abs(fract(v) - 0.5);
        return 1.0 - smoothstep(0.0, 0.03, d);
      }
      float band(float v, float at, float w) { return 1.0 - smoothstep(w * 0.5, w * 0.5 + 0.02, abs(v - at)); }
      float noise(vec2 p) { // value noise for stains in the concrete
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5);
        float b = fract(sin(dot(i + vec2(1, 0), vec2(127.1, 311.7))) * 43758.5);
        float c = fract(sin(dot(i + vec2(0, 1), vec2(127.1, 311.7))) * 43758.5);
        float d = fract(sin(dot(i + vec2(1, 1), vec2(127.1, 311.7))) * 43758.5);
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }
      void main() {
        vec2 q = (vUv - 0.5) * 14.0;
        float fade = smoothstep(7.0, 1.5, length(q));
        vec2 g = vUv * 28.0 + uOffset; // half-unit grid that slides
        float grid = gridLine(g.x) * 0.8 + gridLine(g.y) * 0.5;
        float c = cos(uHeading), s = sin(uHeading);
        vec2 r = vec2(c * q.x + s * q.y, -s * q.x + c * q.y); // the shadow turns with the bike
        float shadow = smoothstep(1.0, 0.0, length(r / vec2(2.4, 0.6)));
        // Night: dashed lane lines across the world and the headlight's pool of light ahead of the bike
        float lane = band(mod(g.y, 10.0), 5.0, 0.12) * step(0.45, fract(g.x / 4.0));
        float beam = smoothstep(1.6, 2.6, r.x) * smoothstep(7.5, 3.5, r.x) * (1.0 - smoothstep(0.2 + r.x * 0.22, 0.8 + r.x * 0.3, abs(r.y)));
        vec3 nightRgb = uColor * grid * fade * (1.0 - shadow) + vec3(0.9, 0.88, 0.75) * lane * fade * (0.3 + beam * 0.7) + vec3(0.22, 0.21, 0.16) * beam;
        vec4 nightCol = vec4(nightRgb, max(max(grid * fade * 0.55, shadow * 0.75), max(beam * 0.7, lane * fade * 0.8)));

        // Day: concrete slabs (joints slide like a dyno roller when you rev), painted bay box, soft shadow
        float joints = gridLine(g.x / 6.0) + gridLine(g.y / 6.0);
        float stain = noise(g * 0.35) * 0.6 + noise(g * 1.3) * 0.4;
        vec3 floorCol = uFloor * (0.9 + stain * 0.1) * (1.0 - min(joints, 1.0) * 0.1);
        float inX = step(abs(q.x), 3.3), inY = step(abs(q.y), 1.75);
        float bay = max(band(abs(q.y), 1.7, 0.1) * inX, band(abs(q.x), 3.25, 0.1) * inY);
        bay = max(bay, band(q.x, -3.25, 0.32) * inY); // thick line at the back of the bay
        vec3 dayRgb = mix(floorCol, uPaint, bay) * (1.0 - shadow * 0.55);
        vec4 dayCol = vec4(dayRgb, max(fade, bay * 0.9));

        gl_FragColor = mix(dayCol, nightCol, uNight);
      }`,
  });
  const ground = mesh(new THREE.PlaneGeometry(14, 14), groundMat, 0, 0.001, 0);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // ---------- Exhaust smoke ----------
  const SMOKE = 140;
  const smokePos = new Float32Array(SMOKE * 3).fill(-99);
  const smokeVel = new Float32Array(SMOKE * 3);
  const smokeLife = new Float32Array(SMOKE);
  const smokeGeo = new THREE.BufferGeometry();
  smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
  const smoke = new THREE.Points(smokeGeo, new THREE.PointsMaterial({
    color: PALETTE.day.smoke.clone(), size: 0.09, transparent: true, opacity: 0.5, depthWrite: false,
  }));
  smoke.frustumCulled = false;
  bike.add(smoke);

  function updateSmoke(dt, rpm) {
    let emit = Math.round(rpm * rpm * 5);
    for (let i = 0; i < SMOKE; i++) {
      const j = i * 3;
      if (smokeLife[i] > 0) {
        smokeLife[i] -= dt;
        for (let k = 0; k < 3; k++) smokePos[j + k] += smokeVel[j + k] * dt;
        smokeVel[j + 1] += 0.4 * dt;
      } else if (emit > 0) {
        emit--;
        smokeLife[i] = 0.5 + Math.random() * 0.5;
        smokePos.set([exhaustTip.x, exhaustTip.y, exhaustTip.z], j);
        smokeVel.set([-1.2 - Math.random() * 1.5, 0.2 + Math.random() * 0.4, (Math.random() - 0.5) * 0.4], j);
      } else {
        smokePos[j + 1] = -99;
      }
    }
    smokeGeo.attributes.position.needsUpdate = true;
  }

  // ---------- Wheelie: a keyframed clip on the pivot ----------
  const mixer = new THREE.AnimationMixer(pivot);
  const wheelieTrack = new THREE.NumberKeyframeTrack('.rotation[z]', [0, 0.45, 1.2, 1.55, 1.8], [0, 0.42, 0.38, -0.02, 0]);
  wheelieTrack.setInterpolation(THREE.InterpolateSmooth);
  const wheelie = mixer.clipAction(new THREE.AnimationClip('wheelie', 1.8, [wheelieTrack]));
  wheelie.setLoop(THREE.LoopOnce, 1);
  let kick = 0; // short bursts of revs
  const doWheelie = () => {
    if (reduceMotion || wheelie.isRunning()) return;
    wheelie.reset().play();
    kick = 1;
  };

  // ---------- Engine note (only when Sound is on) ----------
  const audio = {
    ctx: null,
    start() {
      if (document.documentElement.dataset.sound !== 'on') return;
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.osc = Object.assign(this.ctx.createOscillator(), { type: 'sawtooth' });
        this.sub = Object.assign(this.ctx.createOscillator(), { type: 'square' });
        this.filter = Object.assign(this.ctx.createBiquadFilter(), { type: 'lowpass' });
        this.gain = this.ctx.createGain();
        this.gain.gain.value = 0;
        this.osc.connect(this.filter);
        this.sub.connect(this.filter);
        this.filter.connect(this.gain).connect(this.ctx.destination);
        this.osc.start();
        this.sub.start();
      }
      this.ctx.resume();
    },
    update(r, audible) {
      if (!this.ctx) return;
      const on = audible && document.documentElement.dataset.sound === 'on';
      const t = this.ctx.currentTime;
      this.osc.frequency.setTargetAtTime(45 + r * 230, t, 0.05);
      this.sub.frequency.setTargetAtTime(22 + r * 115, t, 0.05);
      this.filter.frequency.setTargetAtTime(500 + r * 2200, t, 0.08);
      this.gain.gain.setTargetAtTime(on ? 0.03 + r * 0.08 : 0, t, 0.08);
    },
  };

  // ---------- Showroom: throttle button and paint ----------
  let throttle = 0;
  let rpm = 0.08;
  const revBtn = $('rev-btn');
  const throttleOn = () => {
    throttle = 1;
    revBtn.classList.add('is-on');
    revBtn.textContent = 'Revving';
    audio.start();
  };
  const throttleOff = () => {
    throttle = 0;
    revBtn.classList.remove('is-on');
    revBtn.textContent = 'Hold to rev';
  };
  revBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); throttleOn(); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((type) => revBtn.addEventListener(type, throttleOff));
  revBtn.addEventListener('contextmenu', (e) => e.preventDefault());
  revBtn.addEventListener('keydown', (e) => {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); throttleOn(); }
  });
  revBtn.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') throttleOff(); });

  const PAINTS = { sunset: [ORANGE, 0.3, 0.32], ocean: [0x1f6fe0, 0.4, 0.3], candy: [0xff3d8b, 0.3, 0.28], mirror: [0xc9ccd0, 1, 0.06] };
  const swatches = [...document.querySelectorAll('.swatch')];
  swatches.forEach((btn) => btn.addEventListener('click', () => {
    const [hex, metalness, roughness] = PAINTS[btn.dataset.paint];
    const c = new THREE.Color(hex);
    swatches.forEach((s) => s.setAttribute('aria-pressed', String(s === btn)));
    for (const m of paintMats) {
      if (!hasGsap || reduceMotion) {
        m.color.copy(c);
        Object.assign(m, { metalness, roughness });
      } else {
        gsap.to(m.color, { r: c.r, g: c.g, b: c.b, duration: 0.6 });
        gsap.to(m, { metalness, roughness, duration: 0.6 });
      }
    }
    if (hasGsap && !reduceMotion) gsap.fromTo(rig.position, { y: 0.15 }, { y: 0, duration: 0.7, ease: 'bounce.out' });
  }));

  // ---------- Explore: hotspots, parts list, card, explode, x-ray ----------
  const hotspotLayer = $('hotspots');
  const partsList = $('parts-list');
  const hotspots = new Map();
  for (const p of partInfo.values()) {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'hotspot';
    dot.dataset.part = p.id;
    dot.setAttribute('aria-label', `${p.n}. ${p.name}`);
    dot.textContent = p.n;
    hotspotLayer.append(dot);
    hotspots.set(p.id, dot);

    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'part-btn';
    btn.dataset.part = p.id;
    btn.setAttribute('aria-pressed', 'false');
    const num = document.createElement('b');
    num.textContent = p.n;
    btn.append(num, ` ${p.name}`);
    li.append(btn);
    partsList.append(li);
  }

  const explode = { t: 0 };
  let selected = null;
  const glow = new THREE.Color(CYAN);

  const anchorWorld = (p, out) => bike.localToWorld(out.set(...p.anchor).addScaledVector(V3(...p.explode), explode.t));

  // Orbit around the (moving) target instead of a straight line, so the camera never cuts through the bike
  let flight;
  function moveCamera(target, pos) {
    flight?.kill();
    if (!hasGsap || reduceMotion) {
      controls.target.copy(target);
      camera.position.copy(pos);
      return;
    }
    const t0 = controls.target.clone();
    const t1 = target.clone();
    const dir = camera.position.clone().sub(t0);
    const end = pos.clone().sub(t1);
    const d0 = dir.length();
    const d1 = end.length();
    const turn = new THREE.Quaternion().setFromUnitVectors(dir.normalize(), end.normalize());
    const q = new THREE.Quaternion();
    const p = { t: 0 };
    flight = gsap.to(p, {
      t: 1, duration: 0.9, ease: 'power3.inOut',
      onUpdate: () => {
        controls.target.lerpVectors(t0, t1, p.t);
        q.identity().slerp(turn, p.t);
        camera.position.copy(dir).applyQuaternion(q).multiplyScalar(THREE.MathUtils.lerp(d0, d1, p.t)).add(controls.target);
      },
    });
  }
  function focusCamera(target, distance) {
    const dir = camera.position.clone().sub(controls.target).normalize();
    moveCamera(target, target.clone().addScaledVector(dir, distance));
  }

  function select(id) {
    if (selected) for (const m of partMats.get(selected) || []) m.emissive?.setRGB(0, 0, 0);
    selected = id;
    const p = id && partInfo.get(id);
    $('part-name').textContent = p ? `${p.n}. ${p.name}` : 'Pick a part';
    $('part-text').textContent = p ? p.text : 'Select a numbered dot, a part of the bike itself, or a name below.';
    document.querySelectorAll('.part-btn, .hotspot').forEach((b) => {
      const on = b.dataset.part === id;
      b.classList.toggle('is-active', on);
      if (b.classList.contains('part-btn')) b.setAttribute('aria-pressed', String(on));
    });
    if (mode !== 'explore') return;
    if (p) focusCamera(anchorWorld(p, V3()), baseDist * 0.62);
    else focusCamera(HOME_TARGET, baseDist * 0.85);
  }
  const toggleSelect = (id) => select(id === selected ? null : id);
  hotspotLayer.addEventListener('click', (e) => {
    const b = e.target.closest('.hotspot');
    if (b) toggleSelect(b.dataset.part);
  });
  partsList.addEventListener('click', (e) => {
    const b = e.target.closest('.part-btn');
    if (b) toggleSelect(b.dataset.part);
  });

  const explodeBtn = $('explode-btn');
  const xrayBtn = $('xray-btn');
  function setExplode(on) {
    explodeBtn.setAttribute('aria-pressed', String(on));
    if (!hasGsap || reduceMotion) explode.t = on ? 1 : 0;
    else gsap.to(explode, { t: on ? 1 : 0, duration: 1.4, ease: 'none', overwrite: true });
  }
  explodeBtn.addEventListener('click', () => setExplode(explodeBtn.getAttribute('aria-pressed') !== 'true'));

  function setXray(on) {
    xrayBtn.setAttribute('aria-pressed', String(on));
    for (const m of xrayMats) {
      const u = m.userData;
      u.base ??= { opacity: m.opacity, transparent: m.transparent, depthWrite: m.depthWrite };
      if (on) Object.assign(m, { transparent: true, depthWrite: false, needsUpdate: true });
      const restore = () => { if (!on) Object.assign(m, { ...u.base, needsUpdate: true }); };
      const opacity = on ? 0.12 : u.base.opacity;
      if (!hasGsap || reduceMotion) {
        m.opacity = opacity;
        restore();
      } else {
        gsap.to(m, { opacity, duration: 0.5, overwrite: true, onComplete: restore });
      }
    }
  }
  xrayBtn.addEventListener('click', () => setXray(xrayBtn.getAttribute('aria-pressed') !== 'true'));

  const explodeEase = hasGsap ? gsap.parseEase('expo.out') : (t) => t;
  function applyExplode() {
    const n = pieces.length;
    pieces.forEach((p, i) => {
      const delay = (i / n) * 0.3; // pieces leave one after another
      const t = explodeEase(Math.min(1, Math.max(0, (explode.t - delay) / 0.7)));
      p.obj.position.copy(p.base).addScaledVector(p.local, t);
    });
  }

  // ---------- Ride: keyboard and touch ----------
  const keys = { up: false, down: false, left: false, right: false };
  const KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
  const ride = { speed: 0, heading: 0, lean: 0, pitch: 0, gear: 0, manual: false, cut: 0 };
  const MAX_SPEED = 16;
  const GEAR_TOP = [0, 0.3, 0.46, 0.61, 0.75, 0.88, 1].map((f) => f * MAX_SPEED); // top speed in each gear (0 = neutral)
  let heroVisible = true;
  const releaseKeys = () => Object.keys(keys).forEach((k) => { keys[k] = false; });

  const gearEl = $('hud-gear');
  function shift(dir, auto = false) {
    const next = Math.max(0, Math.min(6, ride.gear + dir));
    if (next === ride.gear) return;
    if (!auto) ride.manual = true; // once you shift by hand, the bike stops shifting for you
    if (dir > 0 && ride.gear > 0) { ride.cut = 0.15; coach.event('upshift'); } // clutch in: drive and revs drop for a moment
    if (dir < 0 && next > 0) coach.event('downshift');
    ride.gear = next;
    gearEl.textContent = next ? String(next) : 'N';
    if (hasGsap && !reduceMotion) gsap.fromTo(gearEl, { rotationX: dir > 0 ? -90 : 90, opacity: 0.2 }, { rotationX: 0, opacity: 1, duration: 0.28, ease: 'back.out(2)', overwrite: true });
  }

  // ---------- Ride coach: "pit radio" tips tied to what the bike is doing ----------
  const coach = (() => {
    const tips = D.rideTips || [];
    const cfg = D.rideCoach || {};
    const box = $('ride-coach');
    const card = $('coach-card');
    const timer = $('coach-timer');
    const logBtn = $('ride-log-btn');
    const logList = $('ride-log');
    const GAP = 6;     // seconds between tips
    const SHOW = 7;    // seconds a tip stays up
    const FRESH = 2.5; // a short event (a shift, a stop) can still trigger a tip this long after it happened
    const seen = new Set(); // this ride
    const when = new Map(); // event id -> last time it happened
    let now = 0;
    let lastAt = -GAP;
    let last = null;
    let hideAt = 0;
    let tl;
    let learned = new Set();
    try { learned = new Set(JSON.parse(localStorage.getItem('ride-log') || '[]')); } catch { /* storage blocked: start empty */ }
    $('coach-label').textContent = cfg.label || 'Pit radio';
    $('ride-log-label').textContent = cfg.log || 'Lessons learned';

    function renderLog() {
      $('ride-log-count').textContent = `${tips.filter((tp) => learned.has(tp.id)).length}/${tips.length}`;
      logList.replaceChildren(...tips.map((tp) => {
        const li = document.createElement('li');
        const on = learned.has(tp.id);
        li.textContent = on ? tp.title : cfg.locked || 'Not found yet.';
        li.classList.toggle('is-locked', !on);
        return li;
      }));
    }
    renderLog();
    logBtn.addEventListener('click', () => {
      const open = logBtn.getAttribute('aria-expanded') !== 'true';
      logBtn.setAttribute('aria-expanded', String(open));
      logList.hidden = !open;
    });

    function show(tp) {
      last = tp;
      lastAt = now;
      hideAt = now + SHOW;
      seen.add(tp.id);
      if (!learned.has(tp.id)) {
        learned.add(tp.id);
        try { localStorage.setItem('ride-log', JSON.stringify([...learned])); } catch { /* not saved, still counted this visit */ }
        renderLog();
        if (hasGsap && !reduceMotion) gsap.fromTo('#ride-log-count', { scale: 1.5 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
      }
      $('coach-title').textContent = tp.title;
      $('coach-text').textContent = tp.text;
      card.classList.add('is-on');
      select(tp.part); // the part it talks about glows on the bike
      tl?.kill();
      if (!hasGsap) return;
      if (reduceMotion) {
        gsap.set(card, { clearProps: 'all' });
        return;
      }
      tl = gsap.timeline()
        .fromTo(card, { y: -24, opacity: 0, clipPath: 'inset(0% 0% 100% 0%)' }, { y: 0, opacity: 1, clipPath: 'inset(0% 0% 0% 0%)', duration: 0.55, ease: 'expo.out' })
        .fromTo('.coach-label i', { scale: 2.4 }, { scale: 1, duration: 0.45, ease: 'back.out(3)' }, 0.1);
    }
    function hide(instant = false) {
      hideAt = 0;
      tl?.kill();
      if (selected && mode === 'ride') select(null);
      if (instant || !hasGsap || reduceMotion) {
        card.classList.remove('is-on');
        return;
      }
      tl = gsap.to(card, { y: -16, opacity: 0, duration: 0.35, ease: 'power2.in', onComplete: () => card.classList.remove('is-on') });
    }

    return {
      event(id) { when.set(id, now); },
      tick(dt) {
        now += dt;
        if (hideAt) timer.style.transform = `scaleX(${Math.max(0, (hideAt - now) / SHOW).toFixed(3)})`; // runs on ride time, like the gap
        if (hideAt && now >= hideAt) hide();
        if (now - lastAt < GAP) return;
        const tp = tips.find((x) => !seen.has(x.id) && when.has(x.id) && now - when.get(x.id) < FRESH);
        if (tp) show(tp);
      },
      replay() { if (last) show(last); },
      dismiss() {
        if (!hideAt) return false;
        hide();
        return true;
      },
      setOn(on) { box.hidden = !on; },
      side() { return hideAt && last ? Math.sign(partInfo.get(last.part)?.anchor[2] || 1) : 0; }, // +1 right side, -1 left (chain)
      reset() {
        hide(true);
        seen.clear();
        when.clear();
        last = null;
        lastAt = now - GAP + 0.8; // the first tip can come right after you set off
      },
    };
  })();

  addEventListener('keydown', (e) => {
    if (mode !== 'ride' || !heroVisible || e.target.closest?.('input, textarea')) return;
    if (KEYMAP[e.code]) {
      keys[KEYMAP[e.code]] = true;
      e.preventDefault();
      audio.start();
    } else if (e.code === 'Space') {
      e.preventDefault();
      doWheelie();
    } else if ((e.code === 'KeyE' || e.code === 'KeyQ') && !e.repeat) {
      shift(e.code === 'KeyE' ? 1 : -1);
    } else if (e.code === 'KeyT' && !e.repeat) {
      coach.replay();
    } else if (e.key === 'Escape') {
      if (!coach.dismiss()) setMode('showroom');
    }
  });
  addEventListener('keyup', (e) => { if (KEYMAP[e.code]) keys[KEYMAP[e.code]] = false; });
  document.querySelectorAll('.pad-btn[data-key]').forEach((b) => {
    const set = (v) => (e) => {
      e.preventDefault();
      keys[b.dataset.key] = v;
      if (v) audio.start();
    };
    b.addEventListener('pointerdown', set(true));
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((t) => b.addEventListener(t, set(false)));
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  });
  document.querySelectorAll('.pad-btn[data-shift]').forEach((b) => b.addEventListener('click', () => shift(+b.dataset.shift)));

  function resetRide() {
    releaseKeys();
    Object.assign(ride, { speed: 0, heading: 0, lean: 0, pitch: 0, gear: 0, manual: false, cut: 0 });
    gearEl.textContent = 'N';
    groundMat.uniforms.uOffset.value.set(0, 0);
    lean.rotation.z = 0;
    cruiseFor = 0;
    camSwing = 0;
    Object.assign(cam, { ang: Math.atan2(camera.position.z, -camera.position.x), dist: Math.hypot(camera.position.x, camera.position.z), h: camera.position.y });
    movedFast = false;
    coach.reset();
  }

  // ---------- Modes ----------
  let mode = 'showroom';
  const modeBtns = [...document.querySelectorAll('.mode')];
  function setMode(next) {
    if (next === mode) return;
    const prev = mode;
    mode = next;
    hero.dataset.mode = next;
    modeBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === next)));
    $('panel-explore').hidden = next !== 'explore';
    $('panel-ride').hidden = next !== 'ride';
    $('hero-controls').hidden = next !== 'showroom';
    hotspotLayer.hidden = next !== 'explore';
    throttleOff();
    releaseKeys();
    controls.autoRotate = next === 'showroom' && !reduceMotion;
    controls.enabled = next === 'showroom' || next === 'explore'; // 'tour' is driven by the page scroll

    if (prev === 'tour') {
      select(null);
      setXray(false);
    }
    if (prev === 'explore') {
      select(null);
      setExplode(false);
      setXray(false);
    }
    coach.setOn(next === 'ride');
    if (prev === 'ride') {
      resetRide();
      select(null);
    }
    if (next === 'ride') {
      resetRide();
      flight?.kill();
      controls.target.copy(HOME_TARGET);
    }
    if (next === 'explore') moveCamera(HOME_TARGET, HOME_TARGET.clone().addScaledVector(HOME_DIR, baseDist * 0.85));
    if (next === 'showroom') moveCamera(HOME_TARGET, HOME_TARGET.clone().addScaledVector(HOME_DIR, baseDist));
  }
  modeBtns.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));

  // ---------- Lift tour (driven by main.js on scroll): glow one part and fly the camera to it ----------
  function tour(id) {
    const step = id && D.lift?.steps.find((s) => s.part === id);
    if (!step) {
      if (mode === 'tour') setMode('showroom');
      return;
    }
    setMode('tour');
    select(id);
    setXray(!!step.xray);
    const target = step.focus ? bike.localToWorld(V3(...step.focus)) : anchorWorld(partInfo.get(id), V3());
    moveCamera(target, target.clone().addScaledVector(V3(...step.view).normalize(), baseDist * step.zoom));
  }
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && mode === 'explore' && selected) select(null); });

  // ---------- Pointer on the canvas: wheelie in showroom, pick a part in explore ----------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downAt = null;
  function hit(e) {
    const r = renderer.domElement.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObject(bike, true).find((h) => h.object !== smoke);
  }
  renderer.domElement.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
    const h = hit(e);
    if (mode === 'showroom' && h) doWheelie();
    if (mode === 'explore') select(h?.object.userData.part ?? null);
  });
  let lastHover = 0;
  renderer.domElement.addEventListener('pointermove', (e) => {
    const now = performance.now();
    if (now - lastHover < 60 || e.buttons || mode === 'ride') return;
    lastHover = now;
    const h = hit(e);
    stage.classList.toggle('is-hover', !!h && (mode === 'showroom' || !!h.object.userData.part));
  });

  // ---------- Load a real model if one is in assets/models ----------
  // Downloaded models name their meshes freely; these guesses sort them into parts
  const PART_NAMES = [
    ['brakes', /brake|disc|disk|caliper|rotor/i],
    ['wheels', /wheel|tire|tyre|rim|spoke/i],
    ['exhaust', /exhaust|muffler|silencer|pipe|header/i],
    ['front-suspension', /fork|fender|mudguard/i],
    ['chain', /chain|sprocket/i],
    ['rear-suspension', /swing|shock|spring|suspension/i],
    ['engine', /engine|motor|cylinder|crank|radiator|clutch/i],
    ['frame', /frame|chassis/i],
    ['cockpit', /handle|bar|dash|meter|gauge|mirror|grip|clip|cockpit|display/i],
    ['intake', /intake|ram|duct/i],
    ['fairing', /fair|body|cowl|tank|tail|panel|cover|seat|paint|livery|glass|screen|shield/i],
  ];

  async function loadRealModel() {
    const cfg = D.model;
    if (!cfg?.paths?.length) return;
    const status = $('model-status');
    const loader = new GLTFLoader();
    for (const path of cfg.paths) {
      try {
        const gltf = await loader.loadAsync(path, (ev) => {
          if (ev.total) status.textContent = `Loading the 3D model… ${Math.round((ev.loaded / ev.total) * 100)}%`;
        });
        useModel(gltf.scene, cfg);
        status.textContent = '';
        return;
      } catch {
        // not there (or unreadable): try the next path, then keep the hand-built bike
      }
    }
    status.textContent = '';
  }

  function useModel(model, cfg) {
    // Face +x, sit on the ground, same length as the hand-built bike so the dots line up
    model.rotation.y = cfg.rotateY || 0;
    model.updateMatrixWorld(true);
    let size = new THREE.Box3().setFromObject(model).getSize(V3());
    if (size.z > size.x) {
      model.rotation.y += Math.PI / 2;
      model.updateMatrixWorld(true);
      size = new THREE.Box3().setFromObject(model).getSize(V3());
    }
    model.scale.multiplyScalar(4.3 / size.x);
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(V3());
    model.position.x -= center.x;
    model.position.z -= center.z;
    model.position.y -= box.min.y;

    bike.remove(proc);
    pieces = [];
    partMats = new Map();
    xrayMats = new Set();
    paintMats = new Set();
    spinners.length = 0;
    bike.add(model);
    bike.updateMatrixWorld(true);

    // Sort meshes into parts by their names; unnamed meshes stay put
    const wheelMeshes = [];
    model.traverse((o) => {
      if (!o.isMesh) return;
      const label = `${o.name} ${o.parent?.name ?? ''} ${[].concat(o.material).map((m) => m?.name).join(' ')}`;
      const found = PART_NAMES.find(([, re]) => re.test(label));
      if (!found) return;
      const [part] = found;
      if (part === 'fairing') [].concat(o.material).forEach((m) => { m.userData.xray = true; });
      const front = bikeX(o) > 0;
      if (part === 'wheels') wheelMeshes.push(o);
      else register(o, part, part === 'brakes' ? [front ? 1.4 : -1.3, 0, front ? 0.7 : -0.7] : null);
    });

    // Spin the wheels: regroup each wheel's meshes around its centre
    for (const front of [true, false]) {
      const set = wheelMeshes.filter((o) => (bikeX(o) > 0) === front);
      if (!set.length) continue;
      const b = new THREE.Box3();
      set.forEach((o) => b.expandByObject(o));
      const spin = new THREE.Group();
      spin.position.copy(bike.worldToLocal(b.getCenter(V3())));
      bike.add(spin);
      spin.updateMatrixWorld(true);
      set.forEach((o) => spin.attach(o));
      spinners.push(spin);
      register(spin, 'wheels', [front ? 1.4 : -1.3, 0, 0]);
    }
    measurePieces();

    // A downloaded livery can't be recoloured reliably, so the paint swatches go
    document.querySelector('.swatches').hidden = true;
    const link = (href, text) => Object.assign(document.createElement('a'), { href, textContent: text, target: '_blank', rel: 'noopener noreferrer' });
    if (cfg.credit) $('model-credit').replaceChildren('3D model: ', link(cfg.credit.url, `"${cfg.credit.title}" by ${cfg.credit.author}`), ', licensed under ', link(cfg.credit.licenseUrl, cfg.credit.license), '.');
  }

  // ---------- Post-processing: bloom on the lights ----------
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.35, 2.6);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ---------- Size and framing ----------
  let baseDist = 9.5;
  let aspect = 1;
  const view = { x: 0, y: 0 };
  function resize() {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (!w || !h) return;
    aspect = w / h;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.resolution.set(w / 2, h / 2);
    const prev = baseDist;
    baseDist = Math.max(9.5, 5.8 / (0.573 * aspect)); // fit about 5.8 units of width
    scene.fog.near = baseDist * 0.95;
    scene.fog.far = baseDist * 2.4;
    if (mode !== 'ride') {
      const dist = camera.position.distanceTo(controls.target) * (baseDist / prev);
      const dir = camera.position.clone().sub(controls.target).normalize();
      camera.position.copy(controls.target).addScaledVector(dir, dist);
    }
  }
  // Where the bike sits on screen: right of the title in showroom, clear of the panel in explore
  function viewTarget() {
    const wide = aspect > 1.2;
    const tall = aspect < 0.8;
    if (mode === 'showroom') return wide ? [-0.17, 0] : tall ? [0, 0.06] : [0, 0];
    if (mode === 'explore') return wide ? [0.17, 0] : [0, 0.22];
    if (mode === 'tour') return stage.clientWidth > 760 ? [-0.17, 0] : [0, 0.14]; // clear of the step cards
    return tall ? [0, 0.05] : [0, 0]; // ride: between the tip card and the touch pad
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  // Roll in from the right once the intro tachometer is done
  if (hasGsap && !reduceMotion) {
    kick = 1;
    gsap.from(rig.position, { x: 7, duration: 1.4, delay: $('loader') ? 2.3 : 0.2, ease: 'expo.out' });
  }

  measurePieces();
  loadRealModel();

  // ---------- Render loop, paused while the hero is off screen ----------
  const clock = new THREE.Clock();
  const tmp = V3();
  const look = V3();
  const rpmNum = $('rpm-num');
  const rpmFill = $('rpm-fill');
  const rideSpeed = $('ride-speed');
  const barThrottle = $('bar-throttle');
  const barBrake = $('bar-brake');
  const tachFill = $('tach-fill');
  const needle = $('hud-needle');
  const hud = { thr: 0, brk: 0 };
  let cruiseFor = 0;
  let camSwing = 0;
  const cam = { ang: 0, dist: 9.5, h: 2.6 };
  let movedFast = false;

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    let roll;

    if (mode === 'ride') {
      // Gearbox: neutral until you open the throttle; auto shifts unless you've shifted by hand
      if (!ride.manual) {
        if (ride.gear === 0 && keys.up) shift(1, true);
        else if (ride.gear > 0 && ride.speed < 0.2 && !keys.up) shift(-ride.gear, true);
        else if (ride.gear > 0 && ride.gear < 6 && ride.speed > GEAR_TOP[ride.gear] * 0.94 && keys.up) shift(1, true);
        else if (ride.gear > 1 && ride.speed < GEAR_TOP[ride.gear - 1] * 0.55) shift(-1, true);
      }
      ride.cut = Math.max(0, ride.cut - dt);
      const top = GEAR_TOP[ride.gear];
      const drive = keys.up && ride.gear > 0 && !ride.cut;
      const accel = drive && ride.speed < top ? 9 : 0;
      const brake = keys.down ? 18 : 0;
      const engineBrake = ride.speed > top && ride.gear > 0 ? (ride.speed - top) * 3 : 0; // too low a gear holds the bike back
      ride.speed = Math.max(0, Math.min(MAX_SPEED, ride.speed + (accel - brake - engineBrake - ride.speed * 0.35) * dt));
      const steer = (keys.left ? 1 : 0) - (keys.right ? 1 : 0);
      ride.heading += steer * 1.7 * Math.min(1, ride.speed / 4) * dt;
      ride.lean += (-steer * 0.45 * Math.min(1, ride.speed / 8) - ride.lean) * Math.min(1, dt * 5);
      // Brake dive (nose down) and throttle squat (nose up), small and eased
      const pitchTo = reduceMotion ? 0 : (keys.down && ride.speed > 0.5 ? -0.035 : drive ? 0.018 : 0);
      ride.pitch += (pitchTo - ride.pitch) * Math.min(1, dt * 6);
      const d = ride.speed * dt;
      groundMat.uniforms.uOffset.value.x += 2 * Math.cos(ride.heading) * d; // the grid slides under the bike
      groundMat.uniforms.uOffset.value.y += 2 * Math.sin(ride.heading) * d;
      roll = d / 0.6;
      // rpm follows road speed in the current gear; in neutral the throttle just revs it. Upshift = revs drop.
      const rpmTo = ride.gear ? 0.12 + 0.86 * Math.min(1.02, ride.speed / top) * (ride.cut ? 0.8 : 1) : 0.1 + (keys.up ? 0.8 : 0);
      rpm += (Math.min(1, rpmTo) - rpm) * Math.min(1, dt * (rpmTo < rpm ? 10 : 5));
      rideSpeed.textContent = String(Math.round(ride.speed * 12));

      // What the coach can talk about right now
      if (keys.up) coach.event('throttle');
      if (rpm > 0.86) coach.event('revs');
      if (keys.down && ride.speed > 4) coach.event('brake');
      if (Math.abs(ride.lean) > 0.22) coach.event('lean');
      if (ride.speed > MAX_SPEED * 0.8) coach.event('ramair');
      if (wheelie.isRunning()) coach.event('wheelie');
      cruiseFor = ride.speed > 5 && !keys.down && !steer ? cruiseFor + dt : 0;
      if (cruiseFor > 2.5) coach.event('cruise');
      if (ride.speed > 3) movedFast = true;
      if (movedFast && ride.speed < 0.05) { coach.event('stop'); movedFast = false; }
      coach.tick(dt);

      // HUD
      const tt = Math.min(1, dt * 12);
      hud.thr += ((drive ? 1 : 0) - hud.thr) * tt;
      hud.brk += ((keys.down ? 1 : 0) - hud.brk) * tt;
      barThrottle.style.transform = `scaleY(${hud.thr.toFixed(3)})`;
      barBrake.style.transform = `scaleY(${hud.brk.toFixed(3)})`;
      tachFill.style.strokeDashoffset = String(1 - Math.min(1, rpm));
      needle.setAttribute('transform', `rotate(${(Math.min(1, rpm) * 180 - 90).toFixed(1)} 100 110)`);

      // Chase camera behind the bike; while a tip is up it swings round to the side of the glowing part
      const side = coach.side();
      camSwing += ((reduceMotion ? 0 : side) - camSwing) * Math.min(1, dt * 1.5);
      const sw = Math.abs(camSwing);
      const fx = Math.cos(ride.heading);
      const fz = -Math.sin(ride.heading);
      // Smoothed in polar coordinates (angle, distance, height) so the camera never cuts across the bike in a turn
      const k = 1 - Math.exp(-dt * 4);
      const yaw = ride.heading + camSwing * 0.6;
      cam.ang += Math.atan2(Math.sin(yaw - cam.ang), Math.cos(yaw - cam.ang)) * k;
      cam.dist += (7 * (baseDist / 9.5) * (1 + sw * 0.3) - cam.dist) * k; // further back on narrow screens
      cam.h += (2.6 * (baseDist / 9.5) - cam.h) * k;
      camera.position.set(-Math.cos(cam.ang) * cam.dist, cam.h, Math.sin(cam.ang) * cam.dist);
      look.set(fx * 2 * (1 - sw * 0.7), 0.8, fz * 2 * (1 - sw * 0.7));
      camera.lookAt(look);
    } else {
      const target = Math.max(throttle, kick, 0.08);
      rpm += (target - rpm) * Math.min(1, (target > rpm ? 3.5 : 1.8) * dt);
      roll = (rpm - 0.08) * 24 * dt;
      groundMat.uniforms.uOffset.value.x += roll * 0.2;
      controls.update();
    }
    kick = Math.max(0, kick - dt * 0.8);

    spinners.forEach((s) => { s.rotation.z -= roll; });
    if (!reduceMotion) bike.position.y = Math.sin(t * 90) * 0.004 * (0.3 + rpm * 2);
    updateSmoke(dt, rpm);
    mixer.update(dt);
    applyExplode();

    // Day bay <-> night run, blended over about a second
    const toNight = mode === 'ride' ? 1 : 0;
    if (night !== toNight) {
      night = reduceMotion || Math.abs(toNight - night) < 0.002 ? toNight : night + (toNight - night) * Math.min(1, dt * 3);
      const P = PALETTE;
      scene.background.lerpColors(P.day.bg, P.night.bg, night);
      scene.fog.color.copy(scene.background);
      groundMat.uniforms.uFloor.value.copy(scene.background);
      groundMat.uniforms.uNight.value = night;
      hemi.color.lerpColors(P.day.sky, P.night.sky, night);
      hemi.groundColor.lerpColors(P.day.floor, P.night.floor, night);
      hemi.intensity = THREE.MathUtils.lerp(P.day.hemi, P.night.hemi, night);
      lamp.intensity = THREE.MathUtils.lerp(P.day.lamp, P.night.lamp, night);
      smoke.material.color.lerpColors(P.day.smoke, P.night.smoke, night);
    }

    rig.rotation.y = ride.heading;
    lean.rotation.x = ride.lean;
    lean.rotation.z = ride.pitch;
    groundMat.uniforms.uHeading.value = rig.rotation.y;

    // Slide the framing smoothly between modes
    const [vx, vy] = viewTarget();
    view.x += (vx - view.x) * Math.min(1, dt * 4);
    view.y += (vy - view.y) * Math.min(1, dt * 4);
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    camera.setViewOffset(w, h, view.x * w, view.y * h, w, h);

    // The selected part glows softly
    if (selected) {
      const k = (0.25 + Math.sin(t * 4) * 0.12) * (mode === 'ride' ? 2.2 : 1); // brighter in ride: the camera is further back
      for (const m of partMats.get(selected) || []) m.emissive?.copy(glow).multiplyScalar(k);
    }

    // Pin the numbered dots to their parts
    if (mode === 'explore') {
      camera.updateMatrixWorld();
      for (const p of partInfo.values()) {
        anchorWorld(p, tmp).project(camera);
        const dot = hotspots.get(p.id);
        dot.hidden = tmp.z > 1;
        dot.style.transform = `translate(${((tmp.x + 1) / 2) * w}px, ${((1 - tmp.y) / 2) * h}px)`;
      }
    }

    rpmNum.textContent = String(Math.round((rpm * 14000) / 50) * 50);
    rpmFill.style.transform = `scaleX(${Math.min(1, rpm)})`;
    rpmFill.classList.toggle('is-red', rpm > 0.8);
    audio.update(rpm, true);
    composer.render();
  }

  window.bike3d = { tour };
  if (window.liftPart) tour(window.liftPart); // the page loaded already scrolled into the tour

  new IntersectionObserver(([entry]) => {
    heroVisible = entry.isIntersecting;
    if (heroVisible) {
      clock.getDelta();
      renderer.setAnimationLoop(frame);
    } else {
      renderer.setAnimationLoop(null);
      throttleOff();
      if (mode === 'ride') resetRide(); // scrolled away: the next ride starts fresh
      releaseKeys();
      audio.update(0, false);
    }
  }).observe(stage);
})();
