import https from 'node:https';

function headerValue(headers, name) {
  const value = headers[String(name).toLowerCase()];
  if (Array.isArray(value)) return value.join(', ');
  return value == null ? null : String(value);
}

export function createNodeHttpTransport({ requestImpl = https.request } = {}) {
  return async function nodeHttpFetch(input, init = {}) {
    const url = input instanceof URL ? input : new URL(String(input));
    if (url.protocol !== 'https:') throw new TypeError('Node agent transport only allows HTTPS');

    return new Promise((resolve, reject) => {
      let settled = false;
      const finishReject = (error) => {
        if (settled) return;
        settled = true;
        reject(error);
      };

      const request = requestImpl(url, {
        method: init.method || 'GET',
        headers: init.headers || {},
      }, (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        response.on('error', finishReject);
        response.on('end', () => {
          if (settled) return;
          settled = true;
          const body = Buffer.concat(chunks).toString('utf8');
          const status = Number(response.statusCode || 0);
          const responseHeaders = response.headers || {};
          resolve({
            ok: status >= 200 && status < 300,
            status,
            headers: {
              get(name) {
                return headerValue(responseHeaders, name);
              },
            },
            async text() {
              return body;
            },
          });
        });
      });

      request.on('error', finishReject);

      const signal = init.signal;
      const abort = () => {
        const error = signal?.reason instanceof Error
          ? signal.reason
          : new DOMException('The operation was aborted', 'AbortError');
        request.destroy(error);
        finishReject(error);
      };
      if (signal) {
        if (signal.aborted) {
          abort();
          return;
        }
        signal.addEventListener('abort', abort, { once: true });
        request.once('close', () => signal.removeEventListener('abort', abort));
      }

      if (init.body != null) request.write(init.body);
      request.end();
    });
  };
}

export const nodeHttpFetch = createNodeHttpTransport();
