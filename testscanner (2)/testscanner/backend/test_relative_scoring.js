
// test_relative_scoring.js
const assert = require('assert');

// --- Mock Logic (Mirroring server.js) ---
function calculateFinalScores(allGradedQuestions) {
    const totalQuestions = allGradedQuestions.length;

    // Check "All-or-Nothing" constraint: Do ALL questions have points_possible?
    const canUseRelativeScoring = allGradedQuestions.length > 0 && allGradedQuestions.every(q => q.points_possible > 0);

    let totalScoreFinal = 0;
    let scoringMode = "average";

    if (canUseRelativeScoring) {
        scoringMode = "relative";

        allGradedQuestions.forEach(q => {
            // Formula: Points Earned = (Quality / 100) * Points Possible
            // Use quality_score if available, otherwise fallback to score (for backward compat in mock)
            const quality = q.quality_score !== undefined ? q.quality_score : q.score;
            const earned = (quality / 100) * q.points_possible;
            q.final_score = parseFloat(earned.toFixed(1));
            totalScoreFinal += q.final_score;
        });

    } else {
        scoringMode = "fallback_average";

        const totalQualitySum = allGradedQuestions.reduce((acc, q) => acc + (q.quality_score !== undefined ? q.quality_score : q.score), 0);
        totalScoreFinal = totalQuestions > 0 ? (totalQualitySum / totalQuestions) : 0;
    }

    return { total_score: totalScoreFinal, scoring_mode: scoringMode, questions: allGradedQuestions };
}

// --- Test Case 1: Success (Relative Scoring) ---
console.log("Test 1: Full Relative Scoring...");
const mockDataSuccess = [
    { question_number: 1, quality_score: 90, points_possible: 10 }, // 9 points
    { question_number: 2, quality_score: 50, points_possible: 20 }  // 10 points
];
const result1 = calculateFinalScores(mockDataSuccess);
console.log(`Result 1: Mode=${result1.scoring_mode}, Total=${result1.total_score}`);

if (result1.scoring_mode === 'relative' && result1.total_score === 19) {
    console.log("✅ Passed");
} else {
    console.error("❌ Failed: Expected relative mode with 19 points.");
    process.exit(1);
}

// --- Test Case 2: Fallback (Missing Points) ---
console.log("\nTest 2: Fallback to Average...");
const mockDataFallback = [
    { question_number: 1, quality_score: 90, points_possible: 10 },
    { question_number: 2, quality_score: 50, points_possible: 0 } // Missing points!
];
const result2 = calculateFinalScores(mockDataFallback);
console.log(`Result 2: Mode=${result2.scoring_mode}, Total=${result2.total_score}`);

if (result2.scoring_mode === 'fallback_average' && result2.total_score === 70) {
    console.log("✅ Passed");
} else {
    console.error("❌ Failed: Expected fallback mode with 70 average.");
    process.exit(1);
}
