import { GoogleGenAI } from "@google/genai";
try {
  const ai = new GoogleGenAI({ apiKey: "" });
  console.log("Success");
} catch(e) {
  console.log("Error:", e.message);
}
