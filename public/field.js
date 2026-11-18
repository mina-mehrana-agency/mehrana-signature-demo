// Signature 4: the mouse effect, matched to nk.studio's hero.
// - A frosted grey disc (42px) trails the pointer; a small dot sits exactly on the tip.
//   Both live only inside this section, and the normal arrow stays, as on nk.studio.
// - Behind the words: a grey wireframe room with a fine floor mesh that dips into a bowl.
// - In front of the words: the client's object as a neon wireframe (nk.studio uses its slash;
//   here it is a cake), crossing the heading.
// - The whole scene turns slowly and slightly toward the pointer.
// - On first sight the floor rises into place and the cake drops in from above.
// 2D canvas only: about 10 KB instead of nk.studio's 1.5 MB 3D bundle.

const section = document.getElementById('custom');
const back = section.querySelector('.field__canvas--back');
const front = section.querySelector('.field__canvas--front');
const title = section.querySelector('.field__title');
const disc = section.querySelector('.field__disc');
const dot = section.querySelector('.field__dot');
const backContext = back.getContext('2d');
const frontContext = front.getContext('2d');

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

const CAMERA = { y: 4.5, z: -8, pitch: 0.1, fov: 50, center: 0.5 };
const PARALLAX = { yaw: 0.022, pitch: 0.012, damping: 0.03 }; // Slow follow, like nk.studio.
const DISC_FOLLOW = 0.2; // Share of the gap the disc closes per frame at 60 fps.
const FLOOR = { centerZ: 20, radius: 14, gap: 0.5, bowl: 2, bowlWidth: 6, rim: 1.6 };
const CAKE = { z: 8, size: 1.6, tilt: -0.1 };
const GREY = '120 120 124';
const NEON = '224 121 138';

const view = { width: 0, height: 0, ratio: 1, focal: 1 };
const camera = { yaw: 0, pitch: CAMERA.pitch, targetYaw: 0, targetPitch: CAMERA.pitch };
const cake = { x: 0, y: 1.2 };
const pointer = { x: 0, y: 0, inside: false };
const discAt = { x: 0, y: 0 };
let revealStart = 0;
let visible = false;
let frame = 0;
let last = performance.now();

function project(x, y, z) {
  const px = x;
  const py = y - CAMERA.y;
  const pz = z - CAMERA.z;
  const cosYaw = Math.cos(camera.yaw);
  const sinYaw = Math.sin(camera.yaw);
  const rx = px * cosYaw - pz * sinYaw;
  const rz = px * sinYaw + pz * cosYaw;
  const cosPitch = Math.cos(camera.pitch);
  const sinPitch = Math.sin(camera.pitch);
  const ry = py * cosPitch + rz * sinPitch;
  const depth = -py * sinPitch + rz * cosPitch;
  if (depth < 0.3) return null;
  return [view.width / 2 + (view.focal * rx) / depth, view.height * CAMERA.center - (view.focal * ry) / depth, depth];
}

// Places the cake so that, seen straight on, it crosses the middle of the heading.
function anchorCake() {
  const box = title.getBoundingClientRect();
  const host = section.getBoundingClientRect();
  const sx = box.left + box.width / 2 - host.left;
  const sy = box.top + box.height * 0.55 - host.top;
  const forward = CAKE.z - CAMERA.z;
  const cosPitch = Math.cos(CAMERA.pitch);
  const sinPitch = Math.sin(CAMERA.pitch);
  const target = -(sy - view.height * CAMERA.center) / view.focal; // ry / depth on screen.
  // ry = py*cos + f*sin, depth = -py*sin + f*cos; solve ry = target * depth for py.
  const py = (target * forward * cosPitch - forward * sinPitch) / (cosPitch + target * sinPitch);
  const depth = -py * sinPitch + forward * cosPitch;
  cake.x = ((sx - view.width / 2) / view.focal) * depth;
  cake.y = CAMERA.y + py;
}

