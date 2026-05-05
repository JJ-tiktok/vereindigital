# VereinDigital Spielerentwicklung

Dieses Dokument beschreibt das geplante Modul fuer erweiterte Spielerinformationen, Spielerentwicklung, Faehigkeitenprofile, Formanzeige und Spielerakte. Der Fokus liegt zunaechst klar auf der Trainer-App: Die Daten sind Coaching-Staff-exklusiv und werden nicht fuer Spieler freigegeben.

## Ziel des Moduls

Das Modul soll Trainern helfen, Spieler nicht nur organisatorisch zu verwalten, sondern sportlich und persoenlich ueber eine Saison hinweg zu begleiten.

Kernfragen:

1. Welche Staerken und Schwaechen hat ein Spieler?
2. Wie entwickelt sich ein Spieler ueber die Saison?
3. Welche Form zeigt ein Spieler aktuell?
4. Welche Gespraeche, Ziele und Beobachtungen wurden dokumentiert?
5. Welche Informationen sind nur fuer Trainer und Co-Trainer bestimmt?

Das Modul orientiert sich konzeptionell an bekannten Fussball-Management-Spielen wie Football Manager, wird fuer VereinDigital aber bewusst schlanker und praxistauglicher gehalten.

## Zielgruppe und Sichtbarkeit

Primaere Nutzer:

- Trainer
- Co-Trainer
- Admins mit Teamzugriff

Nicht im MVP sichtbar fuer:

- Spieler

Regel:

- Entwicklungsdaten, Faehigkeitenprofile, Formwerte und Spielerakten sind im MVP ausschliesslich fuer Trainer, Co-Trainer und berechtigte Admins sichtbar.
- Spieler-Self-Service fuer ausgewaehlte Ziele oder Feedbacks kann spaeter vorbereitet werden, ist aber nicht Teil des ersten Schnitts.

## Bausteine

Das Modul besteht aus vier fachlichen Bereichen:

1. Faehigkeitenprofil
2. Entwicklungstracking
3. Leistungsbewertungen fuer Training und Spiel
4. Formanzeige
5. Spielerakte

## 1. Faehigkeitenprofil

Jeder Spieler erhaelt ein sportliches Profil mit bewertbaren Attributen. Die Skala liegt bei 1 bis 20.

Warum 1 bis 20:

- feiner als 1 bis 10
- gut geeignet fuer Entwicklung ueber laengere Zeitraeume
- bekannt aus Football-Manager-artigen Systemen
- erlaubt sichtbare Fortschritte, ohne jede kleine Veraenderung zu ueberbewerten

### Bewertungslogik

Skala:

- `1-4`: stark entwicklungsbeduerftig
- `5-8`: unterdurchschnittlich
- `9-12`: solide / mannschaftstauglich
- `13-16`: klare Staerke
- `17-20`: herausragend fuer das Leistungsniveau

Wichtig:

- Die Werte sind relativ zur Mannschaft, Altersklasse und Liga zu verstehen.
- Ein Wert `15` in einer C-Jugend bedeutet nicht dasselbe wie ein Wert `15` in einer Herrenmannschaft.
- Die Bewertung ist eine Trainer-Einschaetzung, keine objektive Messung.

### Attributgruppen

#### Technik

- Ballkontrolle
- Erster Kontakt
- Passspiel
- Flanken
- Abschluss
- Dribbling
- Kopfball
- Standards
- Beidfuessigkeit

#### Taktik

- Spielverstaendnis
- Stellungsspiel
- Entscheidungsverhalten
- Pressingverhalten
- Umschaltverhalten offensiv
- Umschaltverhalten defensiv
- Raumaufteilung
- Defensivverhalten

#### Physis

- Schnelligkeit
- Antritt
- Ausdauer
- Kraft
- Beweglichkeit
- Balance
- Robustheit
- Sprungkraft

#### Mentalitaet

- Einsatzbereitschaft
- Konzentration
- Teamfaehigkeit
- Fuehrungsverhalten
- Lernbereitschaft
- Selbstvertrauen
- Disziplin
- Druckresistenz

### Positionsspezifische Attribute

Positionsspezifische Attribute sollen zusaetzlich zu den allgemeinen Attributen genutzt werden. Ein Spieler muss nicht alle Spezialwerte bekommen, sondern nur die fuer seine Position relevanten.

#### Torhueter

