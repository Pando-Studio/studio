'use client';

import { ReactNode } from 'react';
import { usePanels } from './context/StudioContext';
import { cn } from '@/lib/utils';

interface StudioLayoutProps {
  header: ReactNode;
  sourcesPanel: ReactNode;
  chatPanel: ReactNode;
  rightPanel: ReactNode;
}

export function StudioLayout({
  header,
  sourcesPanel,
  chatPanel,
  rightPanel,
}: StudioLayoutProps) {
  const { isSourcesPanelCollapsed, isRightPanelCollapsed } = usePanels();

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex-shrink-0">{header}</header>

      {/* Main content with 3-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Sources */}
        <aside
          className={cn(
            'flex-shrink-0 border-r border-gray-200 bg-white transition-all duration-200 ease-in-out overflow-hidden',
            isSourcesPanelCollapsed ? 'w-12' : 'w-[280px]'
          )}
        >
          {sourcesPanel}
        </aside>

        {/* Center Panel - Chat */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
          {chatPanel}
        </main>

        {/* Right Panel - Generables, Library, Runs */}
        <aside
          className={cn(
            'flex-shrink-0 border-l border-gray-200 bg-white transition-all duration-200 ease-in-out overflow-hidden',
            isRightPanelCollapsed ? 'w-12' : 'w-[380px]'
          )}
        >
          {rightPanel}
        </aside>
      </div>
    </div>
  );
}

// Responsive wrapper for tablet/mobile
export function StudioLayoutResponsive({
  header,
  sourcesPanel,
  chatPanel,
  rightPanel,
}: StudioLayoutProps) {
  const { isSourcesPanelCollapsed, isRightPanelCollapsed } = usePanels();

  return (
    <>
      {/* Desktop layout (>1200px) */}
      <div className="hidden xl:flex flex-col h-screen bg-background">
        <header className="flex-shrink-0">{header}</header>
        <div className="flex-1 flex overflow-hidden">
          <aside
            className={cn(
              'flex-shrink-0 border-r border-gray-200 bg-white transition-all duration-200 ease-in-out overflow-hidden',
              isSourcesPanelCollapsed ? 'w-12' : 'w-[280px]'
            )}
          >
            {sourcesPanel}
          </aside>
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
            {chatPanel}
          </main>
          <aside
            className={cn(
              'flex-shrink-0 border-l border-gray-200 bg-white transition-all duration-200 ease-in-out overflow-hidden',
              isRightPanelCollapsed ? 'w-12' : 'w-[380px]'
            )}
          >
            {rightPanel}
          </aside>
        </div>
      </div>

      {/* Tablet layout (768-1200px) - Will use drawers/sheets */}
      <div className="hidden md:flex xl:hidden flex-col h-screen bg-background">
        <header className="flex-shrink-0">{header}</header>
        <div className="flex-1 flex overflow-hidden">
          {/* Collapsed sources sidebar */}
          <aside className="w-12 flex-shrink-0 border-r border-gray-200 bg-white">
            {sourcesPanel}
          </aside>
          {/* Full-width chat */}
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
            {chatPanel}
          </main>
          {/* Collapsed right sidebar */}
          <aside className="w-12 flex-shrink-0 border-l border-gray-200 bg-white">
            {rightPanel}
          </aside>
        </div>
      </div>

      {/* Mobile layout (<768px) - Tab-based navigation */}
      <div className="flex md:hidden flex-col h-screen bg-background">
        <header className="flex-shrink-0">{header}</header>
        <main className="flex-1 overflow-hidden bg-background">{chatPanel}</main>
        {/* Bottom navigation tabs will be added in a separate component */}
      </div>
    </>
  );
}
