// Backend resolution. Deliberately the same contract god.buildwithoracle.com
// uses, so one fleet can be read by either UI without reconfiguring anything:
//
//   ?host=http://white.local:3457   → remembered, then stripped from the URL
//   nothing                         → same origin
//
// Everything below talks to `maw herdr serve`: /api/sessions, /api/agents,
// /api/capture, /api/send, /api/wake, and the /ws socket.

const STORAGE_KEY = "maw-host";
const TOKEN_KEY = "maw-token";

export type PaneStatus = "working" | "idle" | "blocked" | "done" | "unknown";

export interface Agent {
  target: string;
  session: string;
  window: number;
  name: string;
  agent: string | null;
  folder: string | null;
  cwd: string | null;
  status: PaneStatus;
  active: boolean;
}

export interface Fleet {
  agents: Agent[];
  sessions: number;
}

const win = () => (typeof window === "undefined" ? null : window);
const store = () => {
  try { return typeof localStorage === "undefined" ? null : localStorage; } catch { return null; }
};

/** Read ?host= once, persist it, then strip it so a reload is not a re-config. */
function adoptHostParam(): void {
  const location = win()?.location;
  if (!location) return;
  const params = new URLSearchParams(location.search);
  const host = params.get("host");
  if (host === null) return;
  if (host.trim() === "") store()?.removeItem(STORAGE_KEY);
  else {
    try { store()?.setItem(STORAGE_KEY, normalizeOrigin(host)); } catch { /* unparseable ?host= is ignored */ }
  }
  params.delete("host");
  const query = params.toString();
  win()?.history.replaceState({}, "", `${location.pathname}${query ? `?${query}` : ""}${location.hash}`);
}

export function normalizeOrigin(input: string): string {
  const trimmed = input.trim();
  // A bare host:port is the common thing to paste, and new URL() rejects it.
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  return new URL(withScheme).origin;
}

adoptHostParam();

export function backendOrigin(): string | null {
  return store()?.getItem(STORAGE_KEY) ?? null;
}

export function setBackendOrigin(input: string): void {
  store()?.setItem(STORAGE_KEY, normalizeOrigin(input));
}

export function clearBackendOrigin(): void {
  store()?.removeItem(STORAGE_KEY);
}

export function operatorToken(): string | null {
  return store()?.getItem(TOKEN_KEY) ?? null;
}

export function setOperatorToken(token: string): void {
  if (token.trim()) store()?.setItem(TOKEN_KEY, token.trim());
  else store()?.removeItem(TOKEN_KEY);
}

function httpBase(): string {
  return backendOrigin() ?? win()?.location.origin ?? "http://127.0.0.1:3457";
}

export function socketURL(path: string): string {
  const url = new URL(path, httpBase());
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

/**
 * A page served over HTTPS cannot reach an http:// LAN backend. Saying so is
 * the whole fix, because no retry will ever succeed and the browser's own
 * console message does not reach the operator.
 */
export function mixedContentBlocked(): boolean {
  const origin = backendOrigin();
  if (!origin || win()?.location.protocol !== "https:") return false;
  const url = new URL(origin);
  if (url.protocol !== "http:") return false;
  const host = url.hostname.toLowerCase();
  const loopback = host === "localhost" || host === "::1" || host === "[::1]"
    || /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host);
  return !loopback;
}

/**
 * Chrome's Private Network Access blocks a public HTTPS page from reaching a
 * private or loopback address unless the request opts in. Without this the
 * fetch is refused in the browser and never reaches the server at all — which
 * looks exactly like a backend that is down, except nothing appears in its
 * access log. god sets the same field; dropping it is why this looked offline
 * against a server that was answering.
 */
export function addressSpace(): "loopback" | "local" | undefined {
  const origin = backendOrigin();
  if (!origin) return undefined;
  const host = new URL(origin).hostname.toLowerCase();
  if (host === "localhost" || host === "[::1]" || host === "::1"
    || /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return "loopback";
  if (host.endsWith(".local") || /^10\./.test(host) || /^192\.168\./.test(host)
    || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) return "local";
  return undefined;
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = operatorToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const space = addressSpace();
  const request: RequestInit & { targetAddressSpace?: "loopback" | "local" } = { ...init, headers };
  if (space) request.targetAddressSpace = space;
  const response = await fetch(new URL(path, httpBase()), request);
  if (!response.ok) {
    throw new ApiError(
      response.status === 401 ? "operator token required" : `${path} failed`,
      response.status,
    );
  }
  return response.json() as Promise<T>;
}

export interface RawWindow {
  index: number; name: string; active: boolean;
  cwd?: string; status?: string; agent?: string;
}
export interface RawSession { name: string; windows: RawWindow[]; source?: string }

function paneStatus(value: string | undefined): PaneStatus {
  return value === "working" || value === "idle" || value === "blocked" || value === "done"
    ? value : "unknown";
}

/**
 * The folder is what an operator actually recognises. Session names arrive
 * base64url-encoded from herdr, so the checkout path is the only human-readable
 * identity available; a worktree keeps its slug, which is the useful half.
 */
function folderOf(cwd: string | undefined): string | null {
  if (!cwd) return null;
  const base = cwd.replace(/\/+$/, "").split("/").pop() ?? "";
  return base || null;
}

/** Shared by the HTTP fetch and the socket, so both produce identical agents. */
export function toFleet(sessions: RawSession[]): Fleet {
  const agents: Agent[] = [];
  for (const session of sessions) {
    for (const window of session.windows ?? []) {
      agents.push({
        target: `${session.name}:${window.index}`,
        session: session.name,
        window: window.index,
        name: window.name,
        agent: window.agent?.trim() || null,
        folder: folderOf(window.cwd),
        cwd: window.cwd ?? null,
        status: paneStatus(window.status),
        active: !!window.active,
      });
    }
  }
  return { agents, sessions: sessions.length };
}

export async function fetchFleet(signal?: AbortSignal): Promise<Fleet> {
  return toFleet(await call<RawSession[]>("/api/sessions", { signal }));
}

export async function capture(target: string, signal?: AbortSignal): Promise<string> {
  const data = await call<{ output?: string; text?: string }>(
    `/api/capture?target=${encodeURIComponent(target)}`, { signal });
  return data.output ?? data.text ?? "";
}

export async function send(target: string, text: string): Promise<void> {
  await call("/api/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target, text }),
  });
}

export async function wake(target: string): Promise<void> {
  await call("/api/wake", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target }),
  });
}
