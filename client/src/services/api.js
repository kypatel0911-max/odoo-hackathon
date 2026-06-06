import axios from "axios";
import { apiUrl } from "../lib/config.js";

const TOKEN_KEY = "vb_token";

const http = axios.create({
  headers: { "Content-Type": "application/json" },
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message = err.response?.data?.error || err.message || "Request failed";
    return Promise.reject(new Error(message));
  },
);

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function api(path, options = {}) {
  const { method = "GET", body, headers, ...rest } = options;
  return http.request({
    url: apiUrl(path),
    method,
    data: body ? (typeof body === "string" ? JSON.parse(body) : body) : undefined,
    headers,
    ...rest,
  });
}

export async function apiUpload(path, formData) {
  return http.post(apiUrl(path), formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export async function downloadBlob(path, filename) {
  const token = getToken();
  const res = await axios.get(apiUrl(path), {
    responseType: "blob",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function formatCurrency(n) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number(n) || 0,
  );
}

export function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const ROLE_LABELS = {
  admin: "Admin",
  procurement_officer: "Procurement Officer",
  manager: "Manager / Approver",
  vendor: "Vendor",
};

export const STATUS_COLORS = {
  draft: "bg-slate-600",
  published: "bg-blue-600",
  closed: "bg-slate-500",
  pending_approval: "bg-amber-600",
  pending: "bg-amber-600",
  approved: "bg-emerald-600",
  rejected: "bg-red-600",
  selected: "bg-emerald-600",
  submitted: "bg-blue-600",
  po_generated: "bg-indigo-600",
  invoiced: "bg-purple-600",
  issued: "bg-indigo-600",
  generated: "bg-indigo-600",
  sent: "bg-blue-600",
  paid: "bg-emerald-600",
  active: "bg-emerald-600",
  inactive: "bg-slate-600",
  cancelled: "bg-red-600",
};
