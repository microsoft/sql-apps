export function inspectSource(home: string): Promise<{
  home: string;
  ready: boolean;
  code: string;
  fingerprint?: string;
}>;
