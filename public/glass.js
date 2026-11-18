// Signature 1: liquid glass header, mega menu and demo dock.
// Chromium bends the picture behind each glass edge with an SVG displacement filter
// (method after React Bits' GlassSurface, MIT + Commons Clause). Safari and Firefox
// cannot run SVG filters in backdrop-filter, so they keep the frosted CSS glass.

const SVG_NS = 'http://www.w3.org/2000/svg';
const root = document.documentElement;
const nav = document.getElementById('nav');
const mega = document.getElementById('mega');
const dock = document.getElementById('dock');
const toggles = [...document.querySelectorAll('[data-mega-toggle]')];
const fineHover = matchMedia('(hover: hover) and (pointer: fine)').matches;

function canRefract() {
  const ua = navigator.userAgent;
  const webkit = /Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua);
  if (webkit || /Firefox/.test(ua)) return false;
  const probe = document.createElement('div');
  probe.style.backdropFilter = 'url(#probe)';
  return probe.style.backdropFilter !== '';
}

// Black page, red ramp left to right, blue ramp top to bottom, neutral grey middle:
// only the rim moves the picture behind it.
function displacementMap(width, height, radius) {
  const short = Math.min(width, height);
  const edge = short * 0.035;
  const soft = Math.min(10, short * 0.12); // A thin bar gets a thin bending rim.
  const svg = `<svg xmlns="${SVG_NS}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="r" x1="100%" y1="0%" x2="0%" y2="0%"><stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="red"/></linearGradient>
      <linearGradient id="b" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="blue"/></linearGradient>
      <filter id="s" filterUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}"><feGaussianBlur stdDeviation="${soft}"/></filter>
    </defs>
    <rect width="${width}" height="${height}" fill="black"/>
    <rect width="${width}" height="${height}" rx="${radius}" fill="url(#r)"/>
    <rect width="${width}" height="${height}" rx="${radius}" fill="url(#b)" style="mix-blend-mode:difference"/>
    <rect x="${edge}" y="${edge}" width="${width - edge * 2}" height="${height - edge * 2}" rx="${radius}" fill="hsl(0 0% 50% / 0.93)" filter="url(#s)"/>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function element(name, attributes = {}) {
  const node = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
}

// Three slightly different bends for red, green and blue give the faint rainbow edge of real glass.
function buildFilter(defs, id) {
  const filter = element('filter', { id, x: '0%', y: '0%', width: '100%', height: '100%', 'color-interpolation-filters': 'sRGB' });
  const image = element('feImage', { x: 0, y: 0, width: '100%', height: '100%', preserveAspectRatio: 'none', result: 'map' });
  filter.append(image);
  const channels = [
    ['red', '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0', 1],
    ['green', '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0', 0.94],
    ['blue', '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0', 0.88],
  ];
  const maps = channels.map(([name, matrix]) => {
    const map = element('feDisplacementMap', { in: 'SourceGraphic', in2: 'map', xChannelSelector: 'R', yChannelSelector: 'B', result: `d-${name}` });
    filter.append(map, element('feColorMatrix', { in: `d-${name}`, type: 'matrix', values: matrix, result: name }));
    return map;
  });
  filter.append(
    element('feBlend', { in: 'red', in2: 'green', mode: 'screen', result: 'rg' }),
    element('feBlend', { in: 'rg', in2: 'blue', mode: 'screen', result: 'out' }),
    element('feGaussianBlur', { in: 'out', stdDeviation: 0.6 }),
  );
  defs.append(filter);
  // The bend grows with the glass: a 58px bar moves its rim by about 13px, a big panel by more.
  return (url, short) => {
    image.setAttribute('href', url);
    maps.forEach((map, index) => map.setAttribute('scale', String(-Math.min(90, short * 0.45) * channels[index][2])));
  };
}

function setUpRefraction() {
  const host = element('svg', { class: 'lg-defs', 'aria-hidden': 'true', focusable: 'false' });
  const defs = element('defs');
  host.append(defs);
  document.body.append(host);

  document.querySelectorAll('[data-lg]').forEach((glass, index) => {
    const id = `lg-${index}`;
    const update = buildFilter(defs, id);
    const frost = glass.classList.contains('mega') ? 10 : 4;
    const refresh = () => {
      const { width, height } = glass.getBoundingClientRect();
      if (!width || !height) return;
      const radius = Math.min(parseFloat(getComputedStyle(glass).borderTopLeftRadius) || 0, height / 2);
      update(displacementMap(Math.round(width), Math.round(height), radius), Math.min(width, height));
      glass.style.backdropFilter = `url(#${id}) blur(${frost}px) saturate(170%)`;
    };
    new ResizeObserver(refresh).observe(glass);
    refresh();
  });
  root.classList.add('lg-refract');
}

