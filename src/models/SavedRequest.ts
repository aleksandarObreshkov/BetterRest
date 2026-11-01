import { RequestHeader } from '../components/requestConfigView/RequestConfigView';
import { BodyType } from '../components/requestConfigView/BodyView';

export interface SavedRequest {
  id: string;
  name: string;
  collectionId: string;
  url: string;
  method: string;
  headers: RequestHeader[];
  auth: any;
  body?: string;
  bodyType?: BodyType;
  selectedGraphQLOperation?: string | null;
  graphqlVariables?: string;
}

export function blankRequest(id: string, collectionId: string): SavedRequest {
  return {
    id,
    name: 'New Request',
    collectionId,
    url: '',
    method: 'GET',
    headers: [],
    auth: null,
    body: undefined,
    bodyType: undefined,
    selectedGraphQLOperation: null,
    graphqlVariables: undefined,
  };
}
