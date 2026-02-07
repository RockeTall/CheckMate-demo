const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// --- Imports ---
const TeacherMemory = require('./database');

const app = express();
// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
const upload = multer({ dest: uploadDir });

app.use(cors());
app.use(express.json());

// Initialize Clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- Configuration ---
// STABILITY FIX: Use gemini-2.0-flash instead of preview models
const GEMINI_OCR_MODEL = process.env.GEMINI_OCR_MODEL || "gemini-2.0-flash";
const GEMINI_SCORING_MODEL = process.env.GEMINI_SCORING_MODEL || "gemini-2.0-flash";

// --- Prompts Factory ---
const GENERATE_VISION_PROMPT = (mode, context = "") => {
    // Strategy A: Standard (On-Form)
    if (mode === 'standard') {
        return `
**Role:** You are an expert Hebrew OCR and Exam Analyzer.
**Task:** Analyze the provided exam image.
**Mode:** Standard Exam (Questions and Answers on the same page).

**Instructions:**
1. Locate printed text (Question) and handwritten text (Answer) strictly within the same document coordinates.
2. Extract the printed question text and the corresponding handwritten answer.
3. Ignore "Student Name", "Class", "Date".

**Output Format (Strict JSON):**
\`\`\`json
{
  "segments": [
    {
      "question_number": "Integer or String",
      "question_text": "The printed text...",
      "student_answer_text": "The transcribed handwriting...",
    }
  ]
}
\`\`\`
**Ignore Point Indicators:** Remove '10 pts', '(20)', etc.
`;
    }

    // Strategy B: Separate Sheet (Context Aware)
    if (mode === 'separate') {
        return `
**Role:** You are an expert Hebrew OCR and Exam Analyzer.
**Task:** Analyze the provided HANDWRITTEN STUDENT ANSWER SHEET.
**Mode:** Separate Sheet (Answer Book).
**Context:** The user may have provided the Question Paper text below. Use it to map answers.

**Question Paper Context:**
${context ? context : "No question paper provided. Try to infer question numbers from handwriting (e.g. '1.', 'Q1')."}

**Instructions:**
1. Focus on the HANDWRITTEN text. Identify question numbers.
2. If Question Paper Context is available, map the handwritten answer to the corresponding question text.
3. If not, explicitly state "Question text not available" in the \`question_text\` field.

**Output Format (Strict JSON):**
\`\`\`json
{
  "segments": [
    {
      "question_number": "Integer",
      "question_text": "Mapped text from context OR 'Unknown'",
      "student_answer_text": "Handwritten content...",
    }
  ]
}
\`\`\`
`;
    }

    // Strategy C: Harvester (Training Mode)
    if (mode === 'training') {
        return `
**Role:** You are an expert Data Harvester for AI Training.
**Task:** Extract Teacher Grading Datapoints.
**Mode:** HARVESTING ONLY. DO NOT GRADE.

**Instructions:**
1. Scan the document specifically for **RED or GREEN ink** (Teacher Marks).
2. Pair every Teacher Remark/Score with the corresponding Student Handwriting and Question Text.
3. Your goal is to create a training dataset of "What the student wrote" vs "What the teacher said/gave".

**Output Format (Strict JSON):**
\`\`\`json
{
  "segments": [
    {
      "question_number": "Integer",
      "question_text": "Printed text",
      "student_answer_text": "Handwritten text",
      "teacher_notes_detected": "The text written in Red/Green",
      "manual_score_detected": "The score/mark given"
    }
  ]
}
\`\`\`
`;
    }

    // Fallback (Default to Standard)
    return GENERATE_VISION_PROMPT('standard');
};


const SCORING_PROMPT_TEMPLATE = (studentAnswer, rubric) => `
You are an expert educator grading a Hebrew language exam.

**Input Data:**
- **Student Answer:** ${studentAnswer}
- **Teacher Rubric:** ${rubric}

**Instructions:**
1. **Check for 'Carry Forward Errors' (טעות נגררת):**
   - If the student made a calculation error in step A but used the result correctly in step B, deduct points ONLY for A.
   - What is the correct answer?
   - Provide an encouraging remark.
3. **Scoring (Quality Score):**
   - Return a **Quality Score** (0-100) based purely on the accuracy of the answer, **regardless of the question's point value**.
   - 100 = Perfect, 0 = Completely wrong.

**Output JSON:**
{
  "question_number": "ID",
  "quality_score": 0-100,
  "feedback_hebrew": "...",
  "carry_forward_error_detected": boolean,
  "reasoning_english": "Brief reasoning for the score"
}
`;

