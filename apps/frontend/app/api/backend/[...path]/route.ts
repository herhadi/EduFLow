import { NextRequest } from 'next/server';

const BACKEND_API_URL = process.env.BACKEND_INTERNAL_API_URL;

function getBackendApiUrl() {
  if (!BACKEND_API_URL) {
    throw new Error('BACKEND_INTERNAL_API_URL belum dikonfigurasi.');
  }

  return BACKEND_API_URL;
}

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function proxy(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const targetUrl = new URL(`${getBackendApiUrl()}/${path.join('/')}`);

  request.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');

  let response: Response;

  try {
    response = await fetch(targetUrl, {
      body: ['GET', 'HEAD'].includes(request.method)
        ? undefined
        : await request.arrayBuffer(),
      headers,
      method: request.method,
      redirect: 'manual',
    });
  } catch {
    return Response.json(
      {
        message:
          'Backend tidak bisa dihubungi. Pastikan backend berjalan di port 3001 dan frontend sudah direstart.',
      },
      { status: 503 },
    );
  }
  const responseHeaders = new Headers(response.headers);

  responseHeaders.delete('content-encoding');
  responseHeaders.delete('content-length');

  return new Response(response.body, {
    headers: responseHeaders,
    status: response.status,
    statusText: response.statusText,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
