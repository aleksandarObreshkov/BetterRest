import React, { useState } from 'react';

export default function UrlInput() {
  const [url, setUrl] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch(url);
      const data = await res.text();
      
      await new Promise(resolve => setTimeout(resolve, 10000));
      setResponse(data);
    } catch (error) {
      setResponse('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://example.com"
        className={`w-full px-4 py-3 rounded-lg transition outline-none ${
          loading 
            ? 'border-2 animate-ring-pulse'
            : 'border-2 border-gray-300 ring-static focus:border-green-400'
        }`}
      />

      <br />
      
      <button 
        onClick={handleSubmit}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded mt-2"
      >
        {loading ? 'Loading...' : 'Submit'}
      </button>
      
      <p className="mt-4 p-4 bg-gray-100 rounded">
        {response || 'No response yet'}
      </p>
    </div>
  );
}