import { useEffect, useRef, useState } from 'react';
import { BodyConfigProperties } from './RequestConfigView';
import { ChevronDown, Database, Loader2, AlertCircle, CheckCircle2, Plus, X } from 'lucide-react';
import { parseGraphQLOperations, GraphQLOperation } from '../../utils/graphqlParser';
import { useGraphQLSchema } from '../../hooks/useGraphQLSchema';
import { Authentication } from '../../models/Authentication';

import { EditorView, keymap, placeholder as cmPlaceholder } from '@codemirror/view';
import { EditorState, Extension } from '@codemirror/state';
import { json } from '@codemirror/lang-json';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, indentOnInput, syntaxHighlighting } from '@codemirror/language';
import { autocompletion, closeBrackets, closeBracketsKeymap, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { lintKeymap, linter, Diagnostic } from '@codemirror/lint';

import { GraphQLSchema } from 'graphql';
import { getAutocompleteSuggestions, getDiagnostics, Position } from 'graphql-language-service';
import { graphql as graphqlLanguage } from 'cm6-graphql';
import { codeHighlightStyle } from '../../utils/cmHighlight';

// ---------------------------------------------------------------------------
// GraphQL CodeMirror extensions
// ---------------------------------------------------------------------------

/**
 * Converts a CodeMirror absolute offset into a graphql-language-service
 * Position ({ line, character }).
 */
function offsetToPosition(doc: string, offset: number): Position {
  const lines = doc.slice(0, offset).split('\n');
  return new Position(
    lines.length - 1,
    lines[lines.length - 1].length
  );
}

/**
 * Autocomplete extension — delegates to graphql-language-service
 * getAutocompleteSuggestions. Without a schema it returns nothing;
 * with a schema it provides full field / argument / type suggestions.
 */
function graphqlCompletionSource(schema: GraphQLSchema | null) {
  return async (context: CompletionContext): Promise<CompletionResult | null> => {
    if (!schema) return null;

    const doc = context.state.doc.toString();
    const position = offsetToPosition(doc, context.pos);

    try {
      const suggestions = getAutocompleteSuggestions(schema, doc, position);

      if (!suggestions.length) return null;

      // Find the start of the current token so CodeMirror replaces it cleanly
      const tokenMatch = context.matchBefore(/[\w$]*/);
      const from = tokenMatch ? tokenMatch.from : context.pos;

      return {
        from,
        options: suggestions.map((s) => ({
          label: s.label,
          detail: s.detail ?? undefined,
          info: s.documentation
            ? typeof s.documentation === 'string'
              ? s.documentation
              : (s.documentation as any).value ?? undefined
            : undefined,
          type: kindToType(s.kind),
        })),
      };
    } catch {
      return null;
    }
  };
}

/**
 * Maps graphql-language-service completion kinds to CodeMirror completion
 * types, which control the icon shown in the dropdown.
 */
function kindToType(kind: number | string | undefined): string {
  if (!kind) return 'text';
  const k = String(kind).toLowerCase();
  if (k.includes('field'))     return 'property';
  if (k.includes('type'))      return 'type';
  if (k.includes('argument'))  return 'variable';
  if (k.includes('directive')) return 'keyword';
  if (k.includes('enum'))      return 'enum';
  if (k.includes('fragment'))  return 'function';
  return 'text';
}

/**
 * Lint extension — delegates to graphql-language-service getDiagnostics.
 * Shows squiggly underlines for syntax and validation errors.
 */
function graphqlLinter(schema: GraphQLSchema | null): Extension {
  return linter((view) => {
    const doc = view.state.doc.toString();
    if (!doc.trim()) return [];

    try {
      const rawDiagnostics = getDiagnostics(doc, schema ?? undefined);

      return rawDiagnostics.map((d): Diagnostic => {
        // Convert line/character back to absolute offsets
        const startLine = view.state.doc.line(d.range.start.line + 1);
        const endLine   = view.state.doc.line(d.range.end.line + 1);
        const from = startLine.from + d.range.start.character;
        const to   = endLine.from   + d.range.end.character;

        return {
          from: Math.min(from, view.state.doc.length),
          to:   Math.min(to,   view.state.doc.length),
          severity: d.severity === 1 ? 'error' : 'warning',
          message: d.message,
        };
      });
    } catch {
      return [];
    }
  });
}

// ---------------------------------------------------------------------------
// Smart Enter keymap
// ---------------------------------------------------------------------------

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

      const line        = state.doc.lineAt(from);
      const lineText    = line.text;
      const baseIndent  = lineText.match(/^(\s*)/)?.[1] ?? '';
      const innerIndent = baseIndent + '  ';

      const insert = `\n${innerIndent}\n${baseIndent}`;

      view.dispatch({
        changes: { from, to: from, insert },
        selection: { anchor: from + 1 + innerIndent.length },
      });

      return true;
    },
  },
]);

