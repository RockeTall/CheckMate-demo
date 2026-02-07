
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = (import.meta as any).env.VITE_GEMINI_API_KEY;

// Models
const MODEL_OCR = "gemini-3-flash-preview";
const MODEL_GRADING = "gemini-3-pro-preview";

export interface GradingSegment {
    question_number: string | number;
    question_text: string;
    student_answer_text: string;
    teacher_notes_detected?: string;
    manual_score_detected?: string;
}

export interface GradedQuestion {
    question_number: string | number;
    question_text: string;
    student_answer: string;
    ai_grade: number;
    ai_remarks: string;
    points_possible: number;
    confidence: number;
}

// --- Prompts ---

const GET_VISION_PROMPT = (examType: string) => `
**Role:** You are an expert Hebrew OCR and Exam Analyzer.
**Task:** Analyze the provided exam image(s).
**Context:** The teacher has specified this is a **${examType === 'separate_sheet' ? 'SEPARATE SHEET (Answer Sheet only)' : 'INTEGRATED (Questions and Answers on same page)'}** exam.

**Instructions based on Exam Type:**
${examType === 'separate_sheet'
        ? `- **Separate Sheet Mode:** The images contain ONLY the student's handwritten answers. Look for question numbers (e.g., "1.", "שאלה 1") followed by the answer text. Do not expect to see the printed question text.`
        : `- **Integrated Mode:** The images contain the full exam. Locate printed question text and the corresponding handwritten answer immediately following it.`
    }

**Handwriting Nuances:**
- The text is in Hebrew. Pay extreme attention to handwritten characters that look similar (e.g., 'ו'/'ן', 'ש'/'ס').
- Maintain Right-to-Left logic.

**Output Format (Strict JSON):**
\`\`\`json
{
  "exam_type_detected": "${examType}",
  "segments": [
    {
      "question_number": "Integer or String",
      "question_text": "The printed text of the question (if visible) or 'See Exam Form'",
      "student_answer_text": "The transcribed handwritten answer...",
      "teacher_notes_detected": "Any text identified as teacher marking...",
      "manual_score_detected": "If a number is written next to a V/X..."
    }
  ]
}
\`\`\`
`;

const SCORING_PROMPT_TEMPLATE = (studentAnswer: string, rubric: string, questionText: string) => `
You are an expert educator grading a Hebrew language exam.

**Input Data:**
- **Question:** ${questionText}
- **Student Answer:** ${studentAnswer}
- **Teacher Rubric:** ${rubric}

**Instructions:**
1. **Analyze:** Compare the student's answer to the rubric/correct answer.
2. **Feedback (Hebrew):** Provide constructive feedback in Hebrew. Explain what was correct and what was wrong.
3. **Score:** Assign a score from 0 to 100 based on the rubric.

**Output JSON:**
{
  "question_number": "ID",
  "score": 0-100,
  "feedback_hebrew": "...",
  "reasoning_english": "Brief reasoning"
}
`;

