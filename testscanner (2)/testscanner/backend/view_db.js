const TeacherMemory = require('./database');

console.log("--- Teacher Memory Database Contents ---");

try {
    const allRemarks = TeacherMemory.getAll();

    if (allRemarks.length === 0) {
        console.log("Database is empty. (Try uploading a graded exam to 'teach' it!)");
    } else {
        console.table(allRemarks.map(r => ({
            id: r.id,
            question: r.question_text.substring(0, 30) + "...",
            answer: r.student_answer_text.substring(0, 30) + "...",
            remark: r.teacher_remark.substring(0, 30) + "...",
            score: r.grade_awarded,
            created: r.created_at
        })));
        console.log(`\nTotal Records: ${allRemarks.length}`);
    }
} catch (error) {
    console.error("Error reading database:", error);
}
