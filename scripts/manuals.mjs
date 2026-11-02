/**
 * Publica los manuales junto a la aplicación (dev, build y Vercel):
 *   /manual/            → docs/MANUAL-USUARIO.md como página HTML legible
 *   /manual-ia/         → docs/MANUAL-IA.md como página HTML (botón «Copiar» en cada prompt)
 *   /MANUAL-USUARIO.md  → texto original (para IAs y descargas)
 *   /MANUAL-IA.md       → texto original
 *   /ejemplos/*.json    → proyectos de ejemplo validados
 *   /llms.txt           → índice estándar para IAs
 * Las páginas son HTML estático (sin JavaScript necesario para leerlas),
 * así cualquier IA que lea webs puede consultarlas.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Marked } from 'marked';

const root = resolve(import.meta.dirname, '..');
const docs = join(root, 'docs');

const APP_URL = 'https://mapa-flujos-workflow.vercel.app';
const REPO_URL = 'https://github.com/nagotpicon/MapaFlujosWorkflow';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const stripTags = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

/** Mismo algoritmo de anclas que GitHub, para que los índices del Markdown funcionen igual. */
export function githubSlug(text) {
  return text.trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');
}

function render(md) {
  const toc = [];
  const used = new Map();
  const marked = new Marked({ gfm: true });
  marked.use({
    renderer: {
      heading({ tokens, depth }) {
        const html = this.parser.parseInline(tokens);
        let slug = githubSlug(stripTags(html));
        const n = used.get(slug) ?? 0;
        used.set(slug, n + 1);
        if (n) slug = `${slug}-${n}`;
        if (depth === 2 || depth === 3) toc.push({ depth, slug, text: stripTags(html) });
        return depth === 1 ? `<h1 id="${slug}">${html}</h1>\n` : `<h${depth} id="${slug}"><a class="anchor" href="#${slug}" aria-label="Enlace a este apartado"></a>${html}</h${depth}>\n`;
      },
      code({ text, lang }) {
        return `<div class="code"><button type="button" class="copy" aria-label="Copiar">Copiar</button><pre><code${lang ? ` class="lang-${esc(lang)}"` : ''}>${esc(text)}</code></pre></div>\n`;
      },
      table(token) {
        const header = token.header.map((c) => `<th${c.align ? ` style="text-align:${c.align}"` : ''}>${this.parser.parseInline(c.tokens)}</th>`).join('');
        const rows = token.rows.map((r) => `<tr>${r.map((c) => `<td${c.align ? ` style="text-align:${c.align}"` : ''}>${this.parser.parseInline(c.tokens)}</td>`).join('')}</tr>`).join('\n');
        return `<div class="table"><table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table></div>\n`;
      },
    },
  });
  const html = marked.parse(md);
  return { html, toc };
}

