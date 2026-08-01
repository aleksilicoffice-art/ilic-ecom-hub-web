// Exposé Boost — Landingpage-Verhalten. Reines ES-Modul, kein Build.
// Vorher/Nachher-Regler, Reveals, FAQ, Anfrage-Versand an Formspree.

/* ============================================================================
   >>> VON ALEKS ZU PFLEGEN: <<<

   FORMSPREE_ENDPOINT — geteilt mit der Bestellseite (bestellen/app.js).
   Die Anfragen sind über den Betreff "Exposé-Boost-Anfrage" unterscheidbar.
   Ein eigener Endpoint wäre sauberer, kostet im Free-Tier aber ein zweites
   Formular-Kontingent (50 Einsendungen/Monat je Formular).
   SOLANGE LEER: Der Danke-Zustand zeigt WhatsApp-/E-Mail-Buttons mit fertig
   vorbereitetem Text — kein Lead geht verloren.
   ============================================================================ */
const FORMSPREE_ENDPOINT = "https://formspree.io/f/mykanorw";
const KONTAKT_MAIL = "kontakt@ilic-ecomhub.de";
const WHATSAPP_NR = "4917643478923";

const $ = (id) => document.getElementById(id);

/* ---------------------------------------------------------------- Jahr ---- */
const jahr = $("yr");
if (jahr) jahr.textContent = new Date().getFullYear();

/* -------------------------------------------------------------- Header ---- */
const kopf = $("hd");
if (kopf) {
  const stand = () => kopf.classList.toggle("scrolled", window.scrollY > 12);
  stand();
  addEventListener("scroll", stand, { passive: true });
}

/* ------------------------------------------------------------- Reveals ---- */
// .reveal startet auf opacity:0 — bleibt die Klasse .in aus, wäre die halbe
// Seite unsichtbar. Deshalb zwei Wege: IntersectionObserver für das Timing und
// eine Scroll-Prüfung als Netz (manche Umgebungen liefern IO-Callbacks nicht).
const reduziert = matchMedia("(prefers-reduced-motion: reduce)").matches;
const zuZeigen = [...document.querySelectorAll(".reveal")];

function zeigen(el) {
  el.classList.add("in");
}

