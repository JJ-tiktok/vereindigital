# Moduluebersicht

Dieses Dokument beschreibt die fachlichen Module von VereinDigital, ihre Routen, Datenmodelle und wichtigsten Implementierungsdateien.

## 1. App-Shell, Auth und Mandantenkontext

Zweck:

- Geschuetzte App-Navigation bereitstellen.
- Clerk-User mit internem `User` verbinden.
- Aktiven Verein, aktive Saison und aktives Team laden.
- Zugriff auf Team- und Vereinsdaten serverseitig absichern.

Routen:

- `/`
- `/sign-in`
- `/sign-up`
- `/onboarding`
- alle geschuetzten App-Seiten

Modelle:

- `Club`
- `Season`
- `Team`
- `User`
- `ClubMembership`
- `TeamMembership`
- `Role`

Dateien:

- `src/components/app-shell.tsx`
- `src/lib/app-context.ts`
- `src/lib/auth.ts`
- `src/lib/onboarding.ts`
- `src/proxy.ts`

Wichtig:

- Neue geschuetzte Seiten sollten `requireAppContext()` nutzen.
- Teambezogene Schreibaktionen sollten `requireCoachingStaffTeam()` oder eine vergleichbare Pruefung verwenden.
- Onboarding darf nicht erneut erzwungen werden, wenn ein User bereits Verein/Team-Kontext hat.

## 2. Dashboard

Zweck:

- Schneller Trainer-Ueberblick ueber Saison, Teamzustand, Training, Spieltage und Quick Actions.

Route:

- `/dashboard`

Datenquellen:

- Kader
- Trainings-/Kalendertermine
- Match-Stats
- Abwesenheiten
- Rueckmeldungen

Dateien:

- `src/app/dashboard/page.tsx`

Naechste Erweiterungen:

- Mehr echte Performance-Kennzahlen.
- Mehr Filter nach Saison/Team.
- Konfigurierbare Dashboard-Kacheln.

## 3. Saisons

Zweck:

- Saisonkontext fuer Teams, Kader, Importe und Statistiken.
- Jugendteams und Mannschaften spaeter einfacher in neue Saisons ueberfuehren.

Route:

- `/saisons`

Modelle:

- `Season`
- `Team`
- `ImportJob`
- `FeedbackItem`

Dateien:

- `src/app/saisons/page.tsx`
- `src/lib/seasons.ts`
- `src/lib/actions.ts`

Wichtig:

- Teams haben `seasonId`.
- Neue Importjobs brauchen aktives Team und aktive Saison.

## 4. Mitglieder und Einladungen

Zweck:

- Vereins- und Teammitglieder sichtbar machen.
- Testnutzer per Einladung in Verein/Team holen.

Routen:

- `/mitglieder`
- `/einladungen`
- `/invite/[token]`

Modelle:

- `ClubMembership`
- `TeamMembership`
- `Invitation`
- `Role`
- `User`
- `PlayerProfile`

Dateien:

- `src/app/mitglieder/page.tsx`
- `src/app/einladungen/page.tsx`
- `src/app/invite/[token]/page.tsx`
- `src/lib/actions.ts`

Wichtig:

- Admins koennen nur Vereinsmitglied sein, ohne in jedem Team eine Teammitgliedschaft zu haben.
- Teamrollen koennen User, PlayerProfile oder beides referenzieren.

## 5. Kaderverwaltung

Zweck:

- Spielerprofile fuer ein Team verwalten.
- Basisdaten und sportliche Entwicklung eines Spielers abbilden.

Routen:

- `/kader`
- `/kader/new`
- `/kader/[playerId]`

Modelle:

- `PlayerProfile`
- `TeamMembership`
- `PlayerAvailability`
- `PlayerMatchStat`
- `PlayerTrainingPerformance`
- `PlayerFileEntry`
- `PlayerAttributeSnapshot`
- `PlayerAttributeRating`

