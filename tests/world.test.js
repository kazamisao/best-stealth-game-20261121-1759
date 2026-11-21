// Tests for LAST APPLAUSE world logic (pure, no browser): detection cones,
// line-of-sight cover, applause distraction, scene changes, win/lose flow.
// Written BEFORE the implementation, per test_driven_development.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRandom } from '../game/src/random.js';
import { pointInCone, segmentHitsRect } from '../game/src/geometry.js';
import { createWorld, EVENT_CAUGHT, EVENT_EVIDENCE, EVENT_LEVEL_WON } from '../game/src/world.js';

function freshWorld(level = 0) {
  return createWorld(createRandom(7), level);
}

function stepMany(world, seconds, input = { dx: 0, dy: 0, run: false, applause: false }) {
  let events = 0;
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i += 1) events |= world.step(1 / 60, input);
  return events;
}

describe('geometry: pointInCone', () => {
  it('sees a point straight ahead inside range', () => {
    assert.equal(pointInCone(100, 0, 0, 0, 0, 220, 0.6), true);
  });
  it('does not see a point behind the guard', () => {
    assert.equal(pointInCone(-100, 0, 0, 0, 0, 220, 0.6), false);
  });
  it('does not see a point beyond range', () => {
    assert.equal(pointInCone(300, 0, 0, 0, 0, 220, 0.6), false);
  });
  it('does not see a point outside the cone angle', () => {
    assert.equal(pointInCone(100, 150, 0, 0, 0, 220, 0.6), false);
  });
});

describe('geometry: segmentHitsRect', () => {
  it('hits when the segment crosses the rectangle', () => {
    assert.equal(segmentHitsRect(0, 0, 200, 0, { x: 90, y: -20, w: 20, h: 40 }), true);
  });
  it('misses when the segment passes beside the rectangle', () => {
    assert.equal(segmentHitsRect(0, 0, 200, 0, { x: 90, y: 50, w: 20, h: 40 }), false);
  });
  it('hits when the segment runs exactly along the rectangle edge', () => {
    assert.equal(segmentHitsRect(0, 0, 200, 0, { x: 90, y: 0, w: 20, h: 40 }), true);
  });
});

describe('world: guard detection', () => {
  it('suspicion rises when the player stands openly inside a cone', () => {
    const world = freshWorld();
    const guard = world.state.guards[0];
    // Place the player straight ahead of the guard, close, in the open.
    world.state.player.x = guard.x + Math.cos(guard.dir) * 100;
    world.state.player.y = guard.y + Math.sin(guard.dir) * 100;
    const before = guard.suspicion;
    stepMany(world, 1);
    assert.ok(guard.suspicion > before, `suspicion ${guard.suspicion} did not rise from ${before}`);
  });

  it('a prop crate between guard and player blocks detection', () => {
    const world = freshWorld();
    const guard = world.state.guards[0];
    const crate = world.state.crates[0];
    // Guard on one side of the crate, player on the other, on the guard's facing line.
    guard.x = crate.x - 120;
    guard.y = crate.y + crate.h / 2;
    guard.dir = 0; // facing +x, straight at the crate and the player behind it
    world.state.player.x = crate.x + crate.w + 60;
    world.state.player.y = crate.y + crate.h / 2;
    stepMany(world, 1);
    assert.equal(guard.suspicion, 0);
  });

  it('suspicion reaches full and the player is caught if they stay in the open', () => {
    const world = freshWorld();
    const guard = world.state.guards[0];
    world.state.player.x = guard.x + Math.cos(guard.dir) * 80;
    world.state.player.y = guard.y + Math.sin(guard.dir) * 80;
    const events = stepMany(world, 6);
    assert.ok(events & EVENT_CAUGHT, 'expected EVENT_CAUGHT');
    assert.equal(world.state.status, 'caught');
  });
});

describe('world: applause', () => {
  it('applause distracts a guard toward the stage for its duration', () => {
    const world = freshWorld();
    const guard = world.state.guards[0];
    world.step(1 / 60, { dx: 0, dy: 0, run: false, applause: true });
    assert.equal(guard.mode, 'distracted');
    assert.ok(world.state.applause.active > 0, 'applause should be active');
  });

  it('applause cannot be retriggered while on cooldown', () => {
    const world = freshWorld();
    world.step(1 / 60, { dx: 0, dy: 0, run: false, applause: true });
    const firstActive = world.state.applause.active;
    stepMany(world, 1);
    world.step(1 / 60, { dx: 0, dy: 0, run: false, applause: true });
    // Still the first applause winding down, not a fresh full-duration one.
    assert.ok(world.state.applause.active <= firstActive, 'cooldown must block a fresh applause');
  });
});

