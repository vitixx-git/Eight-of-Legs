# PLAN.md — план и единственный источник правды по контенту

Документ собран по §16 промпта: все полные таблицы (потактные таймлайны кат-сцен, каталог 3D-моделей с размерами, каталог 2D-спрайтов, все звуковые рецепты, все строки текста, все тест-кейсы, план сокращений, риски) перенесены сюда. Таблицы §6, §10, §11 и §5.7 сгенерированы из кода игры (`js/cutscenes/data/*.js`, `js/audio/*.js`, `js/text/ru.js`, `js/config.js`), поэтому совпадают с тем, что реально звучит и показывается. Полный исходный текст промпта — в [Приложении А](#приложение-а-полный-текст-промпта). Приоритет: промпт; более точные числа баланса — только в `js/config.js`.

Содержание: §1 Аудит · §2 Правила · §3 Архитектура · §4 Граф сцен · §5 Системы (§5.2 кейкапы, §5.7 числа) · §6 Кат-сцены · §7 Визуал (§7.2 палитры) · §8 Каталог 3D-моделей · §9 Каталог 2D-спрайтов · §10 Звук (§10.2 музыка, §10.3 эффекты) · §11 Строки · §12 Тесты (§12.3 45 кейсов, §12.5 плейтест) · §13 Сокращения и риски · Приложение А

## §1. Аудит проекта

### §1.1. Референсы (`assets/refs/`)

В проекте пять растровых референсов (исходно .png-фото, лежат как .jpg). На **каждом** — один и тот же состав из пяти персонажей (учёный, Страх, Воля, Рефлекс, паук) с разных ракурсов, то есть это «turnaround»-лист, а не пять отдельных картинок.

| Файл | Размер, px | Ракурс | Что видно лучше всего |
|---|---|---|---|
| `REF_01_photo_2026-10-31_17-52-42 (2).jpg` | 1183×550 | спереди-сверху, 3/4 | общий силуэт, относительный рост, палитра |
| `REF_02_photo_2026-10-31_17-52-42.jpg` | 1179×529 | анфас | лица, очки, папка «ДЕЛО №1», полоски костюма Рефлекса |
| `REF_03_photo_2026-10-31_17-52-56 (2).jpg` | 996×474 | 3/4 сбоку | объёмы торса, сутулость Страха, наклон папки |
| `REF_04_photo_2026-10-31_17-52-56 (3).jpg` | 949×619 | 3/4 сверху, крупнее | паук (8 лап, брюшко), повязка и рука Рефлекса |
| `REF_05_photo_2026-10-31_17-52-56.jpg` | 1101×426 | сзади | затылки, спина халата, задняя сторона папки |

Стиль референсов: low-poly «блочный» cartoon, крупные головы, очки-кольца, плоская заливка без текстур, тёмные контуры. Референсы используются **только** как визуальный ориентир (в сцене MODELS — полоска миниатюр в DOM-панели отладки для сравнения); в игре они не встраиваются ни спрайтом, ни текстурой.

| Персонаж | Силуэт и пропорции | Палитра (hex) | Ключевые детали | Поза и характер |
|---|---|---|---|---|
| Паук (SPIDER) | круглое брюшко, маленькая головогрудь, 8 длинных лап «коленями» вверх | #2f2433, #3a2b45, #6b4f7a, #1d1519 | хелицеры, блики глаз | приземистая стойка, любопытный |
| Учёный (SCIENTIST) | высокий, узкие плечи, длинный халат до колен | халат #f2ece0, брюки #47372f, кожа #d7a58a, волосы #47372f | круглые очки, ручки в кармане, бейдж | T-поза на рефе; в игре — спокойный, рассеянный |
| Рефлекс (DEF_REFLEX) | худой, длинные руки-ноги | костюм #c9524a / #c0443a, полосы #f2ece0 | белая повязка на лбу, очки, поднятая рука-указатель | дёрганый, «на низком старте» |
| Страх (DEF_FEAR) | мешковатый свитер до колен, сутулость, рукава закрывают кисти | свитер #767b8c / #8a8fa0, обувь #8a5a8c | огромные круглые очки, брови домиком, капля пота #9fd8ff | сжатый, руки у лица |
| Воля (DEF_WILL) | коренастый, широкая грудь, халат | рубашка #eef0ec, папка #d9b45a, кожа #d7a58a | очки, щит-папка «ДЕЛО №1» | упрямый, папка перед собой |

### §1.2. Уровни и карты, найденные в проекте

| Исходник | Что это было | Куда подключено | Статус |
|---|---|---|---|
| прототип «зал мозга» (`legacy/BRAIN_HALL_ОТЧЁТ.md`, `js/brain/*`, `assets/brain_kit`) | 3D-зал пульта управления в голове | S03_Meet, C_Levers; запечённые фоны `assets/brain_baked` — арены S04–S06 и окно «Кабина» | проходим, оптимизирован (слияние статики) |
| прототип «дом» (`legacy/HOUSE_ОТЧЁТ.md`, `js/house/*`, `assets/house_kit`) | двухэтажный дом с винтовой лестницей | S07_Morning, C_Wardrobe, S08_Prep, C_ExitHome; фон `assets/house_baked` | проходим (исправлены застревания на лестнице) |
| прототип «лаборатория» (`js/lab/*`, `assets/lab_kit`, `legacy/INTRO_IMPLEMENTATION.md`) | лаборатория учёного со шкафом, столом, установкой | воспоминание S01, C_LabEntry, S10_Lab | проходим |
| спальня, улица (`js/env/bedroom.js`, `js/env/street.js`) | процедурные | S01, S02 / C_ExitHome, C_LabEntry | проходимы |
| `legacy/README_prototype.md`, `legacy/reports/` | отчёты прототипов | документация | сохранены |

Недоступных или «висящих» уровней нет: каждый прототип входит в основной граф сцен (§4) и доступен из меню F1 в debug.

## §2. Правила разработки (выжимка из промпта)

- Чистый JS (ES-модули) + Three.js r170 из `vendor/three/`; без Node, сборщиков, CDN и внешних ассетов. Запуск — `python -m http.server 8000`.
- Все числа — в `js/config.js`, все строки — в `js/text/ru.js`; в коде сцен чисел баланса и текстов нет.
- Игровая логика — в фиксированном шаге цикла (1/60 с, аккумулятор, dt ≤ 0,1); `setInterval` для логики запрещён (используется только в аудио-планировщике).
- Честный случайный порядок — детерминированный RNG с seed (`js/core/rng.js`); `Math.random` только для косметики.
- Масштаб 3D: 1 ед. = 1 см. Модели — процедурные из примитивов kit.*; MeshToonMaterial (3 ступени) + обводка #1d1519.
- Каждая сцена выполняет контракт (§3) и в `exit()` снимает слушателей, останавливает петли и освобождает GPU-ресурсы.
- Работа ведётся в git с осмысленными коммитами; отчёт после каждого этапа (что / зачем / как проверить / что проверено / риски).

## §3. Архитектура

Цикл: фиксированный шаг 1/60 с через аккумулятор, рендер каждый кадр с интерполяцией, dt = min(dt, 0,1). На паузе update не вызывается, render вызывается (для размытия). `visibilitychange` → пауза и `audio.suspend()`.

Контракт сцены: `{ id, kind: "3d"|"2d"|"cut", series, objectives[], checkpoints[], hints?, async enter(ctx, params), update(dt), render(alpha), pause(), resume(), exit(), debugWin?(), debugInfo?() }`. Контекст `ctx`: renderer, c2d/g2d, ui, hud, input, audio, save, cfg, events, tweens, scenes, debugState.

Модули: `js/core/` (loop, scenes, input, save, events, rng, balance, tween), `js/ui/` (hud, menu, card, pause, settings, objectives, holdskip, results, credits, cockpit, dom), `js/three/` (renderer, toon, lights, camera, kit, merge), `js/models/`, `js/anim/`, `js/scenes3d/`, `js/scenes2d/`, `js/gfx2d/`, `js/audio/`, `js/cutscenes/`, уровни `js/brain/`, `js/house/`, `js/lab/`, `js/env/`, самопроверки `js/tests/`.

## §4. Граф сцен, поражения, чекпоинты, задачи

```
MENU → [C_User] → S01_Intro → S02_Path → S03_Meet → S04_Reflex → S05_Fear → S06_Will → C_Levers → S07_Morning → C_Wardrobe
     → S08_Prep → C_ExitHome → S09_Road → C_LabEntry → S10_Lab → RESULTS → CREDITS → MENU
```

`C_User` (пользовательская кат-сцена) стоит перед S01 при `CFG.userCutscene.position = "beforeS01"` или между S10 и RESULTS при `"afterS10"`. Отладочные сцены: MODELS, SOUNDROOM (только `?debug=1`).

| Сцена | Тип | Серия | Далее | Поражение → | Чекпоинты | Задачи |
|---|---|---|---|---|---|---|
| MENU | 2d | — | S01_Intro | — | start | — |
| C_User | cut | — | S01_Intro | — | start | — |
| S01_Intro | cut | 1 | S02_Path | — | start | `obj.s1.watch` «Вспомни, кто он» |
| S02_Path | 3d | 2 | S03_Meet | S02_Path (чекпоинт) | start, bed, pillow | `obj.s2.bed` «Доберись до кровати»<br>`obj.s2.pillow` «Заберись на подушку»<br>`obj.s2.ear` «Проникни в ухо» |
| S03_Meet | 3d | 3 | S04_Reflex | — | start | `obj.s3.meet` «Познакомься с хозяевами головы» |
| S04_Reflex | 2d | 4 | S05_Fear | S04_Reflex (start) | start | `obj.s4.win` «Победи Рефлекса» |
| S05_Fear | 2d | 5 | S06_Will | S04_Reflex (start) | start | `obj.s5.win` «Победи Страх» |
| S06_Will | 2d | 6 | C_Levers | S04_Reflex (start) | start | `obj.s6.win` «Победи Волю» |
| C_Levers | cut | — | S07_Morning | — | start | — |
| S07_Morning | 3d | 7 | C_Wardrobe | S07_Morning (чекпоинт) | start, landing1, landing2, sink | `obj.s7.up` «Поднимись на второй этаж»<br>`obj.s7.sink` «Подойди к раковине»<br>`obj.s7.wash` «Умойся» |
| C_Wardrobe | cut | — | S08_Prep | — | start | — |
| S08_Prep | 3d | 8 | C_ExitHome | S08_Prep (чекпоинт) | start, descent | `obj.s8.items` «Собери три предмета ({n}/3)»<br>`obj.s8.exit` «Спустись и выйди из дома» |
| C_ExitHome | cut | — | S09_Road | — | start | — |
| S09_Road | 2d | 9 | C_LabEntry | S09_Road (start) | start | `obj.s9.cross` «Перейди дорогу до начала смены» |
| C_LabEntry | cut | — | S10_Lab | — | start | — |
| S10_Lab | 3d | 10 | RESULTS | S10_Lab (чекпоинт) | start, stopped, inserted | `obj.s10.stop` «Останови установку»<br>`obj.s10.insert` «Помести контейнер в утилизатор»<br>`obj.s10.destroy` «Запусти уничтожение» |
| RESULTS | 2d | — | CREDITS | — | start | — |
| CREDITS | 2d | — | MENU | — | start | — |
| MODELS | 3d | — | — | — | start | — |
| SOUNDROOM | 2d | — | — | — | start | — |

## §5. Системы

### §5.1. Задачи и HUD
Список задач с чек-боксами (`js/ui/objectives.js`): текущая подсвечена, выполненная зачёркивается с UI_TASK_DONE. HUD (`js/ui/hud.js`): сердца паука и полоса HP босса, кулдаун рывка, шкала пробуждения (S02), шкала равновесия L (S07/S08/S10), таймер дороги (S09), тосты.

### §5.2. Подсказки-кейкапы по сценам
Показываются внизу 3,5 с при входе в сцену (`CFG.ui`), затем сворачиваются.

| Сцена | Кейкапы |
|---|---|
| S02_Path | [W A S D] идти · [Shift] крадучись · [E] паутина / проникнуть |
| S04_Reflex | [W A S D] идти · [Пробел] укус · [Shift] рывок |
| S05_Fear | [W A S D] идти · [Пробел] укус · [Shift] рывок |
| S06_Will | [W A S D] идти · [Пробел] укус · [Shift] рывок |
| S07_Morning | [W A S D] идти · [Shift] осторожно · [E] действие |
| S08_Prep | [E] взять · [Shift] осторожно |
| S09_Road | [W A S D] идти · [Shift] осторожно |
| S10_Lab | [W A S D] идти · [Shift] осторожно · [E] действие |
| S03_Meet | [Enter / Пробел / клик] Сразиться |
| кат-сцены, C_User, титры | [удерживать Пробел] Пропустить (кольцо 18 px) |

### §5.3. Равновесие человека L (S07, S08, S10)
Прирост: поворот +38 (за 180° на полной скорости), столкновение +14 (не чаще 0,4 с), кошка +28, лужа ×2 к приростам и инерция ×1,8, ношение контейнера ×1,4, зеркало +20/с при движении. Спад: ходьба −4/с, Shift −12/с, стоя −20/с. Пороги: 50 — покачивание (крен ±4°), 80 — шатание (±9°, красная полоска, HUM_WOBBLE_WARN), 100 — падение 0,9 с и возврат. Реализация — `js/core/balance.js` (падение считается по пику до спада кадра).

### §5.4. Окно «Кабина»
`js/ui/cockpit.js`: 2D-окно с пауком у пульта (фон — запечённый зал мозга). Позы паука: idle, walk, careful, wobble, panic, bump, use, cheer, rest. Отключается в настройках; в финальном штрихе S10 вырастает до 320×200.

### §5.5. Сохранения v1
`localStorage["vosem_lap_save_v1"]`: `{ v: 1, scene, checkpoint, flags{memorySeen, meetSeen, leversDone, dressed, mirrorDone, s10_stopped, s10_inserted, poisonDestroyed}, items{pass, notebook, keys}, stats{startedAt, playMs, retries}, completed, updatedAt }`; настройки — отдельно (`vosem_lap_settings_v1`). Повреждённый JSON / v ≠ 1 / неизвестная сцена → диалог «начать заново»; поражение в S05/S06 сохраняет S04 (start); недоступный localStorage — игра работает без сохранений. Автосохранение — из игрового цикла и при скрытии вкладки.

### §5.6. Пауза, фокус, ввод
Esc — пауза (update стоит, render с размытием). `blur`/`visibilitychange` — пауза, `audio.suspend()`, «грязные» клавиши поглощаются до отпускания. Ввод по `KeyboardEvent.code` — работает в любой раскладке.

### §5.7. Все числовые параметры (`js/config.js`, полный листинг)

```js
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
  fear: { hp: 8, radius: 22, ringEvery: 2.2, ringSpeed: 150, ringThick: 18, gapDeg: 62, maxRings: 3,
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
  wash: { barW: 360, barH: 26, zone: 0.30, freq: 0.55, amp: 0.42, move: 0.9, stepTime: 1.6, failOut: 0.6, steps: 3, zoneRadius: 50 },
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
    S02_Path: ['S02_Path', 'chk'], S04_Reflex: ['S04_Reflex', 'start'], S05_Fear: ['S04_Reflex', 'start'],
    S06_Will: ['S04_Reflex', 'start'], S07_Morning: ['S07_Morning', 'chk'], S08_Prep: ['S08_Prep', 'chk'],
    S09_Road: ['S09_Road', 'start'], S10_Lab: ['S10_Lab', 'chk'],
  },
  series: { S01_Intro: 1, S02_Path: 2, S03_Meet: 3, S04_Reflex: 4, S05_Fear: 5, S06_Will: 6, S07_Morning: 7, S08_Prep: 8, S09_Road: 9, S10_Lab: 10 },
  debugOnly: ['MODELS', 'SOUNDROOM'],
};
```

### §5.8. Навигация паука в S02 (1.0.1)
Поверхности F (пол), B (одеяло), T (верх матраса), P (подушка) — плоскости с границами и препятствиями (боксы, круги),
расширенными на радиус паука `spider3d.radius`; код — `js/env/bedroom.js` (`makeSurfaces`, `resolveOn`, `edgeStep`), проверка — test.nav.
- **Переходы:** паутина W1 (пол ↔ одеяло у изножья), W2 (матрас ↔ подушка), края с анимацией `spider3d.edgeDur` 0,3 с:
  одеяло ↔ матрас (верхний край одеяла z = −58 при |x| 26,5…67; по центру — подбородок и плечи спящего) и
  матрас ↔ подушка (с боков и спереди при |x| ≥ 27,4; сзади — изголовье, по центру спереди — плечи).
- **Правило края одно:** паук упёрся в границу своей поверхности и идёт поперёк края со скоростью ≥ `spider3d.edgeMinV` × скорость →
  перелезает; скольжение вдоль края ничего не делает. Порог считается от границы с радиусом, а не от линии края:
  при шаге 1/60 с паук проходит ≈ 0,37 см, и прежнее условие «пересёк линию края» (на 1,4 см дальше границы) было
  недостижимо — баг B19.
- **Ввод при перелезании:** базис «вперёд/вправо» фиксируется на время перехода и до смены нажатых клавиш — камера
  поворачивается к новой поверхности, а зажатая W продолжает вести паука туда же; если паук упёрся (0,2 с почти без
  движения), базис снова берётся от камеры.
- **Подушка:** камера смотрит из-за паука на голову, чуть в сторону уха своей половины (`BED.earAim` = 6 см от центра
  головы): W с любой точки половины приводит к уху — паук скользит по голове; A/D — вокруг головы. Препятствия: голова
  (круг), подбородок и шея перед лицом, затылок до изголовья (без «кармана» между головой и задним краем, где паук
  застревал, — B23); поэтому левая и правая половины подушки — каждая со своим ухом. На подушке и матрасе камера
  не заходит за изголовье (`BED.camZMin` = −97): остаётся перед ним и поднимается. «E — проникнуть»
  в радиусе `spider3d.earRadius` от любого уха. Отклонение от буквы Прил. А §4 («переходы — только паутина и край одеяла»):
  край подушки — такой же переход, как край одеяла, по отзыву игрока (стена на краю подушки воспринималась как баг).

## §6. Кат-сцены — потактные таблицы

Движок — `js/cutscenes/timeline.js` (события по времени, seek для пропуска: «существенные» события — флаги, смена мира, наряд — исполняются и при пропуске). Типы событий: shot — мгновенный кадр камеры (позиция p → цель at, FOV); cam — плавный пролёт; sub — субтитр; sfx/music/amb — звук; anim — анимация актёра; fade — затемнение; call — вызов функции сцены; flag — флаг сохранения; goto — переход к следующей сцене. Координаты в см.

### §6.1. S01_Intro «Я тебя помню»

Длительность: 18 с · событий: 45.

| t, с | Событие |
|---|---|
| 0,00 | Вызов world("bedroom") · не обязательно при пропуске |
| 0,00 | Кадр: камера (140, 228, 85) → (30, 80, -60), FOV 50 |
| 0,00 | Музыка M_BEDROOM |
| 0,00 | Окружение AMB_BEDROOM |
| 0,10 | Пролёт 3 с → камера (132, 216, 76), цель (10, 76, -82) (inOutQuad) |
| 0,50 | Субтитр «Ночь. Он спит.» (2,6 с) |
| 1,20 | Звук CLOCK_TICK {"vol": 0.5} |
| 3,20 | Кадр: камера (115,3, 196,6, 54) → (121, 196,2, 61), FOV 40 |
| 3,30 | Анимация: spider → turn |
| 3,60 | Звук MEM_WHOOSH |
| 4,00 | Затемнение → 1 за 0,25 с |
| 4,30 | Вызов world("memory") |
| 4,30 | Кадр: камера (-230, 211, 180) → (10, 125, -160), FOV 60 |
| 4,30 | Музыка M_MEMORY |
| 4,30 | Окружение AMB_MEMORY |
| 4,32 | Затемнение → 0 за 0,35 с |
| 4,40 | Анимация: scientist → write |
| 4,50 | Пролёт 3 с → камера (-212, 204, 158), цель (45, 122, -110) (inOutQuad) |
| 5,00 | Звук MEM_PEN_SCRATCH |
| 6,40 | Звук MEM_PEN_SCRATCH {"vol": 0.8} |
| 7,50 | Кадр: камера (-20, 150, -112) → (-20, 152, -223), FOV 45 |
| 7,60 | Звук MEM_GLITCH |
| 7,60 | Пролёт 1,4 с → камера (-20, 151, -128), цель (-20, 152, -223) (outQuad) |
| 9,00 | Кадр: камера (38, 112, 116) → (38, 65, 195), FOV 45 |
| 9,10 | Звук MEM_JAR_CLINK |
| 9,10 | Пролёт 1,5 с → камера (38, 104, 130), цель (38, 66, 195) (outQuad) |
| 10,60 | Кадр: камера (16, 165, -45) → (65, 158, -95), FOV 40 |
| 10,60 | Анимация: scientist → adjustGlasses |
| 10,80 | Звук MEM_STING |
| 11,00 | Субтитр «Это он.» (2,2 с) |
| 12,20 | Анимация: scientist → write |
| 13,00 | Пролёт 1,6 с → камера (26, 164, -55), цель (65, 159, -95) (inOutQuad) |
| 13,20 | Субтитр «Тот, кто варит Арахноцид.» (2,4 с) |
| 14,60 | Звук MEM_OUT |
| 14,90 | Затемнение → 1 за 0,25 с |
| 15,20 | Вызов world("bedroom") |
| 15,20 | Кадр: камера (140, 228, 85) → (10, 76, -82), FOV 50 |
| 15,20 | Флаг memorySeen = true |
| 15,20 | Музыка M_BEDROOM |
| 15,20 | Окружение AMB_BEDROOM |
| 15,22 | Затемнение → 0 за 0,35 с |
| 15,30 | Анимация: spider → idle |
| 15,40 | Пролёт 2,4 с → камера (128, 210, 70), цель (0, 74, -87) (inOutQuad) |
| 16,20 | Звук SPD_SIGH {"vol": 0.7} |
| 18,00 | Переход к следующей сцене |

### §6.2. S03_Meet «Кто здесь главный?»

Длительность: 12 с · событий: 41.

| t, с | Событие |
|---|---|
| 0,00 | Кадр: камера (0, 30, 70) → (0, 8, -8), FOV 50 |
| 0,00 | Музыка M_BRAIN |
| 0,00 | Окружение AMB_BRAIN |
| 0,10 | Пролёт 2,6 с → камера (0, 12, 30), цель (0, 6,5, -8) (inOutCubic) |
| 0,40 | Анимация: spider → walk |
| 0,40 | move {"actor": "spider", "dur": 1.8, "to": [0, 0, 4], "rotY": 3.141592653589793} |
| 0,60 | Анимация: reflex → intro |
| 0,60 | Вызов plate("reflex") |
| 0,70 | Звук BRN_TALK_BLIP |
| 1,00 | Анимация: fear → intro |
| 1,00 | Вызов plate("fear") |
| 1,10 | Звук BRN_TALK_BLIP {"rate": 1.2} |
| 1,40 | Анимация: will → intro |
| 1,40 | Вызов plate("will") |
| 1,50 | Звук BRN_TALK_BLIP {"rate": 0.8} |
| 2,00 | Анимация: spider → idle |
| 2,90 | Кадр: камера (-9, 10,5, 12) → (-12, 9, -8), FOV 42 |
| 2,90 | Вызов focus("reflex") |
| 3,00 | Звук REF_INTRO |
| 3,00 | Субтитр «Тревога! Чужой в голове!» (2,2 с) |
| 3,00 | Пролёт 2,2 с → камера (-10, 10,5, 8), цель (-12, 9,5, -8) (inOutQuad) |
| 3,10 | Вызов attack("reflex", "hammerDash") |
| 5,30 | Кадр: камера (-3, 10, 9) → (-12, 9, -11), FOV 42 |
| 5,30 | Вызов focus("fear") |
| 5,40 | Звук FEAR_WHIMPER |
| 5,40 | Субтитр «Ой-ой-ой… он с лапками…» (2,2 с) |
| 5,40 | Пролёт 2,2 с → камера (-5, 10, 6), цель (-12, 9, -11) (inOutQuad) |
| 7,70 | Кадр: камера (9, 12, 13) → (12, 10, -8), FOV 42 |
| 7,70 | Вызов focus("will") |
| 7,70 | Анимация: will → talk |
| 7,80 | Звук WILL_INTRO |
| 7,80 | Субтитр «Посторонним в голове не место.» (2,2 с) |
| 7,80 | Пролёт 2,2 с → камера (10, 11,5, 9), цель (12, 10, -8) (inOutQuad) |
| 10,00 | Кадр: камера (0, 12, 30) → (0, 6,5, -8), FOV 50 |
| 10,00 | Вызов focus(null) |
| 10,00 | Анимация: will → guard |
| 10,00 | Анимация: reflex → idle |
| 10,10 | Звук CUT_STING |
| 10,10 | Пролёт 1,8 с → камера (0, 11,5, 27), цель (0, 6,5, -8) (outQuad) |
| 10,50 | Флаг meetSeen = true |
| 10,50 | Вызов button() |

### §6.3. C_Levers «Слишком много рычагов»

Длительность: 18 с · событий: 53.

| t, с | Событие |
|---|---|
| 0,00 | Вызов world("brain") |
| 0,00 | Кадр: камера (0, 9, 30) → (0, 6, -26), FOV 50 |
| 0,00 | Музыка M_BRAIN |
| 0,00 | Окружение AMB_BRAIN |
| 1,20 | Звук BRN_BARRIER_OFF |
| 1,50 | Анимация: spider → walk |
| 1,50 | move {"actor": "spider", "dur": 2.2, "to": [0, 0, -19], "rotY": 3.141592653589793, "ease": "inOutQuad"} |
| 1,50 | Пролёт 2,5 с → камера (7, 8, -4), цель (0, 4, -28) (inOutQuad) |
| 3,70 | Анимация: spider → sitChair |
| 3,70 | move {"actor": "spider", "dur": 0.8, "to": [0, 3.2, -26], "rotY": 3.141592653589793, "ease": "outQuad"} |
| 4,30 | Звук BRN_CHAIR |
| 4,60 | Анимация: spider → idle |
| 4,80 | Кадр: камера (0, 9,5, -17) → (0, 7, -33), FOV 45 |
| 5,50 | Звук BRN_PANEL_ON |
| 5,80 | Звук BRN_PANEL_ON {"rate": 1.12} |
| 6,10 | Звук BRN_PANEL_ON {"rate": 1.25} |
| 6,60 | Кадр: камера (6, 9, -21) → (7,5, 6,5, -30), FOV 40 |
| 6,80 | Вызов paw(1) |
| 7,20 | Звук UI_DENY |
| 7,30 | Субтитр «Это лучше не трогать.» (1,9 с) |
| 7,50 | Вызов paw(0) |
| 8,60 | Кадр: камера (-3, 12, -19) → (0, 6,5, -31), FOV 42 |
| 8,90 | Анимация: spider → pullLever |
| 8,90 | Вызов lever(1) |
| 9,10 | Звук BRN_LEVER |
| 10,00 | Анимация: spider → pullLever |
| 10,00 | Вызов lever(2) |
| 10,20 | Звук BRN_LEVER {"rate": 1.1} |
| 10,80 | Кадр: камера (0, 12,5, -31) → (0, 14, -50), FOV 45 |
| 10,90 | Пролёт 0,8 с → камера (0, 13, -35), цель (0, 14, -50) (outQuad) |
| 11,50 | Музыка M_COCKPIT |
| 11,80 | Вызов world("bedroom") |
| 11,80 | Вызов handShot() |
| 11,80 | Анимация: sleeper → fingerTwitch |
| 11,80 | Окружение AMB_BEDROOM |
| 12,50 | Кадр: камера (26, 98, -56) → (0, 76, -86), FOV 40 |
| 12,60 | Анимация: sleeper → wakeEyes |
| 12,70 | Звук BRN_EYE_OPEN |
| 13,30 | Кадр: камера (-130, 150, 130) → (70, 80, -60), FOV 50 |
| 13,30 | Вызов dawn(13.3, 16.2) |
| 13,40 | Анимация: sleeper → sitUp |
| 13,40 | Пролёт 2,2 с → камера (-110, 140, 100), цель (60, 90, -60) (inOutQuad) |
| 13,50 | Звук BRN_SIT_UP |
| 13,70 | Звук BRN_DAWN |
| 14,60 | Звук HUM_YAWN |
| 15,60 | Вызов world("brain") |
| 15,60 | Кадр: камера (5, 15, -13) → (0, 5, -29), FOV 50 |
| 15,60 | Окружение AMB_COCKPIT |
| 15,80 | Субтитр «Теперь я за штурвалом.» (2 с) |
| 15,90 | Звук SPD_CHEER |
| 16,00 | Флаг leversDone = true |
| 16,00 | Пролёт 2 с → камера (2, 17, -9), цель (0, 9, -40) (inOutQuad) |
| 18,00 | Переход к следующей сцене |

### §6.4. C_Wardrobe «Выглядеть человеком»

Длительность: 12 с · событий: 37.

| t, с | Событие |
|---|---|
| 0,00 | Кадр: камера (-180, 560, 560) → (-320, 390, 70), FOV 42 |
| 0,00 | Музыка M_HOUSE |
| 0,00 | Окружение AMB_HOUSE_MORNING |
| 0,20 | Анимация: human → walk |
| 0,20 | move {"actor": "human", "dur": 2.1, "to": [-332, 300, 104], "rotY": -1.5707963267948966, "ease": "inOutQuad"} |
| 1,00 | Пролёт 1,8 с → камера (-230, 530, 470), цель (-365, 400, 100) (inOutQuad) |
| 2,30 | Анимация: human → idle |
| 2,50 | Вызов doors(1) |
| 2,50 | Звук HOUSE_DOOR_OPEN |
| 3,00 | Анимация: human → walk |
| 3,00 | move {"actor": "human", "dur": 0.9, "to": [-388, 300, 108], "rotY": -1.5707963267948966, "ease": "inQuad"} |
| 3,90 | Вызов hide() |
| 3,90 | Вызов doors(0) |
| 4,00 | Звук HOUSE_DOOR_CLOSE |
| 4,30 | Вызов rattle(2.6) |
| 4,30 | Звук HOUSE_WARDROBE_RATTLE |
| 4,70 | Звук HUM_CLOTH |
| 5,20 | Кадр: камера (-235, 505, 460) → (-372, 395, 112), FOV 42 |
| 5,50 | Звук HUM_CLOTH {"rate": 1.1} |
| 6,30 | Вызов sock() |
| 6,30 | Звук HOUSE_SOCK_POP |
| 6,80 | Субтитр «Носок?! Откуда здесь носок?» (2,4 с) |
| 7,40 | outfit {"actor": "human", "value": "work"} |
| 7,40 | Флаг dressed = true |
| 7,90 | Кадр: камера (-215, 535, 480) → (-345, 400, 100), FOV 42 |
| 8,00 | Вызов doors(1) |
| 8,00 | Звук HOUSE_DOOR_OPEN |
| 8,10 | Вызов show() |
| 8,20 | Анимация: human → walk |
| 8,20 | move {"actor": "human", "dur": 1.1, "to": [-318, 300, 108], "rotY": 1.5707963267948966, "ease": "outQuad"} |
| 9,30 | Анимация: human → adjustGlasses |
| 9,30 | Вызов doors(0) |
| 9,30 | Пролёт 1,7 с → камера (-205, 485, 385), цель (-326, 430, 108) (inOutQuad) |
| 9,60 | Звук HUM_CLOTH |
| 10,20 | Анимация: human → idle |
| 11,30 | Затемнение → 1 за 0,6 с |
| 12,00 | Переход к следующей сцене |

### §6.5. C_ExitHome «Выход из дома»

Длительность: 11 с · событий: 30.

| t, с | Событие |
|---|---|
| 0,00 | Кадр: камера (-770, 90, 200) → (-430, 105, -110), FOV 40 |
| 0,00 | Музыка M_HOUSE |
| 0,00 | Окружение AMB_STREET |
| 0,00 | Вызов outside() |
| 0,30 | Вызов door(1) |
| 0,30 | Звук HOUSE_FRONT_DOOR |
| 0,70 | Анимация: human → walk |
| 0,70 | move {"actor": "human", "dur": 1.1, "to": [-482, 0, -110], "rotY": -1.5707963267948966, "ease": "inQuad"} |
| 1,40 | Пролёт 1,7 с → камера (-830, 140, 250), цель (-575, 55, -110) (inOutQuad) |
| 1,80 | move {"actor": "human", "dur": 0.34, "to": [-535, -15, -110], "ease": "linear"} |
| 1,95 | Звук HUM_STEP_STAIR |
| 2,14 | move {"actor": "human", "dur": 0.34, "to": [-565, -30, -110], "ease": "linear"} |
| 2,30 | Звук HUM_STEP_STAIR |
| 2,48 | move {"actor": "human", "dur": 0.34, "to": [-595, -45, -110], "ease": "linear"} |
| 2,64 | Звук HUM_STEP_STAIR |
| 2,82 | move {"actor": "human", "dur": 0.34, "to": [-630, -58, -110], "ease": "linear"} |
| 3,16 | move {"actor": "human", "dur": 2.6, "to": [-866, -58, -110], "ease": "outQuad"} |
| 3,30 | Вызов door(0) |
| 3,30 | Пролёт 2,9 с → камера (-590, 172, -28), цель (-1700, 112, -110) (inOutQuad) |
| 3,60 | Звук HOUSE_DOOR_CLOSE {"vol": 0.6} |
| 5,40 | Вызов car(2, 2300, -2900, 2.8) |
| 5,80 | Анимация: human → idle |
| 5,95 | Звук ROAD_PASSBY {"vol": 0.9} |
| 6,00 | Субтитр «Лаборатория №3 — прямо через дорогу.» (2,8 с) |
| 7,60 | Кадр: камера (-1500, 300, 160) → (-2295, 288, -110), FOV 32 |
| 7,70 | Пролёт 1,8 с → камера (-1590, 292, 105), цель (-2295, 284, -110), FOV 30 (inOutQuad) |
| 9,50 | Кадр: камера (-1070, 85, 60) → (-866, 95, -110), FOV 40 |
| 9,60 | Анимация: human → adjustGlasses |
| 10,40 | Затемнение → 1 за 0,6 с |
| 11,00 | Переход к следующей сцене |

### §6.6. C_LabEntry «Вход в лабораторию»

Длительность: 10 с · событий: 39.

| t, с | Событие |
|---|---|
| 0,00 | Кадр: камера (-1975, 135, -430) → (-2282, 118, -185), FOV 38 |
| 0,00 | Окружение AMB_STREET |
| 0,00 | Вызов reverb("street") |
| 0,05 | Анимация: human → walk |
| 0,05 | move {"actor": "human", "dur": 1.5, "to": [-2262, -58, -216], "rotY": -1.5707963267948966, "ease": "outQuad"} |
| 1,60 | Анимация: human → useConsole |
| 1,60 | Вызов card(true) |
| 1,75 | Кадр: камера (-2222, 98, -400) → (-2290, 74, -226), FOV 32 |
| 2,00 | Звук LAB_CARD_BEEP |
| 2,35 | Вызов led(true) |
| 2,35 | Звук LAB_LED_GREEN |
| 2,40 | Субтитр «Доступ разрешён.» (1,6 с) |
| 2,75 | Вызов card(false) |
| 2,75 | Анимация: human → idle |
| 2,85 | Кадр: камера (-1945, 150, -70) → (-2300, 125, -112), FOV 40 |
| 2,85 | Вызов door(1) |
| 2,85 | Звук LAB_DOOR_SLIDE |
| 3,30 | Анимация: human → walk |
| 3,30 | move {"actor": "human", "dur": 0.6, "to": [-2256, -58, -112], "rotY": -1.5707963267948966, "ease": "inOutQuad"} |
| 3,90 | move {"actor": "human", "dur": 0.6, "to": [-2297, -58, -110], "rotY": -1.5707963267948966, "ease": "linear"} |
| 3,95 | Затемнение → 1 за 0,35 с |
| 4,40 | Вызов inside() |
| 4,40 | Кадр: камера (235, 235, 345) → (-70, 95, -30), FOV 50 |
| 4,45 | Затемнение → 0 за 0,45 с |
| 4,45 | Музыка M_LAB |
| 4,45 | Окружение AMB_LAB |
| 4,50 | Звук LAB_DOOR_SLIDE {"vol": 0.45, "rate": 1.1} |
| 4,50 | Анимация: human → walk |
| 4,50 | move {"actor": "human", "dur": 1.7, "to": [196, 0, 72], "rotY": -1.9207963267948966, "ease": "outQuad"} |
| 4,60 | Пролёт 2 с → камера (205, 225, 320), цель (-110, 110, 10) (inOutQuad) |
| 5,20 | Субтитр «Знакомое местечко.» (2,4 с) |
| 6,20 | Анимация: human → adjustGlasses |
| 6,70 | Вызов frontWall(true) |
| 6,70 | Кадр: камера (-30, 250, -30) → (-230, 190, 190), FOV 44 |
| 6,75 | Пролёт 2,5 с → камера (-112, 252, 70), цель (-230, 200, 192), FOV 38 (inOutQuad) |
| 7,00 | Вызов glint() |
| 7,00 | Анимация: human → idle |
| 9,40 | Затемнение → 1 за 0,6 с |
| 10,00 | Переход к следующей сцене |

### §6.7. Финальный штрих S10 (3 с)

| t, с | Событие |
|---|---|
| −2,50 | Уничтожение: вспышка (без неё при «Меньше эффектов»), LAB_DISPOSE_BOOM, лампа зелёная, баннер «АРАХНОЦИД УНИЧТОЖЕН» 2,5 с, UI_BIG_SUCCESS, слой музыки resolve, кабина cheer |
| 0,00 | Окно «Кабина» показывается и растёт до 320×200 за 0,8 с; паук отпускает рычаги и откидывается (поза rest); SPD_SIGH |
| 0,00 | Субтитр паука «Ну всё. Можно и отдохнуть.» (2,8 с); учёный поворачивается и поправляет очки (adjustGlasses 1,0 с) |
| 0,00–1,60 | Камера плавно отъезжает (smoothstep) к финальному ракурсу |
| 3,00 | Переход → RESULTS (или C_User при position = "afterS10") |

### §6.8. Пользовательская кат-сцена C_User

Манифест `assets/cutscene/user_cutscene.json`; форматы: `video` (MP4/WebM + субтитры), `frames` (последовательность кадров с fps), `timeline` (слайды/подписи по времени), `builtin` (встроенный пролог). Поведение: предзагрузка в меню (`preloadOnMenu`), fade-in/out 0,5 с, skip удержанием Пробела 1 с, пауза Esc, mute из настроек, пауза при скрытой вкладке, fallback-слайд (`fallbackDur` 7,5 с), если файл не загрузился за `timeout` 6 с. Подробно — `assets/cutscene/README.md`.

## §7. Визуал

### §7.1. Стиль
MeshToonMaterial с gradientMap из 3 ступеней, обводка #1d1519 методом inverted hull (толщина по классу объекта: человек 1,2 см, мебель 0,8, мелочь 0,4, паук 0,06, защитники 0,25, кошка 0,6). Стекло — полупрозрачный цвет #cfe8ff (opacity 0,28), металл — отдельным светлым материалом, без PBR. 2D (бои, дорога, кабина, меню) — Canvas 2D с той же обводкой и палитрой; шрифт — системный Trebuchet MS / Arial.

### §7.2. Палитры локаций

| Локация | Параметры |
|---|---|
| bedroom | sky: '#4a4478', ground: '#241a2a', hemi: 0.85, key: '#a9b8ff', keyI: 1.15, bg: '#14101f', fog: '#14101f', moon: '#cfe0ff' |
| memory | sky: '#d9c7a0', ground: '#3a2e48', hemi: 0.75, key: '#ffe2b0', keyI: 1.1, bg: '#2b2236', fog: '#2b2236' |
| brain | sky: '#5a2340', ground: '#1a0d1c', hemi: 0.75, key: '#f3b3be', keyI: 1.3, bg: '#1a0d1c', fog: '#1a0d1c' |
| house | sky: '#ffe9c4', ground: '#4a3a52', hemi: 0.85, key: '#ffcf8a', keyI: 1.25, bg: '#bfe0f2', fog: '#bfe0f2' |
| street | sky: '#cfe8ff', ground: '#5d6b4a', hemi: 0.9, key: '#fff1d6', keyI: 1.3, bg: '#bfe0f2', fog: '#cfe8ff' |
| lab | sky: '#e8fff4', ground: '#3d4a52', hemi: 0.9, key: '#fff4dc', keyI: 1.2, bg: '#8bced5', fog: '#8bced5' |
| menu | bg: '#0f0b18', wall: '#1a1426', silhouette: '#08060c', moon: '#d8e4ff', thread: '#cfd8ff', spider: '#2f2433', spiderLight: '#6b4f7a' |
| ui | ink: '#1d1519', paper: '#f2ece0', accent: '#d9b45a', danger: '#d95a7a', ok: '#7fd18b', panel: '#211b29', panel2: '#2e2440' |

## §8. Каталог 3D-моделей

### §8.1. Шкала и бюджеты
1 ед. = 1 см. Бюджеты на кадр: ≤ 150 000 треугольников и ≤ 150 draw calls (`CFG.budgets`); замеры — в `ОТЧЁТ.md`. Все модели — процедурные из примитивов `js/three/kit.js` (box, roundBox, capsule, sphere, cyl, cone, torus, tube, label), сливаются в 1–5 мешей (`js/three/merge.js`: статика — merged VC, персонажи — SkinnedMesh, где кость = исходная деталь).

| Модель | Файл | Габарит Ш×В×Г, см | Треугольники (без/с обводкой) | Мешей | Анимации |
|---|---|---|---|---|---|
| §8.2.1 SPIDER — паук | `js/models/spider.js (+ spiderAnimator.js)` | 6,0 × 1,5 × 5,3 (размах лап; тело ≈ 3) | 2 404 / 2 908 | 3 | idle, walk, crawl, turn, webShoot, climbEdge, earEnter, pullLever, sitChair, release, squish |
| §8.2.2 SCIENTIST — учёный | `js/models/scientist.js (+ human.js, humanKit.js, workCoat.js)` | 80,5 × 178,0 × 50,0 (T-поза) | 5 716 (пижама 4 632 / рабочий 5 404) | 5 | idle, walk, carefulWalk, sleepBreath, toss.arm/head/turn, sitUp, wakeEyes, fingerTwitch, write, adjustGlasses, bendPick, carry, pour, wash, towel, useConsole, holdButton, bump, wobble, fall, resist; setOutfit(pajama/work) |
| §8.2.3 DEF_REFLEX — Рефлекс | `js/models/def_reflex.js (+ reflex.js, reflexMotion.js)` | 7,8 × 12,0 × 4,7 | 996 / 1 514 | 2–4 | intro, idle; атака hammerDash (рывок-«молот») |
| §8.2.4 DEF_FEAR — Страх | `js/models/def_fear.js (+ fear.js, fearHuman.js, fearMotion.js)` | 5,8 × 10,9 × 5,2 (в испуганной сутулой стойке) | 810 / 1 098 | 2–4 | intro, hide, idle, tremble; атака scream (крик-волна) |
| §8.2.5 DEF_WILL — Воля | `js/models/def_will.js (+ will.js, willHuman.js, willMotion.js)` | 8,0 × 12,6 × 10,2 (с папкой) | 1 278 / 2 046 | 2–4 | intro, idle, guard, shield, talk; атака slam (удар папкой) |
| §8.2.6 CAT — кошка | `js/models/cat.js` | 18,0 × 60,6 × 66,6 (с хвостом) | 2 568 / 4 596 | 2–3 | idle, walk, run, sit, lie, meow; атака-реакция hiss |
| §8.2.7 SPIDER_LEG_EAR — лапка из уха | `js/models/spider_leg_ear.js` | длина 3,4 | 314 | 1 | show (выдвинуть/втянуть), twitch |

### §8.2. Персонажи по референсам (сопоставление)

- **§8.2.1 SPIDER.** Тело из двух частей (головогрудь + круглое брюшко с узором), 8 лап по 3 сегмента с «коленями» выше тела, хелицеры, 8 глаз-бусин с бликами. Палитра #2f2433 / #3a2b45 / #6b4f7a. Ходьба — процедурная тетраподная походка (по 4 лапы в противофазе).
- **§8.2.2 SCIENTIST.** Голова с причёской и круглыми очками, рот, торс, руки и ноги с суставами (кости). Два наряда: пижама (S01–S07) и рабочий (рубашка, брюки, белый халат, бейдж PASS_CARD) — `setOutfit("work")` в C_Wardrobe. Халат — вторичная динамика подола (coatDynamics).
- **§8.2.3 DEF_REFLEX.** Худой, спортивный костюм красный с белыми лампасами, белая повязка на лбу, очки, рука-указатель. Атака — рывок с наклоном корпуса; после удара о стену — оглушение со звёздочками и «сдувание» (deflate) при поражении.
- **§8.2.4 DEF_FEAR.** Мешковатый серый свитер до колен, рукава закрывают кисти, большие глаза за огромными очками, брови домиком, капля пота. Атака — крик-волна (scream), idle — дрожь.
- **§8.2.5 DEF_WILL.** Коренастый, белая рубашка/халат, очки, щит-папка «ДЕЛО №1» (золотистая). Атака — удар папкой сверху по кругу r 95; защита — щит-папкой к пауку.
- **§8.2.6 CAT.** Додумана (референса нет): рыжая кошка, процедурная — тело-капсула, голова с ушами-конусами, хвост из сегментов, полосы. Патруль, «сесть и мяукнуть», лечь поперёк прохода, бегство.
- **§8.2.7 SPIDER_LEG_EAR.** Одна лапа паука (3 сегмента) — торчит из уха отражения в зеркале S08, дёргается и втягивается.

### §8.3. Окружение

| Локация | Источник | Содержимое | Сцены |
|---|---|---|---|
| Спальня | `js/env/bedroom.js` | кровать, одеяло со складками, подушка, тумбочка, шкаф, окно с луной, лунные полосы (аддитивные), часы | S01, S02 |
| Лаборатория | `js/lab/*`, `assets/lab_kit` | шкаф с паутинкой, стол, доска «АРАХНОЦИД v3», банки с пауками, установка с баком, пульт, утилизатор с люком, считыватель пропуска | S01 (воспоминание), C_LabEntry, S10 |
| Зал мозга | `js/brain/*`, `assets/brain_kit` | пульт с панелями и рычагами «РУКИ», «ГЛАЗА», кнопка «РОТ — НЕ ТРОГАТЬ», кресло, барьер, экраны-глаза, таблички | S03, C_Levers; фон боёв и кабины |
| Дом | `js/house/*`, `js/env/house.js`, `assets/house_kit` | холл, кабинет, коридор, ванная, гардеробная, винтовая лестница (колодец Ø 260, столб Ø 40), препятствия, зеркало, комод, стол, стул | S07, C_Wardrobe, S08, C_ExitHome |
| Улица | `js/env/street.js` | крыльцо с 3 ступенями, бордюр, дорога, фасад «ЛАБОРАТОРИЯ №3» | C_ExitHome, C_LabEntry |

## §9. Каталог 2D-спрайтов

Все спрайты рисуются процедурно на Canvas 2D и запекаются в offscreen-холсты при первом обращении (`js/gfx2d/sprites.js`, `js/gfx2d/road.js`, `js/gfx2d/fx.js`, `js/ui/cockpit.js`, `js/ui/menu.js`). Вид сверху/сбоку 3/4, обводка #1d1519, палитры — как у 3D-моделей.

| ID (промпт) | Ключ в коде | Кадры, px | Где |
|---|---|---|---|
| SPR_SPIDER_TOP (ходьба) | S.spiderWalk[6], S.spiderWalkW (белая вспышка) | 6 × 64×64 | S04–S06 |
| SPR_SPIDER_BITE | S.spiderBite[3], S.spiderBiteW, S.biteArc | 3 × 64×64, дуга 80×80 | S04–S06 |
| SPR_SPIDER_DEAD | S.spiderDead | 64×64 | S04–S06 |
| SPR_REFLEX | S.reflexWalk[4], reflexCrouch, reflexDash, reflexStun, reflexDeflate (+W) | 64×80 | S04 |
| SPR_FEAR | S.fearIdle[2], fearScream, fearHurt, fearFaint, fearGlow (+W) | 64×80 | S05 |
| SPR_FEAR_CLONE | S.fearClone[2], fearCloneRaw[2] | 64×80 | S05 |
| SPR_WILL | S.willWalk[4], will_prep, will_strike, will_open, will_defeat (+W) | 72×84 | S06 |
| SPR_WILL_FOLDER | S.willFolder | 26×20 | S06 |
| SPR_WEB_NET | S.webNet | 80×80 | S06 (ловушки) |
| SPR_HEART | S.heart, S.heartEmpty | 24×22 | HUD боёв |
| SPR_ROAD_BG | R.bg (тротуары, 5 полос, островок, разметка, деревья, фонари, фасад) | 960×540 | S09 |
| SPR_HUMAN_TOP | R.human[4 направления][4 кадра] | 40×60 | S09 |
| SPR_CARS | R.cars.HATCH/SEDAN/TAXI/VAN/BUS × цвета | длина×ширина из CFG.road.cars + 8 | S09 |
| SPR_LAB_DOOR | R.doorLeaf (2 створки) | 30×66 | S09 |
| SPR_TRAFFIC_LIGHT | drawCarLight, drawWalkLight (каждый кадр) | — | S09 |
| FX | частицы (искры, пыль, конфетти), stunStars, memOverlay (зерно воспоминания) | — | бои, S01 |
| SPR_COCKPIT | cockpit.js: зал-фон (assets/brain_baked), паук у пульта, рычаги, лампы | 200×125 → 320×200 | S07–S10 |
| SPR_MENU_BG | menu.js: спальня-силуэт, луна, паук на нити | 960×540 | МЕНЮ |
| SPR_ARENA_BG | bakeArena2D.js: арены из зала мозга (assets/brain_baked) | 960×540 | S04–S06 |

## §10. Звук

### §10.1. Движок
`js/audio/engine.js`: AudioContext создаётся по первому жесту; шины master → компрессор → выход, music / sfx / amb с громкостями из настроек; send-реверб по локации (`CFG.audio.reverb`); дакинг музыки под предупреждения и кат-сцены; LPF «в ухе» (S02→S03); полифония по группам (`CFG.audio.poly`) с мягким «воровством» голосов; suspend/resume по паузе и видимости вкладки. Неизвестный ID — предупреждение в консоль один раз, без падения.

### §10.2. Музыка (`js/audio/music.js`)
Пошаговый секвенсор (lookahead 0,1 с, шаг 1/16), инструменты — синтез (pad, bell, pluck, marimba, bass, drums и др.), кроссфейд 1,2 с, слои-стемы включаются по игровым событиям.

| ID | BPM | Инструменты каналов | Слои | Где звучит |
|---|---|---|---|---|
| M_MENU | 70 | pad, bell, pluck | — | меню, C_User |
| M_BEDROOM | 62 | pad, marimba, bell | — | S01, S02 |
| M_MEMORY | 56 | pad, bell, pluck | — | воспоминание S01 |
| M_BRAIN | 92 | bass, pluck, pad, hat, bell | — | S03, C_Levers (начало) |
| M_BATTLE | 132 | kick, bass, hat, snare, pluck, bassoon, tom, lead, snare, hat, clap, lead | reflex, fear, will, half | S04–S06 |
| M_COCKPIT | 104 | pluck, shaker, bass, pad, bell | — | C_Levers (у пульта) |
| M_HOUSE | 100 | marimba, bassoon, shaker, kick, bassoon, tom | wobble, quiet | S07, C_Wardrobe, S08, C_ExitHome |
| M_ROAD | 124 | kick, hat, bass, pluck, hat, clap, lead | urgent | S09 |
| M_LAB | 84 | pad, bass, bell, hat, pad, tom, pad, bell | stopped, resolve | C_LabEntry, S10 |
| M_END | 76 | pad, bell, pluck, bass, marimba | — | итоги |
| M_CREDITS | 96 | marimba, bell, bass, shaker, pad | — | титры |
| ST_VICTORY | — | стингер | — | победа в бою |
| ST_DEFEAT | — | стингер | — | поражение |

### §10.3. Эффекты, петли и окружение — все рецепты

Всего: 175 SFX, 6 игровых петель, 10 петель окружения, 11 треков, 2 стингера. Нотация слоя: `osc тип f0→f1 Гц, длит. с, дБ` · `шум цвет фильтр f0→f1 Гц Q, длит., дБ` · `FM fc×ratio idx, длит., дБ`; `+0,04` — задержка слоя.

#### Интерфейс

| ID | Слои рецепта |
|---|---|
| UI_FOCUS | osc sine 540→540 Гц, 0,06 с, -24 дБ |
| UI_CONFIRM | osc sine 740→980 Гц, 0,12 с, -18 дБ + +0,04 osc triangle 1480→1480 Гц, 0,08 с, -26 дБ |
| UI_BACK | osc sine 620→420 Гц, 0,1 с, -20 дБ |
| UI_DENY | osc triangle 180→90 Гц, 0,14 с, -18 дБ |
| UI_TOGGLE | osc square 880→880 Гц, 0,03 с, -28 дБ + +0,04 osc square 1320→1320 Гц, 0,03 с, -30 дБ |
| UI_SLIDER | osc sine 900→900 Гц, 0,03 с, -30 дБ |
| UI_CARD_IN | шум pink bandpass 400→2400 Гц Q0,8, 0,5 с, -24 дБ + osc sine 110→110 Гц, 0,6 с, -22 дБ |
| UI_TASK_DONE | osc triangle 659,25→659,25 Гц, 0,16 с, -16 дБ + +0,06 osc triangle 783,99→783,99 Гц, 0,16 с, -16 дБ + +0,12 osc triangle 987,77→987,77 Гц, 0,16 с, -16 дБ |
| UI_SKIP | шум white highpass 1200→6000 Гц Q0,7, 0,25 с, -22 дБ |
| UI_PAUSE | osc sine 440→330 Гц, 0,12 с, -22 дБ |
| UI_BIG_SUCCESS | osc triangle 329,63→329,63 Гц, 0,5 с, -14 дБ + +0,09 osc triangle 415,3→415,3 Гц, 0,5 с, -14 дБ + +0,18 osc triangle 493,88→493,88 Гц, 0,5 с, -14 дБ + +0,27 osc triangle 659,25→659,25 Гц, 0,5 с, -14 дБ + шум white highpass 4000→9000 Гц Q0,5, 1,2 с, -26 дБ |
| UI_HINT | osc sine 660→660 Гц, 0,08 с, -26 дБ + +0,09 osc sine 880→880 Гц, 0,08 с, -26 дБ |
| UI_TICK | osc square 1200→1200 Гц, 0,03 с, -24 дБ |
| UI_TICK_LAST | osc square 1600→1600 Гц, 0,06 с, -20 дБ |
| UI_START | osc sine 220→440 Гц, 0,4 с, -18 дБ + +0,12 osc triangle 660→660 Гц, 0,3 с, -22 дБ |
| UI_ERROR | osc sawtooth 160→120 Гц, 0,25 с, -22 дБ |

#### Паук

| ID | Слои рецепта |
|---|---|
| SPD_STEP | шум white highpass 5000→5000 Гц Q1, 0,03 с, -34 дБ |
| SPD_STEP_SOFT | шум white highpass 6000→6000 Гц Q1, 0,02 с, -40 дБ |
| SPD_WEB_SHOOT | шум white bandpass 3000→900 Гц Q2, 0,35 с, -18 дБ + osc sine 1800→600 Гц, 0,3 с, -26 дБ |
| SPD_WEB_CLIMB | шум white bandpass 2600→2600 Гц Q3, 0,06 с, -26 дБ + +0,12 шум white bandpass 2600→2600 Гц Q3, 0,06 с, -26 дБ + +0,24 шум white bandpass 2600→2600 Гц Q3, 0,06 с, -26 дБ + +0,36 шум white bandpass 2600→2600 Гц Q3, 0,06 с, -26 дБ + +0,48 шум white bandpass 2600→2600 Гц Q3, 0,06 с, -26 дБ |
| SPD_EDGE | osc sine 300→600 Гц, 0,15 с, -22 дБ + шум white highpass 3000→3000 Гц Q1, 0,08 с, -30 дБ |
| SPD_EAR_ENTER | шум brown lowpass 1200→200 Гц Q1, 1,4 с, -14 дБ + osc sine 220→70 Гц, 1,5 с, -18 дБ |
| SPD_BITE | шум white bandpass 2400→1200 Гц Q2, 0,06 с, -16 дБ + osc square 900→300 Гц, 0,06 с, -26 дБ |
| SPD_BITE_HIT | osc square 240→80 Гц, 0,12 с, -14 дБ + шум white lowpass 3000→800 Гц Q1, 0,08 с, -18 дБ |
| SPD_BITE_BLOCK | osc triangle 1800→1700 Гц, 0,18 с, -18 дБ + osc square 2400→2300 Гц, 0,08 с, -26 дБ |
| SPD_DASH | шум pink bandpass 600→2400 Гц Q1,5, 0,22 с, -18 дБ |
| SPD_HURT | osc square 760→300 Гц, 0,16 с, -16 дБ + шум white bandpass 1800→1800 Гц Q1, 0,1 с, -20 дБ |
| SPD_DEATH | osc triangle 600→80 Гц, 0,9 с, -14 дБ + шум pink lowpass 2000→200 Гц Q1, 0,6 с, -22 дБ |
| SPD_SPAWN | osc sine 200→800 Гц, 0,3 с, -20 дБ + шум white highpass 4000→4000 Гц Q1, 0,2 с, -28 дБ |
| SPD_SIGH | шум pink bandpass 900→400 Гц Q1,2, 1,2 с, -18 дБ + osc sine 300→200 Гц, 1,1 с, -30 дБ |
| SPD_CHEER | osc square 659,25→659,25 Гц, 0,08 с, -24 дБ + +0,07 osc square 783,99→783,99 Гц, 0,08 с, -24 дБ + +0,14 osc square 659,25→659,25 Гц, 0,08 с, -24 дБ + +0,21 osc square 987,77→987,77 Гц, 0,08 с, -24 дБ |
| SPD_LEVER | osc square 200→120 Гц, 0,08 с, -18 дБ + шум white bandpass 1500→1500 Гц Q1, 0,05 с, -24 дБ + +0,08 osc square 300→300 Гц, 0,04 с, -24 дБ |

#### Спящий

| ID | Слои рецепта |
|---|---|
| BED_SNORE | шум brown lowpass 220→420 Гц Q3, 1,1 с, -14 дБ + osc sawtooth 70→80 Гц, 1,1 с, -30 дБ |
| BED_SNORE_STOP | шум brown lowpass 420→120 Гц Q3, 0,25 с, -14 дБ |
| BED_CREAK_WARN | osc sawtooth 140→95 Гц, 0,55 с, -16 дБ + +0,3 osc sawtooth 120→80 Гц, 0,5 с, -18 дБ |
| BED_TOSS | шум pink lowpass 1600→400 Гц Q0,7, 0,6 с, -14 дБ |
| BED_SWAT | шум brown lowpass 900→200 Гц Q1, 0,25 с, -10 дБ + osc sine 110→50 Гц, 0,25 с, -14 дБ |
| BED_MUMBLE | osc sawtooth 140→120 Гц, 0,9 с, -20 дБ |
| BED_WAKE | osc sawtooth 160→260 Гц, 0,6 с, -14 дБ + +0,3 osc sine 400→200 Гц, 0,4 с, -20 дБ |

#### Спальня

| ID | Слои рецепта |
|---|---|
| HEARTBEAT | osc sine 62→40 Гц, 0,16 с, -8 дБ + +0,18 osc sine 55→36 Гц, 0,2 с, -11 дБ |
| CLOCK_TICK | шум white bandpass 3500→3500 Гц Q6, 0,01 с, -30 дБ |
| MOON_SHIMMER | osc sine 1760→1760 Гц, 1,2 с, -32 дБ |
| WEB_GLINT | osc sine 2637→2637 Гц, 0,25 с, -30 дБ + +0,06 osc sine 3520→3520 Гц, 0,2 с, -32 дБ |
| EAR_MUFFLE | шум brown lowpass 300→120 Гц Q1, 0,8 с, -16 дБ |

#### Воспоминание

| ID | Слои рецепта |
|---|---|
| MEM_WHOOSH | шум pink bandpass 300→3000 Гц Q1,2, 0,8 с, -14 дБ |
| MEM_GLITCH | osc square 900→300 Гц, 0,04 с, -24 дБ + +0,05 osc square 1170→390 Гц, 0,04 с, -24 дБ + +0,1 osc square 1521→507 Гц, 0,04 с, -24 дБ + +0,15 osc square 1977,3→659,1 Гц, 0,04 с, -24 дБ |
| MEM_PEN_SCRATCH | шум white bandpass 4000→3000 Гц Q4, 0,09 с, -28 дБ + +0,13 шум white bandpass 4000→3000 Гц Q4, 0,09 с, -28 дБ + +0,26 шум white bandpass 4000→3000 Гц Q4, 0,09 с, -28 дБ + +0,39 шум white bandpass 4000→3000 Гц Q4, 0,09 с, -28 дБ |
| MEM_JAR_CLINK | osc sine 2200→2200 Гц, 0,4 с, -22 дБ + osc sine 3310→3310 Гц, 0,3 с, -28 дБ |
| MEM_STING | osc sawtooth 164,81→164,81 Гц, 1,4 с, -16 дБ + osc sawtooth 174,7→174,7 Гц, 1,4 с, -18 дБ |
| MEM_OUT | шум pink bandpass 3000→300 Гц Q1,2, 0,7 с, -16 дБ |

#### Мозг

| ID | Слои рецепта |
|---|---|
| BRN_TALK_BLIP | osc square 520→480 Гц, 0,04 с, -24 дБ |
| BRN_BARRIER_OFF | osc sawtooth 400→60 Гц, 0,8 с, -16 дБ + шум pink highpass 2000→400 Гц Q1, 0,6 с, -22 дБ |
| BRN_PANEL_ON | osc square 1200→1200 Гц, 0,05 с, -24 дБ + +0,05 osc sine 1800→1800 Гц, 0,12 с, -24 дБ |
| BRN_BUTTON | osc square 400→400 Гц, 0,04 с, -20 дБ |
| BRN_LEVER | osc square 180→120 Гц, 0,12 с, -16 дБ + шум white bandpass 1200→600 Гц Q2, 0,1 с, -22 дБ |
| BRN_CHAIR | шум pink lowpass 800→300 Гц Q1, 0,3 с, -18 дБ + osc sine 160→90 Гц, 0,2 с, -20 дБ |
| BRN_ALARM | osc square 880→880 Гц, 0,12 с, -20 дБ + +0,2 osc square 880→880 Гц, 0,12 с, -20 дБ + +0,4 osc square 880→880 Гц, 0,12 с, -20 дБ |
| BRN_EYE_OPEN | osc sine 300→900 Гц, 0,5 с, -18 дБ + шум white highpass 5000→5000 Гц Q1, 0,4 с, -28 дБ |
| BRN_SIT_UP | шум pink lowpass 900→300 Гц Q0,7, 0,8 с, -16 дБ |
| BRN_DAWN | osc sine 329,63→329,63 Гц, 1,6 с, -22 дБ + +0,25 osc sine 493,88→493,88 Гц, 1,6 с, -22 дБ + +0,5 osc sine 659,25→659,25 Гц, 1,6 с, -22 дБ + +0,75 osc sine 830,6→830,6 Гц, 1,6 с, -22 дБ |

#### Рефлекс

| ID | Слои рецепта |
|---|---|
| REF_INTRO | osc square 600→900 Гц, 0,07 с, -18 дБ + +0,11 osc square 672→1008 Гц, 0,07 с, -18 дБ + +0,22 osc square 752,64→1128,96 Гц, 0,07 с, -18 дБ |
| REF_WARN_WHISTLE | osc sine 600→1800 Гц, 0,8 с, -16 дБ |
| REF_WARN_SHORT | osc sine 900→2000 Гц, 0,5 с, -16 дБ |
| REF_DASH | шум pink bandpass 800→3000 Гц Q1,2, 0,35 с, -12 дБ + osc sawtooth 200→400 Гц, 0,3 с, -22 дБ |
| REF_IMPACT_WALL | osc sine 90→40 Гц, 0,3 с, -8 дБ + шум brown lowpass 800→100 Гц Q1, 0,3 с, -12 дБ |
| REF_STUN | osc sine 1400→1400 Гц, 0,1 с, -22 дБ + +0,12 osc sine 1568→1568 Гц, 0,1 с, -22 дБ + +0,24 osc sine 1756,16→1756,16 Гц, 0,1 с, -22 дБ |
| REF_HAMMER | osc square 1000→1000 Гц, 0,04 с, -18 дБ + шум white highpass 3000→3000 Гц Q1, 0,05 с, -22 дБ |
| REF_DEFLATE | osc sawtooth 700→90 Гц, 1 с, -16 дБ |
| REF_TAUNT | osc square 500→700 Гц, 0,08 с, -22 дБ + +0,1 osc square 700→500 Гц, 0,08 с, -22 дБ |

#### Страх

| ID | Слои рецепта |
|---|---|
| FEAR_INTRO | osc triangle 700→400 Гц, 0,5 с, -18 дБ |
| FEAR_RING | osc sine 300→900 Гц, 0,5 с, -18 дБ + шум pink bandpass 800→2400 Гц Q2, 0,4 с, -28 дБ |
| FEAR_RING_HIT | osc triangle 1100→500 Гц, 0,25 с, -14 дБ |
| FEAR_BLINK | osc sine 1600→400 Гц, 0,18 с, -18 дБ + шум white highpass 4000→1500 Гц Q1, 0,15 с, -26 дБ |
| FEAR_CLONE | osc triangle 800→820 Гц, 0,12 с, -22 дБ + +0,08 osc triangle 960→984 Гц, 0,12 с, -22 дБ + +0,16 osc triangle 1152→1180,8 Гц, 0,12 с, -22 дБ |
| FEAR_CLONE_POP | osc sine 900→200 Гц, 0,18 с, -16 дБ + шум white bandpass 2000→800 Гц Q1, 0,12 с, -22 дБ |
| FEAR_WHIMPER | osc triangle 900→600 Гц, 0,45 с, -20 дБ |
| FEAR_TREMBLE | osc sine 220→220 Гц, 0,4 с, -30 дБ |
| FEAR_FAINT | osc triangle 800→120 Гц, 1,1 с, -14 дБ |

#### Воля

| ID | Слои рецепта |
|---|---|
| WILL_INTRO | osc sine 80→45 Гц, 0,3 с, -8 дБ + шум brown lowpass 600→100 Гц Q1, 0,25 с, -14 дБ |
| WILL_STOMP | osc sine 70→40 Гц, 0,25 с, -10 дБ + шум brown lowpass 500→80 Гц Q1, 0,2 с, -16 дБ |
| WILL_GRUNT | osc sawtooth 120→90 Гц, 0,3 с, -16 дБ |
| WILL_SHIELD_UP | шум pink bandpass 600→1200 Гц Q2, 0,2 с, -18 дБ + osc sine 200→260 Гц, 0,15 с, -22 дБ |
| WILL_PREP | osc sawtooth 110→220 Гц, 1 с, -18 дБ |
| WILL_STRIKE | osc sine 80→35 Гц, 0,4 с, -6 дБ + шум brown lowpass 1200→90 Гц Q1, 0,35 с, -10 дБ |
| WILL_OPEN | osc triangle 400→300 Гц, 0,3 с, -20 дБ + +0,15 osc triangle 300→220 Гц, 0,3 с, -22 дБ |
| WILL_ENRAGE | osc sawtooth 90→180 Гц, 0,9 с, -12 дБ |
| WILL_TRAP_SET | osc square 1200→1200 Гц, 0,05 с, -24 дБ + +0,1 osc square 1200→1200 Гц, 0,05 с, -24 дБ |
| WILL_TRAP_SNAP | шум white bandpass 2000→900 Гц Q2, 0,15 с, -16 дБ + osc square 300→200 Гц, 0,1 с, -20 дБ |
| WILL_FOLDER_FLAP | шум pink bandpass 1400→700 Гц Q1,5, 0,12 с, -20 дБ |
| WILL_DEFEAT | osc sawtooth 300→50 Гц, 1,2 с, -12 дБ + шум pink lowpass 2000→100 Гц Q1, 1 с, -18 дБ |

#### Бой

| ID | Слои рецепта |
|---|---|
| BAT_START | osc sawtooth 220→440 Гц, 0,25 с, -18 дБ + +0,25 osc square 660→660 Гц, 0,2 с, -20 дБ |
| BAT_HIT_DEF | osc square 300→90 Гц, 0,14 с, -12 дБ + шум white lowpass 4000→600 Гц Q1, 0,12 с, -16 дБ |
| BAT_HIT_SPIDER | osc triangle 900→260 Гц, 0,2 с, -12 дБ + шум white bandpass 2500→2500 Гц Q1, 0,1 с, -18 дБ |
| BAT_BLOCK | osc triangle 1500→1400 Гц, 0,22 с, -16 дБ + шум white highpass 3000→3000 Гц Q1, 0,06 с, -22 дБ |
| BAT_ARMOR_SPARK | osc square 2600→2200 Гц, 0,1 с, -20 дБ + шум white highpass 5000→3000 Гц Q1, 0,12 с, -20 дБ |
| BAT_SHIELD_HIT | osc sine 180→120 Гц, 0,25 с, -12 дБ + шум pink bandpass 800→400 Гц Q2, 0,2 с, -18 дБ |
| BAT_DEATH_DEF | osc sawtooth 500→60 Гц, 1 с, -14 дБ + шум pink lowpass 3000→200 Гц Q1, 0,8 с, -20 дБ |
| BAT_WHOOSH | шум pink bandpass 500→2000 Гц Q1,4, 0,18 с, -20 дБ |
| BAT_STEP_DEF | шум brown lowpass 500→500 Гц Q1, 0,05 с, -26 дБ |
| BAT_COUNTDOWN | osc square 660→660 Гц, 0,1 с, -20 дБ |
| BAT_SLOW | osc sine 500→250 Гц, 0,4 с, -20 дБ |
| BAT_HEART_LOST | osc triangle 520→260 Гц, 0,25 с, -16 дБ |

#### Человек

| ID | Слои рецепта |
|---|---|
| HUM_STEP | шум brown lowpass 700→300 Гц Q1, 0,07 с, -20 дБ + шум white highpass 3000→3000 Гц Q1, 0,02 с, -32 дБ |
| HUM_STEP_STAIR | osc sine 140→90 Гц, 0,08 с, -18 дБ + шум brown lowpass 900→900 Гц Q1, 0,06 с, -22 дБ |
| HUM_STEP_CAREFUL | шум brown lowpass 500→500 Гц Q1, 0,06 с, -27 дБ |
| HUM_WOBBLE_WARN | osc sine 330→300 Гц, 0,25 с, -16 дБ + +0,25 osc sine 300→270 Гц, 0,3 с, -18 дБ |
| HUM_FALL | шум brown lowpass 900→120 Гц Q1, 0,5 с, -8 дБ + osc sine 120→45 Гц, 0,45 с, -10 дБ + +0,25 шум pink lowpass 1200→300 Гц Q1, 0,3 с, -16 дБ |
| HUM_BUMP | osc sine 160→90 Гц, 0,12 с, -14 дБ + шум brown lowpass 700→700 Гц Q1, 0,1 с, -18 дБ |
| HUM_SLIP | osc sine 500→1500 Гц, 0,3 с, -18 дБ + шум pink bandpass 1200→3000 Гц Q2, 0,25 с, -24 дБ |
| HUM_YAWN | osc sawtooth 220→140 Гц, 1,4 с, -20 дБ |
| HUM_RESIST_GRUNT | osc sawtooth 150→110 Гц, 0,35 с, -16 дБ |
| HUM_PICKUP | osc triangle 523,25→523,25 Гц, 0,12 с, -18 дБ + +0,06 osc triangle 659,25→659,25 Гц, 0,12 с, -18 дБ |
| HUM_BEND | шум pink lowpass 900→500 Гц Q1, 0,3 с, -24 дБ |
| HUM_SIGH | шум pink bandpass 800→350 Гц Q1,2, 1 с, -18 дБ |
| HUM_GASP | шум white bandpass 1500→2500 Гц Q2, 0,3 с, -16 дБ |
| HUM_OOF | osc sawtooth 200→120 Гц, 0,2 с, -16 дБ |
| HUM_CLOTH | шум pink bandpass 1800→1000 Гц Q1,5, 0,12 с, -24 дБ + +0,15 шум pink bandpass 1800→1000 Гц Q1,5, 0,12 с, -24 дБ + +0,3 шум pink bandpass 1800→1000 Гц Q1,5, 0,12 с, -24 дБ |
| HUM_WASH_SPLASH | шум white bandpass 1500→600 Гц Q0,8, 0,5 с, -14 дБ + +0,1 шум white highpass 3000→1500 Гц Q1, 0,4 с, -18 дБ |

#### Дом

| ID | Слои рецепта |
|---|---|
| HOUSE_DOOR_OPEN | osc sawtooth 200→320 Гц, 0,5 с, -22 дБ |
| HOUSE_DOOR_CLOSE | osc sine 100→60 Гц, 0,2 с, -12 дБ + шум brown lowpass 900→900 Гц Q1, 0,15 с, -16 дБ |
| HOUSE_TAP_ON | osc square 400→300 Гц, 0,05 с, -24 дБ + шум white bandpass 2500→1800 Гц Q1, 0,3 с, -22 дБ |
| HOUSE_SPLASH | шум white bandpass 1200→500 Гц Q0,8, 0,35 с, -16 дБ |
| HOUSE_TOWEL | шум pink bandpass 1400→900 Гц Q1,2, 0,5 с, -20 дБ |
| HOUSE_WARDROBE_RATTLE | шум brown lowpass 900→600 Гц Q1, 0,08 с, -14 дБ + +0,11 шум brown lowpass 900→600 Гц Q1, 0,08 с, -14 дБ + +0,22 шум brown lowpass 900→600 Гц Q1, 0,08 с, -14 дБ + +0,33 шум brown lowpass 900→600 Гц Q1, 0,08 с, -14 дБ + +0,44 шум brown lowpass 900→600 Гц Q1, 0,08 с, -14 дБ + +0,55 шум brown lowpass 900→600 Гц Q1, 0,08 с, -14 дБ |
| HOUSE_SOCK_POP | osc sine 220→440 Гц, 0,3 с, -14 дБ |
| HOUSE_MUG_TIP | osc sine 1900→1700 Гц, 0,15 с, -18 дБ + +0,12 osc sine 1500→1400 Гц, 0,2 с, -20 дБ |
| HOUSE_COFFEE_SPILL | шум brown lowpass 1400→300 Гц Q1, 0,6 с, -16 дБ |
| HOUSE_CHAIR_SCRAPE | osc sawtooth 180→140 Гц, 0,35 с, -20 дБ |
| HOUSE_KEYS | osc sine 3200→3200 Гц, 0,08 с, -24 дБ + +0,05 osc sine 3424→3424 Гц, 0,08 с, -24 дБ + +0,1 osc sine 3663,68→3663,68 Гц, 0,08 с, -24 дБ + +0,15 osc sine 3920,14→3920,14 Гц, 0,08 с, -24 дБ |
| HOUSE_PAPER | шум white bandpass 3000→1800 Гц Q1,4, 0,25 с, -22 дБ |
| HOUSE_FRONT_DOOR | osc sine 90→55 Гц, 0,3 с, -10 дБ + шум brown lowpass 800→800 Гц Q1, 0,25 с, -14 дБ |
| HOUSE_SOCK_BOING | osc sine 220→440 Гц, 0,3 с, -14 дБ |

#### Кошка

| ID | Слои рецепта |
|---|---|
| CAT_MEOW | osc sawtooth 700→520 Гц, 0,45 с, -16 дБ |
| CAT_HISS | шум white highpass 3000→4000 Гц Q1, 0,6 с, -16 дБ |
| CAT_PURR | osc sawtooth 26→26 Гц, 1,2 с, -18 дБ |
| CAT_RUN | шум brown lowpass 900→900 Гц Q1, 0,04 с, -24 дБ + +0,08 шум brown lowpass 900→900 Гц Q1, 0,04 с, -24 дБ + +0,16 шум brown lowpass 900→900 Гц Q1, 0,04 с, -24 дБ + +0,24 шум brown lowpass 900→900 Гц Q1, 0,04 с, -24 дБ + +0,32 шум brown lowpass 900→900 Гц Q1, 0,04 с, -24 дБ + +0,4 шум brown lowpass 900→900 Гц Q1, 0,04 с, -24 дБ |
| CAT_STEP | шум brown lowpass 700→700 Гц Q1, 0,03 с, -32 дБ |
| CAT_YOWL | osc sawtooth 900→600 Гц, 0,6 с, -14 дБ |

#### Умывание

| ID | Слои рецепта |
|---|---|
| WASH_STEP_OK | osc triangle 659,25→659,25 Гц, 0,14 с, -16 дБ + +0,07 osc triangle 987,77→987,77 Гц, 0,14 с, -16 дБ |
| WASH_ERROR | osc triangle 300→200 Гц, 0,2 с, -18 дБ |
| WASH_DONE | osc triangle 329,63→329,63 Гц, 0,3 с, -16 дБ + +0,08 osc triangle 415,3→415,3 Гц, 0,3 с, -16 дБ + +0,16 osc triangle 493,88→493,88 Гц, 0,3 с, -16 дБ + шум white bandpass 2000→800 Гц Q1, 0,6 с, -24 дБ |
| WASH_TICK | osc sine 1500→1500 Гц, 0,02 с, -32 дБ |

#### Сборы

| ID | Слои рецепта |
|---|---|
| PREP_MIRROR_STING | osc sawtooth 329,63→349,41 Гц, 1,2 с, -14 дБ + osc square 123,47→123,47 Гц, 1,2 с, -20 дБ + шум white highpass 5000→5000 Гц Q1, 0,5 с, -24 дБ |
| PREP_LEG_TWITCH | osc square 1200→700 Гц, 0,05 с, -24 дБ |
| PREP_LEG_RETRACT | osc sine 900→200 Гц, 0,3 с, -18 дБ |

#### Дорога

| ID | Слои рецепта |
|---|---|
| ROAD_HONK | osc square 392→392 Гц, 0,4 с, -14 дБ + osc square 466→466 Гц, 0,4 с, -16 дБ |
| ROAD_HONK_BUS | osc sawtooth 220→220 Гц, 0,6 с, -12 дБ + osc sawtooth 277→277 Гц, 0,6 с, -14 дБ |
| ROAD_SCREECH | шум white bandpass 3200→2400 Гц Q8, 0,7 с, -14 дБ + osc sawtooth 1800→1500 Гц, 0,6 с, -24 дБ |
| ROAD_CRASH_SOFT | osc sine 100→50 Гц, 0,3 с, -10 дБ + шум brown lowpass 1500→200 Гц Q1, 0,35 с, -12 дБ |
| ROAD_LIGHT_GREEN | osc sine 659,25→659,25 Гц, 0,18 с, -18 дБ + +0,12 osc sine 783,99→783,99 Гц, 0,18 с, -18 дБ |
| ROAD_LIGHT_RED | osc sine 783,99→783,99 Гц, 0,18 с, -20 дБ + +0,12 osc sine 659,25→659,25 Гц, 0,18 с, -20 дБ |
| ROAD_LIGHT_BLINK | osc square 1000→1000 Гц, 0,05 с, -26 дБ |
| ROAD_BEEP_WALK | osc square 2000→2000 Гц, 0,03 с, -28 дБ |
| ROAD_TIMER_20 | osc triangle 493,88→493,88 Гц, 0,2 с, -16 дБ + +0,15 osc triangle 369,99→369,99 Гц, 0,2 с, -16 дБ |
| ROAD_TIMER_10 | osc triangle 493,88→493,88 Гц, 0,2 с, -14 дБ + +0,12 osc triangle 369,99→369,99 Гц, 0,2 с, -14 дБ + +0,24 osc triangle 246,94→246,94 Гц, 0,2 с, -14 дБ |
| ROAD_TIMER_TICK | osc square 1400→1400 Гц, 0,06 с, -18 дБ |
| ROAD_DOOR | osc sine 600→600 Гц, 0,1 с, -20 дБ + +0,1 osc sine 800→800 Гц, 0,15 с, -20 дБ |
| ROAD_PASSBY | шум pink bandpass 300→900 Гц Q1, 0,9 с, -20 дБ |

#### Лаборатория

| ID | Слои рецепта |
|---|---|
| LAB_DOOR_SLIDE | шум pink bandpass 400→900 Гц Q1,5, 0,9 с, -16 дБ + osc sawtooth 70→90 Гц, 0,9 с, -22 дБ |
| LAB_CARD_BEEP | osc square 1000→1000 Гц, 0,08 с, -20 дБ |
| LAB_LED_GREEN | osc sine 523,25→523,25 Гц, 0,15 с, -18 дБ + +0,08 osc sine 783,99→783,99 Гц, 0,15 с, -18 дБ |
| LAB_CONSOLE_LEVER | osc square 160→100 Гц, 0,15 с, -14 дБ + шум white bandpass 1000→1000 Гц Q1, 0,1 с, -20 дБ |
| LAB_MACHINE_STOP | osc sawtooth 220→40 Гц, 1,4 с, -14 дБ + шум pink lowpass 2000→100 Гц Q1, 1,2 с, -22 дБ |
| LAB_PICKUP_CONTAINER | osc sine 600→900 Гц, 0,15 с, -18 дБ + шум white bandpass 2500→2500 Гц Q1, 0,1 с, -26 дБ |
| LAB_HATCH_OPEN | osc sawtooth 120→220 Гц, 0,6 с, -18 дБ + +0,55 osc square 500→500 Гц, 0,06 с, -22 дБ |
| LAB_INSERT | osc sine 300→150 Гц, 0,3 с, -12 дБ + шум brown lowpass 800→800 Гц Q1, 0,2 с, -16 дБ + +0,25 osc square 900→900 Гц, 0,06 с, -22 дБ |
| LAB_DISPOSE_BOOM | osc sine 70→30 Гц, 1,2 с, -6 дБ + шум brown lowpass 2500→80 Гц Q1, 1 с, -10 дБ + +0,05 шум white highpass 3000→1000 Гц Q1, 0,6 с, -18 дБ |
| LAB_LAMP_GREEN | osc sine 659,25→659,25 Гц, 0,25 с, -18 дБ + +0,07 osc sine 830,6→830,6 Гц, 0,25 с, -18 дБ + +0,14 osc sine 987,77→987,77 Гц, 0,25 с, -18 дБ |
| LAB_BUBBLE | osc sine 500→1200 Гц, 0,07 с, -26 дБ |
| LAB_KEYPAD | osc square 1300→1300 Гц, 0,04 с, -24 дБ |

#### Кат-сцены

| ID | Слои рецепта |
|---|---|
| CUT_WHOOSH | шум pink bandpass 400→2400 Гц Q1, 0,6 с, -16 дБ |
| CUT_STING | osc sawtooth 164,81→164,81 Гц, 0,9 с, -16 дБ + osc sawtooth 246,94→246,94 Гц, 0,9 с, -18 дБ |
| CUT_SWELL | шум pink bandpass 200→1600 Гц Q0,8, 2 с, -18 дБ |

#### Разное

| ID | Слои рецепта |
|---|---|
| BOING_SOFT | osc sine 220→440 Гц, 0,3 с, -14 дБ |
| PAPER_FLIP | шум white highpass 2000→600 Гц Q0,8, 0,3 с, -18 дБ |

#### Игровые петли (`LOOPS`, sfx.js)

| ID | Устройство |
|---|---|
| ROAD_ENGINE | пила 62 Гц + бурый шум (0,5) → LPF 420 Гц Q2, 0,16; setRate — высота от скорости машины |
| ROAD_BUS_ENGINE | то же, базовая частота 41 Гц (автобус) |
| LAB_DISPOSE_CHARGE | пила 70 Гц + синус 140 Гц → LPF 500 Гц, 0,18; высота растёт с прогрессом удержания E (70 → 400 Гц) |
| HOUSE_WATER_RUN | белый шум → полосовой 1800 Гц Q0,8 с LFO 7 Гц ±500 Гц, 0,22 — вода из крана |
| BED_SNORE_LOOP | бурый шум → LPF 320 Гц Q3, амплитуда по LFO 0,3 Гц (вдох-выдох) — храп спящего |
| SPIDER_WIND | розовый шум → полосовой 600 Гц Q0,6, 0,1 — сквозняк в спальне |

#### Петли окружения (`AMB`, ambience.js)

| ID | Рецепт (фрагмент кода) |
|---|---|
| AMB_MENU_NIGHT | `const w = k.noise('pink', 'lowpass', 450, 0.5, 0.13); k.lfo(0.07, 220, w.b.frequency); k.every(0.25, 0.7, () => { const p = k.rpan(); for (let i = 0; i < 3; i++) k.chirp(4300, 4200, 0.028, 0.012, 'sine', p, i * 0.05); }); k.every(8, 15, () => { k.chirp(390, 34…` |
| AMB_BEDROOM | `k.noise('brown', 'lowpass', 220, 0.4, 0.22); let tock = false; k.every(1.0, 1.0, () => { tock = !tock; k.burst('highpass', tock ? 2600 : 3300, 1.5, 0.025, 0.04, 0.5); }); k.every(0.5, 1.4, () => { const p = -0.6; for (let i = 0; i < 3; i++) k.chirp(4300, 4200,…` |
| AMB_MEMORY | `const a = k.tone('sine', 164.81, 0.022), b = k.tone('sine', 246.94, 0.018); k.lfo(0.2, 0.012, a.g.gain); k.lfo(0.27, 0.01, b.g.gain); const w = k.noise('pink', 'bandpass', 1400, 2, 0.05); k.lfo(0.09, 500, w.b.frequency); k.every(1.5, 3.5, () => { const f = [13…` |
| AMB_BRAIN | `k.tone('sine', 55, 0.05); const t = k.tone('triangle', 110, 0.018); k.lfo(0.3, 0.012, t.g.gain); k.noise('pink', 'lowpass', 600, 0.6, 0.06); k.every(0.3, 1.2, () => { const f = 300 + Math.random() * 400; k.chirp(f, f * 1.8, 0.07, 0.018, 'sine', k.rpan()); }); …` |
| AMB_COCKPIT | `k.tone('square', 60, 0.025, 240); k.noise('pink', 'lowpass', 1500, 0.5, 0.04); k.every(2, 5, () => { const f = Math.random() < 0.5 ? 1200 : 1600; k.chirp(f, f, 0.06, 0.018, 'sine', k.rpan()); k.chirp(f * 1.25, f * 1.25, 0.06, 0.016, 'sine', 0, 0.09); }); }` |
| AMB_HOUSE_MORNING | `k.noise('pink', 'lowpass', 900, 0.5, 0.035); k.every(1.2, 4, () => birds(k, 0.022)); k.every(10, 20, () => k.burst('lowpass', 300, 0.6, 2.2, 0.05, k.rpan(), 0, 'brown')); }` |
| AMB_BATH | `k.noise('pink', 'lowpass', 700, 0.6, 0.06); k.every(1.4, 3.2, () => { const p = k.rpan() * 0.5; k.chirp(1100, 480, 0.05, 0.05, 'sine', p); k.chirp(900, 420, 0.04, 0.015, 'sine', p, 0.18); }); }` |
| AMB_STREET | `const r = k.noise('brown', 'lowpass', 180, 0.5, 0.3); k.lfo(0.1, 0.08, r.g.gain); k.noise('pink', 'lowpass', 800, 0.4, 0.03); k.every(3, 7, () => birds(k, 0.015)); k.every(12, 25, () => { const p = k.rpan(); k.chirp(330, 330, 0.35, 0.012, 'sawtooth', p); k.chi…` |
| AMB_LAB | `k.tone('sawtooth', 120, 0.012, 400); k.tone('sine', 240, 0.006); k.noise('pink', 'lowpass', 1100, 0.5, 0.05); k.every(4, 8, () => { k.chirp(1800, 1800, 0.05, 0.012, 'sine', k.rpan()); }); k.every(0.6, 1.8, () => { const f = 400 + Math.random() * 500; k.chirp(f…` |
| AMB_LAB_MACHINE | `const m = k.tone('sawtooth', 70, 0.035, 300); k.lfo(2, 0.02, m.g.gain); k.noise('white', 'bandpass', 3000, 1.5, 0.008); k.every(3, 6, () => k.chirp(200, 420, 0.5, 0.014, 'sawtooth', 0.3)); }` |

## §11. Все строки текста (`js/text/ru.js`)

Всего ключей: 265. Подстановки — `{name}`.

| Ключ | Текст |
|---|---|
| `game.title` | Восемь лап — две ноги |
| `game.subtitle` | Паук берёт управление |
| `loading` | Загрузка… |
| `nowebgl.title` | Ваш браузер не поддерживает WebGL… |
| `nowebgl.text` | Без WebGL 3D-сцены не отрисовать. Попробуйте свежий Chrome или Firefox либо включите аппаратное ускорение. |
| `nowebgl.menu` | В меню |
| `error.generic` | Что-то пошло не так. Вернуться в меню? |
| `menu.play` | Играть |
| `menu.new` | Новая игра |
| `menu.continue` | Продолжить |
| `menu.exit` | Выйти |
| `menu.settings` | Настройки |
| `menu.controls` | Управление |
| `menu.authors` | Авторы |
| `menu.back` | Назад |
| `menu.newConfirm` | Начать новую игру? Текущее сохранение будет перезаписано. |
| `menu.corrupt` | Сохранение повреждено. Начать новую игру? |
| `menu.exitText` | Спасибо, что играли! Вкладку можно закрыть. |
| `menu.start` | Нажмите любую клавишу или кликните |
| `menu.completed` | Игра пройдена. Начните заново! |
| `menu.continueAt` | Серия {n}: {title} |
| `menu.yes` | Да |
| `menu.no` | Нет |
| `menu.ok` | Хорошо |
| `menu.version` | Версия {v} · Sharrowkin Jam |
| `card.series` | СЕРИЯ {n} |
| `card.s1` | Я тебя помню |
| `card.s2` | Путь к человеку |
| `card.s3` | Кто здесь главный? |
| `card.s4` | Рефлекс |
| `card.s5` | Страх |
| `card.s6` | Воля |
| `card.s7` | Утренние процедуры |
| `card.s8` | Сборы |
| `card.s9` | Дорога |
| `card.s10` | Уничтожение яда |
| `card.skip` | Любая клавиша — продолжить |
| `cut.C_Levers` | Слишком много рычагов |
| `cut.C_Wardrobe` | Выглядеть человеком |
| `cut.C_ExitHome` | Выход из дома |
| `cut.C_LabEntry` | Вход в лабораторию |
| `cut.C_User` | Пролог |
| `obj.s1.watch` | Вспомни, кто он |
| `obj.s2.bed` | Доберись до кровати |
| `obj.s2.pillow` | Заберись на подушку |
| `obj.s2.ear` | Проникни в ухо |
| `obj.s3.meet` | Познакомься с хозяевами головы |
| `obj.s4.win` | Победи Рефлекса |
| `obj.s5.win` | Победи Страх |
| `obj.s6.win` | Победи Волю |
| `obj.s7.up` | Поднимись на второй этаж |
| `obj.s7.sink` | Подойди к раковине |
| `obj.s7.wash` | Умойся |
| `obj.s8.items` | Собери три предмета ({n}/3) |
| `obj.s8.exit` | Спустись и выйди из дома |
| `obj.s9.cross` | Перейди дорогу до начала смены |
| `obj.s10.stop` | Останови установку |
| `obj.s10.insert` | Помести контейнер в утилизатор |
| `obj.s10.destroy` | Запусти уничтожение |
| `item.pass` | Пропуск |
| `item.notebook` | Записная книжка |
| `item.keys` | Ключи |
| `name.reflex` | Рефлекс |
| `name.fear` | Страх |
| `name.will` | Воля |
| `name.spider` | Паук |
| `name.scientist` | Учёный |
| `role.reflex` | отвечает за «дёрнуться» |
| `role.fear` | отвечает за «а вдруг» |
| `role.will` | отвечает за «надо» |
| `sub.night` | Ночь. Он спит. |
| `sub.memory` | Это он. |
| `sub.memory2` | Тот, кто варит Арахноцид. |
| `sub.meet` | Посторонним в голове не место. |
| `sub.meet.reflex` | Тревога! Чужой в голове! |
| `sub.meet.fear` | Ой-ой-ой… он с лапками… |
| `sub.levers` | Теперь я за штурвалом. |
| `sub.levers.mouth` | Это лучше не трогать. |
| `sub.mumble` | М-м-м… кто здесь… |
| `sub.wardrobe` | Носок?! Откуда здесь носок? |
| `sub.exithome` | Лаборатория №3 — прямо через дорогу. |
| `sub.labentry` | Доступ разрешён. |
| `sub.labentry2` | Знакомое местечко. |
| `sub.final` | Ну всё. Можно и отдохнуть. |
| `sub.mirror` | Ой… лапка из уха торчит! Замри — втяну. |
| `hint.move` | идти |
| `hint.sneak` | крадучись |
| `hint.careful` | осторожно |
| `hint.web` | паутина / проникнуть |
| `hint.bite` | укус |
| `hint.dash` | рывок |
| `hint.use` | действие |
| `hint.take` | взять |
| `hint.hold` | удерживать |
| `hint.skip` | удерживать — пропустить |
| `hint.wash` | держи стрелку в зелёной зоне |
| `hint.fight` | сразиться |
| `hint.pause` | пауза |
| `prompt.web` | E — забраться по паутине |
| `prompt.webDown` | E — спуститься по паутине |
| `prompt.ear` | E — проникнуть |
| `prompt.wash` | E — умыться |
| `prompt.take` | E — взять: {item} |
| `prompt.exit` | E — выйти |
| `prompt.console` | E — остановить установку |
| `prompt.container` | E — взять контейнер |
| `prompt.insert` | E — вставить контейнер |
| `prompt.dispose` | Удерживай E — уничтожить |
| `prompt.keysLocked` | Сначала разберись с отражением |
| `prompt.fight` | Сразиться |
| `fail.swat` | Прихлопнули! |
| `fail.woke` | Он проснулся |
| `fail.battle` | Паук повержен |
| `fail.fall` | Упал! |
| `fail.late` | Опоздал! |
| `fail.drop` | Уронил контейнер! |
| `defeat.title` | Поражение |
| `defeat.retry` | Ещё раз (любая клавиша) |
| `defeat.toS04` | Защитники снова в строю — начнём с Рефлекса. |
| `tip.s2.light` | В лунном свете тебя видно. Держись в тени и в складках одеяла. |
| `tip.s2.shift` | Shift — крадёшься: шкала пробуждения растёт медленнее. |
| `tip.s2.warn` | Увидел «!» — уходи из заштрихованной зоны или прячься в тень. |
| `tip.s4` | Рефлекс уязвим только после рывка — кусай, пока он оглушён. |
| `tip.s5` | Ищи разрыв в кольце. Настоящий Страх — с каплей пота. |
| `tip.s6` | Кусай Волю со спины или когда он раскрылся после удара. |
| `tip.battle.dash` | Shift — рывок сквозь атаку. Во время рывка ты неуязвим. |
| `tip.s7` | Резкие повороты раскачивают. Стой или иди с Shift, чтобы прийти в себя. |
| `tip.s8` | Не бегай у стола — кружка опрокинется. У зеркала замри. |
| `tip.s9` | На полосах 3–5 жди зелёного. На полосах 1–2 лови окно в потоке. |
| `tip.s10` | С контейнером не делай резких поворотов. |
| `tip.s10drop` | Он герметичен — снова на столе. С контейнером — без резких поворотов, Shift помогает. |
| `wash.title` | Умывание |
| `wash.step1` | Открыть кран |
| `wash.step2` | Набрать воду в ладони |
| `wash.step3` | Умыться |
| `wash.hint` | A / D — держи стрелку в зелёной зоне |
| `wash.error` | Мимо! Ещё раз |
| `wash.done` | Свежесть! |
| `mirror.hint` | Замри! Не двигайся 2 секунды |
| `mirror.done` | Фух. Контроль восстановлен. |
| `bal.label` | Равновесие |
| `wake.label` | Пробуждение |
| `hp.spider` | Паук |
| `road.timer` | До начала смены: {t} |
| `road.late` | Опоздал! |
| `road.hit` | Осторожно! −15 с |
| `road.green` | Зелёный! |
| `lab.locked` | Сначала останови установку |
| `lab.stopped` | Установка остановлена |
| `lab.done` | АРАХНОЦИД УНИЧТОЖЕН |
| `lab.carry` | Неси аккуратно |
| `lab.hatch` | Люк открыт |
| `lab.inserted` | Контейнер в утилизаторе |
| `battle.ready` | Готовься! |
| `battle.fight` | Бой! |
| `battle.win` | Победа! |
| `battle.stun` | Оглушён! |
| `battle.block` | Блок! |
| `battle.enrage` | Воля в ярости! |
| `battle.half` | Он злится! |
| `results.title` | Ты уничтожил Арахноцид |
| `results.time` | Время в игре |
| `results.retries` | Повторов |
| `results.replay` | Пройти заново |
| `results.replayConfirm` | Начать игру заново? Прогресс будет сброшен. |
| `results.menu` | Главное меню |
| `results.credits` | Титры |
| `results.thanks` | Пауки спасены. Учёный выспался. Почти. |
| `pause.title` | Пауза |
| `pause.resume` | Продолжить |
| `pause.settings` | Настройки |
| `pause.controls` | Управление |
| `toast.checkpoint` | Контрольная точка |
| `toast.got` | Взято: {item} |
| `toast.mug` | Кофе на полу — скользко! |
| `toast.allItems` | Всё собрано. Теперь — вниз и на улицу |
| `prompt.needItems` | Сначала собери три предмета ({n}/3) |
| `toast.mirror` | Отражение ведёт себя странно… |
| `pause.restart` | С контрольной точки |
| `pause.menu` | Главное меню |
| `pause.menuConfirm` | Выйти в меню? Прогресс сохранён на последней контрольной точке. |
| `settings.title` | Настройки |
| `settings.sound` | Звук |
| `settings.master` | Общая громкость |
| `settings.music` | Музыка |
| `settings.sfx` | Эффекты |
| `settings.amb` | Окружение |
| `settings.mute` | Выключить звук |
| `settings.video` | Изображение |
| `settings.quality` | Качество |
| `settings.q.low` | Низкое |
| `settings.q.med` | Среднее |
| `settings.q.high` | Высокое |
| `settings.access` | Доступность |
| `settings.shake` | Тряска камеры |
| `settings.lessfx` | Меньше эффектов |
| `settings.cockpit` | Окно «Кабина» |
| `settings.help` | Справка |
| `settings.controls` | Управление |
| `settings.back` | Назад |
| `settings.on` | Вкл |
| `settings.off` | Выкл |
| `controls.title` | Управление |
| `controls.move` | Движение |
| `controls.moveKeys` | W A S D или стрелки |
| `controls.shift` | Осторожно / рывок в бою |
| `controls.shiftKeys` | Shift |
| `controls.action` | Укус / действие |
| `controls.actionKeys` | Пробел |
| `controls.use` | Использовать |
| `controls.useKeys` | E |
| `controls.pause` | Пауза |
| `controls.pauseKeys` | Esc |
| `controls.confirm` | Подтвердить |
| `controls.confirmKeys` | Enter / Пробел |
| `controls.skip` | Пропустить кат-сцену |
| `controls.skipKeys` | удерживать Пробел 1 с |
| `controls.note` | Работает в любой раскладке, в том числе русской. |
| `credits.title` | Восемь лап — две ноги |
| `credits.jam` | Сделано на Sharrowkin Jam |
| `credits.h.design` | Идея, сценарий и персонажи |
| `credits.design` | Команда «Восемь лап — две ноги» |
| `credits.h.code` | Программирование, 3D-модели, 2D-графика, звук и музыка |
| `credits.code` | Claude (Anthropic) — ИИ-разработчик в Notion AI |
| `credits.h.refs` | Референсы персонажей |
| `credits.refs` | Паук, Учёный, Рефлекс, Страх и Воля — по эскизам команды |
| `credits.h.qa` | Тестирование и баланс |
| `credits.qa` | Встроенные самопроверки и команда проекта |
| `credits.three` | Three.js — MIT License |
| `credits.threeAuthors` | mrdoob и авторы Three.js |
| `credits.audio` | Весь звук синтезирован в Web Audio |
| `credits.fonts` | Только системные шрифты |
| `credits.thanks` | Спасибо, что играли! |
| `credits.skip` | Удерживай Пробел — пропустить |
| `ucut.l1` | Город спит. |
| `ucut.l2` | В Лаборатории №3 доваривается Арахноцид v3 — яд против всех пауков. |
| `ucut.l3` | Один маленький паук решил: этого не будет. |
| `ucut.missing` | Пользовательская кат-сцена не найдена — показан встроенный пролог. |
| `world.arachnocide` | АРАХНОЦИД v3 |
| `world.lab3` | ЛАБОРАТОРИЯ №3 |
| `world.mouth` | РОТ — НЕ ТРОГАТЬ |
| `world.legs` | НОГИ |
| `world.arms` | РУКИ |
| `world.eyes` | ГЛАЗА |
| `world.balance` | РАВНОВЕСИЕ |
| `world.case` | ДЕЛО №1 |
| `world.disposer` | УТИЛИЗАТОР |
| `world.stop` | СТОП |
| `world.wardrobe` | ГАРДЕРОБ |
| `world.home` | ДОМ |
| `world.pass` | ПРОПУСК |
| `world.notebook` | ЗАПИСИ |
| `world.shift` | СМЕНА 9:00 |
| `debug.title` | Отладка |
| `debug.god` | Бессмертие |
| `debug.colliders` | Коллайдеры |
| `debug.speed` | Скорость |
| `debug.win` | Победа |
| `debug.reset` | Сохранение сброшено |
| `debug.goto` | Перейти |
| `debug.tests` | Самопроверки |
| `debug.models` | Модели по референсам |
| `debug.soundroom` | Звуковая комната |
| `debug.on` | вкл |
| `debug.off` | выкл |

## §12. Тесты и QA

### §12.1. Встроенные самопроверки (`?debug=1&test=all`)

| Набор | Что проверяет | Проверок |
|---|---|---|
| test.input | коды клавиш (в т.ч. русская раскладка), поглощение «грязных» клавиш, blur | 26 |
| test.save | запись/чтение, повреждённый JSON, v ≠ 1, неизвестная сцена, «битвы → S04», недоступный localStorage | 15 |
| test.graph | у всех сцен есть enter/exit и чекпоинты, все переходы и поражения ведут к существующим id, C_User в обеих позициях | 82 |
| test.road | симуляция 300 с: для каждой полосы окно ≥ 0,9 с не реже раза в 6 с | 6 |
| test.balance | прямая ходьба 60 с → L = 0; поворот 180° на полной скорости +38 ± 2; стоя −20/с; падение на 100 | 8 |
| test.nav | S02 с шагом игры 1/60 с: края одеяло ↔ матрас ↔ подушка срабатывают, когда паук упёрся в край и идёт поперёк; вдоль края — нет; плечи, изголовье, подбородок — препятствия; путь к обоим ушам; зажатая W на подушке (по камере) с 14 точек доводит до уха; точки приземления (1.0.1) | 10 |
| test.battle | нет урона без предупреждения ≥ 0,4 с; i-frames 1 с; рывок только по нажатию; нет двойного урона | 13 |
| test.audio | у всех ID из ids.js есть рецепт; все ID из кода есть в реестре; повторный вход не увеличивает число петель | 10 |
| test.leaks | 10 × enter/exit каждой сцены: слушатели window, твины, renderer.info.memory не растут | 20 |

Итог последнего прогона: **PASS 190 / 190** (≈ 160 с в headless Chromium).

### §12.2. Чек-лист по .png-референсам
- [x] Все 5 персонажей открываются в `?debug=1&scene=MODELS` (плюс кошка и лапка из уха).
- [x] Каждый узнаваем: силуэт, ключевые детали, палитра близки к референсам.
- [x] Пропорции по жанру: паук ≈ 3 см (тело), человек 178 см, человечки 11–12,5 см — в общей шкале 1 ед. = 1 см.
- [x] У каждого есть idle и хотя бы одна атака.
- [x] Треугольники и draw calls в бюджете §8.1.
- [x] Нет текстур-«плоскостей» с референсов, нет «наклеек» на модели.
- [x] В отчёте — таблица «.png → модель» (`ОТЧЁТ.md`).

### §12.3. Тест-кейсы серий (45)

| ID | Сцена | Шаги | Ожидаемый результат |
|---|---|---|---|
| TC01 | МЕНЮ | Открыть игру, любая клавиша, «Играть → Новая игра». | Карточка/пролог → S01; первый клик создаёт AudioContext; ошибок в консоли нет. |
| TC02 | МЕНЮ | Дойти до S07 landing1, выйти в меню, «Продолжить». | Загрузка S07 с чекпоинта landing1 (безопасная точка), подпись «Серия 7: …» в меню. |
| TC03 | Сохранения | Испортить JSON сохранения в localStorage, перезагрузить. | Окно «Сохранение повреждено. Начать новую игру?», игра не падает; v ≠ 1 и неизвестная сцена — так же. |
| TC04 | Пауза | Esc в любой серии; переключить вкладку. | update стоит, render с размытием; при скрытии вкладки — пауза и audio.suspend(), после возврата — меню паузы. |
| TC05 | Настройки | Менять громкости, mute, качество «Низкое», «Меньше эффектов», «Тряска выкл.», кабину. | Применяются сразу, сохраняются между запусками; «Низкое» снижает pixelRatio/тени. |
| TC06 | C_User | Новая игра при position = 'beforeS01'. | Пролог с fade-in/out, субтитры по таймлайну, skip удержанием Пробела 1 с, пауза Esc, mute; затем S01 без рассинхрона музыки. |
| TC07 | C_User | Переименовать/удалить медиа из манифеста. | Через timeout — fallback-слайд ≤ 7,5 с, затем S01; в консоли только предупреждение, без ошибок. |
| TC08 | S01 | Смотреть интро до конца. | ~18 с: спальня → воспоминание (стол, доска «АРАХНОЦИД v3», банки) → субтитр «Это он.» → S02; memorySeen = true. |
| TC09 | S01 | Удерживать Пробел 0,5 с, отпустить; затем удерживать 1,0 с. | Кольцо 18 px справа внизу; до 1 с не пропускает, на 1,0 с — пропуск, флаг memorySeen всё равно ставится. |
| TC10 | S02 | Идти WASD по полу, подойти к точке паутины W1, E. | Движение экранно-относительное в базисе поверхности; подъём по паутине на одеяло. |
| TC11 | S02 | Перейти с одеяла на верх кровати через край (1.0.1: и с матраса на подушку — сбоку и спереди). | Анимация перехода 0,3 с, без физики прилипания и провалов. |
| TC12 | S02 | Стоять на свету в зоне ворочания. | За 1,2 с: храп обрывается, «!», штриховка зоны, BED_CREAK_WARN; удар 0,5 с; в укрытии/тени — безопасно. |
| TC13 | S02 | Попасть под удар ладони. | Тень ладони, мягкий хлопок, «Прихлопнули» → возврат на чекпоинт (bed/pillow). |
| TC14 | S02 | Стоять у головы, идти с Shift, стоять вдали. | Шкала растёт быстро у головы, медленнее с Shift, падает стоя; 70 % — бормотание; 100 % — «Он проснулся», возврат. |
| TC15 | S02 | Подойти к уху на 6 см, E. | «E — проникнуть», паук уходит в ухо 1,6 с, звук глохнет (LPF), 3 удара сердца → S03. |
| TC16 | S03 | Смотреть знакомство, нажать Enter/Пробел/клик. | Плашки имён не перекрываются, субтитр «Посторонним в голове не место.», кнопка «Сразиться» в фокусе → S04; meetSeen = true. |
| TC17 | S03 | Проиграть в S05 и вернуться. | Поражение ведёт в S04 (start), S03 не повторяется. |
| TC18 | S04 | Наблюдать атаку Рефлекса. | Подход 0,9 с → коридор 34 px, мигание 6 Гц, нарастающий свист 0,8 с → рывок 560 px/с; урона без предупреждения нет. |
| TC19 | S04 | Кусать вне оглушения и в оглушении. | Вне — отскок с искрой (SPD_BITE_BLOCK), 0 урона; в оглушении 1,5 с — урон, hitstop 70 мс, вспышка, knockback. |
| TC20 | S04 | Снизить HP Рефлекса ниже 50 %. | Двойной рывок с предупреждением 0,5 с. |
| TC21 | S04 | Получить урон от рывка; стоять в Рефлексе. | i-frames 1 с (мигание), отбрасывание, ровно 1 урон за контакт; HP 0 → поражение → S04 start. |
| TC22 | S05 | Наблюдать кольца Страха. | Каждые 2,2 с, 150 px/с, толщина 18, разрыв 62° виден с появления; ≤ 3 колец; разрывы соседних расходятся ≤ 120°. |
| TC23 | S05 | Дождаться 3-го цикла, укусить копию и настоящего. | 3 фигуры треугольником; настоящий мерцает и с каплей пота; укус копии развеивает её (без урона пауку). |
| TC24 | S05 | Укусить Страх; проиграть. | После попадания телепорт на противоположную сторону (FEAR_BLINK) — 1 укус за подход; поражение → S04. |
| TC25 | S06 | Кусать Волю спереди и сзади во время защиты. | В ±70° от щита — отскок; сзади — 1 урон. |
| TC26 | S06 | Стоять в круге и вне круга при ударе папкой. | Подготовка 1,0 с (красный круг r 95 заполняется) → удар: урон только в круге; затем «открыт» 2,0 с. |
| TC27 | S06 | Снизить HP Воли ниже 50 %. | Энрейдж ×1,3, подготовка 0,8 с, 2 ловушки за цикл (пунктир 0,8 с → сеть, ≤ 4, 8 с), касание — замедление 50 % на 1,5 с без урона. |
| TC28 | C_Levers | Смотреть кат-сцену; во втором прогоне — пропустить. | 18 с: барьер гаснет, кресло, панели по одной, «РОТ — НЕ ТРОГАТЬ», «РУКИ», «ГЛАЗА», рассвет, субтитр; leversDone = true и при пропуске. |
| TC29 | S07 | Подняться по винтовой лестнице. | θ 0 → 540°, позиция (θ, r), площадки landing1 (180–220°) и landing2 (360–400°) — чекпоинты; разрез «человек + 80 см». |
| TC30 | S07 | Наступить на носок, упереться в коробку/сапог, пройти лужу. | Носок — скольжение +14, коробка/сапог — упор +14, лужа — приросты ×2 и инерция ×1,8; застрять нельзя. |
| TC31 | S07 | Резко поворачивать на полной скорости. | 50 — покачивание ±4°, 80 — шатание ±9°, красная полоска и HUM_WOBBLE_WARN, 100 — падение 0,9 с → последняя площадка. |
| TC32 | S07 | Подойти к кошке, врезаться в неё. | Ближе 60 см — садится и мяукает; столкновение +28, кошка убегает за 0,6 с; урон кошке невозможен. |
| TC33 | S07 | У раковины E, мини-игра умывания. | Полоса 360×26, зона 30 %, 3 шага; 0,6 с вне зоны — ошибка и повтор шага; после 3 шагов → C_Wardrobe. |
| TC34 | C_Wardrobe | Смотреть кат-сцену. | Дверь подрагивает, вылетает носок, setOutfit('work'): рубашка, брюки, халат; dressed = true → S08. |
| TC35 | S08 | Подобрать пропуск, записную книжку, ключи (E). | Радиус 45 см, наклон 0,5 с, задача «Собери три предмета (N/3)» обновляется. |
| TC36 | S08 | Врезаться в стол быстро, задеть стул. | > 70 см/с — кружка опрокидывается, лужа кофе (скользко), +14; стул сдвигается на 10 см, +14. |
| TC37 | S08 | Войти в r 120 у зеркала, двигаться, затем стоять 2 с. | PREP_MIRROR_STING, отражение с лапкой из уха дёргается каждые 0,45 с, L +20 %/с при движении, кабина panic; 2 с без движения — контроль, ключи доступны. |
| TC38 | S08 | С тремя предметами спуститься по лестнице к двери, E. | Дверь подсвечена, коробка на 300° обходима, кошка у двери обходима; «E — выйти» → C_ExitHome. |
| TC39 | C_ExitHome | Смотреть кат-сцену. | 11 с: дверь, 3 ступени, бордюр, вывеска «ЛАБОРАТОРИЯ №3» напротив → S09. |
| TC40 | S09 | Наблюдать светофор и поток. | Красный 6,0 → зелёный 4,5 → мигающий 1,0; на зелёный машины тормозят перед стоп-линией x 560; машины видны ≥ 1,5 с. |
| TC41 | S09 | Попасть под машину. | Гудок, скрежет, отскок, −15 с, возврат на последнюю безопасную зону, 0,8 с без управления, 1,5 с неуязвимости, ближайшая машина задержана на 1 с. |
| TC42 | S09 | Дождаться конца таймера; во втором прогоне дойти до двери. | «Опоздал!» → S09 start с полным таймером; вход в дверь при x 450–510 → таймер стоп → C_LabEntry. |
| TC43 | C_LabEntry | Смотреть кат-сцену. | 10 с: пропуск у считывателя, LED красный → зелёный, дверь разъезжается, лаборатория, паутинка на шкафу → S10. |
| TC44 | S10 | Стоп → контейнер → люк → удержание E; отдельно — упасть с контейнером. | Скорость ×0,8, L ×1,4; падение → stopped, контейнер на столе; люк открывается сам; удержание 2,0 с (отпустил — −50 %/с) → вспышка, «АРАХНОЦИД УНИЧТОЖЕН» 2,5 с. |
| TC45 | Финал | Досмотреть финальный штрих, итоги, титры. | Кабина растёт до 320×200, SPD_SIGH → ИТОГИ (время, повторы, «Пройти заново»/«Главное меню») → ТИТРЫ 25 с (пропуск Пробелом) → МЕНЮ «Игра пройдена». |

Результаты прохождения — `qa/testplan.md`.

### §12.4. Ручная проверка окружения
Chrome и Firefox; русская раскладка; изменение размера окна (сцена 960×540 масштабируется с полосами); выключенный звук; «Меньше эффектов» и «Тряска выкл.»; качество «Низкое».

### §12.5. Плейтест: целевые значения и правки

Протокол: 2 сессии × 2 человека, которые игру не видели; наблюдатель молчит, записывает время серии, число поражений, места замешательства (> 10 с без прогресса), цитаты. Правка — только чисел в `js/config.js` по таблице.

| Серия | Цель: время | Цель: поражений | Если хуже цели — что крутить (config.js) | Если слишком легко |
|---|---|---|---|---|
| S02 Путь | 2–3 мин | ≤ 2 | sleeper.tossMin/tossMax ↑, wake.nearRate ↓, wake.standRate ↓ (быстрее спад) | sleeper.warn ↓ до 1,0 |
| S04 Рефлекс | 1–2 мин | ≤ 2 | reflex.stun ↑ (1,5 → 1,8), reflex.warn ↑, battle.spider.hp ↑ | reflex.dashSpeed ↑ |
| S05 Страх | 1,5–2,5 мин | ≤ 2 | fear.gapDeg ↑ (62 → 70), fear.ringEvery ↑, fear.ringSpeed ↓ | fear.maxRings ↑ |
| S06 Воля | 2–3 мин | ≤ 3 | will.open ↑ (2,0 → 2,4), will.prep ↑, will.trapMax ↓ | will.shieldArc ↑ |
| S07 Утро | 2–3 мин | падений ≤ 2 | bal.turn ↓ (38 → 32), bal.decayCareful ↑, wash.zone ↑ (0,30 → 0,36), wash.amp ↓ | bal.cat ↑ |
| S08 Сборы | ≈ 2 мин | ≤ 1 | prep.pickR ↑, mirror.stillTime ↓ (2,0 → 1,6), cat.lie ↓ | mirror.jerk ↑ |
| S09 Дорога | ≈ 1,5 мин | столкновений ≤ 2, опозданий 0 | road.timer ↑ (90 → 105), road.light.green ↑, паттерны полос шире | road.timer ↓ |
| S10 Лаборатория | ≈ 1,5 мин | падений ≤ 1 | lab.carryL ↓ (1,4 → 1,2), lab.decay ↓ | lab.holdE ↑ |
| Кат-сцены | по длительности | — | если > 50 % пропускают — сократить CFG.cut.* | — |

## §13. План сокращений и риски

### §13.1. План сокращений (что режется первым, если не успеваем)

| Приоритет | Что | Статус |
|---|---|---|
| 1 (режется первым) | слои-стемы музыки, лишние вариации SFX | сделано полностью |
| 2 | вторичная динамика халата, дыхание персонажей в кат-сценах | сделано |
| 3 | тени на «Низком», частицы при «Меньше эффектов» | реализовано как настройки |
| 4 | отдельная гардеробная (C_Wardrobe → затемнение) | не понадобилось: сцена есть |
| 5 | кошка в S08 (оставить только в S07) | не понадобилось: кошка в обеих |
| не режется | серии S01–S10, бои, равновесие, сохранения, меню → титры | сделано |

### §13.2. Риски

| Риск | Вероятность | Меры |
|---|---|---|
| Производительность 3D на слабых встроенных GPU (дом с разрезом, зал мозга) | средняя | слияние статики (≤ 150 вызовов), качество «Низкое» (pixelRatio 1, без теней), тени дома обновляются только при смене разреза |
| Различия Firefox/Chrome в Web Audio и WebGL | низкая–средняя | только стандартные API; ручная проверка в Firefox — в чек-листе QA |
| Автозапуск звука/видео пользовательской кат-сцены | средняя | старт только после жеста; при ошибке — fallback-слайд |
| Утечки GPU-памяти при многократных переходах | низкая | disposeTree + releaseScene, test.leaks 10 циклов |
| Мини-игра умывания сложна при низком FPS | низкая | логика в фиксированном шаге; параметры зоны в config.js (§12.5) |
| Плейтест с живыми людьми не проведён | высокая | протокол и таблица правок §12.5 готовы; баланс проверен автопилотом |

## Приложение А. Полный текст промпта

Ниже — исходный промпт без изменений (источник приоритета №1).

````text
================================================================
ПРОМПТ: БРАУЗЕРНАЯ ИГРА «ВОСЕМЬ ЛАП — ДВЕ НОГИ»
Режим: max effort. Один агент — полный цикл: аудит, архитектура,
код, UI/UX, 2D-графика, звук, музыка, кат-сцены, баланс, тесты,
отчёт. Всё, что не покрыто готовыми референсами, — пишешь сам.
================================================================

## 1. ТЕКУЩЕЕ СОСТОЯНИЕ ПРОЕКТА

- В корне проекта уже лежат РЕФЕРЕНСЫ в виде .png-фотографий
  (а не готовые 3D-модели):
    • паук (SPIDER);
    • учёный (SCIENTIST);
    • три человечка-защитника (Рефлекс, Страх, Воля).
  Точные имена файлов и папку смотри в проекте. Это плоские
  растровые изображения, не 3D-модели, не glTF, не OBJ, не FBX.
- Все пять .png-референсов нужно ПЕРЕДЕЛАТЬ в формат, пригодный
  для игры. Что это значит по умолчанию:
    1) Ты анализируешь каждую фотографию: силуэт, пропорции,
       цвета, ключевые детали, позу, характерные элементы.
    2) На основе анализа строишь low-poly 3D-модель ПРОЦЕДУРНО
       из примитивов Three.js (kit.box, kit.capsule, kit.sphere,
       kit.cyl, kit.cone, kit.torus, kit.tube, kit.roundBox,
       kit.label) по §9 (визуал) и §8 PLAN (каталог моделей).
       Цвета, пропорции и силуэты берутся с фотографий, чтобы
       персонаж узнавался, но геометрия — оригинальная
       процедурная, без копирования чужих ассетов.
    3) Материалы — MeshToonMaterial с gradientMap 3 ступени и
       обводкой #1d1519 по §9. Стекло и металл — цветом и
       отдельным материалом, без PBR.
    4) Шарниры и анимации — процедурные по §9 (анимации).
    5) Если референс не помещается в бюджет треугольников —
       упрощай пропорции, но сохраняй узнаваемость.
    6) Если референс противоречит жанровой логике игры (например,
       слишком реалистичный), адаптируй под общий cartoon-стиль.
    7) Не встраивай .png в игру как спрайт, не натягивай его
       на плоскость и не используй как текстуру — только как
       визуальный референс для процедурной 3D-модели.