Dateien:

- `src/app/kader/page.tsx`
- `src/app/kader/new/page.tsx`
- `src/app/kader/[playerId]/page.tsx`
- `src/app/kader/player-form.tsx`
- `src/lib/actions.ts`
- `src/lib/player-development.ts`

Aktuelle Felder:

- Vorname
- Nachname
- Geburtsdatum
- Position
- Rueckennummer

Positionslogik:

- In der UI wird mit festen Kurzpositionen gearbeitet, zum Beispiel `TW`, `IV`, `AV`, `DM`, `ZM`, `OM`, `FL`, `ST`.
- Die Kaderliste sortiert nach Positionsgruppe und danach Rueckennummer.
- Importdaten werden auf diese Codes normalisiert.

## 6. Spielerentwicklung und Spielerakte

Zweck:

- Trainerinterne Entwicklung, Notizen, Gespraeche und Leistungsbewertungen speichern.

Route:

- aktuell integriert in `/kader/[playerId]`

Modelle:

- `PlayerAttributeDefinition`
- `PlayerAttributeSnapshot`
- `PlayerAttributeRating`
- `PlayerTrainingPerformance`
- `PlayerFormSnapshot`
- `PlayerFileEntry`

Dateien:

- `PLAYER_DEVELOPMENT.md`
- `src/lib/player-development.ts`
- `src/app/kader/[playerId]/page.tsx`
- `src/lib/actions.ts`

Bewertungsskalen:

- Faehigkeiten: 1 bis 20
- Spiel- und Trainingsleistung: 1.0 bis 10.0

Wichtig:

- Dieses Modul ist coaching-staff-exklusiv.
- Spieler sollen diese internen Daten im MVP nicht sehen.

## 7. Kalender, Events und Rueckmeldungen

Zweck:

- Trainings, Spiele und Team-Events planen.
- Rueckmeldungen und Verfuegbarkeit sehen.

Routen:

- `/kalender`
- `/kalender/new`
- `/kalender/[eventId]`
- `/kalender/[eventId]/druck`

Modelle:

- `CalendarEvent`
- `EventAttendance`
- `PlayerAvailability`
- `Match`
- `TrainingPlan`
- `PlayerTrainingPerformance`

Dateien:

- `src/app/kalender/page.tsx`
- `src/app/kalender/calendar-grid.tsx`
- `src/app/kalender/event-form.tsx`
- `src/app/kalender/[eventId]/page.tsx`
- `src/app/kalender/[eventId]/druck/page.tsx`
- `src/lib/actions.ts`

Eventtypen:

- `TRAINING`
- `MATCH`
- `TEAM_EVENT`
- `OTHER`

Rueckmeldestatus:

- `ACCEPTED`
- `MAYBE`
- `DECLINED`

Wichtig:

- `DECLINED` braucht einen Grund.
- Bei Match-Events kann ein `Match` erzeugt werden.
- Trainingsplaene sind an Trainingstermine gekoppelt.

## 8. Abwesenheiten

Zweck:

- Urlaub, Verletzung, Krankheit oder sonstige Abwesenheiten als Zeitraum erfassen.
- Automatische Absagen fuer betroffene Teamtermine erzeugen.

Route:

- `/abwesenheiten`

Modelle:

- `PlayerAvailability`
- `EventAttendance`
- `CalendarEvent`

Dateien:

- `src/app/abwesenheiten/page.tsx`
- `src/lib/actions.ts`

Wichtig:

- Automatische Absagen werden nur erstellt, wenn noch keine Rueckmeldung existiert.
- Wenn nachtraeglich ein Termin in einen bestehenden Abwesenheitszeitraum faellt, muss der Termin ebenfalls eine automatische Absage erhalten.

## 9. Spieltage und Spielstatistiken

Zweck:

- Spieltage dokumentieren und Spielerleistungen erfassen.

Routen:

