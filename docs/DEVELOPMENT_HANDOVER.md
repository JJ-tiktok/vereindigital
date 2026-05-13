# Entwicklungsuebergabe

Dieses Dokument sammelt technische Hinweise, die bei der Weiterentwicklung von VereinDigital wichtig sind.

## Branch- und Git-Workflow

- Nicht direkt auf `main` entwickeln.
- Feature-Branches verwenden, bevorzugt mit Prefix `codex/`.
- Fuer groessere Aenderungen Pull Requests nutzen.
- Vor Merge mindestens lokal oder in Preview pruefen:

```bash
npm run lint
npm run build
```

Bei Datenmodell-Aenderungen zusaetzlich:

```bash
npm run db:validate
npm run db:migrate
```

## Next.js-Hinweis

Dieses Projekt nutzt Next.js 16.2.4. Laut `AGENTS.md` koennen APIs und Konventionen gegenueber aelteren Next-Versionen abweichen.

Vor Codeaenderungen an Next.js-spezifischen Bereichen relevante lokale Dokumentation in `node_modules/next/dist/docs/` pruefen.

Besonders relevant:

- App Router
- Server Actions
- Proxy/Middleware
- Mutating Data
- Caching und Rendering

## Lokale Umgebung

Die lokale App soll ueber `localhost` laufen:

```bash
npm run dev
```

Ziel-URL:

```text
http://localhost:3000
```

Nicht `127.0.0.1` verwenden, da Clerk Redirects und `NEXT_PUBLIC_APP_URL` auf `localhost` ausgerichtet sind.

## Environment Variables

Siehe `.env.example`.

Pflicht fuer normalen Betrieb:

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
- `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`

Optional:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

Supabase:

- `DATABASE_URL` sollte fuer die App den Supabase Pooler verwenden.
- `DIRECT_URL` sollte die direkte DB-Verbindung fuer Prisma Migrationen sein.
- Platzhalter wie `[PASSWORD]`, `[PROJECT_REF]` oder `[REGION]` duerfen nicht in Vercel stehen bleiben.

Clerk:

- Preview/Production brauchen passende Clerk Keys.
- Development Keys funktionieren fuer lokale Tests, sollten aber nicht fuer Production genutzt werden.

OpenAI:

- Ohne `OPENAI_API_KEY` muss die App buildbar bleiben.
- AI-Importe sollen dann einen klaren Konfigurationshinweis zeigen.

## Prisma und Supabase

Schema:

- `prisma/schema.prisma`

Migrationen:

- `prisma/migrations`

Nuetzliche Befehle:

```bash
npm run db:generate
npm run db:validate
npm run db:migrate
npm run db:deploy
npm run db:studio
```

Hinweis:

- Wenn Prisma Client unter Windows nicht generiert werden kann, kann ein laufender Node/Next-Prozess die Prisma Engine DLL sperren. Dann Dev-Server stoppen und `npm run db:generate` erneut ausfuehren.

## Server Actions

Zentrale Actions liegen in:

- `src/lib/actions.ts`
- `src/lib/import-actions.ts`
- `src/lib/feedback-actions.ts`

Pattern:

- App-Kontext laden.
- Berechtigung pruefen.
- FormData lesen und serverseitig validieren.
- Prisma schreiben.
- `revalidatePath()` und/oder `redirect()` nutzen.

Wichtig:

- Pflichtfelder nicht nur im UI validieren, sondern immer auch serverseitig.
- Fehler sollten in der UI abgefangen werden, soweit sinnvoll.
- Schreibzugriffe duerfen nicht nur auf versteckten Formularfeldern vertrauen.

## Berechtigungen

Das Datenmodell ist flexibel vorbereitet:

- `Role`
- `Permission`
- `RolePermission`
- `ClubMembership`
- `TeamMembership`

Der Code prueft aktuell noch pragmatisch:

- Admins duerfen vereinsweit mehr.
- Trainer/Co-Trainer duerfen Teamdaten bearbeiten.
- Spieler-Self-Service ist vorbereitet, aber nicht voll ausgebaut.

Wichtige Helfer:

- `requireAppContext()`
- `requireActiveTeam()`
- `requireCoachingStaffTeam()`
- `isAdmin`

Naechster sinnvoller Schritt:

- Feingranulare Permission-Pruefung aus `RolePermission` tatsaechlich in Actions und UI nutzen.

## Import-Pipeline

Dateien:

- `src/lib/imports.ts`
- `src/lib/import-actions.ts`

Prinzip:

