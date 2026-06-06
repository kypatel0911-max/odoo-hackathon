export const API_ORIGIN = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export function apiUrl(path) {
  if (!path.startsWith("/")) return `${API_ORIGIN}/${path}`;
  return `${API_ORIGIN}${path}`;
}
