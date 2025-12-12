interface UrlInputProps {
  url: string;
  setUrl: (url: string) => void;
  loading: boolean;
}


export default function UrlInput({url, setUrl, loading}: UrlInputProps) {
        
    return (
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className={`flex-2 margin-small w-full px-4 py-3 rounded-lg transition outline-none ${
            loading 
              ? 'border-2 animate-ring-pulse'
              : 'border-2 border-gray-300 ring-static focus:border-green-400'
          }`}
        />
    )
}