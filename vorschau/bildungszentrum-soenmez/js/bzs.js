/* ══════════════════════════════════════════════════════════════════════
   BZS — gemeinsame Logik aller Entwürfe für das Bildungszentrum Sönmez

   Was hier liegt, gilt für jeden Entwurf gleichzeitig:
   · Termine anzeigen (Zeilen, Leiste, Karte, Kurstermine, Hinweis-Band)
   · Sprachen Deutsch / Türkisch / Englisch / Russisch / Arabisch /
     Kroatisch-Serbisch-Bosnisch (Texte der drei neuen Sprachen seit 28.09.2026)
   · Fristen-Rechner
   · Farbwelt-Umschalter (Rot / Blau / Sand)
   · Kopfleiste, Anfrageformular

   TERMINE stehen NICHT mehr hier, sondern in js/termine.js (Daten, gepflegt
   mit `node _termine.mjs`) und werden in js/termine-kern.js berechnet.
   Reihenfolge auf jeder Seite: termine.js → termine-kern.js → bzs.js.
   Hier ändert man nur noch Texte (eine Sprache korrigieren). Preise stehen
   nur EINMAL im HTML und gelten für alle Sprachen.

   ⚠ Alle Übersetzungen sind noch nicht von Muttersprachlern
   gegengelesen. Von Sönmez' Dozenten prüfen lassen.
   ══════════════════════════════════════════════════════════════════════ */
