# Projektstand und Uebergabe

Stand: 13.05.2026

Dieses Dokument beschreibt den aktuellen Arbeitsstand von VereinDigital. Es soll neuen Entwicklern schnell zeigen, was die App macht, welche Module bereits existieren und wo wichtige technische Entscheidungen liegen.

## Produkt in einem Satz

VereinDigital ist eine Trainer- und Vereins-App fuer Fussballvereine, mit der ein Verein mehrere Teams, Saisons, Mitglieder, Kader, Termine, Trainingsuebungen, Spieltage, Statistiken, Importe und Feedbackmeldungen verwalten kann.

## Aktueller Fokus

Der Fokus liegt auf einem Trainer-MVP fuer Fussballvereine.

Primaere Rollen:

- Admin: verwaltet Verein, Saisons, Teams, Mitglieder und Einladungen.
- Trainer: verwaltet Teamdaten, Kader, Kalender, Training und Spieltage.
- Co-Trainer: aktuell im MVP praktisch wie Trainer behandelt.
- Spieler: im Datenmodell vorbereitet, im UI noch nicht voll als Self-Service ausgebaut.

## Umgesetzte Produktbereiche

### Auth, Onboarding und App-Kontext

Status: umgesetzt

- Clerk ist als Auth-Provider integriert.
- Landingpage leitet eingeloggte Nutzer Richtung Dashboard und nicht eingeloggte Nutzer zur Anmeldung.
- Onboarding legt internen `User`, `Club`, aktive `Season`, erstes `Team`, Rollen und Mitgliedschaften an.
- `requireAppContext()` ist der zentrale Einstieg fuer geschuetzte App-Seiten.
- Aktives Team und aktive Saison werden serverseitig ermittelt.

Wichtige Dateien:

- `src/proxy.ts`
- `src/app/page.tsx`
- `src/app/onboarding/page.tsx`
- `src/lib/app-context.ts`
- `src/lib/auth.ts`
- `src/lib/onboarding.ts`

### Saisonmodell

Status: umgesetzt

- Vereine haben Saisons.
- Teams sind einer Saison zugeordnet.
- Eine Saison kann aktiv gesetzt werden.
- Neue Daten wie Imports und Feedback koennen Saisonkontext speichern.

Wichtige Dateien:

- `src/app/saisons/page.tsx`
- `src/lib/seasons.ts`
- `prisma/migrations/20260506120000_add_seasons`

### Dashboard

Status: umgesetzt

- Dashboard nutzt echte Daten aus aktivem Team und aktiver Saison.
- Enthalten sind Saisonueberblick, Trainingsbeteiligung, Teamform, Belastungsindikator, Quick Actions, Tagesablauf, Top Performer und letzte Spiele.
- Optik orientiert sich an sportlichen Performance-Dashboards.

Wichtige Datei:

- `src/app/dashboard/page.tsx`

### Kader und Spielerprofile

Status: umgesetzt und aktiv in Nutzung

- Spieler koennen angelegt, bearbeitet und aus dem aktiven Team entfernt werden.
- Felder: Vorname, Nachname, Geburtsdatum, Position, Rueckennummer.
- Kaderliste ist nach Positionsgruppen und danach Rueckennummer sortiert.
- Spielerprofile enthalten Stammdaten, Leistungsuebersicht, Spielerakte, Form, Faehigkeitenprofil und Bewertungsstand.
- Spieler werden als `PlayerProfile` gespeichert und per `TeamMembership` mit einem Team verbunden.

Wichtige Dateien:

- `src/app/kader/page.tsx`
- `src/app/kader/new/page.tsx`
- `src/app/kader/[playerId]/page.tsx`
- `src/app/kader/player-form.tsx`
- `src/lib/actions.ts`
- `src/lib/player-development.ts`

### Spielerentwicklung und Spielerakte

Status: erster technischer Schnitt umgesetzt

- Default-Attribute werden clubweise erzeugt.
- Faehigkeiten werden auf einer Skala von 1 bis 20 bewertet.
- Spielerakte kann Eintraege wie Spielergespraeche, Ziele, Feedback, Trainings- und Spielbeobachtungen speichern.
- Trainingsleistung und Spielleistung sind getrennt modelliert.
- Daten sind fuer Coaching Staff gedacht, nicht fuer Spieler-Self-Service.

Konzept:

- `PLAYER_DEVELOPMENT.md`

Wichtige Modelle:

- `PlayerAttributeDefinition`
- `PlayerAttributeSnapshot`
- `PlayerAttributeRating`
- `PlayerTrainingPerformance`
- `PlayerFormSnapshot`
- `PlayerFileEntry`

### Kalender, Events, Rueckmeldungen und Abwesenheiten

