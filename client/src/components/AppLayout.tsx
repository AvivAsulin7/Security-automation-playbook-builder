import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { NavLink, Outlet } from 'react-router-dom';
import { ROUTES } from '../constants';

const NAV_ITEMS = [
  { to: ROUTES.playbooks, label: 'Create Playbook' },
  { to: ROUTES.simulate, label: 'Simulate Event' },
];

export function AppLayout() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static">
        <Toolbar sx={{ gap: 1 }}>
          <Typography variant="h6" component="span" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Playbook Builder
          </Typography>
          <Box component="nav" aria-label="Main" sx={{ display: 'flex', gap: 1 }}>
            {NAV_ITEMS.map((item) => (
              <Button
                key={item.to}
                component={NavLink}
                to={item.to}
                color="inherit"
                sx={{ opacity: 0.8, '&.active': { opacity: 1, bgcolor: 'primary.main' } }}
              >
                {item.label}
              </Button>
            ))}
          </Box>
        </Toolbar>
      </AppBar>
      <Container component="main" maxWidth="lg" sx={{ py: 4 }}>
        <Outlet />
      </Container>
    </Box>
  );
}