const CSS = `
:root{--bg:#fbfbfa;--surface:#fff;--surface2:#f3f3f1;--line:#e4e4e0;--text:#1c1c1a;--text2:#4a4a46;--text3:#7a7a74;--accent:#4f46e5;--accent-soft:#eef0ff;--code:#f5f5f3;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#131312;--surface:#1b1b1a;--surface2:#242422;--line:#33332f;--text:#ececea;--text2:#c4c4bf;--text3:#94948e;--accent:#8b8cf8;--accent-soft:#262645;--code:#20201e;color-scheme:dark}}
*{box-sizing:border-box}html{scroll-padding-top:72px}
body{margin:0;background:var(--bg);color:var(--text);font:16px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;-webkit-font-smoothing:antialiased}
a{color:var(--accent)}
header.top{position:sticky;top:0;z-index:5;display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;padding:10px 20px;background:color-mix(in srgb,var(--surface) 92%,transparent);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
header.top .brand{font-weight:700;color:var(--text);text-decoration:none;margin-right:auto;display:flex;align-items:center;gap:8px}
header.top .brand i{display:inline-block;width:20px;height:20px;border-radius:6px;background:var(--text)}
header.top nav{display:flex;flex-wrap:wrap;gap:4px}
header.top nav a{padding:5px 10px;border-radius:8px;text-decoration:none;color:var(--text2);font-size:14px}
header.top nav a:hover{background:var(--surface2)}header.top nav a.on{background:var(--accent-soft);color:var(--accent);font-weight:600}
header.top nav a.app{background:var(--text);color:var(--bg);font-weight:600}
.wrap{display:grid;grid-template-columns:270px minmax(0,1fr);gap:40px;max-width:1240px;margin:0 auto;padding:24px 20px 80px}
aside{position:sticky;top:64px;align-self:start;max-height:calc(100vh - 80px);overflow:auto;font-size:13.5px;padding-right:6px}
aside .t{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text3);margin:4px 0 8px}
aside a{display:block;padding:3px 8px;border-radius:6px;color:var(--text2);text-decoration:none;line-height:1.35}
aside a:hover{background:var(--surface2);color:var(--text)}aside a.d3{padding-left:20px;font-size:12.5px;color:var(--text3)}
main{min-width:0;max-width:860px}
main h1{font-size:30px;line-height:1.2;letter-spacing:-.02em;margin:8px 0 12px}
main h2{font-size:22px;letter-spacing:-.01em;margin:44px 0 10px;padding-top:12px;border-top:1px solid var(--line)}
main h3{font-size:17px;margin:28px 0 8px}main h4{font-size:15px;margin:20px 0 6px}
main .anchor{float:left;margin-left:-22px;width:20px;color:var(--text3);text-decoration:none;opacity:0}main .anchor::before{content:'#'}
main h2:hover .anchor,main h3:hover .anchor{opacity:1}
main p,main li{color:var(--text2)}main strong{color:var(--text)}
main blockquote{margin:16px 0;padding:10px 16px;border-left:3px solid var(--accent);background:var(--accent-soft);border-radius:0 10px 10px 0}
main blockquote p{margin:4px 0;color:var(--text)}
main code{font:13.5px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;background:var(--code);padding:1px 5px;border-radius:5px}
.code{position:relative;margin:14px 0}.code pre{margin:0;overflow:auto;background:var(--code);border:1px solid var(--line);border-radius:12px;padding:14px 16px;max-height:560px}
.code pre code{background:none;padding:0;font-size:12.5px;white-space:pre-wrap;word-break:break-word}
.copy{position:absolute;top:8px;right:8px;z-index:1;font:600 12px system-ui,sans-serif;padding:4px 10px;border-radius:7px;border:1px solid var(--line);background:var(--surface);color:var(--text2);cursor:pointer}
.copy:hover{color:var(--accent);border-color:var(--accent)}
.table{overflow:auto;margin:14px 0;border:1px solid var(--line);border-radius:12px}
table{border-collapse:collapse;width:100%;font-size:14px}th,td{padding:8px 12px;border-bottom:1px solid var(--line);vertical-align:top;text-align:left}
th{background:var(--surface2);color:var(--text);font-weight:600}tr:last-child td{border-bottom:0}td{color:var(--text2)}
hr{border:0;border-top:1px solid var(--line);margin:28px 0}
.hero{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 8px}.hero a{font-size:13px;padding:6px 12px;border:1px solid var(--line);border-radius:999px;text-decoration:none;color:var(--text2);background:var(--surface)}
.hero a:hover{border-color:var(--accent);color:var(--accent)}
footer{max-width:1240px;margin:0 auto;padding:0 20px 40px;color:var(--text3);font-size:13px}
@media (max-width:900px){.wrap{grid-template-columns:1fr;gap:0}aside{position:static;max-height:none;border:1px solid var(--line);border-radius:12px;padding:10px;margin-bottom:20px;background:var(--surface)}main .anchor{display:none}}
@media print{header.top,aside,.copy{display:none}.wrap{display:block}.code pre{max-height:none}}
`;

const SCRIPT = `document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('.copy');if(!b)return;var t=b.parentNode.querySelector('code').innerText;var done=function(){b.textContent='Copiado';setTimeout(function(){b.textContent='Copiar'},1500)};if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(done,function(){fallback()})}else fallback();function fallback(){var a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();try{document.execCommand('copy');done()}catch(_){}a.remove()}});`;