- `/spiele`
- `/spiele/[matchId]`

Modelle:

- `Match`
- `CalendarEvent`
- `PlayerMatchStat`
- `PlayerProfile`

Dateien:

- `src/app/spiele/page.tsx`
- `src/app/spiele/[matchId]/page.tsx`
- `src/lib/actions.ts`

Statistikfelder:

- Tore
- Vorlagen
- Gelbe Karten
- Rote Karten
- Einsatzminuten
- `STARTER`, `SUBSTITUTE`, `NOT_USED`
- Bewertung 1.0 bis 10.0, optional bei `NOT_USED`

Wichtig:

- Kaderansicht im Spieltag sollte eingesetzte Spieler oben bzw. klar sortiert zeigen.
- Positionsuebersicht nutzt Rueckennummern und Positionsgruppen.

## 10. Trainingsbibliothek

Zweck:

- Uebungen als Katalog speichern.
- Trainingsplaene fuer konkrete Termine zusammenstellen.
- Uebungen visuell skizzieren.

Routen:

- `/training`
- `/training/new`
- `/training/[exerciseId]`
- `/training/[exerciseId]/edit`
- `/training/[exerciseId]/skizze`
- `/kalender/[eventId]` fuer Trainingsplan am Termin
- `/kalender/[eventId]/druck`

Modelle:

- `TrainingExercise`
- `TrainingExerciseSketch`
- `TrainingPlan`
- `TrainingPlanExercise`
- `CalendarEvent`

Dateien:

- `TRAINING_LIBRARY.md`
- `src/app/training/page.tsx`
- `src/app/training/exercise-form.tsx`
- `src/app/training/[exerciseId]/sketch-editor.tsx`
- `src/lib/training.ts`
- `src/lib/actions.ts`

Wichtig:

- Skizzen werden als JSON gespeichert.
- Mehrere Skizzen pro Uebung sind moeglich.
- Der Editor ist SVG-basiert und fuer Desktop/Tablet am sinnvollsten.

## 11. Importe

Zweck:

- Kader und Spieltagsstatistiken schneller aus CSV oder URL uebernehmen.
- Daten vor dem Schreiben pruefen, bearbeiten und bestaetigen.

Routen:

- `/importe`
- `/importe/kader`
- `/importe/spieltage`
- `/importe/[jobId]`

Modelle:

- `ImportJob`
- `PlayerProfile`
- `TeamMembership`
- `CalendarEvent`
- `Match`
- `PlayerMatchStat`

Dateien:

- `src/lib/imports.ts`
- `src/lib/import-actions.ts`
- `src/app/importe/import-form.tsx`
- `src/app/importe/[jobId]/page.tsx`
- `src/app/importe/[jobId]/row-delete-button.tsx`

Importarten:

- `ROSTER`
- `MATCH_STATS`

Quellen:

- `TEMPLATE_CSV`
- `AI_URL`

Wichtig:

- Importjobs speichern `parsedData` und `issues`.
- Review-Daten koennen gespeichert werden.
- Zeilen koennen geloescht werden.
- AI wird nur zur Extraktion genutzt, nicht fuer automatische Entscheidungen.

## 12. In-App-Feedback

Zweck:

- Tester und Nutzer koennen Bugs, Feature Requests und Verbesserungsvorschlaege direkt aus der App melden.

Routen:

- `/feedback`
- `/feedback/[feedbackId]`

Modell:

- `FeedbackItem`

Dateien:

- `src/components/feedback-widget.tsx`
- `src/lib/feedback-actions.ts`
- `src/lib/feedback-permissions.ts`
- `src/lib/feedback-labels.ts`
- `src/app/feedback/page.tsx`
- `src/app/feedback/[feedbackId]/page.tsx`

Wichtig:

- Screenshot wird optional als Data URL gespeichert.
- Feedback ist vereinsbezogen.
- Statusbearbeitung ist fuer Admins vorgesehen.
