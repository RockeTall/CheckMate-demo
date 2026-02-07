
// test_simple_scoring.js
const assert = require('assert');

// --- Mock Logic (Mirroring simplified server.js) ---
function calculateFinalScores(allGradedQuestions) {
    const totalQuestions = allGradedQuestions.length;

    // Simple Average Logic
    const totalScoreSum = allGradedQuestions.reduce((acc, q) => acc + q.score, 0);
    const totalScoreFinal = totalQuestions > 0 ? (totalScoreSum / totalQuestions) : 0;

    return { total_score: totalScoreFinal, questions: allGradedQuestions };
}

// --- Test Case 1: Simple Average ---
console.log("Test 1: Simple Average Scoring...");
const mockData = [
    { question_number: 1, score: 90 },
    { question_number: 2, score: 50 }
];
const result = calculateFinalScores(mockData);
console.log(`Result: Total=${result.total_score}`);

if (result.total_score === 70) {
    console.log("✅ Passed");
} else {
    console.error("❌ Failed: Expected 70 average.");
    process.exit(1);
}
