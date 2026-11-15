'use client';

let pageWorkspace: string | null = null;

/** Remembers the workspace this tab is showing; set once when the page loads. */
export function rememberWorkspace(id: string) { pageWorkspace ??= id; }

/** Sent with every request so the server can refuse writes after another tab switched workspace. */
export function workspaceHeaders(): Record<string, string> {
  return pageWorkspace ? { 'x-workspace-id': pageWorkspace } : {};
}
