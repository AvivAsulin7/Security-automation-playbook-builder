import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { TRIGGER_LABELS, TRIGGERS } from '../constants';
import type { Trigger } from '../types';

type TriggerSelectProps = {
  value: Trigger | '';
  onChange: (trigger: Trigger) => void;
  error?: string;
  disabled?: boolean;
};

export function TriggerSelect({ value, onChange, error, disabled }: TriggerSelectProps) {
  return (
    <TextField
      select
      required
      label="Trigger"
      value={value}
      onChange={(event) => onChange(event.target.value as Trigger)}
      error={Boolean(error)}
      helperText={error}
      disabled={disabled}
    >
      {TRIGGERS.map((trigger) => (
        <MenuItem key={trigger} value={trigger}>
          {TRIGGER_LABELS[trigger]}
        </MenuItem>
      ))}
    </TextField>
  );
}