function resize() {
  const box = section.getBoundingClientRect();
  view.ratio = Math.min(devicePixelRatio || 1, 2);
  view.width = box.width;
  view.height = box.height;
  for (const canvas of [back, front]) {
    canvas.width = Math.round(box.width * view.ratio);
    canvas.height = Math.round(box.height * view.ratio);
  }
  view.focal = view.height / 2 / Math.tan((CAMERA.fov * Math.PI) / 360);
  CAKE.size = box.width < 700 ? 0.85 : 1.6;
  anchorCake();
  draw(performance.now());
}

const easeOut = (t) => 1 - (1 - t) ** 3;
const easeOutBack = (t) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;
const clamp01 = (t) => Math.max(0, Math.min(1, t));

function revealState(now) {
  if (reduceMotion) return { floor: 1, cake: 1 };
  if (!revealStart) return { floor: 0, cake: 0 };
  const t = (now - revealStart) / 1000;
  return { floor: easeOut(clamp01(t / 0.55)), cake: clamp01((t - 0.32) / 0.75) };
}

// A dish: deep in the middle under the words, rising toward the rim.
function floorHeight(x, z) {
  const dz = z - FLOOR.centerZ;
  const r2 = x * x + dz * dz;
  return -FLOOR.bowl * Math.exp(-r2 / (2 * FLOOR.bowlWidth ** 2)) + FLOOR.rim * (r2 / FLOOR.radius ** 2);
}

function polyline(context, points, color) {
  context.beginPath();
  let pen = false;
  for (const point of points) {
    if (!point) {
      pen = false;
      continue;
    }
    if (pen) context.lineTo(point[0], point[1]);
    else context.moveTo(point[0], point[1]);
    pen = true;
  }
  context.strokeStyle = color;
  context.stroke();
}

// A big geodesic dome seen from inside: its long edges cross the whole section in every
// direction, which is what gives nk.studio's room its web of slanted lines.
const DOME = buildDome({ x: 0, y: -3, z: 16 }, 22);

function buildDome(center, radius) {
  const t = (1 + Math.sqrt(5)) / 2;
  let vertices = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
  let faces = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  // One subdivision: each triangle becomes four.
  const middle = new Map();
  const midpoint = (a, b) => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (!middle.has(key)) {
      vertices.push(vertices[a].map((value, i) => (value + vertices[b][i]) / 2));
      middle.set(key, vertices.length - 1);
    }
    return middle.get(key);
  };
  faces = faces.flatMap(([a, b, c]) => {
    const ab = midpoint(a, b);
    const bc = midpoint(b, c);
    const ca = midpoint(c, a);
    return [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]];
  });
  vertices = vertices.map((v) => {
    const length = Math.hypot(...v);
    // Tilted a little so no edge runs exactly level with the screen.
    const [x, y, z] = v.map((value) => value / length);
    const cos = Math.cos(0.35);
    const sin = Math.sin(0.35);
    return [center.x + (x * cos - z * sin) * radius, center.y + y * radius, center.z + (x * sin + z * cos) * radius];
  });
  const edges = new Set();
  for (const [a, b, c] of faces) for (const [p, q] of [[a, b], [b, c], [c, a]]) edges.add(p < q ? `${p}-${q}` : `${q}-${p}`);
  return [...edges]
    .map((key) => key.split('-').map((index) => vertices[Number(index)]))
    .filter(([p, q]) => p[1] > -1 && q[1] > -1); // Only the part above the floor.
}

function drawRoom(alpha) {
  backContext.strokeStyle = `rgb(${GREY} / ${0.2 * alpha})`;
  for (const [a, b] of DOME) {
    // Split each edge so the perspective bends correctly near the camera.
    const points = [];
    for (let i = 0; i <= 8; i += 1) points.push(project(...a.map((value, k) => value + ((b[k] - value) * i) / 8)));
    polyline(backContext, points, backContext.strokeStyle);
  }
}

