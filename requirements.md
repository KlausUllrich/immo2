Ich möchte mit einem Partner Immobilien kaufen und verkaufen.
Er hat dabei ein Generalsanierungsfirma.
Es soll eine neue Firma gegründet werden, welche die Sanierungsfirma mit dem Abriss und Bau beauftragt.
Die genaue Kosten- und Gewinnverteilung ist noch nicht final bestimmt und soll einstellbar sein (Annahme: 50/50)


Ich brauche einen online Rechner für Immobilienkalkulationen.
Ich will kein PHP verwenden.

Die Seite ist schon fast fertig, aber ein paar Fehler müssen noch behoben werden:



**Tab Finanzierung**
- Die Berechnung des Finanzierungsbedarfs ist falsch. Die Beleihung zählt nicht als Eigenkapital. Es muss auch dafür ein Kredit mit Kreditzins aufgenommen werden. Allerdings verbessert es wahrscheinlich den Zinsatz. Hier im Tool ist es ein rein informativer Wert, der in dem grafischen Balken angezeigt wird. Der Finanzierungsbedarf ist also die Summe aus Zwischestand: Bestand + Neubau - Eigenkapital. 
Aktuell ist die Berechnung des Finanzierungsbedarfs falsch. Bitte mache eine genaue Analyse wie es sein sollte, wie es ist und stelle die Ergebnisse dem Nutzer vor. Bespreche genau, wie es umzusetzen ist. Gib ein Beispiel. 
- Die Modi "Gemeinsam" und "Klaus/Kevin" sind zu unterschiedlich. Bitte nimm den Modus "Klaus/Kevin" als Vorlage. Im Modus Gemeinsam sollte dann folgende Änderung sein: 1) Keine Aufteilung der Kosten je Partner und auch kein Slider. 2) Nur ein Block für Eigenkapital, Beleihung, Zinsatz und Zeit bis Verkauf 3) nur eine Balkengrafik für die Kapitalquote.
- Achtung: Der Modus "Klaus/Kevin" ist aktuell sehr fehlerhaft. Der Modus "Gemeinsam" funktioniert besser und kann noch als Referenz dienen.
- Im Modus "Gemeinsam" ist der grafische Balken für die Kapitalquote initial korrekt. Wechselt man allerdings auf den Modus "Klaus/Kevin" und zurück ist er nicht mehr korrekt. Er sollte die drei Werte Eigenkapital, Beleihung und Finanzierungsbedarf nebeneinander darstellen.
- Im Modus "Klaus/Kevin" muss die Kostenaufteilung in Prozent nicht manuel eingebbar sein. Der Slider reicht. Allerdings hat der aktuell keine Funktion.
- Im Modus "Klaus/Kevin" ist in den jeweiligen Blocks (Klaus und Kevin) der Kreditbedarf falsch berechnet. Dieser sind das jeweilige Eigenkapital minus die jeweils anteiligen Kosten je Partner, aber natürlich nie unter Null.
- Im Modus "Klaus/Kevin" werden die Balken nicht richtig dargestellt.  Es wird "NaN%" für alle Teil-Balken angezeigt.
- Die Zinskosten werden nicht richtig berechnet. Es ist das Fremdkapital mal Zinssatz über die Zeit in Monaten bis Verkauf durch 12 (Monate pro Jahr). Im "Gemeinsam" Modus ist die Berechnung korrekt.


**Tab Verkauf**
- In dem Block Verkaufskalkulation werden die "Vertriebskosten  (X%)" angezeigt. Allerdings wird nicht der korrekte Vertriebskosten-Prozentwert vom Eingabefeld von oben verwendet.
- Im Modus "Klaus/Kevin" in der "Erlösaufteilung" wird unten noch die jeweiligen Summen je Partner angezeigt, aber die Werte sind falsch und der Slider ist ohne Funktion. Bitte erhalte den Haken für "Erlösaufteilung folgt Kostenaufteilung" (welches dann den Prozentwert aus dem Tab Finanzierung verwendet), aber gleiche ansonsten diesen Block optisch den zwei Blöcken aus "Finanzierung" im Modus "Klaus/Kevin" für die Zwischensumme (nun aber "Verkaufserlös") mit den berechneten Summen je gesetzem Prozentwert an. Wird der Haken für "Erlösaufteilung folgt Kostenaufteilung" gesetzt, dann soll auch der Slider wie im Tab Finanzierung ("Kostenaufteilung zwischen Partnern" nur jetzt eben "Erlösaufteilung") verwendet werden.
- Im Modus "Klaus/Kevin" muss die Verkaufskalkulation für jeden Partner nicht untereinander, sondern nebeneinander angezeigt werden (2 Spalten). Aktuell stimmen die angezeigten Zahlen nicht. 



**Tab Zusammenfassung**

- Im Modus "Klaus/Kevin" soll der Block nach der Gesamtanzeige für Gesamtinvestion, Projektgewinn und Rendite entfernt werden (es ist ein blauer linker Teil und eine orangener rechter Teil, da er mit dem folgenden Block doppelt ist. Der Block darunter mit einer tabelarischen Listung von Eigenkaptial, Beleihung, Kreditbedarf, Gewinn und Rendite je Partner muss aber erhalten bleiben.



**Druckansicht**
- In der Druckansicht sollten im Modul "Klaus/Kevin" die Partner Aufteilung auf einer neuen Seite angezeigt werden.




**Import/Export**
- beim Laden einer Datei erhalte ich folgenden Fehler: Fehler beim Laden der Datei: financingCostsA is not defined. Ich gehe davon aus, dass der Fehler eigentlich beim Export passiert.
- die detaillierten Kosten für den Neubau werden nicht exportiert oder importiert.



**Bearbeitung:**
- bitte erstelle ein Hive Mind mit mindestens 12 Agenten.
- Sei sehr gründlich und präzise. Überprüfe deine Ergebnisse durch einen zweiten Agenten, der nochmals den Code analysiert.
- erstelle ein Repository mit dieser Remote adresse "git@github.com:KlausUllrich/immo.git"
- verwende Git Issues um alle erkannten Fehler zu verwalten. Verwende Git Issues beim bearbeiten und lösen der Fehler.