if (canRefract()) setUpRefraction();

// The rim light follows the pointer across every glass surface.
if (fineHover) {
  const surfaces = [...document.querySelectorAll('.glass')];
  let frame = 0;
  let pointer = null;
  window.addEventListener(
    'pointermove',
    (event) => {
      pointer = event;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        surfaces.forEach((surface) => {
          const box = surface.getBoundingClientRect();
          if (box.bottom < -200 || box.top > innerHeight + 200) return;
          surface.style.setProperty('--lx', `${pointer.clientX - box.left}px`);
          surface.style.setProperty('--ly', `${pointer.clientY - box.top}px`);
        });
      });
    },
    { passive: true },
  );
}

// Glass pill that glides between the links in the bar.
const links = nav.querySelector('.nav__links');
const pill = nav.querySelector('.nav__pill');
function movePill(target) {
  if (!target) {
    pill.classList.remove('is-on');
    return;
  }
  pill.style.width = `${target.offsetWidth}px`;
  pill.style.transform = `translateX(${target.offsetLeft}px)`;
  pill.classList.add('is-on');
}
links.querySelectorAll('.nav__link').forEach((link) => {
  link.addEventListener('pointerenter', () => movePill(link));
  link.addEventListener('focus', () => movePill(link));
});
links.addEventListener('pointerleave', () => movePill(mega.classList.contains('is-open') ? toggles[0] : null));

// Mega menu: opens on hover (desktop) or click, closes on Escape, outside click or a link.
let closeTimer = 0;
function setMega(open) {
  clearTimeout(closeTimer);
  mega.classList.toggle('is-open', open);
  toggles.forEach((toggle) => toggle.setAttribute('aria-expanded', String(open)));
  if (!open && !links.matches(':hover')) movePill(null);
}
toggles.forEach((toggle) =>
  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    setMega(!mega.classList.contains('is-open'));
  }),
);
if (fineHover) {
  toggles[0].addEventListener('pointerenter', () => setMega(true));
  [toggles[0], mega].forEach((zone) => {
    zone.addEventListener('pointerleave', () => {
      closeTimer = setTimeout(() => setMega(false), 260);
    });
    zone.addEventListener('pointerenter', () => clearTimeout(closeTimer));
  });
}
mega.addEventListener('click', (event) => {
  if (event.target.closest('a')) setMega(false);
});
document.addEventListener('click', (event) => {
  if (!nav.contains(event.target)) setMega(false);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setMega(false);
});
document.querySelector('[data-open-mega]').addEventListener('click', () => {
  setTimeout(() => setMega(true), 450);
});

// Over light sections the glass turns milky; the dock marks the section in view.
const lightSections = [...document.querySelectorAll('[data-nav-light]')];
const dockLinks = [...dock.querySelectorAll('a')];
const targets = dockLinks.map((link) => document.querySelector(link.getAttribute('href')));
function underLine(section, y) {
  const box = section.getBoundingClientRect();
  return box.top <= y && box.bottom >= y;
}
function onScroll() {
  nav.classList.toggle('is-light', lightSections.some((section) => underLine(section, 40)));
  dock.classList.toggle('is-light', lightSections.some((section) => underLine(section, innerHeight - 40)));
  // Link 1 opens the menu rather than pointing at a section, so it is never marked.
  let current = -1;
  targets.forEach((target, index) => {
    if (index > 0 && target && target.getBoundingClientRect().top <= innerHeight * 0.5) current = index;
  });
  dockLinks.forEach((link, index) => link.classList.toggle('is-current', index === current));
}
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll);
onScroll();
