import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';
import ProcessingPage from './pages/ProcessingPage';
import ResultPage from './pages/ResultPage';

export default function App() {
  return (
    <div className="min-h-screen bg-dark-bg text-white font-['Heebo']" dir="rtl">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/editor/:mode" element={<EditorPage />} />
        <Route path="/jobs/:id" element={<ProcessingPage />} />
        <Route path="/jobs/:id/result" element={<ResultPage />} />
      </Routes>
    </div>
  );
}
