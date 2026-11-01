// «Восемь лап — две ноги» — единственный источник чисел (CFG).
// Правило: в коде сцен нет «магических» чисел баланса — только ссылки на CFG.
// Временные константы ключевых кадров анимаций допускаются в самих анимациях.
export const RELEASE = false; // true — релиз: debug (?debug=1) полностью выключен.

export const CFG = {
  version: '1.0.1',
  title: 'Восемь лап — две ноги',
  stage: { w: 960, h: 540, bars: '#0b0910' },
  loop: { step: 1 / 60, maxDt: 0.1, timeScales: [1, 0.5, 0.25, 2, 4] },
  storage: { save: 'vosem_lap_save_v1', settings: 'vosem_lap_settings_v1' },
  quality: {
    high: { pixelRatio: 1.5, shadow: 1024, antialias: true },
    med: { pixelRatio: 1.0, shadow: 512, antialias: true },
    low: { pixelRatio: 0.75, shadow: 0, antialias: false },
  },
  budgets: { tris: 150000, draws: 150, fpsHigh: 60, fpsLow: 45 },
  seed: 170,

  ui: {
    fade: 0.35, cardDur: 2.0, cardTween: 0.4, hintDur: 3.5, holdSkip: 1.0, holdRing: 18,
    toast: 2.2, doneColor: '#7fd18b', doneFlash: 0.6, defeatDelay: 1.6, loadingDelay: 0.3,
    subtitleMin: 1.6, promptRadiusPx: 0,
    cockpit: { w: 176, h: 110, margin: 12, border: 3, radius: 10, big: { w: 320, h: 200 }, growDur: 0.8, bumpDur: 0.35, cheerDur: 1.2 },
    menu: { swingPeriod: 6.5, swingAmp: 0.16, threadLen: [170, 215], anchor: [770, -10], moonAlpha: 0.22, dustCount: 26 },
  },

  toon: {
    gradient: [90, 170, 255], outline: '#1d1519',
    thick: { human: 1.2, furniture: 0.8, small: 0.4, spider: 0.06, defender: 0.25, cat: 0.6 },
    scaleNoNormals: 1.03,
    glass: { color: '#cfe8ff', opacity: 0.28 },
    shadowTint: '#2e2440', highlight: '#fff6e8', highlightMix: 0.22,
  },

  // Палитры локаций (единые для 2D и 3D) — docs/PLAN.md §7.2
  palette: {
    bedroom: { sky: '#4a4478', ground: '#241a2a', hemi: 0.85, key: '#a9b8ff', keyI: 1.15, bg: '#14101f', fog: '#14101f', moon: '#cfe0ff' },
    memory: { sky: '#d9c7a0', ground: '#3a2e48', hemi: 0.75, key: '#ffe2b0', keyI: 1.1, bg: '#2b2236', fog: '#2b2236' },
    brain: { sky: '#5a2340', ground: '#1a0d1c', hemi: 0.75, key: '#f3b3be', keyI: 1.3, bg: '#1a0d1c', fog: '#1a0d1c' },
    house: { sky: '#ffe9c4', ground: '#4a3a52', hemi: 0.85, key: '#ffcf8a', keyI: 1.25, bg: '#bfe0f2', fog: '#bfe0f2' },
    street: { sky: '#cfe8ff', ground: '#5d6b4a', hemi: 0.9, key: '#fff1d6', keyI: 1.3, bg: '#bfe0f2', fog: '#cfe8ff' },
    lab: { sky: '#e8fff4', ground: '#3d4a52', hemi: 0.9, key: '#fff4dc', keyI: 1.2, bg: '#8bced5', fog: '#8bced5' },
    menu: { bg: '#0f0b18', wall: '#1a1426', silhouette: '#08060c', moon: '#d8e4ff', thread: '#cfd8ff', spider: '#2f2433', spiderLight: '#6b4f7a' },
    ui: { ink: '#1d1519', paper: '#f2ece0', accent: '#d9b45a', danger: '#d95a7a', ok: '#7fd18b', panel: '#211b29', panel2: '#2e2440' },
  },

  audio: {
    db: { master: 0, music: -6, sfx: 0, amb: -8 },
    comp: { threshold: -18, ratio: 3, knee: 6, attack: 0.005, release: 0.25 },
    reverb: { // [секунды, LPF Гц, wet]
      bedroom: [0.6, 5000, 0.15], memory: [1.4, 3000, 0.35], brain: [2.0, 1800, 0.30],
      house: [0.7, 6000, 0.12], bath: [0.9, 8000, 0.25], lab: [1.2, 6000, 0.20], street: null, menu: [1.0, 4000, 0.18],
    },
    duck: { warn: -6, attack: 0.03, release: 0.4, amb: -3, cut: -4 },
    poly: { default: 4, step: 2, damage: 1, engine: 6, ui: 3 },
    stealFade: 0.03, roadPan: 0.6, muffleHz: 420, muffleTime: 0.6,
    seq: { lookahead: 0.1, tick: 0.025, stepsPerBeat: 4 },
    musicFade: 1.2, stingerDuck: -9,
  },

  // ---- S02: паук в 3D ----
  spider3d: {
    speed: 22, careful: 9, turnRate: 9, radius: 1.4, webDur: 0.9, edgeDur: 0.3, edgeMinV: 0.3, earRadius: 6,
    earDur: 1.6, heartbeatGap: 0.55, heartbeats: 3, webRadius: 7, glintHz: 1.6,
    cam: { fov: 55, dist: 34, height: 22, smooth: 0.25, lookAhead: 4, near: 0.5, far: 3000 },
  },
  sleeper: { tossMin: 6, tossMax: 9, warn: 1.2, strike: 0.5, firstDelay: 5, swatShadow: 0.45, zoneR: 24 },
  wake: { nearDist: 40, nearRate: 16, moveRate: 3.2, carefulMul: 0.3, standRate: -9, mumble: 70, max: 100, lightMul: 1.5 },

  // ---- S04–S06: 2D бои ----
  battle: {
    arena: { cx: 480, cy: 318, rx: 282, ry: 196 },
    spider: { hp: 5, speed: 215, accel: 14, radius: 15, dashSpeed: 540, dashDur: 0.17, dashCd: 0.75,
      biteRange: 50, biteArcDeg: 80, biteWindup: 0.07, biteActive: 0.09, biteRecover: 0.18, biteCd: 0.34 },
    iframes: 1.0, hitstop: 0.07, minWarn: 0.4, knockback: 260, knockDecay: 9, flash: 0.12,
    shake: { death: 9, big: 5, small: 0, decay: 7 }, particles: 160, introDelay: 0.8, victoryDelay: 1.8,
    defeatAfter: 1.4, sparkCount: 8, dustCount: 10, deathDur: 1.1,
  },
  reflex: { hp: 10, radius: 26, walk: 95, approach: 0.9, warn: 0.8, warnHalf: 0.5, corridor: 34, blinkHz: 6,
    dashSpeed: 560, dashMax: 1.4, stun: 1.5, recover: 0.4, damage: 1 },
  fear: { hp: 8, radius: 22, ringEvery: 2.2, ringSpeed: 150, ringThick: 18, gapDeg: 62, gapCount: 3, maxRings: 3,
    gapSpreadMax: 120, retreat: 50, trembleAmp: 2.2, cloneEvery: 3, cloneRadius: 150, cloneLife: 6.6,
    teleportDur: 0.35, ringFirstDelay: 1.0, damage: 1, ringMaxR: 620 },
  will: { hp: 12, radius: 28, speed: 62, defendMin: 1.6, defendMax: 2.6, shieldArc: 70, turnRate: 3.2,
    prep: 1.0, prepEnrage: 0.8, circleR: 95, strike: 0.25, open: 2.0, enrageMul: 1.3, enrageAt: 0.5,
    trapPerCycle: 2, trapMax: 4, trapLife: 8, trapTelegraph: 0.8, trapR: 34, trapSlow: 0.5, trapSlowDur: 1.5, damage: 1 },

  // ---- Человек в 3D (S07, S08, S10) ----
  human: { speed: 140, careful: 60, accel: 0.25, height: 178, cutaway: 80, radius: 24, turnRate: 7,
    cam: { fov: 45, dist: 520, height: 430, smooth: 0.2, near: 5, far: 6000 } },
  bal: { turn: 38, bump: 14, bumpCd: 0.4, cat: 28, puddleMul: 2, puddleInertia: 1.8, carryMul: 1.4,
    decayWalk: 4, decayCareful: 12, decayStand: 20, wobble: 50, shaky: 80, fall: 100, fallDur: 0.9,
    rollWobble: 4, rollShaky: 9, mirrorRate: 20, warnCd: 1.6, slipMul: 1.0 },
  stairs: {
    center: [0, -50], well: 260, post: 40, rMin: 35, rMax: 120, rise: 300, sweep: 540, stepDeg: 15,
    landing1: [180, 220, 100], landing2: [360, 400, 200], startR: 78,
    obstacles: [ // θ-диапазон (град), r-диапазон (см)
      { id: 'SOCK_STAIR', th: [96, 112], r: [60, 100], kind: 'sock', add: 14 },
      { id: 'BOX_STAIR', th: [268, 290], r: [80, 120], kind: 'block', add: 14 },
      { id: 'BOOT_STAIR', th: [312, 330], r: [35, 72], kind: 'block', add: 14 },
      { id: 'PUDDLE_STAIR', th: [440, 470], r: [55, 120], kind: 'puddle' },
    ],
    prepBox: { id: 'BOX_STAIR', th: [292, 308], r: [80, 120], kind: 'block', add: 14 },
    prepBoot: { id: 'BOOT_STAIR', th: [328, 346], r: [35, 72], kind: 'block', add: 14 }, // S08: сапог сдвинут, чтобы с коробкой на 300° оставался проход
  },
  cat: { patrolR: 85, speed: 25, pause: 2, warnDist: 60, fleeTime: 0.6, fleeSpeed: 140, radius: 20,
    patrol: [120, 250], meowCd: 2.5, lie: 4, detour: 60 },
  wash: { barW: 360, barH: 26, zone: 0.30, freq: 0.55, amp: 0.42, move: 0.9, stepTime: 1.6, failOut: 0.6, steps: 3, zoneRadius: 50,
    // шаг 1 «Открыть кран»: вентиль крутится попеременными A/D; без нажатий тугой кран пружинит назад
    tap: { push: 0.085, grace: 0.35, back: 0.22, slip: 0.06, turns: 2 } },
  mirror: { radius: 120, jerkEvery: 0.45, jerk: 6, moveRate: 20, stillTime: 2.0, legLen: 3.4 },
  prep: { pickR: 45, bend: 0.5, deskSpeed: 70, chairPush: 10, passage: 70, catPoints: 4, catLie: 4, catDetour: 60, doorR: 70 },

  // ---- S09: дорога (2D) ----
  road: {
    zones: { sidewalkBottom: [470, 540], lane1: [410, 460], lane2: [360, 410], island: [320, 360],
      lane3: [270, 320], lane4: [220, 270], lane5: [170, 220], sidewalkTop: [120, 170], facade: [0, 120] },
    door: [450, 510],
    lanes: [
      { id: 1, y: [410, 460], dir: 1, speed: 220, light: false, pattern: [1.7, 2.6, 1.3, 3.1, 1.9, 2.2] },
      { id: 2, y: [360, 410], dir: 1, speed: 300, light: false, pattern: [2.2, 1.4, 3.0, 1.6, 2.5] },
      { id: 3, y: [270, 320], dir: -1, speed: 260, light: true, pattern: [1.8, 2.7, 1.5, 3.2, 2.0] },
      { id: 4, y: [220, 270], dir: -1, speed: 340, light: true, pattern: [2.4, 1.6, 2.9, 1.5, 2.2] },
      { id: 5, y: [170, 220], dir: -1, speed: 180, light: true, pattern: [2.9, 2.0, 3.6, 2.3] },
    ],
    light: { red: 6.0, green: 4.5, blink: 1.0, x: [420, 540], stopX: 560, brake: 600, accel: 400, blinkHz: 2 },
    cars: { HATCH: [64, 34], SEDAN: [80, 36], TAXI: [80, 36], VAN: [92, 40], BUS: [150, 42] },
    carCycle: ['SEDAN', 'HATCH', 'TAXI', 'SEDAN', 'VAN', 'HATCH', 'BUS', 'SEDAN', 'TAXI'],
    gapMin: 26, preview: 1.5, edgeWarn: 0.45,
    human: { speed: 140, careful: 60, accel: 0.25, rx: 11, ry: 7, start: [480, 505] },
    timer: 90, warnAt: 20, pulseHz: 1, beepAt: [20, 10, 5, 4, 3, 2, 1],
    hitPenalty: 15, stun: 0.8, invuln: 1.5, carDelay: 1, bounce: 26,
    test: { duration: 300, window: 0.9, every: 6, probeX: [458, 502] },
  },

  // ---- S10: лаборатория ----
  lab: { useR: 70, holdE: 2.0, decay: 0.5, carrySpeed: 0.8, carryL: 1.4, banner: 2.5, finalDur: 3.0, hatchR: 120, flash: 0.35 },

  cut: { S01: 18, C_Levers: 18, C_Wardrobe: 12, C_ExitHome: 11, C_LabEntry: 10, fadeIn: 0.6, fadeOut: 0.6 },
  meet: { duration: 12, buttonAt: 10.5 },
  credits: { dur: 25, holdSkip: 1.0 },
  userCutscene: {
    enabled: true, position: 'beforeS01', // 'beforeS01' | 'afterS10'
    manifest: 'assets/cutscene/user_cutscene.json', timeout: 6, fadeIn: 0.5, fadeOut: 0.5,
    fallbackDur: 7.5, preloadOnMenu: true,
  },
  debug: { overlayHz: 4, godHp: 9999 },
};

