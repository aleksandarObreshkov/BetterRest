import { AuthenticationConfigProperties } from './RequestConfigView'

import React, { useState, useEffect } from 'react';
import { Copy, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { ClientCredentialsAuthentication } from '../../models/Authentication';

interface TokenState {
  token: string;
  expiresAt: number;
  isExpired: boolean;
}

export const AuthenticationView: React.FC<AuthenticationConfigProperties> = ({auth, setAuth}: AuthenticationConfigProperties) => {
  const [tokenUrl, setTokenUrl] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [scope, setScope] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [tokenState, setTokenState] = useState<TokenState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [tokenExpiresIn, setTokenExpiresIn] = useState<string>('0m 0s');

  useEffect(() => {
    const clientAuth = auth as ClientCredentialsAuthentication;
    setTokenUrl(clientAuth.oauthUrl || '');
    setClientId(clientAuth.clientId || '');
    setClientSecret(clientAuth.clientSecret || '');
    setScope(clientAuth.scope || '');
    setEnabled(clientAuth.enabled !== false);
  }, [auth]);
  
  async function triggerTokenFetch() {
    const authRequest = new ClientCredentialsAuthentication()
    authRequest.clientId = clientId
    authRequest.clientSecret = clientSecret
    authRequest.oauthUrl = tokenUrl
    authRequest.enabled = enabled
    let authRequestJson = JSON.stringify(authRequest)

    try {
      let token: TokenState = await window.api.fetchToken(authRequestJson)
      setIsLoading(true)
      setError(null)

      setTokenState({
        token: token.token,
        expiresAt: token.expiresAt,
        isExpired: token.isExpired,
      });

      authRequest.token = tokenState
      setAuth(authRequest)
      setTokenExpiresIn(getTimeRemaining())
    } catch(err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch token');
      setTokenState(null)
    }
    setIsLoading(false)
  }

  function toggleEnabled() {
    const newEnabled = !enabled;
    setEnabled(newEnabled);
    const authRequest = new ClientCredentialsAuthentication();
    authRequest.clientId = clientId;
    authRequest.clientSecret = clientSecret;
    authRequest.oauthUrl = tokenUrl;
    authRequest.scope = scope;
    authRequest.token = tokenState;
    authRequest.enabled = newEnabled;
    setAuth(authRequest);
  }

  useEffect(() => {
    console.log("Checking time remaining")
    const interval = setInterval(async () => {
      setTokenExpiresIn(getTimeRemaining())
    }, 1000);

    return () => clearInterval(interval);
  });

  const copyToken = () => {
    if (tokenState?.token) {
      navigator.clipboard.writeText(tokenState.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getTimeRemaining = () => {
    if (!tokenState) return null;
    const remaining = Math.max(0, tokenState.expiresAt - Date.now());
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className="space-y-4 p-4 w-full">
      {/* Enable toggle */}
      <div className="flex items-center gap-3">
        <button
          role="switch"
          aria-checked={enabled}
          onClick={toggleEnabled}
          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
        </button>
        <span className="text-sm font-medium text-gray-700">Enable authentication</span>
      </div>

      <div className={enabled ? '' : 'opacity-40 pointer-events-none'}>
      {/* Error Display */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-red-900 mb-1">Authentication Error</h4>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* OAuth Credentials Form */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Token URL *
          </label>
          <input
            type="text"
            value={tokenUrl}
            onChange={(e) => setTokenUrl(e.target.value)}
            placeholder="https://auth.example.com/oauth/token"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Client ID *
          </label>
          <input
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="your-client-id"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Client Secret *
          </label>
          <input
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder="your-client-secret"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Scope (Optional)
          </label>
          <input
            type="text"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            placeholder="read write"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Get Token Button */}
        <button
          onClick={triggerTokenFetch}
          disabled={isLoading || !tokenUrl || !clientId || !clientSecret}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Fetching Token...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Get Access Token
            </>
          )}
        </button>
      </div>

      {/* Token Display */}
      {tokenState && (
        <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
          {/* Token Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {tokenState.isExpired ? (
                <>
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  <span className="text-sm font-medium text-orange-700">Token Expired</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-700">Token Active</span>
                </>
              )}
            </div>
            {!tokenState.isExpired && (
              <span className="p-4 text-xs text-gray-500 flex">
                Expires in: {tokenExpiresIn}
              </span>
            )}
          </div>

          {/* Token Display with Copy */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Access Token</label>
              <button
                onClick={copyToken}
                className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-3 h-3" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <div className="p-3 bg-gray-50 rounded border border-gray-200">
              <p className="text-xs font-mono break-all text-gray-700">
                {tokenState.token}
              </p>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default AuthenticationView;