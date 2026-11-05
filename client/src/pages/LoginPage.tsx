import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { fieldErrorsFrom } from '../api/client';
import { ROUTES } from '../constants';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { useAuth } from '../hooks/useAuth';
import type { Credentials } from '../types';

type AuthMode = 'login' | 'register';
type FieldErrors = Partial<Record<keyof Credentials, string>>;

const CREDENTIAL_FIELDS = ['email', 'password'] as const;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mirrors the contract rules for quick feedback; the server remains authoritative.
function validate({ email, password }: Credentials): FieldErrors {
  const errors: FieldErrors = {};
  if (!EMAIL_PATTERN.test(email)) errors.email = 'Enter a valid email address';
  if (password.length < 8) errors.password = 'Password must be at least 8 characters';
  else if (password.length > 72) errors.password = 'Password must be at most 72 characters';
  return errors;
}

export function LoginPage() {
  const { user, login, register } = useAuth();
  const loginAction = useAsyncAction(login);
  const registerAction = useAsyncAction(register);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  if (user) return <Navigate to={ROUTES.playbooks} replace />;

  const isPending = loginAction.isPending || registerAction.isPending;

  async function submit(mode: AuthMode): Promise<void> {
    const credentials = { email: email.trim(), password };
    const errors = validate(credentials);
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    const result = await (mode === 'login' ? loginAction : registerAction).run(credentials);
    if (result.ok) return;
    const serverErrors = fieldErrorsFrom(result.error, CREDENTIAL_FIELDS);
    if (Object.keys(serverErrors).length > 0) setFieldErrors(serverErrors);
    else setFormError(result.error.message);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void submit('login');
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <title>Login / Register | Playbook Builder</title>
      <Paper component="form" noValidate onSubmit={handleSubmit} sx={{ width: '100%', maxWidth: 400, p: 4 }}>
        <Stack spacing={2.5}>
          <Typography variant="h1" align="center">
            Login / Register
          </Typography>

          {formError && <Alert severity="error">{formError}</Alert>}

          <TextField
            label="Email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={Boolean(fieldErrors.email)}
            helperText={fieldErrors.email}
          />
          <TextField
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={Boolean(fieldErrors.password)}
            helperText={fieldErrors.password}
          />

          <Stack direction="row" spacing={1.5}>
            <Button type="submit" variant="contained" fullWidth disabled={isPending}>
              {loginAction.isPending ? 'Logging in…' : 'Login'}
            </Button>
            <Button
              type="button"
              variant="outlined"
              fullWidth
              disabled={isPending}
              onClick={() => void submit('register')}
            >
              {registerAction.isPending ? 'Registering…' : 'Register'}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
