import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import useJobStore from '../store/useJobStore';
import type {
  EditStyle,
  VideoModel,
  VideoType,
  PresetType,
  VoiceoverStyle,
  CaptionTemplate,
  UserOptions,
  BrandKit,
  PresetAutoConfig,
  RecommendedConfig,
  OptionState,
} from '../types';
import FileUpload from '../components/FileUpload';
import SourceDocumentUpload from '../components/SourceDocumentUpload';
import AITwinPhotoUpload from '../components/AITwinPhotoUpload';
import PromptInput from '../components/PromptInput';
import PresetSelector from '../components/PresetSelector';
import ModelSelector from '../components/ModelSelector';
import EditStyleSelector from '../components/EditStyleSelector';
import ProOptions, { OPTIONS_LABELS } from '../components/ProOptions';
import CaptionTemplatePicker from '../components/CaptionTemplatePicker';
import VoiceoverStyleSelector from '../components/VoiceoverStyleSelector';
import LanguageSelector from '../components/LanguageSelector';
import StoryPageCount from '../components/StoryPageCount';
import DurationPicker from '../components/DurationPicker';
import LogoUpload from '../components/LogoUpload';
import BrandKitEditor from '../components/BrandKitEditor';
import LiveCostBreakdown from '../components/LiveCostBreakdown';
import { calculateLiveCost } from '../utils/costCalculator';
import { PRESETS } from '../components/PresetSelector';

