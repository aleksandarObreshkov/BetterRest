import React, { useState } from 'react';
import styles from './RequestConfigView.module.css'
import { HeadersView } from './HeadersView';
import { AuthenticationView } from './AuthenticationView';
import { BodyView, BodyType } from './BodyView';
import { Authentication } from '../../models/Authentication';
import { Request } from '../../models/Request';
import { HttpMethod } from '../../models/HttpMethod';


const introspectionQuery = `
      query IntrospectionQuery {
        __schema {
          queryType { name }
          mutationType { name }
          subscriptionType { name }
          types {
            ...FullType
          }
          directives {
            name
            description
            locations
            args {
              ...InputValue
            }
          }
        }
      }

      fragment FullType on __Type {
        kind
        name
        description
        fields(includeDeprecated: true) {
          name
          description
          args {
            ...InputValue
          }
          type {
            ...TypeRef
          }
          isDeprecated
          deprecationReason
        }
        inputFields {
          ...InputValue
        }
        interfaces {
          ...TypeRef
        }
        enumValues(includeDeprecated: true) {
          name
          description
          isDeprecated
          deprecationReason
        }
        possibleTypes {
          ...TypeRef
        }
      }

      fragment InputValue on __InputValue {
        name
        description
        type { ...TypeRef }
        defaultValue
      }

      fragment TypeRef on __Type {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                  ofType {
                    kind
                    name
                    ofType {
                      kind
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

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
}

const RequestConfigView = ({headers, setHeaders, auth, setAuth, body, setBody, bodyType, setBodyType, selectedGraphQLOperation, setSelectedGraphQLOperation, url, setUrl}: RequestConfigProperties) => {
  const [activeTab, setActiveTab] = useState('headers');

  const tabs = [
    { id: 'headers', label: 'Headers' },
    { id: 'body', label: 'Body' },
    { id: 'authentication', label: 'Authentication' }
  ];

  async function loadGraphQLSchema() {
    var headers = new Map<string, string>()
    headers.set("Authorization", auth.type)
    let request = new Request(url, "POST" as HttpMethod, headers, auth, undefined, introspectionQuery)
    let requestJson = request.toJSON()
    const response = await window.api.executeRequest(requestJson)
    return response
  }

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
              case 'headers':
                return (<HeadersView headers={headers} setHeaders={setHeaders} />)

              case 'authentication':
                return (<AuthenticationView auth={auth} setAuth={setAuth} />)

              case 'body':
                return (<BodyView body={body} setBody={setBody} bodyType={bodyType} setBodyType={setBodyType} selectedGraphQLOperation={selectedGraphQLOperation} setSelectedGraphQLOperation={setSelectedGraphQLOperation} url={url} setUrl={setUrl}/>)

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