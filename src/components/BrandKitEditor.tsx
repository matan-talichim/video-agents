import { useState, useRef } from 'react';
import type { BrandKit, ExtractedBrandKit } from '../types';
import useJobStore from '../store/useJobStore';

interface Props {
  kit: BrandKit;
  onChange: (kit: BrandKit) => void;
}

const FONTS = ['Heebo', 'Assistant', 'Rubik', 'Secular One', 'Noto Sans Hebrew'];

const TYPOGRAPHY_LABELS: Record<string, string> = {
  modern: 'מודרני',
  classic: 'קלאסי',
  bold: 'בולט',
  elegant: 'אלגנטי',
  playful: 'שובב',
  minimal: 'מינימלי',
};

const MOOD_LABELS: Record<string, string> = {
  professional: 'מקצועי',
  energetic: 'אנרגטי',
  calm: 'רגוע',
  luxury: 'יוקרתי',
  friendly: 'ידידותי',
  corporate: 'עסקי',
  creative: 'יצירתי',
};

export default function BrandKitEditor({ kit, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const { saveBrandKit } = useJobStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedKit, setExtractedKit] = useState<ExtractedBrandKit | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = (partial: Partial<BrandKit>) => {
    onChange({ ...kit, ...partial });
  };

  const handleSave = () => {
    saveBrandKit(kit);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    // Upload and analyze
    setIsAnalyzing(true);
    setExtractedKit(null);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const res = await fetch('/api/brand-kit/analyze-logo', {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) throw new Error('Analysis failed');
      const data = await res.json();
      if (data.success && data.extractedKit) {
        setExtractedKit(data.extractedKit);
      }
    } catch (err) {
      console.error('Logo analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyExtractedKit = (editable: boolean) => {
    if (!extractedKit) return;
    const updated: BrandKit = {
      ...kit,
      primaryColor: extractedKit.primaryColor,
      secondaryColor: extractedKit.secondaryColor,
      accentColor: extractedKit.accentColor,
      backgroundColor: extractedKit.backgroundColor,
      font: extractedKit.suggestedFont,
      typography: extractedKit.typography,
      mood: extractedKit.mood,
      description: extractedKit.description,
      enabled: true,
    };
    onChange(updated);
    saveBrandKit(updated);
    if (!editable) {
      setExtractedKit(null);
    }
  };

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <span className={`transition-transform ${open ? 'rotate-90' : ''}`}>◀</span>
        ערכת מותג
      </button>

      {open && (
        <div className="mt-3 bg-dark-card border border-dark-border-light rounded-xl p-4 space-y-4">
          {/* Logo Upload Area */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">העלה לוגו לחילוץ ערכת מותג</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-dark-border-light rounded-xl p-4 text-center cursor-pointer hover:border-accent-purple/50 transition-colors"
            >
              {logoPreview ? (
                <div className="flex items-center justify-center gap-3">
                  <img src={logoPreview} alt="Logo" className="w-12 h-12 object-contain rounded" />
                  <span className="text-xs text-gray-400">לחץ להחלפת לוגו</span>
                </div>
              ) : (
                <div>
                  <div className="text-2xl mb-1">🖼️</div>
                  <p className="text-xs text-gray-500">לחץ להעלאת לוגו (PNG, JPG, SVG)</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              className="hidden"
              onChange={handleLogoUpload}
            />
          </div>

          {/* Analyzing spinner */}
          {isAnalyzing && (
            <div className="flex items-center justify-center gap-2 py-4">
              <div className="animate-spin w-5 h-5 border-2 border-accent-purple border-t-transparent rounded-full" />
              <span className="text-sm text-gray-400">מנתח את הלוגו...</span>
            </div>
          )}

          {/* Extracted Kit Results */}
          {extractedKit && !isAnalyzing && (
            <div className="bg-dark-bg border border-accent-purple/30 rounded-xl p-4 space-y-3">
              <h4 className="text-sm font-semibold text-accent-purple-light">זיהינו את המותג שלך:</h4>

              {/* Color swatches */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'ראשי', color: extractedKit.primaryColor },
                  { label: 'משני', color: extractedKit.secondaryColor },
                  { label: 'הדגשה', color: extractedKit.accentColor },
                  { label: 'רקע', color: extractedKit.backgroundColor },
                ].map((c) => (
                  <div key={c.label} className="text-center">
                    <div
                      className="w-full h-8 rounded-lg border border-dark-border-light mb-1"
                      style={{ backgroundColor: c.color }}
                    />
                    <span className="text-[10px] text-gray-500 block">{c.label}</span>
                    <span className="text-[10px] text-gray-400 font-mono">{c.color}</span>
                  </div>
                ))}
              </div>

              {/* Typography & Mood badges */}
              <div className="flex flex-wrap gap-2">
                <span className="text-[10px] px-2 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/20">
                  {TYPOGRAPHY_LABELS[extractedKit.typography] || extractedKit.typography}
                </span>
                <span className="text-[10px] px-2 py-1 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/20">
                  {MOOD_LABELS[extractedKit.mood] || extractedKit.mood}
                </span>
                <span className="text-[10px] px-2 py-1 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/20">
                  {extractedKit.suggestedFont}
                </span>
              </div>

              {/* Description */}
              <p className="text-xs text-gray-400 leading-relaxed">{extractedKit.description}</p>

              {/* Confidence */}
              <div className="flex items-center gap-2">
                <div className="h-1 flex-1 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
                    style={{ width: `${extractedKit.confidence * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-500">
                  ביטחון: {Math.round(extractedKit.confidence * 100)}%
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => applyExtractedKit(false)}
                  className="flex-1 text-xs gradient-purple px-3 py-2 rounded-lg hover:opacity-90 transition-opacity"
                >
                  אשר ערכת מותג
                </button>
                <button
                  onClick={() => applyExtractedKit(true)}
                  className="flex-1 text-xs bg-dark-card border border-dark-border-light px-3 py-2 rounded-lg hover:border-gray-500 transition-colors text-gray-300"
                >
                  ערוך ידנית
                </button>
              </div>
            </div>
          )}

          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm">הפעלת ערכת מותג</label>
            <button
              onClick={() => update({ enabled: !kit.enabled })}
              className={`w-10 h-5 rounded-full flex items-center transition-colors ${
                kit.enabled ? 'bg-accent-purple' : 'bg-gray-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  kit.enabled ? 'translate-x-0.5' : 'translate-x-[22px]'
                }`}
              />
            </button>
          </div>

          {/* Color pickers */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">צבע ראשי</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={kit.primaryColor}
                  onChange={(e) => update({ primaryColor: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                />
                <span className="text-xs text-gray-400">{kit.primaryColor}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">צבע משני</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={kit.secondaryColor}
                  onChange={(e) => update({ secondaryColor: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                />
                <span className="text-xs text-gray-400">{kit.secondaryColor}</span>
              </div>
            </div>
            {kit.accentColor && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">צבע הדגשה</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={kit.accentColor}
                    onChange={(e) => update({ accentColor: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                  />
                  <span className="text-xs text-gray-400">{kit.accentColor}</span>
                </div>
              </div>
            )}
            {kit.backgroundColor && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">צבע רקע</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={kit.backgroundColor}
                    onChange={(e) => update({ backgroundColor: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                  />
                  <span className="text-xs text-gray-400">{kit.backgroundColor}</span>
                </div>
              </div>
            )}
          </div>

          {/* Font selector */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">פונט</label>
            <select
              value={kit.font}
              onChange={(e) => update({ font: e.target.value })}
              className="w-full bg-dark-bg border border-dark-border-light rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-purple appearance-none cursor-pointer"
            >
              {FONTS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          {/* Typography & Mood display */}
          {(kit.typography || kit.mood) && (
            <div className="flex flex-wrap gap-2">
              {kit.typography && (
                <span className="text-[10px] px-2 py-1 rounded-full bg-purple-500/10 text-purple-300">
                  טיפוגרפיה: {TYPOGRAPHY_LABELS[kit.typography] || kit.typography}
                </span>
              )}
              {kit.mood && (
                <span className="text-[10px] px-2 py-1 rounded-full bg-blue-500/10 text-blue-300">
                  מצב רוח: {MOOD_LABELS[kit.mood] || kit.mood}
                </span>
              )}
            </div>
          )}

          {/* Description */}
          {kit.description && (
            <p className="text-xs text-gray-500 leading-relaxed">{kit.description}</p>
          )}

          <button
            onClick={handleSave}
            className="text-xs gradient-purple px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
          >
            שמור ערכת מותג
          </button>
        </div>
      )}
    </div>
  );
}
