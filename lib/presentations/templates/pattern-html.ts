import type { TPatternId } from '../types';

export const SIMPLE_PATTERN_HTML = `<div
  data-type="layout-node"
  data-layout="content-only"
>
  <div data-type="accent-node">
    <figure
      data-type="imageBlockLayout"
      data-fit="cover"
    >
      <img src="" />
    </figure>
  </div>
  <div
    data-type="body-node"
    data-vertical-align="center"
    style="--card-vertical-align: center"
  >
    <!-- OBLIGATOIRE: titre -->
    <h1
      style="text-align: center"
      level="1"
      data-type="heading"
      data-agent-role="slide-title"
      class="heading-display title"
    ></h1>

    <!-- FACULTATIF: subtitle, paragraph (repetables) -->
  </div>
</div>
`;

export const SMART_LAYOUT_PATTERN_HTML = `<div
  data-type="layout-node"
  data-layout="content-only"
>
  <div data-type="accent-node">
    <figure
      data-type="imageBlockLayout"
      data-fit="cover"
    >
      <img src="" />
    </figure>
  </div>
  <div
    data-type="body-node"
    data-vertical-align="center"
    style="--card-vertical-align: center"
  >
    <!-- OBLIGATOIRE: titre -->
    <h2
      style="text-align: center"
      level="2"
      data-type="heading"
      data-agent-role="slide-title"
      class="heading-display title"
    ></h2>

    <!-- FACULTATIF: paragraph, subtitle -->

    <!-- OBLIGATOIRE: smart-layout -->
    <div
      data-type="smart-layout"
      data-variant="framed"
      data-color="primaryColor"
      data-descendant-align="flex-start"
    >
      <!-- Cellules repetables-->
      <div
        data-type="smart-layout-cell"
        data-statistic="75"
      >
        <h3
          style="text-align: left"
          level="3"
          data-type="heading"
          data-agent-role="cell-heading"
        ></h3>
        <p
          style="text-align: left"
          data-font-size="md"
          data-agent-role="cell-content"
        ></p>
      </div>
    </div>

    <!-- FACULTATIF: paragraph, subtitle -->
  </div>
</div>
`;

export const MEDIA_PATTERN_HTML = `<div
  data-type="layout-node"
  data-layout="content-only"
>
  <div data-type="accent-node">
    <figure
      data-type="imageBlockLayout"
      data-fit="cover"
    >
      <img src="" />
    </figure>
  </div>
  <div
    data-type="body-node"
    data-vertical-align="center"
    style="--card-vertical-align: center"
  >
    <!-- OBLIGATOIRE: titre -->
    <h1
      style="text-align: center"
      level="1"
      data-type="heading"
      data-agent-role="slide-title"
      class="heading-display title"
    ></h1>
    <!-- FACULTATIF: subtitle, paragraph (repetables) -->

    <!-- OBLIGATOIRE: MEDIA -->
    <div data-type="media-placeholder" data-variant="image" data-align="center" data-is-generating="false"></div>

    <!-- FACULTATIF: subtitle, paragraph (repetables) -->
  </div>
</div>
`;

export const INTERACTIVE_PATTERN_HTML = `<div
  data-type="layout-node"
  data-layout="content-only"
>
  <div
    data-type="body-node"
    data-vertical-align="center"
    style="--card-vertical-align: center"
  >
    <div data-type="widget-placeholder" data-widget-type="" data-widget-id=""></div>
  </div>
</div>
`;

export const PATTERN_HTML_MAP: Record<TPatternId, string> = {
  simple: SIMPLE_PATTERN_HTML,
  'smart-layout': SMART_LAYOUT_PATTERN_HTML,
  media: MEDIA_PATTERN_HTML,
  interactive: INTERACTIVE_PATTERN_HTML,
};

export function getPatternHtml(patternId: TPatternId): string | null {
  return PATTERN_HTML_MAP[patternId] || null;
}

// Optional nodes that can be inserted into patterns
export const OPTIONAL_NODES = {
  subtitle: {
    h2: `<h2
      style="text-align: center"
      level="2"
      data-type="heading"
    ></h2>`,
    h3: `<h3
      style="text-align: center"
      level="3"
      data-type="heading"
    ></h3>`,
  },
  paragraph: `<p
    style="text-align: center"
    data-font-size="md"
  ></p>`,
  emphasis: `<p
    style="text-align: center"
    data-font-size="lg"
    data-emphasis="true"
  ></p>`,
  list: `<ul data-type="bulletList">
    <li data-type="listItem"><p></p></li>
  </ul>`,
};

export function getOptionalNodesDocumentation(): string {
  return `# Noeuds optionnels disponibles

## subtitle (h2)
Utilise pour les sous-titres importants.
\`\`\`html
${OPTIONAL_NODES.subtitle.h2}
\`\`\`

## subtitle (h3)
Utilise pour les sous-titres secondaires.
\`\`\`html
${OPTIONAL_NODES.subtitle.h3}
\`\`\`

## paragraph
Utilise pour les paragraphes de texte.
\`\`\`html
${OPTIONAL_NODES.paragraph}
\`\`\`

## emphasis
Utilise pour mettre en valeur un texte important.
\`\`\`html
${OPTIONAL_NODES.emphasis}
\`\`\`

Attributs autorises:
- style: text-align (center, left, right)
- data-font-size: sm, md, lg, xl
- level: 1, 2, 3 (pour headings)
`;
}
