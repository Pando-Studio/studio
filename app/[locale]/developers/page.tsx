'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  ArrowRight,
  BookOpen,
  Bot,
  Braces,
  Code2,
  Copy,
  Check,
  ExternalLink,
  FileJson,
  Github,
  Key,
  Layers,
  Search,
  Server,
  Terminal,
  Zap,
  HelpCircle,
  CheckSquare,
  Cloud,
  StickyNote,
  BarChart3,
  Users,
  Headphones,
  Brain,
  FileText,
  Table2,
  Image,
  ListChecks,
  CalendarDays,
  GraduationCap,
  Clock,
  MessageCircle,
  Video,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { LanguageSwitcher } from '@/components/language-switcher';

/* -------------------------------------------------------------------------- */
/*  Widget type data (matches llms.txt -- 24 types)                           */
/* -------------------------------------------------------------------------- */

interface WidgetTypeInfo {
  slug: string;
  name: string;
  description: string;
  icon: LucideIcon;
  category: 'interactive' | 'static' | 'media' | 'pedagogical';
}

const widgetTypes: WidgetTypeInfo[] = [
  // Interactive
  { slug: 'quiz-interactive', name: 'Quiz', description: 'Multiple-choice quiz with scoring and explanations', icon: HelpCircle, category: 'interactive' },
  { slug: 'qcm-evaluation', name: 'QCM Evaluation', description: 'Set of multiple-choice questions with correction', icon: CheckSquare, category: 'interactive' },
  { slug: 'multiple-choice-interactive', name: 'Multiple Choice', description: 'Multiple-choice questions with feedback', icon: CheckSquare, category: 'interactive' },
  { slug: 'wordcloud-interactive', name: 'Word Cloud', description: 'Collaborative word cloud for key concepts', icon: Cloud, category: 'interactive' },
  { slug: 'postit-brainstorm', name: 'Post-it Brainstorm', description: 'Brainstorming with categorized post-its', icon: StickyNote, category: 'interactive' },
  { slug: 'ranking-prioritization', name: 'Ranking', description: 'Rank elements by priority or preference', icon: BarChart3, category: 'interactive' },
  { slug: 'roleplay-conversation', name: 'Roleplay', description: 'Roleplay scenario for soft-skills training', icon: Users, category: 'interactive' },
  { slug: 'flashcard-learning', name: 'Flashcards', description: 'Front/back flashcards for revision', icon: Layers, category: 'interactive' },
  { slug: 'opentext-reflection', name: 'Open Text', description: 'Open-ended question for reflection', icon: FileText, category: 'interactive' },
  // Static
  { slug: 'summary-structured', name: 'Summary', description: 'Structured summary with sections and key points', icon: ListChecks, category: 'static' },
  { slug: 'faq-extraction', name: 'FAQ', description: 'FAQ extracted from sources', icon: MessageCircle, category: 'static' },
  { slug: 'glossary-extraction', name: 'Glossary', description: 'Glossary of terms and definitions', icon: BookOpen, category: 'static' },
  { slug: 'timeline-chronological', name: 'Timeline', description: 'Events on a chronological axis', icon: Clock, category: 'static' },
  { slug: 'report-document', name: 'Report', description: 'Structured document (synthesis, guide, article)', icon: FileText, category: 'static' },
  { slug: 'data-table-extraction', name: 'Data Table', description: 'Structured data table (columns + rows)', icon: Table2, category: 'static' },
  // Media
  { slug: 'slide-simple', name: 'Slide', description: 'Single slide with deterministic JSON rendering', icon: Sparkles, category: 'media' },
  { slug: 'presentation-from-sources', name: 'Presentation', description: 'Complete presentation deck from sources', icon: Sparkles, category: 'media' },
  { slug: 'image-generation', name: 'Image', description: 'Generate an image from a text prompt', icon: Image, category: 'media' },
  { slug: 'mindmap-extraction', name: 'Mind Map', description: 'Hierarchical mind map from sources', icon: Brain, category: 'media' },
  { slug: 'infographic-visual', name: 'Infographic', description: 'Visual infographic with stats and lists', icon: Image, category: 'media' },
  { slug: 'audio-podcast', name: 'Audio Podcast', description: 'Audio podcast from source content', icon: Headphones, category: 'media' },
  // Pedagogical
  { slug: 'syllabus-generation', name: 'Syllabus', description: 'Training program with objectives and plan', icon: CalendarDays, category: 'pedagogical' },
  { slug: 'session-plan-generation', name: 'Session Plan', description: 'Detailed lesson plan with activities', icon: GraduationCap, category: 'pedagogical' },
  { slug: 'program-overview-generation', name: 'Program Overview', description: 'Higher education program overview', icon: BookOpen, category: 'pedagogical' },
  { slug: 'class-overview-generation', name: 'Class Overview', description: 'Secondary class overview with progression', icon: GraduationCap, category: 'pedagogical' },
];

