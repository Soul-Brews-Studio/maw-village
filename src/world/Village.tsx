import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MapControls, Sky } from "@react-three/drei";
import { Plot } from "./Plot";
import { GRASS, GRASS_DARK, PATH } from "./palette";
import type { Agent } from "../lib/api";

const SPACING = 4.2;

/** A square-ish field, so the valley grows in both directions as the fleet does. */
export function layout(count: number): { columns: number; rows: number } {
  const columns = Math.max(1, Math.ceil(Math.sqrt(count)));
  return { columns, rows: Math.max(1, Math.ceil(count / columns)) };
}

export function Village({ agents, selected, previews, onOpen, onHover }: {
  agents: Agent[];
  selected: string | null;
  previews: Record<string, string>;
  onOpen: (agent: Agent) => void;
  onHover: (target: string | null) => void;
}) {
  const { columns, rows } = useMemo(() => layout(agents.length), [agents.length]);
  const width = columns * SPACING;
  const depth = rows * SPACING;
  // Pull back until the longer side of the field fits the field of view, with
  // a margin so the valley has edges rather than filling to the bezel.
  const span = Math.max(width, depth);
  const distance = (span / 2) / Math.tan((45 * Math.PI / 180) / 2) * 1.25;
  const cameraPosition: [number, number, number] = [0, distance * 0.72, distance * 0.78];

  return (
    <Canvas
      shadows="percentage"
      camera={{ position: cameraPosition, fov: 45, near: 0.5, far: distance * 4 }}
      dpr={[1, 1.75]}
    >
      <Sky sunPosition={[12, 18, 8]} turbidity={2.4} rayleigh={0.6} />
      <fog attach="fog" args={["#cfe8f2", distance * 0.9, distance * 2.6]} />

      <ambientLight intensity={0.85} />
      <directionalLight
        position={[12, 20, 8]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-width}
        shadow-camera-right={width}
        shadow-camera-top={depth}
        shadow-camera-bottom={-depth}
      />

      {/* The valley floor, and a path down the middle of it */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[width * 3, depth * 3]} />
        <meshStandardMaterial color={GRASS} />
      </mesh>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, depth / 2 + 2.2]}>
        <planeGeometry args={[width * 3, 2.2]} />
        <meshStandardMaterial color={PATH} />
      </mesh>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[width + 2, depth + 2]} />
        <meshStandardMaterial color={GRASS_DARK} />
      </mesh>

      {agents.map((agent, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        return (
          <Plot
            key={agent.target}
            agent={agent}
            selected={selected === agent.target}
            preview={previews[agent.target]}
            onOpen={() => onOpen(agent)}
            onHover={onHover}
            position={[
              (column - (columns - 1) / 2) * SPACING,
              0,
              (row - (rows - 1) / 2) * SPACING,
            ]}
          />
        );
      })}

      <AimAtValley distance={distance} />

      {/* Pan and zoom, but never tumble: a village has an up. */}
      <MapControls
        makeDefault
        target={[0, 0, 0]}
        enableRotate
        minPolarAngle={0.35}
        maxPolarAngle={Math.PI / 2.6}
        minDistance={6}
        maxDistance={distance * 2}
      />
    </Canvas>
  );
}

/**
 * MapControls adopts whatever direction the camera already faces when it
 * mounts, and R3F's default camera faces down -Z from wherever it was placed —
 * not at the scene. Aiming it once after the controls exist, and telling them
 * to recompute, is what puts the valley in the middle of the frame.
 */
function AimAtValley({ distance }: { distance: number }) {
  const framed = useRef(0);

  // Driven from the frame loop rather than an effect on `controls`: MapControls
  // publishes itself to R3F state after mount, and an effect that reads it can
  // miss that window and never retry. useFrame always runs, so the reframe
  // lands on whichever frame the controls first exist.
  useFrame(({ camera, controls }) => {
    if (Math.abs(framed.current - distance) < 0.5) return;
    const orbit = controls as
      { target?: { set: (x: number, y: number, z: number) => void }; update?: () => void } | null;
    // R3F applies the `camera` prop once, at mount, and at mount the fleet is
    // still empty — so that distance was computed for a one-plot village and
    // left the camera standing inside the field.
    camera.position.set(0, distance * 0.72, distance * 0.78);
    orbit?.target?.set(0, 0, 0);
    camera.lookAt(0, 0, 0);
    orbit?.update?.();
    framed.current = distance;
  });

  return null;
}
