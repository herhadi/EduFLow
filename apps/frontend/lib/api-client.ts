const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function getApiUrl() {
  if (!API_URL) {
    throw new Error('NEXT_PUBLIC_API_URL belum dikonfigurasi.');
  }

  return API_URL;
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const accessToken =
    typeof window === 'undefined' ? undefined : localStorage.getItem('accessToken');
  const response = await fetch(`${getApiUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers,
    },
  });

  if (response.status === 401) {
    clearSessionAndRedirect();
    throw new Error('Session berakhir. Silakan login ulang.');
  }

  if (!response.ok) {
    let message = `API request failed: ${response.status}`;

    try {
      const body = (await response.json()) as { message?: string | string[] };
      const responseMessage = Array.isArray(body.message)
        ? body.message.join(', ')
        : body.message;

      if (responseMessage) {
        message = responseMessage;
      }
    } catch {
      // Biarkan fallback status dipakai jika response bukan JSON.
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function upload<T>(path: string, file: File): Promise<T> {
  const formData = new FormData();
  formData.append('file', file);
  const accessToken =
    typeof window === 'undefined' ? undefined : localStorage.getItem('accessToken');

  const response = await fetch(`${getApiUrl()}${path}`, {
    method: 'POST',
    body: formData,
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });

  if (response.status === 401) {
    clearSessionAndRedirect();
    throw new Error('Session berakhir. Silakan login ulang.');
  }

  if (!response.ok) {
    let message = `API upload failed: ${response.status}`;

    try {
      const body = (await response.json()) as { message?: string | string[] };
      const responseMessage = Array.isArray(body.message)
        ? body.message.join(', ')
        : body.message;

      if (responseMessage) {
        message = responseMessage;
      }
    } catch {
      // Biarkan fallback status dipakai jika response bukan JSON.
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function download(path: string) {
  const token = localStorage.getItem('accessToken');
  const response = await fetch(`${getApiUrl()}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) throw new Error('Backup gagal dibuat.');

  const blob = await response.blob();
  const filename =
    response.headers.get('content-disposition')?.match(/filename="?([^";]+)"?/)?.[1]
    ?? 'eduflow-backup.dump';
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function restoreBackup<T>(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('confirmation', 'RESTORE');
  const token = localStorage.getItem('accessToken');
  const response = await fetch(`${getApiUrl()}/operations/backups/daily/restore`, {
    method: 'POST',
    body: formData,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) throw new Error('Restore gagal.');

  return response.json() as Promise<T>;
}

function clearSessionAndRedirect() {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('sessionExpiresAt');
  localStorage.removeItem('currentUser');

  if (window.location.pathname !== '/login') {
    window.location.href = '/login?reason=session-expired';
  }
}
