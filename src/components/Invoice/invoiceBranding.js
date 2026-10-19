const FALLBACK_PRIMARY = "#0b74b7";

const normalizeHex = (value) => {
  const color = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : FALLBACK_PRIMARY;
};

const toRgb = (hex) => ({
  r: Number.parseInt(hex.slice(1, 3), 16),
  g: Number.parseInt(hex.slice(3, 5), 16),
  b: Number.parseInt(hex.slice(5, 7), 16),
});

const toHex = ({ r, g, b }) => `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;

const mix = (source, target, targetWeight) => {
  const from = toRgb(source);
  const to = toRgb(target);
  return toHex({
    r: from.r + (to.r - from.r) * targetWeight,
    g: from.g + (to.g - from.g) * targetWeight,
    b: from.b + (to.b - from.b) * targetWeight,
  });
};

const rgba = (hex, alpha) => {
  const { r, g, b } = toRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
};

export const createInvoiceBrandStyle = (value) => {
  const primary = normalizeHex(value);
  const dark = mix(primary, "#000000", 0.5);
  const accent = mix(primary, "#ffffff", 0.2);
  const border = mix(primary, "#334155", 0.48);

  return {
    "--customer-brand-primary": primary,
    "--customer-brand-dark": dark,
    "--customer-brand-accent": accent,
    "--customer-brand-accent-text": mix(accent, "#ffffff", 0.42),
    "--customer-brand-border": border,
    "--customer-brand-soft": rgba(primary, 0.28),
    "--customer-brand-emphasis": rgba(primary, 0.18),
    "--customer-brand-total": rgba(primary, 0.34),
    "--customer-brand-shadow": rgba(dark, 0.1),
  };
};

