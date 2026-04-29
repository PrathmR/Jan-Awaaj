const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  const client = new GoogleGenAI({ apiKey });
  
  // create dummy file
  fs.writeFileSync("dummy.txt", "hello world");
  
  const uploadResult = await client.files.upload({
    file: "dummy.txt",
    config: { mimeType: "text/plain" }
  });
  console.log("uploadResult keys:", Object.keys(uploadResult));
  console.log("uploadResult:", uploadResult);
  
  fs.unlinkSync("dummy.txt");
}

run().catch(console.error);
