# Qiplim Studio — Infographic Widget Spec

> Derniere mise a jour : 17 avril 2026
>
> Widget INFOGRAPHIC — generation d'infographies educatives riches et interactives.

---

## 1. Vision

Transformer un document en une **infographie visuelle riche** : stats, comparaisons, timelines visuelles, diagrammes, hierarchies. Pas une simple image — un rendu interactif, responsive, editable et exportable.

**Etat actuel** : le widget INFOGRAPHIC fonctionne deja (template + generation LLM + rendu). Cette spec definit les ameliorations pour atteindre un niveau professionnel.

---

## 2. Etat actuel vs cible

| Aspect | Actuel | Cible |
|--------|--------|-------|
| Types de sections | 4 (stat, text, list, comparison) | 10+ (+ chart, timeline, hierarchy, quote, process, table) |
| Rendu | HTML/CSS basique | SVG + Canvas, animations, responsive |
| Diagrammes | Non | Mermaid + Recharts/D3 |
| Export | Non | PNG, SVG, PDF |
| Themes | 1 (colorScheme string) | 6+ themes visuels |
| Interactivite | Non | Hover tooltips, animations d'entree |
| Accessibilite | Non | Alt text, contraste WCAG AA |

---

## 3. Architecture de generation

### 3.1 Approche recommandee : LLM → structured JSON → render

```
Sources du studio
  |
  v
Step 1: ANALYSIS — LLM analyse le contenu et identifie les donnees visualisables
  (chiffres, comparaisons, processus, hierarchies, chronologies)
  |
  v
Step 2: STRUCTURE — LLM genere le JSON structure de l'infographie
  (sections typees avec les donnees extraites)
  |
  v
Step 3: RENDER — Frontend render chaque section avec le bon composant
  (StatCard, ChartSection, MermaidDiagram, TimelineVisual, etc.)
  |
  v
Step 4 (optionnel): EXPORT — Capture HTML → PNG/SVG/PDF
```

### 3.2 Pourquoi PAS de generation d'image (DALL-E/Midjourney)

| Critere | LLM → JSON → render | LLM → DALL-E image |
|---------|---------------------|---------------------|
| Texte lisible | ✅ Toujours lisible | ❌ Souvent illisible |
| Donnees exactes | ✅ Les chiffres sont corrects | ❌ Les chiffres sont inventes |
| Editable | ✅ L'utilisateur peut modifier | ❌ Image fixe |
| Responsive | ✅ S'adapte a l'ecran | ❌ Taille fixe |
| Accessible | ✅ Alt text, screen reader | ❌ Image opaque |
| Cout | ✅ 0 (rendu client) | $0.02-0.08 par image |

**Conclusion** : la generation d'image est inadaptee pour des infographies educatives. L'approche programmatique est superieure sur tous les criteres.

---

## 4. Types de sections enrichis

### 4.1 Sections actuelles (a conserver)

| Type | Description | Donnees |
|------|-------------|---------|
| `stat` | Chiffre cle avec label | `{ value, label, icon?, change?, changeLabel? }` |
| `text` | Paragraphe avec titre | `{ title, content }` |
| `list` | Liste a puces | `{ title, items[] }` |
| `comparison` | 2 colonnes cote a cote | `{ title, left: { label, items[] }, right: { label, items[] } }` |

### 4.2 Nouvelles sections

| Type | Description | Donnees |
|------|-------------|---------|
| `chart_bar` | Graphique en barres | `{ title, data: [{ label, value, color? }], unit? }` |
| `chart_pie` | Graphique camembert | `{ title, data: [{ label, value, color? }] }` |
| `chart_line` | Graphique en ligne | `{ title, series: [{ name, data: [{ x, y }] }], xLabel?, yLabel? }` |
| `timeline` | Frise chronologique horizontale | `{ title, events: [{ date, title, description? }] }` |
| `hierarchy` | Arbre / organigramme | `{ title, root: { label, children: Node[] } }` |
| `process` | Etapes d'un processus (fleches) | `{ title, steps: [{ title, description, icon? }] }` |
| `quote` | Citation mise en avant | `{ text, author, source? }` |
| `table` | Tableau de donnees | `{ title, headers: string[], rows: string[][] }` |
| `kpi_grid` | Grille de KPIs (2x2 ou 3x3) | `{ title, kpis: [{ value, label, trend?, icon? }] }` |
| `mermaid` | Diagramme Mermaid (flowchart, sequence, etc.) | `{ title, code: string }` |

### 4.3 Schema Zod enrichi

