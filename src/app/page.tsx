import { redirect } from "next/navigation";
import { getPageTree } from "@/lib/pages";

export default async function HomePage() {
  const tree = await getPageTree();
  const home = tree.find((page) => page.type === "home") ?? tree[0];

  if (home) redirect(`/p/${home.id}`);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      <h1 className="font-display text-xl font-medium tracking-tight text-ink">
        Empecemos
      </h1>
      <p className="max-w-xs text-sm leading-relaxed text-ink-2">
        Creá tu primera página con{" "}
        <span className="text-ink">Nueva página</span>, abajo en el sidebar.
      </p>
    </main>
  );
}
