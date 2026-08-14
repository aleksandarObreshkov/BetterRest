import styles from './ResponseView.module.css'
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ResponseProps {
  body: string;
  contentType: string;
  headers: Record<string, string>;
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
  const normalized = xml.replace(/>\s+</g, '><').trim();
  let result = '';

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

export default function ResponseView({ body, contentType, headers }: ResponseProps) {
  const formatted = formatBody(body, contentType);
  const [headersOpen, setHeadersOpen] = useState(true);
  const headerEntries = Object.entries(headers);
  const hasHeaders = headerEntries.length > 0;

  return (
    <div className={styles.responseArea}>
      {/* Body panel */}
      <div className={styles.bodyPanel}>
        {formatted
          ? <pre className={styles.bodyPre}>{formatted}</pre>
          : <span className="text-gray-400 text-sm">No response yet</span>
        }
      </div>

      {/* Headers side panel */}
      {hasHeaders && (
        headersOpen ? (
          <div className={styles.headersPanel}>
            <div className={styles.headersPanelTitle}>
              <span className="text-xs font-semibold text-gray-600">
                Headers ({headerEntries.length})
              </span>
              <button
                onClick={() => setHeadersOpen(false)}
                className="text-gray-400 hover:text-gray-700 transition-colors"
                title="Collapse headers"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className={styles.headersTableWrapper}>
              <table className="w-full border-collapse">
                <tbody>
                  {headerEntries.map(([key, value]) => (
                    <tr key={key} className="border-b border-gray-200 last:border-0">
                      <td className="py-1 pr-3 text-gray-500 whitespace-nowrap align-top">{key}</td>
                      <td className="py-1 text-gray-800 break-all">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setHeadersOpen(true)}
            className={styles.headersCollapsed}
            title="Expand headers"
          >
            <ChevronLeft className="w-4 h-4 text-gray-400" />
            <span className={styles.headersCollapsedLabel}>
              Headers
            </span>
          </button>
        )
      )}
    </div>
  );
}