function page({ title, description, md, active, rawPath }) {
  const { html, toc } = render(md);
  const nav = [
    ['../', 'Abrir la aplicación', 'app'],
    ['../manual/', 'Manual de usuario', active === 'user' ? 'on' : ''],
    ['../manual-ia/', 'Manual para IA', active === 'ia' ? 'on' : ''],
  ];
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="alternate" type="text/markdown" href="../${rawPath}" title="Markdown original">
<link rel="icon" href="../favicon.svg" type="image/svg+xml">
<style>${CSS}</style>
</head>
<body>
<header class="top">
  <a class="brand" href="../"><i></i>Mapa de Flujos</a>
  <nav>${nav.map(([href, label, cls]) => `<a href="${href}" class="${cls}">${label}</a>`).join('')}<a href="../${rawPath}">Texto .md</a><a href="${REPO_URL}">GitHub</a></nav>
</header>
<div class="wrap">
  <aside aria-label="Índice"><div class="t">Índice</div>${toc.map((t) => `<a class="d${t.depth}" href="#${t.slug}">${esc(t.text)}</a>`).join('')}</aside>
  <main>
    <div class="hero"><a href="../${rawPath}" download>Descargar .md</a><a href="../${rawPath}">Ver texto plano (ideal para IA)</a><a href="../llms.txt">llms.txt</a></div>
    ${html}
  </main>
</div>
<footer>Mapa de Flujos · <a href="../">${APP_URL.replace('https://', '')}</a> · <a href="${REPO_URL}">Código en GitHub</a></footer>
<script>${SCRIPT}</script>
</body>
</html>
`;
}

function llmsTxt() {
  return `# Mapa de Flujos

> Aplicación web (${APP_URL}) que combina un editor de mapas mentales con un motor que simula flujos por iteraciones: comportamientos (filtros, multiplicadores, restrictores, acumuladores…), conexiones causales, mitigadores, circuitos de retroalimentación, escenarios, cuadrícula temporal, termómetro de calor, Monitor, veredicto «Dímelo claro» y un Explorador con IA. Todo se guarda en el navegador del usuario. Los proyectos se pueden crear pegando un JSON (Pegar JSON / Importar/exportar → Pegar proyecto (JSON)).

Si eres una IA: lee primero el Manual para IA (texto completo). Contiene el prompt maestro, 16 prompts, la especificación exacta del JSON importable, las reglas del motor y los identificadores data-testid de la interfaz.

## Manuales
- [Manual para IA (Markdown)](${APP_URL}/MANUAL-IA.md): prompts, formato JSON importable verificado, reglas del motor, selectores para agentes.
- [Manual de usuario (Markdown)](${APP_URL}/MANUAL-USUARIO.md): guía completa de la aplicación para personas.
- [Manual para IA (página)](${APP_URL}/manual-ia/)
- [Manual de usuario (página)](${APP_URL}/manual/)

## Ejemplos validados (importables)
- [Ejemplo básico: captar alumnos de guitarra](${APP_URL}/ejemplos/mapa-ejemplo-ia.json)
- [Ejemplo avanzado: tienda online](${APP_URL}/ejemplos/mapa-ejemplo-ia-avanzado.json)

## Código
- [Repositorio en GitHub](${REPO_URL})
`;
}

export function renderManuals() {
  const user = readFileSync(join(docs, 'MANUAL-USUARIO.md'), 'utf8');
  const ia = readFileSync(join(docs, 'MANUAL-IA.md'), 'utf8');
  const files = {
    'manual/index.html': page({ title: 'Manual de usuario · Mapa de Flujos', description: 'Guía completa de Mapa de Flujos para personas.', md: user, active: 'user', rawPath: 'MANUAL-USUARIO.md' }),
    'manual-ia/index.html': page({ title: 'Manual para IA · Mapa de Flujos', description: 'Prompts, formato JSON importable, reglas del motor y selectores de interfaz para IAs y agentes.', md: ia, active: 'ia', rawPath: 'MANUAL-IA.md' }),
    'MANUAL-USUARIO.md': user,
    'MANUAL-IA.md': ia,
    'llms.txt': llmsTxt(),
  };
  for (const f of readdirSync(join(docs, 'ejemplos'))) if (f.endsWith('.json')) files[`ejemplos/${f}`] = readFileSync(join(docs, 'ejemplos', f), 'utf8');
  return files;
}

export const MANUAL_TYPES = { '.html': 'text/html; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json; charset=utf-8' };
