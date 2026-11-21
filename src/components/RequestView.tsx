import { useEffect, useRef, useState } from 'react';
import RequestMethodPicker from './RequestMethodPicker';
import UrlInput from './UrlInput';
import { RequestButton } from './RequestButton';
import ResponseView from './ResponseView';
import RequestConfigView, { RequestHeader } from './requestConfigView/RequestConfigView'
import { Request } from '../models/Request';
import { HttpMethod } from '../models/HttpMethod';
import { Authentication } from '../models/Authentication';
import { BodyType } from './requestConfigView/BodyView';
import { extractOperation } from '../utils/graphqlParser';
import { SavedRequest } from '../models/SavedRequest';

interface RequestViewProps {
  requestId: string;
  name: string;
  url: string;
  method: string;
  headers: RequestHeader[];
  auth: Authentication;
  body?: string;
  bodyType?: BodyType;
  selectedGraphQLOperation?: string | null;
  graphqlVariables?: string;
  onChange: (patch: Partial<SavedRequest>) => void;
}

export default function RequestView({
  requestId,
  name,
  url,
  method,
  headers,
  auth,
  body,
  bodyType,
  selectedGraphQLOperation,
  graphqlVariables,
  onChange,
}: RequestViewProps) {
  const [responseBody, setResponseBody] = useState('');
  const [responseContentType, setResponseContentType] = useState('');
  const [responseHeaders, setResponseHeaders] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [splitPercent, setSplitPercent] = useState(50);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const executionRef = useRef<{ id: string; startedAt: number; cancelled: boolean } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timerRef.current !== null) clearInterval(timerRef.current);
    if (executionRef.current) {
      void window.api.cancelRequest(executionRef.current.id).catch(() => { /* view is closing */ });
      executionRef.current = null;
    }
  }, []);

  const handleCancel = async () => {
    const execution = executionRef.current;
    if (!execution || execution.cancelled) return;
    execution.cancelled = true;
    try {
      await window.api.cancelRequest(execution.id);
    } catch (error) {
      if (executionRef.current !== execution) return;
      execution.cancelled = false;
      window.alert('Could not cancel the request: ' + error.message);
    }
  };

  const handleSubmit = async () => {
    if (executionRef.current) return;
    const execution = { id: `${requestId}:${crypto.randomUUID()}`, startedAt: performance.now(), cancelled: false };
    executionRef.current = execution;
    setElapsedMs(0);
    timerRef.current = setInterval(() => setElapsedMs(performance.now() - execution.startedAt), 100);
    setLoading(true);
    try {
      const requestHeaders = formRequestHeaders();

      let requestBody = body;
      if (bodyType === 'graphql' && body && selectedGraphQLOperation !== undefined) {
        const extracted = extractOperation(body, selectedGraphQLOperation);
        if (extracted) {
          let variables: Record<string, unknown> | undefined;
          try {
            if (graphqlVariables?.trim()) variables = JSON.parse(graphqlVariables);
          } catch { /* ignore malformed variables */ }
          requestBody = JSON.stringify({ query: extracted, ...(variables ? { variables } : {}) });
          requestHeaders.set("Content-Type", "application/json");
        }
      } else if (bodyType === 'form-urlencoded' && body) {
        try {
          const fields = JSON.parse(body) as { id: number; key: string; value: string; enabled: boolean }[];
          const params = new URLSearchParams();
          for (const field of fields) {
            if (field.enabled && field.key.trim()) {
              params.append(field.key, field.value);
            }
          }
          requestBody = params.toString();
          requestHeaders.set('Content-Type', 'application/x-www-form-urlencoded');
        } catch { /* keep requestBody as-is */ }
      }

      const request = new Request(url, method as HttpMethod, requestHeaders, auth, undefined, requestBody);
      const result = await window.api.executeRequest(request.toJSON(), execution.id);
      if (executionRef.current !== execution) return;
      setResponseBody(result.cancelled ? 'Request cancelled.' : result.body);
      setResponseContentType(result.cancelled ? '' : result.contentType ?? '');
      setResponseHeaders(result.cancelled ? {} : result.headers ?? {});
    } catch (error) {
      if (executionRef.current !== execution) return;
      setResponseBody('Error: ' + error.message);
      setResponseContentType('');
      setResponseHeaders({});
    } finally {
      if (executionRef.current === execution) {
        if (timerRef.current !== null) clearInterval(timerRef.current);
        timerRef.current = null;
        setElapsedMs(performance.now() - execution.startedAt);
        executionRef.current = null;
        setLoading(false);
      }
    }
  };

  function formRequestHeaders(): Map<string, string> {
    const result = new Map<string, string>();
    headers.forEach(header => {
      if (header.enabled) result.set(header.key, header.value);
    });
    return result;
  }

  function startDrag(e: React.MouseEvent) {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    function onMove(e: MouseEvent) {
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPercent(Math.min(75, Math.max(25, pct)));
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  return (
    <div className="h-full p-6 flex flex-col gap-4 overflow-hidden">
      <div className="flex-shrink-0 flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={e => onChange({ name: e.target.value })}
          className="text-lg font-semibold text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1 py-0.5 transition-colors"
          placeholder="Request name"
        />
      </div>
      <div className="flex-shrink-0 flex">
        <RequestMethodPicker value={method} onChange={v => onChange({ method: v })} />
        <UrlInput url={url} setUrl={v => onChange({ url: v })} loading={loading} />
        <RequestButton loading={loading} executeRequest={handleSubmit} cancelRequest={handleCancel} />
        {elapsedMs !== null && (
          <span className="self-center ml-3 text-sm text-gray-500 tabular-nums whitespace-nowrap" title="Elapsed request time" role="timer">
            {(elapsedMs / 1000).toFixed(1)} s
          </span>
        )}
      </div>
      <div className="flex-1 min-h-0 flex overflow-hidden" ref={containerRef}>
        <div style={{ width: `${splitPercent}%` }} className="h-full min-w-0 overflow-hidden p-0.5">
          <RequestConfigView
            headers={headers}
            setHeaders={v => onChange({ headers: v })}
            auth={auth}
            setAuth={v => onChange({ auth: v })}
            body={body}
            setBody={v => onChange({ body: v })}
            bodyType={bodyType}
            setBodyType={v => onChange({ bodyType: v })}
            selectedGraphQLOperation={selectedGraphQLOperation}
            setSelectedGraphQLOperation={v => onChange({ selectedGraphQLOperation: v })}
            graphqlVariables={graphqlVariables}
            setGraphqlVariables={v => onChange({ graphqlVariables: v })}
            url={url}
            setUrl={v => onChange({ url: v })}
          />
        </div>
        <div
          className="w-1 flex-shrink-0 bg-transparent hover:bg-blue-400 cursor-col-resize transition-colors"
          onMouseDown={startDrag}
        />
        <div className="flex-1 h-full min-w-0 overflow-hidden p-0.5">
          <ResponseView body={responseBody} contentType={responseContentType} headers={responseHeaders} />
        </div>
      </div>
    </div>
  );
}
