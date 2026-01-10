const API = process.env.NEXT_PUBLIC_API_URL;


export async function getMe() {
  return api("/auth/me");
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}
export function setToken(t) {
  localStorage.setItem("token", t);
}
export function clearToken() {
  localStorage.removeItem("token");
}

export async function api(path, opts = {}) {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "REQUEST_FAILED");
  return data;
}
