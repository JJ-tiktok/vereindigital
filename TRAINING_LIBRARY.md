# VereinDigital Trainingsbibliothek

Dieses Dokument beschreibt das geplante Modul fuer Trainingsbibliothek, Uebungskatalog, Trainingsplanung und Skizzen-Editor. Ziel ist ein praxistaugliches Trainer-Werkzeug, mit dem Uebungen nicht nur textlich beschrieben, sondern visuell auf einem Fussballfeld dargestellt und spaeter in konkrete Trainingseinheiten uebernommen werden koennen.

## Ziel des Moduls

Trainer sollen Trainingseinheiten effizient vorbereiten, dokumentieren und wiederverwenden koennen.

Kernfragen:

1. Welche Uebungen nutzt ein Trainer regelmaessig?
2. Wie kann eine Uebung mit Aufbau, Ablauf und Coaching Points beschrieben werden?
3. Wie kann eine Uebung auf einem Fussballfeld skizziert werden?
4. Wie werden Uebungen aus dem Katalog zu einer konkreten Trainingseinheit zusammengestellt?
5. Welche Rechte braucht ein Trainerteam, um Katalog und Trainingsplaene zu verwalten?

Das Modul soll langfristig ein echter Trainingsplaner werden, nicht nur eine Textsammlung.

## Zielgruppe und Sichtbarkeit

Primaere Nutzer:

- Trainer
- Co-Trainer
- Admins mit Teamzugriff

Spaeter optional:

- Spieler koennen ausgewaehlte Trainingseinheiten oder Uebungen ansehen
- Jugendtrainer koennen clubweite Uebungen teilen
- Admins koennen Vereinsstandards oder Methodik-Kataloge pflegen

MVP-Regel:

- Katalog, Trainingsplanung und Skizzen sind im ersten Schnitt Trainerteam-exklusiv.
- Spieler sehen diese Inhalte im MVP nicht.

## Bausteine

Das Modul besteht aus vier Bereichen:

1. Trainingskatalog
2. Uebungsdetail mit Skizze
3. Trainingsplanung fuer konkrete Kalendertermine
4. Skizzen-Editor

## 1. Trainingskatalog

Der Trainingskatalog ist eine wiederverwendbare Bibliothek von Uebungen.

### Uebungsdaten

MVP-Felder:

- Titel
- Kategorie
- Beschreibung
- Ziel / Schwerpunkt
- Dauer in Minuten
- Intensitaet
- Mindestanzahl Spieler
- Maximalanzahl Spieler
- Material
- Coaching Points
- Organisation / Aufbau
- Ablauf
- Variationen
- Sichtbarkeit

Kategorien:

- Aufwaermen
- Technik
- Taktik
- Kondition
- Torabschluss
- Spielform
- Cooldown
- Torhuetertraining
- Sonstiges

Intensitaet:

- niedrig
- mittel
- hoch

Sichtbarkeit:

- privat fuer Ersteller
- teamweit
- vereinsweit

MVP-Empfehlung:

- zuerst `teamweit` und `vereinsweit`
- private Uebungen koennen spaeter folgen

### Katalogfunktionen

MVP:

- Uebung erstellen
- Uebung bearbeiten
- Uebung anzeigen
- Uebungen nach Kategorie filtern
- Uebungen nach Intensitaet filtern
- Suchfeld nach Titel oder Schwerpunkt

Spaeter:

- Favoriten
- Tags
- Duplizieren
- Versionierung
- Bewertung durch Trainerteam
- Import/Export
- PDF-Ausgabe

## 2. Uebungsdetail mit Skizze

Eine Uebung soll nicht nur Text enthalten, sondern auch visuell darstellbar sein.

### Inhalte einer Uebung

- Beschreibung
- Aufbau
- Ablauf
- Coaching Points
- Varianten
- Material
- Skizze

### Skizzenlogik

Eine Uebung hat im MVP eine Hauptskizze.

Spaeter moeglich:

- mehrere Skizzen pro Uebung
- Phasen einer Uebung
- Animation von Ablaeufen
- Varianten fuer andere Spielerzahlen

