export const IS_DEVELOPMENT =
  String(import.meta.env.IS_DEVELOPMENT || "").trim().toLowerCase() === "true";
