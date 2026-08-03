import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import CreateTaskForm from "@/components/CreateTaskForm";

export default async function NewTaskPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/api/auth/signin");

  const repos = await prisma.repo.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">New task</h1>
      <CreateTaskForm repos={repos} />
    </div>
  );
}
