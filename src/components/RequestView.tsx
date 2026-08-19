import { useRef, useState } from 'react';
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
  onChange,
}: RequestViewProps) {
  const [responseBody, setResponseBody] = useState('');
  const [responseContentType, setResponseContentType] = useState('');
  const [responseHeaders, setResponseHeaders] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [splitPercent, setSplitPercent] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const requestHeaders = formRequestHeaders();

      let requestBody = body;
      if (bodyType === 'graphql' && body && selectedGraphQLOperation !== undefined) {
        const extracted = extractOperation(body, selectedGraphQLOperation);
        if (extracted) {
          requestBody = JSON.stringify({ query: extracted });
          requestHeaders.set("Content-Type", "application/json");
        }
      }

      const request = new Request(url, method as HttpMethod, requestHeaders, auth, undefined, requestBody);
      const result = await window.api.executeRequest(request.toJSON());
      setResponseBody(result.body);
      setResponseContentType(result.contentType ?? '');
      setResponseHeaders(result.headers ?? {});
    } catch (error) {
      setResponseBody('Error: ' + error.message);
      setResponseContentType('');
      setResponseHeaders({});
    } finally {
      setLoading(false);
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
        <RequestButton loading={loading} executeRequest={handleSubmit} />
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
