import { useState } from 'react';
import styles from './RequestConfigView.module.css'
import { HeadersView } from './HeadersView';
import { AuthenticationView } from './AuthenticationView';
import { BodyView, BodyType } from './BodyView';
import { Authentication } from '../../models/Authentication';

export interface RequestConfigProperties extends HeadersConfigProperties, AuthenticationConfigProperties, BodyConfigProperties {}

export interface AuthenticationConfigProperties {
    auth: Authentication
    setAuth: (auth: Authentication) => void
}

export interface RequestHeader {
    id: number,
    key: string,
    value: string,
    enabled: boolean
}

export interface HeadersConfigProperties {
    headers: RequestHeader[]
    setHeaders: (headers: RequestHeader[]) => void
}

export interface BodyConfigProperties {
    body: string
    setBody: (body: string) => void
    bodyType: BodyType
    setBodyType: (bodyType: BodyType) => void
    selectedGraphQLOperation?: string | null
    setSelectedGraphQLOperation?: (operation: string | null) => void
    url: string
    setUrl: (url: string) => void
    auth: Authentication
}

const RequestConfigView = ({headers, setHeaders, auth, setAuth, body, setBody, bodyType, setBodyType, selectedGraphQLOperation, setSelectedGraphQLOperation, url, setUrl}: RequestConfigProperties) => {
  const [activeTab, setActiveTab] = useState('headers');

  const tabs = [
    { id: 'headers', label: 'Headers' },
    { id: 'body', label: 'Body' },
    { id: 'authentication', label: 'Authentication' }
  ];

  return (
    <div className={`${styles.rootConfig}`}>
      {/* Tab bar — fixed height */}
      <div className="border-b border-gray-200 flex-shrink-0">
        <div className='flex'>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content — scrollable */}
      <div className='flex-1 min-h-0 overflow-auto'>
        {(() => {
          switch (activeTab) {
            case 'headers':
              return (<HeadersView headers={headers} setHeaders={setHeaders} />)
            case 'authentication':
              return (<AuthenticationView auth={auth} setAuth={setAuth} />)
            case 'body':
              return (<BodyView body={body} setBody={setBody} bodyType={bodyType} setBodyType={setBodyType} selectedGraphQLOperation={selectedGraphQLOperation} setSelectedGraphQLOperation={setSelectedGraphQLOperation} url={url} setUrl={setUrl} auth={auth}/>)
            default:
              return null;
          }
        })()}
      </div>
    </div>
  );
};

export default RequestConfigView;