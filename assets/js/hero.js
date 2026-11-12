// Hero: a slowly drifting cluster of translucent terminal panes that tilts toward the pointer.
// The CSS picture under the canvas stays when WebGL, the three.js module or motion is unavailable.
const stage = document.querySelector('.hero-stage');
const canvas = document.getElementById('hero-canvas');

const skip = new URLSearchParams(location.search).has('static')
  || matchMedia('(prefers-reduced-motion: reduce)').matches
  || !(() => { try { const c = document.createElement('canvas'); return c.getContext('webgl2') || c.getContext('webgl'); } catch { return null; } })();

if (stage && canvas && !skip) start().catch(() => stage.classList.remove('live'));

async function start() {
  const THREE = await import('three');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  const group = new THREE.Group();
  scene.add(group);

  const accents = [0x6ea8ff, 0xa78bfa, 0x65d9f4];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  function rounded(w, h, r) {
    const s = new THREE.Shape();
    s.moveTo(-w / 2 + r, -h / 2);
    s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    return s;
  }

  const spots = [[-1.7, 0.9, -1.2], [0.4, 1.3, -2.2], [1.8, 0.2, -0.6], [-0.6, -0.4, 0.4], [1.0, -1.3, -1.4], [-2.0, -1.2, -2.4], [0.2, 0.2, -3.4]];
  const panes = spots.map(([x, y, z], i) => {
    const w = 1.7 + rnd() * 0.9, h = w * (0.58 + rnd() * 0.12);
    const color = accents[i % 3];
    const shape = rounded(w, h, 0.09);
    const pane = new THREE.Group();
    pane.add(new THREE.Mesh(new THREE.ShapeGeometry(shape, 6),
      new THREE.MeshBasicMaterial({ color: 0x0e1828, transparent: true, opacity: 0.62, depthWrite: false })));
    const pts = shape.getPoints(6);
    const edge = new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(p.x, p.y, 0.001)));
    pane.add(new THREE.LineLoop(edge, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending })));
    const halo = new THREE.LineLoop(edge, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending }));
    halo.scale.setScalar(1.025);
    pane.add(halo);
    // title bar and a few "output" lines
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.005), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 }));
    bar.position.set(0, h / 2 - 0.16, 0.002);
    pane.add(bar);
    const lines = 3 + Math.floor(rnd() * 3);
    for (let k = 0; k < lines; k++) {
      const lw = (0.25 + rnd() * 0.55) * w;
      const ln = new THREE.Mesh(new THREE.PlaneGeometry(lw, 0.045),
        new THREE.MeshBasicMaterial({ color: k === 0 ? color : 0x9aaec7, transparent: true, opacity: k === 0 ? 0.8 : 0.28 }));
      ln.position.set(-w / 2 + 0.16 + lw / 2, h / 2 - 0.34 - k * 0.15, 0.002);
      pane.add(ln);
    }
    pane.position.set(x, y, z);
    pane.rotation.set((rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.6, (rnd() - 0.5) * 0.12);
    pane.userData = { y, phase: rnd() * Math.PI * 2 };
    group.add(pane);
    return pane;
  });

  const target = { x: 0, y: 0 }, tilt = { x: 0, y: 0 };
  addEventListener('pointermove', e => {
    target.x = e.clientX / innerWidth - 0.5;
    target.y = e.clientY / innerHeight - 0.5;
  }, { passive: true });

  function resize() {
    const { width, height } = stage.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.z = width < 600 ? 13 : 10.5;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  const clock = new THREE.Clock();
  let shown = false, t = 0;
  function frame() {
    t += Math.min(clock.getDelta(), 0.05); // no jump after a pause
    tilt.x += (target.x - tilt.x) * 0.04;
    tilt.y += (target.y - tilt.y) * 0.04;
    group.rotation.y = Math.sin(t * 0.12) * 0.22 + tilt.x * 0.5;
    group.rotation.x = Math.cos(t * 0.09) * 0.06 + tilt.y * 0.3;
    for (const p of panes) p.position.y = p.userData.y + Math.sin(t * 0.5 + p.userData.phase) * 0.09;
    renderer.render(scene, camera);
    if (!shown) { shown = true; stage.classList.add('live'); }
  }

  // Render only while the hero is on screen and the tab is visible.
  let onScreen = true;
  const sync = () => renderer.setAnimationLoop(onScreen && !document.hidden ? frame : null);
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; sync(); }).observe(stage);
  document.addEventListener('visibilitychange', sync);
  sync();
}
