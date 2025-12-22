import React, { useState } from 'react';
import RequestMethod from './RequestMethod';
import UrlInput from './UrlInput';
import { RequestButton } from './RequestButton';
import ResponseView from './ResponseView';
import RequestConfigView, {RequestHeader} from './requestConfigView/RequestConfigView'

export default function RequestView() {
  const [response, setResponse] = useState('');
  const [method, setMethod] = useState("GET");
  const [loading, setLoading] = useState(false)
  const [url, setUrl] = useState('')
  const [headers, setHeaders] = useState<RequestHeader[]>([]);

  const handleSubmit = async () => {
    setLoading(true);
    let map = new Map<string, string>()
    map.set('method', method)
    try {
      const requestHeaders = formRequestHeaders()
      const response = await window.api.executeRequest(map, url, requestHeaders)
      console.log(response.body)
    
      await new Promise(resolve => setTimeout(resolve, 3000));
      setResponse(response.body);
    } catch (error) {
      setResponse('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

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
        <RequestMethod value={method} onChange={setMethod} />
        <UrlInput url={url} setUrl={setUrl} loading={loading}></UrlInput>
        <RequestButton loading={loading} executeRequest={handleSubmit}></RequestButton>
      </div>
      <div className='flex'>
        <RequestConfigView headers={headers} setHeaders={setHeaders}></RequestConfigView>
        <ResponseView response={response}></ResponseView>
      </div>
    </div>
  );
}