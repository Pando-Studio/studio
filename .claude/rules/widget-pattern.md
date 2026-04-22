# Widget Development Pattern

## Rule

When creating or modifying a widget type, follow the established pattern exactly. Every widget type is self-contained and requires changes in multiple files.

## How to apply

### Adding a new widget type

1. **Zod schema** in `lib/schemas/widget-configs.ts`:
   - Define `MyWidgetConfigSchema = z.object({...})`
   - Export the inferred type
   - Register in `WidgetConfigSchemas`, `WidgetConfigMap`, and `getDefaultWidgetConfig`

2. **Display + Editor** in `components/widgets/{type}/`:
   ```
   components/widgets/my-widget/
     MyWidgetDisplay.tsx    # Read-only view
     MyWidgetEditor.tsx     # Edit form (use WidgetEditContext for auto-save)
     index.ts               # Barrel export
   ```

3. **Registry** — add to `components/widgets/registry.tsx`

4. **Generation template** — add `lib/widget-templates/templates/my-widget.json` (see `summary-structured.json` for a simple example), register in `lib/widget-templates/registry.ts`

5. **Prisma enum** — if new `WidgetType` value, add to `prisma/schema.prisma` and run `pnpm db:generate`

6. **Player** (optional) — create in `components/widgets/player/` if interactive playback is needed. Default is `ReadablePlayer` (scroll/time tracking).

### Modifying an existing widget

- **Config changes** must start in `widget-configs.ts` (Zod schema is the source of truth)
- **Display/Editor** changes stay in the widget's own folder
- **Never modify the registry pattern** — add entries, don't restructure

### Key files to always check

| File | What to verify |
|------|---------------|
| `lib/schemas/widget-configs.ts` | Schema registered, default config set |
| `components/widgets/registry.tsx` | Display + Editor mapped |
| `lib/widget-templates/registry.ts` | Template registered (if generatable) |
| `prisma/schema.prisma` | Enum value exists |

### Conventions

- **UI**: Always use shadcn/ui components from `components/ui/`
- **Type safety**: Use `getWidgetConfig()` — never cast with `as unknown as X`
- **Editor auto-save**: Use `WidgetEditContext` debounced save (500ms), don't build custom save logic
- **Logging**: Use `logger` from `lib/monitoring/logger.ts`
