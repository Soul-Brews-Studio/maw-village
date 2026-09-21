// Live pane streaming, the same socket god.buildwithoracle.com uses.
//
// Polling /api/capture on a timer shows a board that is always a little bit
// wrong. The socket pushes: the roster on connect, a 15-line preview for every
// subscribed row, and 80 lines for whichever pane is selected.
//
// Handshake, from the server's own rules:
//   token present → POST /api/auth/ws-ticket, then open with
//                   ["maw.ws.v1", "<single-use ticket>"]
//   no token      → open with no protocols at all. A tokenless demo server
//                   accepts that read-only; a token-guarded one closes it,
//                   which is the correct answer to "no credential".

import { backendOrigin, operatorToken, socketURL } from "./api";

export const WS_PROTOCOL = "maw.ws.v1";

export type SocketState = "connecting" | "open" | "closed";

export interface SocketEvents {
  onSessions: (sessions: unknown[]) => void;
  onPreviews: (data: Record<string, string>) => void;
  onCapture: (target: string, content: string) => void;
  onState: (state: SocketState, detail?: string) => void;
  onError: (reason: string) => void;
}

async function fetchTicket(): Promise<string | null> {
  const token = operatorToken();
  if (!token) return null;
  const base = backendOrigin() ?? window.location.origin;
  try {
    const response = await fetch(new URL("/api/auth/ws-ticket", base), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ path: "/ws" }),
    });
    if (!response.ok) return null;
    const value = await response.json() as { protocol?: string; ticket?: string };
    if (value.protocol !== WS_PROTOCOL || typeof value.ticket !== "string") return null;
    return /^mwt1_[0-9a-f]{64}$/.test(value.ticket) ? value.ticket : null;
  } catch { return null; }
}

export class FleetSocket {
  private ws: WebSocket | null = null;
  private closed = false;
  private attempt = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private previewTargets: string[] = [];
  private selected = "";

  constructor(private readonly events: SocketEvents) {}

  async connect(): Promise<void> {
    if (this.closed) return;
    this.events.onState("connecting");
    const ticket = await fetchTicket();
    if (this.closed) return;

    // An empty protocol list is meaningful here, not an omission: it is how the
    // server recognises an unauthenticated reader.
    const socket = ticket
      ? new WebSocket(socketURL("/ws"), [WS_PROTOCOL, ticket])
      : new WebSocket(socketURL("/ws"));
    this.ws = socket;

    socket.onopen = () => {
      this.attempt = 0;
      this.events.onState("open");
      // Re-assert what we were watching; a reconnect must not silently
      // downgrade the board to a roster with no live output.
      if (this.previewTargets.length) this.subscribePreviews(this.previewTargets);
      if (this.selected) this.select(this.selected);
    };

    socket.onmessage = (event) => {
      let message: { type?: string; [key: string]: unknown };
      try { message = JSON.parse(String(event.data)); } catch { return; }
      switch (message.type) {
        case "sessions":
          if (Array.isArray(message.sessions)) this.events.onSessions(message.sessions);
          return;
        case "previews":
          if (message.data && typeof message.data === "object") {
            this.events.onPreviews(message.data as Record<string, string>);
          }
          return;
        case "capture":
          if (typeof message.target === "string" && typeof message.content === "string") {
            this.events.onCapture(message.target, message.content);
          }
          return;
        case "error":
          if (typeof message.error === "string") this.events.onError(message.error);
          return;
        default:
          return;
      }
    };

    socket.onclose = (event) => {
      if (this.closed) return;
      this.events.onState("closed", event.code === 1006 ? "refused" : String(event.code));
      // Exponential backoff with a 15s ceiling: a laptop that sleeps through a
      // demo window should not hammer a server that is never coming back.
      this.attempt += 1;
      const delay = Math.min(1000 * 2 ** (this.attempt - 1), 15000);
      this.timer = setTimeout(() => { void this.connect(); }, delay);
    };

    socket.onerror = () => { /* onclose always follows; it owns the retry */ };
  }

  private send(payload: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(payload));
  }

  /** The 80-line pane under the cursor. */
  select(target: string): void {
    this.selected = target;
    if (target) this.send({ type: "select", target });
  }

  /** 15-line previews for the visible rows. The server caps this at 16. */
  subscribePreviews(targets: string[]): void {
    this.previewTargets = targets.slice(0, 16);
    this.send({ type: "subscribe-previews", targets: this.previewTargets });
  }

  wake(target: string): void { this.send({ type: "wake", target }); }

  sendText(target: string, text: string): void { this.send({ type: "send", target, text }); }

  close(): void {
    this.closed = true;
    if (this.timer) clearTimeout(this.timer);
    this.ws?.close();
    this.ws = null;
  }
}
