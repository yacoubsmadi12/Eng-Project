const BASE = "/api";

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  auth: {
    login: (username: string, password: string) =>
      req<{ username: string; displayName: string; plannerName: string; role: string }>(
        "POST", "/auth/login", { username, password }
      ),
    logout: () => req<{ message: string }>("POST", "/auth/logout"),
    me: () =>
      req<{ username: string; displayName: string; plannerName: string; role: string }>(
        "GET", "/auth/me"
      ),
  },
  sites: {
    list: () => req<any[]>("GET", "/sites"),
    bulk: (sites: any[]) => req<{ message: string }>("POST", "/sites/bulk", sites),
    clear: () => req<{ message: string }>("DELETE", "/sites"),
  },
  plans: {
    list: () => req<any[]>("GET", "/plans"),
    bulk: (plans: any[]) => req<{ message: string }>("POST", "/plans/bulk", plans),
    append: (plans: any[]) => req<{ message: string }>("POST", "/plans/append", plans),
    update: (id: number, plan: any) => req<{ message: string }>("PUT", `/plans/${id}`, plan),
    delete: (id: number) => req<{ message: string }>("DELETE", `/plans/${id}`),
    clear: () => req<{ message: string }>("DELETE", "/plans"),
  },
  users: {
    list: () => req<any[]>("GET", "/users"),
    create: (data: { username: string; password: string; displayName: string; plannerName: string; role?: string }) =>
      req<any>("POST", "/users", data),
    delete: (id: number) => req<{ message: string }>("DELETE", `/users/${id}`),
  },
  sites: {
    list: () => req<any[]>("GET", "/sites"),
    bulk: (sites: any[]) => req<{ message: string }>("POST", "/sites/bulk", sites),
    clear: () => req<{ message: string }>("DELETE", "/sites"),
  },
};
