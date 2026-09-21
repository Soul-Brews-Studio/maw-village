import { useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";

/**
 * What a villager is thinking about, shown over their head.
 *
 * A working villager shows it unasked, because that is the pane you are most
 * likely to want. A sleeping one keeps it to itself until you hover — 69 open
 * terminals at once is a wall, not a village.
 */
export function Dream({ text, tone, onOpen }: {
  text: string;
  tone: "working" | "blocked" | "asleep";
  onOpen: () => void;
}) {
  const float = useRef<Group>(null);
  const phase = useRef(Math.random() * Math.PI * 2);

  useFrame(state => {
    if (float.current) {
      float.current.position.y = 2.15 + Math.sin(state.clock.elapsedTime * 1.2 + phase.current) * 0.06;
    }
  });

  const lines = text.replace(/\s+$/, "").split("\n").slice(-7);

  return (
    <group ref={float} position={[0.95, 2.15, 0.85]}>
      <Html center distanceFactor={14} zIndexRange={[20, 0]}>
        <div className={`dream dream-${tone}`} onClick={event => { event.stopPropagation(); onOpen(); }}>
          <pre>{lines.join("\n") || "…"}</pre>
          <i className="dream-tail" aria-hidden="true" />
        </div>
      </Html>
    </group>
  );
}

/** Three Zs, drifting. The cheapest possible "this one is fine, leave it". */
export function Sleeping() {
  const group = useRef<Group>(null);
  const phase = useRef(Math.random() * Math.PI * 2);

  useFrame(state => {
    if (!group.current) return;
    const t = (state.clock.elapsedTime * 0.4 + phase.current) % 1;
    group.current.position.y = 1.35 + t * 0.7;
    group.current.position.x = 1.1 + t * 0.35;
    const scale = 0.9 + t * 0.5;
    group.current.scale.setScalar(scale);
  });

  return (
    <group ref={group} position={[1.1, 1.35, 0.85]}>
      <Html center distanceFactor={16} zIndexRange={[10, 0]}>
        <span className="zzz">z</span>
      </Html>
    </group>
  );
}
