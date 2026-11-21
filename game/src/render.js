// Drawing only: the world's state and the current screen in, pixels out. The
// 1280x720 playfield is scaled to fit the window and centred, the margin filled
// with the backdrop colour. Canvas 2D, flat shapes and text: the velvet stage,
// the auditorium floor, prop crates and curtains, the gold-masked guards and
// their vision cones, the stage spotlights, the glowing green exit, and the
// hooded saboteur. Text that holds a number is rebuilt only when it changes.
import { FIELD, FONT, PALETTE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_LEVEL = 'level';
export const SCREEN_WIN = 'win';

const PANEL = { width: 700, top: 150, line: 34, bottom: 76 };

function cachedLabel(prefix) {
  let value = null;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const timeLabel = cachedLabel('Time ');
  const levelLabel = cachedLabel('');
  const suspicionLabel = cachedLabel('Seen ');
  const applaudLabel = cachedLabel('');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function drawCone(guard) {
    const alert = guard.suspicion >= 0.5;
    context.fillStyle = alert ? PALETTE.coneAlert : PALETTE.cone;
    context.beginPath();
    context.moveTo(guard.x, guard.y);
    context.arc(guard.x, guard.y, guard.range, guard.dir - guard.halfAngle, guard.dir + guard.halfAngle);
    context.closePath();
    context.fill();
  }

  function drawGuard(guard) {
    drawCone(guard);
    // Body: dark suit.
    context.fillStyle = PALETTE.guard;
    context.beginPath();
    context.arc(guard.x, guard.y, 15, 0, Math.PI * 2);
    context.fill();
    // Gold mask: a bright face turned where the guard looks.
    const mx = guard.x + Math.cos(guard.dir) * 5;
    const my = guard.y + Math.sin(guard.dir) * 5;
    context.fillStyle = PALETTE.guardMask;
    context.beginPath();
    context.arc(mx, my, 9, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#1c1a22';
    context.fillRect(mx - 5, my - 2, 3, 3);
    context.fillRect(mx + 2, my - 2, 3, 3);
    // Suspicion arc over the guard's head.
    if (guard.suspicion > 0.02) {
      context.strokeStyle = guard.suspicion >= 0.5 ? PALETTE.danger : PALETTE.evidence;
      context.lineWidth = 4;
      context.beginPath();
      context.arc(guard.x, guard.y, 21, -Math.PI / 2, -Math.PI / 2 + guard.suspicion * Math.PI * 2);
      context.stroke();
    }
    // A "?" floats over a guard that heard something; "!" over one that sees you.
    if (guard.mode === 'investigate') text('?', guard.x, guard.y - 28, 26, PALETTE.evidence, 'center');
    else if (guard.seePlayer) text('!', guard.x, guard.y - 28, 26, PALETTE.danger, 'center');
    else if (guard.mode === 'distracted') text('♪', guard.x, guard.y - 28, 24, PALETTE.applause, 'center');
  }

  function drawPlayer(player, time) {
    const bob = Math.sin(time * 6) * 1.5;
    // Hooded cloak: a dark triangle with a hood.
    context.fillStyle = PALETTE.playerHood;
    context.beginPath();
    context.moveTo(player.x, player.y - 16 + bob);
    context.lineTo(player.x - 13, player.y + 12);
    context.lineTo(player.x + 13, player.y + 12);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.player;
    context.beginPath();
    context.arc(player.x, player.y - 6 + bob, 8, 0, Math.PI * 2);
    context.fill();
    // The saboteur's face stays in shadow: two pale eyes.
    context.fillStyle = '#f2ead8';
    context.fillRect(player.x - 4, player.y - 8 + bob, 3, 3);
    context.fillRect(player.x + 1, player.y - 8 + bob, 3, 3);
  }

  function drawField(state, time) {
    // Auditorium floor with board lines.
    context.fillStyle = PALETTE.floor;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.strokeStyle = PALETTE.floorLine;
    context.lineWidth = 2;
    for (let y = FIELD.stageBottom + 40; y < FIELD.height; y += 56) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(FIELD.width, y);
      context.stroke();
    }

    // Stage: velvet floor, footlights along its front edge.
    context.fillStyle = PALETTE.stageFloor;
    context.fillRect(0, 0, FIELD.width, FIELD.stageBottom);
    context.fillStyle = PALETTE.stage;
    context.fillRect(0, 0, FIELD.width, 26);
    context.fillStyle = PALETTE.stageEdge;
    context.fillRect(0, FIELD.stageBottom - 8, FIELD.width, 8);
    for (let x = 30; x < FIELD.width; x += 90) {
      context.fillStyle = PALETTE.evidence;
      context.beginPath();
      context.arc(x, FIELD.stageBottom - 4, 4, 0, Math.PI * 2);
      context.fill();
    }

    // Stage spotlights: pools of light that make you easier to spot.
    for (const spot of state.spotlights) {
      context.fillStyle = PALETTE.spotlight;
      context.beginPath();
      context.arc(spot.x, spot.y, spot.r, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = 'rgba(255, 240, 190, 0.35)';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(spot.x, spot.y, spot.r, 0, Math.PI * 2);
      context.stroke();
    }

    // Curtains: heavy velvet, closed ones hide you, open ones hang aside.
    for (const curtain of state.curtains) {
      context.fillStyle = curtain.open ? PALETTE.curtainDark : PALETTE.curtain;
      context.fillRect(curtain.x, curtain.y, curtain.w, curtain.h);
      context.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      context.lineWidth = 2;
      for (let y = curtain.y + 12; y < curtain.y + curtain.h; y += 18) {
        context.beginPath();
        context.moveTo(curtain.x + 4, y);
        context.lineTo(curtain.x + curtain.w - 4, y);
        context.stroke();
      }
      if (curtain.open) text('open', curtain.x + curtain.w / 2, curtain.y + curtain.h + 16, 14, PALETTE.muted, 'center');
    }

    // Prop crates: solid cover that blocks sight and movement.
    for (const crate of state.crates) {
      context.fillStyle = PALETTE.crate;
      context.fillRect(crate.x, crate.y, crate.w, crate.h);
      context.strokeStyle = PALETTE.crateEdge;
      context.lineWidth = 3;
      context.strokeRect(crate.x + 1.5, crate.y + 1.5, crate.w - 3, crate.h - 3);
      context.beginPath();
      context.moveTo(crate.x, crate.y);
      context.lineTo(crate.x + crate.w, crate.y + crate.h);
      context.moveTo(crate.x + crate.w, crate.y);
      context.lineTo(crate.x, crate.y + crate.h);
      context.stroke();
    }

    // The evidence: a sealed envelope that glints on the stage.
    if (!state.evidence.collected) {
      const pulse = 0.6 + 0.4 * Math.sin(time * 4);
      context.fillStyle = `rgba(255, 217, 77, ${0.25 * pulse})`;
      context.beginPath();
      context.arc(state.evidence.x, state.evidence.y, 26, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.evidence;
      context.fillRect(state.evidence.x - 13, state.evidence.y - 9, 26, 18);
      context.strokeStyle = '#8a6d1a';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(state.evidence.x - 13, state.evidence.y - 9);
      context.lineTo(state.evidence.x, state.evidence.y + 2);
      context.lineTo(state.evidence.x + 13, state.evidence.y - 9);
      context.stroke();
      context.fillStyle = '#8a1a1a';
      context.beginPath();
      context.arc(state.evidence.x, state.evidence.y + 2, 4, 0, Math.PI * 2);
      context.fill();
    }

    // The exit: the green back door, glowing when the evidence is yours.
    const ex = state.exit;
    context.fillStyle = state.evidence.collected ? PALETTE.exitGlow : 'rgba(57, 217, 138, 0.10)';
    context.fillRect(ex.x - 10, ex.y - 10, ex.w + 20, ex.h + 20);
    context.fillStyle = state.evidence.collected ? PALETTE.exit : '#2a7a52';
    context.fillRect(ex.x, ex.y, ex.w, ex.h);
    context.fillStyle = '#0d0a14';
    context.font = `bold 15px ${FONT}`;
    context.textAlign = 'center';
    context.fillText('EXIT', ex.x + ex.w / 2, ex.y + ex.h / 2 + 5);

    for (const guard of state.guards) drawGuard(guard);
    drawPlayer(state.player, time);

    // Applause: the whole room ripples while the audience claps.
    if (state.applause.active > 0) {
      context.strokeStyle = 'rgba(126, 200, 255, 0.5)';
      context.lineWidth = 3;
      const ripple = (state.applause.active * 220) % 300;
      context.beginPath();
      context.arc(FIELD.width / 2, 100, ripple, 0, Math.PI * 2);
      context.stroke();
      text('APPLAUSE!', FIELD.width / 2, 60, 30, PALETTE.applause, 'center');
    }
  }

  function drawHud(state, screen) {
    context.textBaseline = 'top';
    text(levelLabel(state.levelName), 24, 16, 24, PALETTE.text, 'left');
    text(timeLabel(Math.floor(state.elapsed) + 's'), FIELD.width / 2, 16, 24, PALETTE.text, 'center');
    const goal = state.evidence.collected ? 'Evidence ✓ — reach the EXIT' : 'Steal the evidence on the stage';
    text(goal, FIELD.width - 24, 16, 22, state.evidence.collected ? PALETTE.exit : PALETTE.evidence, 'right');
    const maxSeen = Math.max(0, ...state.guards.map((g) => g.suspicion));
    if (maxSeen > 0.02) {
      text(suspicionLabel(`${Math.round(maxSeen * 100)}%`), 24, 52, 22, maxSeen >= 0.5 ? PALETTE.danger : PALETTE.evidence, 'left');
    }
    const cd = state.applause.cooldown;
    const applaud = state.applause.active > 0
      ? `Applauding… ${state.applause.active.toFixed(1)}s`
      : cd > 0
        ? `Applause ready in ${Math.ceil(cd)}s`
        : 'Press E / click APPLAUSE to distract the guards';
    text(applaudLabel(applaud), FIELD.width / 2, FIELD.height - 34, 20, PALETTE.applause, 'center');
    if (screen === SCREEN_PLAY && state.sceneTimer < 3) {
      text('SCENE CHANGE…', FIELD.width / 2, 56, 26, PALETTE.gold, 'center');
    }
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.gold;
    context.lineWidth = 2;
    context.strokeRect(x + 1, y + 1, PANEL.width - 2, height - 2);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 78, 46, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 21, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 23, PALETTE.evidence, 'center');
  }

  const TITLE_LINES = [
    'You are the saboteur. Steal the sealed evidence from the stage,',
    'then slip out the green back door — unseen.',
    'Gold-masked guards patrol with vision cones. Crates and closed',
    'curtains hide you. Spotlights make you easier to spot.',
    'Press E (or click APPLAUSE) to make the audience clap:',
    'the guards turn to the stage and your footsteps go unheard.',
    'Shift runs — loudly. Scenes change every 20 seconds.',
  ];
  const CAUGHT_LINES = ['A guard caught you in the open.', 'The curtain falls on this attempt.'];
  const LEVEL_LINES = ['You slipped out with the evidence.', 'The next act is already waiting.'];
  const WIN_LINES = ['Three acts. Three clean getaways.', 'The theatre never knew you were there.'];

  /** Paint one frame: the field, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best, time) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawField(state, time);
    if (screen === SCREEN_TITLE) {
      drawPanel('LAST APPLAUSE', TITLE_LINES, 'Press Space or click to begin  •  WASD / arrows to move');
      return;
    }
    drawHud(state, screen);
    if (screen === SCREEN_PAUSED) drawPanel('Paused', ['The guards will wait for you.'], 'Press P to resume');
    else if (screen === SCREEN_CAUGHT) drawPanel('CAUGHT!', CAUGHT_LINES, 'Press Space or click to try again');
    else if (screen === SCREEN_LEVEL) drawPanel('Act complete!', LEVEL_LINES, 'Press Space or click for the next act');
    else if (screen === SCREEN_WIN) {
      const lines = [...WIN_LINES, `Best: ${best} act${best === 1 ? '' : 's'} cleared`];
      drawPanel('CURTAIN CALL', lines, 'Press Space or click to play again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