export default function EditorPage() {
  const { mode } = useParams<{ mode: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { createJob, isLoading, loadBrandKit } = useJobStore();

  const isUpload = mode === 'upload';
  const isPrompt = mode === 'prompt';

  const [files, setFiles] = useState<File[]>([]);
  const [sourceDocument, setSourceDocument] = useState<File | null>(null);
  const [aiTwinPhoto, setAiTwinPhoto] = useState<File | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
  const [projectName, setProjectName] = useState('');
  const [preset, setPreset] = useState<PresetType>('freeform');
  const [videoModel, setVideoModel] = useState<VideoModel>('veo-3.1-fast');
  const [editStyle, setEditStyle] = useState<EditStyle>('cinematic');
  const [videoType, setVideoType] = useState<VideoType>('paid-ad');
  const [voiceoverStyle, setVoiceoverStyle] = useState<VoiceoverStyle>('narrator');
  const [captionTemplate, setCaptionTemplate] = useState<CaptionTemplate>('classic');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [storyPages, setStoryPages] = useState(3);
  const [targetDuration, setTargetDuration] = useState<number | undefined>(undefined);
  const defaultOptions: UserOptions = {
    removeSilences: true,
    addBRoll: true,
    hebrewSubtitles: true,
    englishSubtitles: false,
    backgroundMusic: false,
    energeticMusic: false,
    calmMusic: false,
    soundEffects: false,
    colorCorrection: true,
    autoZoom: true,
    transitions: false,
    intro: false,
    outro: false,
    logoWatermark: false,
    thumbnailGeneration: false,
    viralityScore: false,
    aiTwin: false,
    aiBackground: false,
    backgroundBlur: false,
    cinematic: false,
    eyeContact: true,
    calmProfessional: false,
    trendy: false,
    lowerThirds: false,
    aiSoundEffects: false,
    kineticTypography: false,
    musicSync: false,
    trendingSounds: false,
  };
  const [options, setOptions] = useState<UserOptions>(defaultOptions);
  const [brandKit, setBrandKit] = useState<BrandKit>({
    primaryColor: '#7c3aed',
    secondaryColor: '#3b82f6',
    font: 'Heebo',
    enabled: false,
  });
  const [brainConfig, setBrainConfig] = useState<RecommendedConfig | null>(null);
  const [userOverrides, setUserOverrides] = useState<Record<string, boolean>>({});
  const [optionStates, setOptionStates] = useState<Record<string, OptionState>>({});
  const [animatingOptions, setAnimatingOptions] = useState<Set<string>>(new Set());
  const [isCustomized, setIsCustomized] = useState(false);
  const [presetBanner, setPresetBanner] = useState<{ count: number; label: string } | null>(null);
  const prevOptionsRef = useRef<UserOptions>(defaultOptions);
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadBrandKit().then((kit) => {
      if (kit) setBrandKit(kit);
    });
  }, [loadBrandKit]);

  // Auto-apply Brain recommendations when navigating from PreviewPage
  useEffect(() => {
    const jobId = searchParams.get('jobId');
    const fromBrain = searchParams.get('fromBrain');
    if (!jobId || !fromBrain) return;

    const stored = sessionStorage.getItem(`brain-config-${jobId}`);
    if (!stored) return;

    try {
      const config: RecommendedConfig = JSON.parse(stored);
      setBrainConfig(config);

      // Use model ID directly (now uses full IDs like 'veo-3.1-fast')
      if (config.model) setVideoModel(config.model);
      setEditStyle(config.editStyle);
      setTargetDuration(config.suggestedDuration);
      if (config.subtitleStyle) setCaptionTemplate(config.subtitleStyle as CaptionTemplate);
      const newOptions = { ...defaultOptions, ...config.enabledOptions } as UserOptions;
      setOptions(newOptions);

      // Build option states for brain source
      const newStates: Record<string, OptionState> = {};
      for (const key of Object.keys(defaultOptions)) {
        const enabled = (newOptions as Record<string, boolean>)[key] || false;
        newStates[key] = { enabled, source: 'brain', presetDefault: enabled };
      }
      setOptionStates(newStates);
    } catch {
      // Invalid stored config
    }
  }, [searchParams]);

  const toggleOption = useCallback((key: keyof UserOptions) => {
    setOptions((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      // Mutual exclusivity
      if (key === 'energeticMusic' && next.energeticMusic) next.calmMusic = false;
      if (key === 'calmMusic' && next.calmMusic) next.energeticMusic = false;
      if (key === 'cinematic' && next.cinematic) next.trendy = false;
      if (key === 'trendy' && next.trendy) next.cinematic = false;
      if (key === 'backgroundBlur' && next.backgroundBlur) next.aiBackground = false;
      if (key === 'aiBackground' && next.aiBackground) next.backgroundBlur = false;
      return next;
    });

    // Track user override
    setIsCustomized(true);
    setUserOverrides((prev) => ({ ...prev, [key]: !options[key] }));

    // Update option state to reflect user source
    setOptionStates((prev) => ({
      ...prev,
      [key]: {
        enabled: !options[key],
        source: 'user' as const,
        presetDefault: prev[key]?.presetDefault ?? false,
      },
    }));
  }, [options]);

  const handleResetToBrain = useCallback(() => {
    if (!brainConfig) return;
    if (brainConfig.model) setVideoModel(brainConfig.model);
    setEditStyle(brainConfig.editStyle);
    setTargetDuration(brainConfig.suggestedDuration);
    if (brainConfig.subtitleStyle) setCaptionTemplate(brainConfig.subtitleStyle as CaptionTemplate);
    const newOptions = { ...defaultOptions, ...brainConfig.enabledOptions } as UserOptions;
    setOptions(newOptions);
    setUserOverrides({});

    // Rebuild option states
    const newStates: Record<string, OptionState> = {};
    for (const key of Object.keys(defaultOptions)) {
      const enabled = (newOptions as Record<string, boolean>)[key] || false;
      newStates[key] = { enabled, source: 'brain', presetDefault: enabled };
    }
    setOptionStates(newStates);
  }, [brainConfig]);

  const handleResetToPreset = useCallback(() => {
    const presetDef = PRESETS.find((p) => p.id === preset);
    if (!presetDef?.autoConfig?.options) return;

    const newOptions = { ...defaultOptions, ...presetDef.autoConfig.options };
    setOptions(newOptions);
    setUserOverrides({});

    // Rebuild option states for preset source
    const newStates: Record<string, OptionState> = {};
    for (const key of Object.keys(defaultOptions)) {
      const presetValue = (presetDef.autoConfig.options as Record<string, boolean>)[key] || false;
      newStates[key] = { enabled: (newOptions as Record<string, boolean>)[key], source: 'preset', presetDefault: presetValue };
    }
    setOptionStates(newStates);
  }, [preset]);

  // Auto-set videoType based on preset selection
  const PRESET_TO_VIDEO_TYPE: Record<string, VideoType> = {
    'tiktok': 'organic',
    'instagram_ad': 'paid-ad',
    'promo': 'paid-ad',
    'product': 'product-demo',
    'real_estate': 'real-estate-tour',
    'testimonials': 'testimonial',
    'freeform': 'paid-ad',
    'multi_story': 'organic',
    'from_document': 'explainer',
    'dubbing': 'paid-ad',
  };

  const handlePresetChange = useCallback((p: PresetType, text: string, autoConfig?: PresetAutoConfig) => {
    const prevOpts = { ...options };
    setPreset(p);
    if (text) setPrompt(text);

    // Auto-set videoType from preset
    if (PRESET_TO_VIDEO_TYPE[p]) {
      setVideoType(PRESET_TO_VIDEO_TYPE[p]);
    }

    // Apply auto-config from preset
    if (autoConfig) {
      if (autoConfig.editStyle) setEditStyle(autoConfig.editStyle);
      if (typeof autoConfig.duration === 'number') setTargetDuration(autoConfig.duration);
      if (autoConfig.targetLanguage) setTargetLanguage(autoConfig.targetLanguage);
      if (autoConfig.storyPages) setStoryPages(autoConfig.storyPages);

      // Replace options entirely with preset defaults + overrides (clean config per preset)
      if (autoConfig.options) {
        const newOptions = { ...defaultOptions, ...autoConfig.options };
        setOptions(newOptions);

        // Build option states for preset
        const newStates: Record<string, OptionState> = {};
        const changedKeys = new Set<string>();
        let enabledCount = 0;

        for (const key of Object.keys(defaultOptions)) {
          const presetValue = (autoConfig.options as Record<string, boolean>)[key] || false;
          const newValue = (newOptions as Record<string, boolean>)[key];
          const oldValue = (prevOpts as Record<string, boolean>)[key];
          newStates[key] = { enabled: newValue, source: 'preset', presetDefault: presetValue };
          if (newValue !== oldValue) changedKeys.add(key);
          if (presetValue) enabledCount++;
        }
        setOptionStates(newStates);

        // Clear user overrides when switching presets
        setUserOverrides({});
        setIsCustomized(false);

        // Animate changed options
        if (changedKeys.size > 0) {
          setAnimatingOptions(new Set(changedKeys));
          if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
          animationTimerRef.current = setTimeout(() => setAnimatingOptions(new Set()), 600);
        }

        // Show preset banner
        const presetDef = PRESETS.find((pd) => pd.id === p);
        if (presetDef && enabledCount > 0) {
          setPresetBanner({ count: enabledCount, label: presetDef.label });
          setTimeout(() => setPresetBanner(null), 4000);
        }
      }
    } else {
      // Freeform or no autoConfig — reset states
      setOptionStates({});
      setUserOverrides({});
      setIsCustomized(false);
      setPresetBanner(null);
    }

    prevOptionsRef.current = options;
  }, [options]);

  // Calculate override summary
  const overrideCount = Object.keys(userOverrides).length;
  const addedByUser = useMemo(() =>
    Object.entries(userOverrides).filter(([key, val]) => val && !optionStates[key]?.presetDefault),
    [userOverrides, optionStates]
  );
  const removedByUser = useMemo(() =>
    Object.entries(userOverrides).filter(([key, val]) => !val && optionStates[key]?.presetDefault),
    [userOverrides, optionStates]
  );

  // Live cost calculation — recalculates on every selection change
  const liveCost = useMemo(() => {
    return calculateLiveCost({
      model: videoModel,
      duration: targetDuration ?? 60,
      options: options as unknown as Record<string, boolean>,
      editStyle,
      voiceoverStyle: isPrompt ? voiceoverStyle : undefined,
      preset,
      aiTwin: options.aiTwin,
      aiDubbing: preset === 'dubbing',
      voiceClone: false,
      hasFiles: isUpload ? files.length > 0 : false,
    });
  }, [videoModel, targetDuration, options, editStyle, voiceoverStyle, preset, files.length, isUpload, isPrompt]);

  const isValid = isUpload ? files.length > 0 : prompt.trim().length > 0;

  const handleSubmit = async () => {
    if (!isValid) return;
    const fd = new FormData();
    fd.append('mode', mode || 'upload');
    fd.append('prompt', prompt);
    fd.append('projectName', projectName || 'פרויקט ללא שם');
    fd.append('preset', preset);
    fd.append('videoModel', videoModel);
    fd.append('editStyle', editStyle);
    fd.append('videoType', videoType);
    fd.append('options', JSON.stringify(options));
    if (voiceoverStyle && isPrompt) fd.append('voiceoverStyle', voiceoverStyle);
    if (options.hebrewSubtitles) fd.append('captionTemplate', captionTemplate);
    if (targetDuration !== undefined) fd.append('targetDuration', String(targetDuration));
    if (preset === 'dubbing') fd.append('targetLanguage', targetLanguage);
    if (preset === 'multi_story') fd.append('storyPages', String(storyPages));
    if (brandKit.enabled) fd.append('brandKit', JSON.stringify(brandKit));

    // Send user overrides so the Brain can respect them
    if (overrideCount > 0) {
      const presetDef = PRESETS.find((pd) => pd.id === preset);
      const presetDefaults = presetDef?.autoConfig?.options || {};
      fd.append('userOverrides', JSON.stringify(userOverrides));
      fd.append('presetDefaults', JSON.stringify(presetDefaults));
    }
    if (isCustomized) fd.append('isCustomized', 'true');

    files.forEach((f) => fd.append('files', f));
    if (logo) fd.append('logo', logo);
    if (sourceDocument) fd.append('sourceDocument', sourceDocument);
    if (aiTwinPhoto) fd.append('aiTwinPhoto', aiTwinPhoto);

    try {
      const jobId = await createJob(fd);
      navigate(`/jobs/${jobId}/preview`);
    } catch {
      // error already in store
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg pb-32">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-dark-bg/80 backdrop-blur-lg border-b border-dark-border-light/30">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            → חזרה
          </button>
          <h1 className="text-lg font-bold">
            {isUpload ? '📁 העלאה ועריכה' : '✨ יצירה מפרומפט'}
          </h1>
          <div className="w-16" />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 mt-6 space-y-8">
        {/* Brain recommendations banner */}
        {brainConfig && (
          <div className="bg-accent-purple/10 border border-accent-purple/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🧠</span>
                <span className="text-sm text-accent-purple-light font-medium">
                  ההגדרות מולאו לפי המלצות המוח
                </span>
                {overrideCount > 0 && (
                  <span className="text-[10px] text-amber-400 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                    שינית {overrideCount} הגדרות
                  </span>
                )}
              </div>
              {overrideCount > 0 && (
                <button
                  onClick={handleResetToBrain}
                  className="text-[11px] text-accent-purple-light hover:underline"
                >
                  חזור להמלצות המוח
                </button>
              )}
            </div>
          </div>
        )}

        {/* Preset selection banner */}
        {presetBanner && (
          <div className="bg-accent-purple/10 border border-accent-purple/30 rounded-xl p-3 text-center preset-banner-enter">
            <p className="text-sm text-accent-purple-light font-medium">
              המערכת בחרה {presetBanner.count} אפשרויות לתבנית {presetBanner.label}
              {isCustomized && (
                <span className="inline-block mr-2 text-[10px] text-amber-400 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                  מותאם אישית
                </span>
              )}
            </p>
          </div>
        )}

        {/* Project Name */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">שם הפרויקט</label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="פרויקט חדש"
            className="w-full bg-dark-card border border-dark-border-light rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-accent-purple transition-colors"
          />
        </div>

        {/* File Upload (upload mode) */}
        {isUpload && <FileUpload files={files} onChange={setFiles} />}

        {/* Source Document (prompt mode) */}
        {isPrompt && (
          <SourceDocumentUpload file={sourceDocument} onChange={setSourceDocument} />
        )}

        {/* AI Twin Photo (prompt mode) */}
        {isPrompt && (
          <AITwinPhotoUpload file={aiTwinPhoto} onChange={setAiTwinPhoto} />
        )}

        {/* Prompt */}
        <PromptInput value={prompt} onChange={setPrompt} />

        {/* Presets */}
        <PresetSelector selected={preset} onSelect={handlePresetChange} />

        {/* Model */}
        <ModelSelector selected={videoModel} onSelect={setVideoModel} />

        {/* Edit Style */}
        <EditStyleSelector selected={editStyle} onSelect={setEditStyle} />

        {/* Video Type */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">סוג סרטון:</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {([
              { value: 'paid-ad', label: 'פרסומת ממומנת', icon: '💰' },
              { value: 'organic', label: 'תוכן אורגני', icon: '🌱' },
              { value: 'explainer', label: 'הסבר/מדריך', icon: '📖' },
              { value: 'testimonial', label: 'המלצה/עדות', icon: '⭐' },
              { value: 'product-demo', label: 'דמו מוצר', icon: '📦' },
              { value: 'real-estate-tour', label: 'סיור נדל"ן', icon: '🏠' },
            ] as const).map(vt => (
              <button
                key={vt.value}
                type="button"
                onClick={() => setVideoType(vt.value)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-colors ${
                  videoType === vt.value
                    ? 'border-accent-purple bg-accent-purple/10 text-white'
                    : 'border-dark-border-light bg-dark-card text-gray-400 hover:border-gray-600'
                }`}
              >
                <span>{vt.icon}</span>
                <span>{vt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Pro Options */}
        <ProOptions
          options={options}
          onToggle={toggleOption}
          optionStates={optionStates}
          animatingOptions={animatingOptions}
          activePreset={preset !== 'freeform' ? preset : null}
        />

        {/* Overrides summary */}
        {overrideCount > 0 && preset !== 'freeform' && (
          <div className="bg-dark-card border border-amber-500/20 rounded-xl p-4 space-y-2">
            <p className="text-sm text-amber-300 font-medium">
              שינית {overrideCount} אפשרויות מהתבנית:
            </p>
            {addedByUser.length > 0 && (
              <p className="text-xs text-green-400">
                + הוספת: {addedByUser.map(([k]) => OPTIONS_LABELS[k] || k).join(', ')}
              </p>
            )}
            {removedByUser.length > 0 && (
              <p className="text-xs text-red-400">
                - הסרת: {removedByUser.map(([k]) => OPTIONS_LABELS[k] || k).join(', ')}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleResetToPreset}
                className="text-[11px] text-accent-purple-light hover:underline"
              >
                ↩️ חזור לתבנית
              </button>
              {brainConfig && (
                <button
                  onClick={handleResetToBrain}
                  className="text-[11px] text-teal-400 hover:underline"
                >
                  🧠 חזור להמלצות המוח
                </button>
              )}
            </div>
          </div>
        )}

        {/* Caption Template (conditional) */}
        {options.hebrewSubtitles && (
          <CaptionTemplatePicker selected={captionTemplate} onSelect={setCaptionTemplate} />
        )}

        {/* Voiceover Style (prompt mode) */}
        {isPrompt && (
          <VoiceoverStyleSelector selected={voiceoverStyle} onSelect={setVoiceoverStyle} />
        )}

        {/* Language (dubbing) */}
        {preset === 'dubbing' && (
          <LanguageSelector selected={targetLanguage} onSelect={setTargetLanguage} />
        )}

        {/* Story Pages (multi_story) */}
        {preset === 'multi_story' && (
          <StoryPageCount count={storyPages} onSelect={setStoryPages} />
        )}

        {/* Duration */}
        <DurationPicker selected={targetDuration} onSelect={setTargetDuration} />

        {/* Logo */}
        <LogoUpload file={logo} onChange={setLogo} />

        {/* Brand Kit */}
        <BrandKitEditor kit={brandKit} onChange={setBrandKit} />

        {/* Submit */}
        <div className="pt-4 pb-8">
          <button
            onClick={handleSubmit}
            disabled={!isValid || isLoading}
            className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-300 ${
              isValid && !isLoading
                ? 'gradient-purple hover:opacity-90 glow-purple cursor-pointer'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isLoading ? 'שולח...' : 'התחל עיבוד 🚀'}
          </button>
          {!isValid && (
            <p className="text-center text-gray-600 text-sm mt-2">
              {isUpload ? 'יש להעלות לפחות קובץ אחד' : 'יש להזין תיאור לסרטון'}
            </p>
          )}
        </div>
      </div>

      {/* Live Cost Breakdown — sticky footer */}
      <LiveCostBreakdown items={liveCost.items} total={liveCost.total} />
    </div>
  );
}