## 3. Trainingsplanung

Eine konkrete Trainingseinheit entsteht aus einem Kalendertermin vom Typ `TRAINING`.

### Trainingsplan

Ein Trainingsplan gehoert zu einem konkreten Trainingstermin.

Bestandteile:

- Ziel der Einheit
- Notizen
- Uebungen aus dem Katalog
- Reihenfolge
- Dauer pro Uebung
- spezifische Coaching Points fuer diese Einheit

Beispiel:

1. Aufwaermen: Passdreieck, 12 Minuten
2. Hauptteil: Spielverlagerung, 25 Minuten
3. Spielform: 6 gegen 6 plus 2, 25 Minuten
4. Abschluss: Standards, 15 Minuten

### Unterschied Katalog vs. Trainingsplan

Der Katalog beschreibt die wiederverwendbare Uebung.

Der Trainingsplan beschreibt die konkrete Verwendung dieser Uebung an einem bestimmten Termin.

Beispiel:

- Katalog: "Passdreieck mit Klatsch und Drehung"
- Trainingsplan: "Heute mit Fokus auf ersten Kontakt, Dauer 12 Minuten, Gruppen A/B parallel"

## 4. Skizzen-Editor

Der Skizzen-Editor soll Trainern erlauben, Uebungen visuell auf einem Fussballfeld zu planen.

### Feldvorlagen

MVP-Feldtypen:

- ganzes Feld
- halbes Feld
- Strafraum / 16er
- Kleinfeld
- freie Flaeche

Spaeter:

- Drittel
- Fluegelzone
- Zentrum
- Torhueterbereich
- individuelles Feldformat

### Elemente

MVP-Elemente:

- Spieler blau
- Spieler rot
- Torhueter
- Huetchen
- Ball
- Tor
- Mini-Tor
- Linie
- Pfeil
- Text
- Zone / Rechteck

Pfeilarten:

- Laufweg
- Passweg
- Dribbelweg
- Schuss

### Editor-Funktionen

MVP:

- Feldtyp auswaehlen
- Elemente platzieren
- Elemente verschieben
- Elemente loeschen
- Textlabels bearbeiten
- Pfeile / Linien zeichnen
- Skizze speichern
- Skizze wieder laden und bearbeiten

Spaeter:

- Elemente drehen
- Gruppieren
- Ebenen
- Undo / Redo
- Raster / Snap-to-grid
- Kopieren / Einfuegen
- Export als Bild oder PDF
- Animation von Ablaeufen

### Technischer Ansatz

Empfehlung fuer MVP:

- SVG-basierter Editor
- Skizze wird als JSON gespeichert
- Darstellung ist skalierbar und responsive
- Elemente bleiben editierbar

Warum SVG:

- gut fuer Fussballfeld-Linien und Symbole
- gut skalierbar auf Desktop und Tablet
- Elemente sind als einzelne Objekte klickbar
- weniger schwergewichtig als ein Canvas-Framework
- fuer den MVP ausreichend

Alternative spaeter:

- `react-konva` oder ein anderer Canvas-Editor
- sinnvoll, wenn Drag-and-Drop, komplexe Auswahl, viele Elemente und Animationen groesser werden

### Skizzen-JSON

Die Skizze sollte strukturiert gespeichert werden, nicht als reines Bild.

Beispiel:

```json
{
  "pitch": "HALF_FIELD",
  "elements": [
    {
      "id": "p1",
      "type": "player",
      "team": "blue",
      "x": 35,
      "y": 55,
      "label": "6"
    },
    {
      "id": "c1",
      "type": "cone",
      "x": 20,
      "y": 40
    },
    {
      "id": "a1",
      "type": "arrow",
      "arrowType": "pass",
      "from": { "x": 35, "y": 55 },
      "to": { "x": 65, "y": 55 }
    }
  ]
}
```

Koordinaten sollten prozentual gespeichert werden:

- `x`: 0 bis 100
- `y`: 0 bis 100

Vorteil:

