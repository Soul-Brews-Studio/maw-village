import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";
import { engineColor } from "./palette";
import type { PaneStatus } from "../lib/api";

// Voxel villagers: every part is a box, nothing is smoothed, proportions are
// chunky on purpose. The look follows VoxLords (MIT, Lallassu/VoxLords) and the
// low-poly character work of Karim Maaloul; the geometry and rigging below are
// written here rather than lifted, since the CodePen grants no licence.
//
// A capsule with a hat cannot show the difference between hoeing and sleeping,
// and that difference is the whole point of the field — you should be able to
// read a pane's state from across the valley without reading any text.

const SKIN = "#f2c9a0";
const SKIN_DARK = "#d9a877";
const SHIRT = "#5d86b0";
const TROUSER = "#4a5f7a";
const BOOT = "#5b3f2c";

export function Villager({ status, engine }: { status: PaneStatus; engine: string | null }) {
  const body = useRef<Group>(null);
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const leftLeg = useRef<Group>(null);
  const rightLeg = useRef<Group>(null);
  const head = useRef<Group>(null);
  const chest = useRef<Mesh>(null);
  const phase = useRef(Math.random() * Math.PI * 2);

  const asleep = status === "idle" || status === "unknown" || status === "done";
  const working = status === "working";
  const blocked = status === "blocked";

  useFrame(state => {
    const t = state.clock.elapsedTime + phase.current;
    if (!body.current) return;

    if (working) {
      // Hoeing: the body dips into each swing, arms lead it, legs stay braced.
      const swing = Math.sin(t * 3.2);
      body.current.position.y = 0;
      body.current.rotation.set(0.2 + swing * 0.13, 0, 0);
      rightArm.current?.rotation.set(-2.2 + swing * 1.2, 0, 0);
      leftArm.current?.rotation.set(-1.8 + swing * 1.0, 0, 0);
      leftLeg.current?.rotation.set(0.24, 0, 0);
      rightLeg.current?.rotation.set(-0.2, 0, 0);
      head.current?.rotation.set(0.28, 0, 0);
    } else if (blocked) {
      // Stuck: upright, arms out, looking around for someone to help.
      const sway = Math.sin(t * 1.7);
      body.current.position.y = 0;
      body.current.rotation.set(0, 0, sway * 0.07);
      rightArm.current?.rotation.set(-0.25, 0, -1.0 - sway * 0.18);
      leftArm.current?.rotation.set(-0.25, 0, 1.0 + sway * 0.18);
      leftLeg.current?.rotation.set(0, 0, 0);
      rightLeg.current?.rotation.set(0, 0, 0);
      head.current?.rotation.set(0, sway * 0.7, 0);
    } else if (asleep) {
      // Lying down, breathing. The tilt is what reads as asleep from far off.
      const breath = Math.sin(t * 1.1) * 0.05;
      body.current.rotation.set(-Math.PI / 2.05, 0, 0);
      body.current.position.y = -0.2;
      chest.current?.scale.set(1 + breath, 1, 1 + breath);
      rightArm.current?.rotation.set(0.12, 0, -0.45);
      leftArm.current?.rotation.set(0.12, 0, 0.45);
      leftLeg.current?.rotation.set(0.1, 0, 0);
      rightLeg.current?.rotation.set(-0.1, 0, 0);
      head.current?.rotation.set(0, 0, 0.4);
    }
  });

  const hat = engineColor(engine);

  return (
    <group ref={body} position={[0.95, 0, 0.85]} scale={0.8}>
      {/* legs, each hinged at the hip */}
      {([[-0.1, leftLeg], [0.1, rightLeg]] as const).map(([x, ref], index) => (
        <group key={index} ref={ref} position={[x, 0.42, 0]}>
          <mesh castShadow position={[0, -0.14, 0]}>
            <boxGeometry args={[0.15, 0.3, 0.15]} />
            <meshStandardMaterial color={TROUSER} flatShading />
          </mesh>
          <mesh castShadow position={[0, -0.32, 0.02]}>
            <boxGeometry args={[0.16, 0.09, 0.2]} />
            <meshStandardMaterial color={BOOT} flatShading />
          </mesh>
        </group>
      ))}

      {/* torso */}
      <mesh ref={chest} castShadow position={[0, 0.6, 0]}>
        <boxGeometry args={[0.36, 0.36, 0.22]} />
        <meshStandardMaterial color={SHIRT} flatShading />
      </mesh>

      {/* arms, hinged at the shoulder */}
      {([[-0.25, leftArm], [0.25, rightArm]] as const).map(([x, ref], index) => (
        <group key={index} ref={ref} position={[x, 0.73, 0]}>
          <mesh castShadow position={[0, -0.15, 0]}>
            <boxGeometry args={[0.12, 0.3, 0.12]} />
            <meshStandardMaterial color={SHIRT} flatShading />
          </mesh>
          <mesh castShadow position={[0, -0.33, 0]}>
            <boxGeometry args={[0.13, 0.1, 0.13]} />
            <meshStandardMaterial color={SKIN} flatShading />
          </mesh>
        </group>
      ))}

      {/* head, with the engine's hat */}
      <group ref={head} position={[0, 0.95, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.3, 0.28, 0.28]} />
          <meshStandardMaterial color={SKIN} flatShading />
        </mesh>
        {/* eyes, so the villager has a front */}
        <mesh position={[-0.07, 0.02, 0.145]}>
          <boxGeometry args={[0.05, 0.05, 0.01]} />
          <meshStandardMaterial color="#3a2c22" />
        </mesh>
        <mesh position={[0.07, 0.02, 0.145]}>
          <boxGeometry args={[0.05, 0.05, 0.01]} />
          <meshStandardMaterial color="#3a2c22" />
        </mesh>
        <mesh castShadow position={[0, 0.17, 0]}>
          <boxGeometry args={[0.34, 0.07, 0.32]} />
          <meshStandardMaterial color={hat} flatShading />
        </mesh>
        <mesh castShadow position={[0, 0.23, 0]}>
          <boxGeometry args={[0.24, 0.08, 0.24]} />
          <meshStandardMaterial color={hat} flatShading />
        </mesh>
        <mesh position={[0, -0.13, 0.05]}>
          <boxGeometry args={[0.16, 0.05, 0.18]} />
          <meshStandardMaterial color={SKIN_DARK} flatShading />
        </mesh>
      </group>
    </group>
  );
}
