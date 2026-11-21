// Every tuning number, colour and level layout in one place. The playfield is
// a fixed 1280x720 logical area; the renderer scales it to the window, so no
// rule below depends on the screen size.
//
// The theatre: the stage is the strip along the top (y < 190), the auditorium
// floor fills the rest. The saboteur starts in the wings, bottom left; the
// evidence waits on the stage; the back door (the exit) glows green, top right.

export const FIELD = { width: 1280, height: 720, stageBottom: 190 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 14,
  walkSpeed: 175,
  runSpeed: 265,
  /** Running is loud: guards this close hear the footsteps. */
  noiseRadius: 150,
};

export const GUARD = {
  /** Suspicion per second while the player is seen in the open. */
  seeRate: 0.8,
  /** Multiplier while the player stands in a stage spotlight. */
  litMultiplier: 1.6,
  /** Multiplier while the player is running. */
  runMultiplier: 1.5,
  /** Suspicion per second while the player is unseen. */
  decayRate: 0.45,
  /** Suspicion above this makes the guard walk over to investigate. */
  investigateAt: 0.5,
  /** Seconds a guard looks around at an investigated spot before resuming patrol. */
  lookTime: 1.6,
  /** Seconds a guard waits at each patrol waypoint. */
  pauseTime: 1.0,
  /** Seconds a guard searches for something it heard before giving up and looking around. */
  searchTime: 6,
};

export const APPLAUSE = {
  /** Seconds the applause lasts: guards turn to the stage and stop watching. */
  duration: 3,
  /** Seconds before the audience will clap again. */
  cooldown: 8,
};

/** Seconds between scene changes: the curtains move and the spotlights swing. */
export const SCENE_INTERVAL = 20;

export const LEVELS = [
  {
    name: 'Act I — Opening Night',
    spawn: { x: 90, y: 640 },
    evidence: { x: 640, y: 110 },
    exit: { x: 1190, y: 30, w: 60, h: 70 },
    crates: [
      { x: 420, y: 300, w: 90, h: 60 },
      { x: 820, y: 560, w: 90, h: 60 },
      { x: 180, y: 420, w: 70, h: 70 },
    ],
    curtains: [
      { x: 300, y: 190, w: 26, h: 150, open: false },
      { x: 950, y: 190, w: 26, h: 150, open: true },
    ],
    spotlights: [
      { x: 480, y: 120, r: 95, altX: 800, altY: 120 },
      { x: 880, y: 120, r: 95, altX: 480, altY: 120 },
    ],
    guards: [
      {
        x: 640, y: 420, dir: -Math.PI / 2, speed: 55, range: 220, halfAngle: 0.6,
        waypoints: [{ x: 640, y: 300 }, { x: 640, y: 540 }],
      },
      {
        x: 950, y: 480, dir: Math.PI, speed: 60, range: 220, halfAngle: 0.6,
        waypoints: [{ x: 830, y: 480 }, { x: 1070, y: 480 }],
      },
    ],
  },
  {
    name: 'Act II — Intermission',
    spawn: { x: 90, y: 640 },
    evidence: { x: 700, y: 100 },
    exit: { x: 1190, y: 30, w: 60, h: 70 },
    crates: [
      { x: 380, y: 260, w: 90, h: 60 },
      { x: 700, y: 480, w: 110, h: 60 },
      { x: 980, y: 300, w: 80, h: 80 },
      { x: 220, y: 540, w: 80, h: 60 },
    ],
    curtains: [
      { x: 520, y: 190, w: 26, h: 170, open: false },
      { x: 880, y: 190, w: 26, h: 170, open: false },
    ],
    spotlights: [
      { x: 420, y: 120, r: 100, altX: 900, altY: 120 },
      { x: 640, y: 120, r: 80, altX: 420, altY: 120 },
      { x: 900, y: 120, r: 100, altX: 640, altY: 120 },
    ],
    guards: [
      {
        x: 560, y: 400, dir: -Math.PI / 2, speed: 65, range: 230, halfAngle: 0.62,
        waypoints: [{ x: 560, y: 280 }, { x: 560, y: 560 }],
      },
      {
        x: 980, y: 520, dir: Math.PI, speed: 70, range: 230, halfAngle: 0.62,
        waypoints: [{ x: 860, y: 520 }, { x: 1100, y: 520 }],
      },
      {
        x: 340, y: 620, dir: 0, speed: 60, range: 220, halfAngle: 0.6,
        waypoints: [{ x: 340, y: 480 }, { x: 340, y: 640 }],
      },
    ],
  },
  {
    name: 'Act III — Final Bow',
    spawn: { x: 90, y: 640 },
    evidence: { x: 600, y: 90 },
    exit: { x: 1190, y: 30, w: 60, h: 70 },
    crates: [
      { x: 330, y: 280, w: 90, h: 60 },
      { x: 620, y: 430, w: 100, h: 60 },
      { x: 900, y: 280, w: 90, h: 60 },
      { x: 1080, y: 520, w: 80, h: 80 },
      { x: 200, y: 500, w: 70, h: 70 },
    ],
    curtains: [
      { x: 460, y: 190, w: 26, h: 180, open: true },
      { x: 760, y: 190, w: 26, h: 180, open: false },
      { x: 1060, y: 190, w: 26, h: 180, open: false },
    ],
    spotlights: [
      { x: 400, y: 110, r: 100, altX: 880, altY: 110 },
      { x: 640, y: 110, r: 85, altX: 400, altY: 110 },
      { x: 880, y: 110, r: 100, altX: 640, altY: 110 },
    ],
    guards: [
      {
        x: 520, y: 380, dir: -Math.PI / 2, speed: 78, range: 240, halfAngle: 0.65,
        waypoints: [{ x: 520, y: 260 }, { x: 520, y: 560 }],
      },
      {
        x: 900, y: 480, dir: Math.PI, speed: 80, range: 240, halfAngle: 0.65,
        waypoints: [{ x: 780, y: 480 }, { x: 1040, y: 480 }],
      },
      {
        x: 300, y: 600, dir: 0, speed: 70, range: 230, halfAngle: 0.62,
        waypoints: [{ x: 300, y: 460 }, { x: 300, y: 640 }],
      },
      {
        x: 760, y: 620, dir: -Math.PI / 2, speed: 72, range: 230, halfAngle: 0.62,
        waypoints: [{ x: 760, y: 500 }, { x: 760, y: 660 }],
      },
    ],
  },
];

export const PALETTE = {
  backdrop: '#0d0a14',
  floor: '#241a16',
  floorLine: '#31241d',
  stage: '#6e1b26',
  stageEdge: '#8f2432',
  stageFloor: '#7d212d',
  curtain: '#a31621',
  curtainDark: '#7c0f18',
  crate: '#5a4632',
  crateEdge: '#7a6248',
  gold: '#d4af37',
  goldDim: '#9a7d24',
  player: '#4a6fa5',
  playerHood: '#2e4666',
  guard: '#1c1a22',
  guardMask: '#e8c85a',
  cone: 'rgba(232, 200, 90, 0.20)',
  coneAlert: 'rgba(224, 82, 82, 0.30)',
  spotlight: 'rgba(255, 240, 190, 0.16)',
  exit: '#39d98a',
  exitGlow: 'rgba(57, 217, 138, 0.25)',
  evidence: '#ffd94d',
  text: '#f2ead8',
  muted: '#b8a88f',
  danger: '#e05252',
  panel: '#171222',
  applause: '#7ec8ff',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best result is kept between visits (this browser only). */
export const BEST_KEY = 'last-applause.best';
