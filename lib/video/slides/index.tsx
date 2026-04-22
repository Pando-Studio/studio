import React from 'react';
import { TitleSlide } from './TitleSlide';
import { ContentSlide } from './ContentSlide';
import { BulletsSlide } from './BulletsSlide';
import { QuoteSlide } from './QuoteSlide';
import { ComparisonSlide } from './ComparisonSlide';
import { ImageSlide } from './ImageSlide';
import type { VideoTheme } from '../themes';

export interface SlideData {
  id: string;
  order: number;
  layout: string;
  title?: string;
  subtitle?: string;
  bullets?: string[];
  content?: string;
  imageUrl?: string;
  narration: string;
  durationHint: number;
  audioUrl?: string;
}

interface SlideVisualProps {
  slide: SlideData;
  theme: VideoTheme;
}

export const SlideVisual: React.FC<SlideVisualProps> = ({ slide, theme }) => {
  switch (slide.layout) {
    case 'title':
      return <TitleSlide title={slide.title ?? ''} subtitle={slide.subtitle} theme={theme} />;
    case 'bullets':
      return (
        <BulletsSlide title={slide.title} bullets={slide.bullets ?? []} theme={theme} />
      );
    case 'quote':
      return <QuoteSlide content={slide.content ?? slide.title ?? ''} subtitle={slide.subtitle} theme={theme} />;
    case 'comparison':
      return (
        <ComparisonSlide
          title={slide.title}
          subtitle={slide.subtitle}
          content={slide.content}
          bullets={slide.bullets}
          theme={theme}
        />
      );
    case 'image':
      return (
        <ImageSlide
          title={slide.title}
          imageUrl={slide.imageUrl}
          content={slide.content}
          theme={theme}
        />
      );
    case 'content':
    default:
      return (
        <ContentSlide title={slide.title} content={slide.content ?? slide.narration} theme={theme} />
      );
  }
};
