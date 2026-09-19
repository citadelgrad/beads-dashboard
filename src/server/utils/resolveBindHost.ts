/**
 * Resolve the network interface the dashboard server should bind to.
 *
 * Precedence: --host CLI flag > BEADS_HOST env var > 127.0.0.1 default.
 * The default is loopback-only so a freshly started dashboard never listens
 * on every interface unless the operator opts in explicitly.
 */
export function resolveBindHost(
  args: { host?: string; [key: string]: unknown },
  env: NodeJS.ProcessEnv = process.env
): string {
  return args.host || env.BEADS_HOST || '127.0.0.1';
}
