const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

const db = new Database(path.join(dataDir, 'checkmate.db'), { verbose: console.log });
db.pragma('journal_mode = WAL');

// 1. Initialize Schema (Synchronous)
const createTableQuery = `
CREATE TABLE IF NOT EXISTS teacher_annotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_hash TEXT,
    question_text TEXT,
    student_answer_text TEXT,
    teacher_remark TEXT,
    grade_awarded INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

// Index for faster lookups
const createIndexQuery = `
CREATE INDEX IF NOT EXISTS idx_question_hash ON teacher_annotations(question_hash);
`;

db.exec(createTableQuery);
db.exec(createIndexQuery);
console.log("Database initialized: checkmate.db");

// 2. Prepare Statements (After table creation)
const insertRemarkStmt = db.prepare(`
    INSERT INTO teacher_annotations (question_hash, question_text, student_answer_text, teacher_remark, grade_awarded)
    VALUES (?, ?, ?, ?, ?)
`);

const findSimilarStmt = db.prepare(`
    SELECT * FROM teacher_annotations 
    WHERE question_hash = ? 
    ORDER BY created_at DESC 
    LIMIT 5
`);

// 3. API
const TeacherMemory = {
    saveRemark: (data) => {
        // Simple hash could be improved
        const hash = data.question_id || (data.question_text ? data.question_text.substring(0, 50) : "unknown");

        return insertRemarkStmt.run(
            hash,
            data.question_text || "",
            data.student_answer_text || "",
            data.teacher_remark,
            data.grade_awarded
        );
    },

    findSimilar: (questionIdentifier) => {
        return findSimilarStmt.all(questionIdentifier);
    },

    getAll: () => {
        return db.prepare('SELECT * FROM teacher_annotations').all();
    }
};

module.exports = TeacherMemory;