window.BZS = (function () {
  "use strict";
  var docEl = document.documentElement;

  /* Termindaten + Rechenkern (müssen VOR dieser Datei geladen sein) */
  var TD = window.BZS_TERMINE || null;
  var KERN = window.BZS_KERN || null;
  var bereit = !!(TD && KERN);
  if (!bereit) {
    try { console.warn("BZS: js/termine.js und js/termine-kern.js fehlen oder stehen nach bzs.js – keine Termine, Ersatztexte bleiben stehen."); } catch (e) {}
  }

  /* Altes Format DATEN.terminplan — nur noch zum LESEN für ältere Entwürfe
     (aushang/, plantafel/, typenschild/ lesen beginn/ende). Änderungen hier wirken nicht. */
  function terminplanKompat(D) {
    var R = (D && D.rhythmus) || {};
    var aus = (D && Array.isArray(D.ausfall)) ? D.ausfall : [];
    return {
      wochentag: R.wochentag != null ? R.wochentag : null,
      beginn: R.beginn || null,
      ende: R.ende || null,
      anker: R.anker ? { datum: R.anker.datum, modul: R.anker.modul } : null,
      anzeigen: R.anzeigen || 5,
      ausfall: aus.map(function (a) { return a && a.datum; }).filter(Boolean)
    };
  }

  var DATEN = {
    whatsapp: "491739324879",
    email:    "bkfsonmez@gmail.com",
    sprachen: ["de", "tr", "en", "ru", "ar", "hr"],

    terminplan: terminplanKompat(TD),

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
    /* Weitere Vorlagen (seit 07.11.2026): Wochenkurs, Kurstermin an einem Tag, Kurstermin über mehrere Tage.
       Auf Arabisch stehen die Daten in Richtungs-Inseln (U+2066 … U+2069). */
    anfrageWoche: {
      de: "Guten Tag, ich möchte mich für den Modul-95-Wochenkurs ({module}) vom {von} bis {bis} anmelden.",
      tr: "Merhaba, {von} – {bis} tarihleri arasındaki bir haftalık Kod 95 kursu ({module}) için yer ayırtmak istiyorum.",
      en: "Hello, I would like to register for the one-week Code 95 course ({module}) from {von} to {bis}.",
      ru: "Здравствуйте, хочу записаться на недельный курс по коду 95 ({module}) с {von} по {bis}.",
      ar: "مرحبًا، أودّ التسجيل في دورة رمز 95 لمدة أسبوع ({module}) من {von} إلى {bis}.",
      hr: "Dobar dan, želim se prijaviti na sedmičnu obuku za kod 95 ({module}) od {von} do {bis}."
    },
    anfrageKursTag: {
      de: "Guten Tag, ich möchte mich für die Schulung „{kurs}“ am {datum} anmelden.",
      tr: "Merhaba, {datum} tarihli “{kurs}” eğitimi için yer ayırtmak istiyorum.",
      en: "Hello, I would like to register for the “{kurs}” course on {datum}.",
      ru: "Здравствуйте, хочу записаться на обучение «{kurs}» на {datum}.",
      ar: "مرحبًا، أودّ التسجيل في دورة «{kurs}» بتاريخ {datum}.",
      hr: "Dobar dan, želim se prijaviti za obuku „{kurs}“ dana {datum}."
    },
    anfrageKursSpanne: {
      de: "Guten Tag, ich möchte mich für die Schulung „{kurs}“ vom {von} bis {bis} anmelden.",
      tr: "Merhaba, {von} – {bis} tarihleri arasındaki “{kurs}” eğitimi için yer ayırtmak istiyorum.",
      en: "Hello, I would like to register for the “{kurs}” course from {von} to {bis}.",
      ru: "Здравствуйте, хочу записаться на обучение «{kurs}» с {von} по {bis}.",
      ar: "مرحبًا، أودّ التسجيل في دورة «{kurs}» من {von} إلى {bis}.",
      hr: "Dobar dan, želim se prijaviti za obuku „{kurs}“ od {von} do {bis}."
    },

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

  /* Texte der Terminanzeige (Zeilen, Marken, Leiste, Kurskarten). Platzhalter in allen Sprachen gleich.
     Bewusst ohne Anrede, damit sie auf Sie- und Du-Seiten passen. */
  var TERMIN_TEXTE = {
    modul:       { de: "Modul", tr: "Modül", en: "Module", ru: "Модуль", ar: "الوحدة", hr: "Modul" },
    /* mehrere Module: Plural (tr: Singular nach Zahlen ist richtig); Listen-Trenner „، " auf Arabisch, sonst „, " */
    modulSpanne: { de: "Module {von}–{bis}", tr: "Modül {von}–{bis}", en: "Modules {von}–{bis}", ru: "Модули {von}–{bis}", ar: "الوحدات {von}–{bis}", hr: "Moduli {von}–{bis}" },
    moduleListe: { de: "Module {liste}", tr: "Modül {liste}", en: "Modules {liste}", ru: "Модули {liste}", ar: "الوحدات {liste}", hr: "Moduli {liste}" },
    woche:       { de: "Wochenkurs", tr: "Bir haftalık kurs", en: "One-week course", ru: "Недельный курс", ar: "دورة لمدة أسبوع", hr: "Sedmična obuka" },
    wocheTitel:  { de: "{module} am Stück", tr: "{module}, bir hafta boyunca aralıksız", en: "{module} in one week", ru: "{module} подряд", ar: "{module} بشكل متواصل", hr: "{module} zaredom" },
    wocheWas:    { de: "An aufeinanderfolgenden Tagen statt an einzelnen Samstagen.", tr: "Ayrı ayrı cumartesiler yerine bir hafta boyunca aralıksız.", en: "On consecutive days instead of separate Saturdays.", ru: "Несколько дней подряд, а не по отдельным субботам.", ar: "في أيام متتالية بدلًا من أيام سبت متفرقة.", hr: "Više dana zaredom umjesto pojedinačnih subota." },
    zusatz:      { de: "Zusatztermin", tr: "Ek tarih", en: "Extra date", ru: "Дополнительная дата", ar: "موعد إضافي", hr: "Dodatni termin" },
    naechster:   { de: "Nächster Termin", tr: "Bir sonraki tarih", en: "Next date", ru: "Ближайшая дата", ar: "الموعد القادم", hr: "Sljedeći termin" },
    keinKurs:    { de: "Kein Kurs", tr: "Ders yok", en: "No course", ru: "Занятий нет", ar: "لا توجد دورة", hr: "Nema nastave" },
    ausfallWas:  { de: "An diesem Tag findet kein Kurs statt.", tr: "Bu tarihte ders yapılmayacak.", en: "There is no course on this day.", ru: "В этот день занятий нет.", ar: "لا تُعقد دورة في هذا اليوم.", hr: "Tog dana nema nastave." }
  };

  /* ─── Hilfen ─────────────────────────────────────────────────────── */
  function sprache() {
    var l = docEl.lang;
    return DATEN.sprachen.indexOf(l) > -1 ? l : "de";
  }
  function text(obj) { var l = sprache(); return obj[l] != null ? obj[l] : obj.de; }
  function zwei(n) { return String(n).padStart(2, "0"); }
  function iso(d) { return d.getFullYear() + "-" + zwei(d.getMonth() + 1) + "-" + zwei(d.getDate()); }
  function istIso(s) { return typeof s === "string" && /^\d{4}-\d\d-\d\d$/.test(s); }
  function lokal(s) { return new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)); }   /* ISO → lokale Mitternacht */
  /* datumText(Date | "JJJJ-MM-TT") → "07.11.2026" */
  function datumText(d) {
    if (istIso(d)) return d.slice(8, 10) + "." + d.slice(5, 7) + "." + d.slice(0, 4);
    return zwei(d.getDate()) + "." + zwei(d.getMonth() + 1) + "." + d.getFullYear();
  }
  function tagMonat(s) { return s.slice(8, 10) + "." + s.slice(5, 7) + "."; }   /* "07.11." */
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function escAttr(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;"); }
  function fuellen(vorlage, werte) {
    var s = String(vorlage);
    Object.keys(werte).forEach(function (k) { s = s.split("{" + k + "}").join(werte[k]); });
    return s;
  }
  /* Arabisch: Datumsteile als Links-nach-rechts-Insel, sonst springen Punkte und Zeiträume um */
  function ltrHtml(h) { return sprache() === "ar" ? '<bdi dir="ltr">' + h + "</bdi>" : h; }
  function ltrText(s) { return sprache() === "ar" ? "\u2066" + s + "\u2069" : s; }
  function sicher(f) { try { return f(); } catch (e) { try { console.warn("BZS:", e); } catch (x) {} } }

  /* ─── Termine: berechnen (Rechenkern js/termine-kern.js) ─────────────
     heute(): Berliner Kalendertag; auf localhost wirkt ?heute=JJJJ-MM-TT zum Testen. */
  function heute() {
    if (KERN) return KERN.heuteParameter(window.location) || KERN.heuteBerlin();
    return iso(new Date());
  }
  function abIso(ab) { return ab == null ? heute() : istIso(ab) ? ab : iso(new Date(ab)); }

  /* termine({ab, bis, anzahl, arten, mitAusfall}) → Einträge wie BZS_KERN.termine
     ({id, art, kurs, von, bis, module[], beginn, ende, zusatz}); ab Standard: heute(). */
  function termine(opts) {
    if (!bereit) return [];
    var o = {}, k;
    for (k in opts || {}) if (Object.prototype.hasOwnProperty.call(opts, k)) o[k] = opts[k];
    o.ab = abIso(o.ab);
    return KERN.termine(TD, o);
  }
  /* Erster Eintrag (nie ein Ausfall) oder null. Leiste/Karte: naechster({arten: ["modul", "woche"]}) */
  function naechster(opts) {
    if (!bereit) return null;
    var o = {}, k;
    for (k in opts || {}) if (Object.prototype.hasOwnProperty.call(opts, k)) o[k] = opts[k];
    o.ab = abIso(o.ab);
    return KERN.naechster(TD, o);
  }

  /* terminListe(anzahl, ab) — ALTES Format für die Entwürfe: nur eintägige Modul-95-Termine,
     {datum: Date (lokale Mitternacht), modul: DATEN.module[…]}. ab: Date, ms oder "JJJJ-MM-TT". */
  function terminListe(anzahl, ab) {
    return termine({ ab: ab, anzahl: anzahl || DATEN.terminplan.anzeigen, arten: ["modul"] })
      .filter(function (e) { return e.art === "modul" && e.module.length === 1 && DATEN.module[e.module[0] - 1]; })
      .map(function (e) { return { datum: lokal(e.von), modul: DATEN.module[e.module[0] - 1] }; });
  }

  /* ─── Termine: auflösen ──────────────────────────────────────────────
     aufloesen(e) macht aus einem Eintrag alles, was eine Seite anzeigt.
     Alle Textfelder sind fertiges HTML (escaped, auf Arabisch mit <bdi>);
     datumText ist reiner Text, waLink eine URL. Felder der alten Zeilen
     (nr, titel, was, wtag, datum, iso, zeit, knopf, waLink) bleiben gleich.
       art       "modul" | "woche" | "kurs" | "ausfall"
       badge     "3" | "1–5" | "ST"        marke  "Wochenkurs" | "Zusatztermin" | "Kein Kurs" | ""
       datum     "07.11.2026" | "23.11. – Fr 27.11.2026"   (davor steht wtag; zwischen Wochentag und Datum NBSP)
       kurz      "Sa 07.11." | "Mo 23.11. – Fr 27.11."
       lang      "Samstag, 07.11.2026" | "Montag, 23.11. – Freitag, 27.11.2026"
       datumText "07.11.2026" | "23.11.2026 – 27.11.2026"   isoBis  letzter Tag
       modulText "Modul 3" | "Module 1–5" | "Module 2, 4" | ""   notiz  Freitext (escaped) | ""
       modulSatz wie modulText, aber reiner Text für die Satzmitte (ru/hr/tr klein: „модули 1–5") */
  /* Wochentag und Datum bleiben zusammen („Fr 27.11." bricht bei 375 px nicht um, Prüfung 07.11.2026). Das
     geschützte Leerzeichen steht außerhalb der <bdi>-Inseln (ltrHtml), die arabische Leserichtung bleibt. */
  var NBSP = "\u00a0";
  function spanne(m) {
    var zus = m.length > 1 && m.every(function (x, i) { return i === 0 || x === m[i - 1] + 1; });
    return zus ? { von: m[0], bis: m[m.length - 1] } : null;
  }
  function wtagKurz(s, l) { var w = DATEN.wochentage[l] || DATEN.wochentage.de; return w[lokal(s).getDay()]; }
  function wtagLang(s, l) {
    var d = lokal(s); d.setHours(12);
    try { return d.toLocaleDateString(DATEN.locale[l], { weekday: "long" }); } catch (e) { return wtagKurz(s, l); }
  }
  /* Modul-Beschriftung als reiner Text: eines → „Modul 3", mehrere → Plural („Module 1–5" / „Module 2, 4") */
  function modulBeschriftung(mod) {
    var T = TERMIN_TEXTE, sp = spanne(mod);
    if (mod.length === 1) return text(T.modul) + " " + mod[0];
    if (sp) return fuellen(text(T.modulSpanne), { von: sp.von, bis: sp.bis });
    return fuellen(text(T.moduleListe), { liste: mod.join(sprache() === "ar" ? "، " : ", ") });
  }
  /* Satzmitte: in ru, hr und tr schreibt man das Wort klein („на модуль 2", „za modul 2", „{nr}. modül") */
  function imSatz(s) {
    var l = sprache();
    if (l !== "ru" && l !== "hr" && l !== "tr") return s;
    try { return s.charAt(0).toLocaleLowerCase(DATEN.locale[l]) + s.slice(1); } catch (e) { return s.charAt(0).toLowerCase() + s.slice(1); }
  }
  function freitext(x) {
    if (x == null) return "";
    if (typeof x === "string") return x;
    return typeof x === "object" ? String(text(x) == null ? "" : text(x)) : "";
  }
  function aufloesen(e) {
    if (!e || !istIso(e.von)) return null;
    var l = sprache(), T = TERMIN_TEXTE;
    var von = e.von, bis = istIso(e.bis) && e.bis > e.von ? e.bis : e.von, mehr = bis !== von;
    var mod = (e.module || []).filter(function (n) { return n >= 1 && n <= DATEN.module.length; });
    var M = mod.length === 1 ? DATEN.module[mod[0] - 1] : null;
    var dVon = datumText(von), dBis = datumText(bis), jahrGleich = von.slice(0, 4) === bis.slice(0, 4);
    var badge, titel, was, marke = "", modulText = "", modulSatz = "", wa = "";

    if (e.art === "modul" || e.art === "ausfall") {
      if (!M) return null;
      badge = String(M.nr); titel = text(M.titel); was = text(M.was);
      modulText = text(T.modul) + " " + M.nr; modulSatz = imSatz(modulText);
      if (e.art === "modul") {
        marke = e.zusatz ? text(T.zusatz) : "";
        /* unverändert zur alten Fassung (Links bleiben byte-gleich) */
        wa = text(DATEN.anfrage).replace("{nr}", M.nr).replace("{titel}", titel).replace("{datum}", dVon);
      } else {
        marke = text(T.keinKurs);
        was = freitext(e.grund) || text(T.ausfallWas);
      }
    } else if (e.art === "woche") {
      if (!mod.length) mod = [1, 2, 3, 4, 5];
      var sp = spanne(mod);
      badge = sp ? sp.von + "–" + sp.bis : mod.join(", ");
      modulText = modulBeschriftung(mod); modulSatz = imSatz(modulText);
      titel = fuellen(text(T.wocheTitel), { module: modulText });
      was = text(T.wocheWas);
      marke = text(T.woche);
      wa = fuellen(text(DATEN.anfrageWoche), { module: modulSatz, von: ltrText(dVon), bis: ltrText(dBis) });
    } else if (e.art === "kurs") {
      var K = TD && TD.kurse && TD.kurse[e.kurs];
      if (!K || !K.name) return null;
      badge = String(K.kuerzel || "");
      titel = freitext(K.name);
      was = freitext(e.notiz);
      wa = mehr ? fuellen(text(DATEN.anfrageKursSpanne), { kurs: titel, von: ltrText(dVon), bis: ltrText(dBis) })
        : fuellen(text(DATEN.anfrageKursTag), { kurs: titel, datum: ltrText(dVon) });
    } else return null;

    var wt = wtagKurz(von, l), komma = l === "ar" ? "، " : ", ";
    var zeit = e.beginn && e.ende ? e.beginn + " – " + e.ende + DATEN.uhr[l] : e.beginn ? e.beginn + DATEN.uhr[l] : "";
    var t = {
      nr: M ? M.nr : badge,
      titel: esc(titel),
      was: esc(was),
      wtag: esc(wt),
      datum: mehr ? ltrHtml(jahrGleich ? tagMonat(von) : dVon) + " – " + esc(wtagKurz(bis, l)) + NBSP + ltrHtml(dBis) : ltrHtml(dVon),
      iso: von,
      zeit: e.art === "ausfall" ? "" : esc(zeit),
      knopf: e.art === "ausfall" ? "" : esc(DATEN.knopf[l]),
      waLink: wa ? "https://wa.me/" + DATEN.whatsapp + "?text=" + encodeURIComponent(wa) : "",
      art: e.art,
      badge: esc(badge),
      datumText: mehr ? ltrText(dVon) + " – " + ltrText(dBis) : ltrText(dVon),
      isoBis: bis,
      marke: esc(marke),
      kurz: esc(wt) + NBSP + ltrHtml(tagMonat(von)) + (mehr ? " – " + esc(wtagKurz(bis, l)) + NBSP + ltrHtml(tagMonat(bis)) : ""),
      lang: esc(wtagLang(von, l)) + komma + (mehr ? ltrHtml(jahrGleich ? tagMonat(von) : dVon) + " – " + esc(wtagLang(bis, l)) + komma + ltrHtml(dBis) : ltrHtml(dVon)),
      modulText: esc(modulText),
      modulSatz: modulSatz,
      notiz: e.art === "kurs" ? "" : esc(freitext(e.notiz)),
      id: e.id, kurs: e.kurs, zusatz: !!e.zusatz
    };
    return t;
  }

  /* ─── Termine: zeichnen ──────────────────────────────────────────────
     render(t) bekommt einen aufgelösten Termin und gibt HTML zurück (ein
     Element pro Termin). planZeile ist das gemeinsame Aussehen von
     Entwurf A; ältere Entwürfe bringen ihr eigenes mit.                  */
  function planZeile(t) {
    if (!t) return "";
    var marke = t.marke ? ' <span class="plan-status ' + (t.art === "ausfall" ? "st-voll" : "st-wenige") + '">' + t.marke + "</span>" : "";
    var was = (t.was ? '<span class="plan-was">' + t.was + "</span>" : "") + (t.notiz ? '<span class="plan-was">' + t.notiz + "</span>" : "");
    var knopf = t.waLink ? '<a class="plan-anmelden" href="' + escAttr(t.waLink) + '" target="_blank" rel="noopener">' + t.knopf + "</a>" : "";
    return '<div class="plan-zeile' + (t.art === "modul" ? "" : " plan-" + t.art) + '">' +
      '<span class="mod">' + t.badge + "</span>" +
      '<span><span class="plan-titel">' + t.titel + "</span>" + marke + was + "</span>" +
      '<span class="plan-datum">' + t.wtag + NBSP + t.datum + (t.zeit ? "<small>" + t.zeit + "</small>" : "") + "</span>" +
      knopf +
    "</div>";
  }

  var renderer = null;
  /* #terminliste: Modul-95-Termine (Samstage, Zusatztermine, Wochenkurse). Ausfälle mit
     anzeigen:true nur im gemeinsamen Aussehen (planZeile). Ohne Termine bleibt der Ersatztext stehen. */
  function terminZeichnen(render) {
    if (render) renderer = render;
    var ziel = document.getElementById("terminliste");
    if (!ziel || !renderer) return;
    var zeilen = termine({ arten: ["modul", "woche"], mitAusfall: renderer === planZeile ? "anzeigen" : false })
      .map(aufloesen).filter(Boolean);
    if (!zeilen.length) return;
    ziel.innerHTML = "";
    zeilen.forEach(function (t) { ziel.insertAdjacentHTML("beforeend", renderer(t)); });
  }

  /* #kursliste (Block #weitere-kurse) und <p data-kurs-termin="stapler"> in den Kurskarten */
  function kurseZeichnen() {
    var liste = document.getElementById("kursliste"), block = document.getElementById("weitere-kurse");
    var karten = document.querySelectorAll("[data-kurs-termin]");
    if (!liste && !karten.length) return;
    var alle = termine({ arten: ["kurs"], anzahl: 200 }).map(aufloesen).filter(Boolean);
    if (liste) {
      var zeigen = alle.slice(0, DATEN.terminplan.anzeigen);
      if (zeigen.length) liste.innerHTML = zeigen.map(planZeile).join("");
      if (block) block.hidden = !zeigen.length;
    }
    Array.prototype.forEach.call(karten, function (p) {
      var id = p.getAttribute("data-kurs-termin"), t = null;
      for (var i = 0; i < alle.length && !t; i++) if (alle[i].kurs === id) t = alle[i];
      if (!t) { p.hidden = true; return; }
      /* Zeitspanne bricht nicht am Gedankenstrich um (375 px); Komma je Sprache wie in aufloesen() */
      p.innerHTML = '<span class="kurs-termin-k">' + esc(text(TERMIN_TEXTE.naechster)) + ":</span> " +
        t.wtag + NBSP + t.datum + (t.zeit ? (sprache() === "ar" ? "، " : ", ") + '<span class="kurs-termin-zeit">' + t.zeit + "</span>" : "") +
        (t.waLink ? ' · <a href="' + escAttr(t.waLink) + '" target="_blank" rel="noopener">' + t.knopf + "</a>" : "");
      p.hidden = false;
    });
  }

  /* Hinweis-Band (#hinweis, erstes Kind von .oben): Text nur per textContent */
  function hinweisZeigen() {
    var el = document.getElementById("hinweis");
    if (!el) return null;
    var h = bereit ? KERN.hinweisAktiv(TD, heute()) : null;
    var txt = h && h.text ? String(h.text[sprache()] || h.text.de || "").trim() : "";
    if (!txt) { el.hidden = true; return null; }
    el.textContent = "";
    var p = document.createElement("p");
    p.className = "spalte hinweis-text";
    p.textContent = txt;
    el.appendChild(p);
    el.setAttribute("data-phase", h.phase);
    el.hidden = false;
    return h;
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
    sicher(hinweisZeigen);          /* vor kopf(): die gemessene Kopfhöhe enthält das Band */
    farbwelt();
    kopf();
    formular();
    if (opts.termin) sicher(function () { terminZeichnen(opts.termin); });
    sicher(kurseZeichnen);
    rechner();
    sprachen();
  }

  return {
    DATEN: DATEN, TERMIN_TEXTE: TERMIN_TEXTE, start: start, sprache: sprache, text: text,
    terminListe: terminListe, terminZeichnen: terminZeichnen, datumText: datumText,
    termine: termine, naechster: naechster, aufloesen: aufloesen, planZeile: planZeile,
    kurseZeichnen: kurseZeichnen, hinweisZeigen: hinweisZeigen, heute: heute, esc: esc, ltrText: ltrText
  };
})();
