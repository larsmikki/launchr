import { z } from 'zod';

// #5: Centralized request validation — one schema per resource, consistent
// 400 errors via parseBody(). Routes never hand-roll coercion again.

const httpUrl = z.string().refine((value) => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}, 'must be a valid http or https URL');

const int = z.coerce.number().int();
// z.coerce.number() turns null into 0 — use a union so null survives
const nullableInt = z.union([z.null(), int]);

export const shortcutCreate = z.object({
  title: z.string().min(1),
  url: httpUrl,
  grid_x: int.default(0),
  grid_y: int.default(0),
  group_id: nullableInt.default(null),
});

export const shortcutUpdate = z
  .object({
    title: z.string().min(1),
    url: httpUrl,
    icon_type: z.enum(['favicon', 'manual']),
    icon_path: z.string().nullable(),
    favicon_cached: int,
    grid_x: int,
    grid_y: int,
    group_id: nullableInt,
    sort_order: int,
  })
  .partial();

export const groupCreate = z.object({
  title: z.string().default(''),
  color: z.string().default('#e0e7ff'),
  grid_x: int.default(0),
  grid_y: int.default(0),
  grid_w: int.default(4),
  grid_h: int.default(4),
});

export const groupUpdate = z
  .object({
    title: z.string(),
    color: z.string(),
    collapsed: int,
    grid_x: int,
    grid_y: int,
    grid_w: int,
    grid_h: int,
    sort_order: int,
  })
  .partial();

export const settingsUpdate = z
  .object({
    layout_mode: z.enum(['row', 'column']),
    column_extra_width: z.coerce.string(),
    link_target: z.coerce.string(),
  })
  .partial();

export const layoutUpdate = z.object({
  shortcuts: z
    .array(
      z.object({
        id: int,
        grid_x: int.default(0),
        grid_y: int.default(0),
        group_id: nullableInt.default(null),
        sort_order: int.default(0),
      })
    )
    .optional(),
  groups: z
    .array(
      z.object({
        id: int,
        grid_x: int.default(0),
        grid_y: int.default(0),
        grid_w: int.default(4),
        grid_h: int.default(4),
        sort_order: int.default(0),
      })
    )
    .optional(),
});

const ICON_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp'];

const iconFilename = z
  .string()
  .regex(/^[a-zA-Z0-9._-]+$/, 'invalid icon filename')
  .refine(
    (name) => ICON_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext)),
    'unsupported icon file extension'
  );

// Loose on legacy fields (old backups), strict on anything written to disk
export const importPayload = z.object({
  settings: z.array(z.object({ key: z.string(), value: z.coerce.string() })).optional(),
  groups: z
    .array(
      z.object({
        id: int,
        title: z.coerce.string().default(''),
        color: z.coerce.string().default('#e0e7ff'),
        collapsed: int.default(0),
        grid_x: int.default(0),
        grid_y: int.default(0),
        grid_w: int.default(4),
        grid_h: int.default(4),
        sort_order: int.default(0),
      })
    )
    .optional(),
  shortcuts: z
    .array(
      z.object({
        id: int,
        title: z.string(),
        url: z.string(),
        icon_type: z.string().default('favicon'),
        icon_path: z.string().nullish().default(null),
        favicon_cached: int.default(0),
        grid_x: int.default(0),
        grid_y: int.default(0),
        group_id: nullableInt.default(null),
        sort_order: int.default(0),
      })
    )
    .optional(),
  icons: z.record(iconFilename, z.string()).optional(),
});

type ParseResult<T> = { ok: true; data: T } | { ok: false; error: string };

export function parseBody<T extends z.ZodType>(schema: T, body: unknown): ParseResult<z.infer<T>> {
  const result = schema.safeParse(body);
  if (result.success) return { ok: true, data: result.data };
  const issue = result.error.issues[0];
  const where = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
  return { ok: false, error: `${where}${issue.message}` };
}
