import type { Action, Trigger } from './types';

export const ROUTES = {
  login: '/login',
  playbooks: '/playbooks',
  simulate: '/simulate',
} as const;

export const TRIGGER_LABELS: Record<Trigger, string> = {
  MALWARE_DETECTED: 'Malware Detected',
  LOGIN_ATTEMPT: 'Login Attempt',
  PHISHING_ALERT: 'Phishing Alert',
};

export const ACTION_LABELS: Record<Action, string> = {
  ISOLATE_HOST: 'Isolate Host',
  NOTIFY_ADMIN: 'Notify Admin',
  BLOCK_IP: 'Block IP',
};

export const TRIGGERS = Object.keys(TRIGGER_LABELS) as Trigger[];
export const ACTIONS = Object.keys(ACTION_LABELS) as Action[];
