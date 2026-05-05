# VereinDigital Datenmodell

Dieses Dokument beschreibt das geplante Datenmodell fuer Phase 2. Ziel ist ein Prisma/Supabase-Postgres-Schema, das den Trainer-MVP sauber abbildet und wichtige spaetere Erweiterungen bereits strukturell vorbereitet.

## Ziele fuer Phase 2

Phase 2 soll die fachliche Grundlage fuer folgende Bereiche schaffen:

1. Vereine und Teams
2. Benutzeridentitaeten ueber Clerk
3. Spielerprofile getrennt von Login-Usern
4. Teammitgliedschaften mit Rollen
5. flexible Berechtigungssteuerung
6. Teamkalender mit Trainings, Spielen und Events
7. Rueckmeldungen zu Kalenderterminen
8. Abwesenheiten mit automatischer Absage-Logik
9. Spieltage und Spielerstatistiken
10. vorbereiteter Trainingskatalog fuer spaetere Trainingsplanung

## Modellierungsprinzipien

- Ein Verein ist die oberste Mandantenebene.
- Ein Verein kann mehrere Teams haben.
- Ein User ist eine technische Identitaet, die mit Clerk verknuepft ist.
- Ein PlayerProfile ist die sportliche Person im Verein oder Team.
- User und PlayerProfile koennen verknuepft sein, muessen es aber nicht sofort.
- Ein User kann in mehreren Teams unterschiedliche Rollen haben.
- Ein User kann in Team A Trainer und in Team B Spieler sein.
- Rollen sollen nicht hart kodiert bleiben, sondern spaeter durch Berechtigungen steuerbar sein.
- Kalendertermine sollen Training, Spiel und sonstige Events einheitlich abbilden.
- Spiele koennen zusaetzliche fachliche Daten haben und mit einem Kalendertermin verbunden sein.
- Abwesenheiten werden als Zeitraum gespeichert und koennen Rueckmeldungen automatisch erzeugen.

## MVP-Kernmodelle

### Club

Repraesentiert einen Fussballverein.

Felder:

- `id`
- `name`
- `slug`
- `createdAt`
- `updatedAt`

Beziehungen:

- hat viele `Team`
- hat viele `User`
- hat viele `PlayerProfile`
- hat viele `Role`
- hat viele `Invitation`

Hinweise:

- `slug` sollte pro System eindeutig sein.
- Spaeter koennen Vereinslogo, Farben, Adresse und Rechnungsdaten ergaenzt werden.

### Team

Repraesentiert eine Mannschaft innerhalb eines Vereins.

Felder:

- `id`
- `clubId`
- `name`
- `ageGroup`
- `season`
- `createdAt`
- `updatedAt`

Beziehungen:

- gehoert zu `Club`
- hat viele `TeamMembership`
- hat viele `CalendarEvent`
- hat viele `Match`
- hat viele `Invitation`

Beispiele:

- 1. Herren
- 2. Herren
- C-Jugend
- Damen

### User

Interner App-Benutzer, verknuepft mit Clerk.

Felder:

- `id`
- `clubId`
- `clerkUserId`
- `email`
- `displayName`
- `createdAt`
- `updatedAt`

Beziehungen:

- gehoert zu `Club`
- kann mit einem oder mehreren `PlayerProfile` verknuepft sein
- hat viele `TeamMembership`
- setzt Rueckmeldungen in `EventAttendance`

Hinweise:

- `clerkUserId` muss eindeutig sein.
- Rollen liegen nicht direkt am User, sondern ueber Teammitgliedschaften und Rollen.

### PlayerProfile

Sportliches Profil einer Person.

Felder im MVP:

- `id`
- `clubId`
- `userId`
- `firstName`
- `lastName`
- `birthDate`
- `position`
- `createdAt`
- `updatedAt`

Beziehungen:

- gehoert zu `Club`
- optional verknuepft mit `User`
- hat viele `TeamMembership`
- hat viele `EventAttendance`
- hat viele `PlayerAvailability`
- hat viele `PlayerMatchStat`

Hinweise:

- `userId` ist optional, damit Trainer Spieler ohne Login vorab anlegen koennen.
- Fuer den MVP reicht eine einfache Positionsauswahl.
- Spaeter koennen Kontaktinfos, Notfallkontakt, Fuss, Staerken, Schwaechen und medizinische Hinweise ergaenzt werden.

## Rollen und Berechtigungen

Die Berechtigungssteuerung soll im Datenmodell vorbereitet werden, auch wenn im ersten MVP nur Standardrollen aktiv genutzt werden.

### Role

Repraesentiert eine Rolle innerhalb eines Vereins.

Felder:

