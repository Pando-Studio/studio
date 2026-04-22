import React from 'react';

interface TitleSlideProps {
  title: string;
  subtitle?: string;
  theme: { bg: string; text: string; accent: string };
}

export const TitleSlide: React.FC<TitleSlideProps> = ({ title, subtitle, theme }) => {
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
        padding: '120px 160px',
      }}
    >
      <h1
        style={{
          fontSize: 72,
          fontWeight: 800,
          color: theme.text,
          textAlign: 'center',
          lineHeight: 1.1,
          margin: 0,
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          style={{
            fontSize: 36,
            color: theme.accent,
            textAlign: 'center',
            marginTop: 32,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 400,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
};