- Reflexe
- Strafraumbeherrschung
- Eins-gegen-eins
- Fangtechnik
- Abwehr von Distanzschuessen
- Flankenverteidigung
- Spielereroeffnung kurz
- Spielereroeffnung lang
- Mitspielen ausserhalb des Strafraums
- Kommunikation mit der Abwehr

#### Innenverteidiger

- Zweikampfverhalten
- Kopfballverteidigung
- Antizipation
- Stellungsspiel letzte Linie
- Spielereroeffnung
- Absicherung
- Kommunikation

#### Aussenverteidiger

- Defensives Eins-gegen-eins
- Offensives Eins-gegen-eins
- Hinterlaufen
- Flankenlauf
- Rueckwaertsbewegung
- Seitenverlagerung

#### Zentrales Mittelfeld

- Passsicherheit
- Spielverlagerung
- Pressingresistenz
- Ballgewinn
- Rhythmussteuerung
- Tiefenlaeufe

#### Offensives Mittelfeld / Fluegel

- Kreativitaet
- Tempo im Dribbling
- letzter Pass
- Abschluss aus zweiter Reihe
- Freilaufverhalten
- Eins-gegen-eins offensiv

#### Sturm

- Abschlussqualitaet
- Bewegung in die Tiefe
- Strafraumverhalten
- Ruecken-zum-Tor-Spiel
- Pressing vorne
- Chancenverwertung

## 2. Entwicklungstracking

Faehigkeitswerte sollen nicht nur einmalig gespeichert werden. Ziel ist ein Verlauf ueber die Saison.

MVP-Idee:

- Trainer legt pro Spieler einen Bewertungsstand an.
- Ein Bewertungsstand hat ein Datum, eine Saison und optional eine Notiz.
- Pro Bewertungsstand werden ausgewaehlte Attribute mit Wert 1 bis 20 gespeichert.
- Veraenderungen gegenueber der letzten Bewertung werden angezeigt.

Beispiele:

- Passspiel von 10 auf 12 verbessert
- Ausdauer stabil bei 13
- Konzentration von 11 auf 9 gefallen

Sinnvolle Bewertungsrhythmen:

- Saisonstart
- Winterpause
- Saisonende
- optional monatlich oder nach Trainerentscheidung

Wichtig:

- Das System soll keine Pflicht erzeugen, alle Attribute staendig zu bewerten.
- Trainer sollen gezielt relevante Werte aktualisieren koennen.
- Fehlende Werte sind erlaubt.

## 3. Leistungsbewertungen fuer Training und Spiel

Training und Spiel sollen bewusst getrennt bewertet werden. Ein Spieler kann im Training sehr konstant, fleissig und lernbereit sein, ohne dass diese Leistung sofort in Spielleistung sichtbar wird. Umgekehrt kann ein Spieler im Spiel sehr effektiv sein, aber im Training schwanken. Beide Perspektiven sind fuer Trainer wichtig.

### Trainingsleistung

Die Trainingsleistung beschreibt den Eindruck aus einer konkreten Trainingseinheit.

Bewertung:

- Skala 1.0 bis 10.0
- Kommazahlen sind erlaubt
- optionaler Kommentar pro Spieler und Training

Moegliche Bewertungsdimensionen fuer spaeter:

- Einsatz / Intensitaet
- Konzentration
- technische Ausfuehrung
- taktisches Verhalten
- Lernbereitschaft

MVP:

- eine Gesamtbewertung pro Spieler und Training
- optionaler Trainerkommentar
- Verknuepfung mit einem `CalendarEvent` vom Typ `TRAINING`

### Spielleistung

Die Spielleistung beschreibt die Leistung in einem konkreten Spiel.

Bewertung:

- Skala 1.0 bis 10.0
- Kommazahlen sind erlaubt
- basiert auf realer Spieltagsbewertung

Bereits geplante Werte:

- Einsatzzeit
- Startelf / Einwechslung / nicht eingesetzt
- Tore
- Vorlagen
- Karten
- Bewertung

Wichtig:

- Trainingsleistung und Spielleistung werden getrennt gespeichert.
- Beide koennen spaeter gemeinsam in die Formanzeige einfliessen.
- In Auswertungen muss klar sichtbar sein, ob eine Bewertung aus Training oder Spiel kommt.

## 4. Formanzeige

Die Formanzeige soll die aktuelle sportliche Leistung eines Spielers abbilden. Anders als das Faehigkeitenprofil ist Form kurzfristiger und leistungsbezogener.

### Bewertungsskala

Die Leistungsbewertung liegt auf einer Skala von 1 bis 10 und darf Kommazahlen enthalten.

