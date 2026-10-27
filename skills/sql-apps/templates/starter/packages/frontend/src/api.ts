import { isItem, type Item } from '@app/shared';

export async function requestItems(token: string, label?: string): Promise<Item[]> {
  const response = await fetch(label === undefined ? '/api/Items?$orderby=CreatedAt desc' : '/api/CreateItem', {
    method: label === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: label === undefined ? undefined : JSON.stringify({ Label: label }),
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error('Your session is not accepted. Sign in again or check the API audience.');
    if (response.status === 403) throw new Error('This identity is not permitted to perform this operation.');
    if (response.status === 409) throw new Error('An item with that label already exists.');
    throw new Error(`The data service could not complete the request (${response.status}). It may be unavailable or paused. Retry without changing your input.`);
  }
  const result: unknown = await response.json();
  if (typeof result !== 'object' || result === null || !('value' in result) ||
      !Array.isArray(result.value) || !result.value.every(isItem)) {
    throw new Error('The data service returned an unexpected response.');
  }
  return result.value;
}
