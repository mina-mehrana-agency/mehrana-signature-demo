// Signature 3: a deck of photos. The front photo can be dragged or flicked away; the ones
// behind step forward in depth, each showing a slightly different part of its picture,
// and a streak of light crosses the photo that arrives at the front.

const deck = document.querySelector('[data-deck]');
const cards = [...deck.querySelectorAll('.deck__card')];
const total = cards.length;
const current = document.querySelector('[data-deck-current]');
const caption = document.querySelector('.deck-caption');
const title = document.querySelector('[data-deck-title]');
const text = document.querySelector('[data-deck-text]');
const narrow = matchMedia('(max-width: 900px)');
const THRESHOLD = 70; // Pixels of drag that turn the page.

document.querySelector('[data-deck-total]').textContent = String(total).padStart(2, '0');

let active = 0;
let drag = null;

// Where a card sits for its distance from the front: 0 is the front, -1 has just left.
function pose(offset, pull) {
  const step = narrow.matches ? 0.09 : 0.2; // Share of the deck width between stacked cards.
  const width = deck.clientWidth;
  if (offset === -1) {
    return { x: -width * 0.75 + pull * width * 0.75, rotate: -9 + pull * 9, scale: 1, opacity: 1 - (1 - pull), shade: 1, shift: 6 };
  }
  const depth = Math.max(0, offset - pull);
  const visible = depth <= 2.2;
  return {
    x: depth * step * width,
    rotate: 0,
    rotateY: -depth * 9,
    scale: 1 - depth * 0.1,
    opacity: visible ? 1 : 0,
    shade: 1 - Math.min(depth, 2) * 0.24,
    shift: -depth * 6,
  };
}

function render(dragX = 0) {
  const width = deck.clientWidth;
  const pull = Math.max(-1, Math.min(1, -dragX / (width * 0.6)));
  cards.forEach((card, index) => {
    let offset = (index - active + total) % total;
    if (offset === total - 1) offset = -1;
    let p;
    if (offset === 0 && dragX) {
      // The front card follows the finger and tips a little.
      p = { x: dragX, rotate: dragX * 0.012, rotateY: 0, scale: 1, opacity: 1, shade: 1, shift: -dragX / width * 6 };
    } else if (offset === -1) {
      p = pose(-1, Math.max(0, -pull));
    } else {
      p = pose(offset, Math.max(0, pull));
    }
    card.style.zIndex = String(offset === -1 ? total + 1 : total - offset);
    card.style.transform = `translateX(${p.x}px) rotateY(${p.rotateY ?? 0}deg) rotate(${p.rotate}deg) scale(${p.scale})`;
    card.style.opacity = String(p.opacity);
    card.style.filter = `brightness(${p.shade})`;
    card.style.setProperty('--shift', `${p.shift}%`);
    card.setAttribute('aria-hidden', String(offset !== 0));
  });
}

function show(next) {
  active = (next + total) % total;
  const card = cards[active];
  current.textContent = String(active + 1).padStart(2, '0');
  caption.classList.add('is-swapping');
  setTimeout(() => {
    title.textContent = card.dataset.title;
    text.textContent = card.dataset.text;
    caption.classList.remove('is-swapping');
  }, 220);
  card.classList.remove('is-arriving');
  void card.offsetWidth;
  card.classList.add('is-arriving');
  render();
}

deck.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x: 0, moved: false };
});

deck.addEventListener('pointermove', (event) => {
  if (!drag || event.pointerId !== drag.id) return;
  const dx = event.clientX - drag.startX;
  const dy = event.clientY - drag.startY;
  if (!drag.moved) {
    if (Math.abs(dx) < 6) return;
    if (Math.abs(dy) > Math.abs(dx)) {
      drag = null; // A vertical swipe is a page scroll.
      return;
    }
    drag.moved = true;
    deck.setPointerCapture(event.pointerId);
    deck.classList.add('is-dragging');
  }
  drag.x = dx;
  render(dx);
});

function endDrag(event) {
  if (!drag || event.pointerId !== drag.id) return;
  const { x, moved } = drag;
  drag = null;
  deck.classList.remove('is-dragging');
  if (!moved) return;
  if (x < -THRESHOLD) show(active + 1);
  else if (x > THRESHOLD) show(active - 1);
  else render();
}
deck.addEventListener('pointerup', endDrag);
deck.addEventListener('pointercancel', endDrag);

document.querySelector('[data-deck-prev]').addEventListener('click', () => show(active - 1));
document.querySelector('[data-deck-next]').addEventListener('click', () => show(active + 1));
deck.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowRight') show(active + 1);
  if (event.key === 'ArrowLeft') show(active - 1);
});
window.addEventListener('resize', () => render());
narrow.addEventListener('change', () => render());

render();
