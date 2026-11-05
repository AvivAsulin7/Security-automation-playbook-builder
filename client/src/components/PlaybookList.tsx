import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ACTION_LABELS, TRIGGER_LABELS } from '../constants';
import type { Playbook } from '../types';

type PlaybookListProps = {
  playbooks: Playbook[];
  onDelete: (playbook: Playbook) => void;
};

export function PlaybookList({ playbooks, onDelete }: PlaybookListProps) {
  return (
    <List disablePadding aria-label="Playbooks">
      {playbooks.map((playbook) => (
        <ListItem
          key={playbook.id}
          divider
          disableGutters
          secondaryAction={
            <Button color="error" size="small" onClick={() => onDelete(playbook)} aria-label={`Delete ${playbook.name}`}>
              Delete
            </Button>
          }
        >
          <ListItemText
            primary={playbook.name}
            secondary={
              <Stack component="span" direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.5, flexWrap: 'wrap' }}>
                <Chip component="span" size="small" color="primary" variant="outlined" label={TRIGGER_LABELS[playbook.trigger]} />
                <Typography component="span" variant="body2" color="text.secondary">
                  {playbook.actions.map((action) => ACTION_LABELS[action]).join(' → ')}
                </Typography>
              </Stack>
            }
            sx={{ pr: 10 }}
          />
        </ListItem>
      ))}
    </List>
  );
}
