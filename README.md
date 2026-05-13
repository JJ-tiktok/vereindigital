# VereinDigital

VereinDigital ist eine SaaS-App fuer Fussballvereine. Der aktuelle MVP-Fokus liegt auf dem Trainer- und Admin-Bereich: Verein und Teams verwalten, Kader pflegen, Termine planen, Rueckmeldungen erfassen, Spieltage dokumentieren, Trainingsuebungen organisieren und Feedback aus der App sammeln.

Der erste Zielmarkt sind Fussballvereine mit mehreren Mannschaften. Die App ist deshalb bewusst auf Trainer, Co-Trainer, Vereinsadmins und perspektivisch Spieler ausgerichtet.

## Aktueller Stand

Stand: 13.05.2026

Der Prototyp ist kein reines Mockup mehr. Die Kernmodule sind an Prisma/Supabase angebunden und nutzen Clerk fuer Authentifizierung. Mehrere Erweiterungen sind bereits umgesetzt oder vorbereitet:

- Auth, Onboarding, Verein, Teams, Saisons und Teamkontext
- Dashboard mit echten Daten und Quick Actions
- Kaderverwaltung mit Spielerprofilen, Rueckennummern, Positionen und Spielerakte
- Kalender mit Monatsansicht, Kategorien, anstehenden Terminen, Trainingsplaenen und Rueckmeldungen
- Abwesenheiten mit automatischen Absagen fuer betroffene Termine
- Spieltagsbereich mit Ergebnis, Spielerstatistiken, Einsatzstatus, Bewertungen und Positionsuebersicht
- Trainingsbibliothek mit Uebungskatalog, Trainingsplanung, Druckansicht und SVG-Skizzeneditor
- CSV- und AI-URL-Importe fuer Kader und Spieltagsstatistiken mit Review-Schritt
- Mitglieder- und Einladungssystem
- In-App-Feedback mit Screenshot und Feedback-Inbox

Details stehen in:

- [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md)
- [docs/MODULES.md](docs/MODULES.md)
- [docs/DEVELOPMENT_HANDOVER.md](docs/DEVELOPMENT_HANDOVER.md)
- [DATA_MODEL.md](DATA_MODEL.md)
- [PLAYER_DEVELOPMENT.md](PLAYER_DEVELOPMENT.md)
- [TRAINING_LIBRARY.md](TRAINING_LIBRARY.md)
- [DESIGN.md](DESIGN.md)

## Tech Stack

- Next.js 16.2.4 mit App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Prisma 6 mit `@prisma/adapter-pg`
- Supabase Postgres
- Clerk fuer Authentifizierung
- OpenAI optional fuer AI-URL-Importe
- html2canvas fuer In-App-Feedback-Screenshots
- lucide-react fuer Icons

## Lokaler Start

Voraussetzungen:

- Node.js
- npm
- Supabase Postgres Projekt
- Clerk Projekt
- optional OpenAI API-Key fuer AI-Importe

1. Abhaengigkeiten installieren:

```bash
npm install
```

2. `.env.local` aus `.env.example` befuellen:

```bash
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL="/dashboard"
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL="/onboarding"

OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4o-mini"
```

3. Prisma Client erzeugen und Migrationen anwenden:

```bash
npm run db:generate
npm run db:migrate
```

Fuer Deployments:

```bash
npm run db:deploy
```

4. Dev-Server starten:

```bash
npm run dev
```

Die lokale App laeuft bewusst ueber:

```text
http://localhost:3000
```

Nicht `127.0.0.1` verwenden, weil Clerk-Redirects und lokale URLs darauf abgestimmt sind.

## Wichtige Scripts

```bash
npm run dev          # lokaler Server
npm run lint         # ESLint
npm run build        # Production Build
npm run db:generate  # Prisma Client generieren
npm run db:validate  # Prisma Schema validieren
npm run db:migrate   # lokale Migration erstellen/anwenden
npm run db:deploy    # Migrationen in Zielumgebung anwenden
npm run db:studio    # Prisma Studio
```

## Projektstruktur

