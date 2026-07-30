export interface Authentication {
    type: string
}

export class TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

export class TokenState {
  token: string;
  expiresAt: number;
  isExpired: boolean;
}

export class ClientCredentialsAuthentication implements Authentication {
    readonly type = 'clientCredentials'
    clientId?: string
    clientSecret?: string
    oauthUrl?: string
    token?: TokenState
    scope?: string
    enabled: boolean = true

    static fromJSON(json: any): ClientCredentialsAuthentication {
        if(typeof json === 'string') {
            json = JSON.parse(json)
        }
        const auth = new ClientCredentialsAuthentication();
        auth.clientId = json.clientId;
        auth.clientSecret = json.clientSecret;
        auth.oauthUrl = json.oauthUrl;
        auth.token = json.token ? json.token : null;
        auth.scope = json.scope ? json.scope : null;
        auth.enabled = json.enabled !== false;
        return auth;
    }

    static toJSON(auth: Authentication): any {
        if (auth instanceof ClientCredentialsAuthentication) {
            return {
                clientId: auth.clientId,
                clientSecret: auth.clientSecret,
                oauthUrl: auth.oauthUrl,
                token: auth.token,
                scope: auth.scope,
                enabled: auth.enabled
            }
        }
        return {
            authType: "other"
        }
        
    }
}

export class BearerTokenAuthentication implements Authentication {
    readonly type = "bearerToken"
    token?: string
}