// --- Helper Functions ---

// Retry Helper
async function generateWithRetry(model, prompt, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            return await model.generateContent(prompt);
        } catch (error) {
            console.warn(`[Gemini API] Attempt ${i + 1} failed: ${error.message}`);
            if (i === retries - 1) throw error;
            // Exponential backoff: 1s, 2s, 4s...
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
        }
    }
}

// 1. OCR Step (Gemini Flash)
// 1. OCR Step (Gemini Flash) - Updated with Mode Strategy
async function extractExamContent(filePath, mode, additionalContext = "") {
    try {
        const model = genAI.getGenerativeModel({ model: GEMINI_OCR_MODEL });
        const imageBuffer = fs.readFileSync(filePath);
        const imagePart = {
            inlineData: {
                data: imageBuffer.toString('base64'),
                mimeType: 'image/jpeg',
            },
        };

        const prompt = GENERATE_VISION_PROMPT(mode, additionalContext);
        console.log(`--- Using Prompt Strategy: ${mode.toUpperCase()} ---`);

        // Use Retry Logic here
        const result = await generateWithRetry(model, [prompt, imagePart]);
        const response = await result.response;
        const text = response.text();
        console.log(`--- OCR Output (${path.basename(filePath)}) ---`);
        console.log(text);

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found in response");
        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error("OCR Error:", error);
        return { segments: [] };
    }
}

// 2. Rubric Extraction (Gemini Flash)
async function extractRubricContent(req) {
    if (req.body.rubricType === 'text' && req.body.rubricContent) return req.body.rubricContent;
    if (req.files['rubricFile']) {
        const filePath = req.files['rubricFile'][0].path;
        try {
            const model = genAI.getGenerativeModel({ model: GEMINI_OCR_MODEL });
            const imageBuffer = fs.readFileSync(filePath);
            const imagePart = { inlineData: { data: imageBuffer.toString('base64'), mimeType: 'image/jpeg' } };
            // Simple retry here too potentially, but less critical
            const result = await generateWithRetry(model, ["Extract rubric.", imagePart]);
            return result.response.text();
        } catch (e) { return "Error extracting rubric."; }
    }
    return "No rubric provided.";
}

// 3. Scoring Step (Gemini Only)
async function gradeQuestion(segment, rubric, smartGrading = false) {
    let historicalContext = "";
    if (smartGrading) {
        const similar = TeacherMemory.findSimilar(segment.question_number);
        if (similar && similar.length > 0) {
            historicalContext = `
            **Historical Teacher Remarks for Similar Questions:**
            ${similar.map(s => `- For answer "${s.student_answer_text}", teacher said: "${s.teacher_remark}" (Score: ${s.grade_awarded})`).join('\n')}
            **Instruction:** Use the above history to guide your grading style if applicable.
            `;
        }
    }

    const prompt = SCORING_PROMPT_TEMPLATE(segment.student_answer_text, rubric) + historicalContext;

    try {
        const model = genAI.getGenerativeModel({ model: GEMINI_SCORING_MODEL });
        // Use Retry Logic here
        const result = await generateWithRetry(model, prompt);
        const text = result.response.text();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error("Failed to parse grading JSON");
            return { question_number: segment.question_number, score: 0, feedback: "Error parsing AI response." };
        }
        const geminiResult = JSON.parse(jsonMatch[0]);

        return {
            question_number: segment.question_number,
            question_text: segment.question_text,
            student_answer: segment.student_answer_text,
            score: geminiResult.quality_score || geminiResult.score || 0,
            feedback: geminiResult.feedback_hebrew,
            improvement: null,
            gemini_reasoning: geminiResult.reasoning_english,
            chatgpt_reasoning: null,
            is_carry_forward: geminiResult.carry_forward_error_detected || false
        };
    } catch (e) {
        console.error("Gemini Scoring Error", e);
        return { question_number: segment.question_number, score: 0, feedback: "Error processing grading." };
    }
}