```typescript
export const InfographicSectionSchema = z.discriminatedUnion('type', [
  // Existants
  z.object({
    id: z.string(),
    type: z.literal('stat'),
    value: z.string(),
    label: z.string(),
    icon: z.string().optional(),
    change: z.string().optional(),         // "+15%", "-3"
    changeDirection: z.enum(['up', 'down', 'neutral']).optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal('text'),
    title: z.string().optional(),
    content: z.string(),
  }),
  z.object({
    id: z.string(),
    type: z.literal('list'),
    title: z.string().optional(),
    items: z.array(z.string()),
    ordered: z.boolean().optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal('comparison'),
    title: z.string().optional(),
    left: z.object({ label: z.string(), items: z.array(z.string()) }),
    right: z.object({ label: z.string(), items: z.array(z.string()) }),
  }),

  // Nouveaux
  z.object({
    id: z.string(),
    type: z.literal('chart_bar'),
    title: z.string().optional(),
    data: z.array(z.object({
      label: z.string(),
      value: z.number(),
      color: z.string().optional(),
    })),
    unit: z.string().optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal('chart_pie'),
    title: z.string().optional(),
    data: z.array(z.object({
      label: z.string(),
      value: z.number(),
      color: z.string().optional(),
    })),
  }),
  z.object({
    id: z.string(),
    type: z.literal('chart_line'),
    title: z.string().optional(),
    series: z.array(z.object({
      name: z.string(),
      data: z.array(z.object({ x: z.union([z.string(), z.number()]), y: z.number() })),
    })),
    xLabel: z.string().optional(),
    yLabel: z.string().optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal('timeline'),
    title: z.string().optional(),
    events: z.array(z.object({
      date: z.string(),
      title: z.string(),
      description: z.string().optional(),
    })),
  }),
  z.object({
    id: z.string(),
    type: z.literal('hierarchy'),
    title: z.string().optional(),
    root: z.lazy(() => hierarchyNodeSchema),
  }),
  z.object({
    id: z.string(),
    type: z.literal('process'),
    title: z.string().optional(),
    steps: z.array(z.object({
      title: z.string(),
      description: z.string().optional(),
      icon: z.string().optional(),
    })),
  }),
  z.object({
    id: z.string(),
    type: z.literal('quote'),
    text: z.string(),
    author: z.string(),
    source: z.string().optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal('table'),
    title: z.string().optional(),
    headers: z.array(z.string()),
    rows: z.array(z.array(z.string())),
  }),
  z.object({
    id: z.string(),
    type: z.literal('kpi_grid'),
    title: z.string().optional(),
    kpis: z.array(z.object({
      value: z.string(),
      label: z.string(),
      trend: z.enum(['up', 'down', 'neutral']).optional(),
      icon: z.string().optional(),
    })),
  }),
  z.object({
    id: z.string(),
    type: z.literal('mermaid'),
    title: z.string().optional(),
    code: z.string(),
  }),
]);

const hierarchyNodeSchema: z.ZodType<HierarchyNode> = z.object({
  label: z.string(),
  children: z.array(z.lazy(() => hierarchyNodeSchema)).optional(),
});
```

---

## 5. Themes visuels

```typescript
interface InfographicTheme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    muted: string;
    chart: string[];     // palette pour les graphiques
  };
  typography: {
    headingFont: string;
    bodyFont: string;
  };
  borderRadius: string;
}

const THEMES: InfographicTheme[] = [
  { id: 'blue', name: 'Ocean', colors: { primary: '#2563eb', ... } },
  { id: 'green', name: 'Forest', colors: { primary: '#059669', ... } },
  { id: 'purple', name: 'Amethyst', colors: { primary: '#7c3aed', ... } },
  { id: 'orange', name: 'Sunset', colors: { primary: '#ea580c', ... } },
  { id: 'dark', name: 'Midnight', colors: { primary: '#3b82f6', background: '#0f172a', ... } },
  { id: 'minimal', name: 'Clean', colors: { primary: '#18181b', ... } },
];
```

---

## 6. Composants de rendu

### 6.1 Architecture

```
InfographicDisplay
  |
  ├── InfographicHeader (titre, subtitle, theme badge)
  |
  ├── SectionRenderer (switch sur section.type)
  |   ├── StatSection → StatCard avec animation compteur
  |   ├── TextSection → prose avec typo soignee
  |   ├── ListSection → puces avec icones
  |   ├── ComparisonSection → 2 colonnes avec badges
  |   ├── ChartBarSection → Recharts BarChart
  |   ├── ChartPieSection → Recharts PieChart
  |   ├── ChartLineSection → Recharts LineChart
  |   ├── TimelineSection → frise horizontale SVG
  |   ├── HierarchySection → arbre SVG (reutiliser MindmapDisplay)
  |   ├── ProcessSection → fleches horizontales avec etapes
  |   ├── QuoteSection → blockquote stylisee
  |   ├── TableSection → tableau responsive
  |   ├── KpiGridSection → grille de metriques
  |   └── MermaidSection → mermaid-js render
  |
  └── InfographicFooter (source, date, branding)
```

### 6.2 Librairies de graphiques

| Librairie | Usage | Taille | Pourquoi |
|-----------|-------|--------|----------|
| **Recharts** | Bar, Pie, Line charts | ~50KB | React-native, responsive, bien documente |
| **mermaid** | Flowcharts, sequence, gantt | ~200KB | Standard industrie pour les diagrammes |
| Pas D3.js | Trop bas niveau pour ce use case | — | Recharts abstrait D3 |

