'use client';

import { Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ContactShadows, Float, OrbitControls, PerspectiveCamera, RoundedBox } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { Color, Group, MathUtils } from 'three';
import styles from './concept-scene.module.css';
import type { ConceptSceneSource, SceneObject, SceneSpec } from './concept-scene-spec';
import { buildConceptScenePoster, buildConceptSceneSpec } from './concept-scene-spec';

type ConceptSceneProps = {
  concept: ConceptSceneSource;
  className?: string;
  posterOnly?: boolean;
  spec?: SceneSpec;
};

function supportsWebGL() {
  if (typeof window === 'undefined') return false;

  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')),
    );
  } catch {
    return false;
  }
}

function isGroundedObject(kind: SceneObject['kind']) {
  return kind === 'plinth' || kind === 'terrain';
}

function materialColor(color: string) {
  return new Color(color);
}

function SculptureObject({
  object,
  reduceMotion,
}: {
  object: SceneObject;
  reduceMotion: boolean;
}) {
  const content = (() => {
    switch (object.kind) {
      case 'plinth':
        return (
          <RoundedBox
            args={[1, 1, 1]}
            position={object.position}
            rotation={object.rotation}
            scale={object.scale}
            radius={0.08}
            smoothness={6}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial
              color={materialColor(object.color)}
              roughness={0.9}
              metalness={0.05}
            />
          </RoundedBox>
        );
      case 'core':
        return (
          <RoundedBox
            args={[1, 1, 1]}
            position={object.position}
            rotation={object.rotation}
            scale={object.scale}
            radius={0.22}
            smoothness={8}
            castShadow
            receiveShadow
          >
            <meshPhysicalMaterial
              color={materialColor(object.color)}
              roughness={Math.max(0.14, object.roughness * 0.65)}
              metalness={0.12}
              clearcoat={0.85}
              clearcoatRoughness={0.2}
              emissive={materialColor(object.accent)}
              emissiveIntensity={0.08 + object.glow * 0.45}
            />
          </RoundedBox>
        );
      case 'shell':
        return (
          <mesh
            position={object.position}
            rotation={object.rotation}
            scale={object.scale}
            receiveShadow
          >
            <sphereGeometry args={[0.62, 64, 64]} />
            <meshPhysicalMaterial
              color={materialColor(object.color)}
              roughness={0.08}
              transparent
              opacity={object.opacity}
              transmission={0.82}
              thickness={0.8}
              ior={1.05}
              clearcoat={1}
              clearcoatRoughness={0.08}
            />
          </mesh>
        );
      case 'ring':
        return (
          <mesh
            position={object.position}
            rotation={object.rotation}
            scale={object.scale}
            castShadow
            receiveShadow
          >
            <torusGeometry args={[0.78, 0.1, 28, 120]} />
            <meshPhysicalMaterial
              color={materialColor(object.color)}
              roughness={Math.max(0.2, object.roughness * 0.7)}
              metalness={0.32}
              clearcoat={0.65}
              clearcoatRoughness={0.16}
              emissive={materialColor(object.accent)}
              emissiveIntensity={0.04 + object.glow * 0.3}
            />
          </mesh>
        );
      case 'plate':
        return (
          <RoundedBox
            args={[1, 1, 1]}
            position={object.position}
            rotation={object.rotation}
            scale={object.scale}
            radius={0.06}
            smoothness={5}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial
              color={materialColor(object.color)}
              roughness={0.72}
              metalness={0.08}
            />
          </RoundedBox>
        );
      case 'terrain':
        return (
          <group position={object.position} rotation={object.rotation} scale={object.scale}>
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.92, 1.08, 1, 9]} />
              <meshStandardMaterial
                color={materialColor(object.color)}
                roughness={0.96}
                metalness={0.03}
              />
            </mesh>
            <mesh position={[0, 0.03, 0]} rotation={[0, Math.PI / 6, 0]}>
              <torusGeometry args={[0.78, 0.035, 18, 64]} />
              <meshStandardMaterial
                color={materialColor(object.accent)}
                roughness={0.6}
                metalness={0.22}
              />
            </mesh>
          </group>
        );
      case 'beam':
        return (
          <RoundedBox
            args={[1, 1, 1]}
            position={object.position}
            rotation={object.rotation}
            scale={object.scale}
            radius={0.12}
            smoothness={5}
            castShadow
            receiveShadow
          >
            <meshPhysicalMaterial
              color={materialColor(object.color)}
              roughness={0.3}
              metalness={0.1}
              clearcoat={0.9}
              clearcoatRoughness={0.14}
              emissive={materialColor(object.accent)}
              emissiveIntensity={0.05 + object.glow * 0.24}
            />
          </RoundedBox>
        );
      case 'marker':
        return (
          <mesh
            position={object.position}
            rotation={object.rotation}
            scale={object.scale}
            castShadow
            receiveShadow
          >
            <cylinderGeometry args={[0.5, 0.5, 1, 28]} />
            <meshStandardMaterial
              color={materialColor(object.color)}
              roughness={0.58}
              metalness={0.16}
            />
          </mesh>
        );
      case 'barrier':
      default:
        return (
          <RoundedBox
            args={[1, 1, 1]}
            position={object.position}
            rotation={object.rotation}
            scale={object.scale}
            radius={0.05}
            smoothness={4}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial
              color={materialColor(object.color)}
              roughness={0.76}
              metalness={0.06}
            />
          </RoundedBox>
        );
    }
  })();

  if (isGroundedObject(object.kind)) {
    return content;
  }

  return (
    <Float
      enabled={!reduceMotion}
      speed={0.7 + object.glow * 0.8}
      floatIntensity={0.08 + object.glow * 0.18}
      rotationIntensity={0.08}
    >
      {content}
    </Float>
  );
}

