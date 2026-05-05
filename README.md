# VereinDigital

VereinDigital ist eine SaaS-Anwendung fuer Fussballvereine. Der erste MVP-Fokus liegt auf dem Trainer-Bereich: Kaderverwaltung, Kalender, Trainingsbeteiligung, Spieltagsplanung und Spielerstatistiken.

Das Projekt startet bewusst mit Fussballvereinen als Zielgruppe. Dadurch koennen Begriffe, Workflows und Datenmodelle direkt auf den Alltag von Trainern, Co-Trainern, Spielern und Vereinsadmins zugeschnitten werden.

## Produktziel

VereinDigital soll Vereinen helfen, Teams zentral zu verwalten und den Traineralltag zu vereinfachen.

Der MVP soll vor allem drei Fragen beantworten:

1. Welche Spieler stehen fuer Training, Events und Spieltag zur Verfuegung?
2. Wie entwickelt sich ein Spieler ueber Trainingsteilnahme und Spielleistung?
3. Welche Termine stehen fuer ein Team an?
4. Wie kann ein Verein mehrere Teams, Rollen und Berechtigungen sauber organisieren?

## Zielgruppe

Der erste Produktfokus liegt auf Fussballvereinen mit einem oder mehreren Teams.

Primaere Nutzer:

- Admins, die einen Verein, Teams, Mitglieder und Rollen verwalten.
- Trainer, die Kader, Kalender, Trainings, Spieltage und Statistiken pflegen.
- Co-Trainer, die im MVP dieselben Teamrechte wie Trainer haben.
- Spieler, die Rueckmeldungen geben und eigene Profildaten pflegen.

## MVP-Module

### 1. Digitale Kaderverwaltung

Spielerprofile werden im MVP bewusst schlank gehalten.

Pflichtfelder:

- Name
- Geburtsdatum
- Position

Geplante Erweiterungen:

- Kontaktinformationen
- Staerken und Schwaechen
- Notfallkontakt
- medizinische Hinweise
- Beitrags- oder Materialstatus

### 2. Trainingsbeteiligung

Spieler koennen fuer Trainings rueckmelden:

- Zusage, gruen
- Vielleicht, gelb
- Absage, rot

Bei einer Absage ist ein Grund verpflichtend. Bei Zusage und Vielleicht ist ein Kommentar optional.

Trainer und Co-Trainer duerfen Rueckmeldungen fuer Spieler setzen oder bearbeiten, falls Informationen ueber andere Wege eingehen.

### 3. Abwesenheiten

Abwesenheiten werden als Zeitraum modelliert, nicht nur als einzelner Status.

Beispiele:

- Urlaub
- Verletzung
- Krankheit
- Sonstiges

Wenn ein Spieler eine Abwesenheit eintraegt, sollen betroffene Trainings, Events und spaeter auch Spieltage automatisch mit einer Absage versehen werden. Dadurch muss ein Spieler nicht jeden Termin einzeln absagen.

### 4. Teamkalender und Events

Neben Trainingseinheiten und Spielen sollen Trainer allgemeine Team-Events erstellen koennen.

Event-Typen im MVP:

- Trainingseinheit
- Spiel
- Mannschaftsabend
- sonstiges Team-Event

Diese Termine sollen in einer eigenen Kalenderseite darstellbar sein. Zusaetzlich soll das Dashboard eine Kalender-Vorschau oder einen Kalenderbereich enthalten, ueber den der vollstaendige Kalender geoeffnet werden kann.

Wichtige Kalenderansichten:

- kommende Termine
- Monatsuebersicht
- Termin-Detailansicht
- Rueckmeldestatus pro Termin

Fuer Trainingseinheiten, Spiele und andere Events soll die Verfuegbarkeit der Spieler sichtbar sein. Bei Trainingseinheiten und Team-Events steht die Rueckmeldung im Vordergrund, bei Spielen kommen zusaetzlich Kaderplanung und Statistiken hinzu.

### 5. Spieltage und Spielerstatistiken

Fuer Spieltage werden pro Spieler folgende Werte geplant:

- Tore
- Vorlagen
- Karten
- Einsatzzeit in Minuten
- Startelf oder Einwechslung
- Bewertung auf einer Skala von 1 bis 10

Die Bewertungsskala 1 bis 10 ist die grundlegende Skala fuer das MVP und spaetere Auswertungen.

