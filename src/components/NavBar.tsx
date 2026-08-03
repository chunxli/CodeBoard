import Link from "next/link";
import GlobalSearch from "@/components/GlobalSearch";
import { auth, signIn, signOut } from "@/auth";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/repos", label: "Repos" },
  { href: "/tasks", label: "Tasks" },
  { href: "/runs", label: "Runs" },
  { href: "/settings", label: "Settings" },
];

export default async function NavBar() {
  const session = await auth();

  return (
    <nav className="border-b border-neutral-700 bg-neutral-800">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
        <span className="font-semibold tracking-tight">CodeBoard</span>
        {session?.user && (
          <div className="flex gap-4 text-sm text-neutral-300">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-white">
                {link.label}
              </Link>
            ))}
          </div>
        )}
        {session?.user && <GlobalSearch />}
        <div className="ml-auto flex items-center gap-3 text-sm">
          {session?.user ? (
            <>
              <span className="text-neutral-400">{session.user.name ?? session.user.email}</span>
              <form
                action={async () => {
                  "use server";
                  await signOut();
                }}
              >
                <button type="submit" className="text-neutral-300 hover:text-white">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <form
              action={async () => {
                "use server";
                await signIn("microsoft-entra-id");
              }}
            >
              <button type="submit" className="text-neutral-300 hover:text-white">
                Sign in with Microsoft
              </button>
            </form>
          )}
        </div>
      </div>
    </nav>
  );
}

