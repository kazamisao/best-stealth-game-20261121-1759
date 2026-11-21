// The screenshot scenes behind ?shot=start|play|applause|win. Each one plays
// the real rules forward from a fresh world, steered by a simple autopilot
// (score the eight directions by distance to the goal, heavily penalising any
// step into a guard's cone), so the frame is what a real game looks like and
// the same seed always gives the same frame.
import { FIELD, PLAYER, STEP } from './config.js';
import { hasLineOfSight, pointInCone } from './geometry.js';
import { EVENT_CAUGHT, EVENT_LEVEL_WON } from './world.js';
import { SCREEN_CAUGHT, SCREEN_LEVEL, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 2;
const APPLAUSE_AT_SECONDS = 6;
const WIN_LIMIT_SECONDS = 120;
const DIRECTIONS = [
  [0, -1], [1, -1], [1, 0], [1, 1],
  [0, 1], [-1, 1], [-1, 0], [-1, -1],
];

function inDanger(state, x, y) {
  let penalty = 0;
  for (const guard of state.guards) {
    const seen = pointInCone(x, y, guard.x, guard.y, guard.dir, guard.range, guard.halfAngle)
      && hasLineOfSight(guard.x, guard.y, x, y, [...state.crates, ...state.curtains]);
    if (seen) penalty += 1000;
    const dist = Math.hypot(x - guard.x, y - guard.y);
    if (dist < guard.range + 40) penalty += 300 * (1 - dist / (guard.range + 40));
  }
  for (const spot of state.spotlights) {
    // A spotlight is a risk, not a wall: a small penalty lets the pilot cross
    // one when the goal lies inside it, as the evidence does in Act III.
    if (Math.hypot(x - spot.x, y - spot.y) < spot.r) penalty += 40;
  }
  for (const crate of state.crates) {
    if (x > crate.x - PLAYER.radius && x < crate.x + crate.w + PLAYER.radius
      && y > crate.y - PLAYER.radius && y < crate.y + crate.h + PLAYER.radius) penalty += 1000;
  }
  return penalty;
}

/** The autopilot's one step: walk toward the goal, never into a cone. */
function autopilot(state) {
  const goal = state.evidence.collected ? state.exit : state.evidence;
  const goalX = state.evidence.collected ? goal.x + goal.w / 2 : goal.x;
  const goalY = state.evidence.collected ? goal.y + goal.h / 2 : goal.y;
  const p = state.player;
  const reach = PLAYER.walkSpeed * 0.25;
  let best = { dx: 0, dy: 0 };
  let bestScore = Infinity;
  for (const [dx, dy] of DIRECTIONS) {
    const x = p.x + dx * reach;
    const y = p.y + dy * reach;
    const score = Math.hypot(goalX - x, goalY - y) + inDanger(state, x, y);
    if (score < bestScore) {
      bestScore = score;
      best = { dx, dy };
    }
  }
  // Stand still when the goal is reached or every way is watched.
  const dist = Math.hypot(goalX - p.x, goalY - p.y);
  if (dist < 24) return { dx: 0, dy: 0, run: false, applause: false };
  const applause = state.guards.some((g) => g.suspicion > 0.35) && state.applause.cooldown <= 0;
  return { dx: best.dx, dy: best.dy, run: false, applause };
}

/**
 * Set `world` to the named scene (start, play, applause or win; any other name
 * is start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  const state = world.state;
  if (name !== 'play' && name !== 'applause' && name !== 'win') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, { dx: 0, dy: 0, run: false, applause: false });
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'win') {
    for (let index = 0; index < WIN_LIMIT_SECONDS / STEP; index += 1) {
      const events = world.step(STEP, autopilot(state));
      if (events & EVENT_LEVEL_WON) return { screen: SCREEN_LEVEL, best: 1 };
      if (events & EVENT_CAUGHT) return { screen: SCREEN_CAUGHT, best: 0 };
    }
    return { screen: SCREEN_PLAY, best: 0 };
  }
  const limit = name === 'applause' ? APPLAUSE_AT_SECONDS : PLAY_SECONDS;
  for (let index = 0; index < limit / STEP; index += 1) {
    const events = world.step(STEP, autopilot(state));
    if (events & EVENT_CAUGHT) return { screen: SCREEN_CAUGHT, best: 0 };
    if (events & EVENT_LEVEL_WON) return { screen: SCREEN_LEVEL, best: 1 };
  }
  if (name === 'applause') {
    // Clap now, while the guards are watching: the frame shows them turned.
    world.step(STEP, { dx: 0, dy: 0, run: false, applause: true });
    for (let index = 0; index < 1.5 / STEP; index += 1) {
      world.step(STEP, { dx: 0, dy: 0, run: false, applause: false });
    }
    return { screen: SCREEN_PLAY, best: 0 };
  }
  return { screen: SCREEN_PLAY, best: 0 };
}
