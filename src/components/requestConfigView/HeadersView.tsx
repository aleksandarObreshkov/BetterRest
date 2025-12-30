import { HeadersConfigProperties } from './RequestConfigView'
import { Plus, X } from 'lucide-react';


export function HeadersView({headers, setHeaders}: HeadersConfigProperties) {

const addHeader = () => {
    const newId = Math.max(...headers.map(h => h.id), 0) + 1;
    setHeaders([...headers, { id: newId, key: '', value: '', enabled: true }]);
  };

  const removeHeader = (id: number) => {
    if (headers.length > 1) {
      setHeaders(headers.filter(h => h.id !== id));
    }
  };

  const updateHeader = (id: number, field: string, value: string) => {
    setHeaders(headers.map(h => 
      h.id === id ? { ...h, [field]: value } : h
    ));
  };

  const toggleHeader = (id: number) => {
    setHeaders(headers.map(h => 
      h.id === id ? { ...h, enabled: !h.enabled } : h
    ));
  };

  const getActiveHeaders = () => {
    return headers
      .filter(h => h.enabled && h.key.trim() !== '')
      .reduce((acc: any, h) => {
        console.log(typeof acc)
        acc[h.key] = h.value;
        return acc;
      }, {});
  };

    return (
    <div className="space-y-2 w-full">
    <div className="flex-1 overflow-auto p-4">
        {(
        <div className="space-y-2">
            {/* Header Row */}
            <div className="grid grid-cols-12 gap-2 px-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="col-span-1"></div>
            <div className="col-span-5">Key</div>
            <div className="col-span-5">Value</div>
            <div className="col-span-1"></div>
            </div>

            {headers.map((header) => (
            <div key={header.id} className="grid grid-cols-12 gap-2 items-center">

                <div className="col-span-1 flex justify-center">
                <input
                    type="checkbox"
                    checked={header.enabled}
                    onChange={() => toggleHeader(header.id)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                </div>


                <div className="col-span-5">
                <input
                    type="text"
                    value={header.key}
                    onChange={(e) => updateHeader(header.id, 'key', e.target.value)}
                    placeholder="Header name"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                </div>


                <div className="col-span-5">
                <input
                    type="text"
                    value={header.value}
                    onChange={(e) => updateHeader(header.id, 'value', e.target.value)}
                    placeholder="Header value"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                </div>


                <div className="col-span-1 flex justify-center">
                <button
                    onClick={() => removeHeader(header.id)}
                    disabled={headers.length === 1}
                    className={`p-1 rounded hover:bg-gray-100 transition-colors ${
                    headers.length === 1 ? 'opacity-30 cursor-not-allowed' : ''
                    }`}
                >
                    <X className="w-4 h-4 text-gray-500" />
                </button>
                </div>
            </div>
            ))}

            {/* Add Header Button */}
            <button
            onClick={addHeader}
            className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
            >
            <Plus className="w-4 h-4" />
            Add Header
            </button>

            {/* Preview Section */}
            <div className="mt-6 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Active Headers Preview</h3>
            <pre className="p-3 bg-gray-50 rounded text-xs font-mono overflow-x-auto">
                {JSON.stringify(getActiveHeaders(), null, 2)}
            </pre>
            </div>
        </div>
        )}
    </div>
    </div>
);
}