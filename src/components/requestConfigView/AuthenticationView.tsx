import { AuthenticationConfigProperties } from './RequestConfigView'

import React, { useState, useEffect } from 'react';
import { Copy, CheckCircle, AlertCircle, RefreshCw, FolderOpen } from 'lucide-react';
import { Authentication, CertificateAuthentication, ClientCredentialsAuthentication } from '../../models/Authentication';

interface TokenState {
  token: string;
  expiresAt: number;
  isExpired: boolean;
}

type AuthType = 'none' | 'clientCredentials' | 'certificate'

const AUTH_TYPE_LABELS: Record<AuthType, string> = {
  none: 'None',
  clientCredentials: 'OAuth2 Client Credentials',
  certificate: 'Certificate',
}

function resolveAuthType(auth: Authentication | null): AuthType {
  if (!auth) return 'none'
  if (auth instanceof ClientCredentialsAuthentication || auth.type === 'clientCredentials') return 'clientCredentials'
  if (auth instanceof CertificateAuthentication || auth.type === 'certificate') return 'certificate'
  return 'none'
}

export const AuthenticationView: React.FC<AuthenticationConfigProperties> = ({auth, setAuth}: AuthenticationConfigProperties) => {
  const [authType, setAuthType] = useState<AuthType>(() => resolveAuthType(auth))

  useEffect(() => {
    setAuthType(resolveAuthType(auth))
  }, [auth?.type])

  function handleTypeChange(newType: AuthType) {
    setAuthType(newType)
    if (newType === 'none') {
      setAuth(null)
    } else if (newType === 'clientCredentials') {
      setAuth(new ClientCredentialsAuthentication())
    } else if (newType === 'certificate') {
      setAuth(new CertificateAuthentication())
    }
  }

  return (
    <div className="space-y-4 p-4 w-full">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
        <select
          value={authType}
          onChange={(e) => handleTypeChange(e.target.value as AuthType)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {(Object.keys(AUTH_TYPE_LABELS) as AuthType[]).map((t) => (
            <option key={t} value={t}>{AUTH_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>

      {authType === 'clientCredentials' && (
        <ClientCredentialsView auth={auth as ClientCredentialsAuthentication} setAuth={setAuth} />
      )}

      {authType === 'certificate' && (
        <CertificateView auth={auth as CertificateAuthentication} setAuth={setAuth} />
      )}
    </div>
  )
}

const ClientCredentialsView: React.FC<{ auth: ClientCredentialsAuthentication; setAuth: (a: Authentication) => void }> = ({ auth, setAuth }) => {
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
    if (!auth) return
    setTokenUrl(auth.oauthUrl || '');
    setClientId(auth.clientId || '');
    setClientSecret(auth.clientSecret || '');
    setScope(auth.scope || '');
    setEnabled(auth.enabled !== false);
    setTokenState(auth.token ?? null);
  }, [auth]);

  function buildAuth(overrides: Partial<ClientCredentialsAuthentication> = {}): ClientCredentialsAuthentication {
    const a = new ClientCredentialsAuthentication()
    a.clientId = overrides.clientId ?? clientId
    a.clientSecret = overrides.clientSecret ?? clientSecret
    a.oauthUrl = overrides.oauthUrl ?? tokenUrl
    a.scope = overrides.scope ?? scope
    a.token = overrides.token ?? tokenState
    a.enabled = overrides.enabled ?? enabled
    return a
  }

  async function triggerTokenFetch() {
    setIsLoading(true)
    setError(null)
    try {
      const authRequest = buildAuth()
      const token: TokenState = await window.api.fetchToken(JSON.stringify(authRequest))
      setTokenState(token)
      setAuth(buildAuth({ token }))
      setTokenExpiresIn(getTimeRemaining(token))
    } catch(err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch token');
      setTokenState(null)
    }
    setIsLoading(false)
  }

  function toggleEnabled() {
    const newEnabled = !enabled
    setEnabled(newEnabled)
    setAuth(buildAuth({ enabled: newEnabled }))
  }

  useEffect(() => {
    const interval = setInterval(() => {
      if (tokenState) setTokenExpiresIn(getTimeRemaining(tokenState))
    }, 1000);
    return () => clearInterval(interval);
  });

  function getTimeRemaining(state: TokenState) {
    const remaining = Math.max(0, state.expiresAt - Date.now());
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  const copyToken = () => {
    if (tokenState?.token) {
      navigator.clipboard.writeText(tokenState.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
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
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-900 mb-1">Authentication Error</h4>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Token URL *</label>
            <input
              type="text"
              value={tokenUrl}
              onChange={(e) => { setTokenUrl(e.target.value); setAuth(buildAuth({ oauthUrl: e.target.value })) }}
              placeholder="https://auth.example.com/oauth/token"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Client ID *</label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => { setClientId(e.target.value); setAuth(buildAuth({ clientId: e.target.value })) }}
              placeholder="your-client-id"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Client Secret *</label>
            <input
              type="password"
              value={clientSecret}
              onChange={(e) => { setClientSecret(e.target.value); setAuth(buildAuth({ clientSecret: e.target.value })) }}
              placeholder="your-client-secret"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Scope (Optional)</label>
            <input
              type="text"
              value={scope}
              onChange={(e) => { setScope(e.target.value); setAuth(buildAuth({ scope: e.target.value })) }}
              placeholder="read write"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={triggerTokenFetch}
            disabled={isLoading || !tokenUrl || !clientId || !clientSecret}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <><RefreshCw className="w-4 h-4 animate-spin" />Fetching Token...</>
            ) : (
              <><RefreshCw className="w-4 h-4" />Get Access Token</>
            )}
          </button>
        </div>

        {tokenState && (
          <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {tokenState.isExpired ? (
                  <><AlertCircle className="w-5 h-5 text-orange-600" /><span className="text-sm font-medium text-orange-700">Token Expired</span></>
                ) : (
                  <><CheckCircle className="w-5 h-5 text-green-600" /><span className="text-sm font-medium text-green-700">Token Active</span></>
                )}
              </div>
              {!tokenState.isExpired && (
                <span className="p-4 text-xs text-gray-500 flex">Expires in: {tokenExpiresIn}</span>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Access Token</label>
                <button
                  onClick={copyToken}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  {copied ? (
                    <><CheckCircle className="w-3 h-3" />Copied!</>
                  ) : (
                    <><Copy className="w-3 h-3" />Copy</>
                  )}
                </button>
              </div>
              <div className="p-3 bg-gray-50 rounded border border-gray-200">
                <p className="text-xs font-mono break-all text-gray-700">{tokenState.token}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const CertificateView: React.FC<{ auth: CertificateAuthentication; setAuth: (a: Authentication) => void }> = ({ auth, setAuth }) => {
  const [certPath, setCertPath] = useState('')
  const [keyPath, setKeyPath] = useState('')
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    if (!auth) return
    setCertPath(auth.certPath || '')
    setKeyPath(auth.keyPath || '')
    setEnabled(auth.enabled !== false)
  }, [auth])

  function buildAuth(overrides: Partial<CertificateAuthentication> = {}): CertificateAuthentication {
    const a = new CertificateAuthentication()
    a.certPath = overrides.certPath ?? certPath
    a.keyPath = overrides.keyPath ?? keyPath
    a.enabled = overrides.enabled ?? enabled
    return a
  }

  function toggleEnabled() {
    const newEnabled = !enabled
    setEnabled(newEnabled)
    setAuth(buildAuth({ enabled: newEnabled }))
  }

  async function pickFile(field: 'certPath' | 'keyPath') {
    const path = await window.api.pickFile()
    if (!path) return
    if (field === 'certPath') {
      setCertPath(path)
      setAuth(buildAuth({ certPath: path }))
    } else {
      setKeyPath(path)
      setAuth(buildAuth({ keyPath: path }))
    }
  }

  return (
    <div className="space-y-4">
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

      <div className={enabled ? 'space-y-4' : 'space-y-4 opacity-40 pointer-events-none'}>
        <FilePathField
          label="Client Certificate (PEM) *"
          value={certPath}
          onChange={(v) => { setCertPath(v); setAuth(buildAuth({ certPath: v })) }}
          onPick={() => pickFile('certPath')}
          placeholder="/path/to/client.crt"
        />
        <FilePathField
          label="Private Key (PEM) *"
          value={keyPath}
          onChange={(v) => { setKeyPath(v); setAuth(buildAuth({ keyPath: v })) }}
          onPick={() => pickFile('keyPath')}
          placeholder="/path/to/client.key"
        />
      </div>
    </div>
  )
}

const FilePathField: React.FC<{
  label: string
  value: string
  onChange: (v: string) => void
  onPick: () => void
  placeholder: string
}> = ({ label, value, onChange, onPick, placeholder }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
      />
      <button
        onClick={onPick}
        className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
        title="Browse"
      >
        <FolderOpen className="w-4 h-4 text-gray-600" />
      </button>
    </div>
  </div>
)

export default AuthenticationView;
