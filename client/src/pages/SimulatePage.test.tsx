import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { simulationApi } from '../api/simulation';
import { AppRoutes } from '../AppRoutes';
import { renderWithProviders, selectTrigger, testUser } from '../test/renderWithProviders';
import type { Playbook } from '../types';

vi.mock('../api/simulation', () => ({ simulationApi: { simulate: vi.fn() } }));

const matches: Playbook[] = [
  { id: 'pb-2', name: 'Alert & Contain', trigger: 'MALWARE_DETECTED', actions: ['NOTIFY_ADMIN', 'BLOCK_IP'] },
  { id: 'pb-1', name: 'Critical Malware Resp.', trigger: 'MALWARE_DETECTED', actions: ['ISOLATE_HOST', 'NOTIFY_ADMIN'] },
];

function renderPage() {
  renderWithProviders(<AppRoutes />, { route: '/simulate', user: testUser });
}

async function runFor(label: string) {
  await selectTrigger(label);
  await userEvent.click(screen.getByRole('button', { name: 'Run Simulation' }));
}

describe('SimulatePage', () => {
  beforeEach(() => {
    vi.mocked(simulationApi.simulate).mockReset();
  });

  it('shows the safety notice and a hint before any run', () => {
    renderPage();

    expect(screen.getByText('Simulation only: no actions are executed.')).toBeInTheDocument();
    expect(screen.getByText(/Select a trigger and run a simulation/)).toBeInTheDocument();
  });

  it('requires a trigger before running', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: 'Run Simulation' }));

    expect(screen.getByText('Select a trigger')).toBeInTheDocument();
    expect(simulationApi.simulate).not.toHaveBeenCalled();
  });

  it('sends the selected trigger and lists every match with its actions in order', async () => {
    vi.mocked(simulationApi.simulate).mockResolvedValue(matches);
    renderPage();

    await runFor('Malware Detected');

    expect(simulationApi.simulate).toHaveBeenCalledWith('MALWARE_DETECTED');
    expect(await screen.findByRole('heading', { name: 'Matching Playbooks (2): Malware Detected' })).toBeInTheDocument();
    const results = screen.getByRole('list', { name: 'Matching playbooks' });
    expect(within(results).getByText('Playbook: Alert & Contain')).toBeInTheDocument();
    const actions = within(screen.getByRole('list', { name: 'Actions for Critical Malware Resp.' })).getAllByRole('listitem');
    expect(actions.map((item) => item.textContent)).toEqual(['→ Isolate Host', '→ Notify Admin']);
  });

  it('shows an empty message when no playbook matches', async () => {
    vi.mocked(simulationApi.simulate).mockResolvedValue([]);
    renderPage();

    await runFor('Phishing Alert');

    expect(await screen.findByText('No playbooks match Phishing Alert.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Matching Playbooks (0): Phishing Alert' })).toBeInTheDocument();
  });

  it('clears the previous result heading while a new run is pending', async () => {
    vi.mocked(simulationApi.simulate).mockResolvedValueOnce(matches).mockReturnValueOnce(new Promise(() => {}));
    renderPage();
    await runFor('Malware Detected');
    expect(await screen.findByRole('heading', { name: 'Matching Playbooks (2): Malware Detected' })).toBeInTheDocument();

    await runFor('Phishing Alert');

    expect(screen.getByRole('heading', { name: 'Matching Playbooks' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Loading' })).toBeInTheDocument();
  });

  it('shows an error and retries the submitted trigger, even after the selection changes', async () => {
    vi.mocked(simulationApi.simulate)
      .mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'Unable to reach the server.'))
      .mockResolvedValueOnce(matches);
    renderPage();

    await runFor('Malware Detected');
    expect(await screen.findByText('Unable to reach the server.')).toBeInTheDocument();
    await selectTrigger('Phishing Alert');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Playbook: Alert & Contain')).toBeInTheDocument();
    expect(simulationApi.simulate).toHaveBeenLastCalledWith('MALWARE_DETECTED');
  });

  it('disables the run button and shows progress while running', async () => {
    vi.mocked(simulationApi.simulate).mockReturnValue(new Promise(() => {}));
    renderPage();

    await runFor('Login Attempt');

    expect(screen.getByRole('button', { name: 'Running…' })).toBeDisabled();
    expect(screen.getByRole('progressbar', { name: 'Loading' })).toBeInTheDocument();
  });
});
