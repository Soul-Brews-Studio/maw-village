import { useEffect, useRef } from "react";
import type { Agent } from "../lib/api";

/**
 * The villager's letter box. Reading the pane and writing back to it are the
 * same panel, because in practice you always do the second right after the
 * first.
 */
export function TerminalPanel({ agent, content, readOnly, onClose, onSend, onWake }: {
  agent: Agent;
  content: string | null;
  readOnly: boolean;
  onClose: () => void;
  onSend: (text: string) => void;
  onWake: () => void;
}) {
  const scroller = useRef<HTMLPreElement>(null);
  const pinned = useRef(true);
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => { field.current?.focus(); }, [agent.target]);

  useEffect(() => {
    const node = scroller.current;
    if (node && pinned.current) node.scrollTop = node.scrollHeight;
  }, [content]);

  return (
    <aside className="panel" aria-label={`Terminal for ${agent.folder ?? agent.session}`}>
      <header className="panel-head">
        <div>
          <h2>{agent.folder ?? agent.session}</h2>
          <p className="panel-sub">
            <span className="panel-status" data-status={agent.status}>{agent.status}</span>
            <span>{agent.agent ?? "no engine"}</span>
          </p>
        </div>
        <button type="button" className="panel-close" onClick={onClose} aria-label="Close">✕</button>
      </header>

      <p className="panel-path">{agent.cwd ?? agent.target}</p>

      <pre
        className="panel-body"
        ref={scroller}
        tabIndex={0}
        onScroll={event => {
          const node = event.currentTarget;
          pinned.current = node.scrollHeight - node.scrollTop - node.clientHeight < 24;
        }}
      >
        {content ?? "waiting for output…"}
      </pre>

      <form
        className="panel-compose"
        onSubmit={event => {
          event.preventDefault();
          if (!field.current?.value.trim()) return;
          onSend(field.current.value);
          field.current.value = "";
        }}
      >
        <input
          ref={field}
          placeholder={readOnly ? "Read only — add an operator token to talk back" : "Say something to this villager"}
          disabled={readOnly}
          autoComplete="off"
          spellCheck={false}
          aria-label="Send to this pane"
        />
        <button type="submit" disabled={readOnly}>Send</button>
        <button type="button" onClick={onWake} disabled={readOnly} className="panel-wake">Wake</button>
      </form>
    </aside>
  );
}
