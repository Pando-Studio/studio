'use client';

interface SlideRendererProps {
  html: string;
  title: string;
}

export function SlideRenderer({ html, title }: SlideRendererProps) {
  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Slide frame */}
      <div className="aspect-video bg-white rounded-lg shadow-lg overflow-hidden border">
        {/* Slide content */}
        <div
          className="w-full h-full p-8 slide-content"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>

      {/* Slide info */}
      <div className="mt-4 text-center">
        <p className="text-sm text-muted-foreground">{title}</p>
      </div>

      {/* Styles for slide rendering */}
      <style jsx global>{`
        .slide-content {
          font-family: system-ui, -apple-system, sans-serif;
        }

        .slide-content [data-type="layout-node"] {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .slide-content [data-type="body-node"] {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 2rem;
        }

        .slide-content [data-type="accent-node"] {
          display: none;
        }

        .slide-content [data-layout="image-top"] [data-type="accent-node"],
        .slide-content [data-layout="image-right"] [data-type="accent-node"],
        .slide-content [data-layout="image-bottom"] [data-type="accent-node"],
        .slide-content [data-layout="image-left"] [data-type="accent-node"] {
          display: block;
        }

        .slide-content h1 {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 1rem;
          line-height: 1.2;
        }

        .slide-content h2 {
          font-size: 2rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
          line-height: 1.3;
        }

        .slide-content h3 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          line-height: 1.4;
        }

        .slide-content p {
          font-size: 1.25rem;
          line-height: 1.6;
          margin-bottom: 1rem;
          color: #374151;
        }

        .slide-content [data-type="smart-layout"] {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-top: 1.5rem;
        }

        .slide-content [data-type="smart-layout-cell"] {
          padding: 1.5rem;
          background: #f9fafb;
          border-radius: 0.75rem;
          border: 1px solid #e5e7eb;
        }

        .slide-content [data-type="smart-layout-cell"] h3 {
          font-size: 1.125rem;
          margin-bottom: 0.5rem;
        }

        .slide-content [data-type="smart-layout-cell"] p {
          font-size: 1rem;
          color: #6b7280;
          margin-bottom: 0;
        }

        .slide-content [data-type="media-placeholder"] {
          aspect-ratio: 16/9;
          background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
          border-radius: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 1.5rem 0;
        }

        .slide-content [data-type="media-placeholder"]::after {
          content: "Image";
          color: #6366f1;
          font-size: 1.25rem;
          font-weight: 500;
        }

        .slide-content [data-type="widget-placeholder"] {
          aspect-ratio: 16/9;
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border-radius: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 1.5rem 0;
        }

        .slide-content [data-type="widget-placeholder"]::after {
          content: "Widget interactif";
          color: #d97706;
          font-size: 1.25rem;
          font-weight: 500;
        }

        .slide-content ul,
        .slide-content ol {
          margin: 1rem 0;
          padding-left: 1.5rem;
        }

        .slide-content li {
          font-size: 1.125rem;
          line-height: 1.8;
          color: #374151;
        }

        .slide-content [data-type="icon"] {
          width: 2rem;
          height: 2rem;
          margin-bottom: 0.5rem;
          color: #6366f1;
        }
      `}</style>
    </div>
  );
}
