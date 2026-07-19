import { useState, useCallback } from 'react';
import { buildClientSchema, GraphQLSchema } from 'graphql';
import { Authentication } from '../models/Authentication';
import { Request } from '../models/Request';
import { HttpMethod } from '../models/HttpMethod';

const introspectionQuery = JSON.stringify({
  query: `
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
  `
});

interface UseGraphQLSchemaResult {
  schema: GraphQLSchema | null;
  loading: boolean;
  error: string | null;
  loadSchema: () => Promise<void>;
}

export function useGraphQLSchema(url: string, auth: Authentication): UseGraphQLSchemaResult {
  const [schema, setSchema] = useState<GraphQLSchema | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSchema = useCallback(async () => {
    if (!url?.trim()) {
      setError('No URL provided');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const headers = new Map<string, string>();
      headers.set('Content-Type', 'application/json');
      headers.set('Accept', 'application/json');

      const request = new Request(url, HttpMethod.POST, headers, auth, undefined, introspectionQuery);
      const result = await window.api.executeRequest(request.toJSON());

      if (result.status && result.status >= 400) {
        const msg = `HTTP ${result.status}: Introspection failed`;
        console.error('[useGraphQLSchema]', msg, 'body:', result.body);
        setError(msg);
        setSchema(null);
        return;
      }

      const parsed = JSON.parse(result.body);

      if (parsed.errors) {
        console.error('[useGraphQLSchema] GraphQL errors:', parsed.errors);
        setError(parsed.errors[0]?.message ?? 'Introspection failed');
        setSchema(null);
        return;
      }

      if (!parsed.data) {
        console.error('[useGraphQLSchema] No data in response:', parsed);
        setError('No schema data returned');
        setSchema(null);
        return;
      }

      const builtSchema = buildClientSchema(parsed.data);
      setSchema(builtSchema);
    } catch (err: any) {
      console.error('[useGraphQLSchema] Unexpected error:', err);
      setError(err?.message ?? 'Unknown error');
      setSchema(null);
    } finally {
      setLoading(false);
    }
  }, [url, auth]);

  return { schema, loading, error, loadSchema };
}