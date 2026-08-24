import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form
        action={loginAction}
        className="panel w-full max-w-sm rounded-2xl p-8"
      >
        <span className="text-3xl leading-none">🔒</span>
        <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink">
          Content OS
        </h1>
        <p className="mt-1.5 text-sm text-ink-2">
          Ingresá la clave para entrar.
        </p>

        <input type="hidden" name="next" value={next ?? "/"} />

        <input
          type="password"
          name="password"
          autoFocus
          placeholder="Clave"
          className="mt-6 w-full rounded-xl border border-line-hi bg-black/25 px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-accent/50"
        />

        {error && (
          <p className="mt-2 text-xs text-red-400">
            Clave incorrecta. Probá de nuevo.
          </p>
        )}

        <button
          type="submit"
          className="btn-accent mt-4 w-full rounded-xl px-3.5 py-2 text-sm font-medium"
        >
          Entrar
        </button>
      </form>
    </main>
  );
}