describe('world: scene change', () => {
  it('a scene change moves the stage spotlights', () => {
    const world = freshWorld();
    const before = world.state.spotlights.map((s) => `${s.x},${s.y}`).join('|');
    // Run past the first scene-change timer.
    stepMany(world, 25);
    const after = world.state.spotlights.map((s) => `${s.x},${s.y}`).join('|');
    assert.notEqual(after, before, 'spotlights must move on a scene change');
    assert.ok(world.state.sceneChanges >= 1, 'at least one scene change should have happened');
  });
});

describe('world: win flow', () => {
  it('reaching the exit without the evidence does not win the level', () => {
    const world = freshWorld();
    world.state.player.x = world.state.exit.x + 5;
    world.state.player.y = world.state.exit.y + 5;
    const events = stepMany(world, 0.5);
    assert.equal(events & EVENT_LEVEL_WON, 0);
    assert.equal(world.state.status, 'play');
  });

  it('collecting the evidence then reaching the exit wins the level', () => {
    const world = freshWorld();
    world.state.player.x = world.state.evidence.x;
    world.state.player.y = world.state.evidence.y;
    let events = stepMany(world, 0.5);
    assert.ok(events & EVENT_EVIDENCE, 'expected EVENT_EVIDENCE');
    world.state.player.x = world.state.exit.x + 5;
    world.state.player.y = world.state.exit.y + 5;
    events = stepMany(world, 0.5);
    assert.ok(events & EVENT_LEVEL_WON, 'expected EVENT_LEVEL_WON');
    assert.equal(world.state.status, 'levelWon');
  });
});

describe('world: movement collision', () => {
  it('the player cannot walk through a prop crate', () => {
    const world = freshWorld();
    const crate = world.state.crates[0];
    world.state.player.x = crate.x - 30;
    world.state.player.y = crate.y + crate.h / 2;
    stepMany(world, 1, { dx: 1, dy: 0, run: false, applause: false });
    assert.ok(
      world.state.player.x + 14 <= crate.x + 0.5,
      `player crossed the crate: x=${world.state.player.x}, crate.x=${crate.x}`,
    );
  });
});

describe('world: noise', () => {
  it('running close to a guard makes it investigate the player', () => {
    const world = freshWorld();
    const guard = world.state.guards[0];
    // Put the player near the guard but outside its cone (behind it), running.
    world.state.player.x = guard.x - Math.cos(guard.dir) * 90;
    world.state.player.y = guard.y - Math.sin(guard.dir) * 90;
    stepMany(world, 1.5, { dx: 0, dy: 0, run: true, applause: false });
    assert.equal(guard.mode, 'investigate');
  });
});

describe('world: applause recovery (regression: guards froze after applause)', () => {
  it('a guard resumes patrol and moves again after the applause ends', () => {
    const world = freshWorld();
    const guard = world.state.guards[0];
    world.step(1 / 60, { dx: 0, dy: 0, run: false, applause: true });
    assert.equal(guard.mode, 'distracted');
    stepMany(world, 3.5); // applause lasts 3 s
    assert.equal(guard.mode, 'patrol');
    const x = guard.x;
    const y = guard.y;
    stepMany(world, 2);
    assert.ok(
      Math.hypot(guard.x - x, guard.y - y) > 20,
      `guard did not move after applause: stayed at (${guard.x}, ${guard.y})`,
    );
  });
});

describe('world: investigating guards respect crates (regression: phased through)', () => {
  it('an investigating guard cannot enter a prop crate', () => {
    const world = freshWorld();
    const guard = world.state.guards[0];
    const crate = world.state.crates[0];
    // Guard on one side of the crate, ordered to investigate the other side.
    guard.x = crate.x - 100;
    guard.y = crate.y + crate.h / 2;
    guard.mode = 'investigate';
    guard.searchTimer = 6;
    guard.targetX = crate.x + crate.w + 100;
    guard.targetY = crate.y + crate.h / 2;
    guard.lookTimer = 0;
    stepMany(world, 3);
    const nearestX = Math.max(crate.x, Math.min(guard.x, crate.x + crate.w));
    const nearestY = Math.max(crate.y, Math.min(guard.y, crate.y + crate.h));
    const dist = Math.hypot(guard.x - nearestX, guard.y - nearestY);
    assert.ok(dist >= 14.5, `guard entered the crate: distance to crate ${dist}`);
  });
});