Status: umgesetzt

- Kalenderseite zeigt eine Monatsansicht, Kategorien und anstehende Veranstaltungen.
- Terminarten: `TRAINING`, `MATCH`, `TEAM_EVENT`, `OTHER`.
- Termine koennen direkt aus einem Kalendertag heraus erstellt werden.
- Detailseite zeigt Rueckmeldungen je Spieler.
- Rueckmeldestatus: `ACCEPTED`, `MAYBE`, `DECLINED`.
- Bei Absage ist ein Grund Pflicht.
- Abwesenheiten werden als Zeitraum gespeichert und erzeugen automatische Absagen fuer betroffene Termine.
- Neue Termine pruefen vorhandene Abwesenheiten und erzeugen ebenfalls passende automatische Absagen.

Wichtige Dateien:

- `src/app/kalender/page.tsx`
- `src/app/kalender/calendar-grid.tsx`
- `src/app/kalender/new/page.tsx`
- `src/app/kalender/[eventId]/page.tsx`
- `src/app/abwesenheiten/page.tsx`
- `src/lib/actions.ts`

### Spieltage und Spielstatistiken

Status: umgesetzt

- Spiele entstehen ueber Kalendertermine vom Typ `MATCH` oder ueber Importbestaetigung.
- Spieltagsdetail erlaubt Ergebnis, Status und Spielerstatistiken.
- Spielerstatistik umfasst Tore, Vorlagen, Karten, Minuten, Startelf/Einwechslung/nicht eingesetzt und Bewertung.
- Nicht eingesetzte Spieler duerfen ohne Bewertung gespeichert werden.
- Spieltagsansicht wurde in Richtung Kicker-/Sport-App-Layout ueberarbeitet.
- Positionsuebersicht nutzt Rueckennummern und gruppiert Spieler nach Position.

Wichtige Dateien:

- `src/app/spiele/page.tsx`
- `src/app/spiele/[matchId]/page.tsx`
- `src/lib/actions.ts`

### Trainingsbibliothek und Trainingsplanung

Status: mehrere Phasen umgesetzt

- Uebungskatalog mit Suche, Kategorie, Intensitaet und Sichtbarkeit.
- Uebungen enthalten Beschreibung, Ziel, Organisation, Ablauf, Coaching Points, Varianten und Material.
- Trainingsplaene koennen an Kalendertermine vom Typ `TRAINING` gehaengt werden.
- Uebungen koennen konkreten Trainingsplaenen hinzugefuegt werden.
- Druckansicht fuer Trainingstermine existiert.
- SVG-Skizzeneditor fuer Uebungen ist umgesetzt.
- Mehrere Skizzen pro Uebung werden ueber `TrainingExerciseSketch` gespeichert.
- Skizzen werden als JSON gespeichert und bleiben editierbar.

Konzept:

- `TRAINING_LIBRARY.md`

Wichtige Dateien:

- `src/app/training/page.tsx`
- `src/app/training/new/page.tsx`
- `src/app/training/[exerciseId]/page.tsx`
- `src/app/training/[exerciseId]/edit/page.tsx`
- `src/app/training/[exerciseId]/skizze/page.tsx`
- `src/app/training/[exerciseId]/sketch-editor.tsx`
- `src/app/kalender/[eventId]/druck/page.tsx`
- `src/lib/training.ts`

### Mitglieder und Einladungen

Status: umgesetzt

- Mitgliederseite zeigt Vereinsrollen, Teammitgliedschaften und offene Einladungen.
- Admins sind als Vereinsmitglieder sichtbar.
- Einladungen koennen fuer Teams und Rollen erstellt werden.
- Einladungslinks koennen angenommen werden und erzeugen Mitgliedschaften.
- Mailversand ist noch nicht als echtes Transaktionsmailing umgesetzt; aktuell steht Link-/Invite-Handling im Vordergrund.

Wichtige Dateien:

- `src/app/mitglieder/page.tsx`
- `src/app/einladungen/page.tsx`
- `src/app/invite/[token]/page.tsx`
- `src/lib/actions.ts`

### Importe

Status: umgesetzt, braucht weitere reale Testdaten

Importe laufen immer ueber einen Review-Schritt. Es wird nicht direkt aus CSV oder AI-Antwort in produktive Daten geschrieben.

Unterstuetzte Importarten:

- Kaderimport
- Spieltagsstatistik-Import

Quellen:

- CSV-Vorlage ohne AI
- URL-Import mit OpenAI-Auswertung

Kaderimport:

