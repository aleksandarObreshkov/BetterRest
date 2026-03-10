import { useEffect, useRef, useState } from 'react';
import { BodyConfigProperties } from './RequestConfigView';
import { ChevronDown } from 'lucide-react';
import { parseGraphQLOperations, GraphQLOperation } from '../../utils/graphqlParser';

import { EditorView, keymap, placeholder as cmPlaceholder } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { json } from '@codemirror/lang-json';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, indentOnInput, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { autocompletion, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { lintKeymap } from '@codemirror/lint';

/**
 * Smart Enter handler:
 * - If the cursor sits between an opening bracket/brace and its closing pair
 *   (e.g. `{|}` or `[|]`), insert a blank indented line and push the closing
 *   bracket to its own dedented line — exactly like VS Code / Prettier do.
 * - Otherwise fall through so CodeMirror's default Enter (which already
 *   inherits the current line's indentation) takes over.
 */
const smartEnterKeymap = keymap.of([
  {
    key: 'Enter',
    run(view) {
      const { state } = view;
      const { from } = state.selection.main;

      const charBefore = state.doc.sliceString(from - 1, from);
      const charAfter  = state.doc.sliceString(from, from + 1);

      const pairs: Record<string, string> = { '{': '}', '[': ']' };
      if (!pairs[charBefore] || pairs[charBefore] !== charAfter) return false;

      // Work out how many spaces the current line is indented
      const line       = state.doc.lineAt(from);
      const lineText   = line.text;
      const baseIndent = lineText.match(/^(\s*)/)?.[1] ?? '';
      const innerIndent = baseIndent + '  '; // +2 spaces

      const insert = `\n${innerIndent}\n${baseIndent}`;

      view.dispatch({
        changes: { from, to: from, insert },
        // Place the cursor on the inner (blank) line
        selection: { anchor: from + 1 + innerIndent.length },
      });

      return true;
    },
  },
]);

export type BodyType = 'json' | 'graphql';

const editorTheme = EditorView.theme({
  '&': {
    fontSize: '13px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    height: '100%',
    minHeight: '16rem',
  },
  '.cm-scroller': {
    overflow: 'auto',
    lineHeight: '1.6',
  },
  '.cm-content': {
    padding: '8px 4px',
    caretColor: '#3b82f6',
  },
  '.cm-focused': {
    outline: 'none',
  },
  '.cm-line': {
    paddingLeft: '4px',
  },
  '.cm-placeholder': {
    color: '#9ca3af',
  },
});

const placeholders: Record<BodyType, string> = {
  json: `{
  "key": "value"
}`,
  graphql: `query {
  field {
    subField
  }
}`,
};

export function BodyView({ body, setBody, bodyType, setBodyType, selectedGraphQLOperation, setSelectedGraphQLOperation }: BodyConfigProperties) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  // Track whether the next update comes from inside the editor (user typing)
  // vs from outside (prop change) to avoid cursor-reset loops
  const internalChangeRef = useRef(false);

  // State for parsed GraphQL operations
  const [operations, setOperations] = useState<GraphQLOperation[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);

  // Initialise / reinitialise the editor whenever bodyType changes
  useEffect(() => {
    if (!editorRef.current) return;

    // Destroy any existing instance
    viewRef.current?.destroy();

    const extensions = [
      editorTheme,
      smartEnterKeymap,
      keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...lintKeymap, indentWithTab]),
      EditorState.tabSize.of(2),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      syntaxHighlighting(defaultHighlightStyle),
      cmPlaceholder(placeholders[bodyType]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          internalChangeRef.current = true;
          setBody(update.state.doc.toString());
        }
      }),
      // Only add JSON language support for the json type
      ...(bodyType === 'json' ? [json(), autocompletion()] : []),
    ];

    const state = EditorState.create({
      doc: body,
      extensions,
    });

    viewRef.current = new EditorView({
      state,
      parent: editorRef.current,
    });

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
    // We intentionally only re-run when bodyType changes,
    // body changes are handled in the effect below.
  }, [bodyType]);

  // Sync external body prop changes into the editor without resetting the cursor
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    // If this change originated from inside the editor, skip — already in sync
    if (internalChangeRef.current) {
      internalChangeRef.current = false;
      return;
    }

    const current = view.state.doc.toString();
    if (current !== body) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: body },
      });
    }
  }, [body]);

  // Parse GraphQL operations when body or bodyType changes
  useEffect(() => {
    if (bodyType !== 'graphql' || !body?.trim()) {
      setOperations([]);
      setParseErrors([]);
      return;
    }

    const result = parseGraphQLOperations(body);
    setOperations(result.operations);
    setParseErrors(result.errors);

    // Auto-select first operation if none selected
    if (result.operations.length > 0 && !selectedGraphQLOperation && setSelectedGraphQLOperation) {
      setSelectedGraphQLOperation(result.operations[0].name);
    }
    // Clear selection if selected operation no longer exists
    if (selectedGraphQLOperation && !result.operations.some(op => op.name === selectedGraphQLOperation) && setSelectedGraphQLOperation) {
      setSelectedGraphQLOperation(result.operations.length > 0 ? result.operations[0].name : null);
    }
  }, [body, bodyType, selectedGraphQLOperation, setSelectedGraphQLOperation]);

  return (
    <div className="space-y-2 w-full">
      <div className="flex-1 overflow-auto p-4 space-y-3">

        {/* Body Type Dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Body Type
          </label>
          <div className="relative">
            <select
              value={bodyType}
              onChange={(e) => setBodyType(e.target.value as BodyType)}
              className="appearance-none pl-3 pr-8 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-700 cursor-pointer"
            >
              <option value="json">JSON</option>
              <option value="graphql">GraphQL</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          </div>
        </div>

        {/* GraphQL Operation Selector - only show when bodyType is graphql */}
        {bodyType === 'graphql' && (
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Operation
            </label>
            {parseErrors.length > 0 ? (
              <span className="text-sm text-red-600">Invalid GraphQL syntax</span>
            ) : operations.length === 0 ? (
              <span className="text-sm text-gray-500">No operations found</span>
            ) : (
              <div className="relative">
                <select
                  value={selectedGraphQLOperation ?? ''}
                  onChange={(e) => setSelectedGraphQLOperation && setSelectedGraphQLOperation(e.target.value || null)}
                  className="appearance-none pl-3 pr-8 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-700 cursor-pointer"
                >
                  {operations.map((op, index) => (
                    <option key={`${op.name}-${op.startOffset}-${index}`} value={op.name ?? ''}>
                      {op.displayName}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              </div>
            )}
          </div>
        )}

        {/* Code Editor */}
        <div
          ref={editorRef}
          className="border border-gray-300 rounded bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent overflow-hidden"
        />

      </div>
    </div>
  );
}

export default BodyView;