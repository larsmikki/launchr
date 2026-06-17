import fs from 'fs';
import path from 'path';
import { config } from './config.js';
import { log } from './logger.js';

const ICONS_DIR = config.iconsDir;

async function fetchFavicon(url: string, shortcutId: number): Promise<string | null> {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    const origin = parsed.origin;

    // Try multiple favicon sources
    const candidates = [
      `${origin}/favicon.ico`,
      `${origin}/favicon.png`,
      `${origin}/apple-touch-icon.png`,
      `${origin}/apple-touch-icon-precomposed.png`,
    ];

    // First try to parse HTML for link[rel=icon]
    try {
      const res = await fetch(origin, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Bot/1.0)' },
        signal: AbortSignal.timeout(8000),
        redirect: 'follow',
      });
      if (res.ok) {
        const html = await res.text();
        const iconUrls = extractIconUrls(html, origin);
        candidates.unshift(...iconUrls);
      }
    } catch (e) {
      log.debug(`[favicon] Failed to fetch HTML from ${origin}:`, (e as Error).message);
    }

    // Also try Google's favicon service as a reliable fallback
    candidates.push(`https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=64`);

    for (const candidateUrl of candidates) {
      try {
        const iconRes = await fetch(candidateUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Bot/1.0)' },
          signal: AbortSignal.timeout(5000),
          redirect: 'follow',
        });

        if (!iconRes.ok) continue;

        const contentType = iconRes.headers.get('content-type') || '';
        if (!contentType.includes('image') && !contentType.includes('octet-stream') && !candidateUrl.endsWith('.ico')) {
          continue;
        }

        const buffer = Buffer.from(await iconRes.arrayBuffer());
        if (buffer.length < 100) continue;

        let ext = 'png';
        if (contentType.includes('svg')) ext = 'svg';
        else if (contentType.includes('ico') || candidateUrl.endsWith('.ico')) ext = 'ico';
        else if (contentType.includes('gif')) ext = 'gif';

        // Try to convert to PNG using sharp for consistency (except SVG)
        let finalBuffer: Buffer<ArrayBufferLike> = buffer;
        let finalExt = ext;
        if (ext !== 'svg') {
          try {
            const sharp = (await import('sharp')).default;
            finalBuffer = await sharp(buffer)
              .resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
              .png()
              .toBuffer();
            finalExt = 'png';
          } catch {
            finalBuffer = buffer;
            finalExt = ext;
          }
        }

        const filename = `favicon_${shortcutId}_${Date.now()}.${finalExt}`;
        const filepath = path.join(ICONS_DIR, filename);
        fs.writeFileSync(filepath, finalBuffer);
        return filename;
      } catch (e) {
        log.debug(`[favicon] Candidate failed ${candidateUrl}:`, (e as Error).message);
        continue;
      }
    }

    return null;
  } catch (e) {
    log.error(`[favicon] Failed for ${url}:`, (e as Error).message);
    return null;
  }
}

// #9: Single pass over <link> tags — rel and href are matched independently of
// their order in the tag, and new URL(href, origin) replaces manual prefixing
function extractIconUrls(html: string, origin: string): string[] {
  const urls = new Set<string>();
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = tag.match(/\brel=["']([^"']*)["']/i)?.[1] ?? '';
    const tokens = rel.toLowerCase().split(/\s+/);
    if (!tokens.some((t) => t === 'icon' || t.startsWith('apple-touch-icon'))) continue;
    const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    try {
      urls.add(new URL(href, origin).href);
    } catch {
      // Malformed href — skip
    }
  }
  return [...urls];
}

export { fetchFavicon };
