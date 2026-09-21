import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import type { Mesh } from "three";
import { CROP, CROP_HEIGHT, SIGN, SOIL, SOIL_DARK, WOOD } from "./palette";
import { Villager } from "./Villager";
import { Dream, Sleeping } from "./Dream";
import type { Agent } from "../lib/api";

/**
 * One agent, as a plot of land with a villager tending it.
 *
 * The crop is the status: a working pane grows tall and green, a blocked one
 * wilts red and short, a finished one turns gold. That mapping is the whole
 * interface — you read the field, not a legend.
 */
export function Plot({ agent, position, selected, preview, onOpen, onHover }: {
  agent: Agent;
  position: [number, number, number];
  selected: boolean;
  preview: string | undefined;
  onOpen: () => void;
  onHover: (target: string | null) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const crop = useRef<Mesh>(null);
  const phase = useRef(Math.random() * Math.PI * 2);

  const height = CROP_HEIGHT[agent.status];
  const color = CROP[agent.status];
  const working = agent.status === "working";

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    if (crop.current) {
      crop.current.rotation.z = Math.sin(time * 1.1 + phase.current) * (working ? 0.07 : 0.03);
    }
  });

  const label = agent.folder ?? agent.session;
  const asleep = agent.status === "idle" || agent.status === "unknown" || agent.status === "done";
  // Unasked for the ones that are doing something; on request for the rest.
  const showDream = (working || agent.status === "blocked" || hovered || selected) && !!preview;

  return (
    <group position={position}>
      {/* Tilled soil */}
      <mesh receiveShadow position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.6, 2.6]} />
        <meshStandardMaterial color={selected ? SOIL : SOIL_DARK} />
      </mesh>
      {/* Furrows, so the plot reads as tended rather than as a brown square */}
      {[-0.8, 0, 0.8].map(offset => (
        <mesh key={offset} position={[offset, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.28, 2.4]} />
          <meshStandardMaterial color={SOIL} />
        </mesh>
      ))}

      {/* The crop: status made physical */}
      <mesh
        ref={crop}
        castShadow
        position={[0, height / 2 + 0.05, 0]}
        onClick={event => { event.stopPropagation(); onOpen(); }}
        onPointerOver={event => { event.stopPropagation(); setHovered(true); onHover(agent.target); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHovered(false); onHover(null); document.body.style.cursor = "auto"; }}
      >
        <coneGeometry args={[0.55, height, 7]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>

      <Villager status={agent.status} engine={agent.agent} />

      {/* A working villager dreams out loud; a sleeper only when you lean in. */}
      {showDream && (
        <Dream
          text={preview ?? ""}
          tone={agent.status === "blocked" ? "blocked" : working ? "working" : "asleep"}
          onOpen={onOpen}
        />
      )}
      {asleep && !hovered && !selected && <Sleeping />}

      {/* Signpost with the folder name — the only text in the field */}
      <mesh castShadow position={[-1.05, 0.35, 1.0]}>
        <boxGeometry args={[0.07, 0.7, 0.07]} />
        <meshStandardMaterial color={WOOD} />
      </mesh>
      {(hovered || selected || agent.status === "blocked") && (
      <Billboard position={[-1.05, 0.95, 1.0]}>
        <mesh>
          <planeGeometry args={[Math.max(1.5, Math.min(label.length * 0.16, 3.2)), 0.42]} />
          <meshStandardMaterial color={SIGN} />
        </mesh>
        <Text
          position={[0, 0, 0.01]}
          fontSize={0.19}
          maxWidth={3}
          color="#5b4630"
          anchorX="center"
          anchorY="middle"
        >
          {label}
        </Text>
      </Billboard>
      )}

      {selected && (
        <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.5, 1.7, 24]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.75} />
        </mesh>
      )}
    </group>
  );
}
