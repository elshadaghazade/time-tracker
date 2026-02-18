import Link from "next/link";

type NavCard = {
  title: string;
  description: string;
  href: string;
  badge?: string;
};

const cards: NavCard[] = [
  {
    title: "Time Tracker",
    description: "Start/stop timers and save entries to the database.",
    href: "/time-tracker",
    badge: "Timer",
  },
  {
    title: "Task Management",
    description: "Edit today’s entries: task name, project, and time (hh:mm).",
    href: "/tasks",
    badge: "Today",
  },
  {
    title: "Project Management",
    description: "Create projects, edit names, and assign colors.",
    href: "/projects",
    badge: "Colors",
  },
  {
    title: "Reports",
    description: "Day / week / month reports with CSV export.",
    href: "/reports",
    badge: "CSV",
  },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-5xl">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Time Tracker Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Track time, manage projects, edit daily tasks, and export reports — all in one place.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="text-xs text-slate-500">Quick start</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              Start with <Link href={'/time-tracker'} className="underline decoration-slate-300 underline-offset-4">Time Tracker</Link>
            </div>
          </div>
        </div>

        {/* Cards */}
        <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {cards.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className={cx(
                "group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition",
                "hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md",
                "focus:outline-none focus:ring-4 focus:ring-slate-100"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-slate-900">{c.title}</div>
                  <div className="mt-1 text-sm text-slate-600">{c.description}</div>
                </div>

                {c.badge && (
                  <span className="shrink-0 rounded-2xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {c.badge}
                  </span>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-slate-500">{c.href}</span>
                <span className="text-sm font-medium text-slate-900 transition group-hover:translate-x-0.5">
                  Open →
                </span>
              </div>
            </Link>
          ))}
        </section>

        {/* Footer */}
        <footer className="mt-10 flex flex-col gap-2 rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="font-medium text-slate-900">Tip:</span>{" "}
            Use <span className="font-medium">DEFAULT_USER_ID</span> in `.env` for local dev.
          </div>
          <div className="text-xs text-slate-500">
            Routes: /time-tracker • /tasks • /projects • /reports
          </div>
        </footer>
      </div>
    </main>
  );
}