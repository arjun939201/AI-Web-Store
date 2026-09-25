const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function request(path, token, options = {}) {
  if (!token) throw new Error('Sign in to access your private app data.');
  let response;
  try {
    response = await fetch(API + path, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        Authorization: 'Bearer ' + token,
        ...options.headers,
      },
    });
  } catch {
    throw new Error('Could not reach the AI Store API. Check your connection and try again.');
  }

  if (!response.ok) {
    let detail = '';
    try {
      const body = await response.json();
      detail = typeof body.detail === 'string' ? body.detail : '';
    } catch {}
    if (response.status === 401) {
      throw new Error('Your session has expired. Sign in again to access private app data.');
    }
    if (response.status === 404) {
      throw new Error(detail || 'This app or record could not be found.');
    }
    throw new Error(detail || 'The request failed (' + response.status + ').');
  }

  if (response.status === 204) return null;
  return response.json();
}

const entityPath = (slug, entity) =>
  '/api/apps/' + encodeURIComponent(slug) + '/data/' + encodeURIComponent(entity);

export function listRecords(slug, entity, token) {
  return request(entityPath(slug, entity), token);
}

export function createRecord(slug, entity, token, data) {
  return request(entityPath(slug, entity), token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateRecord(slug, entity, recordId, token, data) {
  return request(
    entityPath(slug, entity) + '/' + encodeURIComponent(recordId),
    token,
    { method: 'PATCH', body: JSON.stringify(data) },
  );
}

export function deleteRecord(slug, entity, recordId, token) {
  return request(
    entityPath(slug, entity) + '/' + encodeURIComponent(recordId),
    token,
    { method: 'DELETE' },
  );
}
