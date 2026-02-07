import React, { useState } from 'react';
import GradingResultsPage from './components/GradingResultsPage';
import ExamUploader from './components/ExamUploader';

function App() {
  const [view, setView] = useState('upload'); // 'upload' or 'results'
  const [examData, setExamData] = useState(null);

  const startGrading = (gradeData) => {
    setExamData(gradeData);
    setView('results');
  };

  return (
    <div className="App min-h-screen bg-gray-100 py-10">
      {view === 'upload' ? (
        <ExamUploader onStartGrading={startGrading} />
      ) : (
        <GradingResultsPage data={examData} />
      )}

      {/* Navigation for Demo */}
      <div className="fixed bottom-4 left-4 flex gap-2">
        <button onClick={() => setView('upload')} className="rounded bg-gray-800 px-3 py-1 text-xs text-white opacity-50 hover:opacity-100">Reset</button>
      </div>
    </div>
  );
}

export default App;
