import { invoke } from '@tauri-apps/api/core';
import type { LogEntry, LogLevel, LogQuery } from '../types';

let sessionId: string | null = null;
let enabled = true;

export async function initLogger(): Promise<void> {
  try {
    sessionId = await invoke<string | null>('get_session_id_cmd');
  } catch {
    console.warn('Logger backend not available, using console fallback');
    enabled = false;
  }
}

function getTimestamp(): string {
  return new Date().toISOString();
}

export function getSessionId(): string | null {
  return sessionId;
}

async function logToBackend(level: LogLevel, target: string, message: string, fields?: Record<string, unknown>, correlationId?: string): Promise<void> {
  if (!enabled) {
    const prefix = `[${level.toUpperCase()}][${target}]`;
    if (level === 'error') console.error(prefix, message, fields ?? '');
    else if (level === 'warn') console.warn(prefix, message, fields ?? '');
    else console.log(prefix, message, fields ?? '');
    return;
  }

  try {
    await invoke('log_frontend_event', {
      level,
      target,
      message,
      fields: fields ?? null,
      correlationId: correlationId ?? null,
    });
  } catch (err) {
    console.warn('Failed to log to backend:', err);
  }
}

export const logger = {
  trace: (target: string, message: string, fields?: Record<string, unknown>, correlationId?: string) =>
    logToBackend('trace', target, message, fields, correlationId),
  debug: (target: string, message: string, fields?: Record<string, unknown>, correlationId?: string) =>
    logToBackend('debug', target, message, fields, correlationId),
  info: (target: string, message: string, fields?: Record<string, unknown>, correlationId?: string) =>
    logToBackend('info', target, message, fields, correlationId),
  warn: (target: string, message: string, fields?: Record<string, unknown>, correlationId?: string) =>
    logToBackend('warn', target, message, fields, correlationId),
  error: (target: string, message: string, fields?: Record<string, unknown>, correlationId?: string) =>
    logToBackend('error', target, message, fields, correlationId),
};

export async function getLogs(query?: LogQuery): Promise<LogEntry[]> {
  if (!enabled) return [];
  try {
    return await invoke<LogEntry[]>('get_logs_cmd', { query: query ?? {} });
  } catch (err) {
    console.error('Failed to get logs:', err);
    return [];
  }
}

export async function exportLogs(format: 'json' | 'jsonl' | 'csv' = 'json', query?: LogQuery): Promise<string> {
  if (!enabled) return '';
  try {
    return await invoke<string>('export_logs_cmd', { query: query ?? {}, format });
  } catch (err) {
    console.error('Failed to export logs:', err);
    return '';
  }
}

export async function clearLogs(): Promise<void> {
  if (!enabled) return;
  try {
    await invoke('clear_logs_cmd');
  } catch (err) {
    console.error('Failed to clear logs:', err);
  }
}
