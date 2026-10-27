// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from './main';
import { requestItems } from './api';

vi.mock('./auth', () => ({
  loadIdentity: vi.fn(async () => ({
    getUser: async () => ({ access_token: 'test-token', expired: false }),
  })),
}));
vi.mock('./api', () => ({ requestItems: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

test('loads, saves through the API client, and reads back the persisted item', async () => {
  vi.mocked(requestItems).mockResolvedValueOnce([]).mockResolvedValueOnce([])
    .mockResolvedValue([{ Id: 'saved-id', Label: 'Saved item', CreatedAt: '2026-10-27T00:00:00Z' }]);
  render(<App/>);
  await screen.findByText('Loaded from SQL through DAB.');
  fireEvent.change(screen.getByLabelText('New item label'), { target: { value: 'Saved item' } });
  fireEvent.click(screen.getByText('Save item'));
  await screen.findByText('Saved item', { selector: 'li' });
  expect(requestItems).toHaveBeenNthCalledWith(2, 'test-token', 'Saved item');
  expect(requestItems).toHaveBeenNthCalledWith(3, 'test-token');
});

test('preserves form input and reports a denied mutation instead of success', async () => {
  vi.mocked(requestItems).mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('Permission denied.'));
  render(<App/>);
  await screen.findByText('Loaded from SQL through DAB.');
  fireEvent.change(screen.getByLabelText('New item label'), { target: { value: 'Keep my input' } });
  fireEvent.click(screen.getByText('Save item'));
  await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Permission denied.'));
  expect((screen.getByLabelText('New item label') as HTMLInputElement).value).toBe('Keep my input');
});

test('retains the input when a successful mutation cannot be read back', async () => {
  vi.mocked(requestItems).mockResolvedValueOnce([]).mockResolvedValueOnce([])
    .mockRejectedValueOnce(new Error('Readback unavailable.'));
  render(<App/>);
  await screen.findByText('Loaded from SQL through DAB.');
  fireEvent.change(screen.getByLabelText('New item label'), { target: { value: 'Not confirmed yet' } });
  fireEvent.click(screen.getByText('Save item'));
  await screen.findByText('Readback unavailable.');
  expect((screen.getByLabelText('New item label') as HTMLInputElement).value).toBe('Not confirmed yet');
  expect(screen.queryByText('Saved and read back from SQL.')).toBeNull();
});