function drawFloor(alpha, rise) {
  const { centerZ, radius, gap } = FLOOR;
  const fade = (x, z) => {
    const r = Math.hypot(x, z - centerZ) / radius;
    return clamp01(1 - r * r);
  };
  const lift = (1 - rise) * -3;
  const lines = (horizontal) => {
    for (let a = -radius; a <= radius; a += gap) {
      // Short pieces, so each line can fade out toward the edge of the floor.
      let previous = null;
      for (let b = -radius; b <= radius; b += gap / 1.5) {
        const x = horizontal ? b : a;
        const z = centerZ + (horizontal ? a : b);
        const strength = fade(x, z);
        const point = strength > 0 ? project(x, floorHeight(x, z) + lift, z) : null;
        if (point && previous) {
          backContext.beginPath();
          backContext.moveTo(previous[0], previous[1]);
          backContext.lineTo(point[0], point[1]);
          backContext.strokeStyle = `rgb(${GREY} / ${0.26 * strength * alpha})`;
          backContext.stroke();
        }
        previous = point;
      }
    }
  };
  lines(true);
  lines(false);
}

// Cake on a stand, meshed with diagonals so it reads as a wireframe model like nk.studio's slash.
function drawCake(drop) {
  const size = CAKE.size;
  const offsetY = (1 - easeOutBack(drop)) * 9;
  const cosTilt = Math.cos(CAKE.tilt);
  const sinTilt = Math.sin(CAKE.tilt);
  const point = (radius, angle, height) => {
    const lx = Math.cos(angle) * radius * size;
    const lz = Math.sin(angle) * radius * size;
    const ly = (height - 0.85) * size; // The middle of the cake is its pivot.
    return project(cake.x + lx * cosTilt - ly * sinTilt, cake.y + offsetY + lx * sinTilt + ly * cosTilt, CAKE.z + lz);
  };
  const segments = [];
  const addRing = (radius, height, steps) => {
    const points = [];
    for (let i = 0; i <= steps; i += 1) points.push(point(radius, (i / steps) * Math.PI * 2, height));
    segments.push(points);
  };
  const addLine = (a, b) => segments.push([a, b]);

  const tiers = [
    { radius: 1.55, bottom: 0.18, top: 1.05, ribs: 12 },
    { radius: 1.02, bottom: 1.05, top: 1.75, ribs: 9 },
  ];
  addRing(2.05, 0.1, 40);
  addRing(1.85, 0.18, 40);
  addRing(0.32, -0.6, 16);
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    addLine(point(0.32, angle, -0.6), point(0.2, angle, 0.1));
  }
  for (const tier of tiers) {
    const middle = (tier.bottom + tier.top) / 2;
    for (const height of [tier.bottom, middle, tier.top]) addRing(tier.radius, height, 36);
    for (let i = 0; i < tier.ribs; i += 1) {
      const a = (i / tier.ribs) * Math.PI * 2;
      const b = ((i + 1) / tier.ribs) * Math.PI * 2;
      addLine(point(tier.radius, a, tier.bottom), point(tier.radius, a, tier.top));
      addLine(point(tier.radius, a, i % 2 ? middle : tier.bottom), point(tier.radius, b, i % 2 ? tier.top : middle));
    }
    // Top face, meshed toward the middle.
    for (let i = 0; i < tier.ribs; i += 2) addLine(point(tier.radius, (i / tier.ribs) * Math.PI * 2, tier.top), point(0, 0, tier.top));
  }
  addLine(point(0, 0, 1.75), point(0, 0, 2.3));
  addLine(point(0.07, 0, 1.75), point(0.07, 0, 2.3));

  // Two faint shifted copies give the red/cyan lens fringe, then the neon line itself.
  frontContext.lineWidth = 1.2;
  for (const [shift, color] of [
    [-1, 'rgb(170 30 140 / 0.28)'],
    [1, 'rgb(0 190 200 / 0.22)'],
    [0, `rgb(${NEON} / 0.95)`],
  ]) {
    frontContext.save();
    frontContext.translate(shift, 0);
    for (const segment of segments) polyline(frontContext, segment, color);
    frontContext.restore();
  }
  const wick = point(0, 0, 2.3);
  if (wick) {
    const s = (view.focal * 0.1 * size) / wick[2];
    frontContext.fillStyle = `rgb(${NEON} / 0.95)`;
    frontContext.beginPath();
    frontContext.moveTo(wick[0], wick[1] - s * 2.2);
    frontContext.quadraticCurveTo(wick[0] + s, wick[1] - s * 0.6, wick[0], wick[1]);
    frontContext.quadraticCurveTo(wick[0] - s, wick[1] - s * 0.6, wick[0], wick[1] - s * 2.2);
    frontContext.fill();
  }
}

