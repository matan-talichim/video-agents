import { useState } from 'react';
import type { Job } from '../types';
import { getModelById } from '../data/videoModels';

interface Props {
  job: Job;
}

const STYLE_LABELS: Record<string, string> = {
  cinematic: 'סינמטי',
  energetic: 'אנרגטי',
  minimal: 'מינימלי',
  trendy: 'טרנדי',
};

export default function ProjectDetails({ job }: Props) {
  const [open, setOpen] = useState(false);

  const enabledCount = job.plan?.enabledFeatures.length || 0;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <span className={`transition-transform text-xs ${open ? 'rotate-90' : ''}`}>◀</span>
        פרטי פרויקט
      </button>

      {open && (
        <div className="mt-3 bg-dark-card border border-dark-border-light rounded-xl p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-[10px] text-gray-500 mb-0.5">מצב</p>
              <p>{job.mode === 'upload' ? 'העלאה' : 'פרומפט'}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 mb-0.5">מודל</p>
              <p>{getModelById(job.videoModel)?.name || job.videoModel}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 mb-0.5">משך</p>
              <p>{job.result?.duration ? `${job.result.duration} שניות` : job.targetDuration ? `${job.targetDuration} שניות` : 'AI בוחר'}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 mb-0.5">גרסאות</p>
              <p>{job.versions.length}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 mb-0.5">סגנון עריכה</p>
              <p>{STYLE_LABELS[job.editStyle] || job.editStyle}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 mb-0.5">פיצ׳רים פעילים</p>
              <p>{enabledCount}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 mb-0.5">קבצים</p>
              <p>{job.files.length}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 mb-0.5">לוגו</p>
              <p>{job.logo ? job.logo.originalName : 'ללא'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
