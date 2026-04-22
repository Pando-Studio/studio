import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@/lib/db';
import { resolveWidgetAccess, isAccessError } from '@/lib/api/resolve-widget-access';

const mockPrisma = vi.mocked(prisma, true);

const STUDIO_ID = 'studio-1';
const WIDGET_ID = 'widget-1';
const OWNER_ID = 'user-owner';
const EDITOR_ID = 'user-editor';
const VIEWER_ID = 'user-viewer';

const mockStudio = {
  id: STUDIO_ID,
  title: 'Test Studio',
  description: 'A test studio',
  isPublic: true,
  userId: OWNER_ID,
};

const mockWidget = {
  id: WIDGET_ID,
  studioId: STUDIO_ID,
  type: 'SLIDE',
  title: 'Test Widget',
  description: null,
  data: {},
  status: 'READY',
  order: 0,
  kind: 'LEAF',
  parentId: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('resolveWidgetAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns role "owner" for the studio owner', async () => {
    mockPrisma.studio.findUnique.mockResolvedValueOnce(mockStudio);
    mockPrisma.widget.findFirst.mockResolvedValueOnce(mockWidget);

    const result = await resolveWidgetAccess('test-slug', WIDGET_ID, OWNER_ID);

    expect(isAccessError(result)).toBe(false);
    if (!isAccessError(result)) {
      expect(result.role).toBe('owner');
      expect(result.widget.id).toBe(WIDGET_ID);
      expect(result.studio.id).toBe(STUDIO_ID);
    }
  });

  it('returns role "editor" for a shared editor', async () => {
    mockPrisma.studio.findUnique.mockResolvedValueOnce(mockStudio);
    mockPrisma.widget.findFirst.mockResolvedValueOnce(mockWidget);
    mockPrisma.studioShare.findUnique.mockResolvedValueOnce({
      role: 'EDITOR',
    });

    const result = await resolveWidgetAccess('test-slug', WIDGET_ID, EDITOR_ID);

    expect(isAccessError(result)).toBe(false);
    if (!isAccessError(result)) {
      expect(result.role).toBe('editor');
    }
  });

  it('returns role "viewer" for a public studio with no userId', async () => {
    mockPrisma.studio.findUnique.mockResolvedValueOnce(mockStudio);
    mockPrisma.widget.findFirst.mockResolvedValueOnce(mockWidget);

    const result = await resolveWidgetAccess('test-slug', WIDGET_ID);

    expect(isAccessError(result)).toBe(false);
    if (!isAccessError(result)) {
      expect(result.role).toBe('viewer');
    }
  });

  it('returns 404 error when studio is not found', async () => {
    mockPrisma.studio.findUnique.mockResolvedValueOnce(null);

    const result = await resolveWidgetAccess('nonexistent-slug', WIDGET_ID);

    expect(isAccessError(result)).toBe(true);
    if (isAccessError(result)) {
      expect(result.status).toBe(404);
      expect(result.error).toBe('Studio not found');
    }
  });

  it('returns 404 error when studio is not public', async () => {
    mockPrisma.studio.findUnique.mockResolvedValueOnce({
      ...mockStudio,
      isPublic: false,
    });

    const result = await resolveWidgetAccess('private-slug', WIDGET_ID);

    expect(isAccessError(result)).toBe(true);
    if (isAccessError(result)) {
      expect(result.status).toBe(404);
    }
  });

  it('returns 404 error when widget is not found', async () => {
    mockPrisma.studio.findUnique.mockResolvedValueOnce(mockStudio);
    mockPrisma.widget.findFirst.mockResolvedValueOnce(null);

    const result = await resolveWidgetAccess('test-slug', 'nonexistent-widget');

    expect(isAccessError(result)).toBe(true);
    if (isAccessError(result)) {
      expect(result.status).toBe(404);
      expect(result.error).toBe('Widget not found');
    }
  });

  it('returns role "viewer" for a user with no share entry', async () => {
    mockPrisma.studio.findUnique.mockResolvedValueOnce(mockStudio);
    mockPrisma.widget.findFirst.mockResolvedValueOnce(mockWidget);
    mockPrisma.studioShare.findUnique.mockResolvedValueOnce(null);

    const result = await resolveWidgetAccess('test-slug', WIDGET_ID, VIEWER_ID);

    expect(isAccessError(result)).toBe(false);
    if (!isAccessError(result)) {
      expect(result.role).toBe('viewer');
    }
  });
});
