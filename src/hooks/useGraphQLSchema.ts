import { useState, useCallback } from 'react';
import { buildClientSchema, GraphQLSchema } from 'graphql';

interface UseGraphQLSchemaResult {
  schema: GraphQLSchema | null;
  loading: boolean;
  error: string | null;
  loadSchema: () => Promise<void>;
}

export function useGraphQLSchema(url: string): UseGraphQLSchemaResult {
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
      const result = await window.api.introspectGraphQL(url);

      if (!result.success) {
        setError(result.error ?? 'Introspection failed');
        setSchema(null);
        return;
      }

      const builtSchema = buildClientSchema(result.data);
      setSchema(builtSchema);
    } catch (err: any) {
      setError(err?.message ?? 'Unknown error');
      setSchema(null);
    } finally {
      setLoading(false);
    }
  }, [url]);

  return { schema, loading, error, loadSchema };
}