import React from 'react';
import { Img } from 'remotion';

interface ImageSlideProps {
  title?: string;
  imageUrl?: string;
  content?: string;
  theme: { bg: string; text: string; accent: string };
}

export const ImageSlide: React.FC<ImageSlideProps> = ({ title, imageUrl, content, theme }) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: theme.bg,
      }}
    >
      {imageUrl && (
        <Img
          src={imageUrl}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        />
      )}
      {/* Dark overlay for text readability */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
          padding: '80px 120px 60px',
        }}
      >
        {title && (
          <h2
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: '#ffffff',
              marginBottom: content ? 16 : 0,
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            {title}
          </h2>
        )}
        {content && (
          <p
            style={{
              fontSize: 24,
              color: 'rgba(255,255,255,0.85)',
              lineHeight: 1.5,
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            {content}
          </p>
        )}
      </div>
    </div>
  );
};
