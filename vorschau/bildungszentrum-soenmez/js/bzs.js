/* ══════════════════════════════════════════════════════════════════════
   BZS — gemeinsame Logik aller Entwürfe für das Bildungszentrum Sönmez

   Was hier liegt, gilt für jeden Entwurf gleichzeitig:
   · Termine (aus dem Rhythmus berechnet, nie eingetippt)
   · Sprachen Deutsch / Türkisch / Englisch
   · Fristen-Rechner
   · Farbwelt-Umschalter (Rot / Blau / Sand)
   · Kopfleiste, Anfrageformular

   ÄNDERN muss man hier nur etwas, wenn sich der Kursrhythmus ändert
   (Wochentag, Uhrzeit), ein Termin ausfällt (Datum in "ausfall") oder
   ein Text in einer Sprache korrigiert wird. Preise und Termine stehen
   nur EINMAL — im HTML bzw. hier — und gelten für alle Sprachen.

   ⚠ Türkisch und Englisch sind noch nicht von Muttersprachlern
   gegengelesen. Vor dem Livegang von Sönmez' Dozenten prüfen lassen.
   ══════════════════════════════════════════════════════════════════════ */
window.BZS = (function () {
  "use strict";
  var docEl = document.documentElement;

  var DATEN = {
    whatsapp: "491739324879",
    sprachen: ["de", "tr", "en"],

    terminplan: {
      wochentag: 6,                                   /* 0 = Sonntag … 6 = Samstag */
      beginn: "08:00",
      ende:   "16:00",
      anker:  { datum: "2026-07-18", modul: 1 },      /* an diesem Samstag lief Modul 1 */
      anzeigen: 5,                                    /* wie viele Termine die Seite zeigt */
      ausfall: [                                      /* Tage ohne Kurs, Format JJJJ-MM-TT */
        "2026-10-03",  /* Tag der Deutschen Einheit — ANNAHME, am 26.09.2026 mit Herrn Sönmez bestätigen */
        "2026-12-26"   /* Zweiter Weihnachtstag — ANNAHME, ebenfalls bestätigen */
      ]
    },

    module: [
      { nr: 1,
        titel: { de: "Eco Training & Assistenzsysteme", tr: "Eko sürüş ve sürücü destek sistemleri", en: "Eco-training & driver assistance systems" },
        was:   { de: "Kraftstoff sparen, Assistenzsysteme sicher nutzen", tr: "Yakıt tasarrufu, sürücü destek sistemlerini güvenle kullanma", en: "Save fuel, use driver assistance systems safely" } },
      { nr: 2,
        titel: { de: "Sozialvorschriften & Tachograf", tr: "Sürüş ve dinlenme süreleri, takograf", en: "Drivers' hours & tachograph" },
        was:   { de: "Lenk- und Ruhezeiten, Kontrollen sicher bestehen", tr: "Sürüş ve dinlenme süreleri, denetimleri sorunsuz geçme", en: "Driving and rest times, pass roadside checks with confidence" } },
      { nr: 3,
        titel: { de: "Gefahrenwahrnehmung", tr: "Tehlike algısı", en: "Hazard perception" },
        was:   { de: "Kritische Situationen früher erkennen", tr: "Riskli durumları erken fark etme", en: "Recognise critical situations earlier" } },
      { nr: 4,
        titel: { de: "Schadenprävention", tr: "Hasar önleme", en: "Damage prevention" },
        was:   { de: "Unfälle und teure Schäden vermeiden", tr: "Kaza ve pahalı hasarları önleme", en: "Avoid accidents and costly damage" } },
      { nr: 5,
        titel: { de: "Ladungssicherung", tr: "Yük emniyeti", en: "Load securing" },
        was:   { de: "Sicher zurren, Bußgelder und Haftung vermeiden", tr: "Güvenli yükleme, ceza ve sorumluluktan kaçınma", en: "Secure loads properly, avoid fines and liability" } }
    ],

    wochentage: {
      de: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
      tr: ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"],
      en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    },
    uhr:    { de: " Uhr", tr: "", en: "" },
    locale: { de: "de-DE", tr: "tr-TR", en: "en-GB" },
    knopf:  { de: "Platz anfragen", tr: "Yer ayırtın", en: "Request a place" },

    /* WhatsApp-Vorlage je Sprache; {nr} {titel} {datum} werden eingesetzt */
    anfrage: {
      de: "Guten Tag, ich möchte mich für Modul {nr} ({titel}) am {datum} anmelden.",
      tr: "Merhaba, {datum} tarihli {nr}. modül ({titel}) için yer ayırtmak istiyorum.",
      en: "Hello, I would like to register for module {nr} ({titel}) on {datum}."
    },

    rechner: {
      de: {
        abgelaufen: "Abgelaufen.", knapp: "Es wird knapp.",
        bald: "Zeit genug, aber nicht mehr viel.", ruhig: "Alles im Rahmen.",
        tage: "Tage", ueberfaellig: "Tage überfällig",
        textAb: "Ohne gültigen Nachweis darf gewerblich nicht gefahren werden. Die fünf Module lassen sich jederzeit nachholen — melden Sie sich, wir setzen Sie in die nächste Gruppe.",
        textKnapp: "Fünf Module brauchen fünf Termine. Mit Puffer für Urlaub und Krankheit sollten Sie jetzt anfangen.",
        textBald: "Der beste Zeitpunkt zum Anmelden ist etwa ein halbes Jahr vorher. Dann suchen Sie sich die Termine aus, statt zu nehmen, was übrig ist.",
        textRuhig: "Notieren Sie sich {monat} — dann ist der richtige Moment, die Termine zu planen."
      },
      tr: {
        abgelaufen: "Süresi doldu.", knapp: "Zaman daralıyor.",
        bald: "Zaman var, ama çok değil.", ruhig: "Her şey yolunda.",
        tage: "gün", ueberfaellig: "gün gecikmiş",
        textAb: "Geçerli Kod 95 belgesi olmadan ticari araç kullanılamaz. Beş modül her zaman tamamlanabilir – bize ulaşın, sizi bir sonraki gruba yazalım.",
        textKnapp: "Beş modül, beş ders günü demek. İzin ve hastalık payı da düşünülürse şimdi başlamalısınız.",
        textBald: "Kayıt için en uygun zaman yaklaşık altı ay öncesidir. O zaman tarihleri siz seçersiniz, kalanı almak zorunda kalmazsınız.",
        textRuhig: "{monat} için bir not alın – tarihleri planlamanın doğru zamanı odur."
      },
      en: {
        abgelaufen: "Expired.", knapp: "Time is getting tight.",
        bald: "Enough time, but not much.", ruhig: "You are fine for now.",
        tage: "days", ueberfaellig: "days overdue",
        textAb: "Without a valid Code 95 you may not drive professionally. The five modules can be completed at any time – get in touch and we will put you in the next group.",
        textKnapp: "Five modules need five course days. Allowing for holidays and illness, you should start now.",
        textBald: "The best time to sign up is about six months before the deadline. Then you choose your dates instead of taking what is left.",
        textRuhig: "Make a note of {monat} – that is the right moment to plan your dates."
      }
    }
  };

  /* ─── Hilfen ─────────────────────────────────────────────────────── */
  function sprache() {
    var l = docEl.lang;
    return DATEN.sprachen.indexOf(l) > -1 ? l : "de";
  }
  function text(obj) { var l = sprache(); return obj[l] != null ? obj[l] : obj.de; }
  function iso(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function datumText(d) {
    return String(d.getDate()).padStart(2, "0") + "." + String(d.getMonth() + 1).padStart(2, "0") + "." + d.getFullYear();
  }

  /* ─── Termine: berechnen ─────────────────────────────────────────── */
  /* terminListe(anzahl, ab) — anzahl: wie viele Termine (Standard: terminplan.anzeigen),
     ab: frühestes Datum (Standard: heute). Ein Fuhrpark-Planer ruft z. B. terminListe(30). */
  function terminListe(anzahl, ab) {
    var P = DATEN.terminplan;
    var anker = new Date(P.anker.datum + "T00:00:00");
    var heute = ab ? new Date(ab) : new Date(); heute.setHours(0, 0, 0, 0);
    var d = new Date(heute);
    while (d.getDay() !== P.wochentag) d.setDate(d.getDate() + 1);

    var raus = [], schutz = 0, n = DATEN.module.length, ziel = anzahl || P.anzeigen;
    while (raus.length < ziel && schutz++ < 800) {
      if (P.ausfall.indexOf(iso(d)) === -1) {
        var wochen = Math.round((d - anker) / 604800000);
        var i = (((wochen + P.anker.modul - 1) % n) + n) % n;
        raus.push({ datum: new Date(d), modul: DATEN.module[i] });
      }
      d.setDate(d.getDate() + 7);
    }
    return raus;
  }

  /* ─── Termine: zeichnen ──────────────────────────────────────────────
     render(t) bekommt einen fertig aufgelösten Termin und gibt HTML
     zurück (ein Element pro Termin). Jeder Entwurf bringt sein eigenes
     Aussehen mit; die Daten sind für alle gleich.                       */
  var renderer = null;
  function terminZeichnen(render) {
    if (render) renderer = render;
    var ziel = document.getElementById("terminliste");
    if (!ziel || !renderer) return;
    var P = DATEN.terminplan, l = sprache();
    ziel.innerHTML = "";
    terminListe().forEach(function (t) {
      var datum = datumText(t.datum);
      var titel = text(t.modul.titel);
      var frage = text(DATEN.anfrage).replace("{nr}", t.modul.nr).replace("{titel}", titel).replace("{datum}", datum);
      var fertig = {
        nr: t.modul.nr,
        titel: titel,
        was: text(t.modul.was),
        wtag: DATEN.wochentage[l][t.datum.getDay()],
        datum: datum,
        iso: iso(t.datum),
        zeit: P.beginn + " – " + P.ende + DATEN.uhr[l],
        knopf: DATEN.knopf[l],
        waLink: "https://wa.me/" + DATEN.whatsapp + "?text=" + encodeURIComponent(frage)
      };
      ziel.insertAdjacentHTML("beforeend", renderer(fertig));
    });
  }

  /* ─── Fristen-Rechner ──────────────────────────────────────────────
     Rechnet nur Tage bis zum eingegebenen Datum. Bewusst keine
     Rechtsauskunft: verbindlich ist der Nachweis des Fahrers.          */
  var rechnerNeu = null;
  function rechner() {
    var feld = document.getElementById("ablauf95");
    if (!feld) return;
    var kasten = document.getElementById("ergebnis95");
    var lage = document.getElementById("lage95");
    var tageEl = document.getElementById("tage95");
    var rat = document.getElementById("rat95");

    function rechne() {
      if (!feld.value) { kasten.classList.remove("an"); return; }
      var ziel = new Date(feld.value + "T00:00:00");
      var heute = new Date(); heute.setHours(0, 0, 0, 0);
      var tage = Math.round((ziel - heute) / 86400000);
      var W = DATEN.rechner[sprache()], ort = DATEN.locale[sprache()];
      var art, kopf, zahl, txt;
      if (tage < 0) {
        art = "re-eng"; kopf = W.abgelaufen; zahl = Math.abs(tage).toLocaleString(ort) + " " + W.ueberfaellig; txt = W.textAb;
      } else if (tage <= 180) {
        art = "re-eng"; kopf = W.knapp; zahl = tage.toLocaleString(ort) + " " + W.tage; txt = W.textKnapp;
      } else if (tage <= 365) {
        art = "re-eng"; kopf = W.bald; zahl = tage.toLocaleString(ort) + " " + W.tage; txt = W.textBald;
      } else {
        art = "re-ok"; kopf = W.ruhig; zahl = tage.toLocaleString(ort) + " " + W.tage;
        var start = new Date(ziel.getTime() - 365 * 86400000);
        txt = W.textRuhig.replace("{monat}", start.toLocaleDateString(ort, { month: "long", year: "numeric" }));
      }
      kasten.className = "rechner-ergebnis an " + art;
      lage.textContent = kopf;
      tageEl.textContent = zahl;
      rat.textContent = txt;
    }
    feld.addEventListener("input", rechne);
    feld.addEventListener("change", rechne);
    rechnerNeu = rechne;
    rechne();
  }

  /* ─── Sprachen ─────────────────────────────────────────────────────
     Jede Sprache ist eine eigene Datei (./ · tr/ · en/), gebaut aus der
     deutschen Quelle mit `node _bauen.mjs` — so liest Google jede Fassung.
     Der Umschalter besteht aus Links; hier wird nur der aktive markiert
     und ein alter ?lang=-Link auf die richtige Fassung umgeleitet.       */
  function sprachen() {
    var alt = (location.search.match(/[?&]lang=(tr|en)/) || [])[1];
    if (alt && sprache() !== alt) {
      try { location.replace(alt + "/" + location.hash); } catch (e) {}
      return;
    }
    document.querySelectorAll(".sprachwahl [data-sprache]").forEach(function (a) {
      var aktiv = a.dataset.sprache === sprache();
      if (aktiv) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
  }

  /* ─── Farbwelt (Rot / Blau / Sand) ────────────────────────────────── */
  function farbwelt() {
    var farben = ["rot", "blau", "sand"];
    var knoepfe = document.querySelectorAll(".farbwahl button");
    function setzen(f) {
      farben.forEach(function (x) { docEl.classList.remove("farbe-" + x); });
      docEl.classList.add("farbe-" + f);
      knoepfe.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.farbe === f)); });
      try { localStorage.setItem("bzs-farbe", f); } catch (e) {}
    }
    knoepfe.forEach(function (b) { b.addEventListener("click", function () { setzen(b.dataset.farbe); }); });
    try {
      var gemerkt = localStorage.getItem("bzs-farbe");
      if (farben.indexOf(gemerkt) > -1) setzen(gemerkt);
    } catch (e) {}
  }

  /* ─── Kopfleiste: echte Höhe messen, beim Scrollen absetzen ───────── */
  function kopf() {
    var k = document.getElementById("kopf");
    var oben = document.querySelector(".oben");
    if (!oben) return;
    var messen = function () { docEl.style.setProperty("--kopf-hoehe", oben.offsetHeight + "px"); };
    messen();
    window.addEventListener("resize", messen, { passive: true });
    if (window.ResizeObserver) new ResizeObserver(messen).observe(oben);
    if (k) {
      var setzen = function () { k.classList.toggle("fest", window.scrollY > 40); };
      window.addEventListener("scroll", setzen, { passive: true });
      setzen();
    }
  }

  /* ─── Anfrageformular: bis zur Anbindung ehrliche Rückmeldung ─────── */
  function formular() {
    var f = document.getElementById("anfrage");
    if (!f) return;
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var b = f.querySelector("button[type=submit], button");
      if (!b) return;
      b.textContent = { de: "Im Entwurf noch ohne Versand", tr: "Taslakta henüz gönderim yok", en: "Not yet connected in this draft" }[sprache()];
      b.disabled = true;
    });
  }

  /* ─── Alles in der richtigen Reihenfolge starten ───────────────────
     Termine und Rechner sind Inhalt und laufen VOR jeder Bewegung —
     unabhängig davon, ob GSAP geladen ist oder Bewegung reduziert wird. */
  function start(opts) {
    opts = opts || {};
    farbwelt();
    kopf();
    formular();
    if (opts.termin) terminZeichnen(opts.termin);
    rechner();
    sprachen();
  }

  return {
    DATEN: DATEN, start: start, sprache: sprache, text: text,
    terminListe: terminListe, terminZeichnen: terminZeichnen, datumText: datumText
  };
})();
