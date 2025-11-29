import React from "react";

export default function Url() {
  const [url, setUrl] = React.useState('');
  const [response, setResponse] = React.useState('')

  const executeRequest = async () => {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      setResponse(`${response.status}`);
    } catch (error) {
      console.error('Error:', error);
    }
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <label className="block text-gray-700 text-sm font-bold mb-2">
        Enter URL
      </label>
      <div className="relative">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="w-full px-4 py-3 pr-12 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-blue-200 transition duration-200"/>
        <button 
          onClick={executeRequest}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-linear-210 from-green-500 to-yellow-300 hover:from-green-600 hover:to-yellow-400 text-white px-4 py-2 rounded-md transition duration-200">
          Go
        </button>

        <p 
          className="border-amber-700"
          >{response || 'Nothing yet'}</p>


      </div>
    </div>
  );
}



