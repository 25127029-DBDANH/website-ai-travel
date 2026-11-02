import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles } from '@react-three/drei';
import { useInView, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

function DriftingShape({ color, position, scale = 1, speed = 0.12 }) {
  const meshRef = useRef(null);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.rotation.y = state.clock.elapsedTime * speed;
    mesh.rotation.x = Math.sin(state.clock.elapsedTime * 0.35 + position[0]) * 0.25;
  });

  return (
    <Float speed={1.6} rotationIntensity={0.4} floatIntensity={0.9}>
      <mesh ref={meshRef} position={position} scale={scale}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={color} metalness={0.25} roughness={0.35} />
      </mesh>
    </Float>
  );
}

function TorusRing({ position, rotation = [0, 0, 0], scale = 1 }) {
  const meshRef = useRef(null);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.rotation.x = rotation[0] + state.clock.elapsedTime * 0.2;
    mesh.rotation.y = rotation[1] + state.clock.elapsedTime * 0.15;
  });

  return (
    <Float speed={1.2} rotationIntensity={0.3} floatIntensity={0.7}>
      <mesh ref={meshRef} position={position} rotation={rotation} scale={scale}>
        <torusGeometry args={[1, 0.32, 24, 64]} />
        <meshStandardMaterial color="#2563eb" metalness={0.35} roughness={0.25} />
      </mesh>
    </Float>
  );
}

export default function Hero3D() {
  const reduced = useReducedMotion();
  const hostRef = useRef(null);
  const inView = useInView(hostRef, { margin: '120px' });
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);

  useEffect(() => {
    const handleVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  if (reduced) return null;

  return (
    <div ref={hostRef} className="h-full w-full">
      <Canvas
        dpr={[1, 1.5]}
        frameloop={inView && pageVisible ? 'always' : 'never'}
        camera={{ position: [0, 0, 9], fov: 42 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[6, 8, 6]} intensity={1.4} />
        <directionalLight position={[-6, -2, -4]} intensity={0.5} color="#f97316" />

        <DriftingShape color="#2563eb" position={[-5.4, 1.6, -1]} scale={1.15} />
        <DriftingShape color="#f97316" position={[-6.6, -1.6, -2]} scale={0.7} speed={0.2} />
        <DriftingShape color="#F5A9BC" position={[5.8, 2.4, -2]} scale={0.55} speed={0.17} />
        <DriftingShape color="#F1A33C" position={[6.4, -2.2, -1]} scale={0.85} speed={0.1} />
        <TorusRing position={[3.4, 0.4, -2.5]} rotation={[1.1, 0.4, 0]} scale={0.75} />

        <Sparkles count={70} scale={[16, 9, 6]} size={2.2} speed={0.35} color="#93c5fd" opacity={0.55} />
      </Canvas>
    </div>
  );
}
