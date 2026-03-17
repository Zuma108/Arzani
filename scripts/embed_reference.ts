#!/usr/bin/env npx tsx
/**
 * Reference Video Embedding Script
 * 
 * Pre-embeds a "gold standard" exercise video using Gemini Embedding 2.
 * The resulting 3072-dim vector is stored in data/references.json.
 * 
 * Usage:
 *   npx tsx scripts/embed_reference.ts --exercise deadlift --video ./proper_deadlift.mp4
 * 
 * Requirements:
 *   - GEMINI_API_KEY in .env.local or environment
 */

import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as path from "path";

// Load environment variables from .env.local
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split("=");
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
    }
  });
}

const EMBEDDING_MODEL = "gemini-embedding-2-preview";
const EMBEDDING_DIMENSIONS = 3072;
const REFERENCES_PATH = path.join(__dirname, "..", "data", "references.json");

// --- Parse CLI Args ---
function parseArgs(): { exercise: string; video: string } {
  const args = process.argv.slice(2);
  let exercise = "";
  let video = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--exercise" && args[i + 1]) {
      exercise = args[i + 1];
      i++;
    } else if (args[i] === "--video" && args[i + 1]) {
      video = args[i + 1];
      i++;
    }
  }

  if (!exercise || !video) {
    console.error("Usage: npx tsx scripts/embed_reference.ts --exercise <name> --video <path>");
    console.error("Example: npx tsx scripts/embed_reference.ts --exercise deadlift --video ./proper_deadlift.mp4");
    process.exit(1);
  }

  const resolvedVideo = path.resolve(video);
  if (!fs.existsSync(resolvedVideo)) {
    console.error(`❌ Video file not found: ${resolvedVideo}`);
    process.exit(1);
  }

  return { exercise, video: resolvedVideo };
}

async function main() {
  const { exercise, video } = parseArgs();

  console.log(`🎬 AuraFit Reference Embedding`);
  console.log(`   Exercise: ${exercise}`);
  console.log(`   Video:    ${video}`);
  console.log(`   Model:    ${EMBEDDING_MODEL}`);
  console.log(`   Dims:     ${EMBEDDING_DIMENSIONS}`);
  console.log();

  // Initialize Gemini
  const ai = new GoogleGenAI({});

  // Step 1: Upload video to Gemini File API
  console.log("📤 Uploading video to Gemini File API...");
  const geminiFile = await ai.files.upload({
    file: video,
    config: { displayName: `Reference_${exercise}_${Date.now()}` },
  });
  console.log(`   ✅ Uploaded: ${geminiFile.name}`);

  // Step 2: Generate embedding
  console.log("🧠 Generating embedding with Gemini Embedding 2...");
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: [geminiFile],
    config: { outputDimensionality: EMBEDDING_DIMENSIONS },
  });

  const embedding = response.embeddings?.[0]?.values;
  if (!embedding) {
    console.error("❌ Failed to generate embedding");
    await ai.files.delete({ name: geminiFile.name! });
    process.exit(1);
  }
  console.log(`   ✅ Embedding generated: ${embedding.length} dimensions`);

  // Step 3: Clean up uploaded file from Gemini storage
  console.log("🗑️  Cleaning up Gemini storage...");
  await ai.files.delete({ name: geminiFile.name! });
  console.log(`   ✅ Deleted from Gemini storage`);

  // Step 4: Save to references.json
  console.log("💾 Saving to references.json...");

  // Ensure data directory exists
  const dataDir = path.dirname(REFERENCES_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Load existing references or start fresh
  let references: Record<string, any> = {};
  if (fs.existsSync(REFERENCES_PATH)) {
    references = JSON.parse(fs.readFileSync(REFERENCES_PATH, "utf-8"));
  }

  // Store the embedding
  references[exercise] = {
    name: exercise.charAt(0).toUpperCase() + exercise.slice(1).replace(/_/g, " "),
    embedding: Array.from(embedding),
    source_video: path.basename(video),
    embedded_at: new Date().toISOString(),
    model: EMBEDDING_MODEL,
    dimensions: embedding.length,
  };

  fs.writeFileSync(REFERENCES_PATH, JSON.stringify(references, null, 2));
  console.log(`   ✅ Saved to ${REFERENCES_PATH}`);

  console.log();
  console.log(`🎉 Done! "${exercise}" reference embedding is ready.`);
  console.log(`   Similarity comparisons will now use this real embedding.`);
  console.log();
  console.log(`   To add more exercises, run:`);
  console.log(`   npx tsx scripts/embed_reference.ts --exercise squat --video ./squat.mp4`);
}

main().catch((err) => {
  console.error("💥 Fatal error:", err.message || err);
  process.exit(1);
});
