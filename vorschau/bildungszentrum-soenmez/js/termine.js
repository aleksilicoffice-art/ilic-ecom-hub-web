/* Termine Bildungszentrum Sönmez — die EINZIGE Quelle für alle Seiten und Sprachen.
   Zwischen den Markern steht reines JSON (Felder: siehe js/termine-kern.js).
   Pflege über `node _termine.mjs`; von Hand nur gültiges JSON eintragen. */
window.BZS_TERMINE = /*DATEN*/{
 "schema": 1,
 "version": 1,
 "stand": "2026-11-07T18:19:33+01:00",
 "rhythmus": {
  "kurs": "modul95",
  "wochentag": 6,
  "beginn": "08:00",
  "ende": "16:00",
  "anker": { "datum": "2026-07-18", "modul": 1 },
  "anzeigen": 5,
  "ausfallRegel": "weiterzaehlen"
 },
 "ausfall": [
  { "datum": "2026-10-03", "regel": "weiterzaehlen", "status": "annahme" },
  { "datum": "2026-12-26", "regel": "weiterzaehlen", "status": "annahme" }
 ],
 "stattfinden": [],
 "zusatz": [],
 "kurse": {
  "grundquali": {
   "kuerzel": "GQ",
   "jsonld": "#kurs-grundquali",
   "name": {
    "de": "Beschleunigte Grundqualifikation",
    "tr": "Hızlandırılmış temel yeterlilik",
    "en": "Accelerated initial qualification",
    "ru": "Ускоренная базовая квалификация",
    "ar": "التأهيل الأساسي المُعجَّل",
    "hr": "Ubrzana početna kvalifikacija"
   }
  },
  "stapler": {
   "kuerzel": "ST",
   "jsonld": "#kurs-stapler",
   "name": {
    "de": "Gabelstapler",
    "tr": "Forklift",
    "en": "Forklift",
    "ru": "Вилочный погрузчик",
    "ar": "الرافعة الشوكية",
    "hr": "Viljuškar"
   }
  },
  "ladekran": {
   "kuerzel": "LK",
   "jsonld": "#kurs-ladekran",
   "name": {
    "de": "Ladekran",
    "tr": "Yükleme vinci",
    "en": "Loader crane",
    "ru": "Кран-манипулятор",
    "ar": "رافعة التحميل",
    "hr": "Utovarna dizalica"
   }
  },
  "bagger": {
   "kuerzel": "BG",
   "jsonld": "#kurs-bagger",
   "name": {
    "de": "Bagger & Erdbaumaschinen",
    "tr": "Kepçe ve iş makineleri",
    "en": "Excavators & earthmoving machinery",
    "ru": "Экскаваторы и землеройная техника",
    "ar": "الحفّارات وآليات الأعمال الترابية",
    "hr": "Bager i mehanizacija za zemljane radove"
   }
  },
  "fachseminar": {
   "kuerzel": "FS",
   "jsonld": "#kurs-fachseminar",
   "name": {
    "de": "Fachseminar für Unternehmer",
    "tr": "İşletme sahipleri için uzmanlık semineri",
    "en": "Specialist seminar for haulage operators",
    "ru": "Специализированный семинар для предпринимателей",
    "ar": "ندوة متخصصة لأصحاب شركات النقل",
    "hr": "Stručni seminar za vlasnike firmi"
   }
  }
 },
 "kursTermine": [],
 "hinweise": []
}/*ENDE*/;
