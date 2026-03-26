import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';
import PreviewPage from './pages/PreviewPage';
import ProcessingPage from './pages/ProcessingPage';
import ResultPage from './pages/ResultPage';
import LanguageToggle from './components/LanguageToggle';
import useLanguageStore from './store/useLanguageStore';

export default function App() {
  const dir = useLanguageStore((s) => s.dir)();

  return (
    <div className="min-h-screen bg-dark-bg text-white font-['Heebo']" dir={dir}>
      {/* Global language toggle — fixed top-left/right */}
      <div className="fixed top-3 z-[60]" style={{ [dir === 'rtl' ? 'left' : 'right']: '12px' }}>
        <LanguageToggle />
      </div>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/editor/:mode" element={<EditorPage />} />
        <Route path="/jobs/:id/preview" element={<PreviewPage />} />
        <Route path="/jobs/:id" element={<ProcessingPage />} />
        <Route path="/jobs/:id/result" element={<ResultPage />} />
      </Routes>
    </div>
  );
}
