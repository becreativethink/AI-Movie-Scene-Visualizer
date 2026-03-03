require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express.json());

// Rate limiting: 10 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many requests. Please wait before generating again." },
});
app.use("/generate-scene", limiter);

// Input validation
function validateInput({ prompt, genre, style, duration }) {
  const wordCount = prompt?.trim().split(/\s+/).length || 0;
  if (!prompt || wordCount < 50)
    return `Scene description must be at least 50 words (currently ${wordCount}).`;
  const validGenres = ["Action","Drama","Sci-Fi","Historical","Horror","Spiritual","Fantasy"];
  if (!validGenres.includes(genre)) return "Invalid genre selected.";
  const validStyles = ["Realistic","Anime","Dark","Epic","Documentary"];
  if (!validStyles.includes(style)) return "Invalid style selected.";
  const validDurations = ["5","10","20"];
  if (!validDurations.includes(String(duration))) return "Invalid duration selected.";
  return null;
}

// Build cinematic prompt
function buildCinematicPrompt({ prompt, genre, style, duration }) {
  return `Create a high-quality cinematic movie scene in ${genre} genre. Visual style: ${style}. Scene description: ${prompt}. Professional camera angles, dramatic lighting, realistic motion, ultra-detailed, 4K cinematic atmosphere. Duration: ${duration} seconds.`;
}

app.post("/generate-scene", async (req, res) => {
  const { prompt, genre, style, duration } = req.body;

  const validationError = validateInput({ prompt, genre, style, duration });
  if (validationError) return res.status(400).json({ error: validationError });

  const cinematicPrompt = buildCinematicPrompt({ prompt, genre, style, duration });

  try {
    const ODYSSEY_API_KEY = process.env.ODYSSEY_API_KEY;
    if (!ODYSSEY_API_KEY) throw new Error("API key not configured.");

    // Step 1: Submit generation job to Odyssey.ml
    const submitRes = await fetch("https://api.odyssey.systems/v1/video/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ODYSSEY_API_KEY}`,
      },
      body: JSON.stringify({
        prompt: cinematicPrompt,
        duration: parseInt(duration),
        quality: "high",
        aspect_ratio: "16:9",
      }),
    });

    if (!submitRes.ok) {
      const errBody = await submitRes.text();
      console.error("Odyssey submit error:", errBody);
      throw new Error(`Odyssey API error: ${submitRes.status}`);
    }

    const submitData = await submitRes.json();
    const jobId = submitData.id || submitData.job_id;

    if (!jobId) throw new Error("No job ID returned from Odyssey.");

    // Step 2: Poll for completion (max 3 minutes)
    const maxAttempts = 36;
    const pollInterval = 5000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((r) => setTimeout(r, pollInterval));

      const statusRes = await fetch(
        `https://api.odyssey.systems/v1/video/generate/${jobId}`,
        {
          headers: { Authorization: `Bearer ${ODYSSEY_API_KEY}` },
        }
      );

      if (!statusRes.ok) continue;

      const statusData = await statusRes.json();
      const status = statusData.status?.toLowerCase();

      if (status === "completed" || status === "success" || status === "done") {
        const videoUrl =
          statusData.video_url ||
          statusData.output_url ||
          statusData.result?.url ||
          statusData.url;

        if (!videoUrl) throw new Error("Video URL not found in response.");

        return res.json({
          success: true,
          videoUrl,
          jobId,
          prompt: cinematicPrompt,
          metadata: { genre, style, duration, generatedAt: new Date().toISOString() },
        });
      }

      if (status === "failed" || status === "error") {
        throw new Error(statusData.error || "Video generation failed on server.");
      }

      // Still processing — continue polling
    }

    throw new Error("Generation timed out. Please try again.");
  } catch (err) {
    console.error("Generation error:", err.message);
    res.status(500).json({ error: err.message || "Failed to generate scene. Please try again." });
  }
});

app.get("/health", (_, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

app.listen(PORT, () => console.log(`🎬 AI Movie Visualizer backend running on port ${PORT}`));

