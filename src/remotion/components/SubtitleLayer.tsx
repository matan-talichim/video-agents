import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { SubtitleEntry, SubtitleStyleConfig, BrandKitConfig } from '../types';

interface Props {
  entry: SubtitleEntry;
  style: SubtitleStyleConfig;
  brandKit?: BrandKitConfig;
}

export const SubtitleLayer: React.FC<Props> = ({ entry, style, brandKit }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const accentColor = brandKit?.accentColor || style.highlightColor || '#7c3aed';
  const fontFamily = brandKit?.fontFamily || style.fontFamily || 'Heebo, Arial, sans-serif';

  const positionStyle = getPositionStyle(style.position);

  return (
    <div style={{
      ...positionStyle,
      direction: 'rtl',
      textAlign: 'center',
      padding: '0 40px',
    }}>
      <div style={{
        display: 'inline-block',
        padding: style.template === 'black-bg' ? '12px 24px' : '8px 16px',
        borderRadius: 8,
        backgroundColor: style.template === 'black-bg' ? 'rgba(0,0,0,0.75)' :
                          style.template === 'minimal' ? 'transparent' : 'rgba(0,0,0,0.5)',
      }}>
        {renderByTemplate(entry, style, frame, fps, accentColor, fontFamily)}
      </div>
    </div>
  );
};

function renderByTemplate(
  entry: SubtitleEntry,
  style: SubtitleStyleConfig,
  frame: number,
  fps: number,
  accentColor: string,
  fontFamily: string
): React.ReactNode {
  switch (style.template) {
    case 'word-by-word':
      return renderWordByWord(entry, frame, fps, accentColor, fontFamily, style.fontSize);
    case 'highlight':
      return renderHighlight(entry, frame, fps, accentColor, fontFamily, style.fontSize);
    case 'karaoke':
      return renderKaraoke(entry, frame, fps, accentColor, fontFamily, style.fontSize);
    case 'bounce':
      return renderBounce(entry, frame, fps, accentColor, fontFamily, style.fontSize);
    case 'typewriter':
      return renderTypewriter(entry, frame, fps, fontFamily, style.fontSize);
    case 'bold-center':
      return renderBoldCenter(entry, frame, fps, fontFamily, style.fontSize);
    case 'gradient':
      return renderGradient(entry, frame, fps, accentColor, fontFamily, style.fontSize);
    case 'neon':
      return renderNeon(entry, frame, fps, accentColor, fontFamily, style.fontSize);
    case 'minimal':
    default:
      return renderMinimal(entry, fontFamily, style.fontSize);
  }
}

// Word-by-word: each word appears when spoken, stays visible
function renderWordByWord(
  entry: SubtitleEntry, frame: number, fps: number,
  accentColor: string, fontFamily: string, fontSize: number
): React.ReactNode {
  return (
    <span style={{ fontFamily, fontSize, lineHeight: 1.4 }}>
      {entry.words.map((word, i) => {
        const localFrame = frame; // frame is already relative to Sequence
        const isVisible = localFrame >= (word.startFrame - entry.words[0].startFrame);
        const isHighlight = entry.highlightWords.includes(word.word.replace(/[.,!?]/g, ''));

        // Spring animation for appearance
        const scale = isVisible ? spring({
          frame: localFrame - (word.startFrame - entry.words[0].startFrame),
          fps,
          config: { damping: 12, stiffness: 200 },
        }) : 0;

        const opacity = isVisible ? interpolate(
          localFrame - (word.startFrame - entry.words[0].startFrame),
          [0, 3],
          [0, 1],
          { extrapolateRight: 'clamp' }
        ) : 0;

        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              color: isHighlight ? accentColor : '#ffffff',
              fontWeight: isHighlight ? 700 : 500,
              opacity,
              transform: `scale(${scale})`,
              marginLeft: 6,
              textShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }}
          >
            {word.word}
          </span>
        );
      })}
    </span>
  );
}

// Highlight: all words visible, keyword highlighted with colored background
function renderHighlight(
  entry: SubtitleEntry, frame: number, fps: number,
  accentColor: string, fontFamily: string, fontSize: number
): React.ReactNode {
  return (
    <span style={{ fontFamily, fontSize, color: '#ffffff', lineHeight: 1.6 }}>
      {entry.words.map((word, i) => {
        const isHighlight = entry.highlightWords.includes(word.word.replace(/[.,!?]/g, ''));

        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              marginLeft: 5,
              padding: isHighlight ? '2px 8px' : '0',
              backgroundColor: isHighlight ? accentColor : 'transparent',
              borderRadius: isHighlight ? 4 : 0,
              fontWeight: isHighlight ? 700 : 400,
              textShadow: isHighlight ? 'none' : '0 2px 6px rgba(0,0,0,0.5)',
            }}
          >
            {word.word}
          </span>
        );
      })}
    </span>
  );
}

