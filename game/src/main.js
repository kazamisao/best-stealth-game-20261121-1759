// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between six screens: title, play,
// paused, caught, act complete and curtain call (all three acts won).
//
// ?seed=N fixes the random seed. ?level=0|1|2 starts at that act.
// ?shot=start|play|applause|win (with &seed=N) stages that scene instead of
// running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, LEVELS, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_APPLAUSE, EVENT_CAUGHT, EVENT_EVIDENCE, EVENT_LEVEL_WON } from './world.js';
import { ACTION_APPLAUSE, ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import {
  SCREEN_CAUGHT, SCREEN_LEVEL, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, createRenderer,
} from './render.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);
const levelParam = Number.parseInt(params.get('level') ?? '', 10);
const startLevel = Number.isInteger(levelParam) && levelParam >= 0 && levelParam < LEVELS.length ? levelParam : 0;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();
let world = createWorld(createRandom(seed), startLevel);
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, world.state.elapsed);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let pendingApplause = false;

  // Screen readers (and anyone watching the page's text) hear the screen changes and each event.
  function announce(message) {
    status.textContent = message;
  }

  function startAct(level) {
    world = createWorld(createRandom(seed), level);
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Playing ${world.state.levelName}. Steal the evidence, then reach the exit unseen.`);
  }

  function startGame() {
    startAct(0);
  }

  function nextAct() {
    if (world.state.level + 1 < LEVELS.length) {
      startAct(world.state.level + 1);
    } else {
      screen = SCREEN_WIN;
      const cleared = LEVELS.length;
      if (cleared > best) {
        best = cleared;
        saveBest(best);
      }
      announce('Curtain call. You cleared every act unseen.');
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (actions & ACTION_APPLAUSE && screen === SCREEN_PLAY) pendingApplause = true;
    if (actions & ACTION_CONFIRM) {
      audio.unlock();
      if (screen === SCREEN_TITLE || screen === SCREEN_WIN) startGame();
      else if (screen === SCREEN_CAUGHT) startAct(world.state.level);
      else if (screen === SCREEN_LEVEL) nextAct();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { dx: 0, dy: 0, run: false, applause: false });
      if (world.state.status === 'caught') world.reset();
      return;
    }
    const direction = input.direction();
    const moving = direction.dx !== 0 || direction.dy !== 0;
    const events = world.step(STEP, {
      dx: direction.dx,
      dy: direction.dy,
      run: input.run(),
      applause: pendingApplause,
    });
    pendingApplause = false;
    audio.step(input.run(), moving);
    if (events & EVENT_APPLAUSE) audio.applause();
    if (events & EVENT_EVIDENCE) {
      audio.evidence();
      announce('Evidence stolen. Reach the green exit.');
    }
    if (events & EVENT_CAUGHT) {
      audio.alarm();
      screen = SCREEN_CAUGHT;
      announce('Caught! A guard spotted you in the open.');
    } else if (events & EVENT_LEVEL_WON) {
      audio.levelWon();
      screen = SCREEN_LEVEL;
      announce(`${world.state.levelName} complete. You slipped out unseen.`);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, world.state.elapsed);
  }

  // Leaving the tab pauses a running game rather than letting guards close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Last Applause. Press Space or click to begin.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