// ---------------------------------------------------------------------------
// Editor theme & placeholders
// ---------------------------------------------------------------------------

export type BodyType = 'json' | 'graphql' | 'form-urlencoded';

interface FormField {
  id: number;
  key: string;
  value: string;
  enabled: boolean;
}

function parseFormFields(body: string | undefined): FormField[] {
  if (!body?.trim()) return [{ id: 0, key: '', value: '', enabled: true }];
  try {
    const parsed = JSON.parse(body);
    if (Array.isArray(parsed)) return parsed as FormField[];
  } catch {}
  return [{ id: 0, key: '', value: '', enabled: true }];
}

const editorTheme = EditorView.theme({
  '&': {
    fontSize: '13px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    height: '100%',
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

const placeholders: Record<'json' | 'graphql', string> = {
  json: `{
  "key": "value"
}`,
  graphql: `query {
  field {
    subField
  }
}`,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface BodyViewProps extends BodyConfigProperties {
  url: string;
  auth: Authentication;
}

export function BodyView({
  body,
  setBody,
  bodyType,
  setBodyType,
  selectedGraphQLOperation,
  setSelectedGraphQLOperation,
  graphqlVariables,
  setGraphqlVariables,
  url,
  auth,
}: BodyViewProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef   = useRef<EditorView | null>(null);
  const internalChangeRef = useRef(false);

  const variablesEditorRef = useRef<HTMLDivElement>(null);
  const variablesViewRef   = useRef<EditorView | null>(null);
  const variablesInternalChangeRef = useRef(false);

  const [operations, setOperations] = useState<GraphQLOperation[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);

  const { schema, loading, error, loadSchema } = useGraphQLSchema(url, auth);

  // Initialise / reinitialise the editor whenever bodyType or schema changes.
  // Schema is in the dep array so the completion/lint extensions are re-created
  // with the live schema object once introspection completes.
  useEffect(() => {
    if (!editorRef.current || bodyType === 'form-urlencoded') {
      viewRef.current?.destroy();
      viewRef.current = null;
      return;
    }

    viewRef.current?.destroy();

    const extensions: Extension[] = [
      editorTheme,
      smartEnterKeymap,
      keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...lintKeymap, indentWithTab]),
      EditorState.tabSize.of(2),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      syntaxHighlighting(codeHighlightStyle),
      cmPlaceholder(placeholders[bodyType as 'json' | 'graphql']),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          internalChangeRef.current = true;
          setBody(update.state.doc.toString());
        }
      }),
      ...(bodyType === 'json'
        ? [json(), autocompletion()]
        : [
            graphqlLanguage(),
            // Schema-aware autocomplete; gracefully no-ops when schema is null
            autocompletion({ override: [graphqlCompletionSource(schema)] }),
            // Inline diagnostics; shows syntax errors even without a schema,
            // and validation errors once the schema is loaded
            graphqlLinter(schema),
          ]
      ),
    ];

    const state = EditorState.create({ doc: body, extensions });

    viewRef.current = new EditorView({
      state,
      parent: editorRef.current,
    });

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, [bodyType, schema]);

  // Sync external body prop changes into the editor without resetting cursor
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

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

  // Initialise / destroy the variables editor when bodyType changes
  useEffect(() => {
    if (bodyType !== 'graphql') {
      variablesViewRef.current?.destroy();
      variablesViewRef.current = null;
      return;
    }
    if (!variablesEditorRef.current) return;

    variablesViewRef.current?.destroy();

    const varExtensions: Extension[] = [
      editorTheme,
      smartEnterKeymap,
      keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...lintKeymap, indentWithTab]),
      EditorState.tabSize.of(2),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      syntaxHighlighting(codeHighlightStyle),
      cmPlaceholder('{\n  "variableName": "value"\n}'),
      json(),
      autocompletion(),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          variablesInternalChangeRef.current = true;
          setGraphqlVariables?.(update.state.doc.toString());
        }
      }),
    ];

    const varState = EditorState.create({ doc: graphqlVariables ?? '', extensions: varExtensions });
    variablesViewRef.current = new EditorView({ state: varState, parent: variablesEditorRef.current });

    return () => {
      variablesViewRef.current?.destroy();
      variablesViewRef.current = null;
    };
  }, [bodyType]);

  // Sync external graphqlVariables prop into the variables editor without resetting cursor
  useEffect(() => {
    const view = variablesViewRef.current;
    if (!view) return;

    if (variablesInternalChangeRef.current) {
      variablesInternalChangeRef.current = false;
      return;
    }

    const current = view.state.doc.toString();
    if (current !== (graphqlVariables ?? '')) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: graphqlVariables ?? '' },
      });
    }
  }, [graphqlVariables]);

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

    if (result.operations.length > 0 && !selectedGraphQLOperation && setSelectedGraphQLOperation) {
      setSelectedGraphQLOperation(result.operations[0].name);
    }
    if (
      selectedGraphQLOperation &&
      !result.operations.some((op) => op.name === selectedGraphQLOperation) &&
      setSelectedGraphQLOperation
    ) {
      setSelectedGraphQLOperation(result.operations.length > 0 ? result.operations[0].name : null);
    }
  }, [body, bodyType, selectedGraphQLOperation, setSelectedGraphQLOperation]);

  // Schema status indicator
  const schemaStatus = () => {
    if (loading) return (
      <span className="flex items-center gap-1 text-xs text-gray-500">
        <Loader2 className="w-3 h-3 animate-spin" />
        Loading…
      </span>
    );
    if (error) return (
      <span className="flex items-center gap-1 text-xs text-red-500" title={error}>
        <AlertCircle className="w-3 h-3" />
        Failed
      </span>
    );
    if (schema) return (
      <span className="flex items-center gap-1 text-xs text-green-600">
        <CheckCircle2 className="w-3 h-3" />
        Schema loaded
      </span>
    );
    return null;
  };

  const formFields = parseFormFields(body);

  const addFormField = () => {
    const newId = Math.max(...formFields.map(f => f.id), -1) + 1;
    setBody(JSON.stringify([...formFields, { id: newId, key: '', value: '', enabled: true }]));
  };

  const removeFormField = (id: number) => {
    const updated = formFields.filter(f => f.id !== id);
    setBody(JSON.stringify(updated.length > 0 ? updated : [{ id: 0, key: '', value: '', enabled: true }]));
  };

  const updateFormField = (id: number, field: 'key' | 'value', value: string) => {
    setBody(JSON.stringify(formFields.map(f => f.id === id ? { ...f, [field]: value } : f)));
  };

  const toggleFormField = (id: number) => {
    setBody(JSON.stringify(formFields.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f)));
  };

  return (
    <div className="flex flex-col h-full w-full">

      {/* Controls — shrink-wrap at top */}
      <div className="flex-shrink-0 flex flex-col gap-3 p-4 pb-2">

        {/* Body Type Dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Body Type
          </label>
          <div className="relative">
            <select
              value={bodyType}
              onChange={(e) => {
                setBodyType(e.target.value as BodyType);
                setBody('');
              }}
              className="appearance-none pl-3 pr-8 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-700 cursor-pointer"
            >
              <option value="json">JSON</option>
              <option value="graphql">GraphQL</option>
              <option value="form-urlencoded">Form URL Encoded</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          </div>
        </div>

        {/* GraphQL controls */}
        {bodyType === 'graphql' && (
          <>
            {/* Schema loader row */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Schema
              </label>
              <button
                onClick={loadSchema}
                disabled={loading || !url?.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title={!url?.trim() ? 'Enter a URL first' : 'Load schema via introspection'}
              >
                <Database className="w-3.5 h-3.5" />
                Load Schema
              </button>
              {schemaStatus()}
            </div>

            {/* Operation selector row */}
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
                    onChange={(e) =>
                      setSelectedGraphQLOperation &&
                      setSelectedGraphQLOperation(e.target.value || null)
                    }
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
          </>
        )}

      </div>

      {/* Code Editor — JSON and GraphQL only */}
      {bodyType !== 'form-urlencoded' && (
        <div className="flex-1 min-h-0 px-4 pb-2">
          <div
            ref={editorRef}
            className="h-full border border-gray-300 rounded bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent overflow-hidden"
          />
        </div>
      )}

      {/* Form fields editor — form-urlencoded only */}
      {bodyType === 'form-urlencoded' && (
        <div className="flex-1 min-h-0 px-4 pb-2 overflow-auto">
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-12 gap-2 px-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="col-span-1" />
              <div className="col-span-5">Key</div>
              <div className="col-span-5">Value</div>
              <div className="col-span-1" />
            </div>
            {formFields.map((field) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-1 flex justify-center">
                  <input
                    type="checkbox"
                    checked={field.enabled}
                    onChange={() => toggleFormField(field.id)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-5">
                  <input
                    type="text"
                    value={field.key}
                    onChange={(e) => updateFormField(field.id, 'key', e.target.value)}
                    placeholder="Key"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="col-span-5">
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => updateFormField(field.id, 'value', e.target.value)}
                    placeholder="Value"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  <button
                    onClick={() => removeFormField(field.id)}
                    className="p-1 rounded hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={addFormField}
              className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Field
            </button>
          </div>
        </div>
      )}

      {/* Variables Editor — pinned at bottom, GraphQL only */}
      {bodyType === 'graphql' && (
        <div className="flex-shrink-0 px-4 pb-4 space-y-1">
          <label className="text-sm font-medium text-gray-700">Variables</label>
          <div
            ref={variablesEditorRef}
            className="h-28 border border-gray-300 rounded bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent overflow-hidden"
          />
        </div>
      )}

    </div>
  );
}

export default BodyView;