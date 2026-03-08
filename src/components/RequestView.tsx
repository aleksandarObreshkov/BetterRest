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

export default function RequestView() {
  const [response, setResponse] = useState('');
  const [method, setMethod] = useState("GET");
  const [loading, setLoading] = useState(false)
  const [url, setUrl] = useState('')
  const [headers, setHeaders] = useState<RequestHeader[]>([]);
  const [auth, setAuth] = useState<Authentication>();
  const [body, setBody] = useState<string>();
  const [bodyType, setBodyType] = useState<BodyType>();



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
        console.log(result)
        if (result.success && result.data) {
          setRequestData(result.data);
          setUrl(result.data.url)
          setMethod(result.data.method)
          setAuth(result.data.auth)
          setBody(result.data.body)
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
      const requestHeaders = formRequestHeaders()
      let request = new Request(url, method as HttpMethod, requestHeaders, auth)
      let requestJson = request.toJSON()
    
      const response = await window.api.executeRequest(requestJson)
      console.log(response.body)
    
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
    body: '',
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
        <RequestConfigView headers={headers} setHeaders={setHeaders} auth={auth} setAuth={setAuth} body={body} setBody={setBody} bodyType={bodyType} setBodyType={setBodyType}></RequestConfigView>
        <ResponseView response={response}></ResponseView>
      </div>
    </div>
  );
}