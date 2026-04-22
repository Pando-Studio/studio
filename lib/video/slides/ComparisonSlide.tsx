import React from 'react';

interface ComparisonSlideProps {
  title?: string;
  subtitle?: string;
  content?: string;
  bullets?: string[];
  theme: { bg: string; text: string; accent: string };
}

export const ComparisonSlide: React.FC<ComparisonSlideProps> = ({
  title,
  subtitle,
  content,
  bullets,
  theme,
}) => {
  // Split content or bullets into two columns
  const leftItems = bullets ? bullets.slice(0, Math.ceil(bullets.length / 2)) : [];
  const rightItems = bullets ? bullets.slice(Math.ceil(bullets.length / 2)) : [];

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        background: theme.bg,
        padding: '100px 120px',
      }}
    >
      {title && (
        <h2
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: theme.text,
            marginBottom: 16,
            textAlign: 'center',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {title}
        </h2>
      )}
      {subtitle && (
        <p
          style={{
            fontSize: 24,
            color: theme.accent,
            textAlign: 'center',
            marginBottom: 48,
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {subtitle}
        </p>
      )}
      {bullets && bullets.length > 0 ? (
        <div style={{ display: 'flex', gap: 60 }}>
          {[leftItems, rightItems].map((items, col) => (
            <div key={col} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {items.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ fontSize: 24, color: theme.accent, fontWeight: 700 }}>•</span>
                  <span
                    style={{
                      fontSize: 24,
                      color: theme.accent,
                      lineHeight: 1.4,
                      fontFamily: 'Inter, system-ui, sans-serif',
                    }}
                  >
                    {item}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : content ? (
        <p
          style={{
            fontSize: 28,
            color: theme.accent,
            lineHeight: 1.6,
            textAlign: 'center',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {content}
        </p>
      ) : null}
    </div>
  );
};
