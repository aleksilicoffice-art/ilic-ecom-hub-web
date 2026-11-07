/* ══════════════════════════════════════════════════════════════════════
   BZS_KERN — Rechenkern der Termine (reine Logik, kein DOM)

   Dieselbe Datei für Browser, Build, Werkzeug und Tests:
   · Browser:  <script src="js/termine-kern.js"> → window.BZS_KERN
   · Node:     vm.runInNewContext(quelltext, {}) → globalThis.BZS_KERN

   Die Daten stehen in js/termine.js (window.BZS_TERMINE). Jedes Datum
   ist ein ISO-String „JJJJ-MM-TT". Gerechnet wird nur über
   Date.UTC(j, m-1, t, 12) — Mittag UTC, damit weder die Sommerzeit noch
   die Zeitzone des Geräts einen Tag verschiebt. „Heute" ist immer der
   Berliner Kalendertag.
   ══════════════════════════════════════════════════════════════════════ */
(function (ziel) {
  "use strict";

  var TAG = 86400000;
  var MODULE = 5;                                   /* Weiterbildung 95: fünf Module */
  var ARTEN = ["modul", "woche", "kurs"];
  var REGELN = ["nachholen", "weiterzaehlen"];
  var RANG = { ausfall: 0, modul: 1, woche: 2, kurs: 3 };
  var GRENZE = 5300;                                /* Schutz: höchstens ~100 Jahre Rhythmus */

  /* ─── Datum ──────────────────────────────────────────────────────── */
  function zwei(n) { return (n < 10 ? "0" : "") + n; }
  function vier(n) { return ("000" + n).slice(-4); }
  function cmp(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
  function liste(x) { return Array.isArray(x) ? x : []; }

  function isoAus(t) {                              /* ms → „JJJJ-MM-TT" (UTC-Felder) */
    var d = new Date(t);
    return vier(d.getUTCFullYear()) + "-" + zwei(d.getUTCMonth() + 1) + "-" + zwei(d.getUTCDate());
  }
  function msAus(iso) {                             /* „JJJJ-MM-TT" → ms, Mittag UTC */
    return Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10), 12);
  }
  /* Format UND Kalender-Gegenprobe: 2026-02-30 ist ungültig */
  function gueltig(iso) {
    return typeof iso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(iso) && isoAus(msAus(iso)) === iso;
  }
  function pruefe(iso, wo) {
    if (!gueltig(iso)) throw new TypeError("BZS_KERN." + wo + ": ungültiges Datum " + JSON.stringify(iso));
    return iso;
  }
  function plusTage(iso, n) { return isoAus(msAus(pruefe(iso, "plusTage")) + Math.round(n) * TAG); }
  function wochentag(iso) { return new Date(msAus(pruefe(iso, "wochentag"))).getUTCDay(); }   /* 0 = So … 6 = Sa */
  function tageZwischen(a, b) { return Math.round((msAus(pruefe(b, "tageZwischen")) - msAus(pruefe(a, "tageZwischen"))) / TAG); }
  function zeitGueltig(z) { return typeof z === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(z); }

  /* ─── Berliner Zeit ──────────────────────────────────────────────────
     Erst Intl mit Zeitzone (folgt den tz-Daten des Geräts). Fehlt das,
     greift die EU-Regel (seit 1996) — bewusst nicht die Ortszeit des
     Geräts, sonst sähe ein Besucher in Istanbul um Mitternacht den
     falschen Tag.                                                       */
  var format;                                       /* undefined = noch nicht versucht, null = nicht verfügbar */
  function intlFormat() {
    if (format !== undefined) return format;
    format = null;
    try {
      var f = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin", hourCycle: "h23",
        year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
      if (typeof f.formatToParts === "function") format = f;
    } catch (e) { format = null; }
    return format;
  }
  function letzterSonntag(j, monat) {               /* monat 1–12 → Tag im Monat */
    var d = new Date(Date.UTC(j, monat, 0, 12));    /* letzter Tag des Monats */
    return d.getUTCDate() - d.getUTCDay();
  }
  function sommerzeit(t) {                          /* letzter So im März 01:00 UTC bis letzter So im Oktober 01:00 UTC */
    var j = new Date(t).getUTCFullYear();
    return t >= Date.UTC(j, 2, letzterSonntag(j, 3), 1) && t < Date.UTC(j, 9, letzterSonntag(j, 10), 1);
  }
  function berlinTeile(t) {                         /* ms → { iso, zeit: „HH:MM:SS" } in Berlin */
    var f = intlFormat();
    if (f) {
      try {
        var p = {};
        f.formatToParts(new Date(t)).forEach(function (x) { p[x.type] = x.value; });
        var iso = p.year + "-" + p.month + "-" + p.day;
        var zeit = (p.hour === "24" ? "00" : p.hour) + ":" + p.minute + ":" + p.second;
        if (gueltig(iso) && /^\d\d:\d\d:\d\d$/.test(zeit)) return { iso: iso, zeit: zeit };
      } catch (e) { /* weiter mit der Regel */ }
    }
    var d = new Date(t + (sommerzeit(t) ? 2 : 1) * 3600000);
    return { iso: isoAus(d.getTime()), zeit: zwei(d.getUTCHours()) + ":" + zwei(d.getUTCMinutes()) + ":" + zwei(d.getUTCSeconds()) };
  }
  function zeitpunkt(jetzt) {                       /* Date | ms | nichts → ms */
    if (jetzt == null) return Date.now();
    if (typeof jetzt === "number" && isFinite(jetzt)) return jetzt;
    if (jetzt && typeof jetzt.getTime === "function" && isFinite(jetzt.getTime())) return jetzt.getTime();
    throw new TypeError("BZS_KERN: ungültiger Zeitpunkt " + String(jetzt));
  }
  function offsetText(min) {
    var s = min < 0 ? "-" : "+"; min = Math.abs(min);
    return s + zwei(Math.floor(min / 60)) + ":" + zwei(min % 60);
  }

  /* Berliner Kalendertag zum Zeitpunkt jetzt (Standard: jetzt) */
  function heuteBerlin(jetzt) { return berlinTeile(zeitpunkt(jetzt)).iso; }

  /* „2026-11-07T14:05:09+01:00" — für das Feld „stand" und das Protokoll */
  function zeitstempelBerlin(jetzt) {
    var t = zeitpunkt(jetzt); t -= ((t % 1000) + 1000) % 1000;
    var b = berlinTeile(t);
    var lokal = Date.UTC(+b.iso.slice(0, 4), +b.iso.slice(5, 7) - 1, +b.iso.slice(8, 10),
      +b.zeit.slice(0, 2), +b.zeit.slice(3, 5), +b.zeit.slice(6, 8));
    return b.iso + "T" + b.zeit + offsetText(Math.round((lokal - t) / 60000));
  }

  /* Offset der Berliner Ortszeit an Tag iso um zeit („08:00") → "+01:00" | "+02:00".
     Doppelte Stunde im Oktober: es gilt die erste (Sommerzeit). */
  function berlinOffset(iso, zeit) {
    pruefe(iso, "berlinOffset");
    var m = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(zeit == null ? "00:00" : String(zeit));
    if (!m) throw new TypeError("BZS_KERN.berlinOffset: ungültige Uhrzeit " + JSON.stringify(zeit));
    var soll = m[1] + ":" + m[2] + ":" + (m[3] || "00");
    var lokal = Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10), +m[1], +m[2], +(m[3] || 0));
    for (var o = 2; o >= 1; o--) {
      var b = berlinTeile(lokal - o * 3600000);
      if (b.iso === iso && b.zeit === soll) return offsetText(o * 60);
    }
    return offsetText((sommerzeit(lokal - 3600000) ? 2 : 1) * 60);   /* nicht existierende Stunde im März */
  }

  /* ?heute=JJJJ-MM-TT zum Testen — wirkt NUR auf localhost. ort = location (oder {hostname, search}). */
  function heuteParameter(ort) {
    if (!ort) return null;
    var h = String(ort.hostname || "");
    if (!(h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "::1" || /\.localhost$/.test(h))) return null;
    var m = /[?&]heute=(\d{4}-\d{2}-\d{2})(?:&|$)/.exec(String(ort.search || ""));
    return m && gueltig(m[1]) ? m[1] : null;
  }

  /* ─── Feiertage NRW ──────────────────────────────────────────────── */
  function jahrPruefen(j, wo) {
    j = +j;
    if (!(j % 1 === 0 && j >= 1583 && j <= 9999)) throw new TypeError("BZS_KERN." + wo + ": ungültiges Jahr");
    return j;
  }
  /* Ostersonntag, gregorianisch (Meeus/Jones/Butcher, entspricht Gauß mit Ausnahmen) */
  function ostern(jahr) {
    var j = jahrPruefen(jahr, "ostern");
    var a = j % 19, b = Math.floor(j / 100), c = j % 100, d = Math.floor(b / 4), e = b % 4;
    var f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    var h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    var l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    var x = h + l - 7 * m + 114;
    return vier(j) + "-" + zwei(Math.floor(x / 31)) + "-" + zwei((x % 31) + 1);
  }
  var feiertagCache = {};
  /* Die elf gesetzlichen Feiertage in NRW, nach Datum sortiert: [{datum, name}] */
  function feiertage(jahr) {
    var j = jahrPruefen(jahr, "feiertage");
    if (!feiertagCache[j]) {
      var o = ostern(j), J = vier(j);
      feiertagCache[j] = [
        [J + "-01-01", "Neujahr"], [plusTage(o, -2), "Karfreitag"], [plusTage(o, 1), "Ostermontag"],
        [J + "-05-01", "Tag der Arbeit"], [plusTage(o, 39), "Christi Himmelfahrt"], [plusTage(o, 50), "Pfingstmontag"],
        [plusTage(o, 60), "Fronleichnam"], [J + "-10-03", "Tag der Deutschen Einheit"], [J + "-11-01", "Allerheiligen"],
        [J + "-12-25", "1. Weihnachtstag"], [J + "-12-26", "2. Weihnachtstag"]
      ].map(function (x, i) { return { datum: x[0], name: x[1], i: i }; })
        .sort(function (a, b) { return cmp(a.datum, b.datum) || a.i - b.i; });
    }
    return feiertagCache[j].map(function (x) { return { datum: x.datum, name: x.name }; });
  }
  function feiertag(iso) {                          /* {datum, name} | null */
    if (!gueltig(iso)) return null;
    var l = feiertage(+iso.slice(0, 4));
    for (var i = 0; i < l.length; i++) if (l[i].datum === iso) return l[i];
    return null;
  }
  /* Kein Feiertag, aber oft geschlossen — nur zur Warnung */
  function warntage(jahr) {
    var J = vier(jahrPruefen(jahr, "warntage"));
    return [{ datum: J + "-12-24", name: "Heiligabend" }, { datum: J + "-12-31", name: "Silvester" }];
  }
  function warntag(iso) {
    if (!gueltig(iso)) return null;
    var l = warntage(+iso.slice(0, 4));
    for (var i = 0; i < l.length; i++) if (l[i].datum === iso) return l[i];
    return null;
  }

  /* ─── Rhythmus ───────────────────────────────────────────────────────
     Vom Anker aus Woche für Woche. Ein Ausfall mit „weiterzaehlen" lässt
     sein Modul verfallen (Zähler läuft weiter), mit „nachholen" bekommt
     der nächste Kurstag dieses Modul. Zusatztermine zählen nicht mit.
     Vor dem Anker gibt es keine Rhythmustage. f(datum, modul, ausfall|null)
     wird für jeden Rhythmustag ≥ ab gerufen; false bricht ab.            */
  function regelVon(a, R) {
    var r = a && a.regel != null ? a.regel : R.ausfallRegel;
    return r === "nachholen" ? "nachholen" : "weiterzaehlen";
  }
  function rhythmusLauf(D, ab, bis, f) {
    var R = D && D.rhythmus;
    if (!R || !R.anker || !gueltig(R.anker.datum)) return;
    var aus = {};
    liste(D.ausfall).forEach(function (a) { if (a && gueltig(a.datum) && !aus[a.datum]) aus[a.datum] = a; });
    var start = Math.round(+R.anker.modul) - 1;
    if (!(start >= 0 && start < MODULE)) start = 0;
    var k = 0, s = R.anker.datum;
    for (var i = 0; i < GRENZE; i++, s = plusTage(s, 7)) {
      if (bis && s > bis) return;
      var a = aus[s] || null, modul = (start + k) % MODULE + 1;
      if (!a || regelVon(a, R) === "weiterzaehlen") k++;
      if (s >= ab && f(s, modul, a) === false) return;
    }
  }

  /* ─── Termine ────────────────────────────────────────────────────────
     termine(D, {ab, bis, anzahl, arten, mitAusfall}) → sortierte Einträge
       ab         frühester Beginn (Standard: heute Berlin), einschließlich
       bis        spätester Beginn, einschließlich (optional)
       anzahl     wie viele Einträge (Ausfälle zählen nicht mit);
                  Standard: rhythmus.anzeigen, mit „bis" unbegrenzt
       arten      Teilmenge von ["modul","woche","kurs"] (Standard: alle)
       mitAusfall true = alle Ausfälle mitliefern, "anzeigen" = nur die mit anzeigen:true
     Ein Eintrag: {id, art, kurs, von, bis, module[], beginn, ende, zusatz}
       + bei art "ausfall": regel, status, anzeigen, grund?
       + notiz?, wenn in den Daten vorhanden.                            */
  function termine(D, opts) {
    opts = opts || {};
    if (!D) return [];
    var ab = opts.ab == null ? heuteBerlin() : pruefe(opts.ab, "termine");
    var bis = opts.bis == null ? null : pruefe(opts.bis, "termine");
    var arten = Array.isArray(opts.arten) ? opts.arten : ARTEN;
    var R = D.rhythmus || {};
    var anzahl = opts.anzahl != null ? +opts.anzahl : (bis ? Infinity : (+R.anzeigen || 5));
    if (!(anzahl > 0)) return [];
    var mitAusfall = opts.mitAusfall;
    var kursId = R.kurs || "modul95";
    var hat = function (art) { return arten.indexOf(art) > -1; };
    var drin = function (von) { return von >= ab && (!bis || von <= bis); };
    var alle = [];

    if (hat("modul")) {
      var n = 0;
      rhythmusLauf(D, ab, bis, function (s, modul, a) {
        if (a) {
          if (mitAusfall === true || (mitAusfall === "anzeigen" && a.anzeigen === true)) {
            var e = { id: "a-" + s, art: "ausfall", kurs: kursId, von: s, bis: s, module: [modul],
              beginn: R.beginn || null, ende: R.ende || null, zusatz: false,
              regel: regelVon(a, R), status: a.status || null, anzeigen: a.anzeigen === true };
            if (a.grund) e.grund = a.grund;
            alle.push(e);
          }
          return true;
        }
        alle.push({ id: "r-" + s, art: "modul", kurs: kursId, von: s, bis: s, module: [modul],
          beginn: R.beginn || null, ende: R.ende || null, zusatz: false });
        return ++n < anzahl;
      });
    }

    liste(D.zusatz).forEach(function (z) {
      if (!z) return;
      var e;
      if (z.art === "woche") {
        if (!hat("woche") || !gueltig(z.von) || !drin(z.von)) return;
        e = { id: z.id || "w-" + z.von, art: "woche", kurs: kursId, von: z.von,
          bis: gueltig(z.bis) && z.bis >= z.von ? z.bis : z.von,
          module: liste(z.module).length ? z.module.slice() : [1, 2, 3, 4, 5],
          beginn: z.beginn || R.beginn || null, ende: z.ende || R.ende || null, zusatz: true };
      } else {
        if (!hat("modul") || !gueltig(z.datum) || !drin(z.datum)) return;
        var m = Math.round(+z.modul);
        e = { id: z.id || "z-" + z.datum, art: "modul", kurs: kursId, von: z.datum, bis: z.datum,
          module: m >= 1 && m <= MODULE ? [m] : [],
          beginn: z.beginn || R.beginn || null, ende: z.ende || R.ende || null, zusatz: true };
      }
      if (z.notiz) e.notiz = z.notiz;
      alle.push(e);
    });

    if (hat("kurs")) {
      var K = D.kurse || {};
      liste(D.kursTermine).forEach(function (t) {
        if (!t || !gueltig(t.von) || !drin(t.von)) return;
        var k = K[t.kurs] || {};
        var e = { id: t.id || "k-" + t.kurs + "-" + t.von, art: "kurs", kurs: t.kurs, von: t.von,
          bis: gueltig(t.bis) && t.bis >= t.von ? t.bis : t.von, module: [],
          beginn: t.beginn || k.beginn || null, ende: t.ende || k.ende || null, zusatz: false };   /* keine erfundenen Zeiten */
        if (t.notiz) e.notiz = t.notiz;
        alle.push(e);
      });
    }

    alle.sort(function (a, b) {
      return cmp(a.von, b.von) || RANG[a.art] - RANG[b.art] || cmp(a.bis, b.bis) || cmp(String(a.id), String(b.id));
    });
    var raus = [], gezaehlt = 0;
    for (var i = 0; i < alle.length && gezaehlt < anzahl; i++) {
      raus.push(alle[i]);
      if (alle[i].art !== "ausfall") gezaehlt++;
    }
    return raus;
  }

  /* Erster Eintrag ab opts.ab (ohne Ausfälle) oder null */
  function naechster(D, opts) {
    var o = {}, k;
    for (k in opts || {}) if (Object.prototype.hasOwnProperty.call(opts, k)) o[k] = opts[k];
    o.anzahl = 1; o.mitAusfall = false;
    var t = termine(D, o);
    return t.length ? t[0] : null;
  }

  /* Reguläre Kurstage auf einem Feiertag, die weder Ausfall noch bestätigt
     (stattfinden) sind — daraus macht das Werkzeug Erinnerungen.
     opts: {ab (Standard heute), tage (Standard 450)} → [{datum, name, modul}] */
  function offeneFeiertage(D, opts) {
    opts = opts || {};
    if (!D) return [];
    var ab = opts.ab == null ? heuteBerlin() : pruefe(opts.ab, "offeneFeiertage");
    var bis = plusTage(ab, opts.tage == null ? 450 : +opts.tage);
    var bestaetigt = {};
    liste(D.stattfinden).forEach(function (s) { if (s && gueltig(s.datum)) bestaetigt[s.datum] = true; });
    var raus = [];
    rhythmusLauf(D, ab, bis, function (s, modul, a) {
      var f = !a && !bestaetigt[s] && feiertag(s);
      if (f) raus.push({ datum: s, name: f.name, modul: modul });
      return true;
    });
    return raus;
  }

  /* ─── Hinweise (Banner) ──────────────────────────────────────────────
     Sichtbar von „ankuendigen" (Standard: von) bis „bis", beide einschließlich.
     phase: "angekuendigt" vor „von", sonst "laufend". Laufende zuerst.    */
  function hinweiseAktiv(D, heute) {
    if (!D) return [];
    heute = heute == null ? heuteBerlin() : pruefe(heute, "hinweiseAktiv");
    var raus = [];
    liste(D.hinweise).forEach(function (h) {
      if (!h || !gueltig(h.von) || !gueltig(h.bis) || h.bis < h.von) return;
      var start = gueltig(h.ankuendigen) && h.ankuendigen < h.von ? h.ankuendigen : h.von;
      if (heute < start || heute > h.bis) return;
      var text = {}, k;
      for (k in h.text || {}) if (Object.prototype.hasOwnProperty.call(h.text, k)) text[k] = h.text[k];
      raus.push({ id: h.id || "h-" + h.von, phase: heute < h.von ? "angekuendigt" : "laufend",
        ankuendigen: start, von: h.von, bis: h.bis, text: text });
    });
    raus.sort(function (a, b) {
      return (a.phase === b.phase ? 0 : a.phase === "laufend" ? -1 : 1) || cmp(a.von, b.von) || cmp(a.id, b.id);
    });
    return raus;
  }
  function hinweisAktiv(D, heute) { var l = hinweiseAktiv(D, heute); return l.length ? l[0] : null; }

  /* ─── Datei js/termine.js lesen und schreiben ────────────────────────
     Zwischen /*DATEN*\/ und /*ENDE*\/ steht reines JSON — gelesen ohne eval,
     geschrieben deterministisch (kurze Objekte in einer Zeile).          */
  var A = "/*DATEN*/", E = "/*ENDE*/";
  var KOPF = "/* Termine Bildungszentrum Sönmez — die EINZIGE Quelle für alle Seiten und Sprachen.\n" +
    "   Zwischen den Markern steht reines JSON (Felder: siehe js/termine-kern.js).\n" +
    "   Pflege über `node _termine.mjs`; von Hand nur gültiges JSON eintragen. */\n";
  function datenLesen(quelltext) {
    var a = quelltext.indexOf(A), e = quelltext.lastIndexOf(E);
    if (a < 0 || e < a) throw new Error("BZS_KERN.datenLesen: Marker " + A + " … " + E + " fehlen");
    return JSON.parse(quelltext.slice(a + A.length, e));
  }
  function flach(w) {
    if (w && typeof w.toJSON === "function") w = w.toJSON();
    if (w === undefined || typeof w === "function") return "null";
    if (w === null || typeof w !== "object") return JSON.stringify(w);
    if (Array.isArray(w)) return "[" + w.map(flach).join(", ") + "]";
    var k = schluessel(w);
    return k.length ? "{ " + k.map(function (x) { return JSON.stringify(x) + ": " + flach(w[x]); }).join(", ") + " }" : "{}";
  }
  function schluessel(w) {
    return Object.keys(w).filter(function (x) { return w[x] !== undefined && typeof w[x] !== "function"; });
  }
  function huebsch(w, einzug) {
    var f = flach(w);
    if (w === null || typeof w !== "object" || einzug.length + f.length <= 100) return f;
    var innen = einzug + " ";
    if (Array.isArray(w)) {
      return "[\n" + w.map(function (x) { return innen + huebsch(x, innen); }).join(",\n") + "\n" + einzug + "]";
    }
    return "{\n" + schluessel(w).map(function (x) {
      return innen + JSON.stringify(x) + ": " + huebsch(w[x], innen);
    }).join(",\n") + "\n" + einzug + "}";
  }
  /* vorlage = bisheriger Dateiinhalt (alles außerhalb der Marker bleibt stehen) */
  function datenSchreiben(D, vorlage) {
    var json = huebsch(D, "");
    if (vorlage) {
      var a = vorlage.indexOf(A), e = vorlage.lastIndexOf(E);
      if (a < 0 || e < a) throw new Error("BZS_KERN.datenSchreiben: Marker fehlen in der Vorlage");
      return vorlage.slice(0, a + A.length) + json + vorlage.slice(e);
    }
    return KOPF + "window.BZS_TERMINE = " + A + json + E + ";\n";
  }

  ziel.BZS_KERN = {
    SCHEMA: 1, MODULE: MODULE, ARTEN: ARTEN.slice(), REGELN: REGELN.slice(),
    gueltig: gueltig, plusTage: plusTage, wochentag: wochentag, tageZwischen: tageZwischen, zeitGueltig: zeitGueltig,
    heuteBerlin: heuteBerlin, zeitstempelBerlin: zeitstempelBerlin, berlinOffset: berlinOffset, heuteParameter: heuteParameter,
    ostern: ostern, feiertage: feiertage, feiertag: feiertag, warntage: warntage, warntag: warntag,
    termine: termine, naechster: naechster, offeneFeiertage: offeneFeiertage,
    hinweiseAktiv: hinweiseAktiv, hinweisAktiv: hinweisAktiv,
    datenLesen: datenLesen, datenSchreiben: datenSchreiben
  };
})(typeof window !== "undefined" ? window : globalThis);
