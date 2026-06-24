import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { logger } from '../lib/logger';
import type { GitHubUser, GitHubRepo, GitHubWorkflow, GitHubWorkflowRun } from '../lib/github';

interface SettingsState {
  githubUsername: string;
  githubRepo: string;
  githubPat: string;
  githubOauthScopes: Record<string, boolean>;
  sshPublicKey: string | null;
  optimizationApiKey: string;
  autoCommit: boolean;
  optimizeOnBuild: boolean;

  githubUser: GitHubUser | null;
  githubRepos: GitHubRepo[];
  githubWorkflows: GitHubWorkflow[];
  githubWorkflowRuns: GitHubWorkflowRun[];
  isGithubConnected: boolean;
  isLoadingRepos: boolean;
  isLoadingWorkflows: boolean;
  isLoadingRuns: boolean;
  lastError: string | null;

  setField: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
  connectGithub: (pat: string) => Promise<boolean>;
  fetchRepos: () => Promise<void>;
  fetchWorkflows: () => Promise<void>;
  fetchWorkflowRuns: (workflowId?: number) => Promise<void>;
  deleteRepo: (owner: string, repo: string) => Promise<boolean>;
  getSiteUrl: (owner: string, repo: string) => string;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  githubUsername: '',
  githubRepo: '',
  githubPat: '',
  githubOauthScopes: { repo: true, workflow: true, 'read:user': false },
  sshPublicKey: null,
  optimizationApiKey: '',
  autoCommit: true,
  optimizeOnBuild: false,

  githubUser: null,
  githubRepos: [],
  githubWorkflows: [],
  githubWorkflowRuns: [],
  isGithubConnected: false,
  isLoadingRepos: false,
  isLoadingWorkflows: false,
  isLoadingRuns: false,
  lastError: null,

  setField: (key, value) => set({ [key]: value } as Partial<SettingsState>),

  loadSettings: async () => {
    try {
      const settings = await invoke<{
        github_username: string | null;
        github_repo: string | null;
        github_pat: string | null;
        github_oauth_scopes: Record<string, boolean>;
        ssh_public_key: string | null;
        optimization_api_key: string | null;
        auto_commit: boolean;
        optimize_on_build: boolean;
      }>('load_settings_cmd');

      set({
        githubUsername: settings.github_username ?? '',
        githubRepo: settings.github_repo ?? '',
        githubPat: settings.github_pat ?? '',
        githubOauthScopes: settings.github_oauth_scopes ?? { repo: true, workflow: true, 'read:user': false },
        sshPublicKey: settings.ssh_public_key ?? null,
        optimizationApiKey: settings.optimization_api_key ?? '',
        autoCommit: settings.auto_commit,
        optimizeOnBuild: settings.optimize_on_build,
      });

      if (settings.github_pat) {
        const { connectGithub } = get();
        await connectGithub(settings.github_pat);
      }

      logger.info('settings', 'Settings loaded from disk');
    } catch (err) {
      logger.error('settings', 'Failed to load settings', { error: String(err) });
    }
  },

  saveSettings: async () => {
    const s = get();
    try {
      await invoke('save_settings_cmd', {
        settings: {
          version: 1,
          updated_at: new Date().toISOString(),
          github_username: s.githubUsername || null,
          github_repo: s.githubRepo || null,
          github_pat: s.githubPat || null,
          github_oauth_scopes: s.githubOauthScopes,
          ssh_public_key: s.sshPublicKey,
          optimization_api_key: s.optimizationApiKey || null,
          auto_commit: s.autoCommit,
          optimize_on_build: s.optimizeOnBuild,
        },
      });
      logger.info('settings', 'Settings saved');
    } catch (err) {
      logger.error('settings', 'Failed to save settings', { error: String(err) });
      throw err;
    }
  },

  connectGithub: async (pat: string) => {
    try {
      const { checkPAT } = await import('../lib/github');
      const user = await checkPAT(pat);
      set({
        githubUser: user,
        githubUsername: user.login,
        githubPat: pat,
        isGithubConnected: true,
        lastError: null,
      });
      await get().saveSettings();
      logger.info('github', `Connected as ${user.login}`);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ isGithubConnected: false, lastError: msg });
      logger.error('github', 'Failed to connect', { error: msg });
      return false;
    }
  },

  fetchRepos: async () => {
    const { githubPat } = get();
    if (!githubPat) return;

    set({ isLoadingRepos: true, lastError: null });
    try {
      const { listRepos } = await import('../lib/github');
      const repos = await listRepos(githubPat);
      set({ githubRepos: repos, isLoadingRepos: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ isLoadingRepos: false, lastError: msg });
      logger.error('github', 'Failed to fetch repos', { error: msg });
    }
  },

  fetchWorkflows: async () => {
    const { githubPat, githubUsername, githubRepo } = get();
    if (!githubPat || !githubUsername || !githubRepo) return;

    set({ isLoadingWorkflows: true, lastError: null });
    try {
      const { listWorkflows } = await import('../lib/github');
      const workflows = await listWorkflows(githubPat, githubUsername, githubRepo);
      set({ githubWorkflows: workflows, isLoadingWorkflows: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ isLoadingWorkflows: false, lastError: msg });
      logger.error('github', 'Failed to fetch workflows', { error: msg });
    }
  },

  fetchWorkflowRuns: async (workflowId?: number) => {
    const { githubPat, githubUsername, githubRepo } = get();
    if (!githubPat || !githubUsername || !githubRepo) return;

    set({ isLoadingRuns: true, lastError: null });
    try {
      const { listWorkflowRuns } = await import('../lib/github');
      const runs = await listWorkflowRuns(githubPat, githubUsername, githubRepo, workflowId);
      set({ githubWorkflowRuns: runs, isLoadingRuns: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ isLoadingRuns: false, lastError: msg });
      logger.error('github', 'Failed to fetch workflow runs', { error: msg });
    }
  },

  deleteRepo: async (owner: string, repo: string) => {
    const { githubPat } = get();
    if (!githubPat) return false;

    try {
      const { deleteRepo: deleteRepoApi } = await import('../lib/github');
      const result = await deleteRepoApi(githubPat, owner, repo);
      if (result.success) {
        const repos = get().githubRepos.filter(r => r.full_name !== `${owner}/${repo}`);
        set({ githubRepos: repos });
        if (get().githubRepo === repo && get().githubUsername === owner) {
          set({ githubRepo: '', githubUsername: '', githubWorkflows: [], githubWorkflowRuns: [] });
          await get().saveSettings();
        }
        logger.info('github', `Repo ${owner}/${repo} deleted`);
        return true;
      }
      return false;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ lastError: msg });
      logger.error('github', 'Failed to delete repo', { error: msg });
      return false;
    }
  },

  getSiteUrl: (owner: string, repo: string) => {
    return `https://${owner}.github.io/${repo}/`;
  },
}));