- Skizzen skalieren sauber auf verschiedenen Bildschirmgroessen.
- Mobile und Desktop koennen dieselben Daten darstellen.

## Berechtigungen

Das Modul braucht klare Berechtigungen, weil Trainingsinhalte zum Trainer-Know-how gehoeren.

Vorgeschlagene Permissions:

- `training.catalog.read`
- `training.catalog.manage`
- `training.exercise.read`
- `training.exercise.manage`
- `training.exercise.sketch.manage`
- `training.plan.read`
- `training.plan.manage`
- `training.plan.assign_exercise`

MVP-Zuweisung:

- Admin: alle Rechte im Verein
- Trainer: alle Rechte fuer eigene Teams
- Co-Trainer: alle Rechte fuer eigene Teams
- Spieler: keine Rechte

Spaeter moeglich:

- Spieler duerfen freigegebene Trainingseinheiten sehen
- Co-Trainer duerfen nur Plaene lesen, aber nicht bearbeiten
- Jugendkoordinatoren duerfen Vereinsbibliothek verwalten

## Datenmodell-Vorschlag

Bestehende Modelle:

- `TrainingExercise`
- `TrainingPlan`
- `TrainingPlanExercise`

Diese Modelle existieren bereits im Grundschema und koennen erweitert werden.

### TrainingExercise

Katalogeintrag fuer eine Uebung.

Bestehende Felder:

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

Empfohlene Erweiterungen:

- `teamId`
- `objective`
- `organization`
- `flow`
- `coachingPoints`
- `variations`
- `material`
- `visibility`
- `pitchType`
- `sketchData`

Hinweise:

- `teamId` ist optional, wenn eine Uebung vereinsweit gilt.
- `visibility` steuert privat, teamweit oder vereinsweit.
- `sketchData` speichert JSON.

### TrainingPlan

Plan fuer eine konkrete Trainingseinheit.

Bestehende Felder:

- `id`
- `calendarEventId`
- `objective`
- `notes`
- `createdAt`
- `updatedAt`

Empfohlene Erweiterungen:

- `createdByUserId`
- `focus`
- `status`

Statuswerte:

- `DRAFT`
- `PLANNED`
- `COMPLETED`

### TrainingPlanExercise

Verknuepft Trainingsplan und Kataloguebung.

Bestehende Felder:

- `id`
- `trainingPlanId`
- `trainingExerciseId`
- `sortOrder`
- `durationMinutes`
- `coachingPoints`
- `createdAt`
- `updatedAt`

Empfohlene Erweiterungen:

- `notes`
- `customSketchData`

Hinweise:

- `customSketchData` erlaubt Anpassungen fuer eine konkrete Trainingseinheit, ohne die Kataloguebung zu veraendern.

### TrainingExerciseSketch

Optionales separates Modell, falls wir mehrere Skizzen pro Uebung brauchen.

Felder:

- `id`
- `trainingExerciseId`
- `title`
- `pitchType`
- `sketchData`
- `sortOrder`
- `createdAt`
- `updatedAt`

Empfehlung:

- Im MVP reicht `sketchData` direkt an `TrainingExercise`.
- Ein eigenes Modell lohnt sich spaeter fuer mehrere Skizzen oder Phasen.

## Enums

### TrainingExerciseVisibility

- `PRIVATE`
- `TEAM`
- `CLUB`

### TrainingPitchType

- `FULL_FIELD`
- `HALF_FIELD`
- `PENALTY_AREA`
- `SMALL_FIELD`
- `FREE_AREA`

### TrainingPlanStatus

- `DRAFT`
- `PLANNED`
- `COMPLETED`

### TrainingSketchElementType

Kann im Code als TypeScript-Typ oder JSON-Schema gepflegt werden.

Werte:

- `PLAYER`
- `GOALKEEPER`
- `CONE`
- `BALL`
- `GOAL`
- `MINI_GOAL`
- `LINE`
- `ARROW`
- `TEXT`
- `ZONE`

### TrainingSketchArrowType

- `RUN`
- `PASS`
- `DRIBBLE`
- `SHOT`

