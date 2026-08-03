import { prisma } from "@/lib/prisma";
import CreateWebhookForm from "@/components/CreateWebhookForm";
import CreateTokenForm from "@/components/CreateTokenForm";
import DeleteButton from "@/components/DeleteButton";

export default async function SettingsPage() {
  const [repos, webhooks, tokens] = await Promise.all([
    prisma.repo.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.webhookConfig.findMany({ include: { repo: true } }),
    prisma.apiToken.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="space-y-10">
      <h1 className="text-xl font-semibold">Settings</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">GitHub webhooks</h2>
        <CreateWebhookForm repos={repos} />
        <div className="overflow-hidden rounded-lg border border-neutral-700">
          <table className="w-full text-sm">
            <thead className="bg-neutral-800 text-left text-neutral-400">
              <tr>
                <th className="px-4 py-2">Repo</th>
                <th className="px-4 py-2">Endpoint</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {webhooks.map((wh) => (
                <tr key={wh.id} className="border-t border-neutral-700">
                  <td className="px-4 py-2">{wh.repo.name}</td>
                  <td className="px-4 py-2 font-mono text-xs text-neutral-400">
                    /api/webhooks/github/{wh.repoId}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <DeleteButton url={`/api/webhooks/${wh.id}`} />
                  </td>
                </tr>
              ))}
              {webhooks.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-neutral-500">
                    No webhooks configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">API tokens</h2>
        <CreateTokenForm />
        <div className="overflow-hidden rounded-lg border border-neutral-700">
          <table className="w-full text-sm">
            <thead className="bg-neutral-800 text-left text-neutral-400">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Created</th>
                <th className="px-4 py-2">Last used</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {tokens.map((tok) => (
                <tr key={tok.id} className="border-t border-neutral-700">
                  <td className="px-4 py-2">{tok.name}</td>
                  <td className="px-4 py-2 text-neutral-400">{new Date(tok.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2 text-neutral-400">
                    {tok.lastUsedAt ? new Date(tok.lastUsedAt).toLocaleString() : "Never"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <DeleteButton url={`/api/tokens/${tok.id}`} />
                  </td>
                </tr>
              ))}
              {tokens.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-neutral-500">
                    No API tokens yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
