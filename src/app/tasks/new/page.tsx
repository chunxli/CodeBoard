import { prisma } from "@/lib/prisma";
import CreateTaskForm from "@/components/CreateTaskForm";

export default async function NewTaskPage() {
  const repos = await prisma.repo.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">New task</h1>
      <CreateTaskForm repos={repos} />
    </div>
  );
}