1. Quelle parsen.
2. `ImportJob` mit `parsedData` und `issues` speichern.
3. Review-Seite anzeigen.
4. Nutzer korrigiert, speichert oder loescht Zeilen.
5. Bestaetigung schreibt erst dann in Fachmodelle.

Nie direkt aus AI- oder CSV-Rohdaten produktive Modelle beschreiben.

Positionen im Kaderimport:

- Importdaten koennen breite Werte wie `ANGRIFF`, `ABWEHR`, `MITTELFELD` enthalten.
- Diese werden in `src/lib/imports.ts` auf feste Positionscodes normalisiert.
- UI und Sortierung arbeiten mit festen Codes wie `TW`, `IV`, `AV`, `DM`, `ZM`, `OM`, `FL`, `ST`.

Spieltagsimport:

- Spieler sollen gegen den aktuellen Saisonkader gematcht werden.
- `NOT_USED` Spieler duerfen ohne Bewertung gespeichert werden.
- Gespielte Spieler brauchen Bewertung 1.0 bis 10.0.

## Kalender- und Abwesenheitslogik

Wichtig:

- Beim Anlegen einer Abwesenheit werden bestehende betroffene Termine gesucht.
- Beim Anlegen eines neuen Termins muessen vorhandene Abwesenheiten ebenfalls angewendet werden.
- Automatische Absagen sollen vorhandene manuelle Rueckmeldungen nicht ueberschreiben.

Relevante Action:

- `createPlayerAvailability`
- `createCalendarEvent`

## Trainingseditor

Skizzen werden als JSON gespeichert.

Relevante Modelle:

- `TrainingExercise.sketchData`
- `TrainingExerciseSketch.sketchData`

Relevante UI:

- `src/app/training/[exerciseId]/sketch-editor.tsx`

Hinweise:

- Desktop/Tablet zuerst optimieren.
- Mobile sollte zunaechst gute Ansicht bieten, nicht unbedingt vollwertige Praezisionsbearbeitung.

## Feedbackmodul

Screenshot-Erstellung:

- Clientseitig via `html2canvas`.
- Fehler beim Screenshot duerfen Feedback nicht blockieren.
- Screenshot wird im MVP als Data URL gespeichert.

Langfristig:

- Storage nach Supabase Storage oder Blob auslagern.
- E-Mail, Slack, GitHub Issues oder Sentry anbinden.

## Test-Checkliste

Nach groesseren Aenderungen:

```bash
npm run lint
npm run build
```

Manuelle Smoke Tests:

- Login mit Clerk.
- Bestehender User landet auf `/dashboard`, nicht erneut auf `/onboarding`.
- Neuer User kann Onboarding abschliessen.
- Spieler anlegen, bearbeiten und aus Kader entfernen.
- Kaderimport mit Positionsnormalisierung testen.
- Spieltagsimport mit bestehendem Kader testen.
- Termin anlegen, Rueckmeldung setzen, Absage ohne Grund blockieren.
- Abwesenheit anlegen und automatische Absagen pruefen.
- Training erstellen, Skizze speichern, Trainingsplan an Termin haengen.
- Feedback senden und in `/feedback` pruefen.

## Bekannte Risiken

- AI-URL-Importe sind technisch fragil, wenn Quellseiten Login, Bot-Schutz oder schlecht strukturiertes HTML nutzen.
- Vercel-Fehler bei Supabase-Verbindung deuten meistens auf falsche `DATABASE_URL`/Pooler-Platzhalter hin.
- Prisma-Typen in Vercel koennen veraltet sein, wenn `prisma generate` im Build nicht sauber laeuft.
- Google Fonts koennen in lokalen Sandboxes ohne Netzwerk den Build blockieren; mit normalem Netzwerkzugriff ist der Build gruen.
- Das Berechtigungssystem ist vorbereitet, aber noch nicht voll granular.

## Gute naechste Tickets

1. Importe mit echten FuPa-/fussball.de-Beispielen haerten.
2. Granulare Permissions aus `RolePermission` aktiv nutzen.
3. Feedback-Inbox um interne Kommentare und Zuweisungen erweitern.
4. E-Mail-Versand fuer Einladungen integrieren.
5. Kalenderexport als echte ICS-Datei bauen.
6. Statistikseite fuer Saison-, Spieler- und Trainingsauswertung ausbauen.
7. Trainingseditor UX verbessern: Undo/Redo, Snap, bessere Auswahlzustaende.
8. Spieler-Self-Service fachlich sauber abgrenzen.
