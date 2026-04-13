import React, { useEffect, useState, useCallback, useRef } from 'react';
import RequestMethodPicker from './RequestMethodPicker';
import UrlInput from './UrlInput';
import { RequestButton } from './RequestButton';
import ResponseView from './ResponseView';
import RequestConfigView, {RequestHeader} from './requestConfigView/RequestConfigView'
import { Request } from '../models/Request';
import { HttpMethod } from '../models/HttpMethod';
import { Authentication, ClientCredentialsAuthentication } from '../models/Authentication';
import { BodyType } from './requestConfigView/BodyView';
import { extractOperation } from '../utils/graphqlParser';

export default function RequestView() {
  const [response, setResponse] = useState('');
  const [method, setMethod] = useState("GET");
  const [loading, setLoading] = useState(false)
  const [url, setUrl] = useState('')
  const [headers, setHeaders] = useState<RequestHeader[]>([]);
  const [auth, setAuth] = useState<Authentication>(new ClientCredentialsAuthentication());
  const [body, setBody] = useState<string>();
  const [bodyType, setBodyType] = useState<BodyType>();
  const [selectedGraphQLOperation, setSelectedGraphQLOperation] = useState<string | null>(null);



  const [requestData, setRequestData] = useState({
    url: '',
    method: 'GET',
    headers: [],
    body: '',
    queryParams: [],
    auth: {}
  });

    useEffect(() => {
    const loadData = async () => {
      try {
        const result = await window.api.loadRequestData();
        if (result.success && result.data) {
          setRequestData(result.data);
          setUrl(result.data.url)
          setMethod(result.data.method)
          setAuth(result.data.auth)
          setBody(result.data.body)
          setBodyType(result.data.bodyType)
          setSelectedGraphQLOperation(result.data.selectedGraphQLOperation)
        }
      } catch (error) {
        console.error('Failed to load request data:', error);
      }
    };

    loadData();
  }, []);

    useEffect(() => {
    const handleKeyDown = async (e: any) => {
      // Check for Ctrl+S (Windows/Linux) or Cmd+S (macOS)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault(); // Prevent browser's default save dialog
              try {
        updateRequestData()
        await window.api.saveRequestData(requestData);
      } catch (error) {
        console.error('Failed to save request data:', error);
      }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [requestData]); // Add requestData to dependencies

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const requestHeaders = formRequestHeaders();

      // Extract selected GraphQL operation if applicable
      let requestBody = body;
      if (bodyType === 'graphql' && body && selectedGraphQLOperation !== undefined) {
        const extracted = extractOperation(body, selectedGraphQLOperation);
        
        if (extracted) {
          requestBody = `{"query": "${extracted}"}`
          requestBody = requestBody.replace(/\s+/g, ' ').trim();

          requestHeaders.set("Content-Type", "application/json")
        }
        // If extraction fails, send the full body as fallback
      }

      let request = new Request(url, method as HttpMethod, requestHeaders, auth, undefined, requestBody)
      let requestJson = request.toJSON()
      const response = await window.api.executeRequest(requestJson)

      await new Promise(resolve => setTimeout(resolve, 3000));
      setResponse(response.body);
    } catch (error) {
      setResponse('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  function updateRequestData() {
    const request = {
    url: url,
    method: method,
    headers: headers,
    body: body,
    bodyType: bodyType,
    selectedGraphQLOperation: selectedGraphQLOperation,
    queryParams: ["a=10"],
    auth: ClientCredentialsAuthentication.toJSON(auth)
  }
  setRequestData(request)
  }

  function formRequestHeaders(): Map<string, string> {
    let resultHeaders = new Map<string, string>()
    headers.forEach(header => {
      if (header.enabled) {
        resultHeaders.set(header.key, header.value)
      }
    })

    return resultHeaders
  }

  return (
    <div className="w-full p-6 flex flex-col gap-4">
      <div className='flex'>
        <RequestMethodPicker value={method} onChange={setMethod} />
        <UrlInput url={url} setUrl={setUrl} loading={loading}></UrlInput>
        <RequestButton loading={loading} executeRequest={handleSubmit}></RequestButton>
      </div>
      <div className='flex'>
        <RequestConfigView
          headers={headers}
          setHeaders={setHeaders}
          auth={auth}
          setAuth={setAuth}
          body={body}
          setBody={setBody}
          bodyType={bodyType}
          setBodyType={setBodyType}
          selectedGraphQLOperation={selectedGraphQLOperation}
          setSelectedGraphQLOperation={setSelectedGraphQLOperation}
          url={url}
          setUrl={setUrl}
        />
        <ResponseView response={response}></ResponseView>
      </div>
    </div>
  );
}