// Keyboard and pointer input. Held keys give a steering direction and a run
// flag; one-shot presses (start, pause, applause) are queued as bit flags and
// taken once by the loop, so a press between two frames is never lost and never
// counted twice. Clicking the APPLAUSE strip at the bottom of the screen (or
// pressing E) triggers the applause instead of confirming.
import { FIELD } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_APPLAUSE = 4;
export const ACTION_MUTE = 8;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const APPLAUSE = new Set(['KeyE']);
const MUTE = new Set(['KeyM']);

export function createInput(canvas) {
  const held = { left: false, right: false, up: false, down: false, run: false };
  let actions = 0;

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) held.left = true;
    else if (RIGHT.has(event.code)) held.right = true;
    else if (UP.has(event.code)) held.up = true;
    else if (DOWN.has(event.code)) held.down = true;
    else if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') held.run = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (APPLAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_APPLAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) held.left = false;
    else if (RIGHT.has(event.code)) held.right = false;
    else if (UP.has(event.code)) held.up = false;
    else if (DOWN.has(event.code)) held.down = false;
    else if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') held.run = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    held.left = false;
    held.right = false;
    held.up = false;
    held.down = false;
    held.run = false;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / FIELD.width, rect.height / FIELD.height);
    const y = (event.clientY - rect.top - (rect.height - FIELD.height * scale) / 2) / scale;
    // The applause strip is the bottom 40 logical pixels of the field.
    if (y > FIELD.height - 40) actions |= ACTION_APPLAUSE;
    else actions |= ACTION_CONFIRM;
  });

  return {
    /** Steering direction as { dx, dy }, each in [-1, 1]. */
    direction() {
      return {
        dx: (held.right ? 1 : 0) - (held.left ? 1 : 0),
        dy: (held.down ? 1 : 0) - (held.up ? 1 : 0),
      };
    },
    run() {
      return held.run;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
