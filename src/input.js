import { WIDTH } from './game.js';
// Pointer Events only: a single stream covers mouse, pen and touch, so a tap can
// never be handled twice. Gameplay keys are ignored while a control has focus.
const TYPING = 'button,input,textarea,select,[contenteditable="true"]';
export function createInput(canvas, onLaunch = () => {}, onPause = () => {}, onFire = () => {}) {
  const keys = new Set();
  let activePointer = null;
  const left = () => keys.has('ArrowLeft') || keys.has('KeyA');
  const right = () => keys.has('ArrowRight') || keys.has('KeyD');
  const input = { pointer: null,
    get direction() { return Number(right()) - Number(left()); },
    reset() { keys.clear(); input.pointer = null; activePointer = null; } };
  window.addEventListener('keydown', event => {
    const onControl = event.target instanceof HTMLElement && event.target.matches(TYPING);
    if (['KeyP', 'Escape'].includes(event.code)) {
      // Escape on a focused control belongs to that control (close/cancel).
      if (event.code === 'Escape' && onControl) return;
      event.preventDefault(); if (!event.repeat) onPause(); return;
    }
    if (onControl) return;
    if (event.code === 'KeyF') { event.preventDefault(); if (!event.repeat) onFire(); return; }
    if (event.code === 'Space') {
      event.preventDefault(); if (!event.repeat) onLaunch(input.pointer); return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(event.code)) return;
    event.preventDefault(); keys.add(event.code); input.pointer = null;
  });
  window.addEventListener('keyup', event => keys.delete(event.code));
  window.addEventListener('blur', input.reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) input.reset(); });
  function setPointer(event) {
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width) return;
    // Clamp so a finger dragged off the canvas still parks the paddle at the edge.
    const ratio = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    input.pointer = ratio * WIDTH;
  }
  canvas.addEventListener('pointermove', event => {
    if (event.pointerType === 'mouse' || event.pointerId === activePointer) setPointer(event);
  });
  canvas.addEventListener('pointerdown', event => {
    // Secondary fingers steer nothing and must not re-launch or re-release.
    if (!event.isPrimary || event.button !== 0 || activePointer !== null) return;
    activePointer = event.pointerId;
    try { canvas.setPointerCapture(event.pointerId); } catch {}
    setPointer(event);
    onLaunch(input.pointer);
  });
  function release(event) {
    if (event.pointerId !== activePointer) return;
    activePointer = null;
    // Touch lifts leave no hover position; keyboard/mouse control resumes cleanly.
    if (event.pointerType !== 'mouse') input.pointer = null;
  }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('lostpointercapture', release);
  return input;
}
