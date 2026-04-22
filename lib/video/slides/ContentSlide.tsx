import React from 'react';

interface ContentSlideProps {
  title?: string;
  content: string;
  theme: { bg: string; text: string; accent: string };
}

export const ContentSlide: React.FC<ContentSlideProps> = ({ title, content, theme }) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        background: theme.bg,
        padding: '100px 160px',
      }}
    >
      {title && (
        <h2
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: theme.text,
            marginBottom: 40,
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {title}
        </h2>
      )}
      <p
        style={{
          fontSize: 28,
          color: theme.accent,
          lineHeight: 1.6,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontWeight: 400,
        }}
      >
        {content}
      </p>
    </div>
  );
};
