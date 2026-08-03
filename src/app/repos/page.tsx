import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import AddRepoForm from "@/components/AddRepoForm";
import RepoRow from "@/components/RepoRow";

export default async function ReposPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/api/auth/signin");

  const repos = await prisma.repo.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { tasks: true } } },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Repos</h1>
      <AddRepoForm />
      <div className="overflow-hidden rounded-lg border border-neutral-700">
        <table className="w-full text-sm">
          <thead className="bg-neutral-800 text-left text-neutral-400">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Location</th>
              <th className="px-4 py-2">Branch</th>
              <th className="px-4 py-2">Machine</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {repos.map((repo) => (
              <RepoRow key={repo.id} repo={repo} taskCount={repo._count.tasks} />
            ))}
            {repos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-500">
                  No repos yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
