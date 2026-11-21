// The game's rules and state, with no drawing and no browser in it: the
// saboteur, the patrolling gold-masked guards and their vision cones, the prop
// crates and curtains that block sight, the stage spotlights, the applause
// that turns every guard toward the stage, the scene changes, and the win and
// lose flow. step() advances one fixed step and returns what happened as bit
// flags, so the caller can react without the world knowing about screens or
// sound. Nothing here allocates after createWorld returns.
import { APPLAUSE, FIELD, GUARD, LEVELS, PLAYER, SCENE_INTERVAL } from './config.js';
import { hasLineOfSight, pointInCone } from './geometry.js';

export const EVENT_EVIDENCE = 1;
export const EVENT_CAUGHT = 2;
export const EVENT_LEVEL_WON = 4;
export const EVENT_SCENE = 8;
export const EVENT_APPLAUSE = 16;

function angleDiff(a, b) {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

function circleHitsRect(x, y, radius, rect) {
  const cx = Math.max(rect.x, Math.min(x, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(y, rect.y + rect.h));
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy < radius * radius;
}

export function createWorld(random, levelIndex) {
  const level = LEVELS[levelIndex] ?? LEVELS[0];
  function buildState() {
    return {
      level: levelIndex,
      levelName: level.name,
      status: 'play', // play | caught | levelWon
      elapsed: 0,
      sceneTimer: SCENE_INTERVAL,
      sceneChanges: 0,
      applausesUsed: 0,
      player: { x: level.spawn.x, y: level.spawn.y },
      evidence: { x: level.evidence.x, y: level.evidence.y, collected: false },
      exit: { ...level.exit },
      crates: level.crates.map((c) => ({ ...c })),
      curtains: level.curtains.map((c) => ({ ...c })),
      spotlights: level.spotlights.map((s) => ({ ...s })),
      guards: level.guards.map((g) => ({
        x: g.x,
        y: g.y,
        dir: g.dir,
        speed: g.speed,
        range: g.range,
        halfAngle: g.halfAngle,
        waypoints: g.waypoints.map((w) => ({ ...w })),
        wpIndex: 0,
        suspicion: 0,
        mode: 'patrol', // patrol | investigate | distracted
        pauseTimer: 0,
        lookTimer: 0,
        searchTimer: 0,
        targetX: g.x,
        targetY: g.y,
        seePlayer: false,
      })),
      applause: { active: 0, cooldown: 0 },
    };
  }

  const state = buildState();

  function reset() {
    const fresh = buildState();
    Object.keys(state).forEach((key) => {
      state[key] = fresh[key];
    });
  }

  /** Rects that block a guard's sight: crates always, curtains only while closed. */
  function sightBlockers() {
    return [...state.crates, ...state.curtains];
  }

  function playerLit() {
    for (const spot of state.spotlights) {
      const dx = state.player.x - spot.x;
      const dy = state.player.y - spot.y;
      if (dx * dx + dy * dy < spot.r * spot.r) return true;
    }
    return false;
  }

  function movePlayer(dx, dy, run, dt) {
    const speed = run ? PLAYER.runSpeed : PLAYER.walkSpeed;
    const len = Math.hypot(dx, dy);
    if (len === 0) return;
    const nx = (dx / len) * speed * dt;
    const ny = (dy / len) * speed * dt;
    const p = state.player;
    const r = PLAYER.radius;
    const tryX = Math.max(r, Math.min(FIELD.width - r, p.x + nx));
    if (!state.crates.some((c) => circleHitsRect(tryX, p.y, r, c))) p.x = tryX;
    const tryY = Math.max(r, Math.min(FIELD.height - r, p.y + ny));
    if (!state.crates.some((c) => circleHitsRect(p.x, tryY, r, c))) p.y = tryY;
  }

  function moveGuardToward(guard, tx, ty, speed, dt) {
    const dx = tx - guard.x;
    const dy = ty - guard.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 6) return true;
    const step = Math.min(dist, speed * dt);
    const mx = (dx / dist) * step;
    const my = (dy / dist) * step;
    // Axis-separated, like the player: crates are solid for guards too, so an
    // investigating guard stops at a crate instead of phasing through it.
    const r = 15;
    if (!state.crates.some((c) => circleHitsRect(guard.x + mx, guard.y, r, c))) guard.x += mx;
    if (!state.crates.some((c) => circleHitsRect(guard.x, guard.y + my, r, c))) guard.y += my;
    guard.dir = Math.atan2(dy, dx);
    return Math.hypot(tx - guard.x, ty - guard.y) < 6;
  }

  function updateGuard(guard, dt, lit, running) {
    const p = state.player;
    if (state.applause.active > 0) {
      // The audience roars: every guard turns to the stage and stops watching.
      guard.mode = 'distracted';
      const want = Math.atan2(100 - guard.y, FIELD.width / 2 - guard.x);
      guard.dir += angleDiff(guard.dir, want) * Math.min(1, dt * 4);
      guard.suspicion = Math.max(0, guard.suspicion - GUARD.decayRate * 2 * dt);
      guard.seePlayer = false;
      return 0;
    }
    // The applause is over: a distracted guard goes straight back on patrol.
    if (guard.mode === 'distracted') guard.mode = 'patrol';

    const inCone = pointInCone(p.x, p.y, guard.x, guard.y, guard.dir, guard.range, guard.halfAngle);
    const seen = inCone && hasLineOfSight(guard.x, guard.y, p.x, p.y, sightBlockers());
    guard.seePlayer = seen;
    if (seen) {
      let rate = GUARD.seeRate;
      if (lit) rate *= GUARD.litMultiplier;
      if (running) rate *= GUARD.runMultiplier;
      guard.suspicion += rate * dt;
      guard.targetX = p.x;
      guard.targetY = p.y;
      if (guard.suspicion >= GUARD.investigateAt) {
        guard.mode = 'investigate';
        guard.searchTimer = GUARD.searchTime;
      }
      if (guard.suspicion >= 1) {
        guard.suspicion = 1;
        return EVENT_CAUGHT;
      }
      return 0;
    }

    guard.suspicion = Math.max(0, guard.suspicion - GUARD.decayRate * dt);

    // Running footsteps carry: a guard close enough walks over to look.
    if (running) {
      const dist = Math.hypot(p.x - guard.x, p.y - guard.y);
      if (dist < PLAYER.noiseRadius) {
        guard.mode = 'investigate';
        guard.searchTimer = GUARD.searchTime;
        guard.targetX = p.x;
        guard.targetY = p.y;
      }
    }

    if (guard.mode === 'investigate') {
      if (guard.lookTimer > 0) {
        guard.lookTimer -= dt;
        guard.dir += dt * 1.5; // scans the room while looking around
        if (guard.lookTimer <= 0) {
          guard.mode = 'patrol';
          guard.suspicion = Math.min(guard.suspicion, 0.4);
        }
        return 0;
      }
      // Give up the search after a while instead of pushing at a wall forever.
      guard.searchTimer -= dt;
      if (guard.searchTimer <= 0) {
        guard.lookTimer = GUARD.lookTime;
        return 0;
      }
      if (moveGuardToward(guard, guard.targetX, guard.targetY, guard.speed * 1.15, dt)) {
        guard.lookTimer = GUARD.lookTime;
      }
      return 0;
    }

    // Patrol: walk the waypoints, waiting a beat at each one.
    if (guard.mode === 'patrol') {
      if (guard.pauseTimer > 0) {
        guard.pauseTimer -= dt;
        if (guard.pauseTimer <= 0) guard.wpIndex = (guard.wpIndex + 1) % guard.waypoints.length;
        return 0;
      }
      const wp = guard.waypoints[guard.wpIndex];
      if (moveGuardToward(guard, wp.x, wp.y, guard.speed, dt)) guard.pauseTimer = GUARD.pauseTime;
    }
    return 0;
  }

  function sceneChange() {
    for (const spot of state.spotlights) {
      const { x, y } = spot;
      spot.x = spot.altX;
      spot.y = spot.altY;
      spot.altX = x;
      spot.altY = y;
    }
    for (const curtain of state.curtains) curtain.open = !curtain.open;
    state.sceneChanges += 1;
  }

  /**
   * One fixed step. `input` is { dx, dy, run, applause } with dx/dy in [-1, 1].
   * Returns EVENT_* bit flags for what happened this step.
   */
  function step(dt, input) {
    if (state.status !== 'play') return 0;
    let events = 0;
    state.elapsed += dt;

    if (input.applause && state.applause.cooldown <= 0) {
      state.applause.active = APPLAUSE.duration;
      state.applause.cooldown = APPLAUSE.cooldown;
      state.applausesUsed += 1;
      events |= EVENT_APPLAUSE;
    }
    if (state.applause.active > 0) state.applause.active = Math.max(0, state.applause.active - dt);
    if (state.applause.cooldown > 0) state.applause.cooldown = Math.max(0, state.applause.cooldown - dt);

    state.sceneTimer -= dt;
    if (state.sceneTimer <= 0) {
      state.sceneTimer += SCENE_INTERVAL;
      sceneChange();
      events |= EVENT_SCENE;
    }

    movePlayer(input.dx ?? 0, input.dy ?? 0, input.run ?? false, dt);

    // The evidence, then the exit: reaching the door with the evidence wins.
    const p = state.player;
    if (!state.evidence.collected) {
      const dx = p.x - state.evidence.x;
      const dy = p.y - state.evidence.y;
      if (dx * dx + dy * dy < (PLAYER.radius + 16) * (PLAYER.radius + 16)) {
        state.evidence.collected = true;
        events |= EVENT_EVIDENCE;
      }
    }
    const ex = state.exit;
    if (state.evidence.collected && p.x > ex.x && p.x < ex.x + ex.w && p.y > ex.y && p.y < ex.y + ex.h) {
      state.status = 'levelWon';
      return events | EVENT_LEVEL_WON;
    }

    const lit = playerLit();
    for (const guard of state.guards) {
      if (updateGuard(guard, dt, lit, input.run ?? false) & EVENT_CAUGHT) {
        state.status = 'caught';
        return events | EVENT_CAUGHT;
      }
    }
    return events;
  }

  return { state, reset, step };
}