if (reduziert || !("IntersectionObserver" in window)) {
  zuZeigen.forEach(zeigen);
} else {
  const beobachter = new IntersectionObserver(
    (eintraege) => {
      for (const e of eintraege) {
        if (!e.isIntersecting) continue;
        zeigen(e.target);
        beobachter.unobserve(e.target);
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
  );
  zuZeigen.forEach((el) => beobachter.observe(el));

  let geplant = false;
  const nachpruefen = () => {
    geplant = false;
    const hoehe = innerHeight;
    for (const el of zuZeigen) {
      if (el.classList.contains("in")) continue;
      // Alles, was der Besucher erreicht oder schon passiert hat, wird sichtbar —
      // sonst bliebe nach einem Ankersprung der Bereich darüber unsichtbar.
      if (el.getBoundingClientRect().top < hoehe - 40) zeigen(el);
    }
  };
  // Bewusst setTimeout statt requestAnimationFrame: rAF ruht in Umgebungen,
  // die nicht sichtbar rendern — genau dort wird das Netz aber gebraucht.
  const anstossen = () => {
    if (geplant) return;
    geplant = true;
    setTimeout(nachpruefen, 60);
  };
  addEventListener("scroll", anstossen, { passive: true });
  addEventListener("resize", anstossen, { passive: true });
  addEventListener("load", anstossen);
  anstossen();
}

/* ------------------------------------------- Vorher/Nachher-Vergleiche ---- */
// Der unsichtbare Range-Regler liegt über dem Bild; sein Wert steuert die
// CSS-Variable --pos (Clip-Kante, Trennlinie und Griff hängen daran).
for (const ba of document.querySelectorAll(".ba")) {
  const regler = ba.querySelector('input[type=range]');
  if (!regler) continue;
  const setzen = () => ba.style.setProperty("--pos", `${regler.value}%`);
  setzen();
  regler.addEventListener("input", setzen);
  // Tastaturbedienung ist über den Range-Input schon gegeben (Pfeiltasten).
}

/* ----------------------------------------------------------------- FAQ ---- */
for (const frage of document.querySelectorAll(".faq .q")) {
  const knopf = frage.querySelector("button");
  const antwort = frage.querySelector(".a");
  if (!knopf || !antwort) continue;
  const id = `faq-a-${Math.random().toString(36).slice(2, 8)}`;
  antwort.id = id;
  knopf.setAttribute("aria-expanded", "false");
  knopf.setAttribute("aria-controls", id);
  knopf.addEventListener("click", () => {
    const offen = frage.classList.toggle("open");
    knopf.setAttribute("aria-expanded", offen ? "true" : "false");
  });
}

/* ------------------------------------------------------------- Anfrage ---- */
const formular = $("anfrageForm");

function daten() {
  return {
    name: $("fName").value.trim(),
    buero: $("fBuero").value.trim(),
    email: $("fEmail").value.trim(),
    telefon: $("fTel").value.trim(),
    inserat: $("fInserat").value.trim(),
  };
}

function anfrageText(d) {
  return [
    "Anfrage über die Exposé-Boost-Seite",
    "",
    `Name:        ${d.name}`,
    `Maklerbüro:  ${d.buero}`,
    `E-Mail:      ${d.email}`,
    `Telefon:     ${d.telefon || "—"}`,
    `Inserat:     ${d.inserat || "—"}`,
  ].join("\n");
}

// Markiert leere Pflichtfelder rot und gibt zurück, ob alles ausgefüllt ist.
function pruefen(d) {
  let ok = true;
  const markiere = (el, schlecht) => {
    el.classList.toggle("bad", schlecht);
    if (schlecht) ok = false;
  };
  markiere($("fName"), !d.name);
  markiere($("fBuero"), !d.buero);
  markiere($("fEmail"), !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email));
  markiere($("consentWrap"), !$("fConsent").checked);
  return ok;
}

function zeigeDanke(d, perHand) {
  formular.style.display = "none";
  const text = anfrageText(d);
  $("dkWa").href = `https://wa.me/${WHATSAPP_NR}?text=${encodeURIComponent(text)}`;
  $("dkMail").href =
    `mailto:${KONTAKT_MAIL}?subject=${encodeURIComponent("Exposé-Boost-Anfrage")}` +
    `&body=${encodeURIComponent(text)}`;

  if (perHand) {
    // Versand fehlgeschlagen (Endpoint leer, offline, Limit erreicht):
    // Die Anfrage ist vorbereitet, der Makler schickt sie mit einem Tipp selbst ab.
    $("dkTitle").textContent = "Fast geschafft — ein Tipp noch.";
    $("dkText").textContent =
      "Ihre Anfrage ist fertig vorbereitet, konnte aber nicht automatisch übermittelt werden. Senden Sie sie mit einem Klick — ich melde mich innerhalb eines Werktags.";
  }
  $("danke").classList.add("on");
  $("danke").scrollIntoView({ behavior: reduziert ? "auto" : "smooth", block: "center" });
}

if (formular) {
  formular.addEventListener("submit", async (e) => {
    e.preventDefault();
    const d = daten();
    if (!pruefen(d)) {
      formular.querySelector(".bad")?.scrollIntoView({ behavior: reduziert ? "auto" : "smooth", block: "center" });
      return;
    }

    const knopf = $("btnSend");
    const beschriftung = knopf.textContent;
    knopf.disabled = true;
    knopf.textContent = "Sende …";

    let ok = false;
    if (FORMSPREE_ENDPOINT) {
      try {
        const r = await fetch(FORMSPREE_ENDPOINT, {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({
            ...d,
            message: anfrageText(d),
            _subject: `Exposé-Boost-Anfrage: ${d.buero || d.name}`,
            _replyto: d.email,
          }),
        });
        ok = r.ok;
      } catch {
        ok = false;
      }
    }

    knopf.disabled = false;
    knopf.textContent = beschriftung;
    zeigeDanke(d, !ok);
  });

  // Rote Markierung verschwindet, sobald nachgebessert wird.
  for (const feld of formular.querySelectorAll("input")) {
    feld.addEventListener("input", () => {
      feld.classList.remove("bad");
      if (feld.id === "fConsent") $("consentWrap").classList.remove("bad");
    });
  }
}
