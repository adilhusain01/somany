'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Vector3, CatmullRomCurve3, TubeGeometry, LatheGeometry, ShaderMaterial } from 'three';
import * as THREE from 'three';

// Utility to create reusable materials
const createMaterial = (options: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(options);

function ModernFunnel() {
  const funnelRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (funnelRef.current) {
      // Gentle floating animation
      funnelRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
      funnelRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.02;
    }
  });

  // Create smooth funnel shape using LatheGeometry
  const funnelGeometry = useMemo(() => {
    const points = [];
    // Create smooth curved funnel profile
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const radius = 2.2 - (t * t * 1.8); // Smooth exponential curve
      const y = t * 5 - 2.5;
      points.push(new THREE.Vector2(Math.max(radius, 0.15), y));
    }
    return new LatheGeometry(points, 32);
  }, []);

  return (
    <group ref={funnelRef}>
      {/* Main funnel body - rotated so wide end is on left, narrow on right */}
      <mesh geometry={funnelGeometry} rotation={[0, 0, -Math.PI / 2]} position={[0, 0, 0]}>
        <meshStandardMaterial 
          color="#1e293b"
          metalness={0.9}
          roughness={0.1}
          transparent
          opacity={0.85}
        />
      </mesh>
      
      {/* Inner glow */}
      <mesh geometry={funnelGeometry} rotation={[0, 0, -Math.PI / 2]} position={[0, 0, 0]} scale={[0.98, 1, 0.98]}>
        <meshStandardMaterial 
          color="#3b82f6"
          emissive="#1d4ed8"
          emissiveIntensity={0.3}
          transparent
          opacity={0.4}
        />
      </mesh>
      
      {/* Rim highlights */}
      <mesh geometry={funnelGeometry} rotation={[0, 0, -Math.PI / 2]} position={[0, 0, 0]} scale={[1.02, 1, 1.02]}>
        <meshStandardMaterial 
          color="#60a5fa"
          transparent
          opacity={0.2}
          wireframe
        />
      </mesh>
    </group>
  );
}


// Static wires with improved pulse management
function StaticWires() {
  const groupRef = useRef<THREE.Group>(null);

  // Memoized wire paths with more variation
  const wirePaths = useMemo(() => {
    const paths = [];
    for (let i = 0; i < 8; i++) { // Increased to 8 wires for fuller effect
      const startY = (i - 3.5) * 0.6; // Adjusted spacing
      const endY = startY * 0.1; // Gentle convergence

      const curve = new CatmullRomCurve3([
        new Vector3(-9, startY, Math.random() * 0.5 - 0.25),
        new Vector3(-6, startY * 0.7 + Math.random() * 0.2, Math.random() * 0.4 - 0.2),
        new Vector3(-3, startY * 0.4 + Math.random() * 0.1, Math.random() * 0.3 - 0.15),
        new Vector3(-0.5, endY, 0),
      ]);

      paths.push({ curve, index: i });
    }
    return paths;
  }, []);

  const wireMaterial = useMemo(() => createMaterial({
    color: '#003d9f',
    metalness: 0.8,
    roughness: 0.2,
  }), []);

  return (
    <group ref={groupRef}>
      {wirePaths.map(({ curve, index }) => (
        <group key={`wire-${index}`}>
          {/* Main wire tube */}
          <mesh geometry={new TubeGeometry(curve, 128, 0.012, 8, false)} material={wireMaterial} />
          {/* Pulse effect */}
          <ElectricPulse curve={curve} wireIndex={index} />
        </group>
      ))}
    </group>
  );
}

// Renamed to ElectricPulse for clarity, with refined animation
function ElectricPulse({ curve, wireIndex }: { curve: CatmullRomCurve3; wireIndex: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const lastPulseTime = useRef(0);
  const pulseDuration = useRef(0);
  const isPulsing = useRef(false);
  const nextPulseDelay = useRef(Math.random() * 2 + 1.5); // Randomized initial delay

  // Memoized segment geometry and material options
  const sphereGeometry = useMemo(() => new THREE.SphereGeometry(0.08, 12, 12), []); // Smoother spheres
  const colorOptions = useMemo(() => [
    { color: 0x1a1a2e, emissive: 0x16213e },
    { color: 0x0f3460, emissive: 0x0f3460 },
    { color: 0x533483, emissive: 0x533483 },
  ], []);

  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.elapsedTime;

    // Initiate new pulse
    if (!isPulsing.current && time - lastPulseTime.current > nextPulseDelay.current) {
      isPulsing.current = true;
      lastPulseTime.current = time;
      pulseDuration.current = 1.0 + Math.random() * 1.5; // Varied duration
      nextPulseDelay.current = 3 + Math.random() * 5; // Longer intervals for less clutter
    }

    if (isPulsing.current) {
      const pulseAge = time - lastPulseTime.current;
      const pulseProgress = pulseAge / pulseDuration.current;

      if (pulseProgress < 1) {
        groupRef.current.children.forEach((segment, idx) => {
          const delay = idx * 0.08; // Smoother stagger
          const segProgress = Math.max(0, Math.min(1, (pulseProgress - delay) * 1.5));

          if (segProgress > 0 && segProgress < 1) {
            segment.position.copy(curve.getPoint(segProgress));
            segment.visible = true;

            const intensity = 2.5 + Math.sin(segProgress * Math.PI) * 1.5;
            const mesh = segment as THREE.Mesh;
            const mat = mesh.material as THREE.MeshStandardMaterial;
            mat.emissiveIntensity = intensity;
            mat.opacity = 0.85 + Math.sin(segProgress * Math.PI) * 0.15;
            mesh.scale.setScalar(0.4 + intensity * 0.2);
          } else {
            segment.visible = false;
          }
        });
      } else {
        isPulsing.current = false;
        groupRef.current.children.forEach((segment) => (segment.visible = false));
      }
    }
  });

  // Create segments with random color assignment
  const segments = useMemo(() => Array.from({ length: 8 }, (_, i) => { // More segments for fluid motion
    const { color, emissive } = colorOptions[Math.floor(Math.random() * colorOptions.length)];
    const material = createMaterial({
      color,
      emissive,
      emissiveIntensity: 2,
      transparent: true,
      opacity: 0.9,
    });
    return <mesh key={i} geometry={sphereGeometry} material={material} visible={false} />;
  }), [sphereGeometry, colorOptions]);

  return <group ref={groupRef}>{segments}</group>;
}

