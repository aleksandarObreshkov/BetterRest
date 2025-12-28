export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS',
  CONNECT = 'CONNECT',
  TRACE = 'TRACE',
}

export namespace HttpMethodHelpers {
  export function getAllValues(): HttpMethod[] {
    console.log(Object.values(HttpMethod) as HttpMethod[])
    return Object.values(HttpMethod) as HttpMethod[];
  }

  export function isValid(method: string): method is HttpMethod {
    return Object.values(HttpMethod).includes(method as HttpMethod);
  }

  export function stringEquals(httpMethod: HttpMethod, stringAsHttpMethod: string): boolean {
    return httpMethod.toString() === stringAsHttpMethod
  }
}