Beispiele:

- `5.5`
- `6.0`
- `7.3`
- `8.1`

Die Skala orientiert sich an realen Spielbewertungen.

### Datenquellen fuer Form

Kurzfristig:

- gespeicherte Spielbewertungen aus `PlayerMatchStat.rating`
- gespeicherte Trainingsbewertungen aus `PlayerTrainingPerformance.rating`
- Einsatzminuten
- Startelf / Einwechslung
- Tore und Vorlagen
- Karten

Spaeter moeglich:

- Trainingsbeteiligung
- Trainer-Eindruck
- Belastung / Verletzungen
- manuelle Formkorrektur durch Trainer

### MVP-Formlogik

Im ersten Schritt sollte die Form aus den letzten Spielbewertungen berechnet werden.

Vorschlag:

- Grundlage: letzte 5 bewertete Spiele, optional separat letzte 5 bewertete Trainings
- Formwert Spiel: Durchschnitt der letzten Spielbewertungen
- Formwert Training: Durchschnitt der letzten Trainingsbewertungen
- Gesamtform spaeter: gewichtete Kombination aus Spiel- und Trainingsform
- Anzeige: Wert 1.0 bis 10.0
- Trend: Vergleich mit vorherigem Zeitraum

Trendlogik:

- steigend: aktueller Durchschnitt hoeher als vorheriger Durchschnitt
- stabil: kaum Veraenderung
- fallend: aktueller Durchschnitt niedriger als vorheriger Durchschnitt

Optional spaeter:

- Tore/Vorlagen koennen die Form positiv beeinflussen
- Karten oder geringe Einsatzzeit koennen gesondert angezeigt werden
- Trainer kann eine manuelle Formnotiz ergaenzen

## 5. Spielerakte

Die Spielerakte ist eine chronologische Dokumentation pro Spieler. Sie dient Trainern als internes Protokoll fuer Kommunikation, Beobachtungen, Ziele und Entwicklung.

### Typen von Akteneintraegen

MVP-Typen:

- Spielergespraech
- Zielvereinbarung
- Feedback
- Trainingsbeobachtung
- Spielbeobachtung
- Verhalten / Disziplin
- Verletzung / Belastung
- Sonstige Notiz

### Felder pro Akteneintrag

- Spieler
- Team
- Typ
- Datum
- Titel
- Inhalt / Notiz
- erstellt von User
- optional Wiedervorlage am
- optional Saison
- erstellt am
- aktualisiert am

### Beispiele

Spielergespraech:

- Titel: Rueckmeldung zur aktuellen Rolle
- Inhalt: Spieler sieht sich eher auf der Sechs. Trainer erklaert aktuelle Planung als Innenverteidiger.
- Wiedervorlage: in 4 Wochen

Zielvereinbarung:

- Titel: Ausdauer und Trainingspraesenz verbessern
- Inhalt: Ziel ist mindestens 80 Prozent Trainingsbeteiligung bis Saisonende.

Feedback:

- Titel: Sehr gute Trainingswoche
- Inhalt: Hohe Intensitaet, gute Kommunikation, mehrere positive Aktionen im Abschlussspiel.

## Berechtigungen

Das Modul benoetigt eigene Berechtigungen, damit der Zugriff klar getrennt bleibt.

Vorgeschlagene Permissions:

- `player.development.view`
- `player.development.manage`
- `player.attributes.view`
- `player.attributes.manage`
- `player.form.view`
- `player.file.view`
- `player.file.manage`

MVP-Zuweisung:

- Admin: alle Rechte
- Trainer: alle Rechte fuer eigene Teams
- Co-Trainer: alle Rechte fuer eigene Teams
- Spieler: keine Rechte

Wichtig:

- Ein Spieler darf seine normale Profilseite sehen und bearbeiten, aber nicht die interne Spielerakte.
- Die Spielerakte enthaelt potenziell sensible Trainerinformationen.
- Spaeter kann es freigegebene Zielvereinbarungen geben, die Spieler sehen duerfen. Das waere ein eigenes Sichtbarkeitskonzept.

## Datenmodell-Vorschlag

### PlayerAttributeDefinition

Beschreibt ein bewertbares Attribut.

Felder:

- `id`
- `clubId`
- `key`
- `name`
- `category`
- `positionGroup`
- `description`
- `sortOrder`
- `isSystemDefault`
- `createdAt`
- `updatedAt`

Kategorien:

