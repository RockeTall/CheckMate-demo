import React, { useState } from 'react';
import { Upload, X, BrainCircuit } from 'lucide-react';

const ExamUploader = ({ onStartGrading }) => {
    const [studentName, setStudentName] = useState('');
    const [studentID, setStudentID] = useState('');
    const [expectedCount, setExpectedCount] = useState(''); // Task 1: Expected Count

    // v2: Multi-File Support
    const [examFiles, setExamFiles] = useState([]);

    // v3: Mode Selection
    const [gradingMode, setGradingMode] = useState('standard'); // 'standard', 'separate', 'training'
    const [questionFile, setQuestionFile] = useState(null); // For 'separate' mode

    // v2: Feature 4 Smart Toggle
    const [smartGrading, setSmartGrading] = useState(false);

    // Rubric State
    const [rubricType, setRubricType] = useState('text'); // 'text' or 'file'
    const [rubricText, setRubricText] = useState('');
    const [rubricFile, setRubricFile] = useState(null);

    const [isLoading, setIsLoading] = useState(false);

    const handleFileDrop = (e) => {
        e.preventDefault();
        if (e.dataTransfer.files) {
            const newFiles = Array.from(e.dataTransfer.files);
            setExamFiles(prev => [...prev, ...newFiles]);
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setExamFiles(prev => [...prev, ...newFiles]);
        }
    };

    const removeFile = (index) => {
        setExamFiles(files => files.filter((_, i) => i !== index));
    };

    const handleQuestionFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            setQuestionFile(e.target.files[0]);
        }
    };

    const handleSubmit = async () => {
        if (examFiles.length === 0) {
            alert("נא להעלות לפחות קובץ מבחן אחד");
            return;
        }

        setIsLoading(true);

        const formData = new FormData();
        const studentInfo = {
            name: studentName,
            id: studentID,
            expected_questions: expectedCount // Task 1: Pass to backend/result
        };
        formData.append('student_info', JSON.stringify(studentInfo));

        // v2: Append multiple files
        examFiles.forEach((file) => {
            formData.append('examFiles', file);
        });

        // v2: Smart Grading Toggle
        // v2: Smart Grading Toggle
        formData.append('smartGrading', smartGrading);

        // v3: Mode & Conditional Files
        formData.append('mode', gradingMode);
        if (gradingMode === 'separate' && questionFile) {
            formData.append('questionFile', questionFile);
        }

        formData.append('rubricType', rubricType);
        if (rubricType === 'text') {
            formData.append('rubricContent', rubricText);
        } else if (rubricFile) {
            formData.append('rubricFile', rubricFile);
        }

        try {
            const response = await fetch('http://localhost:3001/api/grade', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log("Grading Complete:", data);

            // Inject expected count into the result data for validation on next page
            data.expected_questions = expectedCount;

            if (onStartGrading) onStartGrading(data);

        } catch (error) {
            console.error("Upload failed:", error);
            alert("שגיאה בבדיקת המבחן: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Helper for Rubric Upload (kept single for simplicity)
    const handleRubricSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            setRubricFile(e.target.files[0]);
        }
    };

    return (
        <div className="mx-auto max-w-2xl rounded-xl bg-white p-8 shadow-sm" dir="rtl">
            <h2 className="mb-6 text-2xl font-bold text-indigo-900">העלאת מבחן חדש (v2.1)</h2>

            <h2 className="mb-6 text-2xl font-bold text-indigo-900">העלאת מבחן חדש (v2.1)</h2>

            {/* v3: Mode Selection Toggle */}
            <div className="mb-8 flex rounded-lg bg-gray-100 p-1">
                <button
                    onClick={() => setGradingMode('standard')}
                    className={`flex-1 rounded-md py-2 text-sm font-bold transition ${gradingMode === 'standard' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    מבחן רגיל (גוף המבחן)
                </button>
                <button
                    onClick={() => setGradingMode('separate')}
                    className={`flex-1 rounded-md py-2 text-sm font-bold transition ${gradingMode === 'separate' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    מחברת בחינה (דפים נפרדים)
                </button>
                <button
                    onClick={() => setGradingMode('training')}
                    className={`flex-1 rounded-md py-2 text-sm font-bold transition ${gradingMode === 'training' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    📚 לימוד (Train AI)
                </button>
            </div>

            {/* Smart Grading Toggle */}
            <div className="mb-6 flex items-center justify-between rounded-lg border border-indigo-100 bg-indigo-50 p-4">
                <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${smartGrading ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                        <BrainCircuit size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-indigo-900">בדיקה חכמה (Teacher Memory)</h3>
                        <p className="text-xs text-indigo-700">השתמש בזיכרון היסטורי של הערות המורה לשאלות דומות</p>
                    </div>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                    <input type="checkbox" checked={smartGrading} onChange={() => setSmartGrading(!smartGrading)} className="peer sr-only" />
                    <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300"></div>
                </label>
            </div>

            {/* Student Details */}
            <div className="mb-6 grid grid-cols-3 gap-4">
                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">שם התלמיד</label>
                    <input
                        type="text"
                        className="w-full rounded-md border border-gray-300 p-2 focus:border-indigo-500 focus:outline-none"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        placeholder="ישראל ישראלי"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">תעודת זהות</label>
                    <input
                        type="text"
                        className="w-full rounded-md border border-gray-300 p-2 focus:border-indigo-500 focus:outline-none"
                        value={studentID}
                        onChange={(e) => setStudentID(e.target.value)}
                        placeholder="123456"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">מספר שאלות (אופציונלי)</label>
                    <input
                        type="number"
                        className="w-full rounded-md border border-gray-300 p-2 focus:border-indigo-500 focus:outline-none"
                        value={expectedCount}
                        onChange={(e) => setExpectedCount(e.target.value)}
                        placeholder="למשל: 5"
                    />
                </div>
            </div>

            {/* Exam File Upload (Multi) */}
            <div className="mb-8">
                <label className="mb-2 block text-sm font-medium text-gray-700">קובצי המבחן (תומך במספר עמודים)</label>
                <div
                    onDrop={handleFileDrop}
                    onDragOver={(e) => e.preventDefault()}
                    className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 transition hover:border-indigo-400 hover:bg-indigo-50"
                >
                    <input
                        type="file"
                        className="hidden"
                        id="exam-upload"
                        multiple
                        onChange={handleFileSelect}
                    />
                    <label htmlFor="exam-upload" className="flex w-full flex-col items-center justify-center py-6 cursor-pointer">
                        <Upload className="mb-2 h-8 w-8 text-gray-400" />
                        <span className="text-gray-500">גרור קבצים לכאן או</span>
                        <span className="mr-1 font-medium text-indigo-600">לחץ לבחירה</span>
                    </label>
                </div>

                {/* File List */}
                {examFiles.length > 0 && (
                    <div className="mt-4 grid grid-cols-3 gap-2">
                        {examFiles.map((file, idx) => (
                            <div key={idx} className="relative flex items-center justify-between rounded border border-gray-200 bg-gray-50 p-2 shadow-sm">
                                <span className="truncate text-xs font-medium text-gray-700" title={file.name}>{file.name}</span>
                                <button onClick={() => removeFile(idx)} className="text-red-400 hover:text-red-600">
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* v3: Optional Question File (Only for Separate Sheet Mode) */}
            {gradingMode === 'separate' && (
                <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <label className="mb-2 block text-sm font-medium text-blue-900">טופס השאלון (אופציונלי אך מומלץ)</label>
                    <p className="mb-3 text-xs text-blue-700">העלה את קובץ השאלות כדי שהמערכת תדע לקשר בין מספרי התשובות לטקסט השאלה.</p>
                    <div className="flex items-center gap-4">
                        <input
                            type="file"
                            id="question-upload"
                            onChange={handleQuestionFileSelect}
                            className="block w-full text-sm text-blue-900 file:mr-4 file:rounded-full file:border-0 file:bg-blue-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-200"
                        />
                    </div>
                </div>
            )}


            {/* Rubric Section */}
            <div className="mb-8 rounded-lg border border-gray-200 p-4">
                <div className="mb-4 flex items-center justify-between">
                    <label className="text-lg font-bold text-gray-800">מחוון (Rubric)</label>
                    <div className="flex rounded-md bg-gray-100 p-1">
                        <button
                            onClick={() => setRubricType('text')}
                            className={`rounded px-3 py-1 text-sm font-medium transition ${rubricType === 'text' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            הקלדה ידנית
                        </button>
                        <button
                            onClick={() => setRubricType('file')}
                            className={`rounded px-3 py-1 text-sm font-medium transition ${rubricType === 'file' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            העלאת קובץ
                        </button>
                    </div>
                </div>

                {rubricType === 'text' ? (
                    <textarea
                        className="h-32 w-full rounded-md border border-gray-300 p-3 text-sm focus:border-indigo-500 focus:outline-none"
                        placeholder="הזן את הוראות הבדיקה, התשובות הנכונות והניקוד לכל שאלה..."
                        value={rubricText}
                        onChange={(e) => setRubricText(e.target.value)}
                    ></textarea>
                ) : (
                    <div className="flex h-32 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
                        <input
                            type="file"
                            className="hidden"
                            id="rubric-upload"
                            onChange={handleRubricSelect}
                        />
                        <label htmlFor="rubric-upload" className="cursor-pointer text-center">
                            {rubricFile ? (
                                <span className="font-semibold text-indigo-600">{rubricFile.name}</span>
                            ) : (
                                <>
                                    <span className="text-gray-500">גרור קובץ מחוון או</span>
                                    <span className="mr-1 font-medium text-indigo-600">לחץ לבחירה</span>
                                </>
                            )}
                        </label>
                    </div>
                )}
            </div>

            {/* Submit Button */}
            <button
                onClick={handleSubmit}
                disabled={isLoading}
                className={`w-full rounded-lg py-3 font-bold text-white shadow-md transition ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
                {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                        <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        מעבד מבחן וזוכר הערות...
                    </span>
                ) : "התחל בדיקה (CheckMate v2)"}
            </button>
            {gradingMode === 'training' && (
                <p className="mt-2 text-center text-xs text-gray-400">
                    במצב "לימוד", המערכת לא תיתן ציון אלא רק תסרוק את הערות המורה לשמירה בזיכרון.
                </p>
            )}
        </div>
    );
};

export default ExamUploader;
