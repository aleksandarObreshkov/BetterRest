import { BrunoRequest, BrunoFormField } from '../models/BrunoYaml';

export interface MappedRequest {
  name: string;
  method: string;
  url: string;
  headers: { key: string; value: string; enabled: boolean }[];
  body?: string;
  bodyType?: 'json' | 'graphql' | 'form-urlencoded';
}

export function mapBrunoRequest(parsed: BrunoRequest): MappedRequest | null {
  const type = parsed.info?.type;

  if (type === 'http') {
    if (!parsed.http) return null;
    const { method, url, headers = [], body } = parsed.http;

    const mappedHeaders = headers
      .filter(h => h.name?.trim())
      .map(h => ({ key: h.name, value: h.value ?? '', enabled: true }));

    let bodyStr: string | undefined;
    let bodyType: 'json' | 'graphql' | 'form-urlencoded' | undefined;

    if (body?.type === 'json' && body.data && typeof body.data === 'string') {
      bodyStr = body.data;
      bodyType = 'json';
    } else if (body?.type === 'graphql' && body.data && typeof body.data === 'string') {
      bodyStr = body.data;
      bodyType = 'graphql';
    } else if (body?.type === 'form-urlencoded' && Array.isArray(body.data)) {
      const fields = (body.data as BrunoFormField[]).map((f, i) => ({
        id: i,
        key: f.name ?? '',
        value: f.value ?? '',
        enabled: !f.disabled,
      }));
      bodyStr = JSON.stringify(fields);
      bodyType = 'form-urlencoded';
    }

    return {
      name: parsed.info.name,
      method: method.toUpperCase(),
      url: url ?? '',
      headers: mappedHeaders,
      body: bodyStr,
      bodyType,
    };
  }

  if (type === 'graphql') {
    if (!parsed.graphql) return null;
    const { method = 'POST', url, headers = [], body } = parsed.graphql;

    const mappedHeaders = headers
      .filter(h => h.name?.trim())
      .map(h => ({ key: h.name, value: h.value ?? '', enabled: true }));

    return {
      name: parsed.info.name,
      method: method.toUpperCase(),
      url: url ?? '',
      headers: mappedHeaders,
      body: body?.query ?? '',
      bodyType: 'graphql',
    };
  }

  return null;
}
