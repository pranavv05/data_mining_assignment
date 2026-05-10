import { Component, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const gradeColors = {
  A: "#00ff88",
  B: "#00d4ff",
  C: "#f97316",
  D: "#ff3366",
};

class ModelBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return <FallbackModel />;
    return this.props.children;
  }
}

function FallbackModel() {
  return (
    <Html center>
      <div className="grid h-72 w-72 place-items-center rounded-2xl border border-[var(--border)] bg-[rgba(15,15,23,0.92)] backdrop-blur-xl">
        <div className="text-center">
          <svg width="96" height="96" viewBox="0 0 100 100" className="mx-auto drop-shadow-[0_0_28px_rgba(0,212,255,0.75)]">
            <polygon points="50 5 88 27 88 73 50 95 12 73 12 27" fill="rgba(0,212,255,0.08)" stroke="var(--cyan)" strokeWidth="2" />
            <polygon points="50 24 72 37 72 63 50 76 28 63 28 37" fill="none" stroke="var(--green)" strokeWidth="1.5" />
          </svg>
          <div className="mt-5 font-mono text-xs uppercase tracking-[0.24em] text-[var(--cyan)]">AWAITING_AGENT.glb</div>
        </div>
      </div>
    </Html>
  );
}

function LoadedModel() {
  const { scene } = useGLTF("/model.glb");
  return <primitive object={scene} scale={1.25} position={[0, -0.85, 0]} />;
}

function ModelSlot() {
  const [assetState, setAssetState] = useState("checking");

  useEffect(() => {
    let active = true;

    fetch("/model.glb", { method: "HEAD" })
      .then((response) => {
        const contentType = response.headers.get("content-type") || "";
        const isHtmlFallback = contentType.includes("text/html");
        if (active) setAssetState(response.ok && !isHtmlFallback ? "ready" : "missing");
      })
      .catch((error) => {
        console.error("Failed to check /model.glb", error);
        if (active) setAssetState("missing");
      });

    return () => {
      active = false;
    };
  }, []);

  if (assetState !== "ready") return <FallbackModel />;

  return (
    <ModelBoundary>
      <Suspense fallback={<FallbackModel />}>
        <LoadedModel />
      </Suspense>
    </ModelBoundary>
  );
}

function OrbitingLight() {
  const lightRef = useRef(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 0.9;
    if (lightRef.current) {
      lightRef.current.position.x = Math.cos(t) * 1.5;
      lightRef.current.position.z = Math.sin(t) * 1.5;
      lightRef.current.position.y = 0.65;
    }
  });

  return <pointLight ref={lightRef} color="#00ff88" intensity={2} distance={5} />;
}

function AscensionRing() {
  const ringRef = useRef(null);

  useFrame((_, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.28;
      ringRef.current.rotation.y += delta * 0.12;
    }
  });

  return (
    <mesh ref={ringRef} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[1.08, 0.018, 8, 120]} />
      <meshBasicMaterial color="#00d4ff" wireframe transparent opacity={0.85} />
    </mesh>
  );
}

function ParticleCloud() {
  const pointsRef = useRef(null);
  const positions = useMemo(() => {
    const values = new Float32Array(200 * 3);

    for (let i = 0; i < 200; i += 1) {
      const radius = 1.2 + Math.random() * 1.25;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      values[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      values[i * 3 + 1] = radius * Math.cos(phi);
      values[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }

    return values;
  }, []);

  useFrame((_, delta) => {
    if (pointsRef.current) pointsRef.current.rotation.y += delta * 0.05;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#00d4ff" size={0.025} transparent opacity={0.72} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}

function CharacterScene({ level }) {
  const tier = level >= 7 ? 3 : level >= 4 ? 2 : 1;

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[0, 4, 2]} intensity={1.5} color="#ffffff" />
      <pointLight color="#00d4ff" intensity={tier === 1 ? 1.8 : 0.85} position={[-1.2, 1.1, 1.4]} distance={5} />
      {tier >= 2 && <OrbitingLight />}
      <ModelSlot />
      {tier >= 3 && (
        <>
          <AscensionRing />
          <ParticleCloud />
        </>
      )}
      <OrbitControls autoRotate autoRotateSpeed={0.5} enablePan={false} minDistance={2.3} maxDistance={4.5} />
    </>
  );
}

function ScoreBar({ score }) {
  const fill = Math.max(0, Math.min(1, Number(score ?? 0)));

  return (
    <div className="relative h-52 w-10 rounded-full border border-[#1a1a2e] bg-[#050508]/75 p-1 shadow-[0_0_18px_rgba(0,212,255,0.08)]">
      {[0.25, 0.5, 0.75, 1].map((tick) => (
        <div
          key={tick}
          className="absolute left-0 right-0 border-t border-white/25"
          style={{ bottom: `${tick * 100}%` }}
        />
      ))}
      <div className="absolute bottom-1 left-1 right-1 rounded-full bg-gradient-to-t from-[#00d4ff] to-[#00ff88]" style={{ height: `calc(${fill * 100}% - 0.5rem)` }} />
    </div>
  );
}

export default function CharacterModel({ level = 1, grade = "D", score = 0 }) {
  const displayLevel = Math.max(1, Math.min(10, Math.round(Number(level) || 1)));
  const gradeColor = gradeColors[grade] ?? "#6b7280";
  const coverage = Math.max(0, Math.min(100, Number(score ?? 0) * 100));

  return (
    <Card className="sg-card sticky top-20 min-h-[640px] overflow-hidden">
      <CardContent className="relative min-h-[640px] p-0">
        <Canvas
          className="absolute inset-0"
          camera={{ position: [0, 0.75, 3.2], fov: 42 }}
          gl={{ alpha: true, antialias: true }}
          onCreated={({ scene }) => {
            scene.background = null;
          }}
        >
          <CharacterScene level={displayLevel} />
        </Canvas>

        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.08)_1px,transparent_1px)] bg-[size:42px_42px]" />

        <div className="pointer-events-none absolute left-6 top-6">
          <div className="font-mono text-[64px] font-bold leading-none text-[var(--green)] [text-shadow:0_0_30px_var(--green),0_0_60px_rgba(0,255,136,0.3)]">
            LEVEL [{String(displayLevel).padStart(2, "0")}]
          </div>
          <Badge
            className="mt-3 border bg-transparent px-3 py-1 font-mono text-xs uppercase tracking-[0.2em]"
            style={{ borderColor: `${gradeColor}99`, color: gradeColor, boxShadow: `0 0 16px ${gradeColor}33` }}
          >
            Grade {grade}
          </Badge>
        </div>

        <div className="pointer-events-none absolute right-6 top-6 flex flex-col items-center gap-3">
          <ScoreBar score={score} />
          <div className="grid gap-1 font-mono text-[10px] text-[var(--text-muted)]">
            <span>1.00</span>
            <span>0.75</span>
            <span>0.50</span>
            <span>0.25</span>
          </div>
        </div>

        <div className="absolute bottom-6 left-6 right-6">
          <div className="mb-2 flex items-center justify-between font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            <span>SKILL COVERAGE</span>
            <span className="text-[#00d4ff]">{Math.round(coverage)}%</span>
          </div>
          <div className="scanline-progress h-2 overflow-hidden rounded-full border border-[#1a1a2e] bg-[#050508]/80">
            <div className="h-full bg-gradient-to-r from-[#00d4ff] to-[#00ff88]" style={{ width: `${coverage}%` }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
