import React, { useState } from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';

const GradingResultsPage = ({ data }) => {
    const [expandedQ, setExpandedQ] = useState(null);

    const toggleExpand = (id) => {
        setExpandedQ(expandedQ === id ? null : id);
    };

    // Completeness Check Logic
    const detectedCount = data.questions.length;
    const expectedCount = data.expected_questions ? parseInt(data.expected_questions) : null;

    // Sort logic happens in backend, but failsafe sort here
    const sortedQuestions = [...data.questions].sort((a, b) =>
        String(a.question_number).localeCompare(String(b.question_number), undefined, { numeric: true, sensitivity: 'base' })
    );

    const isMissingQuestions = expectedCount && detectedCount < expectedCount;

    return (
        <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-900" dir="rtl">

            {/* Header Section */}
            <header className="mb-8 flex items-center justify-between rounded-xl bg-white p-6 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-indigo-900">דוח בדיקת מבחן</h1>
                    <p className="text-gray-500">מזהה נבחן: {data.exam_id}</p>
                </div>

                <div className="text-center">
                    <div className="text-sm text-gray-500">ציון סופי</div>
                    <div className={`text-4xl font-black ${data.total_score >= 90 ? 'text-green-600' : 'text-blue-600'}`}>
                        {Math.round(data.total_score)}
                    </div>
                </div>
            </header>

            {/* Empty State Handling */}
            {detectedCount === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl bg-white p-12 text-center shadow-sm">
                    <div className="mb-4 rounded-full bg-orange-100 p-4 text-orange-600">
                        <AlertTriangle size={48} />
                    </div>
                    <h2 className="mb-2 text-xl font-bold text-gray-900">לא נמצאו שאלות</h2>
                    <p className="mb-6 max-w-md text-gray-500">
                        המערכת לא הצליחה לזהות שאלות בקובץ שהועלה.
                        ייתכן שהקובץ ריק, מטושטש, או שהסריקה נכשלה.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="rounded-lg bg-indigo-600 px-6 py-2 font-bold text-white hover:bg-indigo-700"
                    >
                        נסה שוב
                    </button>
                </div>
            ) : (
                <>
                    {/* Completeness Warning Banner */}
                    {isMissingQuestions && (
                        <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
                            <AlertTriangle size={24} />
                            <div>
                                <h3 className="font-bold">אזהרת שלמות נתונים</h3>
                                <p className="text-sm">
                                    זוהו {detectedCount} שאלות בלבד, אך הצהרת על {expectedCount} שאלות. ייתכן ודילגנו על עמוד או שהOCR פספס שאלה.
                                </p>
                            </div>
                        </div>
                    )}

                    {!isMissingQuestions && expectedCount && (
                        <div className="mb-6 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
                            <CheckCircle size={24} />
                            <div>
                                <h3 className="font-bold">בדיקה הושלמה בהצלחה</h3>
                                <p className="text-sm">
                                    כל {expectedCount} השאלות זוהו בהצלחה.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Questions Grid */}
                    <div className="space-y-6">
                        {sortedQuestions.map((q, idx) => (
                            <div key={idx} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md">

                                {/* Question Header Card */}
                                <div className="flex items-start justify-between bg-white p-6">
                                    <div className="flex-1 pl-4">
                                        <div className="mb-2 flex items-center gap-2">
                                            <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-bold text-indigo-700">
                                                שאלה {q.question_number}
                                            </span>
                                            {q.is_carry_forward && (
                                                <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
                                                    ⚠️ טעות נגררת (לא ירדו נקודות)
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="mb-4 text-lg font-medium text-gray-800">{q.question_text}</h3>

                                        <div className="rounded-lg bg-blue-50 p-4">
                                            <span className="mb-1 block text-xs font-semibold text-blue-600">תשובת התלמיד:</span>
                                            <p className="font-handwriting text-gray-800">{q.student_answer}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-3 text-left">
                                        <div className="text-center">
                                            <span className="block text-2xl font-bold text-gray-900">{q.score}</span>
                                            <span className="text-xs text-gray-400">/ 100</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Feedback Section */}
                                <div className="border-t border-gray-100 bg-gray-50 p-6">
                                    <div className="mb-4">
                                        <h4 className="flex items-center gap-2 font-bold text-gray-700">
                                            <span>📝 משוב המערכת</span>
                                        </h4>
                                        <p className="mt-1 text-gray-700">{q.feedback}</p>
                                    </div>

                                    {q.improvement && (
                                        <div className="mb-4 rounded-md bg-orange-50 p-3 text-sm text-orange-800">
                                            <strong>💡 נקודות לשיפור:</strong> {q.improvement}
                                        </div>
                                    )}

                                    {/* Debug / Reasoning Toggle */}
                                    <button
                                        onClick={() => toggleExpand(idx)}
                                        className="text-xs font-medium text-gray-400 hover:text-indigo-600 underline"
                                    >
                                        {expandedQ === idx ? "הסתר נתוני מודל טכניים" : "הצג נתוני מודל טכניים (Debug)"}
                                    </button>

                                    {expandedQ === idx && (
                                        <div dir="ltr" className="mt-4 grid grid-cols-2 gap-4 text-sm">
                                            <div className="rounded border border-blue-200 bg-white p-3">
                                                <strong className="text-blue-600">Gemini 3 Pro:</strong>
                                                <p className="mt-1 text-gray-600">{q.gemini_reasoning}</p>
                                            </div>
                                            <div className="rounded border border-green-200 bg-white p-3">
                                                <strong className="text-green-600">ChatGPT 5.1:</strong>
                                                <p className="mt-1 text-gray-600">{q.chatgpt_reasoning}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default GradingResultsPage;
