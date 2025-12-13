import React, { useState } from 'react';
import RequestMethod from './RequestMethod';
import UrlInput from './UrlInput';
import { RequestButton } from './RequestButton';
import ResponseView from './ResponseView';

export default function RequestView() {
  const [response, setResponse] = useState('');
  const [method, setMethod] = useState("GET");
  const [loading, setLoading] = useState(false)
  const [url, setUrl] = useState('')

  const handleSubmit = async () => {
    setLoading(true);
    let map = new Map<string, string>()
    map.set('method', method)
    try {
      const response = await window.api.executeRequest(map, url)
      console.log(response.body)
    
      await new Promise(resolve => setTimeout(resolve, 3000));
      setResponse(response.body);
    } catch (error) {
      setResponse('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full p-6">
      <div className='flex'>
        <RequestMethod value={method} onChange={setMethod} />
        <UrlInput url={url} setUrl={setUrl} loading={loading}></UrlInput>
        <RequestButton loading={loading} executeRequest={handleSubmit}></RequestButton>
      </div>
        <ResponseView response={response}></ResponseView>
    </div>
  );
}