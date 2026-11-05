import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState, type FormEvent } from 'react';
import { simulationApi } from '../api/simulation';
import { QueryState } from '../components/QueryState';
import { TriggerSelect } from '../components/TriggerSelect';
import { ACTION_LABELS, TRIGGER_LABELS } from '../constants';
import { useAsyncAction } from '../hooks/useAsyncAction';
import type { Playbook, Trigger } from '../types';

type SimulationResult = { trigger: Trigger; playbooks: Playbook[] };

export function SimulatePage() {
  const simulation = useAsyncAction(simulationApi.simulate);
  const [trigger, setTrigger] = useState<Trigger | ''>('');
  const [triggerError, setTriggerError] = useState<string | undefined>();
  const [result, setResult] = useState<SimulationResult | null>(null);
  // Retry repeats the trigger that was actually submitted, even if the selection changed since.
  const [lastTrigger, setLastTrigger] = useState<Trigger | null>(null);

  async function simulate(selected: Trigger): Promise<void> {
    setResult(null);
    setLastTrigger(selected);
    const outcome = await simulation.run(selected);
    if (outcome.ok) setResult({ trigger: selected, playbooks: outcome.data });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!trigger) {
      setTriggerError('Select a trigger');
      return;
    }
    setTriggerError(undefined);
    void simulate(trigger);
  }

  const heading = result
    ? `Matching Playbooks (${result.playbooks.length}): ${TRIGGER_LABELS[result.trigger]}`
    : 'Matching Playbooks';
  const hasOutcome = result !== null || simulation.isPending || simulation.error !== null;

  return (
    <Stack spacing={3}>
      <Typography variant="h1">Simulate Event</Typography>

      <Paper component="form" noValidate onSubmit={handleSubmit} sx={{ p: 3 }}>
        <Stack spacing={2} sx={{ maxWidth: 480, mx: 'auto' }}>
          <TriggerSelect value={trigger} onChange={setTrigger} error={triggerError} disabled={simulation.isPending} />
          <Button type="submit" variant="contained" disabled={simulation.isPending}>
            {simulation.isPending ? 'Running…' : 'Run Simulation'}
          </Button>
          <Alert severity="info">Simulation only: no actions are executed.</Alert>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          {/* Announces the result count to screen readers when a run finishes. */}
          <Typography variant="h2" aria-live="polite">
            {heading}
          </Typography>

          {hasOutcome ? (
            <QueryState
              isLoading={simulation.isPending}
              error={simulation.error?.message ?? null}
              isEmpty={result?.playbooks.length === 0}
              emptyMessage={result ? `No playbooks match ${TRIGGER_LABELS[result.trigger]}.` : ''}
              onRetry={lastTrigger ? () => void simulate(lastTrigger) : undefined}
            >
              <Stack spacing={2} component="ul" aria-label="Matching playbooks" sx={{ listStyle: 'none', p: 0, m: 0 }}>
                {result?.playbooks.map((playbook) => (
                  <Box component="li" key={playbook.id}>
                    <Typography sx={{ fontWeight: 600 }}>Playbook: {playbook.name}</Typography>
                    <List component="ol" dense disablePadding aria-label={`Actions for ${playbook.name}`} sx={{ pl: 3 }}>
                      {playbook.actions.map((action) => (
                        <ListItem key={action} disableGutters>
                          <span aria-hidden="true">→ </span>
                          {ACTION_LABELS[action]}
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                ))}
              </Stack>
            </QueryState>
          ) : (
            <Typography color="text.secondary">Select a trigger and run a simulation to see which playbooks would run.</Typography>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}
