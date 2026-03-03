import { useState, useRef, useEffect } from "react";

// ── Constants ──────────────────────────────────────────────────────────────
const GENRES = ["Action","Drama","Sci-Fi","Historical","Horror","Spiritual","Fantasy"];
const STYLES = ["Realistic","Anime","Dark","Epic","Documentary"];
const DURATIONS = [
  { label: "5 seconds", value: "5" },
  { label: "10 seconds", value: "10" },
  { label: "20 seconds", value: "20" },
];
const MAX_HISTORY = 5;
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

const LOADING_PHRASES = [
  "Casting cinematic shadows…",
  "Calibrating camera angles…",
  "Rendering dramatic lighting…",
  "Weaving narrative threads…",
  "Composing visual symphony…",
  "Sculpting atmospheric depth…",
  "Finalizing 4K frames…",
];

// ── Helpers ────────────────────────────────────────────────────────────────
function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem("sceneHistory") || "[]");
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem("sceneHistory", JSON.stringify(history));
}

// ── Sub-components ─────────────────────────────────────────────────────────

function FilmGrainOverlay() {
  return (
    <div
      className="film-grain"
      aria-hidden="true"
      style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
        opacity: 0.35,
        mixBlendMode: "overlay",
      }}
    />
  );
}

function LoadingScreen({ progress, phrase }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "3rem 1rem", gap: "1.5rem",
    }}>
      {/* Film reel spinner */}
      <div style={{ position: "relative", width: 80, height: 80 }}>
        <svg viewBox="0 0 80 80" width="80" height="80" style={{ animation: "spin 2s linear infinite" }}>
          <circle cx="40" cy="40" r="35" fill="none" stroke="#c8a96e" strokeWidth="3" strokeDasharray="8 6" />
          <circle cx="40" cy="40" r="20" fill="none" stroke="#c8a96e44" strokeWidth="2" />
          {[0,60,120,180,240,300].map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            const x = 40 + 28 * Math.cos(rad);
            const y = 40 + 28 * Math.sin(rad);
            return <circle key={i} cx={x} cy={y} r="4" fill="#c8a96e" />;
          })}
          <circle cx="40" cy="40" r="6" fill="#c8a96e" />
        </svg>
      </div>

      <div style={{ textAlign: "center" }}>
        <p style={{ color: "#c8a96e", fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", marginBottom: "0.5rem" }}>
          {phrase}
        </p>
        <p style={{ color: "#6b6b6b", fontSize: "0.8rem", letterSpacing: "0.15em", textTransform: "uppercase" }}>
          This may take 1-3 minutes
        </p>
      </div>

      {/* Progress bar */}
      <div style={{ width: "100%", maxWidth: 320, background: "#1a1a1a", borderRadius: 4, height: 6, overflow: "hidden", border: "1px solid #2a2a2a" }}>
        <div style={{
          height: "100%", borderRadius: 4,
          background: "linear-gradient(90deg, #c8a96e, #e8c98e)",
          width: `${progress}%`,
          transition: "width 0.8s ease",
          boxShadow: "0 0 8px #c8a96e88",
        }} />
      </div>
      <p style={{ color: "#555", fontSize: "0.75rem" }}>{Math.round(progress)}%</p>
    </div>
  );
}

function VideoPlayer({ videoUrl, onDownload }) {
  const videoRef = useRef(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{
        position: "relative", borderRadius: 8, overflow: "hidden",
        border: "1px solid #2a2a2a", background: "#000",
        boxShadow: "0 0 40px #c8a96e22",
      }}>
        {/* Letterbox bars */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 12, background: "#000", zIndex: 2 }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 12, background: "#000", zIndex: 2 }} />
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          style={{ width: "100%", display: "block", maxHeight: 400, objectFit: "contain" }}
          poster=""
        />
      </div>
      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <button
          onClick={onDownload}
          style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            padding: "0.6rem 1.25rem",
            background: "transparent", border: "1px solid #c8a96e",
            color: "#c8a96e", borderRadius: 6, cursor: "pointer",
            fontSize: "0.85rem", letterSpacing: "0.08em",
            fontFamily: "'Crimson Text', serif",
            transition: "all 0.2s",
          }}
          onMouseOver={e => { e.currentTarget.style.background = "#c8a96e22"; }}
          onMouseOut={e => { e.currentTarget.style.background = "transparent"; }}
        >
          ↓ Download Scene
        </button>
      </div>
    </div>
  );
}