- Больше в проекте ничего нет: ни сцен, ни движка игры, ни
  интерфейса, ни звука, ни кат-сцен, ни 2D-графики, ни сохранений,
  ни тестов.
- Все остальное ты строишь с нуля.
- Итог: в корне должна лежать полностью играбельная браузерная
  игра «Восемь лап — две ноги», которую можно запустить локальным
  HTTP-сервером и пройти от меню до титров. Все пять .png-
  референсов должны быть воплощены в узнаваемые 3D-модели.
- Все уровни/карты, которые уже есть в корне проекта, должны быть
  подключены и полностью играбельны от старта до победы/поражения.
  Если карта битая или неполная — почини/адаптируй и зафиксируй
  это в отчёте. Никаких недоступных, недоделанных или «висящих»
  уровней быть не должно.

ПОРЯДОК РАБОТЫ С .PNG-РЕФЕРЕНСАМИ:
- Шаг 1. Открой каждый .png и опиши: силуэт, пропорции, палитру
  (hex-цвета), ключевые детали, позу, характер.
- Шаг 2. Сопоставь с каталогом §8 PLAN:
    • SPIDER → §8.2.1 (тело, 8 лап по 3 сегмента, хелицеры,
      педипальпы, глаза, узор брюшка, обводка 0,06).
    • SCIENTIST → §8.2.2 (голова, очки, волосы, рот, торс,
      конечности, варианты одежды pajama/work, халат).
    • DEF_REFLEX → §8.2.3 (худой, спортивный костюм, повязка,
      молоточек).
    • DEF_FEAR → §8.2.4 (мешковатый свитер, крупные глаза,
      капля пота, дрожь).
    • DEF_WILL → §8.2.5 (коренастый, халат, очки, щит-папка
      «ДЕЛО №1»).