// --- Main Endpoint ---

// Health Check for debugging
app.get('/health', (req, res) => res.send('OK'));

app.post('/api/grade', upload.fields([{ name: 'examFiles', maxCount: 10 }, { name: 'rubricFile', maxCount: 1 }, { name: 'questionFile', maxCount: 1 }]), async (req, res) => {
    console.log("Received Grading Request (v2 - Parallel)");

    if (!req.files || !req.files['examFiles'] || req.files['examFiles'].length === 0) {
        return res.status(400).json({ error: "No exam files uploaded" });
    }

    const smartGrading = req.body.smartGrading === 'true';
    const mode = req.body.mode || 'standard'; // 'standard', 'separate', 'training'

    // Feature: Separate Sheet Mode Context
    let separateSheetContext = "";
    if (mode === 'separate' && req.files['questionFile']) {
        const qFile = req.files['questionFile'][0];
        try {
            // Quick OCR on the question sheet just to get text context
            const model = genAI.getGenerativeModel({ model: GEMINI_OCR_MODEL });
            const imageBuffer = fs.readFileSync(qFile.path);
            const imagePart = { inlineData: { data: imageBuffer.toString('base64'), mimeType: 'image/jpeg' } };
            const result = await model.generateContent(["Extract all printed text from this Question Paper.", imagePart]);
            separateSheetContext = result.response.text();
            console.log("--- Extracted Context from Question File ---");
            fs.unlinkSync(qFile.path); // Cleanup
        } catch (e) { console.error("Question File OCR Failed", e); }
    }

    try {
        // 1. Extract Rubric
        const rubricText = await extractRubricContent(req);

        // 2. Loop through uploaded files (PARALLEL PROCESSING)
        // 2. Loop through uploaded files (PARALLEL PROCESSING)
        const filePromises = req.files['examFiles'].map(async (file) => {
            console.log(`Processing file: ${file.originalname} [Mode: ${mode}]`);
            try {
                // Pass Mode & Context to OCR
                const visionData = await extractExamContent(file.path, mode, separateSheetContext);

                // Cleanup immediately
                try { fs.unlinkSync(file.path); } catch (e) { }

                const fileResults = [];

                // --- PIPELINE FORK ---
                // If Mode is 'training', we SKIP grading and just save to DB.
                if (mode === 'training') {
                    console.log("!!! TRAINING MODE: Skipping Grading Logic !!!");
                    for (const segment of visionData.segments) {
                        if (segment.student_answer_text && segment.teacher_notes_detected) {
                            // Parse score if available
                            let learnScore = 0;
                            const manualRaw = String(segment.manual_score_detected || "").trim().toUpperCase();
                            if (manualRaw === 'V' || manualRaw.includes('✓')) learnScore = 100;
                            else if (manualRaw === 'X' || manualRaw.includes('✗')) learnScore = 0;
                            else if (manualRaw.startsWith('-')) {
                                learnScore = Math.max(0, 100 - ((parseInt(manualRaw.replace('-', '')) || 0) * 5));
                            } else {
                                learnScore = parseInt(manualRaw) || 0;
                            }

                            TeacherMemory.saveRemark({
                                question_text: segment.question_text || "Unknown Question",
                                question_id: segment.question_number,
                                student_answer_text: segment.student_answer_text,
                                teacher_remark: segment.teacher_notes_detected,
                                grade_awarded: learnScore
                            });
                            console.log(`Saved Training Data for Q${segment.question_number}`);
                        }
                    }
                    return []; // Return empty results since we aren't grading
                }

                // --- STANDARD GRADING PIPELINE ---
                const isGradedMode = visionData.segments.some(s => s.manual_score_detected || s.teacher_notes_detected);

                for (const segment of visionData.segments) {
                    if (segment.student_answer_text) {

                        if (isGradedMode && segment.manual_score_detected) {
                            // Mode C: Learning Mode / Manual Digitization
                            console.log(`[Teacher Memory] Digitizing Manual Grade from ${segment.question_number}...`);

                            // Parse the Manual Grade Logic
                            let calcScore = 0;
                            const manualRaw = String(segment.manual_score_detected).trim().toUpperCase();

                            if (manualRaw === 'V' || manualRaw.includes('✓')) {
                                calcScore = 100;
                            } else if (manualRaw === 'X' || manualRaw.includes('✗')) {
                                calcScore = 0;
                            } else if (manualRaw.startsWith('-')) {
                                // Deduction logic: 100 - (Points * 5)
                                // Example: "-2" -> 2 * 5 = 10 -> 100 - 10 = 90
                                const pointsLost = parseInt(manualRaw.replace('-', '')) || 0;
                                calcScore = Math.max(0, 100 - (pointsLost * 5));
                            } else {
                                // Fallback: Try to parse as raw number (e.g. "90")
                                calcScore = parseInt(manualRaw) || 0;
                            }

                            TeacherMemory.saveRemark({
                                question_text: segment.question_text,
                                question_id: segment.question_number,
                                student_answer_text: segment.student_answer_text,
                                teacher_remark: segment.teacher_notes_detected || "Manual Grade",
                                grade_awarded: calcScore
                            });

                            // FIX: Also return this as a result so the user sees it!
                            fileResults.push({
                                question_number: segment.question_number,
                                question_text: segment.question_text,
                                student_answer: segment.student_answer_text,
                                score: calcScore, // USE CALCULATED SCORE
                                feedback: segment.teacher_notes_detected || `Detected Manual Grade: "${manualRaw}"`,
                                improvement: null,
                                gemini_reasoning: `Manual Grade Detected: "${manualRaw}" -> Converted to ${calcScore}%`,
                                chatgpt_reasoning: null,
                                is_carry_forward: false
                            });
                        } else {
                            // Mode A/B: Grading Mode
                            // We could parallelize grading too, but let's keep it sequential per file for now to avoid hammering Gemini Pro
                            const graded = await gradeQuestion(segment, rubricText, smartGrading);
                            fileResults.push(graded);

                            // Auto-learn
                            if (graded.score > 80) {
                                TeacherMemory.saveRemark({
                                    question_text: segment.question_text,
                                    question_id: segment.question_number,
                                    student_answer_text: segment.student_answer_text,
                                    teacher_remark: graded.feedback,
                                    grade_awarded: graded.quality_score // Use quality score for memory
                                });
                            }
                        }
                    }
                }
                return fileResults;

            } catch (err) {
                console.error(`Error processing file ${file.originalname}:`, err);
                return []; // Return empty on error
            }
        });

        // Wait for all files
        const resultsArray = await Promise.all(filePromises);
        const allGradedQuestions = resultsArray.flat();

        // Task 1: Sort by Question Number (Natural Sort)
        allGradedQuestions.sort((a, b) => {
            return String(a.question_number).localeCompare(String(b.question_number), undefined, { numeric: true, sensitivity: 'base' });
        });

        if (req.files['rubricFile']) fs.unlinkSync(req.files['rubricFile'][0].path);

        const totalQuestions = allGradedQuestions.length;

        // --- STAGE 5: AGGREGATION (SIMPLE AVERAGE) ---
        // Formula: Sum(Scores) / Count
        // Safety: Ensure every question has a valid numeric score
        allGradedQuestions.forEach(q => {
            if (typeof q.score !== 'number') q.score = 0;
            q.score_display = `${q.score}/100`;
        });

        const totalScoreSum = allGradedQuestions.reduce((acc, q) => acc + q.score, 0);
        const totalScoreFinal = totalQuestions > 0 ? (totalScoreSum / totalQuestions) : 0;

        const finalResult = {
            exam_id: req.body.student_info ? JSON.parse(req.body.student_info).id : "Unknown",
            total_score: totalScoreFinal,
            confidence: "high",
            questions: allGradedQuestions,
            expected_questions: req.body.student_info ? JSON.parse(req.body.student_info).expected_questions : null
        };

        res.json(finalResult);

    } catch (error) {
        console.error("Pipeline Error:", error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Backend Server running on port ${PORT}`);
});
