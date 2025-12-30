import { Authentication, ClientCredentialsAuthentication } from "./Authentication";
import { HttpMethod } from "./HttpMethod"

export class Request {
    private _url?: string;
    private _method?: HttpMethod;
    private _auth?: Authentication;
    private _headers?: Map<string, string>;
    private _parameters?: Map<string, string>;

    constructor(
        url: string = '',
        method: HttpMethod = HttpMethod.GET,
        headers: Map<string, string> = new Map(),
        auth: Authentication = null,
        parameters: Map<string, string> = new Map()
    ) {
        this._url = url;
        this._method = method;
        this._headers = headers;
        this._parameters = parameters;
        this._auth = auth
    }

    get url(): string | undefined {
        return this._url;
    }

    set url(value: string | undefined) {
        this._url = value;
    }

    get method(): HttpMethod | undefined {
        return this._method;
    }

    set method(value: HttpMethod | undefined) {
        this._method = value;
    }

    get auth(): Authentication | undefined {
        return this._auth;
    }

    set auth(value: Authentication | undefined) {
        this._auth = value;
    }

    get headers(): Map<string, string> | undefined {
        return this._headers;
    }

    set headers(value: Map<string, string> | undefined) {
        this._headers = value;
    }

    get parameters(): Map<string, string> | undefined {
        return this._parameters;
    }

    set parameters(value: Map<string, string> | undefined) {
        this._parameters = value;
    }

    toJSON(): any {
        return {
            url: this._url,
            method: this._method,
            auth: this._auth,
            headers: this._headers,
            parameters: this._parameters ? Array.from(this._parameters.entries()) : undefined
        };
    }
    
    static fromJSON(json: any): Request {
        const request = new Request();
        request._url = json.url;
        request._method = json.method;
        if(json.auth.type === 'clientCredentials') {
            request._auth = ClientCredentialsAuthentication.fromJSON(json.auth)
        }
        request._headers = json.headers;
        request._parameters = json.parameters ? new Map(json.parameters) : undefined;
        return request;
    }
}