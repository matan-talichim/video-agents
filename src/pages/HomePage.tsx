import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-4 bg-gradient-to-l from-purple-400 via-violet-400 to-blue-400 bg-clip-text text-transparent">
          סוכני וידאו AI
        </h1>
        <p className="text-lg md:text-xl text-gray-400">
          מערכת עריכת וידאו חכמה עם 95 פיצ׳רים
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl w-full">
        <Link
          to="/editor/upload"
          className="group relative overflow-hidden rounded-2xl border border-blue-500/30 bg-dark-card p-8 hover:border-blue-400/60 transition-all duration-300 hover:glow-blue"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent" />
          <div className="relative">
            <div className="text-4xl mb-4">📁</div>
            <h2 className="text-2xl font-bold mb-2">העלה קובץ</h2>
            <p className="text-gray-400 text-sm">
              העלה סרטון, אודיו או תמונות ותן ל-AI לערוך עבורך
            </p>
          </div>
        </Link>

        <Link
          to="/editor/prompt"
          className="group relative overflow-hidden rounded-2xl border border-purple-500/30 bg-dark-card p-8 hover:border-purple-400/60 transition-all duration-300 hover:glow-purple"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-transparent" />
          <div className="relative">
            <div className="text-4xl mb-4">✨</div>
            <h2 className="text-2xl font-bold mb-2">צור מפרומפט</h2>
            <p className="text-gray-400 text-sm">
              תאר את הסרטון שאתה רוצה ו-AI ייצור הכל מאפס
            </p>
          </div>
        </Link>
      </div>

      <p className="mt-12 text-gray-600 text-sm">
        גרסה 1.0 • נבנה עם Claude AI
      </p>
    </div>
  );
}
