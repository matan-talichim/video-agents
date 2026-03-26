import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import useJobStore from '../store/useJobStore';
import type {
  EditStyle,
  VideoModel,
  PresetType,
  VoiceoverStyle,
  CaptionTemplate,
  UserOptions,
  BrandKit,
  PresetAutoConfig,
  RecommendedConfig,
} from '../types';
import FileUpload from '../components/FileUpload';
import SourceDocumentUpload from '../components/SourceDocumentUpload';
import AITwinPhotoUpload from '../components/AITwinPhotoUpload';
import PromptInput from '../components/PromptInput';
import PresetSelector from '../components/PresetSelector';
import ModelSelector from '../components/ModelSelector';
import EditStyleSelector from '../components/EditStyleSelector';
import ProOptions from '../components/ProOptions';
import CaptionTemplatePicker from '../components/CaptionTemplatePicker';
import VoiceoverStyleSelector from '../components/VoiceoverStyleSelector';
import LanguageSelector from '../components/LanguageSelector';
import StoryPageCount from '../components/StoryPageCount';
import DurationPicker from '../components/DurationPicker';
import LogoUpload from '../components/LogoUpload';
import BrandKitEditor from '../components/BrandKitEditor';
import LiveCostBreakdown from '../components/LiveCostBreakdown';
import { calculateLiveCost } from '../utils/costCalculator';

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
  const [videoModel, setVideoModel] = useState<VideoModel>('kling2.5');
  const [editStyle, setEditStyle] = useState<EditStyle>('cinematic');
  const [voiceoverStyle, setVoiceoverStyle] = useState<VoiceoverStyle>('narrator');
  const [captionTemplate, setCaptionTemplate] = useState<CaptionTemplate>('classic');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [storyPages, setStoryPages] = useState(3);
  const [targetDuration, setTargetDuration] = useState<number | undefined>(undefined);
  const defaultOptions: UserOptions = {
    removeSilences: true,
    addBRoll: false,
    hebrewSubtitles: true,
    englishSubtitles: false,
    backgroundMusic: false,
    energeticMusic: false,
    calmMusic: false,
    soundEffects: false,
    colorCorrection: false,
    autoZoom: false,
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
    eyeContact: false,
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
  const [userOverrides, setUserOverrides] = useState<Set<string>>(new Set());

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

      // Map model name to VideoModel type
      const modelMap: Record<string, VideoModel> = {
        'veo-3.1-fast': 'veo3.1',
        'sora-2': 'sora2',
        'kling-v2.5-turbo': 'kling2.5',
        'wan-2.5': 'wan2.5',
        'seedance-1.5-pro': 'seedance1.5',
      };
      if (modelMap[config.model]) setVideoModel(modelMap[config.model]);
      setEditStyle(config.editStyle);
      setTargetDuration(config.suggestedDuration);
      if (config.subtitleStyle) setCaptionTemplate(config.subtitleStyle as CaptionTemplate);
      setOptions({ ...defaultOptions, ...config.enabledOptions } as UserOptions);
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
      return next;
    });
    // Track that user overrode this option
    if (brainConfig) {
      setUserOverrides((prev) => new Set(prev).add(key));
    }
  }, [brainConfig]);

  const handleResetToBrain = useCallback(() => {
    if (!brainConfig) return;
    const modelMap: Record<string, VideoModel> = {
      'veo-3.1-fast': 'veo3.1',
      'sora-2': 'sora2',
      'kling-v2.5-turbo': 'kling2.5',
      'wan-2.5': 'wan2.5',
      'seedance-1.5-pro': 'seedance1.5',
    };
    if (modelMap[brainConfig.model]) setVideoModel(modelMap[brainConfig.model]);
    setEditStyle(brainConfig.editStyle);
    setTargetDuration(brainConfig.suggestedDuration);
    if (brainConfig.subtitleStyle) setCaptionTemplate(brainConfig.subtitleStyle as CaptionTemplate);
    setOptions({ ...defaultOptions, ...brainConfig.enabledOptions } as UserOptions);
    setUserOverrides(new Set());
  }, [brainConfig]);

  const handlePresetChange = useCallback((p: PresetType, text: string, autoConfig?: PresetAutoConfig) => {
    setPreset(p);
    if (text) setPrompt(text);

    // Apply auto-config from preset
    if (autoConfig) {
      if (autoConfig.editStyle) setEditStyle(autoConfig.editStyle);
      if (typeof autoConfig.duration === 'number') setTargetDuration(autoConfig.duration);
      if (autoConfig.targetLanguage) setTargetLanguage(autoConfig.targetLanguage);
      if (autoConfig.storyPages) setStoryPages(autoConfig.storyPages);

      // Replace options entirely with preset defaults + overrides (clean config per preset)
      if (autoConfig.options) {
        setOptions({ ...defaultOptions, ...autoConfig.options });
      }
    }
  }, []);

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
    fd.append('options', JSON.stringify(options));
    if (voiceoverStyle && isPrompt) fd.append('voiceoverStyle', voiceoverStyle);
    if (options.hebrewSubtitles) fd.append('captionTemplate', captionTemplate);
    if (targetDuration !== undefined) fd.append('targetDuration', String(targetDuration));
    if (preset === 'dubbing') fd.append('targetLanguage', targetLanguage);
    if (preset === 'multi_story') fd.append('storyPages', String(storyPages));
    if (brandKit.enabled) fd.append('brandKit', JSON.stringify(brandKit));

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
                {userOverrides.size > 0 && (
                  <span className="text-[10px] text-amber-400 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                    שינית {userOverrides.size} הגדרות
                  </span>
                )}
              </div>
              {userOverrides.size > 0 && (
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

        {/* Pro Options */}
        <ProOptions options={options} onToggle={toggleOption} />

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
