
// test_manual_logic.js
const assert = require('assert');

function parseManualGrade(manualRaw) {
    manualRaw = String(manualRaw).trim().toUpperCase();
    let calcScore = 0;

    if (manualRaw === 'V' || manualRaw.includes('✓')) {
        calcScore = 100;
    } else if (manualRaw === 'X' || manualRaw.includes('✗')) {
        calcScore = 0;
    } else if (manualRaw.startsWith('-')) {
        // Deduction logic: 100 - (Points * 5)
        const pointsLost = parseInt(manualRaw.replace('-', '')) || 0;
        calcScore = Math.max(0, 100 - (pointsLost * 5));
    } else {
        calcScore = parseInt(manualRaw) || 0;
    }
    return calcScore;
}

console.log("Testing Manual Grade Parsing (5-point rule)...");

// Test 1: V -> 100
assert.strictEqual(parseManualGrade('V'), 100, "V should be 100");
console.log("✅ V passed");

// Test 2: X -> 0
assert.strictEqual(parseManualGrade('X'), 0, "X should be 0");
console.log("✅ X passed");

// Test 3: -2 -> 90
assert.strictEqual(parseManualGrade('-2'), 90, "-2 should be 90 (100 - 10)");
console.log("✅ -2 passed");

// Test 4: -5 -> 75
assert.strictEqual(parseManualGrade('-5'), 75, "-5 should be 75 (100 - 25)");
console.log("✅ -5 passed");

// Test 5: 90 -> 90
assert.strictEqual(parseManualGrade('90'), 90, "90 should be 90");
console.log("✅ 90 passed");

console.log("ALL TESTS PASSED");
