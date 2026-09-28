/* ══════════════════════════════════════════════════════════════════════
   BZS — gemeinsame Logik aller Entwürfe für das Bildungszentrum Sönmez

   Was hier liegt, gilt für jeden Entwurf gleichzeitig:
   · Termine (aus dem Rhythmus berechnet, nie eingetippt)
   · Sprachen Deutsch / Türkisch / Englisch / Russisch / Arabisch /
     Kroatisch-Serbisch-Bosnisch (Texte der drei neuen Sprachen seit 28.09.2026)
   · Fristen-Rechner
   · Farbwelt-Umschalter (Rot / Blau / Sand)
   · Kopfleiste, Anfrageformular

   ÄNDERN muss man hier nur etwas, wenn sich der Kursrhythmus ändert
   (Wochentag, Uhrzeit), ein Termin ausfällt (Datum in "ausfall") oder
   ein Text in einer Sprache korrigiert wird. Preise und Termine stehen
   nur EINMAL — im HTML bzw. hier — und gelten für alle Sprachen.

   ⚠ Alle Übersetzungen sind noch nicht von Muttersprachlern
   gegengelesen. Von Sönmez' Dozenten prüfen lassen.
   ══════════════════════════════════════════════════════════════════════ */
window.BZS = (function () {
  "use strict";
  var docEl = document.documentElement;

  var DATEN = {
    whatsapp: "491739324879",
    email:    "bkfsonmez@gmail.com",
    sprachen: ["de", "tr", "en", "ru", "ar", "hr"],

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
        titel: { de: "Eco-Training & Assistenzsysteme", tr: "Eko sürüş ve sürücü destek sistemleri", en: "Eco-training & driver assistance systems", ru: "Эко-вождение и системы помощи водителю", ar: "القيادة الاقتصادية وأنظمة مساعدة السائق", hr: "Eko-trening i sistemi za pomoć vozaču" },
        was:   { de: "Kraftstoff sparen, Assistenzsysteme sicher nutzen", tr: "Yakıt tasarrufu, sürücü destek sistemlerini güvenle kullanma", en: "Save fuel, use driver assistance systems safely", ru: "Экономить топливо, безопасно пользоваться системами помощи водителю", ar: "توفير الوقود واستخدام أنظمة المساعدة بأمان", hr: "Uštedjeti gorivo, sigurno koristiti sisteme za pomoć vozaču" } },
      { nr: 2,
        titel: { de: "Sozialvorschriften & Tachograf", tr: "Sürüş ve dinlenme süreleri, takograf", en: "Drivers' hours & tachograph", ru: "Режим труда и отдыха, тахограф", ar: "لوائح أوقات القيادة والتاكوغراف", hr: "Socijalni propisi i tahograf" },
        was:   { de: "Lenk- und Ruhezeiten, Kontrollen sicher bestehen", tr: "Sürüş ve dinlenme süreleri, denetimlerden sorunsuz geçme", en: "Driving and rest times, pass roadside checks with confidence", ru: "Режим труда и отдыха, уверенно проходить проверки", ar: "أوقات القيادة والراحة، واجتياز التفتيش بثقة", hr: "Vrijeme vožnje i odmora, bez problema proći kontrole" } },
      { nr: 3,
        titel: { de: "Gefahrenwahrnehmung", tr: "Tehlike algısı", en: "Hazard perception", ru: "Восприятие опасности", ar: "إدراك المخاطر", hr: "Prepoznavanje opasnosti" },
        was:   { de: "Kritische Situationen früher erkennen", tr: "Riskli durumları erken fark etme", en: "Recognise critical situations earlier", ru: "Раньше распознавать критические ситуации", ar: "التعرّف على المواقف الحرجة في وقت أبكر", hr: "Ranije prepoznati kritične situacije" } },
      { nr: 4,
        titel: { de: "Schadenprävention", tr: "Hasar önleme", en: "Damage prevention", ru: "Предотвращение ущерба", ar: "الوقاية من الأضرار", hr: "Sprječavanje šteta" },
        was:   { de: "Unfälle und teure Schäden vermeiden", tr: "Kazaları ve maliyetli hasarları önleme", en: "Avoid accidents and costly damage", ru: "Избегать аварий и дорогостоящих повреждений", ar: "تجنّب الحوادث والأضرار المكلفة", hr: "Izbjeći nesreće i skupe štete" } },
      { nr: 5,
        titel: { de: "Ladungssicherung", tr: "Yük emniyeti", en: "Load securing", ru: "Крепление груза", ar: "تثبيت الحمولة", hr: "Pričvršćivanje tereta" },
        was:   { de: "Sicher zurren, Bußgelder und Haftung vermeiden", tr: "Yükü güvenle bağlama, para cezası ve tazminat riskini önleme", en: "Secure loads properly, avoid fines and liability", ru: "Надёжно крепить груз, избегать штрафов и ответственности", ar: "ربط الحمولة بإحكام، وتجنّب الغرامات والمسؤولية القانونية", hr: "Sigurno vezati teret, izbjeći kazne i odgovornost za štetu" } }
    ],

    wochentage: {
      de: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
      tr: ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"],
      en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      ru: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
      ar: ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"],
      hr: ["ned", "pon", "uto", "sri", "čet", "pet", "sub"]
    },
    uhr:    { de: " Uhr", tr: "", en: "", ru: "", ar: "", hr: " h" },
    locale: { de: "de-DE", tr: "tr-TR", en: "en-GB", ru: "ru-RU", ar: "ar-u-nu-latn", hr: "hr-HR" },  /* ar: westliche Ziffern */
    /* Monatsnamen, wo die Browser-Ausgabe nicht passt: die hr-Fassung gilt für HR/SR/BS → internationale Formen
       („mart" statt kroatisch „ožujak"). Eigene Liste statt Locale „bs-BA", die nicht jeder Browser kennt. */
    monate: { hr: ["januar", "februar", "mart", "april", "maj", "juni", "juli", "august", "septembar", "oktobar", "novembar", "decembar"] },
    knopf:  { de: "Platz anfragen", tr: "Yer ayırtın", en: "Request a place", ru: "Записаться", ar: "اطلب مقعدًا", hr: "Upit za mjesto" },

    /* Anfrageformular: öffnet WhatsApp mit der fertigen Nachricht, E-Mail als Ausweg */
    formular: {
      kopf:    { de: "Guten Tag, meine Anfrage über die Website:", tr: "Merhaba, web sitesi üzerinden talebim:", en: "Hello, my enquiry via the website:", ru: "Здравствуйте, мой запрос с сайта:", ar: "مرحبًا، طلبي عبر الموقع الإلكتروني:", hr: "Dobar dan, moj upit putem web-stranice:" },
      betreff: { de: "Anfrage über bildungszentrum-soenmez.de", tr: "bildungszentrum-soenmez.de üzerinden talep", en: "Enquiry via bildungszentrum-soenmez.de", ru: "Запрос с сайта bildungszentrum-soenmez.de", ar: "طلب عبر bildungszentrum-soenmez.de", hr: "Upit putem bildungszentrum-soenmez.de" },
      status:  { de: "WhatsApp ist geöffnet – bitte dort auf Senden tippen.", tr: "WhatsApp açıldı – lütfen orada Gönder’e dokunun.", en: "WhatsApp is open – please tap Send there.", ru: "WhatsApp открыт — пожалуйста, нажмите там «Отправить».", ar: "تم فتح WhatsApp – يرجى الضغط على «إرسال» هناك.", hr: "WhatsApp je otvoren – tamo dodirnite „Pošalji“." },
      mail:    { de: "Kein WhatsApp? Anfrage per E-Mail senden", tr: "WhatsApp yok mu? Talebi e-postayla gönderin", en: "No WhatsApp? Send the enquiry by email", ru: "Нет WhatsApp? Отправить запрос по e-mail", ar: "ليس لديك WhatsApp؟ أرسل الطلب بالبريد الإلكتروني", hr: "Nemate WhatsApp? Pošaljite upit e-mailom" }
    },

    /* WhatsApp-Vorlage je Sprache; {nr} {titel} {datum} werden eingesetzt */
    anfrage: {
      de: "Guten Tag, ich möchte mich für Modul {nr} ({titel}) am {datum} anmelden.",
      tr: "Merhaba, {datum} tarihli {nr}. modül ({titel}) için yer ayırtmak istiyorum.",
      en: "Hello, I would like to register for Module {nr} ({titel}) on {datum}.", ru: "Здравствуйте, хочу записаться на модуль {nr} ({titel}) на {datum}.", ar: "مرحبًا، أودّ التسجيل في الوحدة {nr} ({titel}) بتاريخ {datum}.", hr: "Dobar dan, želim se prijaviti za modul {nr} ({titel}) dana {datum}." },

    /* Du-Fassung der Rechner-Texte für Seiten, die Fahrer duzen (<html data-anrede="du">).
       Je Sprache nach deren Anrederegel: tr siz, ru вы, en you, hr ti, ar direkt. */
    rechnerDu: {
      de: {
        abgelaufen: "Abgelaufen.", knapp: "Es wird knapp.",
        bald: "Zeit genug, aber nicht mehr viel.", ruhig: "Alles im Rahmen.",
        tage: "Tage", ueberfaellig: "Tage überfällig",
        textAb: "Ohne gültige 95 darfst du nicht gewerblich fahren. Die fünf Module lassen sich jederzeit nachholen – melde dich, wir finden mit dir den nächsten freien Termin.",
        textKnapp: "Fünf Module brauchen fünf Termine. Mit Puffer für Urlaub und Krankheit solltest du jetzt anfangen.",
        textBald: "Am besten meldest du dich etwa ein halbes Jahr vorher an. Dann suchst du dir die Termine aus, statt zu nehmen, was übrig ist.",
        textRuhig: "Merk dir {monat} – dann ist der richtige Moment, die Termine zu planen."
      },
      tr: {
        abgelaufen: "Süresi doldu.",
        knapp: "Zaman daralıyor.",
        bald: "Zaman var, ama çok değil.",
        ruhig: "Her şey yolunda.",
        tage: "gün",
        ueberfaellig: "gün gecikmiş",
        textAb: "Geçerli Kod 95 olmadan ticari araç kullanamazsınız. Beş modül her zaman tamamlanabilir – bize ulaşın, sizinle birlikte bir sonraki müsait tarihi bulalım.",
        textKnapp: "Beş modül, beş ders günü demek. İzin ve hastalık payı da düşünülürse şimdi başlamalısınız.",
        textBald: "En iyisi yaklaşık altı ay önceden kaydolmanız. O zaman tarihleri siz seçersiniz, kalanı almak zorunda kalmazsınız.",
        textRuhig: "{monat} için bir not alın – tarihleri planlamanın doğru zamanı odur."
      },
      en: {
        abgelaufen: "Expired.",
        knapp: "Time is getting tight.",
        bald: "Enough time, but not much.",
        ruhig: "You are fine for now.",
        tage: "days",
        ueberfaellig: "days overdue",
        textAb: "Without a valid Code 95 you may not drive professionally. The five modules can be completed at any time – get in touch and we will find the next available date together.",
        textKnapp: "Five modules need five course days. Allowing for holidays and illness, you should start now.",
        textBald: "It is best to sign up about six months before the deadline. Then you choose your dates instead of taking what is left.",
        textRuhig: "Make a note of {monat} – that is the right moment to plan your dates."
      },
      ru: {
        abgelaufen: "Срок истёк.",
        knapp: "Времени мало.",
        bald: "Время есть, но уже немного.",
        ruhig: "Всё в порядке.",
        tage: "дн.",
        ueberfaellig: "дн. просрочки",
        textAb: "Без действующего кода 95 вам нельзя профессионально водить. Пять модулей можно пройти в любое время — свяжитесь с нами, и мы вместе с вами подберём ближайшую свободную дату.",
        textKnapp: "Пять модулей — это пять учебных дней. С запасом на отпуск и болезнь вам стоит начать уже сейчас.",
        textBald: "Лучше всего записаться примерно за полгода до окончания срока. Тогда вы сами выбираете даты, а не берёте то, что осталось.",
        textRuhig: "Запомните: {monat} — самое время планировать даты."
      },
      ar: {
        abgelaufen: "انتهت الصلاحية.",
        knapp: "الوقت يضيق.",
        bald: "الوقت كافٍ، لكنه لم يعد كثيرًا.",
        ruhig: "كل شيء على ما يرام.",
        tage: "يومًا",
        ueberfaellig: "يومًا من التأخير",
        textAb: "من دون رمز 95 ساري المفعول لا يُسمح لك بالقيادة المهنية. يمكنك استكمال الوحدات الخمس في أي وقت – تواصل معنا، وسنجد معك أقرب موعد متاح.",
        textKnapp: "خمس وحدات تحتاج إلى خمسة مواعيد. ومع هامش للإجازة والمرض، الأفضل أن تبدأ الآن.",
        textBald: "الأفضل أن تسجّل قبل انتهاء الصلاحية بنحو نصف سنة. عندها تختار مواعيدك بنفسك بدلًا من أخذ ما تبقّى.",
        textRuhig: "تذكّر شهر {monat} — فهو الوقت المناسب لتخطيط مواعيدك."
      },
      hr: {
        abgelaufen: "Rok je istekao.",
        knapp: "Postaje tijesno.",
        bald: "Vremena još ima, ali ne mnogo.",
        ruhig: "Sve je u redu.",
        tage: "dana",
        ueberfaellig: "dana kašnjenja",
        textAb: "Bez važećeg koda 95 ne smiješ profesionalno voziti. Pet modula možeš završiti bilo kada – javi nam se, s tobom ćemo pronaći sljedeći slobodan termin.",
        textKnapp: "Za pet modula potrebno je pet termina. Uz rezervu za godišnji odmor i bolovanje, najbolje je da počneš sada.",
        textBald: "Najbolje je da se prijaviš otprilike pola godine ranije. Tada ti biraš termine, umjesto da uzimaš ono što je ostalo.",
        textRuhig: "Zapamti: {monat} — tada je pravi trenutak da isplaniraš termine."
      }
    },

    rechner: {
      de: {
        abgelaufen: "Abgelaufen.", knapp: "Es wird knapp.",
        bald: "Zeit genug, aber nicht mehr viel.", ruhig: "Alles im Rahmen.",
        tage: "Tage", ueberfaellig: "Tage überfällig",
        textAb: "Ohne gültigen Nachweis darf gewerblich nicht gefahren werden. Die fünf Module lassen sich jederzeit nachholen – melden Sie sich, wir finden mit Ihnen den nächsten freien Termin.",
        textKnapp: "Fünf Module brauchen fünf Termine. Mit Puffer für Urlaub und Krankheit sollten Sie jetzt anfangen.",
        textBald: "Der beste Zeitpunkt zum Anmelden ist etwa ein halbes Jahr vorher. Dann suchen Sie sich die Termine aus, statt zu nehmen, was übrig ist.",
        textRuhig: "Notieren Sie sich {monat} – dann ist der richtige Moment, die Termine zu planen."
      },
      tr: {
        abgelaufen: "Süresi doldu.", knapp: "Zaman daralıyor.",
        bald: "Zaman var, ama çok değil.", ruhig: "Her şey yolunda.",
        tage: "gün", ueberfaellig: "gün gecikmiş",
        textAb: "Geçerli Kod 95 belgesi olmadan ticari araç kullanılamaz. Beş modül her zaman tamamlanabilir – bize ulaşın, sizinle birlikte bir sonraki müsait tarihi bulalım.",
        textKnapp: "Beş modül, beş ders günü demek. İzin ve hastalık payı da düşünülürse şimdi başlamalısınız.",
        textBald: "Kayıt için en uygun zaman yaklaşık altı ay öncesidir. O zaman tarihleri siz seçersiniz, kalanı almak zorunda kalmazsınız.",
        textRuhig: "{monat} için bir not alın – tarihleri planlamanın doğru zamanı odur."
      },
      en: {
        abgelaufen: "Expired.", knapp: "Time is getting tight.",
        bald: "Enough time, but not much.", ruhig: "You are fine for now.",
        tage: "days", ueberfaellig: "days overdue",
        textAb: "Without a valid Code 95 you may not drive professionally. The five modules can be completed at any time – get in touch and we will find the next available date together.",
        textKnapp: "Five modules need five course days. Allowing for holidays and illness, you should start now.",
        textBald: "The best time to sign up is about six months before the deadline. Then you choose your dates instead of taking what is left.",
        textRuhig: "Make a note of {monat} – that is the right moment to plan your dates."
      },
      ru: {
        abgelaufen: "Срок истёк.",
        knapp: "Времени мало.",
        bald: "Время есть, но уже немного.",
        ruhig: "Всё в порядке.",
        tage: "дн.",
        ueberfaellig: "дн. просрочки",
        textAb: "Без действующего документа о квалификации профессионально водить нельзя. Пять модулей можно пройти в любое время — свяжитесь с нами, и мы вместе с вами подберём ближайшую свободную дату.",
        textKnapp: "Пять модулей — это пять учебных дней. С запасом на отпуск и болезнь вам стоит начать уже сейчас.",
        textBald: "Лучше всего записываться примерно за полгода до окончания срока. Тогда вы сами выбираете даты, а не берёте то, что осталось.",
        textRuhig: "Запишите себе: {monat} — самое время планировать даты."
      },
      ar: {
        abgelaufen: "انتهت الصلاحية.",
        knapp: "الوقت يضيق.",
        bald: "الوقت كافٍ، لكنه لم يعد كثيرًا.",
        ruhig: "كل شيء على ما يرام.",
        tage: "يومًا",
        ueberfaellig: "يومًا من التأخير",
        textAb: "من دون بطاقة تأهيل سارية لا تجوز القيادة المهنية. يمكن استكمال الوحدات الخمس في أي وقت – تواصل معنا، وسنجد معك أقرب موعد متاح.",
        textKnapp: "خمس وحدات تحتاج إلى خمسة مواعيد. ومع هامش للإجازات والمرض، ينبغي أن تبدأ الآن.",
        textBald: "أفضل وقت للتسجيل هو قبل انتهاء الصلاحية بنحو نصف سنة. عندها تختار المواعيد بنفسك بدلًا من أخذ ما تبقّى.",
        textRuhig: "دوّن لديك شهر {monat} — فهو الوقت المناسب لتخطيط المواعيد."
      },
      hr: {
        abgelaufen: "Rok je istekao.",
        knapp: "Postaje tijesno.",
        bald: "Vremena još ima, ali ne mnogo.",
        ruhig: "Sve je u redu.",
        tage: "dana",
        ueberfaellig: "dana kašnjenja",
        textAb: "Bez važećeg koda 95 nije dozvoljena profesionalna vožnja. Pet modula možete završiti bilo kada – javite nam se, s Vama ćemo pronaći sljedeći slobodan termin.",
        textKnapp: "Za pet modula potrebno je pet termina. Uz rezervu za godišnji odmor i bolovanje, trebali biste početi sada.",
        textBald: "Najbolje vrijeme za prijavu je otprilike pola godine ranije. Tada Vi birate termine, umjesto da uzimate ono što je ostalo.",
        textRuhig: "Zabilježite: {monat} — tada je pravi trenutak da isplanirate termine."
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
      var du = docEl.getAttribute("data-anrede") === "du";
      var W = (du && DATEN.rechnerDu[sprache()]) || DATEN.rechner[sprache()], ort = DATEN.locale[sprache()];
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
        var mon = DATEN.monate[sprache()];
        txt = W.textRuhig.replace("{monat}", mon ? mon[start.getMonth()] + " " + start.getFullYear() + "." : start.toLocaleDateString(ort, { month: "long", year: "numeric" }));
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
    var codes = DATEN.sprachen.join("|");
    var alt = (location.search.match(new RegExp("[?&]lang=(" + codes + ")")) || [])[1];
    var ziel = alt && document.querySelector('link[rel="alternate"][hreflang="' + alt + '"]');
    if (alt && sprache() !== alt && ziel) {
      try { location.replace(ziel.href + location.hash); } catch (e) {}
      return;
    }
    var m = document.querySelector(".sprachmenue");
    if (!m) return;
    m.querySelectorAll("[data-sprache]").forEach(function (a) {
      if (a.dataset.sprache === sprache()) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    /* Klappmenü: schließt bei Klick daneben und bei Escape; öffnet es sich, klappt das Handy-Menü zu */
    document.addEventListener("click", function (e) { if (m.open && !m.contains(e.target)) m.open = false; });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && m.open) { m.open = false; var s = m.querySelector("summary"); if (s) s.focus(); }
    });
    m.addEventListener("toggle", function () {
      if (!m.open) return;
      var k = document.getElementById("kopf"), kn = document.querySelector(".menue-knopf");
      if (k) k.classList.remove("offen");
      if (kn) kn.setAttribute("aria-expanded", "false");
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

    /* Menü auf dem Handy: ein Knopf klappt die Navigation auf.
       Schließt bei Klick auf einen Link, bei Escape und bei Klick daneben. */
    var knopf = document.querySelector(".menue-knopf");
    if (k && knopf) {
      var zu = function () { k.classList.remove("offen"); knopf.setAttribute("aria-expanded", "false"); };
      knopf.addEventListener("click", function (e) {
        e.stopPropagation();
        var offen = k.classList.toggle("offen");
        knopf.setAttribute("aria-expanded", String(offen));
        var sm = document.querySelector(".sprachmenue"); if (sm && offen) sm.open = false;
      });
      k.querySelectorAll(".kopf-nav a").forEach(function (a) { a.addEventListener("click", zu); });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") zu(); });
      document.addEventListener("click", function (e) { if (!k.contains(e.target)) zu(); });
    }
  }

  /* ─── Anfrageformular ─────────────────────────────────────────────
     Ohne Server: Absenden öffnet WhatsApp mit einer fertigen Nachricht
     aus den Feldern (Beschriftung: Wert). Wer kein WhatsApp hat, bekommt
     darunter denselben Text als E-Mail-Link. Gesendet wird erst, wenn der
     Besucher in WhatsApp bzw. im Mailprogramm selbst auf Senden tippt —
     so steht es auch in der Datenschutzerklärung.                       */
  function formular() {
    var f = document.getElementById("anfrage");
    if (!f) return;
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var T = DATEN.formular, zeilen = [];
      f.querySelectorAll("input, select, textarea").forEach(function (el) {
        var w = (el.value || "").trim();
        if (!w || el.type === "hidden" || el.type === "submit") return;
        var lab = el.id && f.querySelector('label[for="' + el.id + '"]');
        var name = lab ? lab.textContent.replace(/\s*\([^)]*\)\s*/g, " ").trim() : el.name;
        zeilen.push(name + ": " + w);
      });
      var nachricht = text(T.kopf) + "\n\n" + zeilen.join("\n");
      var wa = "https://wa.me/" + DATEN.whatsapp + "?text=" + encodeURIComponent(nachricht);
      var mail = "mailto:" + DATEN.email + "?subject=" + encodeURIComponent(text(T.betreff)) + "&body=" + encodeURIComponent(nachricht);
      var box = f.querySelector(".formular-status");
      if (!box) { box = document.createElement("p"); box.className = "formular-status"; box.setAttribute("role", "status"); f.appendChild(box); }
      box.textContent = "";
      var hinweis = document.createElement("span"); hinweis.textContent = text(T.status);
      var link = document.createElement("a"); link.href = mail; link.textContent = text(T.mail);
      box.appendChild(hinweis); box.appendChild(document.createElement("br")); box.appendChild(link);
      window.open(wa, "_blank", "noopener");
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
