import React from 'react';

interface BulletsSlideProps {
  title?: string;
  bullets: string[];
  theme: { bg: string; text: string; accent: string };
}

export const BulletsSlide: React.FC<BulletsSlideProps> = ({ title, bullets, theme }) => {
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
            marginBottom: 48,
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {title}
        </h2>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {bullets.map((bullet, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <span
              style={{
                fontSize: 28,
                color: theme.accent,
                fontWeight: 700,
                minWidth: 20,
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              •
            </span>
            <span
              style={{
                fontSize: 28,
                color: theme.accent,
                lineHeight: 1.5,
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              {bullet}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
