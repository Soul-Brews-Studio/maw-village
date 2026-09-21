// A Harvest Moon morning. god is a dark room and Bridge is a dark board, so
// this one is broad daylight on purpose — the fleet as somewhere you'd want to
// stand, not a console you monitor.

export const SKY = "#bfe3f0";
export const FOG = "#cfe8f2";
export const GRASS = "#8fc14f";
export const GRASS_DARK = "#7aad42";
export const SOIL = "#8d6248";
export const SOIL_DARK = "#75503a";
export const PATH = "#d9c08f";
export const WOOD = "#a9754a";
export const SIGN = "#f3e2c0";

/** Status drives the crop. A field you can read from across the valley. */
export const CROP = {
  working: "#5fbf4a",   // tall, green, growing
  blocked: "#e05b3c",   // wilted, wants you
  idle: "#9fd17a",      // sprouted, waiting
  done: "#f0c24b",      // ripe, golden
  unknown: "#b7c4a8",   // fallow
} as const;

export const CROP_HEIGHT = {
  working: 1.0,
  blocked: 0.45,
  idle: 0.55,
  done: 0.9,
  unknown: 0.2,
} as const;

/** Each engine gets its own hat colour, so a codex villager reads at a glance. */
export function engineColor(engine: string | null): string {
  if (!engine) return "#b0bec5";
  const hats: Record<string, string> = {
    claude: "#d97757",
    codex: "#4a90d9",
    gemini: "#9c6ade",
    opencode: "#3fa796",
    amp: "#e8a33d",
    cursor: "#6b7280",
  };
  if (hats[engine]) return hats[engine];
  let hash = 0;
  for (let index = 0; index < engine.length; index++) {
    hash = ((hash << 5) - hash + engine.charCodeAt(index)) | 0;
  }
  const palette = ["#d97757", "#4a90d9", "#9c6ade", "#3fa796", "#e8a33d", "#e2688f"];
  return palette[Math.abs(hash) % palette.length];
}
