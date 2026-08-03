import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EditTaskForm from "@/components/EditTaskForm";

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [task, repos] = await Promise.all([
    prisma.task.findUnique({ where: { id } }),
    prisma.repo.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!task) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Edit task</h1>
      <EditTaskForm task={task} repos={repos} />
    </div>
  );
}
