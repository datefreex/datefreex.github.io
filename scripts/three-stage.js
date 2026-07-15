/* =========================================================================
   three-stage.js
   Background scene for the hero. Three.js as an ES module from a CDN, with
   an automatic Canvas2D fallback when WebGL or the CDN is unavailable.
   Deterministic, GPU-friendly, pointer-aware, light on mobile.
   ========================================================================= */

const STAGE = document.getElementById('stage');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer = null;
let scene = null;
let camera = null;
let frameId = null;
let clock = null;
let isVisible = !document.hidden;

const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
const state = { frame: 0, ready: false };

/* -------------------------------------------------------------------------
   Canvas2D fallback (WebGL blocked / CDN offline / reduced motion)
   ------------------------------------------------------------------------- */
function startFallback() {
  if (!STAGE) return;
  const ctx = STAGE.getContext('2d');
  if (!ctx) return;

  const isLight = document.body.classList.contains('theme-light');
  const bg = isLight ? '244, 243, 238' : '11, 11, 13';
  const accent = isLight ? '79, 138, 0' : '202, 255, 93';
  const accent2 = isLight ? '15, 126, 146' : '125, 249, 255';

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    STAGE.width = innerWidth * dpr;
    STAGE.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  addEventListener('resize', resize);

  const blobs = Array.from({ length: 6 }, (_, i) => ({
    x: Math.random() * innerWidth,
    y: Math.random() * innerHeight,
    r: 220 + Math.random() * 180,
    vx: (Math.random() - 0.5) * 0.06,
    vy: (Math.random() - 0.5) * 0.06,
    color: i % 2 === 0 ? accent : accent2,
  }));

  function draw() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.fillStyle = `rgba(${bg}, 1)`;
    ctx.fillRect(0, 0, innerWidth, innerHeight);

    ctx.globalCompositeOperation = 'lighter';
    for (const b of blobs) {
      b.x += b.vx + mouse.tx * 0.02;
      b.y += b.vy + mouse.ty * 0.02;
      if (b.x < -b.r) b.x = innerWidth + b.r;
      if (b.x > innerWidth + b.r) b.x = -b.r;
      if (b.y < -b.r) b.y = innerHeight + b.r;
      if (b.y > innerHeight + b.r) b.y = -b.r;

      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      g.addColorStop(0, `rgba(${b.color}, 0.28)`);
      g.addColorStop(0.6, `rgba(${b.color}, 0.05)`);
      g.addColorStop(1, `rgba(${b.color}, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    if (!reducedMotion) frameId = requestAnimationFrame(draw);
  }
  draw();
}

/* -------------------------------------------------------------------------
   Three.js scene
   ------------------------------------------------------------------------- */
async function startThree() {
  if (!STAGE) return;

  let THREE;
  try {
    THREE = await import('https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js');
  } catch (err) {
    console.warn('[stage] Three.js CDN unreachable, falling back to canvas.', err);
    startFallback();
    return;
  }

  scene = new THREE.Scene();
  scene.background = null;

  camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 6);

  try {
    renderer = new THREE.WebGLRenderer({
      canvas: STAGE,
      antialias: false,
      alpha: true,
      powerPreference: 'low-power',
    });
  } catch (err) {
    console.warn('[stage] WebGL context failed, using canvas fallback.', err);
    startFallback();
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.setClearColor(0x000000, 0);

  const isMobile = innerWidth < 760;
  const sphereDetail = isMobile ? 32 : 56;
  const pointsCount = isMobile ? 1400 : 3200;

  /* ---- particle globe (the hero centrepiece) ---- */
  const sphereGeo = new THREE.SphereGeometry(1.8, sphereDetail, sphereDetail);
  const spherePos = sphereGeo.attributes.position;

  const colors = new Float32Array(pointsCount * 3);
  const positions = new Float32Array(pointsCount * 3);
  const sizes = new Float32Array(pointsCount);
  const phases = new Float32Array(pointsCount);

  const tmp = new THREE.Vector3();
  const accent = new THREE.Color('#caff5d');
  const accent2 = new THREE.Color('#7df9ff');
  const warm = new THREE.Color('#f0c66f');

  for (let i = 0; i < pointsCount; i++) {
    const idx = Math.floor(Math.random() * spherePos.count);
    tmp.fromBufferAttribute(spherePos, idx);
    const r = 1.8 + (Math.random() - 0.5) * 0.12;
    tmp.setLength(r);
    positions.set([tmp.x, tmp.y, tmp.z], i * 3);

    const t = (tmp.y + r) / (2 * r);
    const c = accent.clone().lerp(accent2, t).lerp(warm, Math.pow(1 - Math.abs(tmp.z / r), 2) * 0.18);
    colors.set([c.r, c.g, c.b], i * 3);

    sizes[i] = Math.random() * 0.02 + 0.008;
    phases[i] = Math.random() * Math.PI * 2;
  }

  const pointsGeo = new THREE.BufferGeometry();
  pointsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  pointsGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  pointsGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  pointsGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

  const pointsMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    uniforms: {
      uTime: { value: 0 },
      uPixel: { value: renderer.getPixelRatio() },
      uPointer: { value: new THREE.Vector2(0, 0) },
    },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aPhase;
      uniform float uTime;
      uniform float uPixel;
      uniform vec2 uPointer;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        float breath = sin(uTime * 0.4 + aPhase) * 0.04;
        p += normalize(position) * breath;
        p.xy += uPointer * 0.18;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float dist = -mv.z;
        gl_PointSize = aSize * 320.0 * uPixel / dist;
        vColor = color;
        vAlpha = clamp(1.0 - (dist - 2.0) / 6.0, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vColor, a * vAlpha * 0.95);
      }
    `,
  });

  const points = new THREE.Points(pointsGeo, pointsMat);
  scene.add(points);

  /* ---- drifting code-stream lines ---- */
  const linesGroup = new THREE.Group();
  const lineMat = new THREE.LineBasicMaterial({ color: 0xcaff5d, transparent: true, opacity: 0.18 });
  for (let k = 0; k < 8; k++) {
    const pts = [];
    let x = (Math.random() - 0.5) * 14;
    let y = (Math.random() - 0.5) * 8;
    const z = -1 - Math.random() * 4;
    pts.push(new THREE.Vector3(x, y, z));
    for (let l = 1; l < 60; l++) {
      x += (Math.random() - 0.5) * 0.6;
      y += (Math.random() - 0.5) * 0.4;
      pts.push(new THREE.Vector3(x, y, z));
    }
    const lg = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(lg, lineMat.clone());
    line.userData.speed = 0.02 + Math.random() * 0.04;
    line.material.opacity = 0.05 + Math.random() * 0.18;
    linesGroup.add(line);
  }
  scene.add(linesGroup);

  /* ---- ambient wireframe field ---- */
  const wire = new THREE.Mesh(
    new THREE.IcosahedronGeometry(3.6, 1),
    new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.04 })
  );
  scene.add(wire);

  clock = new THREE.Clock();
  state.ready = true;

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight, false);
  });

  function tick() {
    if (!isVisible) { frameId = requestAnimationFrame(tick); return; }
    const dt = clock.getDelta();
    const elapsed = clock.getElapsedTime();
    state.frame++;

    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;

    points.rotation.y = elapsed * 0.08 + mouse.x * 0.4;
    points.rotation.x = Math.sin(elapsed * 0.05) * 0.12 + mouse.y * 0.2;

    linesGroup.rotation.z = elapsed * 0.02;
    linesGroup.children.forEach((line, idx) => {
      line.rotation.z += line.userData.speed * dt * (idx % 2 ? 1 : -1);
    });

    wire.rotation.y = -elapsed * 0.04;
    wire.rotation.x = elapsed * 0.02;

    pointsMat.uniforms.uTime.value = elapsed;
    pointsMat.uniforms.uPointer.value.set(mouse.x, mouse.y);

    renderer.render(scene, camera);
    frameId = requestAnimationFrame(tick);
  }
  frameId = requestAnimationFrame(tick);
}

addEventListener('pointermove', (e) => {
  mouse.tx = (e.clientX / innerWidth) * 2 - 1;
  mouse.ty = -((e.clientY / innerHeight) * 2 - 1);
}, { passive: true });

addEventListener('pointerleave', () => { mouse.tx = 0; mouse.ty = 0; });

document.addEventListener('visibilitychange', () => { isVisible = !document.hidden; });

if (reducedMotion) {
  startFallback();
} else {
  startThree().catch((err) => {
    console.warn('[stage] failed to start Three.js scene.', err);
    startFallback();
  });
}

window.__stage = {
  pause() { if (frameId) cancelAnimationFrame(frameId); frameId = null; },
  state,
};