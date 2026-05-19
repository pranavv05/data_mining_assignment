import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";

const gradeColors = {
  A: "#00ff88",
  B: "#00d4ff",
  C: "#f97316",
  D: "#ff3366",
};


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
      <div
        className="absolute bottom-1 left-1 right-1 rounded-full bg-gradient-to-t from-[#00d4ff] to-[#00ff88]"
        style={{ height: `calc(${fill * 100}% - 0.5rem)` }}
      />
    </div>
  );
}

function GLBModel({ modelPath }) {
  const { scene } = useGLTF(modelPath);
  return <primitive object={scene} scale={1.5} position={[0, -1.2, 0]} />;
}

export default function CharacterModel({ level = 1, grade = "D", score = 0 }) {
  const displayLevel = Math.max(1, Math.min(10, Math.round(Number(level) || 1)));
  const gradeColor = gradeColors[grade] ?? "#6b7280";
  const coverage = Math.max(0, Math.min(100, Number(score ?? 0) * 100));

  return (
    <Card className="sg-card sticky top-20 min-h-[640px] overflow-hidden">
      <CardContent className="relative flex min-h-[640px] flex-col items-center justify-center p-6">

        {/* CSS keyframes for hex animations */}
        <style>{`
          @keyframes hexSpin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
          @keyframes hexSpinReverse {
            from { transform: rotate(0deg); }
            to   { transform: rotate(-360deg); }
          }
        `}</style>

        {/* Dot-grid overlay */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.08)_1px,transparent_1px)] bg-[size:42px_42px]" />

        {/* Main centered column */}
        <div className="relative flex flex-col items-center gap-7">

          {/* Level number */}
          <div
            className="font-mono text-5xl font-bold leading-none"
            style={{
              color: "var(--green)",
              fontFamily: "Space Mono, JetBrains Mono, monospace",
              textShadow: "0 0 30px #00ff88, 0 0 60px rgba(0,255,136,0.3)",
            }}
          >
            {String(displayLevel).padStart(2, "0")}
          </div>

          {/* Double concentric animated hexagons */}
          <svg
            width="120"
            height="120"
            viewBox="0 0 120 120"
            aria-hidden="true"
          >
            {/* Outer hex — clockwise 12s */}
            <polygon
              points="114,60 87,13 33,13 6,60 33,107 87,107"
              fill="none"
              stroke="#00d4ff"
              strokeWidth="1.5"
              style={{
                filter: "drop-shadow(0 0 8px #00d4ff66)",
                animation: "hexSpin 12s linear infinite",
                transformBox: "fill-box",
                transformOrigin: "center",
              }}
            />
            {/* Inner hex — counter-clockwise 16s */}
            <polygon
              points="91,60 75,33 45,33 29,60 45,87 75,87"
              fill="none"
              stroke="#00d4ff"
              strokeWidth="1.5"
              style={{
                filter: "drop-shadow(0 0 8px #00d4ff66)",
                animation: "hexSpinReverse 16s linear infinite",
                transformBox: "fill-box",
                transformOrigin: "center",
              }}
            />
          </svg>

          {/* 3D character model */}
          <div className="h-64 w-full">
            <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
              <ambientLight intensity={0.5} />
              <directionalLight position={[2, 3, 2]} intensity={1} />
              <GLBModel modelPath="/model.glb" />
              <OrbitControls enableZoom={false} enablePan={false} />
            </Canvas>
          </div>

          {/* Grade badge */}
          <Badge
            className="border bg-transparent px-4 py-1.5 font-mono text-xs uppercase tracking-[0.2em]"
            style={{
              borderColor: `${gradeColor}99`,
              color: gradeColor,
              boxShadow: `0 0 16px ${gradeColor}33`,
            }}
          >
            Grade {grade}
          </Badge>

          {/* Vertical score bar */}
          <ScoreBar score={score} />

        </div>

        {/* Skill coverage bar pinned to bottom */}
        <div className="absolute bottom-6 left-6 right-6">
          <div className="mb-2 flex items-center justify-between font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            <span>SKILL COVERAGE</span>
            <span className="text-[#00d4ff]">{Math.round(coverage)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full border border-[#1a1a2e] bg-[#050508]/80">
            <div
              className="h-full bg-gradient-to-r from-[#00d4ff] to-[#00ff88]"
              style={{ width: `${coverage}%` }}
            />
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
