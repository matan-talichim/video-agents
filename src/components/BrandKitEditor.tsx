import { useState } from 'react';
import type { BrandKit } from '../types';
import useJobStore from '../store/useJobStore';

interface Props {
  kit: BrandKit;
  onChange: (kit: BrandKit) => void;
}

const FONTS = ['Heebo', 'Assistant', 'Rubik', 'Secular One', 'Noto Sans Hebrew'];

export default function BrandKitEditor({ kit, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const { saveBrandKit } = useJobStore();

  const update = (partial: Partial<BrandKit>) => {
    onChange({ ...kit, ...partial });
  };

  const handleSave = () => {
    saveBrandKit(kit);
  };

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <span className={`transition-transform ${open ? 'rotate-90' : ''}`}>◀</span>
        🎨 ערכת מותג
      </button>

      {open && (
        <div className="mt-3 bg-dark-card border border-dark-border-light rounded-xl p-4 space-y-4">
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
          </div>

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
