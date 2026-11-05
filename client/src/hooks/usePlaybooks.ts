import { useEffect, useState } from 'react';
import { playbooksApi } from '../api/playbooks';
import type { Playbook } from '../types';
import { toApiError } from './useAsyncAction';

type State = { playbooks: Playbook[]; isLoading: boolean; error: string | null };

/** Loads the current user's playbooks; `refetch` reloads them (e.g. after create/delete). */
export function usePlaybooks() {
  const [state, setState] = useState<State>({ playbooks: [], isLoading: true, error: null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    // A newer request or unmount supersedes this one; ignore its outcome either way.
    playbooksApi.list(controller.signal).then(
      (playbooks) => {
        if (!controller.signal.aborted) setState({ playbooks, isLoading: false, error: null });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setState((current) => ({ ...current, isLoading: false, error: toApiError(error).message }));
      },
    );
    return () => controller.abort();
  }, [reloadKey]);

  // Keeps the current list on screen while reloading; the spinner only shows when there is nothing to display.
  function refetch(): void {
    setState((current) => ({ ...current, isLoading: current.playbooks.length === 0, error: null }));
    setReloadKey((key) => key + 1);
  }

  return { ...state, refetch };
}
