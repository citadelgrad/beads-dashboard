import type { BeadsHealth } from '@shared/types';

interface BeadsHealthBannerProps {
  health: BeadsHealth | null;
}

function BeadsHealthBanner({ health }: BeadsHealthBannerProps) {
  if (!health || health.status === 'ok' || health.issues.length === 0) {
    return null;
  }

  const primaryIssue = health.issues[0];
  const isError = health.status === 'error';
  const commandGroups = [
    {
      title: 'Backup first',
      commands: [health.safeCommands.backup],
    },
    {
      title: 'If this machine is the designated migrator',
      commands: health.safeCommands.designatedMigrator,
    },
    {
      title: 'If another clone already migrated',
      commands: health.safeCommands.adoptRemote,
    },
  ];

  return (
    <section
      className={`mb-6 rounded-xl border p-4 shadow-sm ${
        isError
          ? 'border-red-200 bg-red-50 text-red-950'
          : 'border-amber-200 bg-amber-50 text-amber-950'
      }`}
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            isError ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          !
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">{primaryIssue.title}</h2>
            {health.readOnly && (
              <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-200">
                Writes disabled
              </span>
            )}
            {health.bdVersion && (
              <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                {health.bdVersion}
              </span>
            )}
          </div>

          <p className="mt-1 text-sm leading-6">{primaryIssue.message}</p>

          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-medium underline underline-offset-2">
              Show safe recovery commands
            </summary>
            <div className="mt-3 grid gap-3 lg:grid-cols-3">
              {commandGroups.map((group) => (
                <div key={group.title} className="rounded-lg border border-white/80 bg-white/70 p-3">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    {group.title}
                  </h3>
                  <div className="space-y-2">
                    {group.commands.map((command) => (
                      <div key={command} className="rounded bg-slate-950 p-2 text-xs text-slate-50">
                        <code className="block whitespace-pre-wrap break-words">{command}</code>
                        <button
                          type="button"
                          className="mt-2 text-[11px] font-medium text-slate-300 hover:text-white"
                          onClick={() => void navigator.clipboard?.writeText(command)}
                        >
                          Copy
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </details>

          {health.migrationInspection && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-medium underline underline-offset-2">
                Show bd migration inspection
              </summary>
              <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-50">
                {health.migrationInspection}
              </pre>
            </details>
          )}
        </div>
      </div>
    </section>
  );
}

export default BeadsHealthBanner;
