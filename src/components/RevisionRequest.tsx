import { useState } from 'react';

interface RevisionItem {
  id: string;
  icon: string;
  description: string;
  details: string;
  type: string;
  cost: number;
  requiresRerender?: boolean;
}

interface RevisionPlan {
  items: RevisionItem[];
  summary: string;
  totalCost: number;
  estimatedTime: string;
}

interface Props {
  jobId: string;
  job: any;
}

export default function RevisionRequest({ jobId, job }: Props) {
  const [revisionText, setRevisionText] = useState('');
  const [revisionPlan, setRevisionPlan] = useState<RevisionPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [approvedItems, setApprovedItems] = useState<Record<string, boolean>>({});

  async function analyzeFix() {
    if (!revisionText.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/revision/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: revisionText }),
      });
      const plan: RevisionPlan = await res.json();
      setRevisionPlan(plan);

      const defaults: Record<string, boolean> = {};
      plan.items?.forEach((item) => { defaults[item.id] = true; });
      setApprovedItems(defaults);
    } catch (err) {
      console.error('Revision analysis failed:', err);
    }
    setLoading(false);
  }

  async function executeRevision() {
    if (!revisionPlan) return;
    const approvedList = revisionPlan.items.filter((item) => approvedItems[item.id]);
    if (approvedList.length === 0) return;

    setExecuting(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/revision/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedItems: approvedList.map((i) => i.id) }),
      });
      const result = await res.json();
      if (result.success) {
        window.location.href = `/processing/${jobId}?revision=true`;
      }
    } catch (err) {
      console.error('Revision execution failed:', err);
    }
    setExecuting(false);
  }

  const approvedCost = revisionPlan?.items
    ?.filter((item) => approvedItems[item.id])
    ?.reduce((sum, item) => sum + item.cost, 0) || 0;

  return (
    <div className="bg-dark-card border border-dark-border-light rounded-2xl p-5 space-y-4">
      <div>
        <h3 className="text-base font-semibold text-white">בקשת תיקונים</h3>
        <p className="text-xs text-gray-500 mt-1">
          כתוב מה תרצה לשנות בסרטון והמוח יתכנן את השינויים עם העלויות
        </p>
      </div>

      {/* Prompt input */}
      <div className="flex gap-3">
        <textarea
          value={revisionText}
          onChange={(e) => setRevisionText(e.target.value)}
          placeholder="לדוגמה: תוסיף B-Roll של ים בשנייה 15, תחליף את המוזיקה למשהו יותר אנרגטי, תגדיל את הכתוביות..."
          dir="rtl"
          rows={3}
          className="flex-1 bg-dark-bg border border-dark-border-light rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-purple resize-vertical"
        />
        <button
          onClick={analyzeFix}
          disabled={loading || !revisionText.trim()}
          className="gradient-purple px-6 rounded-xl text-sm font-bold whitespace-nowrap self-start py-3 disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          {loading ? 'מנתח...' : 'נתח שינויים'}
        </button>
      </div>

      {/* Revision Plan */}
      {revisionPlan && (
        <div className="p-5 rounded-xl bg-purple-500/8 border border-purple-500/20 space-y-4">
          <div>
            <h4 className="text-sm font-bold text-white">תוכנית שינויים</h4>
            <p className="text-xs text-gray-500 mt-1">
              המוח ניתח את הבקשה שלך ומציע {revisionPlan.items?.length || 0} שינויים. סמן מה לבצע:
            </p>
          </div>

          {/* Checklist */}
          <div className="space-y-2.5">
            {revisionPlan.items?.map((item) => (
              <label
                key={item.id}
                className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                  approvedItems[item.id]
                    ? 'bg-purple-500/12 border-purple-500/30'
                    : 'bg-white/3 border-dark-border-light/50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={approvedItems[item.id] || false}
                  onChange={(e) => setApprovedItems(prev => ({ ...prev, [item.id]: e.target.checked }))}
                  className="mt-0.5 accent-purple-600 w-4 h-4"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white">
                    {item.icon} {item.description}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{item.details}</div>
                </div>
                <div className={`text-sm font-bold whitespace-nowrap ${item.cost === 0 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {item.cost === 0 ? 'חינם' : `$${item.cost.toFixed(2)}`}
                </div>
              </label>
            ))}
          </div>

          {/* Total cost + Execute button */}
          <div className="flex justify-between items-center p-4 rounded-xl bg-purple-500/15">
            <div>
              <span className="text-xs text-gray-400">עלות שינויים נבחרים: </span>
              <span className="text-xl font-bold text-purple-400">
                ${approvedCost.toFixed(2)}
              </span>
            </div>
            <button
              onClick={executeRevision}
              disabled={executing || !Object.values(approvedItems).some(v => v)}
              className="gradient-purple px-7 py-3 rounded-xl text-sm font-bold disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {executing
                ? 'מבצע שינויים...'
                : `בצע ${Object.values(approvedItems).filter(v => v).length} שינויים`
              }
            </button>
          </div>

          {revisionPlan.estimatedTime && (
            <p className="text-xs text-gray-500 text-center">
              זמן משוער: {revisionPlan.estimatedTime}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
