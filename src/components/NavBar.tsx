import Link from "next/link";
import GlobalSearch from "@/components/GlobalSearch";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/repos", label: "Repos" },
  { href: "/tasks", label: "Tasks" },
  { href: "/runs", label: "Runs" },
  { href: "/settings", label: "Settings" },
];

export default function NavBar() {
  return (
    <nav className="border-b border-neutral-700 bg-neutral-800">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
        <span className="font-semibold tracking-tight">CodeBoard</span>
        <div className="flex gap-4 text-sm text-neutral-300">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-white">
              {link.label}
            </Link>
          ))}
        </div>
        <GlobalSearch />
      </div>
    </nav>
  );
}
