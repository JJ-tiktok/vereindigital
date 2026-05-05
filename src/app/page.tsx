import { currentUser } from "@clerk/nextjs/server";
import { ArrowRight, CalendarDays, LineChart, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";

const featureCards = [
  {
    title: "Kader im Griff",
    description: "Spielerprofile, Verfuegbarkeit, Abwesenheiten und Teamrollen an einem Ort.",
    icon: Users,
  },
  {
    title: "Training planen",
    description: "Kalender, Rueckmeldungen, Trainingskatalog und Skizzeneditor fuer die Trainingswoche.",
    icon: CalendarDays,
  },
  {
    title: "Leistung sehen",
    description: "Bewertungen, Formkurven, Spielstatistiken und Trainer-Notizen werden auswertbar.",
    icon: LineChart,
  },
];

export default async function Home() {
  const user = await currentUser();
  const primaryHref = user ? "/dashboard" : "/sign-in";
  const primaryLabel = user ? "Zum Dashboard" : "Anmelden";

  return (
    <main className="min-h-screen bg-background text-slate-950">
      <section className="relative isolate flex min-h-[86vh] items-center overflow-hidden border-b border-border px-4 py-10 sm:px-6 lg:px-8">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('/Example%20Look/stitch_squadhub_football_manager/trainer_dashboard_blue/screen.png')",
          }}
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(248,250,252,0.98)_0%,rgba(248,250,252,0.94)_38%,rgba(248,250,252,0.72)_68%,rgba(248,250,252,0.45)_100%)]" />

        <div className="mx-auto w-full max-w-6xl">
          <nav className="mb-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-white">
                <ShieldCheck className="size-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-lg font-black">VereinDigital</p>
                <p className="text-sm text-muted">Trainer Dashboard</p>
              </div>
            </div>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-white px-4 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
              href={primaryHref}
            >
              {primaryLabel}
            </Link>
          </nav>

          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Fussballvereine smart organisieren</p>
            <h1 className="mt-5 text-5xl font-black leading-tight tracking-normal text-slate-950 sm:text-6xl">
              Der digitale Arbeitsplatz fuer Trainerteams.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-700">
              VereinDigital verbindet Kaderverwaltung, Trainingsplanung, Spieltagsdaten und Coaching-Notizen in einem
              klaren Dashboard fuer den Vereinsalltag.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold text-white transition hover:bg-primary-strong"
                href={primaryHref}
              >
                {primaryLabel}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              {!user ? (
                <Link
                  className="inline-flex h-12 items-center rounded-lg border border-border bg-white px-5 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
                  href="/sign-up"
                >
                  Kostenlos starten
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          {featureCards.map((feature) => (
            <article className="rounded-lg border border-border bg-white p-5" key={feature.title}>
              <feature.icon className="size-5 text-primary" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-bold">{feature.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
