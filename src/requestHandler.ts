import { ClientCredentialsAuthentication, TokenResponse, TokenState } from "./models/Authentication"
import { Request } from "./models/Request"

export async function handleHttpRequest(request: Request) {
    const headers = new Headers()
    request.headers.forEach((k,v) => headers.append(k, v))
    const result = await fetch(request.url, {
      method: request.method, 
      headers: headers
    })

    const body = await result.text()

    return {
      body: body, 
      status: result.status
    }
}

  export async function fetchToken(clientCredentialsRequest: ClientCredentialsAuthentication): Promise<TokenState> {
    try {
      // Prepare request body
      const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientCredentialsRequest.clientId,
        client_secret: clientCredentialsRequest.clientSecret,
      });

      if (clientCredentialsRequest.scope) {
        body.append('scope', clientCredentialsRequest.scope);
      }

      // Make token request
      const response = await fetch(clientCredentialsRequest.oauthUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error_description || 
          errorData.error || 
          `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data: TokenResponse = await response.json();
      console.log(data)

      if (!data.access_token) {
        throw new Error('No access token received from server');
      }

      // Calculate expiration time (subtract 60 seconds as buffer)
      const expiresIn = (data.expires_in || 3600) - 60;
      const expiresAt = Date.now() + (expiresIn * 1000);
      const tokenState: TokenState = {
        token: data.access_token,
        expiresAt,
        isExpired: false,
      }

      return tokenState

    } catch (err) {
      throw new Error("Error while fetching request token: "+err)
    }
  };