### 6. Entwicklung und Auswertung

Nach dem MVP sollen Trainingsbeteiligung und Spielleistung gemeinsam visualisiert werden.

Moegliche Auswertungen:

- Trainingsbeteiligung pro Spieler
- Entwicklung der Bewertung ueber mehrere Spiele
- Verhaeltnis von Einsatzzeit zu Trainingsbeteiligung
- Tore und Vorlagen pro Zeitraum

## Rollen und Berechtigungen

Das Berechtigungssystem soll flexibel ausgelegt werden. Es gibt zwar Standardrollen, aber langfristig sollen Admins eigene Rollen definieren und Berechtigungen steuern koennen.

Standardrollen im MVP:

- Admin
- Trainer
- Co-Trainer
- Spieler

Grundlogik:

- Admins haben Zugriff auf den gesamten Verein und alle Teams.
- Trainer haben Zugriff auf ihre jeweiligen Teams.
- Co-Trainer haben im MVP dieselben Rechte wie Trainer.
- Spieler haben Zugriff auf ihre eigenen Daten, Rueckmeldungen und teambezogene Informationen.

Wichtige Anforderungen:

- Ein Nutzer kann in mehreren Teams Mitglied sein.
- Ein Nutzer kann in unterschiedlichen Teams unterschiedliche Rollen haben.
- Ein Nutzer kann zum Beispiel Trainer in Team A und Spieler in Team B sein.
- Rollen sollen perspektivisch ueber einzelne Berechtigungen konfigurierbar sein.

Geplantes Modell:

- `Role`
- `Permission`
- `RolePermission`
- `TeamMembership`

## Verein- und Teamstruktur

Ein Verein kann mehrere Teams besitzen.

Beispiel:

- Verein: FC Beispielstadt
- Team: 1. Herren
- Team: 2. Herren
- Team: C-Jugend
- Team: Damen

Jedes Team hat eigene Mitglieder, Trainings, Spieltage und Statistiken. Der Admin sieht alles, Trainer und Co-Trainer sehen nur ihre zugewiesenen Teams.

## Identitaet und Spielerprofile

Login-Identitaeten und sportliche Spielerprofile werden getrennt.

`User` beschreibt die technische Identitaet, die ueber Clerk authentifiziert wird.

`PlayerProfile` beschreibt die sportliche Person im Verein oder Team.

Diese Trennung ist wichtig, weil:

- Spieler vorab ohne Login angelegt werden koennen.
- ein Spieler spaeter mit einem echten Benutzerkonto verknuepft werden kann.
- ein Benutzer in einem Team Spieler und in einem anderen Team Trainer sein kann.
- Trainer, Co-Trainer und Admins nicht zwingend ein Spielerprofil brauchen.

## Einladungssystem

VereinDigital soll Einladungen fuer Teams unterstuetzen.

Geplante Wege:

- Einladung per Link
- Einladung per E-Mail
- spaeter Einladung per WhatsApp oder SMS

Eine Einladung enthaelt mindestens:

- Verein
- Team
- vorgesehene Rolle
- Ablaufdatum
- Status

Nach Annahme einer Einladung wird daraus eine Mitgliedschaft im Team.

## Technischer Stack

Geplanter Stack:

- Next.js mit App Router
- TypeScript
- Tailwind CSS
- Clerk fuer Authentifizierung und User Management
- Supabase Postgres als Datenbank
- Prisma als ORM

Clerk uebernimmt Login, Registrierung, Sessions und Benutzerverwaltung. Die fachlichen Rollen, Vereinsrechte, Teams, Spielerprofile, Trainings und Statistiken liegen in der eigenen PostgreSQL-Datenbank.

## Grobes Datenmodell

Die folgenden Entitaeten sind fuer den MVP vorgesehen:

- `Club`
- `Team`
- `User`
- `PlayerProfile`
- `Role`
- `Permission`
- `RolePermission`
- `TeamMembership`
- `Invitation`
- `CalendarEvent`
- `EventAttendance`
- `PlayerAvailability`
- `Match`
- `PlayerMatchStat`

### Club

Ein Verein als oberste Organisationseinheit.

Wichtige Felder:

- Name
- Slug
- Erstellungsdatum

### Team

Ein Team innerhalb eines Vereins.

Wichtige Felder:

