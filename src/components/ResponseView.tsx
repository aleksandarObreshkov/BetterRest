import styles from './ResponseView.module.css'

interface ResponseProps {
  body: string;
  contentType: string;
}

function formatBody(body: string, contentType: string): string {
  if (!body) return '';

  const ct = contentType.toLowerCase();

  if (ct.includes('application/json') || ct.includes('+json')) {
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  }

  if (ct.includes('xml') || ct.includes('text/html')) {
    return formatXml(body);
  }

  return body;
}

function formatXml(xml: string): string {
  let depth = 0;
  const indent = '  ';
  // Normalize: remove existing whitespace between tags, then re-indent
  const normalized = xml.replace(/>\s+</g, '><').trim();
  let result = '';

  // Split on tag boundaries, keeping the delimiters
  const tokens = normalized.split(/(<[^>]+>)/);
  for (const token of tokens) {
    if (!token.trim()) continue;

    if (token.startsWith('</')) {
      depth = Math.max(0, depth - 1);
      result += indent.repeat(depth) + token + '\n';
    } else if (token.startsWith('<') && !token.startsWith('<?') && !token.endsWith('/>')) {
      result += indent.repeat(depth) + token + '\n';
      depth++;
    } else if (token.startsWith('<')) {
      result += indent.repeat(depth) + token + '\n';
    } else {
      result += indent.repeat(depth) + token + '\n';
    }
  }

  return result.trimEnd();
}

export default function ResponseView({ body, contentType }: ResponseProps) {
  const formatted = formatBody(body, contentType);

  return (
    <div className={styles.response}>
      {formatted
        ? <pre className="text-sm font-mono whitespace-pre-wrap break-all">{formatted}</pre>
        : <span className="text-gray-400">No response yet</span>
      }
    </div>
  );
}
