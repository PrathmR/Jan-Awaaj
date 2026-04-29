const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");

let aiClient = null;

function getAiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not set. AI summarization will be bypassed.");
      return null;
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

const SUMMARIZE_SYSTEM_INSTRUCTION = `You are an AI assistant for the Jan Awaaj complaint system.
Your task is to take a citizen's unstructured complaint and format it into a structured summary for the authority.
Please output EXACTLY in this format, and dynamically translate it to English if it is in another language:
**Summary**: [Brief 1-2 sentence summary of the issue]
**Key Details**:
- [Detail 1]
- [Detail 2]
**Location Mentions**: [Any specific locations or landmarks mentioned, or "None"]
**Urgency**: [Low/Medium/High based on the issue]`;

async function processTextQuery(text, targetLanguage = "en") {
  const client = getAiClient();
  if (!client) return text; // Fallback to original text

  try {
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Please summarize the following complaint. IMPORTANT: The output MUST be translated and written in this language code: ${targetLanguage}.\n\nComplaint:\n${text}`,
      config: {
        systemInstruction: SUMMARIZE_SYSTEM_INSTRUCTION,
        temperature: 0.2,
      },
    });
    return response.text;
  } catch (error) {
    console.error("AI Text processing error:", error);
    return text;
  }
}

async function processAudioQuery(filePath, mimeType, targetLanguage = "en") {
  const client = getAiClient();
  if (!client) return "Voice complaint (AI transcription unavailable due to missing API key)";

  try {
    const uploadResult = await client.files.upload({
      file: filePath,
      config: {
        mimeType: mimeType || "audio/m4a",
      }
    });

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          fileData: {
            fileUri: uploadResult.uri,
            mimeType: uploadResult.mimeType
          }
        },
        `This is an audio complaint from a citizen. Please transcribe it, understand the language dynamically, and summarize it into the requested format. IMPORTANT: The output MUST be translated and written in this language code: ${targetLanguage}.`
      ],
      config: {
        systemInstruction: SUMMARIZE_SYSTEM_INSTRUCTION,
        temperature: 0.2,
      },
    });
    
    // Optional: cleanup the file from Gemini storage
    try {
      await client.files.delete({ name: uploadResult.name });
    } catch (e) {
      console.warn("Failed to delete file from Gemini storage:", e);
    }

    return response.text;
  } catch (error) {
    console.error("AI Audio processing error:", error);
    return "Voice complaint (Error during AI transcription/summarization)";
  }
}

module.exports = {
  processTextQuery,
  processAudioQuery,
};