// Граф сцен и правила поражений (docs/PLAN.md §4)
export const GRAPH = {
  order: ['MENU', 'C_User', 'S01_Intro', 'S02_Path', 'S03_Meet', 'S04_Reflex', 'S05_Fear', 'S06_Will', 'C_Levers',
    'S07_Morning', 'C_Wardrobe', 'S08_Prep', 'C_ExitHome', 'S09_Road', 'C_LabEntry', 'S10_Lab', 'RESULTS', 'CREDITS'],
  next: {
    MENU: 'S01_Intro', C_User: 'S01_Intro', S01_Intro: 'S02_Path', S02_Path: 'S03_Meet', S03_Meet: 'S04_Reflex',
    S04_Reflex: 'S05_Fear', S05_Fear: 'S06_Will', S06_Will: 'C_Levers', C_Levers: 'S07_Morning',
    S07_Morning: 'C_Wardrobe', C_Wardrobe: 'S08_Prep', S08_Prep: 'C_ExitHome', C_ExitHome: 'S09_Road',
    S09_Road: 'C_LabEntry', C_LabEntry: 'S10_Lab', S10_Lab: 'RESULTS', RESULTS: 'CREDITS', CREDITS: 'MENU',
  },
  defeat: {
    S02_Path: ['S02_Path', 'chk'], S04_Reflex: ['S04_Reflex', 'start'], S05_Fear: ['S05_Fear', 'start'],
    S06_Will: ['S06_Will', 'start'], S07_Morning: ['S07_Morning', 'chk'], S08_Prep: ['S08_Prep', 'chk'],
    S09_Road: ['S09_Road', 'start'], S10_Lab: ['S10_Lab', 'chk'],
  },
  series: { S01_Intro: 1, S02_Path: 2, S03_Meet: 3, S04_Reflex: 4, S05_Fear: 5, S06_Will: 6, S07_Morning: 7, S08_Prep: 8, S09_Road: 9, S10_Lab: 10 },
  debugOnly: ['MODELS', 'SOUNDROOM'],
};
