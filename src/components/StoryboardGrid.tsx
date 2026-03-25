import type { StoryboardScene } from '../types';

interface Props {
  scenes: StoryboardScene[];
  jobId: string;
}

export default function StoryboardGrid({ scenes, jobId }: Props) {
  if (!scenes.length) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
        <span className="text-lg">🎬</span>
        סטוריבורד — {scenes.length} סצנות
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {scenes.map((scene, i) => (
          <div
            key={i}
            className="bg-dark-card border border-dark-border-light rounded-xl overflow-hidden group hover:border-accent-purple/50 transition-colors"
          >
            {/* Frame thumbnail */}
            <div className="aspect-video bg-gray-800 relative">
              {scene.framePath ? (
                <img
                  src={`/api/jobs/${jobId}/preview/frame/${i}`}
                  alt={scene.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600">
                  <span className="text-2xl">🎞️</span>
                </div>
              )}
              {/* Scene number badge */}
              <div className="absolute top-1.5 right-1.5 bg-black/70 text-[10px] text-white px-1.5 py-0.5 rounded">
                סצנה {scene.sceneNumber}
              </div>
              {/* Duration badge */}
              <div className="absolute bottom-1.5 left-1.5 bg-black/70 text-[10px] text-gray-300 px-1.5 py-0.5 rounded">
                {scene.duration}s
              </div>
            </div>
            {/* Scene info */}
            <div className="p-2.5">
              <h4 className="text-xs font-bold text-white mb-1 truncate">{scene.title}</h4>
              <p className="text-[10px] text-gray-400 leading-relaxed line-clamp-2">{scene.description}</p>
              {/* Element tags */}
              {scene.elements.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {scene.elements.map((el, j) => (
                    <span
                      key={j}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-accent-purple/20 text-accent-purple-light"
                    >
                      {el}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
