import { CertificateAuthentication, ClientCredentialsAuthentication, TokenResponse, TokenState } from "./models/Authentication"
import { Request } from "./models/Request"
import { promises as fs } from 'fs'
import { sendHttpRequest } from './utils/httpTransport'

export async function handleHttpRequest(request: Request, signal?: AbortSignal) {
    const headers = new Headers()
    request.headers.forEach((k,v) => {
      headers.append(v, k)
    })
    let certificate: { cert: string; key: string } | undefined

    if(request.auth) {
      if(request.auth instanceof ClientCredentialsAuthentication) {
        const clientCredentialsAuth: ClientCredentialsAuthentication = request.auth
        if (clientCredentialsAuth.enabled !== false) {
          if (clientCredentialsAuth.token == null || clientCredentialsAuth.token.isExpired == true) {
            console.log("Refetching expired token")
            clientCredentialsAuth.token = await fetchToken(clientCredentialsAuth, signal)
          }
          headers.set("Authorization", "Bearer "+clientCredentialsAuth.token.token)
        }
      } else if (request.auth instanceof CertificateAuthentication) {
        const certAuth: CertificateAuthentication = request.auth
        if (certAuth.enabled !== false && certAuth.certPath && certAuth.keyPath) {
          const [cert, key] = await Promise.all([
            fs.readFile(certAuth.certPath, 'utf-8'),
            fs.readFile(certAuth.keyPath, 'utf-8'),
          ])
          certificate = { cert, key }
        }
      }
    }

    const requestHeaders: Record<string, string> = {}
    headers.forEach((value, key) => { requestHeaders[key] = value })
    return sendHttpRequest(request.url, {
      method: request.method,
      headers: requestHeaders,
      body: request.body,
      signal,
      ...certificate,
    })
}


export async function fetchToken(clientCredentialsRequest: ClientCredentialsAuthentication, signal?: AbortSignal): Promise<TokenState> {
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
    const response = await sendHttpRequest(clientCredentialsRequest.oauthUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
      signal,
    });

    if (response.status < 200 || response.status >= 300) {
      let errorData: { error_description?: string; error?: string } = {};
      try { errorData = JSON.parse(response.body); } catch { /* non-JSON error response */ }
      throw new Error(
        errorData.error_description || 
        errorData.error || 
        `HTTP ${response.status}`
      );
    }

    const data: TokenResponse = JSON.parse(response.body);
    console.log(data)

    if (!data.access_token) {
      throw new Error('No access token received from server');
    }

    // Calculate expiration time (subtract 60 seconds as buffer)
    const expiresIn = (data.expires_in || 3600) - 60;
    const expiresAt = Date.now() + (expiresIn * 1000);
    const isExpired = Date.now() - expiresAt > 0
    const tokenState: TokenState = {
      token: data.access_token,
      expiresAt,
      isExpired: isExpired,
    }

    return tokenState

  } catch (err) {
    throw new Error("Error while fetching request token: "+err)
  }
}