### 6.3 Animations d'entree

- **Stats** : animation compteur de 0 a la valeur (IntersectionObserver)
- **Charts** : animation de drawing progressif
- **Lists** : items apparaissent un par un (stagger 100ms)
- **Process** : fleches se dessinent progressivement
- Toutes les animations via CSS (`@keyframes` + `animation-delay`)

---

## 7. System prompt pour la generation

```
Tu es un designer d'infographies educatives. Tu analyses un document et tu
extrais les informations les plus pertinentes pour une visualisation.

OBJECTIF : creer une infographie qui RESUME VISUELLEMENT le contenu.
Pas un texte reformate — une VUE SYNTHETIQUE avec des donnees, graphiques,
comparaisons et processus.

REGLES :
- 5 a 10 sections maximum
- Commencer par un stat ou kpi_grid pour accrocher (les chiffres cles)
- Inclure au moins 1 graphique (chart_bar, chart_pie, ou chart_line) si le
  document contient des donnees quantitatives
- Inclure 1 comparison si le document compare des concepts
- Inclure 1 process si le document decrit des etapes
- Inclure 1 mermaid si le document decrit une architecture ou un flux
- Terminer par un text (conclusion) ou une quote
- NE PAS inventer de chiffres — utiliser uniquement les donnees du document
- Si pas de donnees quantitatives, privilegier list, comparison, process, hierarchy

THEMES DISPONIBLES : blue, green, purple, orange, dark, minimal
Choisir le theme le plus adapte au sujet.

STYLE D'INFOGRAPHIE :
- {style} : "stats" (data-heavy), "overview" (vue d'ensemble), "process" (etapes),
  "comparison" (pour/contre), "educational" (pedagogique, avec definitions)
```

---

## 8. Export

### 8.1 Export PNG

```typescript
// Capture du DOM → Canvas → PNG via html2canvas
import html2canvas from 'html2canvas';

async function exportToPng(element: HTMLElement): Promise<Blob> {
  const canvas = await html2canvas(element, {
    scale: 2,           // retina
    useCORS: true,
    backgroundColor: theme.colors.background,
  });
  return new Promise(resolve => canvas.toBlob(blob => resolve(blob!), 'image/png'));
}
```

### 8.2 Export SVG

Pour les sections purement vectorielles (stats, process, timeline) :
- Generer un SVG serveur-side ou client-side
- Ideal pour l'impression et le scaling

### 8.3 Export PDF

```typescript
// Via jsPDF + html2canvas
import jsPDF from 'jspdf';

async function exportToPdf(element: HTMLElement): Promise<Blob> {
  const canvas = await html2canvas(element, { scale: 2 });
  const pdf = new jsPDF('p', 'mm', 'a4');
  const imgData = canvas.toDataURL('image/png');
  pdf.addImage(imgData, 'PNG', 10, 10, 190, 0);
  return pdf.output('blob');
}
```

---

## 9. Template de generation mis a jour

Mettre a jour `lib/widget-templates/templates/infographic-visual.json` :

```json
{
  "id": "qiplim/infographic-visual",
  "name": "Infographic",
  "version": "2.0.0",
  "description": "Generate a rich, interactive infographic from source content",
  "widgetType": "INFOGRAPHIC",
  "tags": ["static", "visualization", "data"],
  "schema": {
    "inputs": {
      "style": {
        "type": "string",
        "enum": ["stats", "overview", "process", "comparison", "educational"],
        "default": "overview"
      },
      "theme": {
        "type": "string",
        "enum": ["blue", "green", "purple", "orange", "dark", "minimal"],
        "default": "blue"
      },
      "maxSections": {
        "type": "integer",
        "minimum": 3,
        "maximum": 12,
        "default": 7
      },
      "includeCharts": {
        "type": "boolean",
        "default": true
      }
    }
  },
  "generation": {
    "mode": "single-step"
  },
  "rag": { "topK": 15, "rerank": true }
}
```

---

## 10. Dependances

- `recharts` : graphiques (bar, pie, line) — deja dans l'ecosysteme React
- `mermaid` : diagrammes — render client-side
- `html2canvas` : export PNG
- `jspdf` : export PDF (optionnel)
- Aucune dependance serveur supplementaire

---

## 11. Phases d'implementation

| Phase | Contenu | Effort |
|-------|---------|--------|
| 1 | Enrichir le schema Zod avec les 10 nouveaux types de sections | S |
| 2 | Composants de rendu : ChartBar, ChartPie, ChartLine (Recharts) | M |
| 3 | Composants de rendu : Timeline, Process, KpiGrid, Hierarchy | M |
| 4 | Composant MermaidSection (render mermaid-js) | S |
| 5 | Themes visuels (6 themes) | S |
| 6 | Animations d'entree (IntersectionObserver + CSS) | S |
| 7 | Export PNG/SVG/PDF | M |
| 8 | Mettre a jour le prompt de generation pour les nouveaux types | S |
| 9 | Editor enrichi (ajouter/supprimer/reordonner les sections) | M |
