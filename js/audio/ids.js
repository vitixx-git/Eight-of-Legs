// Реестр всех звуковых ID игры (docs/PLAN.md §10.3). test.audio проверяет: у каждого ID есть рецепт в sfx.js /
// music.js / ambience.js, а все ID, вызываемые из кода, есть в реестре. «Звуковая комната» строит кнопки по этому списку.
export const SFX_GROUPS = {
  'Интерфейс': [
    'UI_FOCUS', 'UI_CONFIRM', 'UI_BACK', 'UI_DENY', 'UI_TOGGLE', 'UI_SLIDER',
    'UI_CARD_IN', 'UI_TASK_DONE', 'UI_SKIP', 'UI_PAUSE', 'UI_BIG_SUCCESS', 'UI_HINT',
    'UI_TICK', 'UI_TICK_LAST', 'UI_START', 'UI_ERROR',
  ],
  'Паук': [
    'SPD_STEP', 'SPD_STEP_SOFT', 'SPD_WEB_SHOOT', 'SPD_WEB_CLIMB', 'SPD_EDGE', 'SPD_EAR_ENTER',
    'SPD_BITE', 'SPD_BITE_HIT', 'SPD_BITE_BLOCK', 'SPD_DASH', 'SPD_HURT', 'SPD_DEATH',
    'SPD_SPAWN', 'SPD_SIGH', 'SPD_CHEER', 'SPD_LEVER',
  ],
  'Спящий': [
    'BED_SNORE', 'BED_SNORE_STOP', 'BED_CREAK_WARN', 'BED_TOSS', 'BED_SWAT', 'BED_MUMBLE',
    'BED_WAKE',
  ],
  'Спальня': [
    'HEARTBEAT', 'CLOCK_TICK', 'MOON_SHIMMER', 'WEB_GLINT', 'EAR_MUFFLE',
  ],
  'Воспоминание': [
    'MEM_WHOOSH', 'MEM_GLITCH', 'MEM_PEN_SCRATCH', 'MEM_JAR_CLINK', 'MEM_STING', 'MEM_OUT',
  ],
  'Мозг': [
    'BRN_TALK_BLIP', 'BRN_BARRIER_OFF', 'BRN_PANEL_ON', 'BRN_BUTTON', 'BRN_LEVER', 'BRN_CHAIR',
    'BRN_ALARM', 'BRN_EYE_OPEN', 'BRN_SIT_UP', 'BRN_DAWN',
  ],
  'Рефлекс': [
    'REF_INTRO', 'REF_WARN_WHISTLE', 'REF_WARN_SHORT', 'REF_DASH', 'REF_IMPACT_WALL', 'REF_STUN',
    'REF_HAMMER', 'REF_DEFLATE', 'REF_TAUNT',
  ],
  'Страх': [
    'FEAR_INTRO', 'FEAR_RING', 'FEAR_RING_HIT', 'FEAR_BLINK', 'FEAR_CLONE', 'FEAR_CLONE_POP',
    'FEAR_WHIMPER', 'FEAR_TREMBLE', 'FEAR_FAINT',
  ],
  'Воля': [
    'WILL_INTRO', 'WILL_STOMP', 'WILL_GRUNT', 'WILL_SHIELD_UP', 'WILL_PREP', 'WILL_STRIKE',
    'WILL_OPEN', 'WILL_ENRAGE', 'WILL_TRAP_SET', 'WILL_TRAP_SNAP', 'WILL_FOLDER_FLAP', 'WILL_DEFEAT',
  ],
  'Бой': [
    'BAT_START', 'BAT_HIT_DEF', 'BAT_HIT_SPIDER', 'BAT_BLOCK', 'BAT_ARMOR_SPARK', 'BAT_SHIELD_HIT',
    'BAT_DEATH_DEF', 'BAT_WHOOSH', 'BAT_STEP_DEF', 'BAT_COUNTDOWN', 'BAT_SLOW', 'BAT_HEART_LOST',
  ],
  'Человек': [
    'HUM_STEP', 'HUM_STEP_STAIR', 'HUM_STEP_CAREFUL', 'HUM_WOBBLE_WARN', 'HUM_FALL', 'HUM_BUMP',
    'HUM_SLIP', 'HUM_YAWN', 'HUM_RESIST_GRUNT', 'HUM_PICKUP', 'HUM_BEND', 'HUM_SIGH',
    'HUM_GASP', 'HUM_OOF', 'HUM_CLOTH', 'HUM_WASH_SPLASH',
  ],
  'Дом': [
    'HOUSE_DOOR_OPEN', 'HOUSE_DOOR_CLOSE', 'HOUSE_TAP_ON', 'HOUSE_SPLASH', 'HOUSE_TOWEL', 'HOUSE_WARDROBE_RATTLE',
    'HOUSE_SOCK_POP', 'HOUSE_MUG_TIP', 'HOUSE_COFFEE_SPILL', 'HOUSE_CHAIR_SCRAPE', 'HOUSE_KEYS', 'HOUSE_PAPER',
    'HOUSE_FRONT_DOOR', 'HOUSE_SOCK_BOING',
  ],
  'Кошка': [
    'CAT_MEOW', 'CAT_HISS', 'CAT_PURR', 'CAT_RUN', 'CAT_STEP', 'CAT_YOWL',
  ],
  'Умывание': [
    'WASH_STEP_OK', 'WASH_ERROR', 'WASH_DONE', 'WASH_TICK',
  ],
  'Сборы': [
    'PREP_MIRROR_STING', 'PREP_LEG_TWITCH', 'PREP_LEG_RETRACT',
  ],
  'Дорога': [
    'ROAD_HONK', 'ROAD_HONK_BUS', 'ROAD_SCREECH', 'ROAD_CRASH_SOFT', 'ROAD_LIGHT_GREEN', 'ROAD_LIGHT_RED',
    'ROAD_LIGHT_BLINK', 'ROAD_BEEP_WALK', 'ROAD_TIMER_20', 'ROAD_TIMER_10', 'ROAD_TIMER_TICK', 'ROAD_DOOR',
    'ROAD_PASSBY',
  ],
  'Лаборатория': [
    'LAB_DOOR_SLIDE', 'LAB_CARD_BEEP', 'LAB_LED_GREEN', 'LAB_CONSOLE_LEVER', 'LAB_MACHINE_STOP', 'LAB_PICKUP_CONTAINER',
    'LAB_HATCH_OPEN', 'LAB_INSERT', 'LAB_DISPOSE_BOOM', 'LAB_LAMP_GREEN', 'LAB_BUBBLE', 'LAB_KEYPAD',
  ],
  'Кат-сцены': [
    'CUT_WHOOSH', 'CUT_STING', 'CUT_SWELL',
  ],
  'Разное': [
    'BOING_SOFT', 'PAPER_FLIP',
  ],
};
export const SFX_IDS = Object.values(SFX_GROUPS).flat();
export const LOOP_IDS = ['ROAD_ENGINE', 'ROAD_BUS_ENGINE', 'LAB_DISPOSE_CHARGE', 'HOUSE_WATER_RUN', 'BED_SNORE_LOOP', 'SPIDER_WIND'];
export const MUSIC_IDS = ['M_MENU', 'M_BEDROOM', 'M_MEMORY', 'M_BRAIN', 'M_BATTLE', 'M_COCKPIT', 'M_HOUSE', 'M_ROAD', 'M_LAB', 'M_END', 'M_CREDITS'];
export const STINGER_IDS = ['ST_VICTORY', 'ST_DEFEAT'];
export const AMB_IDS = ['AMB_MENU_NIGHT', 'AMB_BEDROOM', 'AMB_MEMORY', 'AMB_BRAIN', 'AMB_COCKPIT', 'AMB_HOUSE_MORNING', 'AMB_BATH', 'AMB_STREET', 'AMB_LAB', 'AMB_LAB_MACHINE'];
export const MUSIC_LAYERS = {'M_BATTLE': ['reflex', 'fear', 'will', 'half'], 'M_HOUSE': ['wobble', 'quiet'], 'M_ROAD': ['urgent'], 'M_LAB': ['stopped', 'resolve']};
export const ALL_IDS = [...SFX_IDS, ...LOOP_IDS, ...MUSIC_IDS, ...STINGER_IDS, ...AMB_IDS];
