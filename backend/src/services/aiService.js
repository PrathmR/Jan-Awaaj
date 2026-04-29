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

IMPORTANT: You MUST return a valid JSON object with EXACTLY two keys: "summary" and "category".

1. "summary" field:
You must generate a summary text using EXACTLY the following structure, but TRANSLATE the headings themselves ("Summary", "Key Details", "Location Mentions", "Urgency") into the requested target language. Ensure the headings are surrounded by double asterisks (**).
The summary text should look like this (but with headings in the target language):
**[Translated 'Summary']**: [Brief 1-2 sentence summary of the issue]
**[Translated 'Key Details']**:
- [Detail 1]
- [Detail 2]
**[Translated 'Location Mentions']**: [Any specific locations or landmarks mentioned, or translated 'None']
**[Translated 'Urgency']**: [Translated 'Low', 'Medium', or 'High'. If no urgency is mentioned, default to 'Medium']

2. "category" field:
You must select EXACTLY ONE of the following English categories that best fits the complaint:
"Public Works", "Water Supply", "Electricity", "Roads & Transport", "Health Services", "Education", "Sanitation", "Other".`;

async function processTextQuery(text, targetLanguage = "en") {
  const client = getAiClient();
  if (!client) return { summary: text, category: "Other" }; // Fallback

  try {
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Please summarize the following complaint. IMPORTANT: The output MUST be translated and written in this language code: ${targetLanguage}.\n\nComplaint:\n${text}`,
      config: {
        systemInstruction: SUMMARIZE_SYSTEM_INSTRUCTION,
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Text processing error:", error);
    return { summary: text, category: "Other" };
  }
}

async function processAudioQuery(filePath, mimeType, targetLanguage = "en") {
  const client = getAiClient();
  if (!client) return { summary: "Voice complaint (AI transcription unavailable due to missing API key)", category: "Other" };

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
        responseMimeType: "application/json",
      },
    });
    
    // Optional: cleanup the file from Gemini storage
    try {
      await client.files.delete({ name: uploadResult.name });
    } catch (e) {
      console.warn("Failed to delete file from Gemini storage:", e);
    }

    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Audio processing error:", error);
    return { summary: "Voice complaint (Error during AI transcription/summarization)", category: "Other" };
  }
}

module.exports = {
  processTextQuery,
  processAudioQuery,
};
