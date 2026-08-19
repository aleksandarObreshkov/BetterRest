import styles from './ResponseView.module.css'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { json } from '@codemirror/lang-json'
import { syntaxHighlighting } from '@codemirror/language'
import { codeHighlightStyle } from '../utils/cmHighlight'

interface ResponseProps {
  body: string;
  contentType: string;
  headers: Record<string, string>;
}

const responseEditorTheme = EditorView.theme({
  '&': {
    fontSize: '13px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    backgroundColor: 'transparent',
  },
  '.cm-scroller': { lineHeight: '1.6', overflow: 'visible' },
  '.cm-content': { padding: '0' },
  '.cm-focused': { outline: 'none' },
  '.cm-line': { paddingLeft: '0' },
  '.cm-selectionBackground': { background: '#b3d4fd' },
})

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
  const [headersExpanded, setHeadersExpanded] = useState(false);
  const headerEntries = Object.entries(headers);
  const hasHeaders = headerEntries.length > 0;

  const ct = contentType.toLowerCase();
  const isJson = ct.includes('application/json') || ct.includes('+json');

  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!isJson || !formatted) {
      viewRef.current?.destroy();
      viewRef.current = null;
      return;
    }
    if (!editorRef.current) return;

    viewRef.current?.destroy();

    const state = EditorState.create({
      doc: formatted,
      extensions: [
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
        json(),
        syntaxHighlighting(codeHighlightStyle),
        responseEditorTheme,
      ],
    });

    viewRef.current = new EditorView({ state, parent: editorRef.current });

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, [isJson, formatted]);

  return (
    <div className={styles.responseArea}>
      {hasHeaders && (
        <div className={styles.headersSection}>
          <button
            onClick={() => setHeadersExpanded(v => !v)}
            className={styles.headersToggle}
          >
            {headersExpanded
              ? <ChevronDown className="w-4 h-4 flex-shrink-0" />
              : <ChevronRight className="w-4 h-4 flex-shrink-0" />
            }
            <span>Response Headers ({headerEntries.length})</span>
          </button>
          {headersExpanded && (
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
          )}
        </div>
      )}

      <div className={styles.bodyPanel}>
        {!formatted ? (
          <span className="text-gray-400 text-sm">No response yet</span>
        ) : isJson ? (
          <div ref={editorRef} />
        ) : (
          <pre className={styles.bodyPre}>{formatted}</pre>
        )}
      </div>
    </div>
  );
}