// Karaoke: words light up as they're spoken
function renderKaraoke(
  entry: SubtitleEntry, frame: number, fps: number,
  accentColor: string, fontFamily: string, fontSize: number
): React.ReactNode {
  return (
    <span style={{ fontFamily, fontSize, lineHeight: 1.4 }}>
      {entry.words.map((word, i) => {
        const wordStart = word.startFrame - entry.words[0].startFrame;
        const wordEnd = word.endFrame - entry.words[0].startFrame;
        const isCurrent = frame >= wordStart && frame <= wordEnd;
        const isPast = frame > wordEnd;

        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              marginLeft: 5,
              color: isCurrent ? accentColor : isPast ? '#ffffff' : 'rgba(255,255,255,0.4)',
              fontWeight: isCurrent ? 700 : 400,
              transform: isCurrent ? 'scale(1.15)' : 'scale(1)',
              transition: 'all 0.1s',
              textShadow: isCurrent ? `0 0 20px ${accentColor}40` : '0 2px 6px rgba(0,0,0,0.5)',
            }}
          >
            {word.word}
          </span>
        );
      })}
    </span>
  );
}

// Bounce: words bounce in one by one
function renderBounce(
  entry: SubtitleEntry, frame: number, fps: number,
  accentColor: string, fontFamily: string, fontSize: number
): React.ReactNode {
  return (
    <span style={{ fontFamily, fontSize, lineHeight: 1.4 }}>
      {entry.words.map((word, i) => {
        const wordStart = word.startFrame - entry.words[0].startFrame;
        const isVisible = frame >= wordStart;
        const isHighlight = entry.highlightWords.includes(word.word.replace(/[.,!?]/g, ''));

        const bounceY = isVisible ? spring({
          frame: frame - wordStart,
          fps,
          config: { damping: 8, stiffness: 150, mass: 0.5 },
        }) : 0;

        const translateY = interpolate(bounceY, [0, 1], [30, 0]);

        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              marginLeft: 5,
              color: isHighlight ? accentColor : '#ffffff',
              fontWeight: isHighlight ? 700 : 500,
              opacity: isVisible ? 1 : 0,
              transform: `translateY(${translateY}px)`,
              textShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }}
          >
            {word.word}
          </span>
        );
      })}
    </span>
  );
}

// Typewriter: characters appear one by one
function renderTypewriter(
  entry: SubtitleEntry, frame: number, fps: number,
  fontFamily: string, fontSize: number
): React.ReactNode {
  const totalChars = entry.text.length;
  const totalFrames = entry.endFrame - entry.startFrame;
  const charsToShow = Math.floor((frame / totalFrames) * totalChars * 1.5);
  const visibleText = entry.text.slice(0, Math.min(charsToShow, totalChars));

  return (
    <span style={{
      fontFamily, fontSize, color: '#ffffff', fontWeight: 500,
      textShadow: '0 2px 8px rgba(0,0,0,0.5)',
    }}>
      {visibleText}
      {charsToShow < totalChars && (
        <span style={{ opacity: frame % (fps / 4) < fps / 8 ? 1 : 0 }}>|</span>
      )}
    </span>
  );
}

// Bold center: large bold text, simple fade in
function renderBoldCenter(
  entry: SubtitleEntry, frame: number, fps: number,
  fontFamily: string, fontSize: number
): React.ReactNode {
  const opacity = interpolate(frame, [0, 5], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <span style={{
      fontFamily, fontSize: fontSize * 1.3, color: '#ffffff', fontWeight: 700,
      opacity, textShadow: '0 3px 12px rgba(0,0,0,0.6)',
    }}>
      {entry.text}
    </span>
  );
}

// Gradient: text with gradient color
function renderGradient(
  entry: SubtitleEntry, frame: number, fps: number,
  accentColor: string, fontFamily: string, fontSize: number
): React.ReactNode {
  const opacity = interpolate(frame, [0, 5], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <span style={{
      fontFamily, fontSize, fontWeight: 600, opacity,
      background: `linear-gradient(135deg, #ffffff, ${accentColor})`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      textShadow: 'none',
    }}>
      {entry.text}
    </span>
  );
}

// Neon: glowing text effect
function renderNeon(
  entry: SubtitleEntry, frame: number, fps: number,
  accentColor: string, fontFamily: string, fontSize: number
): React.ReactNode {
  const glowIntensity = 10 + Math.sin(frame * 0.1) * 5;

  return (
    <span style={{
      fontFamily, fontSize, fontWeight: 600, color: accentColor,
      textShadow: `0 0 ${glowIntensity}px ${accentColor}, 0 0 ${glowIntensity * 2}px ${accentColor}40, 0 0 ${glowIntensity * 3}px ${accentColor}20`,
    }}>
      {entry.text}
    </span>
  );
}

// Minimal: simple white text
function renderMinimal(entry: SubtitleEntry, fontFamily: string, fontSize: number): React.ReactNode {
  return (
    <span style={{
      fontFamily, fontSize, color: '#ffffff', fontWeight: 400,
      textShadow: '0 1px 4px rgba(0,0,0,0.5)',
    }}>
      {entry.text}
    </span>
  );
}

// Position helper
function getPositionStyle(position: string): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'absolute', left: 0, right: 0, display: 'flex', justifyContent: 'center',
  };

  switch (position) {
    case 'top': return { ...base, top: 60 };
    case 'center': return { ...base, top: '50%', transform: 'translateY(-50%)' };
    case 'bottom':
    default: return { ...base, bottom: 80 };
  }
}