function draw(now) {
  const { floor, cake: drop } = revealState(now);
  for (const context of [backContext, frontContext]) {
    context.setTransform(view.ratio, 0, 0, view.ratio, 0, 0);
    context.clearRect(0, 0, view.width, view.height);
    context.lineWidth = 1;
  }
  drawRoom(floor);
  drawFloor(floor, floor);
  if (drop > 0) drawCake(drop);
}

function loop(now) {
  const seconds = Math.min(0.05, (now - last) / 1000);
  last = now;
  const frames = seconds * 60;

  const damping = 1 - (1 - PARALLAX.damping) ** frames;
  camera.yaw += (camera.targetYaw - camera.yaw) * damping;
  camera.pitch += (camera.targetPitch - camera.pitch) * damping;
  const turning = Math.abs(camera.targetYaw - camera.yaw) + Math.abs(camera.targetPitch - camera.pitch) > 0.0002;
  const revealing = revealStart > 0 && now - revealStart < 1300;
  if (turning || revealing) draw(now);

  // The disc trails the pointer; the dot sits on it.
  const follow = reduceMotion ? 1 : 1 - (1 - DISC_FOLLOW) ** frames;
  discAt.x += (pointer.x - discAt.x) * follow;
  discAt.y += (pointer.y - discAt.y) * follow;
  disc.style.transform = `translate3d(${discAt.x}px, ${discAt.y}px, 0)`;
  dot.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
  const chasing = Math.abs(pointer.x - discAt.x) + Math.abs(pointer.y - discAt.y) > 0.3;

  frame = visible && (turning || revealing || chasing) ? requestAnimationFrame(loop) : 0;
}

function wake() {
  if (!frame && visible) {
    last = performance.now();
    frame = requestAnimationFrame(loop);
  }
}

let clientPoint = null;
function placePointer() {
  if (!clientPoint) return;
  const box = section.getBoundingClientRect();
  pointer.x = clientPoint.x - box.left;
  pointer.y = clientPoint.y - box.top;
}

if (finePointer) {
  section.addEventListener('pointermove', (event) => {
    clientPoint = { x: event.clientX, y: event.clientY };
    placePointer();
    if (!pointer.inside) {
      pointer.inside = true;
      discAt.x = pointer.x;
      discAt.y = pointer.y;
      section.classList.add('is-pointing');
    }
    camera.targetYaw = (event.clientX / innerWidth - 0.5) * PARALLAX.yaw * 2;
    camera.targetPitch = CAMERA.pitch + (event.clientY / innerHeight - 0.5) * PARALLAX.pitch * 2;
    wake();
  });
  section.addEventListener('pointerleave', () => {
    pointer.inside = false;
    section.classList.remove('is-pointing');
  });
  window.addEventListener(
    'scroll',
    () => {
      if (!pointer.inside) return;
      placePointer();
      wake();
    },
    { passive: true },
  );
}

new IntersectionObserver(
  ([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !revealStart) revealStart = performance.now();
    wake();
  },
  { threshold: 0.25 },
).observe(section);

new ResizeObserver(resize).observe(section);
document.fonts?.ready.then(resize);
resize();
