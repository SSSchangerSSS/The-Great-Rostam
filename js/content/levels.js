// levels.js — data-driven level definitions
// All geometry in world pixels. Ground Y is the main walk surface.

export const GROUND_Y = 620;

export const LEVELS = {
  trial1: {
    name: { fa: 'خوانِ اوّل — شیر', en: 'Trial I — The Lion' },
    palette: 'dusk',
    width: 4200,
    playerStart: { x: 140, y: GROUND_Y - 60 },
    // platforms: {x, y, w, h} (y = top surface)
    //   oneWay:true  → thin ledge: land from above only, pass from below/side
    //   oneWay:false (default) → solid slab: landing + head bonk + side push-out
    platforms: [
      { x: -40, y: GROUND_Y, w: 4280, h: 200 },           // main ground (solid)
      { x: 760, y: GROUND_Y - 70, w: 150, h: 22, oneWay: true },   // stone ledge
      { x: 980, y: GROUND_Y - 130, w: 130, h: 22, oneWay: true },  // higher ledge
      { x: 1720, y: GROUND_Y - 80, w: 170, h: 22, oneWay: true },  // broken bridge piece
      { x: 2380, y: GROUND_Y - 60, w: 140, h: 22, oneWay: true },
      { x: 2600, y: GROUND_Y - 120, w: 120, h: 22, oneWay: true },
    ],
    props: [
      { type: 'column', x: 540, seed: 1 },
      { type: 'column', x: 1180, seed: 2, broken: true },
      { type: 'shrub', x: 340, seed: 1 },
      { type: 'shrub', x: 940, seed: 2 },
      { type: 'rock', x: 1380, scale: 1.2 },
      { type: 'shrub', x: 1650, seed: 3 },
      { type: 'column', x: 2050, seed: 3 },
      { type: 'rock', x: 2520, scale: 0.8 },
      { type: 'shrub', x: 2900, seed: 4 },
      { type: 'column', x: 3350, seed: 4 },
      { type: 'column', x: 3620, seed: 5 },
    ],
    braziers: [3480, 3700, 3860],
    // ambient enemies (non-boss)
    enemies: [
      { type: 'jackal', x: 1050, y: GROUND_Y - 40 },
      { type: 'jackal', x: 1500, y: GROUND_Y - 40 },
      { type: 'jackal', x: 1980, y: GROUND_Y - 40 },
    ],
    // MINI-BOSS — the White Jackal, Pack Alpha (finisher QTE: 2 prompts)
    miniBoss: {
      type: 'alpha',
      x: 2450, y: GROUND_Y - 60,
      arena: { x1: 2150, x2: 2950 },
      name: { fa: 'شغالِ سپید — رهبرِ گله', en: 'The White Jackal' },
    },
    boss: {
      type: 'lion',
      x: 3760, y: GROUND_Y - 60,
      arena: { x1: 3320, x2: 4160 },   // camera + player lock during the duel
    },
    // respawn point unlocked after the mini-boss falls (checkpoint data)
    checkpoint: { x: 3050, y: GROUND_Y - 60, label: { fa: 'آستانهٔ لانهٔ شیر', en: 'Lion\u2019s threshold' } },
    triggers: [
      { x: 420, dialogue: 'trial1_hint', once: true },
      { x: 2150, dialogue: 'pre_jackal', once: true, lockArena: 'mini' },
      { x: 3320, dialogue: 'pre_lion', once: true, lockArena: true },
    ],
    pickupArrows: [
      { x: 1000, y: GROUND_Y - 150 },
      { x: 1760, y: GROUND_Y - 100 },
      { x: 2650, y: GROUND_Y - 140 },
    ],
  },
  // Trials II-VII will be added as new entries — same schema, new palettes.
};
