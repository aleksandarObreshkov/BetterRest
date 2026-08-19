import { CertificateAuthentication, ClientCredentialsAuthentication, TokenResponse, TokenState } from "./models/Authentication"
import { Request } from "./models/Request"
import * as https from 'https'
import * as http from 'http'
import { URL } from 'url'
import { promises as fs } from 'fs'
import { net } from 'electron'

export async function handleHttpRequest(request: Request) {
    const headers = new Headers()
    request.headers.forEach((k,v) => {
      headers.append(v, k)
    })

    if(request.auth) {
      if(request.auth instanceof ClientCredentialsAuthentication) {
        let clientCredentialsAuth: ClientCredentialsAuthentication = request.auth
        if (clientCredentialsAuth.enabled !== false) {
          if (clientCredentialsAuth.token == null || clientCredentialsAuth.token.isExpired == true) {
            console.log("Refetching expired token")
            clientCredentialsAuth.token = await fetchToken(clientCredentialsAuth)
          }
          headers.set("Authorization", "Bearer "+clientCredentialsAuth.token.token)
        }
      } else if (request.auth instanceof CertificateAuthentication) {
        const certAuth: CertificateAuthentication = request.auth
        if (certAuth.enabled !== false && certAuth.certPath && certAuth.keyPath) {
          return await handleHttpRequestWithCert(request, certAuth, headers)
        }
      }
    }

    const result = await net.fetch(request.url, {
      method: request.method,
      headers: headers,
      body: request.body
    })

    const body = await result.text()

    const responseHeaders: Record<string, string> = {}
    result.headers.forEach((value, key) => { responseHeaders[key] = value })

    return {
      body,
      status: result.status,
      contentType: result.headers.get('content-type') ?? '',
      headers: responseHeaders,
    }
}

async function handleHttpRequestWithCert(request: Request, certAuth: CertificateAuthentication, headers: Headers): Promise<{ body: string; status: number; contentType: string; headers: Record<string, string> }> {
  const [certPem, keyPem] = await Promise.all([
    fs.readFile(certAuth.certPath, 'utf-8'),
    fs.readFile(certAuth.keyPath, 'utf-8'),
  ])

  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(request.url)
    const headerObj: Record<string, string> = {}
    headers.forEach((value, key) => { headerObj[key] = value })

    const options: https.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: request.method,
      headers: headerObj,
      cert: certPem,
      key: keyPem,
    }

    const transport = parsedUrl.protocol === 'https:' ? https : http
    const req = (transport as typeof https).request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        const responseHeaders: Record<string, string> = {}
        Object.entries(res.headers).forEach(([k, v]) => {
          if (v !== undefined) responseHeaders[k] = Array.isArray(v) ? v.join(', ') : v
        })
        resolve({
          body: data,
          status: res.statusCode ?? 0,
          contentType: (res.headers['content-type'] as string) ?? '',
          headers: responseHeaders,
        })
      })
    })

    req.on('error', reject)

    if (request.body) {
      req.write(request.body)
    }
    req.end()
  })
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
    const response = await net.fetch(clientCredentialsRequest.oauthUrl, {
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
    let isExpired = Date.now() - expiresAt > 0
    const tokenState: TokenState = {
      token: data.access_token,
      expiresAt,
      isExpired: isExpired,
    }

    return tokenState

  } catch (err) {
    throw new Error("Error while fetching request token: "+err)
  }
};