function HistoryCard({ item, index, onReload }) {
  return (
    <div
      style={{
        display: "flex", gap: "1rem", alignItems: "flex-start",
        padding: "1rem", borderRadius: 8,
        background: "#111", border: "1px solid #222",
        transition: "border-color 0.2s",
      }}
      onMouseOver={e => e.currentTarget.style.borderColor = "#c8a96e44"}
      onMouseOut={e => e.currentTarget.style.borderColor = "#222"}
    >
      {/* Scene number */}
      <div style={{
        flexShrink: 0, width: 36, height: 36, borderRadius: "50%",
        background: "#1a1a1a", border: "1px solid #333",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#c8a96e", fontSize: "0.75rem", fontWeight: 700,
        fontFamily: "'Playfair Display', serif",
      }}>
        {index + 1}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.4rem" }}>
          {[item.genre, item.style, `${item.duration}s`].map(tag => (
            <span key={tag} style={{
              padding: "2px 8px", borderRadius: 3, fontSize: "0.7rem",
              background: "#1e1e1e", color: "#888", border: "1px solid #2a2a2a",
              letterSpacing: "0.05em",
            }}>{tag}</span>
          ))}
        </div>
        <p style={{ color: "#666", fontSize: "0.8rem", lineHeight: 1.4, margin: 0,
          overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}>
          {item.prompt}
        </p>
        <p style={{ color: "#444", fontSize: "0.7rem", marginTop: "0.4rem" }}>
          {new Date(item.generatedAt).toLocaleString()}
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", flexShrink: 0 }}>
        {item.videoUrl && (
          <a href={item.videoUrl} target="_blank" rel="noreferrer"
            style={{ color: "#c8a96e", fontSize: "0.75rem", textDecoration: "none" }}>
            ▶ View
          </a>
        )}
        <button onClick={() => onReload(item)}
          style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: "0.75rem", padding: 0 }}>
          ↺ Reuse
        </button>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [sceneText, setSceneText] = useState("");
  const [genre, setGenre] = useState("Drama");
  const [style, setStyle] = useState("Realistic");
  const [duration, setDuration] = useState("10");
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [videoUrl, setVideoUrl] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState(loadHistory);

  const words = wordCount(sceneText);
  const isValid = words >= 50;

  // Cycle loading phrases
  useEffect(() => {
    if (!isLoading) return;
    const iv = setInterval(() => {
      setPhraseIdx(i => (i + 1) % LOADING_PHRASES.length);
    }, 4000);
    return () => clearInterval(iv);
  }, [isLoading]);

  // Simulate visual progress (actual API polls in backend)
  useEffect(() => {
    if (!isLoading) { setProgress(0); return; }
    setProgress(5);
    const steps = [15, 30, 45, 58, 70, 80, 88, 93, 97];
    const delays = [2000, 6000, 12000, 20000, 30000, 45000, 60000, 90000, 120000];
    const timers = steps.map((p, i) => setTimeout(() => setProgress(p), delays[i]));
    return () => timers.forEach(clearTimeout);
  }, [isLoading]);

  async function handleGenerate() {
    if (!isValid) return;
    setError(null);
    setVideoUrl(null);
    setIsLoading(true);
    setPhraseIdx(0);

    try {
      const res = await fetch(`${BACKEND_URL}/generate-scene`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: sceneText, genre, style, duration }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed.");

      setProgress(100);
      await new Promise(r => setTimeout(r, 500));
      setVideoUrl(data.videoUrl);

      const newItem = {
        id: Date.now(),
        prompt: sceneText.slice(0, 120),
        genre, style, duration,
        videoUrl: data.videoUrl,
        generatedAt: data.metadata?.generatedAt || new Date().toISOString(),
      };
      const updated = [newItem, ...history].slice(0, MAX_HISTORY);
      setHistory(updated);
      saveHistory(updated);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleDownload() {
    if (!videoUrl) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `scene-${Date.now()}.mp4`;
    a.click();
  }

  function handleReload(item) {
    setSceneText(item.prompt);
    setGenre(item.genre);
    setStyle(item.style);
    setDuration(item.duration);
    setVideoUrl(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const selectStyle = {
    background: "#111", border: "1px solid #2a2a2a", color: "#ccc",
    borderRadius: 6, padding: "0.65rem 1rem", fontSize: "0.9rem",
    fontFamily: "'Crimson Text', serif", cursor: "pointer", width: "100%",
    appearance: "none", WebkitAppearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23888' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
  };

  return (
    <>
      {/* Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Courier+Prime:wght@400;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: #0a0a0a; color: #d4d4d4; font-family: 'Crimson Text', serif; min-height: 100vh; }

        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }

        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }

        .fade-up { animation: fadeUp 0.7s ease forwards; }
        .fade-up-2 { animation: fadeUp 0.7s 0.15s ease both; }
        .fade-up-3 { animation: fadeUp 0.7s 0.3s ease both; }

        textarea:focus { outline: none; border-color: #c8a96e !important; box-shadow: 0 0 0 2px #c8a96e22; }
        select:focus { outline: none; border-color: #c8a96e !important; }

        .vignette {
          position: fixed; inset: 0; pointer-events: none; z-index: 1;
          background: radial-gradient(ellipse at center, transparent 60%, #000000cc 100%);
        }
      `}</style>

      <FilmGrainOverlay />
      <div className="vignette" />

      {/* Scanline effect */}
      <div aria-hidden="true" style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
        overflow: "hidden", opacity: 0.03,
      }}>
        <div style={{
          position: "absolute", left: 0, right: 0, height: 2,
          background: "linear-gradient(transparent, #fff, transparent)",
          animation: "scanline 8s linear infinite",
        }} />
      </div>

      <div style={{ position: "relative", zIndex: 2, maxWidth: 860, margin: "0 auto", padding: "0 1.25rem 4rem" }}>

        {/* ── Hero ── */}
        <header style={{ textAlign: "center", padding: "4rem 0 3rem", position: "relative" }}>
          {/* Film strip decoration */}
          <div style={{
            position: "absolute", top: "2rem", left: "50%", transform: "translateX(-50%)",
            width: "100%", maxWidth: 600, height: 1,
            background: "linear-gradient(90deg, transparent, #c8a96e44, #c8a96e, #c8a96e44, transparent)",
          }} />

          <div className="fade-up" style={{ marginBottom: "1rem" }}>
            <span style={{
              display: "inline-block", padding: "0.3rem 1rem",
              border: "1px solid #c8a96e44", borderRadius: 3,
              fontSize: "0.7rem", letterSpacing: "0.25em", color: "#c8a96e",
              textTransform: "uppercase", fontFamily: "'Courier Prime', monospace",
              marginBottom: "1.5rem",
            }}>
              Powered by Odyssey.ml AI
            </span>
          </div>

          <h1 className="fade-up-2" style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(2rem, 6vw, 3.6rem)",
            fontWeight: 900, lineHeight: 1.1,
            color: "#f0e6cc",
            textShadow: "0 0 60px #c8a96e33",
            marginBottom: "1.25rem",
          }}>
            AI Movie Scene<br />
            <em style={{ color: "#c8a96e", fontStyle: "italic" }}>Visualizer</em>
          </h1>

          <p className="fade-up-3" style={{
            fontFamily: "'Playfair Display', serif",
            fontStyle: "italic",
            fontSize: "clamp(1rem, 2.5vw, 1.25rem)",
            color: "#888",
            letterSpacing: "0.02em",
            maxWidth: 480,
            margin: "0 auto",
          }}>
            "Turn Your Imagination Into Cinematic Reality."
          </p>

          <div style={{
            position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
            width: "100%", maxWidth: 600, height: 1,
            background: "linear-gradient(90deg, transparent, #2a2a2a, transparent)",
            marginTop: "2rem",
          }} />
        </header>

        {/* ── Main Card ── */}
        <main>
          <div style={{
            background: "linear-gradient(135deg, #111 0%, #0e0e0e 100%)",
            border: "1px solid #1e1e1e",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 8px 60px #00000088, inset 0 1px 0 #ffffff08",
          }}>
            {/* Card header */}
            <div style={{
              padding: "1.25rem 1.5rem",
              borderBottom: "1px solid #1a1a1a",
              display: "flex", alignItems: "center", gap: "0.75rem",
              background: "#0d0d0d",
            }}>
              {/* Film strip dots */}
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: 2,
                  background: i < 3 ? "#1e1e1e" : "transparent",
                  border: "1px solid #2a2a2a",
                }} />
              ))}
              <span style={{
                flex: 1, textAlign: "center",
                fontFamily: "'Courier Prime', monospace",
                fontSize: "0.7rem", color: "#444",
                letterSpacing: "0.2em", textTransform: "uppercase",
              }}>Scene Configuration</span>
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: 2,
                  background: i >= 3 ? "#1e1e1e" : "transparent",
                  border: "1px solid #2a2a2a",
                }} />
              ))}
            </div>

            <div style={{ padding: "1.75rem 1.5rem" }}>

              {/* Scene Text */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{
                  display: "flex", justifyContent: "space-between", alignItems: "baseline",
                  marginBottom: "0.5rem",
                }}>
                  <span style={{
                    color: "#c8a96e", fontSize: "0.75rem", letterSpacing: "0.15em",
                    textTransform: "uppercase", fontFamily: "'Courier Prime', monospace",
                  }}>Scene Description</span>
                  <span style={{
                    fontSize: "0.75rem",
                    color: words >= 50 ? "#6a9955" : words > 0 ? "#c8a96e" : "#555",
                    fontFamily: "'Courier Prime', monospace",
                  }}>
                    {words}/50 words {words >= 50 && "✓"}
                  </span>
                </label>
                <textarea
                  value={sceneText}
                  onChange={e => setSceneText(e.target.value)}
                  placeholder="INT. ABANDONED CHURCH - NIGHT&#10;&#10;Rain hammers the stained glass windows as Detective MARA stands over the body, her flashlight cutting through thick fog. A single candle flickers in the corner. She hears footsteps behind her and spins around — the door swings open, and a figure in a black coat steps in from the storm..."
                  rows={7}
                  style={{
                    width: "100%", background: "#0d0d0d",
                    border: "1px solid #2a2a2a", borderRadius: 8,
                    color: "#ccc", fontSize: "0.92rem",
                    fontFamily: "'Crimson Text', serif", lineHeight: 1.7,
                    padding: "0.85rem 1rem", resize: "vertical",
                    transition: "border-color 0.2s",
                  }}
                />
              </div>

              {/* Selectors grid */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "1rem", marginBottom: "1.5rem",
              }}>
                {[
                  { label: "Genre", value: genre, options: GENRES, onChange: setGenre },
                  { label: "Visual Style", value: style, options: STYLES, onChange: setStyle },
                  {
                    label: "Duration", value: duration,
                    options: DURATIONS.map(d => d.label),
                    values: DURATIONS.map(d => d.value),
                    onChange: setDuration,
                  },
                ].map(({ label, value, options, values, onChange }) => (
                  <div key={label}>
                    <label style={{
                      display: "block", marginBottom: "0.4rem",
                      