## UI- und Routen-Vorschlag

### Trainingskatalog

- `/training`
- `/training/new`
- `/training/[exerciseId]`
- `/training/[exerciseId]/edit`

Funktionen:

- Uebungsliste
- Suche
- Filter
- Detailansicht
- Uebung erstellen / bearbeiten

### Skizzen-Editor

- `/training/[exerciseId]/skizze`

Funktionen:

- Feldtyp auswaehlen
- Elementpalette
- Zeichenflaeche
- Eigenschaftenpanel
- Speichern

### Trainingsplanung

- `/kalender/[eventId]/training-plan`

oder als Bereich direkt in:

- `/kalender/[eventId]`

Funktionen:

- Plan fuer Termin erstellen
- Uebungen aus Katalog hinzufuegen
- Reihenfolge veraendern
- Dauer und Coaching Points anpassen
- Plan anzeigen

Empfehlung:

- Katalog bekommt eigene Route `/training`.
- Konkrete Trainingsplanung wird in die Kalender-Detailseite fuer Trainingstermine integriert.

## Mobile-Strategie

Mobile soll im MVP vor allem gute Lesbarkeit bieten.

Empfehlung:

- Smartphone: Uebungen ansehen, Plaene lesen, einfache Textdaten bearbeiten
- Tablet/Desktop: Skizzen erstellen und bearbeiten

Warum:

- Drag-and-Drop und Praezisionsarbeit ist auf kleinen Displays schwer.
- Trainer nutzen Planung haeufig am Laptop oder Tablet.
- Auf dem Platz kann das Handy fuer Ansicht und Ablauf reichen.

## Umsetzungsphasen

### Phase T1: Katalog-Grundlage

- Datenmodell erweitern
- Migration erstellen
- Trainingskatalog-Route bauen
- Uebungen erstellen, bearbeiten, anzeigen
- Filter nach Kategorie und Intensitaet
- Quick Action vom Dashboard auf Katalog/Training planen verlinken

### Phase T2: Trainingsplanung

- Trainingstermin mit Trainingsplan verknuepfen
- Uebungen aus Katalog zum Termin hinzufuegen
- Reihenfolge, Dauer und Coaching Points pflegen
- Trainingsplan in Kalender-Detailseite anzeigen

### Phase T3: Skizzen-Editor MVP

- SVG-Feldvorlagen bauen
- Elementpalette
- Platzieren, Verschieben, Loeschen
- Pfeile/Linien zeichnen
- Skizze als JSON speichern
- Skizze in Uebungsdetail anzeigen

### Phase T4: Export und Wiederverwendung

- Uebung duplizieren
- Trainingsplan als Druckansicht
- PDF-Export vorbereiten
- Skizze als Bild exportieren

### Phase T5: Erweiterungen

- mehrere Skizzen pro Uebung
- Phasen / Animation
- Favoriten und Tags
- Vereinsmethodik / Standardkatalog
- Spielerfreigabe fuer ausgewaehlte Inhalte

## MVP-Empfehlung

Der erste technische Schnitt sollte nicht direkt mit dem vollen Editor starten.

Empfohlene Reihenfolge:

1. Trainingskatalog mit guten Textfeldern und Filterung
2. Trainingsplanung fuer konkrete Kalendertermine
3. einfacher SVG-Skizzen-Editor

Damit entsteht schnell ein nutzbarer Mehrwert. Der Editor kann danach wachsen, ohne dass Datenmodell und Trainingsworkflow nochmal grundlegend umgebaut werden muessen.

## Offene Entscheidungen

- Soll der Katalog initial vereinsweit oder teamweit sein?
- Soll eine Uebung direkt mehrere Skizzen/Phasen haben oder erst spaeter?
- Welche Elemente muessen fuer den ersten Editor zwingend enthalten sein?
- Soll es eine Druckansicht fuer Trainingseinheiten im MVP geben?
- Soll ein Trainingsplan nach Abschluss des Trainings archiviert oder bewertet werden?
- Sollen Spieler spaeter Trainingseinheiten sehen duerfen?
