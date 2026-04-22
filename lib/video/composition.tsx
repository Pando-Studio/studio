import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { SlideVisual, type SlideData } from './slides';
import type { VideoTheme } from './themes';

const TRANSITION_FRAMES = 15; // 0.5s at 30fps

interface SlideshowProps {
  slides: SlideData[];
  slideDurations: number[]; // duration in frames per slide
  theme: VideoTheme;
}

const CrossfadeIn: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, TRANSITION_FRAMES], [0, 1], {
    extrapolateRight: 'clamp',
  });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

export const SlideshowComposition: React.FC<SlideshowProps> = ({
  slides,
  slideDurations,
  theme,
}) => {
  let currentFrame = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {slides.map((slide, i) => {
        const startFrame = currentFrame;
        const duration = slideDurations[i];
        currentFrame += duration;

        return (
          <Sequence key={slide.id} from={startFrame} durationInFrames={duration}>
            {i > 0 ? (
              <CrossfadeIn>
                <AbsoluteFill>
                  <SlideVisual slide={slide} theme={theme} />
                </AbsoluteFill>
              </CrossfadeIn>
            ) : (
              <AbsoluteFill>
                <SlideVisual slide={slide} theme={theme} />
              </AbsoluteFill>
            )}
            {slide.audioUrl && (
              <Audio src={slide.audioUrl} />
            )}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
