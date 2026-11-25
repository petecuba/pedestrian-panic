/**
 * Pedestrian Panic — Shared Game Configuration & Live Tuning Defaults
 * Rounded-bottom Hero hitbox + rounded-top Pedestrian hitboxes with
 * live-tunable parameters persisted in localStorage for mobile playtesting.
 */
export const CONFIG = {
  // Logical coordinate system (matches 320x1136 sidewalk tile at 2x height)
  WIDTH: 320,
  HEIGHT: 568,

  // Walkable sidewalk bounds (measured from street/sidewalk-1.png curb at x=22..26)
  CURB_X: 28,
  RIGHT_WALL_X: 320,

  // Fixed physics timestep (ensures identical physics on 60Hz & 120Hz ProMotion displays)
  FIXED_DT: 1 / 60,
  MAX_FRAME_DT: 0.05,

  // Hero parameters
  HERO: {
    START_X: 174,
    CENTER_Y: 312,          // Target center Y Hero recovers toward when slowing down
    MAX_SLOW_Y: 368,        // Brace room below center while shoving crowds back
    SPRITE_W: 46,
    SPRITE_H: 69,
    // Rounded-bottom hitbox: flat bottom shelf + slippery bottom corners
    HALF_W: 20.0,
    HALF_H: 22.0,
    CORNER_R_TOP: 4.0,
    CORNER_R_BOT: 14.5,
    BASE_SPEED: 120,        // Normal forward walking speed (px/s, drives street/awning scroll)
    SLOW_SPEED_MULT: 0.52,  // Street/awning slowdown factor at full brake
    LATERAL_SPEED: 215,     // Left/right weaving speed
    LATERAL_LERP: 0.24,
    // Smooth eased Slow Down
    SLOW_MAX_DURATION: 1.0, // Hold up to 1.0s
    SLOW_COOLDOWN: 0.75,    // 0.75s cooldown
    SLOW_EASE_IN_TIME: 0.22,
    SLOW_EASE_OUT_TIME: 0.24,
    RECOVER_Y_SPEED: 105,   // Smooth peak downward recovery speed while braking
    BASE_MASS: 150,         // Hero weight: 1 ped (~114) can't budge Hero; 2+ push forward
    SLOW_EXTRA_MASS: 315,   // Slowdown power (total ~465 -> holds 1..4 peds; 5+ overpower)
    FRICTION: 0.25,         // 0 = super slippery corners, 1 = very sticky shoulders
    NO_CONTACT_DAMP: 24.0,  // Instant stop when no pedestrian is touching Hero
    GAME_OVER_Y: -22,       // Hero pushed off top of screen
    DANGER_Y: 112,          // Red danger pulse threshold near top
  },

  // Pedestrian NPC parameters
  PED: {
    SPRITE_W: 46,
    SPRITE_H: 69,
    // Rounded-top hitbox
    HALF_W: 19.0,
    HALF_H: 20.5,
    CORNER_R_TOP: 14.5,
    CORNER_R_BOT: 9.0,
    FRICTION: 0.25,         // 0 = super slippery crowd glide, 1 = sticky crowd grip
    SPEED_MULT: 1.0,        // Multiplier on pedestrian walking velocity
    MIN_REL_SPEED: 52,      // Base walking speed range (decoupled from weight)
    MAX_REL_SPEED: 84,
    SPEED_VARIATION: 0.1,
    WEIGHT_AVG: 114,        // Mean pedestrian weight (spawns vary ±8 around this)
    WEIGHT_SPREAD: 8,
    PUSH_POWER_RAMP: 12,
    FORCE_MULT: 1.0,        // Shove responsiveness when crowd weight exceeds Hero weight
    SPAWN_Y_OFFSET: 46,
    DESPAWN_TOP_Y: -88,
    DESPAWN_BOTTOM_Y: 660,
  },

  // Spawning & difficulty curve
  SPAWN: {
    RATE_MULT: 1.0,         // Multiplier on crowd spawn rate (higher = denser sidewalk faster)
    INITIAL_DELAY: 0.55,
    START_INTERVAL: 1.05,
    MIN_INTERVAL: 0.35,
    RAMP_DURATION: 45,
    MAX_ACTIVE: 32,
    CLUSTER_CHANCE_START: 0.22,
    CLUSTER_CHANCE_MAX: 0.54,
  },

  // Input & phone tuning
  INPUT: {
    TILT_SENSITIVITY: 1.0,  // Multiplier on tilt steering speed (0.5x .. 2.5x)
  },

  // Debug visualization
  DEBUG: {
    SHOW_HITBOXES: false,
  },

  // Chain scoring (Hero -> Ped -> Ped; only on-screen pedestrians can score)
  SCORING: {
    CONTACT_EPSILON: 4.5,
    CHAIN_GRACE: 0.10,
    MIN_SLOW_RATIO: 0.10,
    POINTS_PER_SEC_FULL: 24,
    CHAIN_BONUS_PER_DEPTH: 0.25,
  },
};

// Snapshot of factory defaults for the Tuning Overlay "Reset Defaults" button
export const DEFAULT_TUNING = {
  heroCornerR: CONFIG.HERO.CORNER_R_BOT,
  heroSlowLength: CONFIG.HERO.SLOW_MAX_DURATION,
  heroSlowCooldown: CONFIG.HERO.SLOW_COOLDOWN,
  heroSlowPower: CONFIG.HERO.SLOW_EXTRA_MASS,
  heroSlowRecover: CONFIG.HERO.RECOVER_Y_SPEED,
  heroWeight: CONFIG.HERO.BASE_MASS,
  heroFriction: CONFIG.HERO.FRICTION,

  pedCornerR: CONFIG.PED.CORNER_R_TOP,
  pedVelocity: CONFIG.PED.SPEED_MULT,
  pedWeight: CONFIG.PED.WEIGHT_AVG,
  pedForce: CONFIG.PED.FORCE_MULT,
  pedFriction: CONFIG.PED.FRICTION,

  tiltSensitivity: CONFIG.INPUT.TILT_SENSITIVITY,
  spawnRate: CONFIG.SPAWN.RATE_MULT,
  showHitboxes: CONFIG.DEBUG.SHOW_HITBOXES,
};

export function applyTuningToConfig(t) {
  CONFIG.HERO.CORNER_R_BOT = Number(t.heroCornerR);
  CONFIG.HERO.SLOW_MAX_DURATION = Number(t.heroSlowLength);
  CONFIG.HERO.SLOW_COOLDOWN = Number(t.heroSlowCooldown);
  CONFIG.HERO.SLOW_EXTRA_MASS = Number(t.heroSlowPower);
  CONFIG.HERO.RECOVER_Y_SPEED = Number(t.heroSlowRecover);
  CONFIG.HERO.BASE_MASS = Number(t.heroWeight);
  CONFIG.HERO.FRICTION = Number(t.heroFriction);

  CONFIG.PED.CORNER_R_TOP = Number(t.pedCornerR);
  CONFIG.PED.SPEED_MULT = Number(t.pedVelocity);
  CONFIG.PED.WEIGHT_AVG = Number(t.pedWeight);
  CONFIG.PED.FORCE_MULT = Number(t.pedForce);
  CONFIG.PED.FRICTION = Number(t.pedFriction);

  CONFIG.INPUT.TILT_SENSITIVITY = Number(t.tiltSensitivity);
  CONFIG.SPAWN.RATE_MULT = Number(t.spawnRate);
  CONFIG.DEBUG.SHOW_HITBOXES = Boolean(t.showHitboxes);
}