- Verein
- Name
- Altersklasse oder Kategorie
- Saison

### User

Interner Benutzer, verknuepft mit Clerk.

Wichtige Felder:

- Clerk User ID
- Name
- E-Mail

### PlayerProfile

Sportliches Profil einer Person.

Wichtige Felder:

- Verein
- optional verknuepfter User
- Name
- Geburtsdatum
- Position

### TeamMembership

Verknuepft User oder Spielerprofil mit einem Team und einer Rolle.

Wichtige Felder:

- Team
- User
- optional PlayerProfile
- Rolle
- Status

### CalendarEvent

Ein allgemeiner Termin im Teamkalender.

Wichtige Felder:

- Team
- Typ: Training, Spiel, Mannschaftsabend, Sonstiges
- Titel
- Datum und Uhrzeit
- Enddatum und Endzeit
- Ort
- Beschreibung
- Sichtbarkeit
- Status

### EventAttendance

Rueckmeldung eines Spielers zu einem Kalendertermin.

Wichtige Felder:

- Kalendertermin
- Spielerprofil
- Status: Zusage, Vielleicht, Absage
- Grund oder Kommentar
- gesetzt von User

### PlayerAvailability

Abwesenheit eines Spielers ueber einen Zeitraum.

Wichtige Felder:

- Spielerprofil
- Startdatum
- Enddatum
- Typ
- Notiz

### Match

Ein Spieltag. Spiele koennen als eigener fachlicher Datensatz modelliert werden und mit einem Kalendertermin verknuepft sein.

Wichtige Felder:

- Team
- Kalendertermin
- Gegner
- Heim- oder Auswaertsspiel
- Datum und Uhrzeit
- Ergebnis

### PlayerMatchStat

Spielbezogene Statistik eines Spielers.

Wichtige Felder:

- Match
- Spielerprofil
- Tore
- Vorlagen
- Karten
- Minuten
- Startelf
- Einwechslung
- Bewertung 1 bis 10

## Roadmap

### Phase 1: Produktfundament

- README und MVP-Plan erstellen
- initiales Next.js-Projekt aufsetzen
- Dashboard-Startseite mit Mockdaten bauen
- grundlegende UI-Struktur fuer Trainerbereich und Kalender festlegen

### Phase 2: Datenmodell

- Prisma installieren
- Supabase/PostgreSQL anbinden
- erstes Prisma-Schema erstellen
- Migration fuer Club, Team, User, Rollen, Spielerprofile, Kalendertermine und Rueckmeldungen anlegen

### Phase 3: Auth und Mandantenlogik

- Clerk anbinden
- Login und Logout integrieren
- User aus Clerk mit internem User verknuepfen
- Vereins- und Teamzugriff serverseitig pruefen

### Phase 4: Trainer-MVP

- Team-Dashboard
- Kalender-Vorschau auf dem Dashboard
- Kalenderseite fuer Teamtermine
- Kaderliste
- Spielerprofil bearbeiten
- Trainingseinheiten und Team-Events erstellen
- Rueckmeldungen fuer Termine erfassen
- Abwesenheiten eintragen
- automatische Absagen aus Abwesenheiten vorbereiten

### Phase 5: Spieltags-MVP

- Spiel anlegen
- Kader fuer Spieltag anzeigen
- Startelf und Einwechslungen erfassen
- Tore, Vorlagen, Karten, Minuten und Bewertung speichern

### Phase 6: Auswertung

- Trainingsbeteiligung visualisieren
- Spielerstatistiken anzeigen
- einfache Entwicklungskurven bauen

## Offene Entscheidungen

Diese Punkte muessen spaeter noch konkretisiert werden:

- genaue Berechtigungsliste pro Rolle
- ob Co-Trainer dauerhaft dieselben Rechte wie Trainer behalten
- welche Positionen als Standardwerte angeboten werden
- ob Spieler eigene Statistiken sehen duerfen
- ob Spieler Bewertungen sehen duerfen
- wie Einladungen per WhatsApp oder SMS technisch umgesetzt werden
- ob Material- oder Beitragsstatus in den Trainer-MVP gehoert

## Entwicklung

Lokalen Entwicklungsserver starten:

```bash
npm run dev
```

Linting ausfuehren:

```bash
npm run lint
```

Build pruefen:

```bash
npm run build
```
