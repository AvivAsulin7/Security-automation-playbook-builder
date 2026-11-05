import { createTheme } from '@mui/material/styles';

// Blue / black / gray palette; components use these tokens, never hard-coded colors.
export const theme = createTheme({
  palette: {
    primary: { main: '#1565C0', dark: '#0D47A1', contrastText: '#FFFFFF' },
    secondary: { main: '#111827', contrastText: '#FFFFFF' },
    error: { main: '#C62828' },
    text: { primary: '#1F2937', secondary: '#6B7280' },
    divider: '#E5E7EB',
    background: { default: '#F3F4F6', paper: '#FFFFFF' },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    h1: { fontSize: '1.75rem', fontWeight: 600 },
    h2: { fontSize: '1.25rem', fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiAppBar: { defaultProps: { color: 'secondary', elevation: 0 } },
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiPaper: { defaultProps: { variant: 'outlined' } },
    MuiTextField: { defaultProps: { fullWidth: true, size: 'small' } },
  },
});