- `id`
- `clubId`
- `name`
- `key`
- `isSystemRole`
- `createdAt`
- `updatedAt`

Beziehungen:

- gehoert zu `Club`
- hat viele `RolePermission`
- wird in `TeamMembership` verwendet
- wird in `Invitation` verwendet

Standardrollen:

- Admin
- Trainer
- Co-Trainer
- Spieler

Hinweise:

- `isSystemRole` markiert Rollen, die initial vom System angelegt werden.
- Spaeter koennen Admins eigene Rollen anlegen.
- `key` sollte technische Werte wie `admin`, `trainer`, `assistant_coach`, `player` enthalten.

### Permission

Repraesentiert eine einzelne Berechtigung.

Felder:

- `id`
- `key`
- `description`
- `createdAt`
- `updatedAt`

Beispiele:

- `club.manage`
- `team.manage`
- `team.members.manage`
- `calendar.events.manage`
- `attendance.manage`
- `player.profile.self.update`
- `player.profile.manage`
- `match.manage`
- `match.stats.manage`
- `roles.manage`

Hinweise:

- Berechtigungen sind globale Systemwerte.
- Rollen verbinden sich ueber `RolePermission` mit Berechtigungen.

### RolePermission

Verknuepft Rollen mit Berechtigungen.

Felder:

- `id`
- `roleId`
- `permissionId`
- `createdAt`

Hinweise:

- Kombination aus `roleId` und `permissionId` sollte eindeutig sein.

### ClubMembership

Verknuepft einen User mit einem Verein und einer vereinsweiten Rolle.

Felder:

- `id`
- `clubId`
- `userId`
- `roleId`
- `status`
- `createdAt`
- `updatedAt`

Statuswerte:

- `ACTIVE`
- `INVITED`
- `INACTIVE`

Hinweise:

- Adminrechte werden ueber `ClubMembership` modelliert.
- Ein Admin muss nicht kuenstlich Mitglied in jedem Team sein.
- Teamrollen bleiben weiterhin in `TeamMembership`.
- Kombination aus `clubId`, `userId` und `roleId` sollte eindeutig sein.

### TeamMembership

Verknuepft User und/oder PlayerProfile mit einem Team und einer Rolle.

Felder:

- `id`
- `teamId`
- `userId`
- `playerProfileId`
- `roleId`
- `status`
- `createdAt`
- `updatedAt`

Statuswerte:

- `ACTIVE`
- `INVITED`
- `INACTIVE`

Hinweise:

- `userId` ist fuer Trainer, Co-Trainer und Admin relevant.
- `playerProfileId` ist fuer Spieler relevant.
- Bei Spielern mit Login koennen `userId` und `playerProfileId` beide gesetzt sein.
- Dieses Modell erlaubt, dass ein User in mehreren Teams unterschiedliche Rollen hat.

## Einladungssystem

### Invitation

Repraesentiert eine Einladung in ein Team oder einen Verein.

Felder:

- `id`
- `clubId`
- `teamId`
- `roleId`
- `email`
- `token`
- `status`
- `expiresAt`
- `createdByUserId`
- `createdAt`
- `updatedAt`

Statuswerte:

- `PENDING`
- `ACCEPTED`
- `EXPIRED`
- `REVOKED`

Hinweise:

- Einladungen koennen per Link, E-Mail oder spaeter WhatsApp/SMS geteilt werden.
- `teamId` kann optional bleiben, falls spaeter vereinsweite Admin-Einladungen benoetigt werden.

## Kalender und Rueckmeldungen

### CalendarEvent

Ein allgemeiner Termin im Teamkalender.

Felder:

- `id`
- `teamId`
- `type`
- `title`
- `description`
- `location`
- `startsAt`
- `endsAt`
- `status`
- `createdByUserId`
- `createdAt`
- `updatedAt`

Typen:

- `TRAINING`
- `MATCH`
- `TEAM_EVENT`
- `OTHER`

Statuswerte:

- `SCHEDULED`
- `CANCELLED`
- `COMPLETED`

Beziehungen:

- gehoert zu `Team`
- hat viele `EventAttendance`
- kann mit einem `Match` verknuepft sein
- kann spaeter mit einer `TrainingPlan` verknuepft sein

Hinweise:

- Trainingseinheiten, Spiele und Mannschaftsabende erscheinen alle im gleichen Kalender.
- Die Kalenderseite kann direkt auf diesem Modell basieren.

### EventAttendance

Rueckmeldung eines Spielers zu einem Kalendertermin.

Felder:

- `id`
- `calendarEventId`
- `playerProfileId`
- `status`
- `reason`
- `setByUserId`
- `createdAt`
- `updatedAt`