- Шаг 3. Собери каждого персонажа из примитивов с шарнирами
  по §8. Файлы моделей — js/models/spider.js, scientist.js,
  def_reflex.js, def_fear.js, def_will.js. Фабрика makeHuman(spec)
  для SCIENTIST и трёх человечков.
- Шаг 4. Прогони в тестовой сцене (?debug=1&scene=MODELS) всех
  пятерых рядом, с одной камерой, одним светом и общей шкалой
  (1 ед. = 1 см): паук 3 см, человек 178 см, человечки 11–12,5 см.
  Проверь, что силуэты и цвета считываются как на .png.
- Шаг 5. Добавь idle-анимации и по одной атаке для каждого.
- Шаг 6. В отчёте — таблица «.png → модель»: что взято, что
  упрощено, что пришлось додумать, сколько треугольников.

## 2. РАЗРЕШЕНИЯ И ОГРАНИЧЕНИЯ

РАЗРЕШЕНО:
- Вносить ЛЮБЫЕ изменения в проект: код, структуру, сцены, UI,
  баланс, конфиги, анимации, визуал и ассеты — если это нужно
  для качества.
- Ломать/переделывать/дополнять существующие заглушки, если они
  мешают финальному результату.
- Использовать .png-референсы как визуальный ориентир для
  процедурных 3D-моделей.
