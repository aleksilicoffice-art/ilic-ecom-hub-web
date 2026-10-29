/* EPC Evolution · Variante A — Verhalten
   Grundsatz: Alles ist ohne JavaScript und ohne Bewegung sichtbar.
   Bewegung legt sich nur darüber (?statisch oder reduzierte Bewegung = keine). */
(function () {
  "use strict";
  var doc = document.documentElement;
  var statisch = /[?&]statisch/.test(location.search) ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (statisch) doc.classList.add("statisch");

  /* ---------- Kopf: Linie nach dem ersten Scrollen ---------- */
  var kopf = document.querySelector(".kopf");
  function kopfPruefen() { if (kopf) kopf.classList.toggle("gescrollt", window.scrollY > 8); }
  kopfPruefen();
  window.addEventListener("scroll", kopfPruefen, { passive: true });

  /* ---------- Menü (schmale Bildschirme) ---------- */
  var menueKnopf = document.querySelector(".menue-knopf");
  var menue = document.getElementById("menue");
  function menueSetzen(offen) {
    if (!menueKnopf || !menue) return;
    /* Menüinhalt beginnt unter dem Kopf, wo auch immer der gerade steht (Entwurfsleiste, Scrollstand) */
    if (offen) menue.style.paddingTop = Math.round(kopf.getBoundingClientRect().bottom + 28) + "px";
    menueKnopf.setAttribute("aria-expanded", String(offen));
    menueKnopf.querySelector("span").textContent = offen ? "Schließen" : "Menü";
    menue.classList.toggle("offen", offen);
    kopf.classList.toggle("menue-auf", offen);
    document.body.style.overflow = offen ? "hidden" : "";
    if (offen) { var erster = menue.querySelector("a"); if (erster) erster.focus(); }
  }
  if (menueKnopf) {
    menueKnopf.addEventListener("click", function () {
      menueSetzen(menueKnopf.getAttribute("aria-expanded") !== "true");
    });
    menue.addEventListener("click", function (e) { if (e.target.closest("a")) menueSetzen(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menueKnopf.getAttribute("aria-expanded") === "true") { menueSetzen(false); menueKnopf.focus(); }
    });
  }

  /* ---------- Anliegen: Auswahl im Einstieg → Formular ---------- */
  var auswahl = document.getElementById("formAnliegen");
  function anliegenSetzen(wert) {
    if (!auswahl || !wert) return;
    for (var i = 0; i < auswahl.options.length; i++) {
      if (auswahl.options[i].value === wert) { auswahl.selectedIndex = i; break; }
    }
  }
  document.querySelectorAll('input[name="anliegen"]').forEach(function (r) {
    r.addEventListener("change", function () { anliegenSetzen(r.value); });
  });
  var heroAktion = document.getElementById("heroAktion");
  if (heroAktion) heroAktion.addEventListener("click", function () {
    var gew = document.querySelector('input[name="anliegen"]:checked');
    if (gew) anliegenSetzen(gew.value);
  });
  /* Anliegen über die Adresse (#kontakt?thema=…) vorbelegen, z. B. von den Bereichsseiten */
  var thema = (location.search.match(/thema=([a-z-]+)/) || [])[1];
  if (thema) anliegenSetzen(thema);

  /* ---------- Bereiche: Vorschaubild folgt der Zeile ---------- */
  var vorschau = document.querySelector(".bereiche-vorschau");
  if (vorschau) {
    var bilder = vorschau.querySelectorAll("img");
    var zeilen = document.querySelectorAll(".bereich[data-bild]");
    function aktivieren(zeile) {
      var ziel = zeile.getAttribute("data-bild");
      bilder.forEach(function (b) { b.classList.toggle("aktiv", b.getAttribute("data-bild") === ziel); });
      zeilen.forEach(function (z) { z.classList.toggle("aktiv", z === zeile); });
      var unter = vorschau.querySelector("figcaption");
      if (unter) unter.textContent = zeile.getAttribute("data-unterschrift") || "";
    }
    zeilen.forEach(function (z) {
      z.addEventListener("mouseenter", function () { aktivieren(z); });
      z.addEventListener("focus", function () { aktivieren(z); });
    });
  }

  /* ---------- Formular (Entwurf: noch ohne Versand) ---------- */
  var formular = document.getElementById("anfrage");
  if (formular) {
    formular.addEventListener("submit", function (e) {
      e.preventDefault();
      var meldung = document.getElementById("formMeldung");
      var pflicht = formular.querySelectorAll("[required]");
      var ok = true;
      pflicht.forEach(function (f) {
        var leer = !f.value.trim();
        f.setAttribute("aria-invalid", leer ? "true" : "false");
        if (leer && ok) { f.focus(); ok = false; }
      });
      if (!ok) { meldung.textContent = "Bitte füllen Sie die markierten Felder aus."; return; }
      var mail = formular.querySelector('input[type="email"]');
      if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail.value.trim())) {
        mail.setAttribute("aria-invalid", "true"); mail.focus();
        meldung.textContent = "Bitte prüfen Sie die E-Mail-Adresse.";
        return;
      }
      meldung.textContent = "Im Entwurf noch ohne Versand. In der fertigen Seite geht Ihre Anfrage direkt an EPC.";
    });
  }

  /* ---------- Bewegung ---------- */
  if (statisch || !window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  if (window.DrawSVGPlugin) gsap.registerPlugin(DrawSVGPlugin);

  /* Bildtafel im Einstieg öffnet sich von unten, Überschrift setzt sich */
  var tafel = document.querySelector(".einstieg-bild .bildtafel");
  if (tafel) {
    gsap.fromTo(tafel, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.6, ease: "expo.out", delay: .15 });
    gsap.fromTo(tafel.querySelector("img"), { scale: 1.12 }, { scale: 1, duration: 2.4, ease: "expo.out", delay: .15 });
  }
  var h1 = document.querySelector(".einstieg h1");
  if (h1) gsap.from(h1, { y: 18, opacity: 0, duration: 1.2, ease: "expo.out", delay: .25 });

  /* Das Netz zeichnet sich: erst die Mitte, dann die Linie zu „Sie“, dann Fachleute und Partner.
     Breit und hochkant (bis 1100 px) gibt es je eine eigene Grafik, gezeichnet wird die sichtbare. */
  if (window.DrawSVGPlugin) {
    gsap.matchMedia().add({ breit: "(min-width: 1101px)", hoch: "(max-width: 1100px)" }, function (ctx) {
      var breit = ctx.conditions.breit;
      var netz = document.querySelector(breit ? ".netz-breit" : ".netz-hoch");
      if (!netz) return;
      var tl = gsap.timeline({ scrollTrigger: { trigger: netz, start: "top 78%", once: true } });
      tl.from(netz.querySelectorAll(".mitte-rahmen, .mitte-innen"), { drawSVG: 0, duration: 1.1, ease: "power2.inOut" })
        .from(netz.querySelectorAll(".mitte-text"), { opacity: 0, duration: .6 }, "-=.4")
        .from(netz.querySelector(".linie.sie"), { drawSVG: 0, duration: .8, ease: "power2.out" }, "-=.2")
        .from(netz.querySelector(".sie-text"), { opacity: 0, x: breit ? -10 : 0, y: breit ? 0 : -8, duration: .6, ease: "power2.out" }, "-=.4")
        .from(netz.querySelectorAll(".linie.zu:not(.pruef)"), { drawSVG: 0, duration: .8, ease: "power2.out", stagger: .08 }, "-=.1")
        /* gestrichelt: einblenden, denn drawSVG würde das Strichmuster überschreiben */
        .from(netz.querySelector(".linie.pruef"), { opacity: 0, duration: .6, ease: "power2.out" }, "<.24")
        .from(netz.querySelectorAll(".knoten"), { opacity: 0, scale: .7, transformOrigin: "50% 50%", duration: .5, ease: "power3.out", stagger: .12 }, "-=.9")
        .from(netz.querySelectorAll(".knoten-text"), { opacity: 0, y: 6, duration: .6, ease: "power2.out", stagger: .12 }, "-=1.1");
    });
  }

  /* Ablauf: der goldene Faden folgt dem Lesen */
  var faden = document.querySelector(".schritte .faden");
  if (faden) {
    gsap.fromTo(faden, { scaleY: 0 }, {
      scaleY: 1, ease: "none",
      scrollTrigger: { trigger: ".schritte", start: "top 65%", end: "bottom 60%", scrub: .6 }
    });
  }

  window.addEventListener("load", function () {
    ScrollTrigger.refresh();
    /* refresh() misst bei Position 0 und stellt danach einen alten Stand her:
       Sprungziele aus der Adresse (#kontakt, #ablauf …) danach erneut anfahren */
    if (location.hash.length > 1) {
      var ziel = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (ziel) ziel.scrollIntoView({ behavior: "instant", block: "start" });
    }
  });
})();