Statuswerte:

- `ACCEPTED`
- `MAYBE`
- `DECLINED`

Regeln:

- Bei `DECLINED` ist `reason` verpflichtend.
- Bei `ACCEPTED` und `MAYBE` ist `reason` optional.
- Trainer und Co-Trainer duerfen Rueckmeldungen fuer Spieler setzen oder bearbeiten.
- Spieler duerfen eigene Rueckmeldungen setzen.

Hinweise:

- Kombination aus `calendarEventId` und `playerProfileId` sollte eindeutig sein.

### PlayerAvailability

Abwesenheit eines Spielers ueber einen Zeitraum.

Felder:

- `id`
- `playerProfileId`
- `type`
- `startsAt`
- `endsAt`
- `note`
- `createdAt`
- `updatedAt`

Typen:

- `VACATION`
- `INJURY`
- `ILLNESS`
- `OTHER`

Regeln:

- Alle betroffenen Kalendertermine koennen automatisch eine `DECLINED` Rueckmeldung erhalten.
- Der Absagegrund kann aus Typ und Notiz generiert werden.

Hinweise:

- Die automatische Erstellung von Rueckmeldungen kann als Service-Logik umgesetzt werden, nicht direkt als Datenbanktrigger.

## Spieltage und Statistiken

### Match

Fachlicher Spieltagsdatensatz.

Felder:

- `id`
- `teamId`
- `calendarEventId`
- `opponent`
- `isHomeGame`
- `goalsFor`
- `goalsAgainst`
- `status`
- `createdAt`
- `updatedAt`

Statuswerte:

- `PLANNED`
- `LIVE`
- `FINISHED`
- `CANCELLED`

Beziehungen:

- gehoert zu `Team`
- gehoert optional zu `CalendarEvent`
- hat viele `PlayerMatchStat`

Hinweise:

- Datum, Uhrzeit und Ort koennen primaer ueber `CalendarEvent` kommen.
- Ergebnis wird im `Match` gespeichert.

### PlayerMatchStat

Statistik eines Spielers fuer ein Spiel.

Felder:

- `id`
- `matchId`
- `playerProfileId`
- `goals`
- `assists`
- `yellowCards`
- `redCards`
- `minutesPlayed`
- `lineupStatus`
- `rating`
- `createdAt`
- `updatedAt`

Lineup-Statuswerte:

- `STARTER`
- `SUBSTITUTE`
- `NOT_USED`

Regeln:

- `rating` liegt auf einer Skala von 1 bis 10.
- `minutesPlayed` sollte zwischen 0 und 120 liegen.

Hinweise:

- Kombination aus `matchId` und `playerProfileId` sollte eindeutig sein.

## Trainingskatalog vorbereiten

Der Trainingskatalog soll im ersten Step noch nicht voll umgesetzt werden, aber im Datenmodell vorbereitet werden.

Ziel:

- Trainer koennen Uebungen erstellen.
- Eine Trainingseinheit kann aus mehreren Uebungen bestehen.
- Uebungen koennen mehrfach in verschiedenen Trainingseinheiten verwendet werden.
- Reihenfolge, Dauer und Hinweise pro Trainingseinheit sollen speicherbar sein.

### TrainingExercise

Katalogeintrag fuer eine Uebung.

Felder:

- `id`
- `clubId`
- `createdByUserId`
- `title`
- `description`
- `category`
- `durationMinutes`
- `minPlayers`
- `maxPlayers`
- `intensity`
- `createdAt`
- `updatedAt`

Kategorien:

- `WARMUP`
- `TECHNIQUE`
- `TACTICS`
- `CONDITIONING`
- `FINISHING`
- `GAME_FORM`
- `COOLDOWN`
- `OTHER`

Hinweise:

- Zunaechst reicht Textbeschreibung.
- Spaeter koennen Bilder, Skizzen, Video-Links und Materialbedarf ergaenzt werden.

### TrainingPlan

Trainingsplanung fuer eine konkrete Trainingseinheit.

Felder:

- `id`
- `calendarEventId`
- `objective`
- `notes`
- `createdAt`
- `updatedAt`

Hinweise:

- `calendarEventId` sollte auf einen Termin vom Typ `TRAINING` zeigen.
- Ein Training kann ohne Plan existieren, der Plan kann spaeter ergaenzt werden.

### TrainingPlanExercise

Verknuepft eine geplante Trainingseinheit mit Uebungen aus dem Katalog.

Felder:

- `id`
- `trainingPlanId`
- `trainingExerciseId`
- `sortOrder`
- `durationMinutes`
- `coachingPoints`
- `createdAt`
- `updatedAt`

Hinweise:

- `sortOrder` bestimmt die Reihenfolge innerhalb der Einheit.
- `durationMinutes` kann vom Katalogwert abweichen.
- `coachingPoints` speichert spezifische Hinweise fuer diese Einheit.

## Vorgeschlagene Enums

### TeamMembershipStatus

- `ACTIVE`
- `INVITED`
- `INACTIVE`

### InvitationStatus

- `PENDING`
- `ACCEPTED`
- `EXPIRED`
- `REVOKED`

### CalendarEventType

- `TRAINING`
- `MATCH`
- `TEAM_EVENT`
- `OTHER`

### CalendarEventStatus

- `SCHEDULED`
- `CANCELLED`
- `COMPLETED`

### AttendanceStatus

- `ACCEPTED`
- `MAYBE`
- `DECLINED`

### AvailabilityType

- `VACATION`
- `INJURY`
- `ILLNESS`
- `OTHER`

### MatchStatus

- `PLANNED`
- `LIVE`
- `FINISHED`
- `CANCELLED`

### LineupStatus

- `STARTER`
- `SUBSTITUTE`
- `NOT_USED`

### TrainingExerciseCategory

- `WARMUP`
- `TECHNIQUE`
- `TACTICS`
- `CONDITIONING`
- `FINISHING`
- `GAME_FORM`
- `COOLDOWN`
- `OTHER`

### TrainingIntensity

- `LOW`
- `MEDIUM`
- `HIGH`

## Erste Umsetzungsreihenfolge

### Schritt 1: Prisma-Grundlage

- Prisma installieren
- `prisma/schema.prisma` anlegen
- Supabase/Postgres-Verbindung ueber `.env` vorbereiten
- Prisma Client konfigurieren

### Schritt 2: Organisationsmodell

- `Club`
- `Team`
- `User`
- `PlayerProfile`

### Schritt 3: Rollen und Rechte

- `Role`
- `Permission`
- `RolePermission`
- `ClubMembership`
- `TeamMembership`
- Standardrollen und Standardberechtigungen seeden

### Schritt 4: Kalender und Rueckmeldungen

- `CalendarEvent`
- `EventAttendance`
- `PlayerAvailability`

### Schritt 5: Spieltage

- `Match`
- `PlayerMatchStat`

### Schritt 6: Trainingskatalog vorbereiten

- `TrainingExercise`
- `TrainingPlan`
- `TrainingPlanExercise`

## Validierungsregeln fuer die App

Diese Regeln sollten serverseitig in Actions/Services validiert werden:

- Ein User darf nur Daten seines Vereins sehen.
- Teamrollen duerfen nur auf das jeweilige Team zugreifen.
- Admins duerfen alle Teams im Verein verwalten.
- Trainer und Co-Trainer duerfen Teamkalender, Rueckmeldungen und Spielstatistiken ihres Teams bearbeiten.
- Spieler duerfen eigene Rueckmeldungen und eigene Profildaten bearbeiten.
- Eine Absage braucht immer einen Grund.
- Bewertungen muessen zwischen 1 und 10 liegen.
- Einsatzminuten muessen in einem sinnvollen Bereich liegen.
- Abwesenheiten duerfen kein Enddatum vor dem Startdatum haben.

## Offene Detailfragen

Diese Punkte koennen wir vor oder waehrend der Prisma-Umsetzung klaeren:

- Soll ein PlayerProfile exakt einem Club gehoeren oder spaeter vereinsuebergreifend migrierbar sein?
- Soll `position` als Freitext, Enum oder eigene Tabelle modelliert werden?
- Sollen Kalendertermine wiederkehrend sein, zum Beispiel woechentliches Training?
- Sollen Einladungen auch ohne E-Mail rein per Link funktionieren?
- Welche Standardberechtigungen bekommt Co-Trainer im ersten Seed?
- Sollen Trainingsuebungen clubweit oder teambezogen gespeichert werden?

## Empfehlung fuer den MVP

Fuer den ersten technischen Schnitt sollte das Schema bereits alle oben genannten Kernmodelle enthalten. Die UI muss jedoch nicht alles sofort nutzen.

Direkt nutzen:

- Verein
- Team
- User
- PlayerProfile
- Rollen
- ClubMembership
- TeamMembership
- CalendarEvent
- EventAttendance
- PlayerAvailability
- Match
- PlayerMatchStat

Im Schema vorbereiten:

- Permission
- RolePermission
- Invitation
- TrainingExercise
- TrainingPlan
- TrainingPlanExercise

Damit bleibt das MVP schlank, ohne dass spaetere Kernfunktionen wie Berechtigungssteuerung und Trainingskatalog strukturell nachgeruestet werden muessen.