- Дорисовывать процедурно недостающие детали (лапка из уха,
  кошка, окружение), если их нет на референсах.

ОБЯЗАТЕЛЬНО:
- После каждого крупного этапа и в конце — подробный отчёт:
  что изменено, зачем, какие файлы/системы затронуты, как
  проверить, какие риски и что осталось. В конце — сводный
  CHANGELOG.md и отчёт «было / стало / почему», плюс таблица
  «.png → модель».
- Приоритет — сохранить узнаваемость всех пяти персонажей
  с их .png-референсов; новые ассеты — только при обоснованной
  нехватке.
- Работай маленькими проверяемыми шагами. Каждый шаг — запуск
  в браузере и отчёт «проверено / не проверено».
- Не ломай работающие механики без причины. Изменения — через
  git с понятными коммитами, обратимо.

ЗАПРЕЩЕНО:
- Внешние ассеты: никаких CDN, npm-пакетов, аудиофайлов, внешних
  картинок и шрифтов. Three.js положи в vendor/three/
  three.module.min.js (скачай один раз с официального релиза r170
  и закоммить локально).
- Использовать .png как игровую текстуру/спрайт для персонажей.
  Только как визуальный референс для процедурной 3D-модели.
- Node и сборщики. Запуск через `python -m http.server 8000`.
- `setInterval` для игровой логики.
- `Math.random()` там, где важна честность — только сидированный
  ГПСЧ (mulberry32) в core/rng.js.