- Felder: Vorname, Nachname, Geburtsdatum, Position, Rueckennummer.
- Positionen werden normalisiert, zum Beispiel `ANGRIFF` zu `ST`, `ABWEHR` zu `IV`, `MITTELFELD` zu `ZM`.
- Zeilen koennen im Review bearbeitet, gespeichert, geloescht, uebersprungen oder bestaetigt werden.
- Matching gegen bestehende Spieler ist vorhanden.

Spieltagsimport:

- Felder: Spiel, Datum, Gegner, Heim/Auswaerts, Spieler, Tore, Vorlagen, Karten, Minuten, Status, Bewertung.
- Spieler werden gegen den aktuellen Saisonkader gematcht.
- Nicht eingesetzte Spieler koennen ohne Bewertung importiert werden.
- Daten bleiben im Importjob gespeichert, damit Korrekturen nach erneutem Oeffnen erhalten bleiben.

Wichtige Dateien:

- `src/app/importe/page.tsx`
- `src/app/importe/kader/page.tsx`
- `src/app/importe/spieltage/page.tsx`
- `src/app/importe/[jobId]/page.tsx`
- `src/app/importe/[jobId]/row-delete-button.tsx`
- `src/lib/imports.ts`
- `src/lib/import-actions.ts`

### In-App-Feedback

Status: umgesetzt

- Feedback-Button ist in der geschuetzten App-Shell verfuegbar.
- Feedbacktypen: Bug, Feature Request, Verbesserung, Sonstiges.
- Prioritaeten: niedrig, mittel, hoch.
- Beim Absenden werden Route, User-Agent, Viewport, Kontext und optional Screenshot gespeichert.
- Screenshot wird clientseitig mit `html2canvas` erzeugt.
- Feedback-Inbox und Detailseite existieren.
- Statusbearbeitung ist fuer Admins vorgesehen.

Wichtige Dateien:

- `src/components/feedback-widget.tsx`
- `src/app/feedback/page.tsx`
- `src/app/feedback/[feedbackId]/page.tsx`
- `src/lib/feedback-actions.ts`
- `src/lib/feedback-permissions.ts`
- `src/lib/feedback-labels.ts`

## Datenbankstand

Aktuelle Migrationen:

- `20260502234750_init_verein_digital_schema`
- `20260503001500_phase_2_schema_completion`
- `20260503160000_player_development`
- `20260503173000_training_library_t1`
- `20260504181500_training_exercise_multiple_sketches`
- `20260506120000_add_seasons`
- `20260506170000_import_jobs`
- `20260513120000_feedback_items`
- `20260513153000_player_jersey_number`

Aktuelle zentrale Modelle:

- Organisation: `Club`, `Season`, `Team`
- Identitaet/Rollen: `User`, `Role`, `Permission`, `RolePermission`, `ClubMembership`, `TeamMembership`, `Invitation`
- Kader: `PlayerProfile`
- Kalender: `CalendarEvent`, `EventAttendance`, `PlayerAvailability`
- Spieltage: `Match`, `PlayerMatchStat`
- Entwicklung: `PlayerAttributeDefinition`, `PlayerAttributeSnapshot`, `PlayerAttributeRating`, `PlayerTrainingPerformance`, `PlayerFormSnapshot`, `PlayerFileEntry`
- Training: `TrainingExercise`, `TrainingExerciseSketch`, `TrainingPlan`, `TrainingPlanExercise`
- Import: `ImportJob`
- Feedback: `FeedbackItem`

## Bekannte offene Punkte

- Rollen sind modelliert, aber Berechtigungen sind im Code noch pragmatisch statt voll granular umgesetzt.
- Spieler-Self-Service ist vorbereitet, aber nicht vollstaendig als eigener UX-Fluss umgesetzt.
- Mailversand fuer Einladungen ist noch nicht produktionsreif integriert.
- Import via URL ist Best-Effort und haengt stark von erreichbarem HTML/Text der Zielseite ab.
- FuPa-/fussball.de-Daten sollten mit echten Beispielen weiter getestet werden.
- Trainingseditor funktioniert, braucht aber weiter UX-Feinschliff fuer komplexere Skizzen.
- Kalenderexport/ICS ist in der UI angedeutet, aber nicht als fertiger Export dokumentiert.
- Statistiken/Auswertungen koennen noch stark erweitert werden.

## Deployment-Hinweise

- Vercel braucht alle Env Vars fuer Preview und Production.
- Supabase Pooler-URL gehoert in `DATABASE_URL`.
- Direkte Supabase-DB-URL gehoert in `DIRECT_URL`.
- Placeholder wie `REGION`, `PROJECT_REF`, `PASSWORD` muessen in Vercel vollstaendig ersetzt sein.
- Clerk Production Keys sollten fuer Production verwendet werden.
- Ohne `OPENAI_API_KEY` bleibt die App buildbar, AI-Importe zeigen aber einen Konfigurationshinweis.