// Enhanced output stream with better flow
function OutputStream() {
  const groupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.children.forEach((particle, idx) => {
        const timeOffset = state.clock.elapsedTime + idx * 0.4;
        const progress = (timeOffset * 1.2) % 5; // Slower flow
        particle.position.x = 2.5 + progress;
        particle.position.y = Math.sin(timeOffset * 1.8) * 0.08;
        particle.position.z = Math.cos(timeOffset * 2.2) * 0.08;

        const mesh = particle as THREE.Mesh;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.opacity = 1;
        mat.emissiveIntensity = 1.2;
        mesh.scale.setScalar(1 + Math.sin(timeOffset * 3) * 0.2);
      });
    }
  });

  const outputCurve = useMemo(() => new CatmullRomCurve3([
    new Vector3(2.5, 0, 0),
    new Vector3(4.5, 0.2, 0.1),
    new Vector3(6, -0.1, -0.05),
    new Vector3(8, 0, 0),
  ]), []); // Added slight curves for organic feel

  const streamMaterial = useMemo(() => createMaterial({
    color: '#1a1a2e',
    emissive: '#16213e',
    emissiveIntensity: 0.4,
    metalness: 0.3,
    roughness: 0.1,
    transparent: true,
    opacity: 0.9,
  }), []);

  const particleGeometry = useMemo(() => new THREE.SphereGeometry(0.1, 8, 8), []);
  const particleMaterial = useMemo(() => createMaterial({
    color: '#0f3460',
    emissive: '#0f3460',
    emissiveIntensity: 0.6,
    transparent: true,
  }), []);

  return (
    <group ref={groupRef}>
      {/* Stream tube */}
      <mesh geometry={new TubeGeometry(outputCurve, 64, 0.02, 8, false)} material={streamMaterial} />
      {/* Flowing particles */}
      <group ref={particlesRef}>
        {Array.from({ length: 12 }, (_, i) => ( // More particles for denser flow
          <mesh key={i} geometry={particleGeometry} material={particleMaterial} />
        ))}
      </group>
    </group>
  );
}

// Ambient energy field with shader for better glow
function EnergyField() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((particle, idx) => {
        const time = state.clock.elapsedTime + idx * 0.5;
        const radius = 4 + Math.sin(time * 0.6) * 2;
        const angle = time * 0.25 + idx * (Math.PI * 2 / 12);
        particle.position.x = Math.cos(angle) * radius;
        particle.position.y = Math.sin(angle * 1.2) * 1.5 + Math.sin(time * 0.4) * 0.5;
        particle.position.z = Math.cos(angle * 0.8) * 1 + Math.cos(time * 0.7) * 0.6;

        const opacity = 0.2 + Math.abs(Math.sin(time * 2.5)) * 0.15;
        const mesh = particle as THREE.Mesh;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.opacity = opacity;
        mat.emissiveIntensity = opacity * 3;
      });
    }
  });

  const particleGeometry = useMemo(() => new THREE.SphereGeometry(0.05, 8, 8), []);
  const fieldMaterial = useMemo(() => createMaterial({
    color: '#7c3aed',
    emissive: '#6d28d9',
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.15,
  }), []);

  return (
    <group ref={groupRef}>
      {Array.from({ length: 16 }, (_, i) => ( // More particles for immersive field
        <mesh key={i} geometry={particleGeometry} material={fieldMaterial} />
      ))}
    </group>
  );
}

// Main scene with optimized lighting and shadows
function Scene() {
  return (
    <>
      {/* Optimized lighting for depth and contrast */}
      <ambientLight intensity={0.35} color="#242424" />
      <directionalLight position={[12, 10, 8]} intensity={1.0} color="#646cff" castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-10, 3, -4]} intensity={1.0} color="#3b82f6" distance={20} />
      <pointLight position={[8, -3, 3]} intensity={0.8} color="#fbbf24" distance={15} />
      <spotLight position={[0, 10, 0]} intensity={0.7} color="#e879f9" angle={Math.PI / 5} penumbra={0.6} castShadow />

      {/* Components */}
      <ModernFunnel />
      <StaticWires />
      <OutputStream />
      <EnergyField />
    </>
  );
}

export default function FunnelVisualization() {
  return (
    <div className="w-full h-[500px] relative">
      <Canvas
        camera={{ position: [12, 4, 12], fov: 40 }} // Adjusted camera for better view
        className="w-full h-full"
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        shadows // Enable shadows for depth
      >
        <Scene />
      </Canvas>
    </div>
  );
}