- Копирование чужих ассетов и брендов. «PvZ» и подобные названия —
  только как жанровый референс в комментариях, не в игре.
  Название продукта — «Восемь лап — две ноги».

СТЕК:
- HTML + CSS + JS (ES-модули).
- Three.js r170 из vendor/ — 3D.
- Canvas 2D — 2D-серии и эффекты.
- DOM — интерфейс, меню, HUD, пауза, субтитры.
- Web Audio — весь звук и вся музыка (синтез).

## 3. АРХИТЕКТУРА И СТРУКТУРА ПРОЕКТА

Цикл: фиксированный шаг 1/60 с через аккумулятор, рендер — каждый
кадр с интерполяцией. dt ограничен сверху: dt = min(dt, 0.1).
На паузе update не вызывается, render вызывается (для размытия).
visibilitychange → принудительная пауза и audio.suspend().

Структура (создать):

index.html
css/style.css
vendor/three/three.module.min.js
docs/GDD.md, docs/PLAN.md
qa/testplan.md, qa/bugs.md
assets/refs/                     # сюда положи .png-референсы
                                 # (или оставь там, где они уже лежат)
js/main.js
js/config.js                     # ВСЕ числа
js/text/ru.js                    # ВСЕ строки
js/core/loop.js
js/core/scenes.js                # SceneManager, граф
js/core/input.js
js/core/save.js
js/core/events.js
js/core/rng.js
js/core/balance.js
js/core/tween.js
js/ui/hud.js, menu.js, card.js, pause.js, settings.js,
      objectives.js, holdskip.js, results.js, credits.js
