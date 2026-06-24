import { invoke } from '@tauri-apps/api/core';
import { logger } from './logger';

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string | null;
  name: string | null;
  bio: string | null;
  public_repos: number | null;
  followers: number | null;
  following: number | null;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string; id: number };
  description: string | null;
  html_url: string;
  private: boolean;
  fork: boolean;
  default_branch: string | null;
  updated_at: string | null;
  pushed_at: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  archived: boolean;
  disabled: boolean;
  topics: string[];
  visibility: string | null;
}

export interface GitHubWorkflow {
  id: number;
  name: string;
  path: string;
  state: string;
  created_at: string;
  updated_at: string;
  url: string | null;
  badge_url: string | null;
  html_url: string | null;
}

export interface GitHubWorkflowRun {
  id: number;
  name: string;
  head_branch: string | null;
  head_sha: string | null;
  status: string;
  conclusion: string | null;
  workflow_id: number;
  run_number: number;
  created_at: string;
  updated_at: string;
  html_url: string;
  event: string;
  actor: { login: string; avatar_url: string | null } | null;
}

export interface DeploymentResult {
  success: boolean;
  message: string;
  workflow_run_id: number | null;
}

export async function checkPAT(pat: string): Promise<GitHubUser> {
  logger.info('github', 'Validating PAT');
  return invoke<GitHubUser>('github_check_pat', { pat });
}

export async function listRepos(pat: string, page?: number, perPage?: number): Promise<GitHubRepo[]> {
  logger.info('github', 'Listing repositories');
  return invoke<GitHubRepo[]>('github_list_repos', { pat, page: page ?? null, perPage: perPage ?? null });
}

export async function getRepo(pat: string, owner: string, repo: string): Promise<GitHubRepo> {
  logger.info('github', `Getting repo ${owner}/${repo}`);
  return invoke<GitHubRepo>('github_get_repo', { pat, owner, repo });
}

export async function listWorkflows(pat: string, owner: string, repo: string): Promise<GitHubWorkflow[]> {
  logger.info('github', `Listing workflows for ${owner}/${repo}`);
  return invoke<GitHubWorkflow[]>('github_list_workflows', { pat, owner, repo });
}

export async function triggerWorkflow(
  pat: string,
  owner: string,
  repo: string,
  workflowId: number,
  branch: string
): Promise<DeploymentResult> {
  logger.info('github', `Triggering workflow ${workflowId} on ${owner}/${repo}`);
  return invoke<DeploymentResult>('github_trigger_workflow', { pat, owner, repo, workflowId, branch });
}

export async function listWorkflowRuns(
  pat: string,
  owner: string,
  repo: string,
  workflowId?: number,
  perPage?: number
): Promise<GitHubWorkflowRun[]> {
  return invoke<GitHubWorkflowRun[]>('github_list_workflow_runs', {
    pat,
    owner,
    repo,
    workflowId: workflowId ?? null,
    perPage: perPage ?? null,
  });
}

export async function getFileContent(
  pat: string,
  owner: string,
  repo: string,
  path: string,
  branch?: string
): Promise<{ name: string; path: string; sha: string; content: string | null; encoding: string | null }> {
  return invoke('github_get_file_content', { pat, owner, repo, path, branch: branch ?? null });
}

export async function createOrUpdateFile(
  pat: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch?: string
): Promise<unknown> {
  logger.info('github', `Creating/updating file ${path} in ${owner}/${repo}`);
  return invoke('github_create_or_update_file', { pat, owner, repo, path, content, message, branch: branch ?? null });
}

export async function deleteRepo(
  pat: string,
  owner: string,
  repo: string
): Promise<DeploymentResult> {
  logger.warn('github', `Deleting repo ${owner}/${repo}`);
  return invoke<DeploymentResult>('github_delete_repo', { pat, owner, repo });
}

export async function getPagesInfo(
  pat: string,
  owner: string,
  repo: string
): Promise<{ html_url: string; source: { branch: string; path: string } } | null> {
  try {
    return await invoke('github_get_pages_info', { pat, owner, repo });
  } catch {
    return null;
  }
}

export async function enablePages(
  pat: string,
  owner: string,
  repo: string,
  branch?: string
): Promise<{ success: boolean; site_url: string; message: string }> {
  logger.info('github', `Enabling Pages for ${owner}/${repo}`);
  return invoke('github_enable_pages', { pat, owner, repo, branch: branch ?? null });
}

export interface SiteDataPush {
  portfolio: string;
  config: string;
  queue: string;
  pricing: string;
}

export async function pushSiteData(
  pat: string,
  owner: string,
  repo: string,
  data: SiteDataPush
): Promise<{ success: boolean; updated_files: string[]; site_url: string; message: string; errors?: string[] }> {
  logger.info('github', `Pushing site data to ${owner}/${repo}`);
  return invoke('github_push_site_data', { pat, owner, repo, data });
}

export async function getRepoDefaultBranch(
  pat: string,
  owner: string,
  repo: string
): Promise<string> {
  return invoke('github_get_repo_default_branch', { pat, owner, repo });
}

export interface SitePortfolioItem {
  id: string;
  title: string;
  tags: string[];
  image: string;
}

export interface SitePortfolioData {
  items: SitePortfolioItem[];
}

export async function fetchSiteData(
  pat: string,
  owner: string,
  repo: string
): Promise<{ portfolio: SitePortfolioData | null; config: Record<string, unknown> | null; queue: Record<string, unknown> | null; pricing: Record<string, unknown> | null }> {
  logger.info('github', `Fetching site data from ${owner}/${repo}`);

  const fetchJson = async <T>(path: string): Promise<T | null> => {
    try {
      const file = await getFileContent(pat, owner, repo, path);
      if (file.content && file.encoding === 'base64') {
        const decoded = decodeBase64(file.content);
        return JSON.parse(decoded) as T;
      }
      return null;
    } catch {
      return null;
    }
  };

  const [portfolio, config, queue, pricing] = await Promise.all([
    fetchJson<SitePortfolioData>('public/data/portfolio.json'),
    fetchJson<Record<string, unknown>>('public/data/config.json'),
    fetchJson<Record<string, unknown>>('public/data/queue.json'),
    fetchJson<Record<string, unknown>>('public/data/pricing.json'),
  ]);

  return { portfolio, config, queue, pricing };
}

function decodeBase64(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}
