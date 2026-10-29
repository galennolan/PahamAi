import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ breaks: true, gfm: true });

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('rel', 'noopener noreferrer nofollow');
    node.setAttribute('target', '_blank');
  }
});

/**
 * Buat slug URL-friendly dari teks heading untuk anchor jumping.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, '') // buang HTML tags jika ada
    .replace(/[^\w\s-]/g, '') // buang simbol aneh
    .trim()
    .replace(/\s+/g, '-');
}

export interface TOCItem {
  id: string;
  title: string;
  level: number;
}

/**
 * Ekstrak daftar isi (Table of Contents) dari konten Markdown.
 */
export function extractTOC(md: string | null | undefined): TOCItem[] {
  if (!md) return [];
  const lines = md.split('\n');
  const items: TOCItem[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Hanya tangkap H2 (##) dan H3 (###) agar TOC tetap ringkas dan terfokus
    const match = trimmed.match(/^(#{2,3})\s+(.*)$/);
    if (match) {
      const level = match[1].length;
      const rawTitle = match[2].trim();
      // Bersihkan format markdown tebal/miring dari judul TOC
      const cleanTitle = rawTitle.replace(/[*_`]/g, '');
      const id = slugify(cleanTitle);
      items.push({ id, title: cleanTitle, level });
    }
  }

  return items;
}

/**
 * Hitung estimasi waktu membaca dalam menit (asumsi ~180 kata/menit).
 */
export function estimateReadingTime(md: string | null | undefined): number {
  if (!md) return 1;
  const words = md.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 180));
}

/**
 * Normalisasi tabel Markdown yang baris-barisnya terpisah oleh baris kosong (\r\n\r\n).
 * Di Markdown standar (GFM), baris kosong di antara baris tabel membuat tabel dianggap paragraf biasa.
 */
export function normalizeMarkdownTables(md: string): string {
  if (!md) return '';
  const normalized = md.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const result: string[] = [];
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    // Baris tabel ditandai dengan awalan '|' dan memuat pembagi kolom '|'
    const isTableRow = trimmed.startsWith('|') && (trimmed.endsWith('|') || trimmed.includes('|')) && trimmed.length > 1;

    if (isTableRow) {
      inTable = true;
      result.push(trimmed);
    } else if (inTable && trimmed === '') {
      // Periksa apakah baris non-kosong berikutnya adalah kelanjutan baris tabel
      let nextIsTableRow = false;
      for (let j = i + 1; j < lines.length; j++) {
        const nextTrimmed = lines[j].trim();
        if (nextTrimmed === '') continue;
        if (nextTrimmed.startsWith('|') && (nextTrimmed.endsWith('|') || nextTrimmed.includes('|')) && nextTrimmed.length > 1) {
          nextIsTableRow = true;
        }
        break;
      }
      if (nextIsTableRow) {
        // Lewati baris kosong ini karena memisahkan baris-baris tabel
        continue;
      } else {
        inTable = false;
        result.push(line);
      }
    } else {
      inTable = false;
      result.push(line);
    }
  }

  return result.join('\n');
}

/**
 * Bersihkan header modul yang kaku atau catatan internal agar teks modul langsung nyaman dibaca.
 */
export function cleanModuleMarkdown(md: string | null | undefined): string {
  if (!md) return '';
  let content = normalizeMarkdownTables(md);

  // Bersihkan blok catatan penulis silabus jika ada di awal materi
  content = content.replace(/^>\s*\*\*Catatan penulis:\*\*[\s\S]*?(?=\n\n##|\n\n#|\n\n\*\*|\n\n[A-Z0-9])/i, '');

  // Rapikan baris kosong berlebih
  content = content.replace(/\n{4,}/g, '\n\n');

  return content.trim();
}

/**
 * Ubah blockquote bergaya GitHub Alerts (> [!NOTE], > [!TIP], dsb) menjadi Callout HTML elegan.
 */
function preprocessCallouts(md: string): string {
  // Regex untuk callout blocks
  const calloutRegex = /^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*\n([\s\S]*?)(?=\n\n[^\n>]|\n*$)/gim;

  return md.replace(calloutRegex, (_, typeRaw: string, bodyRaw: string) => {
    const type = typeRaw.toUpperCase();
    const body = bodyRaw
      .split('\n')
      .map((line: string) => line.replace(/^>\s?/, ''))
      .join('\n');

    let badge = 'Catatan';
    let icon = 'ℹ️';
    let cls = 'callout-note';

    if (type === 'TIP') {
      badge = 'Tips Praktik';
      icon = '💡';
      cls = 'callout-tip';
    } else if (type === 'IMPORTANT') {
      badge = 'Poin Kunci';
      icon = '⭐';
      cls = 'callout-important';
    } else if (type === 'WARNING' || type === 'CAUTION') {
      badge = 'Perhatian';
      icon = '⚠️';
      cls = 'callout-warning';
    }

    return `\n\n<div class="callout ${cls}">\n<div class="callout-header"><span class="callout-icon">${icon}</span><strong>${badge}</strong></div>\n<div class="callout-body">\n\n${body}\n\n</div>\n</div>\n\n`;
  });
}

/**
 * Konfigurasi custom renderer marked agar heading otomatis memiliki ID anchor untuk TOC jumping.
 */
const customRenderer = new marked.Renderer();

customRenderer.heading = ({ text, depth }: { text: string; depth: number }) => {
  const cleanText = text.replace(/<[^>]*>/g, '');
  const id = slugify(cleanText);
  return `<h${depth} id="${id}" class="heading-anchor group">${text}<a href="#${id}" class="anchor-link" aria-label="Tautan ke bagian ${cleanText}">#</a></h${depth}>\n`;
};

/**
 * Bungkus seluruh elemen <table> ke dalam container scrollable dan berbingkai rapi
 * agar tabel Markdown tidak terpotong dan nyaman dibaca di desktop maupun mobile.
 */
function wrapTables(html: string): string {
  return html.replace(
    /<table>([\s\S]*?)<\/table>/g,
    '<div class="table-container my-6 overflow-x-auto rounded-xl border border-border-2 bg-surface/60 shadow-sm"><table class="w-full text-sm border-collapse min-w-[500px]">$1</table></div>'
  );
}

/**
 * Render Markdown dengan typography premium, callout modern, dan sanitasi keamanan.
 */
export function renderMarkdown(md: string | null | undefined): string {
  if (!md) return '';
  const cleaned = cleanModuleMarkdown(md);
  const withCallouts = preprocessCallouts(cleaned);

  const rawHtml = marked.parse(withCallouts, {
    renderer: customRenderer,
    async: false,
  }) as string;

  const withTables = wrapTables(rawHtml);

  return DOMPurify.sanitize(withTables, {
    ADD_ATTR: ['target', 'rel', 'id', 'class'],
    ADD_TAGS: ['div', 'span', 'strong', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
    FORBID_TAGS: ['script', 'iframe', 'form', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
    ALLOW_DATA_ATTR: false,
  });
}
