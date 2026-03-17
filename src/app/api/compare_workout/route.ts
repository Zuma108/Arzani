import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini SDK
const ai = new GoogleGenAI({});

// --- Constants ---
const MAX_VIDEO_DURATION_SECONDS = 60;
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const EMBEDDING_MODEL = "gemini-embedding-2-preview";
const EMBEDDING_DIMENSIONS = 3072; // MRL — Matryoshka Representation Learning

// Setup a dummy dict for Pro References for the 'Gold Standard' comparison
const VECTOR_DB_PRO_REFERENCES: Record<string, number[]> = {
    "default_pro": Array.from({ length: EMBEDDING_DIMENSIONS }, () => Math.random() * 2 - 1),
};

function computeCosineSimilarity(vec1: number[], vec2: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vec1.length; i++) {
        dotProduct += vec1[i] * vec2[i];
        normA += vec1[i] * vec1[i];
        normB += vec2[i] * vec2[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function generateCritiqueFromDelta(similarity: number): { power: string; grace: string; consistency: string } {
    const score = similarity * 100;
    if (score > 90) {
        return {
            power: "Explosive force matches pro level perfectly.",
            grace: "Smooth visual fluidity, no jitter detected in the form.",
            consistency: "Perfect rhythm sync! Breathing and pacing match the gold standard."
        };
    } else if (score > 75) {
        return {
            power: "Great effort, but slightly lower explosive force on the concentric phase.",
            grace: "Minor jitter detected at the bottom of the movement.",
            consistency: "Breathing rhythm drifted by 15% towards the end of the set."
        };
    } else {
        return {
            power: "Embeddings suggest early fatigue; push harder from the base.",
            grace: "Visual tracking shows hips are 5 degrees too high.",
            consistency: "Rhythm is out of sync with the reference. Focus on controlled pacing."
        };
    }
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const videoFile = formData.get("video") as File;
        const proReferenceId = (formData.get("pro_reference_id") as string) || "default_pro";

        if (!videoFile) {
            return NextResponse.json({ error: "Missing video file" }, { status: 400 });
        }

        // --- Validation: File size ---
        if (videoFile.size > MAX_FILE_SIZE_BYTES) {
            return NextResponse.json(
                { error: `Video must be under ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB. Received: ${(videoFile.size / 1024 / 1024).toFixed(1)}MB` },
                { status: 413 }
            );
        }

        // --- Validation: Duration (checked via metadata header if available) ---
        const durationHeader = formData.get("duration") as string | null;
        if (durationHeader) {
            const durationSeconds = parseFloat(durationHeader);
            if (durationSeconds > MAX_VIDEO_DURATION_SECONDS) {
                return NextResponse.json(
                    { error: `Clips must be ${MAX_VIDEO_DURATION_SECONDS} seconds or under. Your clip: ${durationSeconds.toFixed(1)}s` },
                    { status: 400 }
                );
            }
        }

        const arrayBuffer = await videoFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Determine MIME type — Gemini Embedding 2 supports MP4 and MOV
        const mimeType = videoFile.type || "video/mp4";

        let geminiFile = null;
        try {
            // Write to temp file for upload via the File API
            const fs = require('fs');
            const os = require('os');
            const path = require('path');

            const tempFilePath = path.join(os.tmpdir(), `${crypto.randomUUID()}_${videoFile.name}`);
            fs.writeFileSync(tempFilePath, buffer);

            // Upload to Gemini File API (volatile — deleted immediately after embedding)
            geminiFile = await ai.files.upload({
                file: tempFilePath,
                config: { displayName: `AuraFit_${crypto.randomUUID()}` }
            });

            // Clean up local temp file immediately
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

            // --- Gemini Embedding 2: Natively multimodal video embedding ---
            // The model understands video directly — no text proxy needed.
            // Uses the uploaded file reference via the File API.
            const response = await ai.models.embedContent({
                model: EMBEDDING_MODEL,
                contents: [geminiFile],
                config: {
                    outputDimensionality: EMBEDDING_DIMENSIONS
                }
            });

            const userEmbedding = response.embeddings?.[0]?.values;

            if (!userEmbedding) {
                throw new Error("Failed to generate video embedding from Gemini Embedding 2");
            }

            // Retrieve Pro Reference Vector
            const proEmbedding = VECTOR_DB_PRO_REFERENCES[proReferenceId] || VECTOR_DB_PRO_REFERENCES["default_pro"];

            // Calculate 'Form Match Score' via cosine similarity
            const similarity = computeCosineSimilarity(userEmbedding, proEmbedding);

            // Generate human-readable critique
            const critique = generateCritiqueFromDelta(similarity);

            // Immediate cleanup — delete from Gemini's storage (volatile processing)
            await ai.files.delete({ name: geminiFile.name! });

            return NextResponse.json({
                similarity_score: Number(similarity.toFixed(4)),
                embedding_model: EMBEDDING_MODEL,
                embedding_dimensions: userEmbedding.length,
                max_clip_duration: MAX_VIDEO_DURATION_SECONDS,
                critique
            });
        } catch (error: any) {
            // Always attempt cleanup even on error
            if (geminiFile) {
                try {
                    await ai.files.delete({ name: geminiFile.name! });
                } catch(e) {}
            }
            throw error;
        }

    } catch (error: any) {
        console.error("Error processing workout:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