function cameraPosition(spec: SceneSpec): [number, number, number] {
  const pitch = Math.abs(spec.camera.pitch) + 0.42;
  const horizontal = spec.camera.distance * Math.cos(pitch);
  return [
    Math.sin(spec.camera.yaw) * horizontal,
    spec.camera.distance * Math.sin(pitch),
    Math.cos(spec.camera.yaw) * horizontal,
  ];
}

function SceneRig({ spec, reduceMotion }: { spec: SceneSpec; reduceMotion: boolean }) {
  const groupRef = useRef<Group>(null);
  const position = useMemo(() => cameraPosition(spec), [spec]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const elapsed = state.clock.getElapsedTime();
    const oscillation = reduceMotion ? 0 : Math.sin(elapsed * spec.motion.orbit) * 0.08;
    const bob = reduceMotion ? 0 : Math.cos(elapsed * spec.motion.bob) * 0.03;
    const drift = reduceMotion ? 0 : Math.sin(elapsed * spec.motion.drift) * 0.08;
    const targetY = oscillation + state.pointer.x * spec.motion.parallax * 0.12;
    const targetX = -0.16 + bob + state.pointer.y * spec.motion.parallax * 0.08;

    group.rotation.y = MathUtils.damp(group.rotation.y, targetY, 4.2, delta);
    group.rotation.x = MathUtils.damp(group.rotation.x, targetX, 4.2, delta);
    group.position.y = MathUtils.damp(group.position.y, drift, 3.4, delta);
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={position} fov={30 / spec.camera.zoom} />
      <fog attach="fog" args={[spec.palette.background, 10, 18]} />
      <ambientLight intensity={spec.lighting.ambient * 1.95} />
      <directionalLight
        castShadow
        position={[6.5, 8.5, 4.5]}
        intensity={spec.lighting.key * 2.15}
        color={spec.palette.surface}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight
        position={[-5.5, 4.2, -5.2]}
        intensity={spec.lighting.rim * 1.35}
        color={spec.palette.accentSoft}
      />
      <directionalLight
        position={[0, 3.5, 8]}
        intensity={0.65}
        color={spec.palette.accentWarm}
      />

      <group ref={groupRef}>
        {spec.objects.map((object) => (
          <SculptureObject key={object.id} object={object} reduceMotion={reduceMotion} />
        ))}
      </group>

      <ContactShadows
        position={[0, -2.05, 0]}
        opacity={0.28}
        scale={9.5}
        blur={2.4}
        far={4.8}
        color={spec.palette.accent}
      />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 3.2}
        maxPolarAngle={Math.PI / 1.9}
        minAzimuthAngle={-Math.PI / 3}
        maxAzimuthAngle={Math.PI / 3}
        target={[0, -0.35, 0]}
        autoRotate={!reduceMotion}
        autoRotateSpeed={0.28 + spec.motion.orbit * 2}
      />
    </>
  );
}

export default function ConceptScene({
  concept,
  className,
  posterOnly = false,
  spec: suppliedSpec,
}: ConceptSceneProps) {
  const spec = useMemo(() => suppliedSpec ?? buildConceptSceneSpec(concept), [concept, suppliedSpec]);
  const poster = useMemo(() => buildConceptScenePoster(spec), [spec]);
  const [canRender3d, setCanRender3d] = useState(!posterOnly);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (posterOnly) {
      setCanRender3d(false);
      return;
    }

    setCanRender3d(supportsWebGL());

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotion = () => setReduceMotion(media.matches);
    syncMotion();
    media.addEventListener?.('change', syncMotion);
    media.addListener?.(syncMotion);

    return () => {
      media.removeEventListener?.('change', syncMotion);
      media.removeListener?.(syncMotion);
    };
  }, [posterOnly]);

  return (
    <figure className={[styles.figure, className].filter(Boolean).join(' ')}>
      <div
        className={styles.frame}
        style={
          {
            '--scene-bg': spec.palette.background,
            '--scene-ink': spec.palette.ink,
            '--scene-ink-muted': spec.palette.accent,
            '--scene-ink-soft': spec.palette.ink,
          } as CSSProperties
        }
      >
        <img src={poster} alt="" aria-hidden="true" className={styles.poster} />
        {canRender3d ? (
          <Canvas className={styles.canvas} dpr={[1, 2]} shadows gl={{ alpha: true, antialias: true }}>
            <Suspense fallback={null}>
              <SceneRig spec={spec} reduceMotion={reduceMotion} />
            </Suspense>
          </Canvas>
        ) : null}

        <figcaption className={styles.overlay}>
          <p className={styles.overlayCategory}>{spec.poster.category}</p>
          <h2 className={styles.overlayTitle}>{spec.poster.title}</h2>
          <p className={styles.overlaySummary}>{spec.summary}</p>
        </figcaption>
      </div>
      <p className={styles.hint}>
        {canRender3d ? 'Drag to orbit. The sculpture is regenerated from the entry text on each visit.' : 'Poster fallback shown because live 3D is unavailable on this device.'}
      </p>
      <span className={styles.visuallyHidden}>
        {spec.poster.title}. {spec.poster.subtitle}. {spec.summary}
      </span>
    </figure>
  );
}
