import { DemoApiError, DemoClient } from './client.js';

function required(id: string): HTMLElement {
  const value = document.getElementById(id);
  if (!value) throw new Error(`Missing application element ${id}`);
  return value;
}
const title = required('title');
const synthetic = required('synthetic');
if (!(title instanceof HTMLInputElement) || !(synthetic instanceof HTMLInputElement)) throw new Error('Invalid application form');
const panel = required('application');
const startPanel = required('start-panel');
const status = required('status');
const list = required('todos');
const client = new DemoClient();

function anonymous() {
  panel.hidden = true;
  startPanel.hidden = false;
  list.replaceChildren();
}
async function action(operation: () => Promise<void>) {
  try {
    status.textContent = '';
    await operation();
  } catch (error) {
    if (error instanceof DemoApiError && error.status === 401) anonymous();
    status.textContent = error instanceof Error ? error.message : 'Application operation failed';
  }
}
async function refresh() {
  const items = await client.list();
  required('count').textContent = `${items.length} / 50 items`;
  list.replaceChildren();
  for (const item of items) {
    const row = document.createElement('li');
    const complete = document.createElement('input');
    complete.type = 'checkbox';
    complete.checked = item.completed;
    complete.setAttribute('aria-label', `Completed: ${item.title}`);
    const editor = document.createElement('input');
    editor.type = 'text';
    editor.value = item.title;
    editor.maxLength = 200;
    editor.setAttribute('aria-label', 'Edit synthetic title');
    const save = document.createElement('button');
    save.type = 'button';
    save.textContent = 'Save';
    save.addEventListener('click', () => { void action(async () => {
      await client.update(item.id, { title: editor.value, completed: complete.checked });
      await refresh();
    }); });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Delete';
    remove.addEventListener('click', () => { void action(async () => {
      await client.delete(item.id);
      await refresh();
    }); });
    row.append(complete, editor, save, remove);
    list.append(row);
  }
}
async function active(session: { expiresAt: string }) {
  required('expiry').textContent = `Anonymous session expires at ${new Date(session.expiresAt).toLocaleTimeString()}.`;
  await refresh();
  panel.hidden = false;
  startPanel.hidden = true;
}
required('start').addEventListener('click', () => { void action(async () => {
  if (!synthetic.checked) throw new Error('Acknowledge synthetic data only before starting.');
  await active(await client.start());
}); });
required('end').addEventListener('click', () => { void action(async () => {
  await client.end();
  anonymous();
  status.textContent = 'Session ended; its items were deleted.';
}); });
required('todo-form').addEventListener('submit', event => {
  event.preventDefault();
  void action(async () => {
    await client.create(title.value);
    title.value = '';
    await refresh();
  });
});
void (async () => {
  try { await active(await client.session()); }
  catch (error) {
    anonymous();
    if (!(error instanceof DemoApiError && error.status === 401)) {
      status.textContent = error instanceof Error ? error.message : 'Session initialization failed';
    }
  }
})();