js/ui/cockpit.js
js/three/renderer.js, toon.js, lights.js, camera.js, kit.js
js/models/spider.js, scientist.js, def_reflex.js,
         def_fear.js, def_will.js, cat.js, spider_leg_ear.js
js/anim/*.js
js/scenes3d/S01_Intro.js … S10_Lab.js,
            C_Levers.js, C_Wardrobe.js,
            C_ExitHome.js, C_LabEntry.js,
            MODELS.js           # тестовая сцена для референсов
js/scenes2d/S04_Reflex.js, S05_Fear.js, S06_Will.js,
            S09_Road.js, battleCore.js
js/gfx2d/*.js
js/audio/engine.js, sfx.js, music.js, ambience.js
js/cutscenes/timeline.js
js/cutscenes/data/*.js

Контракт сцены (обязателен для всех):

export default {
  id: 'S07_Morning',
  kind: '3d' | '2d' | 'cut',
  series: 7 | null,
  objectives: ['obj.s7.up', 'obj.s7.sink', 'obj.s7.wash'],
  async enter(ctx, params) {},   // ctx = {renderer, c2d, ui, input,
                                 //        audio, save, cfg, events}
  update(dt) {},
  render(alpha) {},
  pause() {}, resume() {},
  exit() {},   // ОБЯЗАН снять слушателей, остановить петли,
               // dispose() геометрий, материалов, текстур
  checkpoints: ['start', 'landing1', 'landing2', 'sink']
};

Граф переходов:

MENU → S01_Intro → S02_Path → S03_Meet → S04_Reflex → S05_Fear
     → S06_Will → C_Levers → S07_Morning → C_Wardrobe → S08_Prep
     → C_ExitHome → S09_Road → C_LabEntry → S10_Lab
     → RESULTS → CREDITS → MENU

Отладочная сцена MODELS доступна по ?debug=1&scene=MODELS.

Поражение:
S02→S02(chk) | S04/S05/S06→S04(start) | S07→S07(chk)
| S08→S08(chk) | S09→S09(start) | S10→S10(chk)

ЛОГИЧЕСКОЕ НАЧАЛО И КОНЕЦ:
- Начало: главное меню → интро-кат-сцена (S01) → первая играбельная
  серия. Внятная цель игрока.
- Конец: финальная серия S10 → экран итогов → титры → меню.
  Никакого «игра просто обрывается».
- Арка: воспоминание → путь → бои → пробуждение → сборы → дорога →
  лаборатория → уничтожение яда → итоги.

## 4. СЕРИИ И КАТ-СЦЕНЫ (обязательная суть)

Полные потактные таблицы — в docs/PLAN.md §6.

S01_Intro «Я тебя помню» (3D кат-сцена, ~18 с):
Паук на шкафу в лаборатории смотрит на спящего человека.
Воспоминание: вид со шкафа вниз, учёный у стола, доска
«АРАХНОЦИД v3», банки с пауками, крупный план. Субтитр «Это он.».
memorySeen = true. Пропуск удержанием Пробела 1,0 с, кольцо
прогресса 18 px в правом нижнем углу.

S02_Path «Путь к человеку» (3D, паук, 2–3 мин):
Задачи: «Доберись до кровати» → «Заберись на подушку» →
«Проникни в ухо».
- Поверхности-плоскости (F пол, B одеяло, T верх кровати, P подушка)
  с локальными координатами (u, v). Переходы — только через паутину
  (точки W1, W2 с пульсирующим бликом) и через край одеяла с
  анимацией 0,3 с. Никакой физики прилипания.
- Управление экранно-относительное (WASD по плоскости поверхности).
- Лунный свет: 3 плоские полосы с аддитивным материалом. «На свету»
  = центр паука внутри полосы. Укрытия — складки одеяла и ямка
  подушки.
- Ворочание спящего: интервал 6–9 с. Предупреждение 1,2 с: храп
  обрывается, «!», штриховка зоны, звук BED_CREAK_WARN. Удар 0,5 с.
  Поражение, если в зоне И на свету И не в укрытии. Прихлопнули —
  тень ладони, мягкий хлопок, возврат. Пробуждение 100 % —
  «Он проснулся», возврат.
- Шкала пробуждения: рядом с головой растёт быстро, Shift медленно,
  стоять — падает. 70 % — бормотание, 100 % — поражение.
- Ухо: в радиусе 6 см «E — проникнуть», паук уходит в ухо (1,6 с),
  звук глохнет LPF, 3 удара сердца → S03.
- Контрольные точки: start, bed, pillow.
- Камера: следящая, локальный базис поверхности, FOV 55.

S03_Meet «Кто здесь главный?» (3D, ~12 с + кнопка):
Паук в голове, напротив — Рефлекс, Страх, Воля (12 см, в 4 раза
выше паука). Камера на уровне глаз. Диалоговые плашки имён.
Субтитр «Посторонним в голове не место.». Кнопка «Сразиться»
в фокусе (Enter / Space / клик) → S04. meetSeen = true. После
поражений в боях не повторяется.

S04 «Рефлекс» (2D, HP 10):
Цикл: подход 0,9 с → предупреждение 0,8 с (стрелка-коридор шириной
34, мигание 6 Гц, нарастающий свист) → рывок 560 px/с по прямой →
оглушение 1,5 с (звёздочки, укусы проходят). Вне оглушения укус
отскакивает с искрой. Ниже 50 % — двойной рывок с предупреждением
0,5 с.

S05 «Страх» (2D, HP 8):
Кольца каждые 2,2 с: расширяются от Страха 150 px/с, толщина 18,
разрыв 62° (виден с момента появления белыми засечками), контакт
= 1 урон. Одновременно ≤ 3 колец. Разрывы соседних расходятся ≤ 120°.
Страх отходит 50 px/с, дрожит. Каждый 3-й цикл — 3 фигуры по
треугольнику: настоящий мерцает белым контуром и с каплей пота;
укус копии её развеивает. После попадания Страх телепортируется
на противоположную сторону (FEAR_BLINK) — за подход 1 укус.

S06 «Воля» (2D, HP 12):
Защита 1,6–2,6 с (щит повёрнут к пауку, укус в ±70° от щита
отскакивает, сзади — 1 урон) → подготовка 1,0 с (папка над
головой, красный круг r 95, заполняется от центра) → удар
(1 урон, если в круге) → открыт 2,0 с (укусы с любой стороны).
Ниже 50 % — энрейдж: скорость ×1,3, подготовка 0,8 с, каждый
цикл ставит 2 ловушки-сетки (пунктир 0,8 с → сеть, макс 4,
живут 8 с, касание замедляет 50 % на 1,5 с без урона).

C_Levers «Слишком много рычагов» (3D кат-сцена, 18 с):
Барьер гаснет. Паук идёт к пульту, запрыгивает в кресло. Панели
загораются по одной. Лапа к кнопке «РОТ — НЕ ТРОГАТЬ» и отдёргивается.
Рычаги «РУКИ», «ГЛАЗА». Снаружи: палец дёргается, глаза открываются,
человек садится, в окне рассвет. Субтитр «Теперь я за штурвалом.».
leversDone = true (при пропуске тоже).

S07_Morning «Утренние процедуры» (3D, человек, 2–3 мин):
Задачи: «Поднимись на второй этаж» → «Подойди к раковине» → «Умойся».
- Винтовая лестница: колодец Ø 260, столб Ø 40, ходовое кольцо
  r 35–120. Подъём 300 см за 540°, θ накапливается непрерывно,
  позиция — (θ, r). Площадки landing1 (θ 180–220°, h 100) и landing2
  (θ 360–400°, h 200). Препятствия: SOCK_STAIR (скользкий, +14),
  BOX_STAIR (+14), BOOT_STAIR (+14), PUDDLE_STAIR (приросты ×2,
  инерция ×1,8).
- Кошка: патрулирует r 85, 25 см/с, паузы 2 с. Ближе 60 см — садится
  и мяукает (предупреждение). Столкновение +28, кошка убегает за
  0,6 с. Урон кошке невозможен.
- Модель равновесия L (0–100): поворот +38, столкновение +14 (не чаще
  раза в 0,4 с), кошка +28, лужа — приросты ×2. Обычная ходьба −4/с,
  Shift −12/с, стоя −20/с. 50 — покачивание (крен ±4°), 80 — шатание
  (крен ±9°, красная полоска, HUM_WOBBLE_WARN), 100 — падение
  (0,9 с, возврат на последнюю площадку).
- Камера: сверху под углом, сглаживание 0,2 с. Геометрия выше
  «человек + 80 см» — прозрачность 0,2 без записи глубины. Внешняя
  стена — «кукольный домик».
- Ванная: раковина, зеркало за полотенцем, зона 50 см, «E — умыться».
- Умывание: полоса 360×26, зелёная зона 30 %, стрелка по синусу
  0,55 Гц с амплитудой 42 %, A/D двигают на 0,9 ширины/с. Внутри
  зоны — прогресс 1,6 с/шаг, вне — стоит. 0,6 с вне зоны — ошибка
  (повтор текущего шага). 3 шага: «Открыть кран» → «Набрать воду
  в ладони» → «Умыться».
- Контрольные точки: start, landing1, landing2, sink.

C_Wardrobe «Выглядеть человеком» (3D, 12 с):
Человек идёт в гардеробную, дверь подрагивает, вылетает носок (гэг),
setOutfit('work'), выходит в рубашке/брюках/белом халате.
dressed = true.

S08_Prep «Сборы» (3D, человек, ~2 мин):
Задачи: «Собери три предмета» (Пропуск, Записная книжка, Ключи) →
«Спустись и выйди из дома».
- Комната: стол (PASS_CARD, MUG_COFFEE), стул (NOTEBOOK, проход 70 см),
  напольное зеркало + комод с KEYS.
- Подбор: радиус 45 см, E, наклон 0,5 с. Врезаться в стол > 70 см/с —
  кружка опрокидывается, кофе проливается (скользкий участок), +14.
  Задеть стул — +14, стул сдвигается на 10 см.
- Событие зеркала (mirrorDone): вход в r 120 — PREP_MIRROR_STING.
  Отражение — второй экземпляр за «стеклом» с зеркальной копией
  движений. Из уха торчит лапка SPIDER_LEG_EAR. Каждые 0,45 с
  рывок на 6 см, при движении L +20 %/с, кабина panic,
  HUM_RESIST_GRUNT. 2,0 с без движения — контроль восстановлен,
  лапка втягивается, KEYS доступны.
- Кошка: 4 точки, на 4 с ложится поперёк прохода у двери (обход 60 см).
- После трёх предметов дверь подсвечивается, спуск по той же лестнице
  (BOX_STAIR на θ 300°). У входной двери «E — выйти» → C_ExitHome.
- Контрольные точки: start, descent.

C_ExitHome «Выход из дома» (3D, 11 с):
Выходит, спускается по 3 ступеням, идёт к бордюру. Камера
показывает дорогу и лабораторию напротив с вывеской
«ЛАБОРАТОРИЯ №3». → S09.

S09_Road «Дорога» (2D, человек, ~1,5 мин):
- Разметка (960×540): тротуар (470–540) → полоса 1 (410–460, →220)
  → полоса 2 (360–410, →300) → островок (320–360) → полоса 3
  (270–320, ←260) → полоса 4 (220–270, ←340) → полоса 5 (170–220,
  ←180) → тротуар (120–170) → фасад (0–120, дверь при x 450–510).
- Светофор на полосах 3–5 при x 420–540: красный 6,0 → зелёный 4,5
  → мигающий 1,0. На зелёный машины перед стоп-линией (x 560)
  тормозят с 600 px/с². На красный трогаются с 400 px/с².
- Поток: шаблоны интервалов (config.road.patterns). Машины за краем,
  видны минимум 1,5 с до перехода.
- Человек: 140 / осторожно 60 / разгон 0,25 с. Коллизия — эллипс
  22×14. Без равновесия.
- Таймер «До начала смены: 1:30»: ниже 20 с — красный, пульс 1 Гц,
  звуки на 20, 10, 5..1. Пауза останавливает всё.
- Столкновение: гудок, скрежет, отскок, −15 с, возврат на последнюю
  безопасную зону, 0,8 с без управления, 1,5 с неуязвимости,
  ближайшая машина задерживается на 1 с.
- Время вышло: «Опоздал!» → S09/start, полный таймер.
- Вход в дверь → таймер стоп → C_LabEntry.

C_LabEntry «Вход в лабораторию» (3D, 10 с):
Пропуск у считывателя, LED красный → зелёный, дверь разъезжается,
входит, камера показывает знакомую лабораторию, задерживается на
верхе шкафа с паутинкой. → S10.

S10_Lab «Уничтожение яда» (3D, человек, ~1,5 мин):
Автомат: idle → (E у пульта) stopped → (E у стола) carrying →
(E у люка) inserted → (удержание E 2,0 с) destroyed.
1. «Останови установку»: E у пульта, рычаг вниз, установка глохнет
   (бак зелёный → серый). ✓. stopped.
2. «Помести контейнер в утилизатор»: E у стола, берёт двумя руками.
   Несёт: скорость ×0,8, приросты L ×1,4, кабина careful при Shift.
   Падение — контейнер герметичен, возврат на stopped, контейнер
   снова на столе. У утилизатора люк открывается сам, E — вставлен.
   ✓. inserted.
3. «Запусти уничтожение»: удержание E 2,0 с (кольцо, гул
   LAB_DISPOSE_CHARGE растёт). Отпустил — прогресс падает на
   50 %/с. Финал: вспышка (если «Меньше эффектов» — без),
   лампа зелёная, «АРАХНОЦИД УНИЧТОЖЕН» 2,5 с, UI_BIG_SUCCESS.
   poisonDestroyed = true.
Финальный штрих (3 с): окно «Кабина» увеличивается до 320×200,
паук отпускает рычаги, откидывается, SPD_SIGH. → RESULTS.

RESULTS и CREDITS (2D DOM):
- «Ты уничтожил Арахноцид», время (stats.playMs), повторов
  (stats.retries), кнопки «Пройти заново» (с подтверждением) и
  «Главное меню». M_END.
- Титры 25 с, прокрутка снизу вверх, пропуск удержанием Пробела:
  название, «Сделано на Sharrowkin Jam», роли с настоящими именами
  (без заглушек!), «Three.js — MIT License», «Весь звук синтезирован
  в Web Audio», «Спасибо, что играли!». После титров — меню,
  сохранение помечено как пройденное.

Главное меню:
Медленная 2D-сцена: тёмная спальня-силуэт, полоса луны, паук качается
на нити. Название, «Играть» (→ Новая игра / Продолжить), «Выйти»,
ссылки «Настройки · Управление · Авторы». Первый клик создаёт
AudioContext. M_MENU.

## 5. КАТ-СЦЕНА ОТ ПОЛЬЗОВАТЕЛЯ (дополнительное требование)

- Помимо 5 встроенных кат-сцен (S01, C_Levers, C_Wardrobe, C_ExitHome,
  C_LabEntry) и финального штриха S10, я скину отдельный файл
  кат-сцены. Имя файла/формат уточни у меня, если критично.
- Заранее предусмотри интеграцию: поддержка видео, последовательности
  кадров или анимации в зависимости от формата.
- Встроить кат-сцену вовремя и по таймингам: по умолчанию — перед
  первой серией (как расширенное интро) или после финальной серии
  (как финальная сцена). Если по сценарию нужно иначе — обоснуй.
- Плавные переходы в кат-сцену и из неё, без рассинхрона с
  музыкой/геймплеем.
- Предусмотри: предзагрузку, skip, паузу, mute, корректное поведение
  при потере фокуса вкладки и на мобильных, fallback, если файл
  не загрузился.
- «Красивая» подача: аккуратные переходы, затемнение, титры/подписи
  при необходимости, но без перегруза и без блокировки игры дольше
  необходимого.
- После получения файла — встроить, проверить тайминги и описать
  в отчёте, как заменить файл.

## 6. КАЧЕСТВЕННАЯ МЕХАНИКА УДАРОВ И ПОЛУЧЕНИЯ УРОНА

Отдельное требование — и для пауков (защитники), и для людей (враги).
Должно ощущаться «сочным», читаемым, стабильным, без перегруза
и без копирования чужих ассетов. Касается в первую очередь
2D-боёв S04–S06, но принципы общие.

МЕХАНИКА УРОНА:
- Единая система через события: источник, цель, тип атаки
  (melee/ranged/AoE/DoT), количество, крит (если есть), эффекты
  (замедление, яд, оглушение).
- Корректная обработка брони/щитов: урон по щиту, пробитие,
  разрушение.
- Защита от двойного урона в одном кадре, корректные i-frames,
  отсутствие «мигающих» хитов.
- Чёткая последовательность: старт атаки → активный кадр/окно
  попадания → применение урона → реакция цели → завершение
  анимации.
- Дальние атаки: снаряд/паутина/яд летит, попадает, применяет
  урон, исчезает; без пролётов и ложных попаданий.
- Ближние атаки: синхронизация анимации укуса/удара с моментом
  применения урона; без урона «до» анимации.

ФИДБЕК ДЛЯ ПАУКОВ:
- Полный набор: idle, attack (windup → strike → recover), hit
  reaction, death, spawn, специальные (замедление, AoE, мина).
- При получении урона: короткая hit-реакция (вздрагивание/сжатие/
  вспышка), без сбивания основной анимации атаки, если не критично.
- При атаке: читаемый windup, активный удар, возврат в idle;
  для разных типов пауков — разные силуэты и тайминги.
- Смерть: короткая выразительная, затем исчезновение/растворение;
  без зависаний и телепортов.
- Визуальный фидбек: вспышка, лёгкий knockback, частицы (паутина/
  пыль/капли), звук попадания и смерти.
- Полоска здоровья/индикатор — читаемые, обновление плавное.

ФИДБЕК ДЛЯ ЛЮДЕЙ:
- Полный набор: spawn/вход, walk, attack (по защитнику), hit reaction,
  death, специальные (щит, броня, бег).
- Получение урона: hit-реакция с выразительной позой, вспышка,
  короткий knockback; для бронированных — акцент на щите/броне.
- Атака защитника: читаемый замах, удар, отдача; синхронизация
  с уроном по пауку.
- Смерть: падение/разлёт, исчезновение; без скольжения и зависаний.
- Визуальный фидбек: вспышка, частицы, звуки попадания и смерти;
  для разных типов — разные реакции и звуки.
- Полоска здоровья/индикатор брони — читаемые, плавные.

ОБЩИЙ «JUICE»:
- Hitstop 2–5 кадров на значимых попаданиях, без замедления игры
  в целом.
- Микро-тряска камеры/экрана только на крупных событиях (смерть,
  AoE, большая волна), с возможностью отключить в настройках.
- Вспышки короткие, не раздражающие; без частого мерцания.
- Звуки: разные для попадания по пауку и по человеку, для смерти,
  для брони/щита; без спама и клиппинга.
- Частицы и VFX аккуратные, в едином стиле, с пулом объектов.
- Читаемость: реакция на урон заметна на фоне, но не перекрывает
  соседние клетки.
- Доступность: отключение тряски, уменьшение вспышек, отдельная
  громкость эффектов.

ТЕХНИЧЕСКИ:
- Через события/сигналы, без жёстких связей; данные урона —
  в конфигах.
- Анимации — существующие модели/спрайты; дорабатывай текущие,
  не заменяй без необходимости.
- Пул частиц и снарядов, отсутствие утечек, стабильные 60 FPS.
- QA-чеклист и (где возможно) тесты: применение урона, броня/щиты,
  i-frames, смерть, синхронизация анимации и урона.

КРИТЕРИИ ПРИЁМКИ (удары):
- Удары и получение урона у пауков и людей ощущаются качественно,
  читаемо, стабильно.
- Анимации атаки, hit-реакции и смерти синхронизированы с логикой
  урона.
- Нет двойного урона, ложных попаданий, зависаний анимаций.
- Фидбек (вспышки, knockback, частицы, звук, hitstop) аккуратный
  и настраиваемый.
- Производительность не проседает; в консоли нет ошибок.
- В отчёте: как устроена система урона, какие анимации добавлены/
  доработаны, как проверял, что можно настроить.

## 7. ОБЩИЕ СИСТЕМЫ

КАРТОЧКИ СЕРИЙ:
Чёрный фон, «СЕРИЯ N» кегль 18 + название 44 + задачи списком.
2,0 с, пропуск любой клавишей, кроме Esc. После карточки задачи
переезжают в блок сверху слева (твин 0,4 с). Невыполненная — «○»,
выполненная — «✓» (зелёный #7fd18b) с вспышкой и UI_TASK_DONE.

ПОДСКАЗКИ УПРАВЛЕНИЯ:
Внизу, 3,5 с, «кейкапы». По сценам — по docs/PLAN.md §5.2.

ПРОПУСК КАТ-СЦЕН:
Удержание Пробела 1,0 с, кольцо 18 px в правом нижнем углу.
timeline.skip() мгновенно применяет setFlag, setOutfit, goto;
sfx пропускает.

МОДЕЛЬ РАВНОВЕСИЯ (core/balance.js):
Общая для S07, S08, S10 и кабины. Параметры и пороги — §4.

ОКНО «КАБИНА» (ui/cockpit.js):
2D-холст 176×110 в правом верхнем углу (отступ 12 px), рамка 3 px
#1d1519, скругление 10 px. Панель с 4 рычагами («НОГИ», «РУКИ»,
«ГЛАЗА», «РАВНОВЕСИЕ»), паук в кресле. Позы: idle, walk, careful,
wobble (L ≥ 50), panic (L ≥ 80), bump, use, cheer. Включено
в сериях 7–10, отключается в настройках. Не закрывает задачи
(те слева, кабина справа).

НАСТРОЙКИ (localStorage vosem_lap_settings_v1):
- Звук: общая, музыка, эффекты, окружение (0–100, шаг 5),
  «Выключить звук».
- Изображение: качество (низкое/среднее/высокое).
- Доступность: тряска камеры вкл/выкл, «Меньше эффектов» (частицы,
  вспышки, зерно, стоп-кадры), «Окно кабины вкл/выкл».
- Справка: «Управление» — таблица клавиш.

СОХРАНЕНИЯ (localStorage vosem_lap_save_v1):
Схема v1:
{
  v: 1,
  scene: 'S08_Prep',
  checkpoint: 'start',
  flags: { memorySeen, meetSeen, leversDone, dressed, mirrorDone,
           s10_stopped, s10_inserted, poisonDestroyed },
  items: { pass, notebook, keys },
  stats: { startedAt, playMs, retries },
  updatedAt
}
Чтение в try/catch, проверка v === 1, scene в графе, checkpoint
в списке сцены. Повреждённое — диалог «Сохранение повреждено.
Начать новую игру?». Правило: если scene ∈ {S04, S05, S06} —
грузим всегда S04_Reflex/start. S09 всегда start. stats.playMs
копится только в незапаузенном игровом времени.

ВВОД:
Слушатели на window, e.code, preventDefault для игровых клавиш.
Actions: up/down/left/right (WASD + стрелки), shift, action (Space),
use (KeyE), pause (Escape), confirm (Enter/Space в меню). API:
down(a), pressed(a), released(a), consumeAll(), axis() → {x, y}
с нормализацией диагонали. После карточки/кат-сцены/паузы
«грязные» удерживаемые клавиши считаются отпущенными до фактического
отпускания. Blur сбрасывает всё. Рывок — только по pressed(shift).

DEBUG (?debug=1):
F1 — меню перехода к сцене/чекпоинту, F2 — бессмертие, F3 —
коллайдеры и окна на дороге, F4 — скорость времени, F5 — мгновенная
победа, F6 — сброс сохранения. Оверлей FPS/draw calls/triangles/
scene/checkpoint. ?debug=1&scene=S07_Morning&chk=landing1 открывает
точку сразу. ?debug=1&scene=MODELS — тестовая сцена со всеми
пятью персонажами по .png-референсам. В релизной сборке debug
выключен (RELEASE = true).

МАСШТАБИРОВАНИЕ:
#stage логически 960×540, CSS scale по min(W/960, H/540) с
центровкой, чёрные поля #0b0910. WebGL и 2D-холсты рендерятся
в фактические пиксели, но логика — в 960×540. Без скролла и зума.

NO WEBGL:
Экран «Ваш браузер не поддерживает WebGL…» и кнопка «В меню».
Никогда пустой экран.

## 8. ЗВУК И МУЗЫКА (полностью синтез)

audio/engine.js:
- Граф: источники → panner → шины sfx/amb → master → компрессор
  → destination. Музыка — от секвенсора в bus.music. Sfx и amb →
  send → reverb (ConvolverNode, импульс из экспоненциально
  затухающего шума).
- Стартовые уровни: master 0, music −6, sfx 0, amb −8. Компрессор
  master: −18 dB, ratio 3, knee 6, attack 5 мс, release 250 мс.
- Reverb: спальня 0,6 с / LPF 5000 / 0,15; воспоминание 1,4 / 3000
  / 0,35; голова 2,0 / 1800 / 0,30; дом 0,7 / 6000 / 0,12;
  ванная 0,9 / 8000 / 0,25; лаборатория 1,2 / 6000 / 0,20;
  улица без ревера.
- Дакинг: warn приглушает музыку на −6 dB (атака 30 мс / восст.
  400 мс), окружение −3 dB. Кат-сцены — музыка −4 dB.
- Полифония: 4/ID по умолчанию, шаги 2, урон 1, двигатели 6 петель.
  При превышении — самый старый затухает за 30 мс.
- Панорама: StereoPannerNode. На дороге pan = clamp((x−480)/480 × 0,6).
- AudioContext по первому user gesture. suspend() на паузе и
  visibilitychange. stopScene() в exit(). Нет Web Audio — все вызовы
  пустышки.
- API: play(id, opts), loop(id) → {stop}, music(id, {fade}),
  musicLayer(name, on), duck(db, sec), setVolume(bus, 0..1).

Примитивы синтеза в sfx.js:
osc(type, f0, f1, dur, env), noise(color, dur, filter, env),
fm(fc, ratio, index, dur, env). env = ADSR; filter = {type, f0, f1, Q}.

Музыка (music.js) — секвенсор с планировщиком (шаг 1/16,
lookahead 100 мс, tick 25 мс). Инструменты: pad, pluck, bell, bass,
marimba, bassoon, lead, kick, snare, hat, clap, tom, shaker.
11 треков + 2 стингера:
M_MENU, M_BEDROOM, M_MEMORY, M_BRAIN, M_BATTLE (слои reflex/fear/
will/half), M_COCKPIT, M_HOUSE (слои wobble/quiet), M_ROAD
(слой urgent), M_LAB (слои stopped/resolve), M_END, ST_VICTORY,
ST_DEFEAT.

Лейтмотив паука: E4–G4–F#4–B3 (♪ ♪ ♩ ♩). Мажорная версия:
E4–G#4–F#4–B3.

Полный список ~140 эффектов + 10 петель окружения — в docs/PLAN.md
§10.3. Все ID вызываются из кода, привязаны к событиям. Неизвестный
ID молча игнорируется (в debug — предупреждение). «Звуковая комната»
?debug=1&scene=SOUNDROOM с кнопкой на каждый ID и ползунками
шин — обязательна.

## 9. ВИЗУАЛ

3D (сборка моделей по .png-референсам, процедурно):
- Стиль: low-poly, тон-шейдинг 3 ступени, толстая тёмная обводка
  #1d1519, холодные фиолетовые тени, тёплые блики.
- Материал: MeshToonMaterial с gradientMap (DataTexture 3×1,
  значения [90, 170, 255], NearestFilter).
- Обводка: клон меша с MeshBasicMaterial({color: 0x1d1519,
  side: BackSide}), вершины сдвигаются по нормали. Для моделей
  без гладких нормалей — масштабирование клона ×1,03. Толщина:
  человек 1,2 см, мебель 0,8, мелкие 0,4, паук 0,06.
- Стекло: MeshBasicMaterial #cfe8ff, opacity 0,28, depthWrite false.
- Надписи: kit.label(text, {w, h, font, fg, bg}) → CanvasTexture.
- Свет: полусферический + 1 направленный + до 3 точечных на сцену,
  тень от направленного (1024² на «Высоком», 512² на «Среднем»,
  без теней на «Низком»).
- Палитры локаций — по docs/PLAN.md §7.2. Единая палитра для
  2D и 3D.
- Бюджеты: ≤ 150 000 треугольников в кадре, ≤ 150 draw calls,
  ≥ 60 FPS (Высокое) / ≥ 45 FPS (Низкое), pixelRatio
  min(dpr, 1.5) / 1.0 / 0.75. dispose() в exit() для всего,
  что не в общем кэше.

МАППИНГ .PNG → 3D (обязательно):
- SPIDER.png → js/models/spider.js: головогрудь-сфера, брюшко-сфера
  со сплющенными узорами, 8 лап по 3 сегмента, хелицеры, педипальпы,
  глаза (2 главных + 4 малых), обводка 0,06. Цвета и пропорции —
  с .png. ≤ 3 000 треугольников.
- SCIENTIST.png → js/models/scientist.js: голова-сфера, нос, уши,
  глаза с веками, брови, очки (2 тора + перемычка + дужки), волосы,
  рот, шея, торс-капсула, таз, конечности-капсулы, стопы. Шарниры:
  root → spine → chest → neck → head, shoulder/elbow/wrist,
  hip/knee/ankle, веки, челюсть. Варианты одежды pajama и work
  (халат-оболочка, полы на шарнирах, нагрудный карман, бейдж
  после подбора пропуска). ≤ 9 000 треугольников.
- DEF_REFLEX.png → js/models/def_reflex.js: makeHuman упрощённый,
  худой, спортивный костюм с полосами, повязка, молоточек в руке.
  ≤ 1 200 треугольников.
- DEF_FEAR.png → js/models/def_fear.js: свитер-мешок до колен,
  рукава закрывают кисти, крупные глаза, брови домиком, капля пота.
  ≤ 1 000 треугольников.
- DEF_WILL.png → js/models/def_will.js: коренастый, халат, брюки,
  очки и причёска как у SCIENTIST, щит-папка «ДЕЛО №1» с label.
  ≤ 1 500 треугольников.
- Процедурно дорисовываются: CAT, SPIDER_LEG_EAR, окружение — по
  §8 PLAN.

2D (всё рисуется кодом на Canvas 2D):
- Стиль тот же: обводка #1d1519, тень со смещением (−0,15w; −0,2h)
  и смешением с #2e2440, блик mix(цвет, #fff6e8, 0.22), толщина
  3–5 px.
- Спрайты (полный список — §9 PLAN): SPR_SPIDER_TOP (ходьба
  6 кадров, укус 3, рывок-шлейф 3 копии, урон-мигание, поражение),
  SPR_BITE_ARC, SPR_DODGE_RING, SPR_REFLEX (64×80, ходьба 4,
  присед, рывок, оглушение 3 звезды, сдувание), SPR_REF_ARROW,
  SPR_FEAR (дрожь, мерцающий контур), SPR_FEAR_CLONE,
  SPR_FEAR_RING, SPR_WILL (щит, подготовка, удар, открыт),
  SPR_WILL_STRIKE, SPR_WILL_TRAP, SPR_ARENA, SPR_HEART,
  SPR_HUMAN_ROAD (4 кадра × 4 направления), 5 машин (HATCH,
  SEDAN, TAXI, VAN, BUS), SPR_ROAD_BG, SPR_TRAFFIC_LIGHT,
  SPR_LAB_FACADE_2D, SPR_COCKPIT (8 поз), SPR_MENU_BG, SPR_KEYCAP,
  ICON_WAKE, ICON_BALANCE, ICON_CHECK/CIRCLE, MEM_OVERLAY
  (зерно, виньетка, помехи), HOLD_RING.
- В 2D-спрайтах цвета и силуэты тоже берутся с .png-референсов,
  чтобы персонаж узнавался в бою.
- Все спрайты рендерятся один раз в офскрин-холсты (кэш) при входе
  в сцену.

Анимации 3D персонажей:
- Скелетов и glTF нет. Процедурные: pose(t, params) на синусах и
  твинах, плюс клипы ключевых кадров через anim/clip.js.
- Паук: idle, walk (тетрапод, противофаза), crawl, turn, webShoot,
  climbEdge, earEnter, squish, pullLever, sitChair, release.
- Человек: sleepBreath, toss.* (arm/turn/head), fingerTwitch,
  wakeEyes, sitUp, walk (1,8 Гц при 140 см/с), carefulWalk, wobble
  (крен ±4/±9°), fall, bump, resist, bendPick, carry, wash (3 позы),
  towel, useConsole, holdButton, adjustGlasses, idle.
- Человечки: intro/idle/talk/tremble/hide (у каждого свой).
- Кошка: walk (попарно по диагонали), sit, lie, run, meow, tailFlick.

## 10. КОНФИГ (js/config.js) — единственный источник чисел

Все числовые параметры из docs/PLAN.md §5.7 (ui, spider3d, sleeper,
wake, battle, reflex, fear, will, human, bal, wash, mirror, road, lab)
перенеси в `export const CFG = {...}`. Никаких чисел в коде сцен,
кроме временных констант анимации. При плейтестах крутятся только
значения CFG.

## 11. ТЕКСТЫ (js/text/ru.js)

Все строки интерфейса, сюжета и подсказок — в одном файле, ключи
по §11 PLAN (menu.*, card.s1..s10, obj.*, sub.memory, sub.meet,
sub.levers, hint.*, fail.*, defeat.*, tip.*, wash.*, mirror.hint,
bal.label, wake.label, road.timer, road.late, lab.locked/stopped/
done, results.*, pause.*, settings.*, credits.*, надписи в мире).
Вычитка — один проход по всему файлу на отсутствие заглушек
вроде «TODO» или «{names}».

## 12. ТЕСТЫ И QA

Встроенные самопроверки в debug (?debug=1&test=all) без Node:
- test.input — сопоставление кодов (в т.ч. русская раскладка),
  поглощение, blur.
- test.save — запись/чтение, повреждённый JSON, v ≠ 1,
  неизвестная сцена, «битвы → S04», недоступный localStorage.
- test.graph — у всех сцен есть enter/exit и чекпоинт, все
  переходы ведут к существующим id.
- test.road — симуляция 300 с, для каждой полосы окно ≥ 0,9 с
  не реже раза в 6 с.
- test.balance — прямая ходьба 60 с даёт L = 0; поворот 180°
  на полной скорости +38 ± 2; стоя −20/с.
- test.battle — ни одна атака не наносит урон без предупреждения
  ≥ 0,4 с; i-frames 1 с; рывок только по нажатию.
- test.audio — все ID из ids.js имеют рецепт; повторный вход
  не увеличивает число активных петель.
- test.leaks — 10 раз enter/exit каждой сцены: число слушателей
  window, твинов и renderer.info.memory не растёт.

Чек-лист серий — по §12.3 PLAN (45 тест-кейсов). Пройди вручную
все сцены в Chrome и Firefox. Проверь: русская раскладка, изменение
размера окна, выключенный звук, «Меньше эффектов» и «Тряска выкл.»,
качество «Низкое».

ОТДЕЛЬНЫЙ ЧЕК-ЛИСТ ПО .PNG-РЕФЕРЕНСАМ:
- Все 5 персонажей открываются в ?debug=1&scene=MODELS.
- Каждый узнаваем: силуэт, ключевые детали, палитра близки к .png.
- Пропорции соответствуют жанру (паук 3 см, человек 178 см,
  человечки 11–12,5 см) в общей шкале 1 ед. = 1 см.
- У каждого есть idle и хотя бы одна атака.
- Треугольников в бюджете §9, draw calls в бюджете.
- Нет текстур-«плоскостей» с .png, нет «наклеек» на модель.
- В отчёте — таблица «.png → модель».

ПЛЕЙТЕСТ:
2 сессии × 2 человека, которые игру не видели. Наблюдатель молчит.
Записывает время каждой серии, число поражений, места замешательства
(> 10 с без прогресса), цитаты. Целевые значения — §12.5 PLAN.
Правка только чисел в config.js по таблице §12.5.

## 13. ПОРЯДОК РАБОТЫ

1. Аудит проекта: найди и опиши все .png-референсы (5 штук:
   паук, учёный, Рефлекс, Страх, Воля), их имена, размеры, стиль.
   Найди все карты/уровни в корне. Составь план.
2. Каркас: index.html, css/style.css, js/main.js, js/core/loop.js,
   js/core/scenes.js, js/core/events.js, js/core/input.js,
   js/core/save.js. Заглушки всех сцен. Проверка: меню → F5 победа
   → титры, Esc пауза.
3. Three.js r170 в vendor/three/three.module.min.js, создай
   js/three/renderer.js, toon.js, kit.js. Тестовая сцена с кубом
   и капсулой в стиле игры.
4. ПЕРВЫМ ДЕЛОМ — модели по .png (§9 «Маппинг .png → 3D»):
   spider.js, scientist.js, def_reflex.js, def_fear.js, def_will.js.
   Тестовая сцена MODELS. Проверь шкалу 1 ед. = 1 см, силуэты,
   палитру. Затем процедурно — кошка, лапка из уха, окружение
   по §8 PLAN.
5. Звук: engine.js, sfx.js (все эффекты по §10.3), music.js (все
   треки по §10.2), ambience.js. Soundroom для debug.
6. Таймлайн-движок + все 5 кат-сцен + финальный штрих S10.
   Интеграция пользовательской кат-сцены (когда файл будет).
7. 3D-серии: S01 → S02 → S03 → C_Levers → S07 → C_Wardrobe →
   S08 → C_ExitHome → C_LabEntry → S10.
8. 2D-серии: battleCore → S04 → S05 → S06 → S09. Все 2D-спрайты
   в gfx2d/ с учётом .png-референсов. Система ударов/урона по §6.
9. UI: menu, card, objectives, pause, settings, results, credits,
   cockpit, holdskip, hud.
10. Финализация: сохранения, debug-меню, все самопроверки, QA
    по чек-листу, плейтест.
11. Отчёт.

## 14. ФОРМАТ ОТЧЁТА

После каждого крупного этапа и в конце:
- Что изменено (файлы/модули/системы).
- Зачем (какая проблема решалась).
- Как проверить (?debug=1&scene=...).
- Что проверено в браузере, что — нет.
- Риски и что осталось.

В конце — сводный CHANGELOG.md и отчёт «было / стало / почему»:
- Список .png-референсов и как они воплощены в 3D-модели
  (таблица «.png → модель»: силуэт, палитра, детали, треугольники,
  что упрощено, что додумано).
- Какие уровни/карты из корня подключены и проверены.
- Что пришлось доработать процедурно и почему.
- Какие системы реализованы (§5–§11).
- Какие серии и кат-сцены проходимы, какие тесты прошли.
- Как встроена пользовательская кат-сцена, как заменить файл.
- Как устроена система ударов/урона (S04–S06).
- Что осталось за рамками и какие риски.

## 15. КРИТЕРИИ ПРИЁМКИ

- Игра запускается через `python -m http.server 8000` в Chrome
  и Firefox без ошибок в консоли.
- Все 10 серий и 5 встроенных кат-сцен + пользовательская
  кат-сцена полностью играбельны, проходимы от начала до титров.
- Все уровни/карты, имеющиеся в корне проекта, подключены и
  проходимы. Ни одного недоступного или недоделанного.
- У игры есть логическое начало (меню → интро → первая серия)
  и логический конец (финальная серия → итоги → титры → меню).
- Все 5 .png-референсов воплощены в узнаваемые процедурные
  3D-модели: паук, учёный, Рефлекс, Страх, Воля. Сцена MODELS
  показывает их рядом. Таблица «.png → модель» в отчёте.
- Недостающее (кошка, лапка из уха, окружение) — процедурно
  из примитивов.
- Механика ударов и получения урона (S04–S06 и вокруг) работает
  качественно: i-frames, hitstop 70 мс, knockback, hit-реакции,
  синхронизация анимации и урона, нет двойного урона.
- Все звуки и музыка синтезированы в Web Audio, звук стартует
  по user gesture, пауза и visibilitychange корректны.
- Сохранения v1 работают, «Продолжить» загружает безопасную точку,
  повреждённое сохранение не ломает игру.
- UI читаем: цена/кулдаун/доступность считываются мгновенно, задачи
  с чек-боксами, кабина отключаема.
- Производительность: ≥ 55 FPS на «Высоком» и ≥ 45 FPS на «Низком»
  в целевых 3D-сценах.
- Debug-режим покрывает переходы, бессмертие, коллайдеры, скорость
  времени, победу, сброс сохранения.
- Все самопроверки test.* проходят, чек-лист QA пройден вручную.
- Есть CHANGELOG.md и финальный отчёт.

## 16. ССЫЛКИ НА ДЕТАЛИ

Полные таблицы (потактные таймлайны кат-сцен, каталог 3D-моделей
с размерами, каталог 2D-спрайтов, все звуковые рецепты, все строки
текста, все тест-кейсы, план сокращений, риски) — перенеси из
этого промпта в docs/PLAN.md в полном виде и используй его как
единственный источник правды по контенту. Если что-то расходится —
приоритет у этого промпта, кроме случаев, когда PLAN.md содержит
более точные числа для баланса (тогда числа идут в config.js,
а не в код).

## 17. КОМАНДА (контекст, опционально)

- А — ядро, 2D-серии и интерфейс.
- Б — 3D-движок, все модели (в т.ч. по .png-референсам) и
  3D-геймплей.
- В — звук, кат-сцены, тексты, баланс, QA, релиз.
Ты работаешь как все трое одновременно, выдавая результат в одном
потоке. Приоритет — готовый playable vertical slice от меню до
титров, а не набросок.

## 18. СТАРТ

Начни с аудита проекта: найди все .png-референсы (паук, учёный,
Рефлекс, Страх, Воля), опиши каждый (силуэт, пропорции, палитра,
детали), найди все карты/уровни в корне, составь краткий план
первого этапа. Затем сразу переходи к реализации, начиная с
моделей по .png. Работай до готовой игры. После завершения —
подробный отчёт с таблицей «.png → модель» и изменениями.

================================================================
КОНЕЦ ПРОМПТА
================================================================
````
