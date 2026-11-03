import { isItem, type Item } from '@app/shared';
import { AuthenticationRequiredError } from './api';

async function failure(response: Response): Promise<never> {
  if (response.status === 401) throw new AuthenticationRequiredError('Owner session is not accepted. Sign in again.');
  if (response.status === 403) throw new Error('Owner access denied. An operator must enroll this verified identity.');
  if (response.status === 429) throw new Error('Submissions are temporarily closed. Retry later.');
  throw new Error(`The service could not complete the request (${response.status}). Retry later.`);
}

export async function submitLabel(label: string): Promise<void> {
  const response = await fetch('/api/Submit', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ Label: label }),
  });
  if (!response.ok) return failure(response);
  const result: unknown = await response.json();
  if (response.status !== 202 || typeof result !== 'object' || result === null ||
      Object.keys(result).length !== 1 || !('accepted' in result) || result.accepted !== true) {
    throw new Error('The service returned an unexpected acknowledgement.');
  }
}

export async function loadSubmissions(token: string): Promise<Item[]> {
  const response = await fetch('/api/Submissions', { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) return failure(response);
  const result: unknown = await response.json();
  if (typeof result !== 'object' || result === null || !('value' in result) ||
      !Array.isArray(result.value) || result.value.length > 100 || !result.value.every(isItem)) {
    throw new Error('The service returned an unexpected inbox response.');
  }
  return result.value;
}
