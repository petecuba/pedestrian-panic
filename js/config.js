/**
 * Pedestrian Panic — Shared Game Configuration
 * Rounded-bottom Hero hitbox + rounded-top Pedestrian hitboxes with
 * slippery outer corners, smooth eased slowdown, and contact-locked push physics.
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
    // Rounded-bottom hitbox: narrower flat bottom shelf + wide slippery bottom corners
    HALF_W: 20.0,
    HALF_H: 22.0,
    CORNER_R_TOP: 4.0,
    CORNER_R_BOT: 14.5,
    BASE_SPEED: 120,        // Normal forward walking speed (px/s, drives street/awning scroll)
    SLOW_SPEED_MULT: 0.52,  // Street/awning slowdown factor at full brake
    LATERAL_SPEED: 215,     // Left/right weaving speed
    LATERAL_LERP: 0.24,
    // Smooth eased Slow Down (eases in over 0.22s, eases out over 0.24s)
    SLOW_MAX_DURATION: 1.0, // Hold up to 1.0s
    SLOW_COOLDOWN: 0.75,    // 0.75s cooldown
    SLOW_EASE_IN_TIME: 0.22,
    SLOW_EASE_OUT_TIME: 0.24,
    RECOVER_Y_SPEED: 105,   // Smooth peak downward recovery speed while braking
    BASE_MASS: 150,         // Normal weight: 1 ped (~115) can't budge Hero; 2+ push forward
    SLOW_EXTRA_MASS: 315,   // Bracing weight while braking (total ~465 -> 1..4 peds held/shoved back; 5+ overpower!)
    PUSH_ACCEL_SCALE: 1.55, // How rapidly net stack force accelerates Hero up to the stack's speed
    NO_CONTACT_DAMP: 24.0,  // Instant stop when no pedestrian is touching Hero (zero ghost-gliding!)
    GAME_OVER_Y: -22,       // Hero pushed off top of screen
    DANGER_Y: 112,          // Red danger pulse threshold near top
  },

  // Pedestrian NPC parameters
  PED: {
    SPRITE_W: 46,
    SPRITE_H: 69,
    // Rounded-top hitbox: slippery rounded top corners (and softer bottom corners for ped-vs-ped glide)
    HALF_W: 19.0,
    HALF_H: 20.5,
    CORNER_R_TOP: 14.5,
    CORNER_R_BOT: 9.0,
    SLIP_BOOST: 1.38,       // Makes rounded-corner shoulder contacts slide more smoothly/slipperily
    MIN_REL_SPEED: 52,      // Walking speed (decoupled from weight/pushPower)
    MAX_REL_SPEED: 84,
    SPEED_VARIATION: 0.1,
    PUSH_POWER_MIN: 105,    // Independent pedestrian weight (~115 avg)
    PUSH_POWER_MAX: 122,
    PUSH_POWER_RAMP: 12,
    SPAWN_Y_OFFSET: 46,
    DESPAWN_TOP_Y: -88,
    DESPAWN_BOTTOM_Y: 660,
  },

  // Spawning & difficulty curve
  SPAWN: {
    INITIAL_DELAY: 0.55,
    START_INTERVAL: 1.05,
    MIN_INTERVAL: 0.35,
    RAMP_DURATION: 45,
    MAX_ACTIVE: 30,
    CLUSTER_CHANCE_START: 0.22,
    CLUSTER_CHANCE_MAX: 0.54,
  },

  // Chain scoring (Hero -> Ped -> Ped; only on-screen pedestrians can score!)
  SCORING: {
    CONTACT_EPSILON: 4.5,
    CHAIN_GRACE: 0.10,
    MIN_SLOW_RATIO: 0.10,
    POINTS_PER_SEC_FULL: 24,
    CHAIN_BONUS_PER_DEPTH: 0.25,
  },
};
