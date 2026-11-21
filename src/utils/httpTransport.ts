import * as http from 'http';
import * as https from 'https';
import { brotliDecompressSync, gunzipSync, inflateSync } from 'zlib';
import { HttpResponse } from '../types/HttpResponse';

interface HttpOptions {
  method: string;
  headers: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
  cert?: string;
  key?: string;
}

// Node's transport has no response deadline, unlike Chromium's fetch transport.
export async function sendHttpRequest(url: string, options: HttpOptions, redirects = 0): Promise<HttpResponse> {
  options.signal?.throwIfAborted();
  options = {
    ...options,
    headers: Object.fromEntries(Object.entries(options.headers).map(([key, value]) => [key.toLowerCase(), value])),
  };
  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error('Only HTTP and HTTPS URLs are supported.');
  }
  const response = await new Promise<HttpResponse>((resolve, reject) => {
    const transport = parsedUrl.protocol === 'https:' ? https : http;
    const req = transport.request(parsedUrl, { ...options, agent: false }, res => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('error', reject);
      res.on('aborted', () => reject(new Error('The server closed the response before it completed.')));
      res.on('end', () => {
        try {
          let body = Buffer.concat(chunks);
          const encoding = res.headers['content-encoding'];
          if (body.length && options.method !== 'HEAD') {
            if (encoding === 'gzip') body = gunzipSync(body);
            else if (encoding === 'deflate') body = inflateSync(body);
            else if (encoding === 'br') body = brotliDecompressSync(body);
          }
          const headers: Record<string, string> = {};
          Object.entries(res.headers).forEach(([key, value]) => {
            if (value !== undefined) headers[key] = Array.isArray(value) ? value.join(', ') : value;
          });
          resolve({ body: body.toString('utf-8'), status: res.statusCode ?? 0, contentType: headers['content-type'] ?? '', headers });
        } catch (error) {
          reject(error);
        }
      });
    });
    req.setTimeout(0);
    req.on('error', reject);
    req.end(options.body);
  });

  if ([301, 302, 303, 307, 308].includes(response.status) && response.headers.location) {
    if (redirects >= 20) throw new Error('Too many redirects.');
    const nextUrl = new URL(response.headers.location, parsedUrl);
    const nextOptions = { ...options, headers: { ...options.headers } };
    delete nextOptions.headers.host;
    if (nextUrl.origin !== parsedUrl.origin) {
      delete nextOptions.headers.authorization;
      delete nextOptions.headers.cookie;
      delete nextOptions.cert;
      delete nextOptions.key;
    }
    if ((response.status === 303 && options.method !== 'HEAD') ||
        ([301, 302].includes(response.status) && options.method === 'POST')) {
      nextOptions.method = 'GET';
      nextOptions.body = undefined;
      delete nextOptions.headers['content-length'];
      delete nextOptions.headers['content-type'];
      delete nextOptions.headers['transfer-encoding'];
    }
    return sendHttpRequest(nextUrl.toString(), nextOptions, redirects + 1);
  }
  return response;
}
