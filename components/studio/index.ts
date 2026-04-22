// Context
export {
  StudioProvider,
  useStudio,
  useSources,
  useConversations,
  usePanels,
} from './context/StudioContext';
export type {
  Studio,
  StudioSource,
  Conversation,
  ConversationMessage,
  Widget,
  GenerationRun,
} from './context/StudioContext';

// Layout
export { StudioLayout, StudioLayoutResponsive } from './StudioLayout';

// Header
export { StudioHeader } from './StudioHeader';

// Panels
export { SourcesPanel } from './panels/SourcesPanel';
export { ChatPanel } from './panels/ChatPanel';
export { RightPanel } from './panels/RightPanel';

// Cascade generation
export { GenerateFromWidgetButton, canGenerateFrom } from './GenerateFromWidgetButton';
export { WidgetBreadcrumb } from './WidgetBreadcrumb';