```text
src/app                 App-Router-Seiten und Route-Gruppen
src/components          Wiederverwendbare UI-Komponenten
src/lib                 Server Actions, Auth, App-Kontext, Domain-Helfer
prisma/schema.prisma    Datenmodell
prisma/migrations       Datenbankmigrationen
docs                    Aktuelle Projektuebergabe und Moduluebersicht
```

Wichtige Bibliotheksdateien:

- `src/lib/app-context.ts`: aktueller User, Verein, Teams, aktive Saison und aktives Team
- `src/lib/actions.ts`: Haupt-Server-Actions fuer Kader, Kalender, Spieltage, Training, Einladungen und Saisons
- `src/lib/import-actions.ts`: Importjobs, Review, Speichern und Bestaetigen
- `src/lib/imports.ts`: CSV-/AI-Parsing, Validierung, Normalisierung
- `src/lib/feedback-actions.ts`: Feedback erstellen und Status aktualisieren
- `src/lib/player-development.ts`: Default-Attribute und Labels fuer Spielerentwicklung
- `src/lib/training.ts`: Labels und Helfer fuer Trainingsbibliothek
- `src/lib/prisma.ts`: Prisma Client

## Kernrouten

```text
/                         Landingpage
/sign-in                  Clerk Sign-in
/sign-up                  Clerk Sign-up
/onboarding               Verein/Team initial erstellen
/dashboard                Trainer-Dashboard
/saisons                  Saisonverwaltung
/mitglieder               Mitgliederuebersicht
/einladungen              Einladungen verwalten
/kader                    Kaderuebersicht
/kader/new                Spieler anlegen
/kader/[playerId]         Spielerprofil, Entwicklung, Spielerakte
/kalender                 Kalender
/kalender/new             Termin erstellen
/kalender/[eventId]       Termin, Rueckmeldungen, Trainingsplan
/kalender/[eventId]/druck Druckansicht fuer Trainingstermin
/abwesenheiten            Abwesenheiten erfassen
/spiele                   Spieltagsuebersicht
/spiele/[matchId]         Spieltag, Ergebnis und Spielerstatistiken
/training                 Trainingsbibliothek
/training/new             Uebung erstellen
/training/[exerciseId]    Uebungsdetail
/training/[exerciseId]/edit
/training/[exerciseId]/skizze
/importe                  Importuebersicht
/importe/kader            Kaderimport
/importe/spieltage        Spieltagsimport
/importe/[jobId]          Import pruefen und bestaetigen
/feedback                 Feedback-Inbox
/feedback/[feedbackId]    Feedbackdetail
/invite/[token]           Einladung annehmen
```

## Arbeitsweise

- Neue Features auf Branches entwickeln, nicht direkt auf `main`.
- Fuer Datenmodell-Aenderungen immer Prisma Migrationen anlegen.
- Nach Aenderungen mindestens `npm run lint` und `npm run build` ausfuehren.
- Vor Prisma/Next-Codeaenderungen die lokalen Next.js-Hinweise aus `AGENTS.md` beachten.
- Keine Secrets committen. `.env.local` bleibt lokal.

## Bekannte Integrationspunkte

- Clerk steuert Identitaet und Session.
- Die App-eigenen Rollen, Vereine, Teams und Spielerprofile liegen in Supabase Postgres.
- Prisma nutzt `DATABASE_URL` fuer App-Zugriffe und `DIRECT_URL` fuer Migrationen.
- AI-URL-Importe brauchen `OPENAI_API_KEY`; ohne Key bleibt CSV-Import nutzbar.
- In Vercel muessen alle Env Vars fuer Preview/Production separat gepflegt werden.

## Naechste sinnvolle Schritte

- Importmatching weiter haerten, besonders bei echten FuPa-/fussball.de-Daten.
- Kader- und Spieltagsimporte mit realen Testdaten durchtesten.
- Feedback-Inbox im Testbetrieb nutzen und Bugs priorisieren.
- Rollen-/Berechtigungskonzept granularer ausbauen.
- UI/UX in Kalender, Spieltag und Trainingseditor weiter polieren.
- Deployment-Prozess mit Preview-Branches stabil halten.
