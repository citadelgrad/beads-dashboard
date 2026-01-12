  function TableView({ issues }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 font-medium border-b">
            <tr>
              <th className="px-6 py-3">ID</th>
              <th className="px-6 py-3">Title</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Created</th>
              <th className="px-6 py-3">Updated</th>
              <th className="px-6 py-3">Cycle Time</th>
              <th className="px-6 py-3">Age</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {issues
              .filter((i) => i.status !== "tombstone")
              .map((issue) => {
                const created = new Date(issue.created_at);
                const updated = issue.updated_at
                  ? new Date(issue.updated_at)
                  : null;
                const isClosed = issue.status === "closed";
                const today = new Date();
                const ageInDays = Math.floor(
                  (today - created) / (1000 * 60 * 60 * 24)
                );
                const isStale = !isClosed && ageInDays > 30;

                let cycleTime = "-";
                let age = "-";

                if (isClosed && updated) {
                  const diff = Math.ceil(
                    (updated - created) / (1000 * 60 * 60 * 24)
                  );
                  cycleTime = `${diff}d`;
                } else {
                  age = `${ageInDays}d`;
                }

                return (
                  <tr key={issue.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-mono text-slate-500">
                      {issue.id}
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-900">
                      {issue.title || "Untitled"}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                        ${
                          issue.status === "closed"
                            ? "bg-green-100 text-green-800"
                            : issue.status === "in_progress"
                            ? "bg-blue-100 text-blue-800"
                            : issue.status === "blocked"
                            ? "bg-red-100 text-red-800"
                            : issue.status === "deferred"
                            ? "bg-amber-100 text-amber-800"
                            : issue.status === "pinned"
                            ? "bg-purple-100 text-purple-800"
                            : issue.status === "hooked"
                            ? "bg-indigo-100 text-indigo-800"
                            : "bg-slate-100 text-slate-800"
                        }`}
                      >
                        {issue.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-500">
                      {created.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 text-slate-500">
                      {updated ? updated.toLocaleDateString() : "-"}
                    </td>
                    <td className="px-6 py-3 text-slate-500">{cycleTime}</td>
                    <td className={`px-6 py-3 ${isStale ? "text-red-600 font-bold" : "text-slate-500"}`}>
                      {age}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
