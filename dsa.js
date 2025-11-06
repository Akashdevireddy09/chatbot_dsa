import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import readlineSync from "readline-sync";
const history = [];

dotenv.config();

const ai = new GoogleGenAI({apiKey: process.env.GENAI_API_KEY});

async function main() {
  console.log('Type your question (type "exit" to quit).');
  while (true) {
    const userInput = readlineSync.question("You: ");
    if (!userInput || userInput.trim().toLowerCase() === "exit") {
      console.log("Bye,Always here to help you with DSA questions!");
      break;
    }

    history.push({ role: "user", content: [{ text: userInput }] });
    trimHistory(6);

    // build a plain-text prompt from history to avoid [object Object]
    const prompt = history.map(h => `${h.role.toUpperCase()}: ${h.content[0].text}`).join("\n\n");
    try{
       const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      systemInstruction: `You are a DSA Instructor. Your only replies to the DSA related Data Structures and Algorithms questions.YOU have to solve query in simple way and along with the java code snippets and time and space complexity of each code provided.If asked about non DSA related questions, reply that you are specialized only in DSA topics.
      Example: if user ask,How are you, you will reply:You are here only to get DSA related asnwers.`,
    },
  });
  const text=response?.text??JSON.stringify(response);
    history.push({ role: "model", content: [{ text }] });
    console.log("\nAssistant:", text, "\n");
  }catch(err){
    console.error("Error occurred while generating response:", err?.message??err);
   }
 }
 function trimHistory(maxTurns = 6) {
  const maxItems = maxTurns * 2;
  if (history.length > maxItems) history.splice(0, history.length - maxItems);
 }
}
await main();