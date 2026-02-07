require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testConnection() {
    const key = process.env.GEMINI_API_KEY;
    const ocrModelName = process.env.GEMINI_OCR_MODEL;
    const scoringModelName = process.env.GEMINI_SCORING_MODEL;

    console.log(`Testing with Key: ${key ? "Freq" + key.substring(0, 4) + "..." : "MISSING"}`);

    const genAI = new GoogleGenerativeAI(key);

    async function testModel(name) {
        try {
            console.log(`Testing model: ${name}`);
            const model = genAI.getGenerativeModel({ model: name });
            const result = await model.generateContent("Hello, are you online?");
            await result.response;
            console.log(`✅ ${name} is working.`);
        } catch (error) {
            console.error(`❌ Error with ${name}:`, error.message);
        }
    }

    await testModel(ocrModelName);
    await testModel(scoringModelName);
}

testConnection();
