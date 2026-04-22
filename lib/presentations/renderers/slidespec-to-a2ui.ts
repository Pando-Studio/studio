import type { SlideSpec, SlideBlock, SlideLayout, SlideIntent } from '../schemas';

/**
 * A2UI Document Types
 * Based on TipTap/ProseMirror JSON structure with custom nodes for slides
 */

export interface A2UINode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: A2UINode[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

export interface A2UIDocument {
  type: 'doc';
  content: A2UINode[];
}

export type ViewMode = 'edit' | 'speaker' | 'viewer';

/**
 * Renders a SlideSpec to A2UI document format
 * This is a deterministic renderer - no LLM calls needed
 */
export function renderSlideSpecToA2UI(
  spec: SlideSpec,
  view: ViewMode = 'edit'
): A2UIDocument {
  const content: A2UINode[] = [];

  // Add slide container with layout
  const slideContainer: A2UINode = {
    type: 'slideContainer',
    attrs: {
      layout: spec.layout,
      intent: spec.intent,
      slideId: spec.id,
    },
    content: [],
  };

  // Render blocks based on layout
  const renderedBlocks = renderBlocksForLayout(spec.blocks, spec.layout);
  slideContainer.content = renderedBlocks;

  // Add activity slot if present
  if (spec.slots?.activity) {
    slideContainer.content?.push({
      type: 'activitySlot',
      attrs: {
        allowed: spec.slots.activity.allowed,
        childWidgetId: spec.slots.activity.childWidgetId,
      },
    });
  }

  content.push(slideContainer);

  // Add speaker notes in edit/speaker mode
  if ((view === 'edit' || view === 'speaker') && spec.speakerNotes) {
    content.push({
      type: 'speakerNotes',
      attrs: {
        visible: view === 'speaker',
      },
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: spec.speakerNotes }],
        },
      ],
    });
  }

  return {
    type: 'doc',
    content,
  };
}

/**
 * Render blocks according to the layout
 */
function renderBlocksForLayout(blocks: SlideBlock[], layout: SlideLayout): A2UINode[] {
  switch (layout) {
    case 'two-columns':
      return renderTwoColumnsLayout(blocks);
    case 'media-left':
      return renderMediaLayout(blocks, 'left');
    case 'media-right':
      return renderMediaLayout(blocks, 'right');
    case 'media-center':
      return renderMediaCenterLayout(blocks);
    case 'full-media':
      return renderFullMediaLayout(blocks);
    case 'simple':
    default:
      return renderSimpleLayout(blocks);
  }
}

/**
 * Simple layout - blocks stacked vertically
 */
function renderSimpleLayout(blocks: SlideBlock[]): A2UINode[] {
  return blocks.map(renderBlock);
}

/**
 * Two columns layout
 */
function renderTwoColumnsLayout(blocks: SlideBlock[]): A2UINode[] {
  const heading = blocks.find((b) => b.type === 'heading');
  const otherBlocks = blocks.filter((b) => b.type !== 'heading');

  const result: A2UINode[] = [];

  if (heading) {
    result.push(renderBlock(heading));
  }

  // Split remaining blocks into two columns
  const midpoint = Math.ceil(otherBlocks.length / 2);
  const leftBlocks = otherBlocks.slice(0, midpoint);
  const rightBlocks = otherBlocks.slice(midpoint);

  result.push({
    type: 'columns',
    attrs: { count: 2 },
    content: [
      {
        type: 'column',
        content: leftBlocks.map(renderBlock),
      },
      {
        type: 'column',
        content: rightBlocks.map(renderBlock),
      },
    ],
  });

  return result;
}

/**
 * Media layout (left or right)
 */
function renderMediaLayout(blocks: SlideBlock[], position: 'left' | 'right'): A2UINode[] {
  const imageBlock = blocks.find((b) => b.type === 'image');
  const heading = blocks.find((b) => b.type === 'heading');
  const otherBlocks = blocks.filter((b) => b.type !== 'image' && b.type !== 'heading');

  const result: A2UINode[] = [];

  if (heading) {
    result.push(renderBlock(heading));
  }

  const mediaColumn: A2UINode = {
    type: 'column',
    attrs: { width: '40%' },
    content: imageBlock ? [renderBlock(imageBlock)] : [],
  };

  const contentColumn: A2UINode = {
    type: 'column',
    attrs: { width: '60%' },
    content: otherBlocks.map(renderBlock),
  };

  result.push({
    type: 'columns',
    attrs: { count: 2 },
    content: position === 'left' ? [mediaColumn, contentColumn] : [contentColumn, mediaColumn],
  });

  return result;
}

/**
 * Media center layout
 */
function renderMediaCenterLayout(blocks: SlideBlock[]): A2UINode[] {
  const imageBlock = blocks.find((b) => b.type === 'image');
  const heading = blocks.find((b) => b.type === 'heading');
  const otherBlocks = blocks.filter((b) => b.type !== 'image' && b.type !== 'heading');

  const result: A2UINode[] = [];

  if (heading) {
    result.push(renderBlock(heading));
  }

  if (imageBlock) {
    result.push({
      type: 'mediaContainer',
      attrs: { align: 'center' },
      content: [renderBlock(imageBlock)],
    });
  }

  result.push(...otherBlocks.map(renderBlock));

  return result;
}

/**
 * Full media layout with overlay
 */
