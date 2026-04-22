'use client';

import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import {
  HelpCircle,
  Cloud,
  Users,
  CheckSquare,
  StickyNote,
  ArrowUpDown,
  FileText,
  Image,
  ListOrdered,
  GraduationCap,
  Presentation,
  LayoutDashboard,
} from 'lucide-react';

interface WidgetTypeInfo {
  nameKey: string;
  type: string;
  descriptionKey: string;
  icon: React.ReactNode;
  tagKeys: string[];
}

interface WidgetCategoryDef {
  nameKey: string;
  descriptionKey: string;
  widgets: WidgetTypeInfo[];
}

const categories: WidgetCategoryDef[] = [
  {
    nameKey: 'categoryInteractive',
    descriptionKey: 'categoryInteractiveDesc',
    widgets: [
      {
        nameKey: 'widgetQuiz',
        type: 'QUIZ',
        descriptionKey: 'widgetQuizDesc',
        icon: <HelpCircle className="h-5 w-5" />,
        tagKeys: ['tagEvaluation', 'tagQuestions', 'tagScore'],
      },
      {
        nameKey: 'widgetQcm',
        type: 'MULTIPLE_CHOICE',
        descriptionKey: 'widgetQcmDesc',
        icon: <CheckSquare className="h-5 w-5" />,
        tagKeys: ['tagEvaluation', 'tagChoice', 'tagVote'],
      },
      {
        nameKey: 'widgetWordcloud',
        type: 'WORDCLOUD',
        descriptionKey: 'widgetWordcloudDesc',
        icon: <Cloud className="h-5 w-5" />,
        tagKeys: ['tagBrainstorming', 'tagCollaborative', 'tagVisual'],
      },
      {
        nameKey: 'widgetPostit',
        type: 'POSTIT',
        descriptionKey: 'widgetPostitDesc',
        icon: <StickyNote className="h-5 w-5" />,
        tagKeys: ['tagBrainstorming', 'tagIdeas', 'tagCategories'],
      },
      {
        nameKey: 'widgetRanking',
        type: 'RANKING',
        descriptionKey: 'widgetRankingDesc',
        icon: <ArrowUpDown className="h-5 w-5" />,
        tagKeys: ['tagRanking', 'tagPriority', 'tagOrder'],
      },
      {
        nameKey: 'widgetOpentext',
        type: 'OPENTEXT',
        descriptionKey: 'widgetOpentextDesc',
        icon: <FileText className="h-5 w-5" />,
        tagKeys: ['tagReflection', 'tagText', 'tagFree'],
      },
      {
        nameKey: 'widgetRoleplay',
        type: 'ROLEPLAY',
        descriptionKey: 'widgetRoleplayDesc',
        icon: <Users className="h-5 w-5" />,
        tagKeys: ['tagSimulation', 'tagScenario', 'tagRoles'],
      },
    ],
  },
  {
    nameKey: 'categoryMedia',
    descriptionKey: 'categoryMediaDesc',
    widgets: [
      {
        nameKey: 'widgetImage',
        type: 'IMAGE',
        descriptionKey: 'widgetImageDesc',
        icon: <Image className="h-5 w-5" />,
        tagKeys: ['tagMedia', 'tagVisual', 'tagIllustration'],
      },
      {
        nameKey: 'widgetPresentation',
        type: 'PRESENTATION',
        descriptionKey: 'widgetPresentationDesc',
        icon: <Presentation className="h-5 w-5" />,
        tagKeys: ['tagSlides', 'tagPresentation', 'tagContent'],
      },
      {
        nameKey: 'widgetSlide',
        type: 'SLIDE',
        descriptionKey: 'widgetSlideDesc',
        icon: <LayoutDashboard className="h-5 w-5" />,
        tagKeys: ['tagSlide', 'tagContent', 'tagPage'],
      },
    ],
  },
  {
    nameKey: 'categoryPedagogical',
    descriptionKey: 'categoryPedagogicalDesc',
    widgets: [
      {
        nameKey: 'widgetSequence',
        type: 'SEQUENCE',
        descriptionKey: 'widgetSequenceDesc',
        icon: <ListOrdered className="h-5 w-5" />,
        tagKeys: ['tagPathway', 'tagContainer', 'tagOrdered'],
      },
      {
        nameKey: 'widgetCourseModule',
        type: 'COURSE_MODULE',
        descriptionKey: 'widgetCourseModuleDesc',
        icon: <GraduationCap className="h-5 w-5" />,
        tagKeys: ['tagTraining', 'tagModule', 'tagPedagogy'],
      },
    ],
  },
];

export default function WidgetTypesPage() {
  const t = useTranslations('docs.widgetTypesPage');

  return (
    <div className="max-w-4xl">
      <h1 className="text-4xl font-bold mb-4">{t('title')}</h1>
      <p className="text-lg text-muted-foreground mb-10">
        {t('subtitle')}
      </p>

      {categories.map((category) => (
        <section key={category.nameKey} className="mb-12">
          <h2 className="text-2xl font-bold mb-2">{t(category.nameKey)}</h2>
          <p className="text-muted-foreground mb-6">{t(category.descriptionKey)}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {category.widgets.map((widget) => (
              <Card key={widget.type}>
                <CardHeader>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 rounded-md bg-primary/10 text-primary">
                      {widget.icon}
                    </div>
                    <div>
                      <CardTitle className="text-base">{t(widget.nameKey)}</CardTitle>
                      <code className="text-xs text-muted-foreground">{widget.type}</code>
                    </div>
                  </div>
                  <CardDescription className="mt-2">{t(widget.descriptionKey)}</CardDescription>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {widget.tagKeys.map((tagKey) => (
                      <span
                        key={tagKey}
                        className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                      >
                        {t(tagKey)}
                      </span>
                    ))}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      ))}

      <div className="p-4 rounded-lg border bg-muted/30">
        <h4 className="font-semibold mb-2">{t('kindTitle')}</h4>
        <p className="text-sm text-muted-foreground mb-3">
          {t('kindDescription')}
        </p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>
            <strong>LEAF</strong> -- {t('kindLeaf')}
          </li>
          <li>
            <strong>CONTAINER</strong> -- {t('kindContainer')}
          </li>
          <li>
            <strong>COMPOSITE</strong> -- {t('kindComposite')}
          </li>
        </ul>
      </div>
    </div>
  );
}