const categoryColors: Record<string, { bg: string; text: string }> = {
  interactive: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  static: { bg: 'bg-blue-100', text: 'text-blue-700' },
  media: { bg: 'bg-purple-100', text: 'text-purple-700' },
  pedagogical: { bg: 'bg-green-100', text: 'text-green-700' },
};

/* -------------------------------------------------------------------------- */
/*  Code block with copy button                                                */
/* -------------------------------------------------------------------------- */

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  return (
    <div className="relative group">
      <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
          {language}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="p-1.5 rounded-md bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-slate-200 transition-colors"
          aria-label="Copy code"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 pt-5 overflow-x-auto text-sm leading-relaxed font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section anchor helper                                                      */
/* -------------------------------------------------------------------------- */

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight mb-4 text-landing-text scroll-mt-20"
    >
      {children}
    </h2>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function DevelopersPage() {
  const t = useTranslations('developers');

  return (
    <div className="min-h-screen font-sans bg-white">
      {/* ================================================================ */}
      {/*  Nav                                                             */}
      {/* ================================================================ */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-landing-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="font-display font-bold text-lg text-landing-text">
              Qiplim <span className="text-landing-brand">Studio</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#quick-start" className="text-sm font-display font-semibold text-muted-foreground hover:text-landing-text transition-colors">{t('navQuickStart')}</a>
            <a href="#widget-types" className="text-sm font-display font-semibold text-muted-foreground hover:text-landing-text transition-colors">{t('navWidgetTypes')}</a>
            <a href="#api-reference" className="text-sm font-display font-semibold text-muted-foreground hover:text-landing-text transition-colors">{t('navApiReference')}</a>
            <a href="#mcp-server" className="text-sm font-display font-semibold text-muted-foreground hover:text-landing-text transition-colors">{t('navMcpServer')}</a>
            <a href="https://github.com/Qiplim/studio" target="_blank" rel="noopener noreferrer" className="text-sm font-display font-semibold text-muted-foreground hover:text-landing-text transition-colors">GitHub</a>
          </nav>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <a href="/dashboard">
              <Button className="bg-yellow-500 hover:bg-yellow-400 text-neutral-950 text-sm font-bold font-display px-5 rounded-lg">
                {t('getStarted')}
              </Button>
            </a>
          </div>
        </div>
      </header>

      {/* ================================================================ */}
      {/*  Hero                                                            */}
      {/* ================================================================ */}
      <section className="relative pt-36 sm:pt-44 pb-16 sm:pb-24 bg-white overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-landing-brand-subtle border border-landing-brand-border text-landing-brand text-sm font-medium font-display">
              <Code2 className="w-4 h-4" />
              API v1
            </span>
          </div>
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl leading-[0.95] tracking-tight mb-6 text-landing-text">
            {t('heroTitle')}
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            {t('heroSubtitle')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#quick-start">
              <Button size="lg" className="bg-yellow-500 hover:bg-yellow-400 text-neutral-950 font-bold font-display px-8 py-6 text-base rounded-xl">
                {t('navQuickStart')}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </a>
            <a href="/api/v1/openapi.json" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="lg" className="font-display font-semibold px-8 py-6 text-base rounded-xl">
                <FileJson className="w-4 h-4 mr-1.5" />
                OpenAPI Spec
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/*  Quick Start                                                     */}
      {/* ================================================================ */}
      <section id="quick-start" className="py-20 sm:py-28 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading id="quick-start-heading">{t('navQuickStart')}</SectionHeading>
          <p className="text-muted-foreground mb-10 max-w-xl">
            {t('quickStartDesc')}
          </p>

          {/* cURL example */}
          <h3 className="font-display font-bold text-lg text-landing-text mb-3 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-landing-brand" />
            cURL
          </h3>
          <CodeBlock
            language="bash"
            code={`curl -X POST https://studio.qiplim.com/api/v1/generate/quiz-interactive \\
  -H "Authorization: Bearer sk_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Quiz on the French Revolution",
    "sources": ["The French Revolution began in 1789..."],
    "inputs": { "questionCount": 5, "difficulty": "medium" },
    "language": "fr"
  }'`}
          />

          <div className="h-8" />

          {/* TypeScript example */}
          <h3 className="font-display font-bold text-lg text-landing-text mb-3 flex items-center gap-2">
            <Braces className="w-5 h-5 text-landing-brand" />
            TypeScript / fetch
          </h3>
          <CodeBlock
            language="typescript"
            code={`const response = await fetch(
  "https://studio.qiplim.com/api/v1/generate/quiz-interactive",
  {
    method: "POST",
    headers: {
      "Authorization": "Bearer sk_your_api_key",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "Quiz on the French Revolution",
      sources: ["The French Revolution began in 1789..."],
      inputs: { questionCount: 5, difficulty: "medium" },
      language: "fr",
    }),
  }
);

const { widget, usage, template } = await response.json();
console.log(widget.data); // Structured widget JSON`}
          />

          <div className="h-8" />

          {/* Response example */}
          <h3 className="font-display font-bold text-lg text-landing-text mb-3 flex items-center gap-2">
            <FileJson className="w-5 h-5 text-landing-brand" />
            {t('response')}
          </h3>
          <CodeBlock
            language="json"
            code={`{
  "widget": {
    "id": "cm...",
    "type": "QUIZ",
    "title": "Quiz on the French Revolution",
    "data": { "questions": [...], "settings": {...} }
  },
  "usage": {
    "inputTokens": 1200,
    "outputTokens": 800,
    "totalTokens": 2000,
    "model": "mistral-large-latest",
    "provider": "mistral"
  },
  "template": {
    "id": "qiplim/quiz-interactive",
    "version": "2.0.0"
  }
}`}
          />
        </div>
      </section>

      {/* ================================================================ */}
      {/*  Widget Types                                                    */}
      {/* ================================================================ */}
      <section id="widget-types" className="py-20 sm:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <SectionHeading id="widget-types-heading">{t('navWidgetTypes')}</SectionHeading>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {t('widgetTypesDesc')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {widgetTypes.map(({ slug, name, description, icon: Icon, category }) => {
              const colors = categoryColors[category];
              return (
                <Card
                  key={slug}
                  className="p-4 hover:border-landing-brand-border hover:shadow-sm transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-landing-brand-subtle flex items-center justify-center shrink-0">
                      <Icon className="w-4.5 h-4.5 text-landing-brand" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-display font-bold text-sm text-landing-text truncate">
                          {name}
                        </span>
                        <span className={`text-[10px] font-display font-medium px-1.5 py-0.5 rounded-full shrink-0 ${colors?.bg} ${colors?.text}`}>
                          {category}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                        {description}
                      </p>
                      <code className="text-[11px] font-mono text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded">
                        {slug}
                      </code>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/*  API Reference                                                   */}
      {/* ================================================================ */}
      <section id="api-reference" className="py-20 sm:py-28 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading id="api-reference-heading">{t('navApiReference')}</SectionHeading>
          <p className="text-muted-foreground mb-10 max-w-xl">
            {t('apiReferenceDesc')}
          </p>

          {/* Auth section */}
          <Card className="p-6 mb-8 border-landing-brand-border bg-landing-brand-subtle/30">
            <div className="flex items-start gap-3">
              <Key className="w-5 h-5 text-landing-brand mt-0.5 shrink-0" />
              <div>
                <h3 className="font-display font-bold text-lg text-landing-text mb-2">{t('authentication')}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  {t('authenticationDesc')}
                </p>
                <CodeBlock
                  language="http"
                  code="Authorization: Bearer sk_your_api_key"
                />
                <p className="text-xs text-muted-foreground mt-3">
                  {t('rateLimit')}
                </p>
              </div>
            </div>
          </Card>

          {/* POST /api/v1/generate/{type} */}
          <div className="space-y-8">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-2.5 py-1 rounded-md bg-green-100 text-green-700 text-xs font-mono font-bold">
                  POST
                </span>
                <code className="font-mono text-sm text-landing-text font-semibold">
                  /api/v1/generate/&#123;type&#125;
                </code>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {t('generateEndpointDesc')}
              </p>

              <h4 className="font-display font-bold text-sm text-landing-text mb-2">{t('requestBody')}</h4>
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-display font-semibold text-landing-text">{t('field')}</th>
                      <th className="text-left py-2 pr-4 font-display font-semibold text-landing-text">{t('type')}</th>
                      <th className="text-left py-2 pr-4 font-display font-semibold text-landing-text">{t('required')}</th>
                      <th className="text-left py-2 font-display font-semibold text-landing-text">{t('description')}</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b border-dashed">
                      <td className="py-2 pr-4"><code className="font-mono text-xs">title</code></td>
                      <td className="py-2 pr-4"><code className="font-mono text-xs">string</code></td>
                      <td className="py-2 pr-4">{t('yes')}</td>
                      <td className="py-2">{t('fieldTitle')}</td>
                    </tr>
                    <tr className="border-b border-dashed">
                      <td className="py-2 pr-4"><code className="font-mono text-xs">sources</code></td>
                      <td className="py-2 pr-4"><code className="font-mono text-xs">string[]</code></td>
                      <td className="py-2 pr-4">{t('no')}</td>
                      <td className="py-2">{t('fieldSources')}</td>
                    </tr>
                    <tr className="border-b border-dashed">
                      <td className="py-2 pr-4"><code className="font-mono text-xs">inputs</code></td>
                      <td className="py-2 pr-4"><code className="font-mono text-xs">object</code></td>
                      <td className="py-2 pr-4">{t('no')}</td>
                      <td className="py-2">{t('fieldInputs')}</td>
                    </tr>
                    <tr className="border-b border-dashed">
                      <td className="py-2 pr-4"><code className="font-mono text-xs">language</code></td>
                      <td className="py-2 pr-4"><code className="font-mono text-xs">string</code></td>
                      <td className="py-2 pr-4">{t('no')}</td>
                      <td className="py-2">{t('fieldLanguage')}</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4"><code className="font-mono text-xs">provider</code></td>
                      <td className="py-2 pr-4"><code className="font-mono text-xs">string</code></td>
                      <td className="py-2 pr-4">{t('no')}</td>
                      <td className="py-2">{t('fieldProvider')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h4 className="font-display font-bold text-sm text-landing-text mb-2">{t('responses')}</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700 text-xs font-mono font-bold">200</span>
                  {t('response200')}
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-xs font-mono font-bold">400</span>
                  {t('response400')}
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-xs font-mono font-bold">401</span>
                  {t('response401')}
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 text-xs font-mono font-bold">429</span>
                  {t('response429')}
                </div>
              </div>
            </Card>

            {/* GET /api/v1/types */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-2.5 py-1 rounded-md bg-blue-100 text-blue-700 text-xs font-mono font-bold">
                  GET
                </span>
                <code className="font-mono text-sm text-landing-text font-semibold">
                  /api/v1/types
                </code>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {t('typesEndpointDesc')}
              </p>
              <h4 className="font-display font-bold text-sm text-landing-text mb-2">{t('response')}</h4>
              <CodeBlock
                language="json"
                code={`{
  "types": [
    {
      "type": "quiz-interactive",
      "templateId": "qiplim/quiz-interactive",
      "name": "Quiz Interactif",
      "version": "2.0.0",
      "description": "Quiz with scoring and explanations",
      "widgetType": "QUIZ",
      "inputSchema": { "type": "object", "properties": {...} }
    },
    ...
  ]
}`}
              />
            </Card>

            {/* GET /api/v1/openapi.json */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-2.5 py-1 rounded-md bg-blue-100 text-blue-700 text-xs font-mono font-bold">
                  GET
                </span>
                <code className="font-mono text-sm text-landing-text font-semibold">
                  /api/v1/openapi.json
                </code>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {t('openapiEndpointDesc')}
              </p>
              <a
                href="/api/v1/openapi.json"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-display font-semibold text-landing-brand hover:text-landing-brand-dark transition-colors"
              >
                {t('viewOpenapiSpec')}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </Card>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/*  MCP Server                                                      */}
      {/* ================================================================ */}
      <section id="mcp-server" className="py-20 sm:py-28 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading id="mcp-server-heading">{t('navMcpServer')}</SectionHeading>
          <p className="text-muted-foreground mb-10 max-w-xl">
            {t('mcpDesc')}
          </p>

          {/* Connection methods */}
          <div className="grid sm:grid-cols-2 gap-6 mb-10">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <Terminal className="w-5 h-5 text-landing-brand" />
                <h3 className="font-display font-bold text-lg text-landing-text">{t('stdioTransport')}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {t('stdioTransportDesc')}
              </p>
              <CodeBlock
                language="bash"
                code="QIPLIM_API_KEY=sk_... npx qiplim-mcp"
              />
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <Server className="w-5 h-5 text-landing-brand" />
                <h3 className="font-display font-bold text-lg text-landing-text">{t('httpTransport')}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {t('httpTransportDesc')}
              </p>
              <CodeBlock
                language="http"
                code={`POST https://studio.qiplim.com/api/mcp
Authorization: Bearer sk_...
Content-Type: application/json`}
              />
            </Card>
          </div>

          {/* MCP Tools */}
          <h3 className="font-display font-bold text-xl text-landing-text mb-4">{t('availableTools')}</h3>
          <div className="space-y-4 mb-10">
            <Card className="p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-landing-brand-subtle flex items-center justify-center shrink-0">
                <Search className="w-4 h-4 text-landing-brand" />
              </div>
              <div>
                <code className="font-mono text-sm font-semibold text-landing-text">list_widget_types</code>
                <p className="text-sm text-muted-foreground mt-1">{t('toolListTypes')}</p>
              </div>
            </Card>
            <Card className="p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-landing-brand-subtle flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 text-landing-brand" />
              </div>
              <div>
                <code className="font-mono text-sm font-semibold text-landing-text">generate_widget</code>
                <p className="text-sm text-muted-foreground mt-1">{t('toolGenerateWidget')}</p>
              </div>
            </Card>
            <Card className="p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-landing-brand-subtle flex items-center justify-center shrink-0">
                <Search className="w-4 h-4 text-landing-brand" />
              </div>
              <div>
                <code className="font-mono text-sm font-semibold text-landing-text">search_sources</code>
                <p className="text-sm text-muted-foreground mt-1">{t('toolSearchSources')}</p>
              </div>
            </Card>
          </div>

          {/* Claude Code config example */}
          <h3 className="font-display font-bold text-xl text-landing-text mb-4 flex items-center gap-2">
            <Bot className="w-5 h-5 text-landing-brand" />
            {t('claudeCodeConfig')}
          </h3>
          <CodeBlock
            language="json"
            code={`// .claude/settings.json
{
  "mcpServers": {
    "qiplim": {
      "command": "npx",
      "args": ["qiplim-mcp"],
      "env": {
        "QIPLIM_API_KEY": "sk_your_api_key"
      }
    }
  }
}`}
          />
        </div>
      </section>

      {/* ================================================================ */}
      {/*  llms.txt                                                        */}
      {/* ================================================================ */}
      <section id="llms-txt" className="py-20 sm:py-28 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading id="llms-txt-heading">llms.txt</SectionHeading>
          <p className="text-muted-foreground mb-6 max-w-xl">
            {t('llmsTxtDesc')}
          </p>
          <a
            href="/llms.txt"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2"
          >
            <Button variant="outline" className="font-display font-semibold rounded-lg">
              <FileText className="w-4 h-4 mr-1.5" />
              {t('viewLlmsTxt')}
              <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </Button>
          </a>
        </div>
      </section>

      {/* ================================================================ */}
      {/*  Footer                                                          */}
      {/* ================================================================ */}
      <footer className="bg-white border-t border-landing-border py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <nav className="flex items-center gap-6 text-sm font-display font-medium text-muted-foreground">
              <a
                href="https://github.com/Qiplim/studio"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-landing-text transition-colors flex items-center gap-1.5"
              >
                <Github className="w-4 h-4" />
                GitHub
              </a>
              <a
                href="https://discord.gg/qiplim"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-landing-text transition-colors"
              >
                Discord
              </a>
              <a
                href="/api/v1/openapi.json"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-landing-text transition-colors"
              >
                OpenAPI Spec
              </a>
              <a
                href="/llms.txt"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-landing-text transition-colors"
              >
                llms.txt
              </a>
              <Link
                href="/roadmap"
                className="hover:text-landing-text transition-colors"
              >
                Roadmap
              </Link>
              <a
                href="https://qiplim.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-landing-text transition-colors"
              >
                Qiplim
              </a>
              <a
                href="https://pando-studio.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-landing-text transition-colors"
              >
                Pando Studio
              </a>
            </nav>
            <p className="text-sm text-muted-foreground">
              {t('footerLicense')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
