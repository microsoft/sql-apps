export type PortState = 'free' | 'occupied' | 'unknown';
export interface WorkspaceDescriptor {
  version: 1;
  home: string;
  id: string;
  mode: 'isolated';
  basePort: number;
}
export interface WorkspaceRuntime {
  home: string;
  id: string;
  mode: 'isolated' | 'unselected';
  defaultSql: string;
  sqlContainer: string;
  database: string;
  login: string;
  ownsSqlName: boolean;
  stateDirectory: string;
  ports: { gateway: number; data: number; sql: number };
  origins: { app: string; data: string };
  names: { data: string; sqlNetwork: string; sqlState: string; dataConfig: string };
  labels: string[];
}
export function workspaceFile(root?: string): string;
export function workspaceIdentity(path: string): string;
export function readWorkspace(root?: string): WorkspaceDescriptor | null;
export function describeWorkspace(root: string, selection: number): WorkspaceDescriptor;
export function runtimeFor(container?: string, root?: string, proposed?: WorkspaceDescriptor): WorkspaceRuntime;
export function portState(port: number): Promise<PortState>;
export function proposeWorkspace(root?: string, probe?: (port: number) => Promise<PortState>, options?: { includeSql?: boolean }): Promise<{
  selected?: WorkspaceDescriptor;
  descriptor?: WorkspaceDescriptor;
  ports?: { name: string; port: number; state: PortState }[];
  conflicts?: { name: string; port: number; state: PortState }[];
  alternative?: WorkspaceDescriptor | null;
  nextAction?: string;
  scope: string;
}>;
export function initializeWorkspace(root: string | undefined, selection: number,
  probe?: (port: number) => Promise<PortState>): Promise<WorkspaceRuntime>;
