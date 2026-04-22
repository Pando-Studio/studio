import React from 'react';

interface QuoteSlideProps {
  content: string;
  subtitle?: string;
  theme: { bg: string; text: string; accent: string };
}

export const QuoteSlide: React.FC<QuoteSlideProps> = ({ content, subtitle, theme }) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: theme.bg,
        padding: '120px 200px',
      }}
    >
      <span
        style={{
          fontSize: 120,
          color: theme.accent,
          opacity: 0.3,
          lineHeight: 0.8,
          fontFamily: 'Georgia, serif',
        }}
      >
        "
      </span>
      <p
        style={{
          fontSize: 36,
          color: theme.text,
          textAlign: 'center',
          fontStyle: 'italic',
          lineHeight: 1.5,
          marginTop: -20,
          fontFamily: 'Georgia, serif',
        }}
      >
        {content}
      </p>
      {subtitle && (
        <p
          style={{
            fontSize: 24,
            color: theme.accent,
            marginTop: 32,
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          — {subtitle}
        </p>
      )}
    </div>
  );
};
