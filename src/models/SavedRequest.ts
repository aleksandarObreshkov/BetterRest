import { RequestHeader } from '../components/requestConfigView/RequestConfigView';
import { BodyType } from '../components/requestConfigView/BodyView';

export interface SavedRequest {
  id: string;
  name: string;
  url: string;
  method: string;
  headers: RequestHeader[];
  auth: any;
  body?: string;
  bodyType?: BodyType;
  selectedGraphQLOperation?: string | null;
}

export function blankRequest(id: string): SavedRequest {
  return {
    id,
    name: 'New Request',
    url: '',
    method: 'GET',
    headers: [],
    auth: { type: 'clientCredentials' },
    body: undefined,
    bodyType: undefined,
    selectedGraphQLOperation: null,
  };
}
