import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Village } from "./world/Village";
import { TerminalPanel } from "./components/TerminalPanel";
import {
  ApiError, backendOrigin, clearBackendOrigin, fetchFleet, mixedContentBlocked,
  operatorToken, send, setBackendOrigin, setOperatorToken, toFleet, wake,
  type Agent, type Fleet, type RawSession,
} from "./lib/api";
import { FleetSocket, type SocketState } from "./lib/socket";

const POLL_MS = 5000;

export default function App() {
  const [fleet, setFleet] = useState<Fleet>({ agents: [], sessions: 0 });
  const [detail, setDetail] = useState<string | null>(null);
  const [open, setOpen] = useState<Agent | null>(null);
  const [streaming, setStreaming] = useState<SocketState>("connecting");
  const [notice, setNotice] = useState<string | null>(null);
  const [sheet, setSheet] = useState<"none" | "host" | "token">("none");
  const [reconnectKey, setReconnectKey] = useState(0);
  const [query, setQuery] = useState("");
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [hovered, setHovered] = useState<string | null>(null);
  const socketRef = useRef<FleetSocket | null>(null);
  const openRef = useRef("");
  const streamingRef = useRef<SocketState>("connecting");

  useEffect(() => { streamingRef.current = streaming; }, [streaming]);

  const flash = useCallback((message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(current => (current === message ? null : current)), 4000);
  }, []);

  const poll = useCallback(async (signal: AbortSignal) => {
    if (mixedContentBlocked()) return;
    try { setFleet(await fetchFleet(signal)); } catch { /* the header already reports the link */ }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void poll(controller.signal);
    const id = setInterval(() => {
      if (streamingRef.current === "open") return;
      void poll(controller.signal);
    }, POLL_MS);
    return () => { controller.abort(); clearInterval(id); };
  }, [poll]);

  useEffect(() => {
    if (mixedContentBlocked()) return;
    const socket = new FleetSocket({
      onSessions: sessions => setFleet(toFleet(sessions as RawSession[])),
      onPreviews: data => setPreviews(current => ({ ...current, ...data })),
      onCapture: (target, content) => { if (target === openRef.current) setDetail(content); },
      onState: setStreaming,
      onError: reason => { if (reason !== "operator_token_required_for_writes") flash(reason); },
    });
    socketRef.current = socket;
    void socket.connect();
    return () => { socket.close(); socketRef.current = null; };
  }, [reconnectKey, flash]);

  useEffect(() => {
    openRef.current = open?.target ?? "";
    setDetail(null);
    if (open) socketRef.current?.select(open.target);
  }, [open?.target]);

  // Keep the open villager's status fresh as the roster changes underneath it.
  useEffect(() => {
    if (!open) return;
    const fresh = fleet.agents.find(agent => agent.target === open.target);
    if (fresh && fresh.status !== open.status) setOpen(fresh);
  }, [fleet.agents, open]);

  const agents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matched = needle
      ? fleet.agents.filter(agent => [agent.folder, agent.session, agent.agent]
          .filter(Boolean).join(" ").toLowerCase().includes(needle))
      : fleet.agents;
    // Stable order: the village must not rearrange itself under the cursor
    // every time a pane changes status.
    return [...matched].sort((a, b) => a.target.localeCompare(b.target));
  }, [fleet.agents, query]);

  // The server streams at most 16 previews, so spend them on the villagers
  // whose dreams are actually on screen: the busy, the stuck, the hovered and
  // the open one.
  useEffect(() => {
    const wanted = [
      ...(open ? [open.target] : []),
      ...(hovered ? [hovered] : []),
      ...agents.filter(a => a.status === "working" || a.status === "blocked").map(a => a.target),
    ];
    const unique = [...new Set(wanted)].slice(0, 16);
    socketRef.current?.subscribePreviews(unique);
  }, [agents, hovered, open?.target]);

  const counts = useMemo(() => ({
    working: fleet.agents.filter(a => a.status === "working").length,
    blocked: fleet.agents.filter(a => a.status === "blocked").length,
  }), [fleet.agents]);

  const origin = backendOrigin();
  const readOnly = !operatorToken();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = event.target instanceof HTMLInputElement;
      if (event.key === "Escape") {
        if (sheet !== "none") { setSheet("none"); return; }
        if (open) setOpen(null);
        return;
      }
      if (typing || event.metaKey || event.ctrlKey) return;
      if (event.key === "h") setSheet("host");
      if (event.key === "t") setSheet("token");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, sheet]);

  return (
    <div className="app">
      <div className="stage">
        {agents.length > 0
          ? <Village
              agents={agents}
              selected={open?.target ?? null}
              previews={previews}
              onOpen={setOpen}
              onHover={setHovered}
            />
          : <div className="empty">
              {mixedContentBlocked()
                ? "This page is HTTPS and the backend is plain HTTP, so the browser refuses the request before it leaves. Open the village over HTTP, or serve the backend over HTTPS."
                : fleet.agents.length === 0
                  ? "No villagers yet. Point this at a running herdr with h, or start one with maw herdr serve."
                  : `Nobody here matches “${query}”.`}
            </div>}
      </div>

      <header className="hud">
        <h1>Oracle Village</h1>
        <dl className="tally">
          <div><dt>Villagers</dt><dd>{fleet.agents.length}</dd></div>
          <div><dt>Working</dt><dd>{counts.working}</dd></div>
          <div data-alert={counts.blocked > 0 || undefined}><dt>Blocked</dt><dd>{counts.blocked}</dd></div>
        </dl>
        <input
          className="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Find a villager"
          spellCheck={false}
          aria-label="Find a villager"
        />
        <div className="link" data-stream={streaming}>
          <i className="lamp" aria-hidden="true" />
          <span>{streaming === "open" ? "live" : streaming === "connecting" ? "opening" : "offline"}</span>
          <span className="link-host">{origin ?? "same origin"}</span>
        </div>
        <button type="button" onClick={() => setSheet("host")}>Host</button>
        <button type="button" onClick={() => setSheet("token")}>{readOnly ? "Token" : "Operator"}</button>
      </header>

      <footer className="legend">
        <span><i className="swatch" style={{ background: "#5fbf4a" }} /> working</span>
        <span><i className="swatch" style={{ background: "#e05b3c" }} /> blocked</span>
        <span><i className="swatch" style={{ background: "#9fd17a" }} /> idle</span>
        <span><i className="swatch" style={{ background: "#f0c24b" }} /> done</span>
        <span>click a crop to read its terminal</span>
        <span className="build" title="build">{__BUILD_ID__}</span>
      </footer>

      {open && (
        <TerminalPanel
          agent={open}
          content={detail}
          readOnly={readOnly}
          onClose={() => setOpen(null)}
          onSend={text => {
            void send(open.target, text)
              .then(() => flash(`sent to ${open.folder ?? open.target}`))
              .catch(error => flash(error instanceof ApiError && error.status === 401
                ? "talking back needs an operator token" : "send failed"));
          }}
          onWake={() => {
            void wake(open.target)
              .then(() => flash(`woke ${open.folder ?? open.target}`))
              .catch(() => flash("wake failed"));
          }}
        />
      )}

      {notice && <p className="notice" role="status">{notice}</p>}

      {sheet !== "none" && (
        <div className="scrim" onClick={event => { if (event.target === event.currentTarget) setSheet("none"); }}>
          <section className="sheet" role="dialog" aria-modal="true">
            {sheet === "host" ? (
              <form onSubmit={event => {
                event.preventDefault();
                const value = String(new FormData(event.currentTarget).get("host") ?? "");
                try {
                  if (value.trim()) setBackendOrigin(value); else clearBackendOrigin();
                  setSheet("none"); setReconnectKey(k => k + 1); flash("village re-pointed");
                } catch { flash("that is not a reachable address"); }
              }}>
                <h2>Where is the fleet?</h2>
                <p>The address of a running <code>maw herdr serve</code>. Blank means this page's own origin.</p>
                <input name="host" defaultValue={origin ?? ""} placeholder="http://127.0.0.1:3457" autoFocus spellCheck={false} />
                <button type="submit">Point the village</button>
              </form>
            ) : (
              <form onSubmit={event => {
                event.preventDefault();
                setOperatorToken(String(new FormData(event.currentTarget).get("token") ?? ""));
                setSheet("none"); setReconnectKey(k => k + 1);
                flash(operatorToken() ? "token stored" : "token cleared");
              }}>
                <h2>Operator token</h2>
                <p>Watching needs nothing. Talking back and waking need the contents of your token file, kept in this browser only.</p>
                <input name="token" type="password" defaultValue={operatorToken() ?? ""} placeholder="contents of ~/.maw-herdr-token" autoFocus />
                <button type="submit">Store it</button>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
