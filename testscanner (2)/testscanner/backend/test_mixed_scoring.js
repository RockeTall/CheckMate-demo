
// test_mixed_scoring.js
const assert = require('assert');

// --- Mock Aggregation Logic (Mirroring server.js) ---
function calculateFinalScores(allGradedQuestions) {
    const totalQuestions = allGradedQuestions.length;

    // Safety: Ensure every question has a valid numeric score
    allGradedQuestions.forEach(q => {
        if (typeof q.score !== 'number') q.score = 0;
        // q.score_display = `${q.score}/100`; // UI logic
    });

    const totalScoreSum = allGradedQuestions.reduce((acc, q) => acc + q.score, 0);
    const totalScoreFinal = totalQuestions > 0 ? (totalScoreSum / totalQuestions) : 0;

    return totalScoreFinal;
}

console.log("Testing Mixed Manual/AI Scoring...");

// Scenario:
// Q1: Manual 'V' -> 100
// Q2: AI Graded -> 80
// Q3: Manual '-2' -> 90
const mixedQuestions = [
    { question_number: 1, score: 100, type: "manual" },
    { question_number: 2, score: 80, type: "ai" }, // AI should now return 'score', not 'quality_score'
    { question_number: 3, score: 90, type: "manual" }
];

const finalScore = calculateFinalScores(mixedQuestions);
console.log(`Final Score: ${finalScore}`);

// Expected: (100 + 80 + 90) / 3 = 270 / 3 = 90
if (finalScore === 90) {
    console.log("✅ Passed: 90/100");
} else {
    console.error(`❌ Failed: Expected 90, got ${finalScore}`);
    process.exit(1);
}