export const GeminiScanner = {
    async gradeExam(submission: any, exam: any, onProgress?: (status: string) => void) {
        if (!API_KEY) throw new Error("Missing VITE_GEMINI_API_KEY in .env");

        const genAI = new GoogleGenerativeAI(API_KEY);
        const visionModel = genAI.getGenerativeModel({ model: MODEL_OCR });
        const gradingModel = genAI.getGenerativeModel({ model: MODEL_GRADING });

        // 1. Prepare Images
        onProgress?.("טוען תמונות...");
        const imageParts: any[] = [];

        if (!submission.images_urls || submission.images_urls.length === 0) {
            throw new Error("No images found in submission");
        }

        for (const url of submission.images_urls) {
            // Fetch image client-side. 
            // NOTE: This requires CORS to be allowed on the storage bucket.
            // Supabase Storage usually allows GETs if public.
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Failed to fetch image: ${url}`);
                const blob = await response.blob();

                // Convert to Base64
                const base64Data = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                    reader.readAsDataURL(blob);
                });

                imageParts.push({
                    inlineData: {
                        data: base64Data,
                        mimeType: blob.type || 'image/jpeg'
                    }
                });
            } catch (e) {
                console.error("Image load error", e);
                // Continue if at least one image works? Or fail hard?
                // Let's fail hard to avoid partial grading confusion
                throw new Error(`Failed to load exam image. Please check your internet connection.`);
            }
        }

        // 2. OCR Stage
        onProgress?.("מפענח כתב יד (OCR)...");
        const examType = exam.exam_type || 'integrated';
        const visionPrompt = GET_VISION_PROMPT(examType);

        const ocrResult = await visionModel.generateContent([visionPrompt, ...imageParts]);
        const ocrText = ocrResult.response.text();

        const jsonString = ocrText.replace(/```json/g, '').replace(/```/g, '').trim();
        let visionData;
        try {
            visionData = JSON.parse(jsonString);
        } catch (e) {
            console.error("OCR Parse Error", ocrText);
            throw new Error("Failed to parse AI response. Please try again.");
        }

        // 3. Grading Stage
        onProgress?.("בודק תשובות...");
        const examQuestions = typeof exam.questions === 'string'
            ? JSON.parse(exam.questions || '[]')
            : (exam.questions || []);

        const gradedQuestions: GradedQuestion[] = [];
        const segments: GradingSegment[] = visionData.segments || [];

        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            if (segment.student_answer_text) {
                const safeParseQuestionNumber = (input: string | number): number => {
                    const str = String(input).trim();
                    // 1. Try simple int parse
                    const num = parseInt(str.replace(/\D/g, ''), 10);
                    if (!isNaN(num)) return num;

                    // 2. Try Hebrew letters mapping (basic)
                    const hebrewMap: Record<string, number> = {
                        'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5,
                        'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9, 'י': 10
                    };
                    // Check if it matches a single Hebrew letter
                    if (hebrewMap[str]) return hebrewMap[str];

                    return -1; // Fallback for DB safety
                };

                const qNum = safeParseQuestionNumber(segment.question_number);
                onProgress?.(`בודק שאלה ${qNum} (${segment.question_number})...`);

                // Find Definition
                const questionDef = examQuestions.find((q: any) =>
                    String(q.id) === String(qNum) || String(q.number) === String(qNum)
                );

                const questionText = questionDef ? questionDef.text : segment.question_text;
                const specificRubric = questionDef ? (questionDef.answer || questionDef.rubric) : (exam.rubric || "General rubric");

                const prompt = SCORING_PROMPT_TEMPLATE(segment.student_answer_text, specificRubric, questionText);

                try {
                    const result = await gradingModel.generateContent(prompt);
                    const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
                    const geminiResult = JSON.parse(text);

                    gradedQuestions.push({
                        question_number: qNum,
                        question_text: questionText,
                        student_answer: segment.student_answer_text,
                        ai_grade: geminiResult.score,
                        ai_remarks: geminiResult.feedback_hebrew,
                        points_possible: questionDef ? questionDef.points : 100,
                        confidence: 0.90
                    });

                } catch (e) {
                    console.error(`Grading error for Q${qNum}`, e);
                    // Push a partial error result so we don't lose the OCR
                    gradedQuestions.push({
                        question_number: qNum,
                        question_text: questionText,
                        student_answer: segment.student_answer_text,
                        ai_grade: 0,
                        ai_remarks: "שגיאה בבדיקת שאלה זו. אנא בדוק ידנית.",
                        points_possible: 100,
                        confidence: 0
                    });
                }
            }
        }

        onProgress?.("מסכם תוצאות...");

        return {
            transcribed_text: visionData,
            gradedQuestions: gradedQuestions
        };
    },

    async generateClassInsights(exam: any, submissions: any[], onProgress?: (status: string) => void) {
        if (!API_KEY) throw new Error("Missing VITE_GEMINI_API_KEY");

        try {
            if (onProgress) onProgress('מנתח את נתוני הכיתה...');

            const genAI = new GoogleGenerativeAI(API_KEY);
            const model = genAI.getGenerativeModel({ model: MODEL_GRADING });

            // Prepare anonymized data for context
            const submissionsData = submissions.map(sub => ({
                student_id: sub.student?.id || sub.student_id, // maintain ID for reference but not name if privacy concern, but user asked for names
                student_name: sub.student?.full_name || "Unknown",
                final_grade: sub.final_grade,
                question_grades: sub.question_grades?.map((q: any) => ({
                    q_num: q.question_number,
                    score: q.final_grade || q.ai_grade,
                    max: q.points_possible,
                    topic: q.question_text // Usually topic is inferred, but we use text for now
                }))
            })).filter(s => s.final_grade !== null);

            if (submissionsData.length === 0) {
                // Return empty if no data
                return null;
            }

            const prompt = `
            You are an expert pedagogical consultant. Analyze the class exam results and provide insights for the teacher.
            
            Exam Details:
            Name: ${exam.name}
            Subject: ${exam.subject}
            
            Student Data (JSON):
            ${JSON.stringify(submissionsData, null, 2)}
            
            Please provide a strictly valid JSON output with the following structure:
            {
                "struggling_topics": [
                    {"topic": "Topic Name (Hebrew)", "percentage": 0-100} // Failure rate for this topic
                ],
                "students_needing_help": ["Student Name 1", "Student Name 2"], // Students with grade < 60 or significant gaps
                "teaching_suggestions": "A detailed paragraph in Hebrew with specific recommendations for the teacher (e.g., topics to review, group strategies)."
            }
            
            Instructions:
            1. Identify weak topics based on point loss.
            2. Suggest concrete actions.
            3. Be encouraging but professional.
            4. Output ONLY the JSON.
            `;

            if (onProgress) onProgress('מגבש תובנות והמלצות...');

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Clean JSON
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const insights = JSON.parse(jsonStr);

            return insights;

        } catch (error) {
            console.error('Class Insights Error:', error);
            throw error;
        }
    },

    async generatePracticeQuestions(subject: string, title: string, count: number = 10) {
        if (!API_KEY) throw new Error("Missing VITE_GEMINI_API_KEY");

        try {
            const genAI = new GoogleGenerativeAI(API_KEY);
            const model = genAI.getGenerativeModel({ model: MODEL_GRADING }); // Use the advanced model

            const prompt = `
            Act as a teacher. Create a practice quiz for a student based on the following exam context:
            Subject: ${subject}
            Exam Title: ${title}

            Generate exactly ${count} practice questions in Hebrew.
            The questions should be a mix of "multiple_choice" (American) and "open" questions.
            
            Return a strictly valid JSON array with this structure:
            [
              {
                "type": "multiple",
                "question": "Question text...",
                "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
                "correct": 0, // index of correct option
                "explanation": "Why this is correct..."
              },
              {
                "type": "open",
                "question": "Question text...",
                "hint": "A helpful hint...",
                "modelAnswer": "The expected answer..."
              }
            ]
            
            Ensure the JSON is valid and contains no markdown formatting.
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const questions = JSON.parse(jsonStr);

            return questions;

        } catch (error) {
            console.error('Practice Gen Error:', error);
            throw error;
        }
    },

    async extractGradedExam(imageUrls: string[], subject: string) {
        if (!API_KEY) throw new Error("Missing VITE_GEMINI_API_KEY");

        try {
            const genAI = new GoogleGenerativeAI(API_KEY);
            const model = genAI.getGenerativeModel({ model: MODEL_GRADING });

            // Convert images to base64
            const imageParts = await Promise.all(
                imageUrls.map(async (url) => {
                    const response = await fetch(url);
                    const blob = await response.blob();
                    const base64 = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                        reader.readAsDataURL(blob);
                    });
                    return {
                        inlineData: { data: base64, mimeType: blob.type || 'image/jpeg' }
                    };
                })
            );

            const prompt = `
            **Role:** You are an expert at analyzing ALREADY GRADED Hebrew exam papers.
            **Task:** Extract the teacher's grading patterns from these graded exam images.
            **Subject:** ${subject}

            **What to look for:**
            1. **Questions:** Identify each question (printed or handwritten).
            2. **Student Answers:** The handwritten student response.
            3. **Teacher Marks:** Look for ✓ (V), ✗ (X), circles, underlines, numbers (scores like "85", "100", "-5").
            4. **Teacher Remarks:** Any written feedback, corrections, or annotations by the teacher.
            5. **Points:** Detect points given, points deducted (like "-10"), and total possible points.

            **Output Format (Strict JSON):**
            \`\`\`json
            {
              "extracted_samples": [
                {
                  "question_number": 1,
                  "question_text": "The question text...",
                  "student_answer": "The student's answer...",
                  "teacher_grade": "85", // or "V", "X", "✓", etc.
                  "teacher_remarks": "Any feedback written by teacher...",
                  "points_given": 85,
                  "points_deducted": 15,
                  "points_possible": 100
                }
              ]
            }
            \`\`\`

            Return ONLY valid JSON. No markdown formatting around it.
            `;

            const result = await model.generateContent([prompt, ...imageParts]);
            const response = await result.response;
            const text = response.text();

            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(jsonStr);

            return parsed.extracted_samples || [];

        } catch (error) {
            console.error('Extract Graded Exam Error:', error);
            throw error;
        }
    },

    // Extract questions from a separate questions sheet
    async extractQuestionsFromSheet(base64Images: string[], onProgress?: (status: string) => void) {
        if (!API_KEY) throw new Error("Missing VITE_GEMINI_API_KEY");

        try {
            onProgress?.('מנתח תמונות גיליון השאלות...');

            const genAI = new GoogleGenerativeAI(API_KEY);
            const model = genAI.getGenerativeModel({ model: MODEL_OCR });

            // Convert base64 strings to image parts
            const imageParts = base64Images.map(base64 => {
                // Handle data URLs (data:image/jpeg;base64,...)
                const parts = base64.split(',');
                const mimeMatch = parts[0]?.match(/data:([^;]+);/);
                const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
                const data = parts.length > 1 ? parts[1] : base64;

                return {
                    inlineData: { data, mimeType }
                };
            });

            const prompt = `
            **Role:** You are an expert Hebrew OCR system specialized in extracting exam questions.
            **Task:** Analyze the provided exam sheet image(s) and extract ALL questions.

            **Instructions:**
            1. Identify each question by its number (1, 2, 3... or א, ב, ג...)
            2. Extract the FULL text of each question (Hebrew)
            3. If you see point values (e.g., "20 נקודות", "(10 נק')"), extract them
            4. Maintain the original order of questions

            **Output Format (Strict JSON Array):**
            \`\`\`json
            [
              {
                "number": 1,
                "text": "Full question text in Hebrew...",
                "points": 20
              },
              {
                "number": 2,
                "text": "Another question text...",
                "points": 15
              }
            ]
            \`\`\`

            **Important:**
            - Return ONLY valid JSON array, no markdown
            - If points are not visible, estimate based on question complexity (default: 10)
            - Preserve Hebrew text exactly as written
            - Include sub-questions if present (e.g., 1א, 1ב as separate items or combined)
            `;

            onProgress?.('מפענח שאלות...');

            const result = await model.generateContent([prompt, ...imageParts]);
            const response = await result.response;
            const text = response.text();

            // Parse JSON
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const questions = JSON.parse(jsonStr);

            onProgress?.('השאלות נמצאו בהצלחה!');

            return Array.isArray(questions) ? questions : [];

        } catch (error) {
            console.error('Extract Questions Error:', error);
            throw error;
        }
    }
};