- `TECHNICAL`
- `TACTICAL`
- `PHYSICAL`
- `MENTAL`
- `GOALKEEPER`
- `POSITION_SPECIFIC`

Positionsgruppen:

- `ALL`
- `GOALKEEPER`
- `DEFENDER`
- `FULLBACK`
- `MIDFIELDER`
- `WINGER`
- `FORWARD`

Hinweise:

- System-Defaults koennen initial geseedet werden.
- Clubs koennen spaeter eigene Attribute ergaenzen oder ausblenden.

### PlayerAttributeSnapshot

Ein Bewertungsstand fuer einen Spieler.

Felder:

- `id`
- `playerProfileId`
- `teamId`
- `season`
- `title`
- `notes`
- `ratedAt`
- `createdByUserId`
- `createdAt`
- `updatedAt`

Beispiele:

- Saisonstart 2026/27
- Wintercheck
- Saisonabschluss

### PlayerAttributeRating

Ein einzelner Attributwert innerhalb eines Bewertungsstands.

Felder:

- `id`
- `snapshotId`
- `attributeDefinitionId`
- `value`
- `note`
- `createdAt`
- `updatedAt`

Regeln:

- `value` muss zwischen 1 und 20 liegen.
- Kombination aus `snapshotId` und `attributeDefinitionId` sollte eindeutig sein.

### PlayerFormSnapshot

Speichert oder cached eine Formeinschaetzung.

Felder:

- `id`
- `playerProfileId`
- `teamId`
- `value`
- `trend`
- `calculatedFrom`
- `notes`
- `calculatedAt`
- `createdAt`
- `updatedAt`

Regeln:

- `value` liegt zwischen 1.0 und 10.0.
- `trend` kann `UP`, `STABLE` oder `DOWN` sein.
- Im MVP kann Form auch on the fly aus Spielbewertungen berechnet werden. Ein eigenes Modell ist nuetzlich, falls spaeter manuelle Anpassungen oder historische Form-Snapshots benoetigt werden.

### PlayerTrainingPerformance

Speichert die Trainingsbewertung eines Spielers fuer eine konkrete Trainingseinheit.

Felder:

- `id`
- `calendarEventId`
- `playerProfileId`
- `rating`
- `note`
- `createdByUserId`
- `createdAt`
- `updatedAt`

Regeln:

- `calendarEventId` muss auf einen Termin vom Typ `TRAINING` zeigen.
- `rating` liegt zwischen 1.0 und 10.0.
- Kommazahlen sind erlaubt.
- Kombination aus `calendarEventId` und `playerProfileId` sollte eindeutig sein.

Hinweise:

- Diese Bewertung ist getrennt von der Spielbewertung.
- Sie kann spaeter fuer Trainingsform, Entwicklung und Trainerfeedback genutzt werden.

### PlayerFileEntry

Ein Eintrag in der internen Spielerakte.

Felder:

- `id`
- `playerProfileId`
- `teamId`
- `type`
- `title`
- `body`
- `occurredAt`
- `followUpAt`
- `season`
- `createdByUserId`
- `updatedByUserId`
- `createdAt`
- `updatedAt`

Typen:

- `PLAYER_TALK`
- `GOAL_AGREEMENT`
- `FEEDBACK`
- `TRAINING_OBSERVATION`
- `MATCH_OBSERVATION`
- `DISCIPLINE`
- `LOAD_INJURY`
- `OTHER`

Hinweise:

- Diese Eintraege sind Coaching-Staff-exklusiv.
- Loeschen sollte spaeter eventuell nur Admins oder Erstellern erlaubt sein.
- Ein Audit-Log kann spaeter sinnvoll sein.

### PlayerGoal

Optionales Modell fuer strukturierte Ziele.

Felder:

- `id`
- `playerProfileId`
- `teamId`
- `title`
- `description`
- `status`
- `targetDate`
- `createdByUserId`
- `createdAt`
- `updatedAt`

Statuswerte:

- `OPEN`
- `IN_PROGRESS`
- `ACHIEVED`
- `PAUSED`
- `CANCELLED`

Hinweis:

- Fuer den ersten Schnitt koennen Ziele auch als `PlayerFileEntry` vom Typ `GOAL_AGREEMENT` gespeichert werden.
- Ein eigenes Zielmodell lohnt sich, wenn Ziele aktiv verfolgt, gefiltert und ausgewertet werden sollen.

## UI- und Routen-Vorschlag

### Erweiterung Spielerprofil

Route:

- `/kader/[playerId]`

