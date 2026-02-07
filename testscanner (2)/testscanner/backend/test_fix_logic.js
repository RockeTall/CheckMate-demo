
// logic_test_mock.js
const assert = require('assert');

// Mock Data simulating OCR output for a manual grade scenario
const mockVisionData = {
    segments: [
        {
            question_number: "1",
            question_text: "Test Question",
            student_answer_text: "Test Answer",
            teacher_notes_detected: "Great job",
            manual_score_detected: "100"  // This triggers the "Learning Mode"
        }
    ]
};

// Mock TeacherMemory
const TeacherMemory = {
    saveRemark: (data) => {
        console.log("Saved to memory:", data);
    }
};

// The logic under test (extracted from server.js roughly)
function processSegments(visionData) {
    const fileResults = [];
    const isGradedMode = visionData.segments.some(s => s.manual_score_detected || s.teacher_notes_detected);

    for (const segment of visionData.segments) {
        if (segment.student_answer_text) {
            if (isGradedMode && segment.manual_score_detected) {
                // Mode C: Learning Mode
                console.log(`[Teacher Memory] Learning from ${segment.question_number}...`);
                TeacherMemory.saveRemark({
                    question_text: segment.question_text,
                    question_id: segment.question_number,
                    student_answer_text: segment.student_answer_text,
                    teacher_remark: segment.teacher_notes_detected || "Manual Grade",
                    grade_awarded: parseInt(segment.manual_score_detected) || 0
                });

                // --- THE FIX IS HERE ---
                fileResults.push({
                    question_number: segment.question_number,
                    question_text: segment.question_text,
                    student_answer: segment.student_answer_text,
                    score: parseInt(segment.manual_score_detected) || 0,
                    feedback: segment.teacher_notes_detected || "Manual Grade Detected (Digitized)",
                    improvement: null,
                    gemini_reasoning: "Manual Grade Detected - Digitized from Image",
                    chatgpt_reasoning: null,
                    is_carry_forward: false
                });
                // -----------------------

            } else {
                // Normal grading path (not testing this right now)
            }
        }
    }
    return fileResults;
}

// Run Test
console.log("Running Fix Logic Check...");
const results = processSegments(mockVisionData);
console.log("Results:", results);

if (results.length === 1 && results[0].score === 100) {
    console.log("✅ TEST PASSED: Manual grade was returned as a result.");
} else {
    console.error("❌ TEST FAILED: No result returned or incorrect data.");
    process.exit(1);
}
