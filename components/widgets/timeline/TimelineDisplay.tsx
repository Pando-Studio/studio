'use client';

import { Clock } from 'lucide-react';
import type { WidgetDisplayProps } from '../types';

interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description?: string;
}

interface TimelineData {
  title?: string;
  events: TimelineEvent[];
}

export function TimelineDisplay({ data }: WidgetDisplayProps) {
  const timelineData = data as unknown as TimelineData;

  if (!timelineData.events?.length) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Aucun evenement disponible.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {timelineData.title && (
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">{timelineData.title}</h3>
        </div>
      )}

      <div className="relative pl-6 space-y-6">
        {/* Vertical line */}
        <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-border" />

        {timelineData.events.map((event) => (
          <div key={event.id} className="relative">
            {/* Dot */}
            <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-primary border-2 border-background" />

            <div className="ml-2">
              <div className="text-xs font-medium text-primary">{event.date}</div>
              <h4 className="text-sm font-semibold mt-0.5">{event.title}</h4>
              {event.description && (
                <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