Neue Tabs oder Bereiche:

- Uebersicht
- Stammdaten
- Entwicklung
- Form
- Spielerakte

### Neue Detailbereiche

Moegliche Routen:

- `/kader/[playerId]/entwicklung`
- `/kader/[playerId]/entwicklung/new`
- `/kader/[playerId]/akte`
- `/kader/[playerId]/akte/new`
- `/kader/[playerId]/form`

Alternative:

- alles zunaechst auf der bestehenden Spieler-Detailseite als Tabs bauen

Empfehlung fuer MVP:

- bestehende Spieler-Detailseite erweitern
- keine zu tiefe Navigation am Anfang
- spaeter bei wachsender Komplexitaet in Unterseiten aufteilen

## MVP-Umfang fuer erste Umsetzung

### Muss

- Spielerakte pro Spieler
- Akteneintraege erstellen und anzeigen
- Akteneintraege nur fuer Trainer, Co-Trainer und Admin
- Faehigkeitenprofil mit Attributen 1 bis 20
- erster Bewertungsstand pro Spieler
- aktuelle Form aus Spielbewertungen anzeigen

### Sollte

- Entwicklung gegenueber letzter Bewertung anzeigen
- Filter nach Akteneintrag-Typ
- Wiedervorlage-Datum fuer Spielerakte
- Positionsspezifische Attribute fuer Torhueter und Feldspieler

### Spaeter

- eigene Attribute pro Verein
- grafische Entwicklungskurven
- Zieltracking mit Status
- Spielerfreigabe fuer ausgewaehlte Ziele
- automatische Formberechnung mit Trainingsbeteiligung
- Export oder Saisonbericht pro Spieler

## Erste Umsetzungsreihenfolge

### Schritt 1: Datenmodell erweitern

- Enums fuer Attributkategorien, Positionsgruppen, Akteneintrag-Typen und Formtrend anlegen
- Modelle fuer Attributdefinitionen, Bewertungs-Snapshots, Ratings und Spielerakte ergaenzen
- Migration erstellen
- Default-Attribute seeden

### Schritt 2: Spielerakte

- Akteneintraege pro Spieler anzeigen
- neuen Eintrag erstellen
- Typ, Titel, Datum, Inhalt und Wiedervorlage speichern
- serverseitige Berechtigungspruefung

### Schritt 3: Faehigkeitenprofil

- Default-Attribute je Spieler anzeigen
- Bewertungsstand erstellen
- Werte 1 bis 20 validieren
- aktuelle Werte in der Spieleransicht anzeigen

### Schritt 4: Entwicklung

- letzten und vorletzten Bewertungsstand vergleichen
- Trends anzeigen
- einfache Tabellenansicht oder kompakte Balkenanzeige

### Schritt 5: Trainingsbewertung

- Trainingsbewertung pro Spieler und Training erfassen
- Bewertung 1.0 bis 10.0 validieren
- Trainingsleistung getrennt von Spielleistung anzeigen

### Schritt 6: Form

- letzte 5 Spielbewertungen auswerten
- letzte 5 Trainingsbewertungen separat auswerten
- Durchschnitt mit einer Nachkommastelle anzeigen
- Trend aus aktuellem und vorherigem Zeitraum berechnen

## Offene Entscheidungen

- Sollen Attribute pro Verein konfigurierbar sein oder zunaechst reine Systemwerte bleiben?
- Soll ein Trainer jedes Attribut bewerten muessen oder nur ausgewaehlte?
- Wie stark sollen positionsspezifische Attribute in der UI hervorgehoben werden?
- Soll Form rein automatisch berechnet werden oder darf der Trainer sie manuell ueberschreiben?
- Wie stark sollen Trainingsbewertungen gegenueber Spielbewertungen in eine Gesamtform einfliessen?
- Brauchen Spielerakteneintraege spaeter Dateianhaenge?
- Soll es Erinnerungen fuer Wiedervorlagen geben?

## Empfehlung

Fuer den naechsten technischen Schnitt sollte zuerst die Spielerakte umgesetzt werden. Sie bringt sofort praktischen Mehrwert und ist die Grundlage fuer Gespraeche, Zielvereinbarungen und Trainernotizen.

Danach sollte das Faehigkeitenprofil folgen. Die 1-bis-20-Skala und positionsspezifische Attribute koennen direkt im Datenmodell vorbereitet werden. Die Formanzeige kann anschliessend auf den bereits vorhandenen Spielbewertungen aufbauen.
