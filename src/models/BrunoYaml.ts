export interface BrunoRequestHeader {
  name: string;
  value: string;
}

export interface BrunoFormField {
  name: string;
  value: string;
  disabled?: boolean;
}

export interface BrunoRequestBody {
  type: 'json' | 'graphql' | 'form-urlencoded' | 'none' | string;
  data?: string | BrunoFormField[];
}

export interface BrunoGraphQLBody {
  query?: string;
  variables?: string;
}

export interface BrunoRequestHttp {
  method: string;
  url: string;
  headers?: BrunoRequestHeader[];
  body?: BrunoRequestBody;
  auth?: string | Record<string, unknown>;
}

export interface BrunoGraphQLHttp {
  method?: string;
  url: string;
  headers?: BrunoRequestHeader[];
  body?: BrunoGraphQLBody;
  auth?: string | Record<string, unknown>;
}

export interface BrunoRequest {
  info: {
    name: string;
    type: string;
    seq?: number;
  };
  http?: BrunoRequestHttp;
  graphql?: BrunoGraphQLHttp;
  settings?: Record<string, unknown>;
}

export interface BrunoCollection {
  opencollection?: string;
  info?: { name?: string };
  config?: Record<string, unknown>;
}
