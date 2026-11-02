/** Extracción de texto de documentos (Word, Excel, PDF, texto) en el servidor. No usa IA. */
import mammoth from 'mammoth';
import ExcelJS from 'exceljs';
import { extractText, getDocumentProxy } from 'unpdf';

export const MAX_DOC_BYTES = 25 * 1024 * 1024;

function htmlToText(html: string): string {
  return html
    .replace(/<h([1-6])[^>]*>(.*?)<\/h\1>/gi, (_, l: string, t: string) => `\n${'#'.repeat(Number(l))} ${t}\n`)
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/(p|li|tr|div)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/t[dh]>/gi, ' | ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function extractDocumentText(data: Uint8Array, name: string, mime: string): Promise<{ text: string; kind: string; pages?: number }> {
  if (data.byteLength > MAX_DOC_BYTES) throw new Error('El documento supera 25 MB');
  const ext = name.toLowerCase().split('.').pop() ?? '';
  if (ext === 'docx' || mime.includes('wordprocessingml')) {
    const { value } = await mammoth.convertToHtml({ buffer: Buffer.from(data) });
    return { text: htmlToText(value), kind: 'Word' };
  }
  if (ext === 'xlsx' || mime.includes('spreadsheetml')) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Buffer.from(data) as never);
    const parts: string[] = [];
    wb.eachSheet((ws) => {
      parts.push(`[Hoja: ${ws.name}]`);
      ws.eachRow({ includeEmpty: false }, (row) => {
        const vals = (row.values as unknown[]).slice(1).map((v) => {
          if (v == null) return '';
          if (typeof v === 'object') {
            const o = v as { text?: string; result?: unknown; richText?: { text: string }[] };
            if (o.richText) return o.richText.map((r) => r.text).join('');
            if (o.text) return o.text;
            if (o.result != null) return String(o.result);
            if (v instanceof Date) return v.toISOString().slice(0, 10);
            return '';
          }
          return String(v);
        });
        if (vals.some((x) => x.trim())) parts.push(vals.join(' | '));
      });
    });
    return { text: parts.join('\n'), kind: 'Excel' };
  }
  if (ext === 'pdf' || mime === 'application/pdf') {
    const pdf = await getDocumentProxy(new Uint8Array(data));
    const { totalPages, text } = await extractText(pdf, { mergePages: false });
    const pages = Array.isArray(text) ? text : [text];
    return { text: pages.map((t, i) => `[Página ${i + 1}]\n${t}`).join('\n\n'), kind: 'PDF', pages: totalPages };
  }
  if (['txt', 'md', 'markdown', 'csv', 'tsv', 'json'].includes(ext) || mime.startsWith('text/')) {
    return { text: new TextDecoder('utf-8').decode(data), kind: 'Texto' };
  }
  if (ext === 'doc' || ext === 'xls') throw new Error('Formato antiguo (.doc/.xls): guárdalo como .docx/.xlsx');
  throw new Error(`Formato no admitido: .${ext}`);
}
