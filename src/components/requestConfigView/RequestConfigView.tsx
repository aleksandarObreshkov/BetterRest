import React, { useState } from 'react';
import styles from './RequestConfigView.module.css'
import { HeadersView } from './HeadersView';
import { AuthenticationView } from './AuthenticationView';

export interface RequestConfigProperties {
    headers: RequestHeader[]
    setHeaders: (headers: RequestHeader[]) => void
}

export interface RequestHeader {
    id: number,
    key: string,
    value: string,
    enabled: boolean
}

const RequestConfigView = ({headers, setHeaders}: RequestConfigProperties) => {
  const [activeTab, setActiveTab] = useState('headers');

  const tabs = [
    { id: 'headers', label: 'Headers' },
    { id: 'authentication', label: 'Authentication' }
  ];

  return (
    <div className={`${styles.rootConfig}`}>
      {/* Tabs */}
      <div className="border-b border-gray-200">
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

        <div className='flex'>
                    {(() => {
            switch (activeTab) {
              case 'headers': return (<HeadersView headers={headers} setHeaders={setHeaders}></HeadersView>)
              
              case 'authentication':
                return ( <AuthenticationView headers={headers} setHeaders={setHeaders}></AuthenticationView>)
              
              default:
                return null;
            }
          })()}
        </div>
        


      </div>
    </div>
  );
};

export default RequestConfigView;