function renderFullMediaLayout(blocks: SlideBlock[]): A2UINode[] {
  const imageBlock = blocks.find((b) => b.type === 'image');
  const heading = blocks.find((b) => b.type === 'heading');
  const textBlocks = blocks.filter((b) => b.type === 'text' || b.type === 'heading');

  return [
    {
      type: 'fullMediaSlide',
      attrs: {
        backgroundImage: imageBlock && 'ref' in imageBlock ? imageBlock.ref?.url : undefined,
      },
      content: [
        {
          type: 'textOverlay',
          attrs: { position: 'center' },
          content: textBlocks.map(renderBlock),
        },
      ],
    },
  ];
}

/**
 * Render a single block to A2UI node
 */
function renderBlock(block: SlideBlock): A2UINode {
  switch (block.type) {
    case 'heading':
      return renderHeading(block);
    case 'text':
      return renderText(block);
    case 'bullets':
      return renderBullets(block);
    case 'numbered':
      return renderNumbered(block);
    case 'grid':
      return renderGrid(block);
    case 'image':
      return renderImage(block);
    case 'quote':
      return renderQuote(block);
    case 'statistic':
      return renderStatistic(block);
    default:
      return { type: 'paragraph', content: [] };
  }
}

function renderHeading(block: { type: 'heading'; level: 1 | 2 | 3; text: string }): A2UINode {
  return {
    type: 'heading',
    attrs: { level: block.level },
    content: [{ type: 'text', text: block.text }],
  };
}

function renderText(block: { type: 'text'; content: string; emphasis?: boolean }): A2UINode {
  const textNode: A2UINode = { type: 'text', text: block.content };

  if (block.emphasis) {
    textNode.marks = [{ type: 'bold' }];
  }

  return {
    type: 'paragraph',
    content: [textNode],
  };
}

function renderBullets(block: { type: 'bullets'; items: string[] }): A2UINode {
  return {
    type: 'bulletList',
    content: block.items.map((item) => ({
      type: 'listItem',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: item }],
        },
      ],
    })),
  };
}

function renderNumbered(block: { type: 'numbered'; items: string[] }): A2UINode {
  return {
    type: 'orderedList',
    content: block.items.map((item) => ({
      type: 'listItem',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: item }],
        },
      ],
    })),
  };
}

function renderGrid(block: { type: 'grid'; cells: Array<{ heading: string; content: string; icon?: string; statistic?: string }> }): A2UINode {
  return {
    type: 'smartLayoutGrid',
    attrs: {
      columns: Math.min(block.cells.length, 4),
    },
    content: block.cells.map((cell) => ({
      type: 'smartLayoutCell',
      content: [
        ...(cell.icon
          ? [
              {
                type: 'icon',
                attrs: { name: cell.icon },
              } as A2UINode,
            ]
          : []),
        ...(cell.statistic
          ? [
              {
                type: 'statistic',
                attrs: { value: cell.statistic },
                content: [{ type: 'text', text: cell.statistic }],
              } as A2UINode,
            ]
          : []),
        {
          type: 'heading',
          attrs: { level: 3 },
          content: [{ type: 'text', text: cell.heading }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: cell.content }],
        },
      ],
    })),
  };
}

function renderImage(block: { type: 'image'; ref: { id?: string; url?: string; prompt?: string }; caption?: string }): A2UINode {
  return {
    type: 'imageBlock',
    attrs: {
      src: block.ref.url || '',
      alt: block.caption || '',
      assetId: block.ref.id,
      pending: !block.ref.url && !!block.ref.prompt,
    },
    content: block.caption
      ? [
          {
            type: 'caption',
            content: [{ type: 'text', text: block.caption }],
          },
        ]
      : [],
  };
}

function renderQuote(block: { type: 'quote'; text: string; attribution?: string }): A2UINode {
  return {
    type: 'blockquote',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: block.text }],
      },
      ...(block.attribution
        ? [
            {
              type: 'paragraph',
              attrs: { class: 'attribution' },
              content: [
                { type: 'text', text: '— ' },
                { type: 'text', text: block.attribution, marks: [{ type: 'italic' }] },
              ],
            } as A2UINode,
          ]
        : []),
    ],
  };
}

function renderStatistic(block: { type: 'statistic'; value: string; label: string; icon?: string }): A2UINode {
  return {
    type: 'statisticBlock',
    attrs: {
      icon: block.icon,
    },
    content: [
      {
        type: 'statisticValue',
        content: [{ type: 'text', text: block.value }],
      },
      {
        type: 'statisticLabel',
        content: [{ type: 'text', text: block.label }],
      },
    ],
  };
}

/**
 * Batch render multiple slides
 */
export function renderSlidesToA2UI(
  slides: SlideSpec[],
  view: ViewMode = 'edit'
): A2UIDocument[] {
  return slides.map((slide) => renderSlideSpecToA2UI(slide, view));
}

/**
 * Render a presentation with all slides into a single document
 */
export function renderPresentationToA2UI(
  slides: SlideSpec[],
  view: ViewMode = 'edit'
): A2UIDocument {
  return {
    type: 'doc',
    content: slides.map((slide) => ({
      type: 'slide',
      attrs: {
        id: slide.id,
        intent: slide.intent,
        layout: slide.layout,
      },
      content: renderSlideSpecToA2UI(slide, view).content,
    })),
  };
}
