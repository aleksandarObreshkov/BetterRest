import { MappedRequest } from '../utils/bruYamlMapper';

interface ImportCollection {
  name: string;
  resolvedName: string;
  requests: MappedRequest[];
}

interface ImportModalProps {
  collections: ImportCollection[];
  failed: { file: string; error: string }[];
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ImportModal({ collections, failed, onConfirm, onCancel }: ImportModalProps) {
  const totalRequests = collections.reduce((sum, c) => sum + c.requests.length, 0);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Import from Bruno</h2>
        </div>

        <div className="px-6 py-4 space-y-4">
          {totalRequests > 0 ? (
            <>
              <ul className="space-y-1 max-h-52 overflow-y-auto">
                {collections.map(c => (
                  <li key={c.resolvedName} className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium text-gray-900 truncate">
                      {c.resolvedName}
                      {c.resolvedName !== c.name && (
                        <span className="ml-1.5 text-xs text-blue-600 font-normal">(renamed from "{c.name}")</span>
                      )}
                    </span>
                    <span className="text-gray-400 flex-shrink-0 text-xs">
                      {c.requests.length} {c.requests.length === 1 ? 'request' : 'requests'}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-2 text-sm text-green-700 border-t border-gray-100 pt-3">
                <span className="text-base">✓</span>
                <span>
                  {totalRequests} {totalRequests === 1 ? 'request' : 'requests'} across {collections.length} {collections.length === 1 ? 'collection' : 'collections'} ready to import
                </span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-sm text-amber-700">
              <span className="text-base">⚠</span>
              <span>No HTTP requests found. Make sure you selected a Bruno collection folder containing <code className="font-mono text-xs">.yml</code> request files.</span>
            </div>
          )}

          {failed.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-amber-700">
                <span className="text-base">⚠</span>
                <span>{failed.length} {failed.length === 1 ? 'entry' : 'entries'} could not be parsed and will be skipped:</span>
              </div>
              <ul className="text-xs text-gray-500 space-y-0.5 pl-5 max-h-28 overflow-y-auto">
                {failed.map((f, i) => (
                  <li key={i} className="truncate" title={`${f.file} — ${f.error}`}>
                    <span className="font-mono text-gray-700">{f.file}</span>
                    <span className="text-gray-400"> — {f.error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={totalRequests === 0}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {failed.length > 0 ? 'Skip & Import' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}
