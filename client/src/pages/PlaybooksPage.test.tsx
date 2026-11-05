import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { playbooksApi } from '../api/playbooks';
import { AppRoutes } from '../AppRoutes';
import { renderWithProviders, testUser } from '../test/renderWithProviders';
import type { Playbook } from '../types';

vi.mock('../api/playbooks', () => ({
  playbooksApi: { list: vi.fn(), create: vi.fn(), remove: vi.fn() },
}));

const malwarePlaybook: Playbook = {
  id: 'pb-1',
  name: 'Critical Malware Response',
  trigger: 'MALWARE_DETECTED',
  actions: ['ISOLATE_HOST', 'NOTIFY_ADMIN'],
};

function renderPage() {
  renderWithProviders(<AppRoutes />, { route: '/playbooks', user: testUser });
}

async function selectTrigger(label: string) {
  await userEvent.click(screen.getByRole('combobox', { name: /Trigger/ }));
  await userEvent.click(await screen.findByRole('option', { name: label }));
}

const playbookList = () => screen.getByRole('list', { name: 'Playbooks' });

describe('PlaybooksPage', () => {
  beforeEach(() => {
    vi.mocked(playbooksApi.list).mockReset().mockResolvedValue([]);
    vi.mocked(playbooksApi.create).mockReset();
    vi.mocked(playbooksApi.remove).mockReset();
  });

  it('shows a loading indicator while playbooks load', () => {
    vi.mocked(playbooksApi.list).mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByRole('progressbar', { name: 'Loading' })).toBeInTheDocument();
  });

  it('shows an empty state when there are no playbooks', async () => {
    renderPage();

    expect(await screen.findByText('No playbooks yet. Create your first one.')).toBeInTheDocument();
  });

  it('lists playbooks with their trigger and ordered actions', async () => {
    vi.mocked(playbooksApi.list).mockResolvedValue([malwarePlaybook]);
    renderPage();

    const list = await screen.findByRole('list', { name: 'Playbooks' });
    expect(within(list).getByText('Critical Malware Response')).toBeInTheDocument();
    expect(within(list).getByText('Malware Detected')).toBeInTheDocument();
    expect(within(list).getByText('Isolate Host → Notify Admin')).toBeInTheDocument();
  });

  it('shows a load error and retries', async () => {
    vi.mocked(playbooksApi.list)
      .mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'Unable to reach the server.'))
      .mockResolvedValueOnce([malwarePlaybook]);
    renderPage();

    expect(await screen.findByText('Unable to reach the server.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Critical Malware Response')).toBeInTheDocument();
  });

  it.each([
    ['a blank name', { name: '', trigger: 'Phishing Alert', action: 'Block IP' }, 'Name is required'],
    ['no trigger', { name: 'Phish', trigger: null, action: 'Block IP' }, 'Select a trigger'],
    ['no actions', { name: 'Phish', trigger: 'Phishing Alert', action: null }, 'Select at least one action'],
  ])('shows a field error and does not submit with %s', async (_label, input, message) => {
    renderPage();
    await screen.findByText('No playbooks yet. Create your first one.');
    if (input.name) await userEvent.type(screen.getByLabelText(/^Name/), input.name);
    if (input.trigger) await selectTrigger(input.trigger);
    if (input.action) await userEvent.click(screen.getByLabelText(input.action));

    await userEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(playbooksApi.create).not.toHaveBeenCalled();
  });

  it('creates a playbook with actions in selection order, then resets the form and reloads the list', async () => {
    const created: Playbook = { id: 'pb-2', name: 'Phish', trigger: 'PHISHING_ALERT', actions: ['BLOCK_IP', 'ISOLATE_HOST'] };
    vi.mocked(playbooksApi.create).mockResolvedValue(created);
    vi.mocked(playbooksApi.list).mockResolvedValueOnce([]).mockResolvedValueOnce([created]);
    renderPage();
    await screen.findByText('No playbooks yet. Create your first one.');

    await userEvent.type(screen.getByLabelText(/^Name/), '  Phish ');
    await selectTrigger('Phishing Alert');
    await userEvent.click(screen.getByLabelText('Block IP'));
    await userEvent.click(screen.getByLabelText('Isolate Host'));
    expect(screen.getByText('Run order: Block IP → Isolate Host')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(playbooksApi.create).toHaveBeenCalledWith({
      name: 'Phish',
      trigger: 'PHISHING_ALERT',
      actions: ['BLOCK_IP', 'ISOLATE_HOST'],
    });
    expect(await screen.findByText('Playbook created')).toBeInTheDocument();
    expect(await within(playbookList()).findByText('Phish')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Name/)).toHaveValue('');
  });

  it('shows server field errors and general errors on create', async () => {
    vi.mocked(playbooksApi.create)
      .mockRejectedValueOnce(
        new ApiError(400, 'VALIDATION_ERROR', 'Invalid request', [{ field: 'name', message: 'Name is too long' }]),
      )
      .mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR', 'An unexpected error occurred'));
    renderPage();
    await screen.findByText('No playbooks yet. Create your first one.');
    await userEvent.type(screen.getByLabelText(/^Name/), 'Phish');
    await selectTrigger('Phishing Alert');
    await userEvent.click(screen.getByLabelText('Block IP'));

    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(await screen.findByText('Name is too long')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('An unexpected error occurred');
  });

  it('asks for confirmation and does not delete when cancelled', async () => {
    vi.mocked(playbooksApi.list).mockResolvedValue([malwarePlaybook]);
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Delete Critical Malware Response' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete playbook?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(playbooksApi.remove).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('deletes after confirmation and removes the playbook from the list', async () => {
    vi.mocked(playbooksApi.list).mockResolvedValueOnce([malwarePlaybook]).mockResolvedValueOnce([]);
    vi.mocked(playbooksApi.remove).mockResolvedValue(undefined);
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Delete Critical Malware Response' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));

    expect(playbooksApi.remove).toHaveBeenCalledWith('pb-1');
    expect(await screen.findByText('Playbook deleted')).toBeInTheDocument();
    expect(await screen.findByText('No playbooks yet. Create your first one.')).toBeInTheDocument();
  });

  it('keeps the list visible (no spinner) while it reloads after a change', async () => {
    vi.mocked(playbooksApi.list).mockResolvedValueOnce([malwarePlaybook]).mockReturnValueOnce(new Promise(() => {}));
    vi.mocked(playbooksApi.remove).mockResolvedValue(undefined);
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Delete Critical Malware Response' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Playbook deleted')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByRole('progressbar', { name: 'Loading' })).not.toBeInTheDocument();
    expect(within(playbookList()).getByText('Critical Malware Response')).toBeInTheDocument();
  });

  it('shows an error when delete fails', async () => {
    vi.mocked(playbooksApi.list).mockResolvedValue([malwarePlaybook]);
    vi.mocked(playbooksApi.remove).mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Playbook not found'));
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Delete Critical Malware Response' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Playbook not found')).toBeInTheDocument();
  });
});
