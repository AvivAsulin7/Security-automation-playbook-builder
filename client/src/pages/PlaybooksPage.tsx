import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import FormHelperText from '@mui/material/FormHelperText';
import FormLabel from '@mui/material/FormLabel';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState, type FormEvent } from 'react';
import { fieldErrorsFrom } from '../api/client';
import { playbooksApi } from '../api/playbooks';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PlaybookList } from '../components/PlaybookList';
import { QueryState } from '../components/QueryState';
import { TriggerSelect } from '../components/TriggerSelect';
import { ACTION_LABELS, ACTIONS } from '../constants';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { usePlaybooks } from '../hooks/usePlaybooks';
import type { Action, Playbook, Trigger } from '../types';

type FieldErrors = { name?: string; trigger?: string; actions?: string };

// Mirrors the contract rules for quick feedback; the server remains authoritative.
function validate(name: string, trigger: Trigger | '', actions: Action[]): FieldErrors {
  const errors: FieldErrors = {};
  if (!name) errors.name = 'Name is required';
  else if (name.length > 100) errors.name = 'Name must be at most 100 characters';
  if (!trigger) errors.trigger = 'Select a trigger';
  if (actions.length === 0) errors.actions = 'Select at least one action';
  return errors;
}

const PLAYBOOK_FIELDS = ['name', 'trigger', 'actions'] as const;

export function PlaybooksPage() {
  const { playbooks, isLoading, error: loadError, refetch } = usePlaybooks();
  const createAction = useAsyncAction(playbooksApi.create);
  const deleteAction = useAsyncAction(playbooksApi.remove);

  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState<Trigger | ''>('');
  const [actions, setActions] = useState<Action[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Kept after closing so the dialog text stays intact during its close animation.
  const [toDelete, setToDelete] = useState<Playbook | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  function askToDelete(playbook: Playbook): void {
    setToDelete(playbook);
    setIsDeleteDialogOpen(true);
  }

  // Actions keep the order in which they were selected.
  function toggleAction(action: Action): void {
    setActions((current) =>
      current.includes(action) ? current.filter((a) => a !== action) : [...current, action],
    );
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmedName = name.trim();
    const errors = validate(trimmedName, trigger, actions);
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0 || !trigger) return;

    const result = await createAction.run({ name: trimmedName, trigger, actions });
    if (result.ok) {
      setName('');
      setTrigger('');
      setActions([]);
      setToast('Playbook created');
      refetch();
      return;
    }
    const serverErrors = fieldErrorsFrom(result.error, PLAYBOOK_FIELDS);
    if (Object.keys(serverErrors).length > 0) setFieldErrors(serverErrors);
    else setFormError(result.error.message);
  }

  async function handleConfirmDelete(): Promise<void> {
    if (!toDelete) return;
    const result = await deleteAction.run(toDelete.id);
    setIsDeleteDialogOpen(false);
    if (result.ok) setToast('Playbook deleted');
    refetch();
  }

  return (
    <Stack spacing={3}>
      <title>Create Playbook | Playbook Builder</title>
      <Typography variant="h1">Create Playbook</Typography>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, alignItems: 'start' }}>
        <Paper component="form" noValidate onSubmit={(event) => void handleCreate(event)} sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            <Typography variant="h2">New Playbook</Typography>
            {formError && <Alert severity="error">{formError}</Alert>}

            <TextField
              label="Name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              error={Boolean(fieldErrors.name)}
              helperText={fieldErrors.name}
            />

            <TriggerSelect value={trigger} onChange={setTrigger} error={fieldErrors.trigger} />

            <FormControl component="fieldset" required error={Boolean(fieldErrors.actions)}>
              <FormLabel component="legend">Actions</FormLabel>
              <FormGroup aria-describedby="actions-helper-text">
                {ACTIONS.map((action) => (
                  <FormControlLabel
                    key={action}
                    label={ACTION_LABELS[action]}
                    control={<Checkbox checked={actions.includes(action)} onChange={() => toggleAction(action)} />}
                  />
                ))}
              </FormGroup>
              <FormHelperText id="actions-helper-text">
                {fieldErrors.actions ??
                  (actions.length > 0
                    ? `Run order: ${actions.map((a) => ACTION_LABELS[a]).join(' → ')}`
                    : 'Choose 1–3 actions; they run in the order selected.')}
              </FormHelperText>
            </FormControl>

            <Box>
              <Button type="submit" variant="contained" disabled={createAction.isPending}>
                {createAction.isPending ? 'Creating…' : 'Create'}
              </Button>
            </Box>
          </Stack>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h2">Your Playbooks</Typography>
            {deleteAction.error && (
              <Alert severity="error" onClose={deleteAction.clearError}>
                {deleteAction.error.message}
              </Alert>
            )}
            <QueryState
              isLoading={isLoading}
              error={loadError}
              isEmpty={playbooks.length === 0}
              emptyMessage="No playbooks yet. Create your first one."
              onRetry={refetch}
            >
              <PlaybookList playbooks={playbooks} onDelete={askToDelete} />
            </QueryState>
          </Stack>
        </Paper>
      </Box>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        title="Delete playbook?"
        message={`"${toDelete?.name ?? ''}" will be permanently deleted.`}
        confirmLabel="Delete"
        isPending={deleteAction.isPending}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />

      <Snackbar
        open={toast !== null}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Stack>
  );
}
