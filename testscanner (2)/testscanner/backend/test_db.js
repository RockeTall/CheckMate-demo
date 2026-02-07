const TeacherMemory = require('./database');

console.log("--- Testing TeacherMemory Database ---");

// 1. Initialize (Auto-runs on require)
// TeacherMemory.init();

// 2. Insert Mock Data
console.log("Inserting mock remark...");
const result = TeacherMemory.saveRemark({
    question_text: "Translate 'Apple' to Hebrew",
    question_id: "Q1_VOCAB",
    student_answer_text: "Tapuah",
    teacher_remark: "Correct spelling.",
    grade_awarded: 100
});
console.log("Insert Result:", result);

// 3. Query
console.log("Querying for similar remarks...");
const similar = TeacherMemory.findSimilar("Q1_VOCAB");
console.log("Found:", similar);

if (similar.length > 0 && similar[0].grade_awarded === 100) {
    console.log("✅ Database works!");
} else {
    console.error("❌ Database query failed.");
}
