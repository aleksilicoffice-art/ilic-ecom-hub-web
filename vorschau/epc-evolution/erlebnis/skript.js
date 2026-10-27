/* EPC Evolution · Variante B — Szenenregie
   Grundsatz: Die Seite ist ohne JS, mit ?statisch und mit reduzierter Bewegung
   vollständig lesbar. Kino-Szenen (Pinning, horizontale Fahrt, Filmrolle)
   entstehen nur mit GSAP, erlaubter Bewegung und ab 901 px Breite. */
(function () {
  "use strict";
  var doc = document.documentElement;
  var statisch = doc.classList.contains("statisch") || /[?&]statisch/.test(location.search) ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (statisch) doc.classList.add("statisch");

  function q(s, r) { return (r || document).querySelector(s); }
  function qa(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* ---------- Kopf ---------- */
  var kopf = q(".kopf");
  function kopfPruefen() { if (kopf) kopf.classList.toggle("gescrollt", window.scrollY > 40); }
  kopfPruefen();
  window.addEventListener("scroll", kopfPruefen, { passive: true });

  /* ---------- Menü ---------- */
  var menueKnopf = q(".menue-knopf"), menue = q("#menue");
  function menueSetzen(offen) {
    menueKnopf.setAttribute("aria-expanded", String(offen));
    menueKnopf.querySelector("span").textContent = offen ? "Schließen" : "Menü";
    menue.classList.toggle("offen", offen);
    kopf.classList.toggle("menue-auf", offen);
    document.body.style.overflow = offen ? "hidden" : "";
    if (offen) { var a = menue.querySelector("a"); if (a) a.focus(); }
  }
  if (menueKnopf && menue) {
    menueKnopf.addEventListener("click", function () { menueSetzen(menueKnopf.getAttribute("aria-expanded") !== "true"); });
    menue.addEventListener("click", function (e) { if (e.target.closest("a")) menueSetzen(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menueKnopf.getAttribute("aria-expanded") === "true") { menueSetzen(false); menueKnopf.focus(); }
    });
  }

  /* ---------- Anliegen vorbelegen (?thema=…) + Formular (Entwurf) ---------- */
  var auswahl = q("#formAnliegen");
  var thema = (location.search.match(/thema=([a-z-]+)/) || [])[1];
  if (auswahl && thema) {
    for (var i = 0; i < auswahl.options.length; i++) if (auswahl.options[i].value === thema) auswahl.selectedIndex = i;
  }
  var formular = q("#anfrage");
  if (formular) formular.addEventListener("submit", function (e) {
    e.preventDefault();
    var meldung = q("#formMeldung"), ok = true;
    qa("[required]", formular).forEach(function (f) {
      var leer = !f.value.trim();
      f.setAttribute("aria-invalid", leer ? "true" : "false");
      if (leer && ok) { f.focus(); ok = false; }
    });
    if (!ok) { meldung.textContent = "Bitte füllen Sie die markierten Felder aus."; return; }
    var mail = q('input[type="email"]', formular);
    if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail.value.trim())) {
      mail.setAttribute("aria-invalid", "true"); mail.focus();
      meldung.textContent = "Bitte prüfen Sie die E-Mail-Adresse.";
      return;
    }
    meldung.textContent = "Im Entwurf noch ohne Versand. In der fertigen Seite geht Ihre Anfrage direkt an EPC.";
  });

  /* ---------- Bereichsseite: Bild folgt der Leistung (auch ohne Bewegung) ---------- */
  var lBild = q(".leistungen-bild");
  if (lBild && "IntersectionObserver" in window) {
    var lImgs = qa("img", lBild);
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (en) {
        if (!en.isIntersecting) return;
        var ziel = en.target.getAttribute("data-bild");
        lImgs.forEach(function (b) { b.classList.toggle("aktiv", b.getAttribute("data-bild") === ziel); });
      });
    }, { rootMargin: "-45% 0px -45% 0px" });
    qa(".leistung[data-bild]").forEach(function (l) { io.observe(l); });
  }

  /* ---------- ohne Bewegung: hier ist Schluss ---------- */
  function ladenBeenden() {
    if (doc.classList.contains("laden")) { try { sessionStorage.setItem("epc-ladebild", "1"); } catch (e) {} }
    doc.classList.remove("laden");
    var l = q("#loader"); if (l) l.style.display = "none";
  }
  if (statisch || !window.gsap || !window.ScrollTrigger) { ladenBeenden(); return; }

  gsap.registerPlugin(ScrollTrigger);
  if (window.DrawSVGPlugin) gsap.registerPlugin(DrawSVGPlugin);
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* ---------- Ladebild: der Rahmen zeichnet sich, das Logo erscheint ---------- */
  var loader = q("#loader");
  function auftaktStarten() {
    var bild = q(".auftakt .szene-bild img");
    if (bild) gsap.fromTo(bild, { scale: 1.12 }, { scale: 1, duration: 2.6, ease: "expo.out" });
    var zeilen = qa(".auftakt .szene-inhalt > *");
    if (zeilen.length) gsap.from(zeilen, { y: 26, opacity: 0, duration: 1.2, ease: "expo.out", stagger: .09, delay: .1, clearProps: "opacity,transform" });
  }
  if (loader && doc.classList.contains("laden")) {
    var lt = gsap.timeline({ onComplete: function () { ladenBeenden(); ScrollTrigger.refresh(); } });
    var rahmen = q(".rahmen", loader), fuellung = q(".logo-fuellung", loader);
    if (rahmen && window.DrawSVGPlugin) lt.from(rahmen, { drawSVG: 0, duration: .9, ease: "power2.inOut" });
    if (fuellung) lt.from(fuellung, { opacity: 0, duration: .6, ease: "power1.out" }, "-=.2");
    lt.to(loader, { yPercent: -100, duration: .9, ease: "expo.inOut" }, "+=.35")
      .add(auftaktStarten, "-=.55");
    loader.addEventListener("click", function () { lt.progress(1); });
    setTimeout(function () { if (doc.classList.contains("laden")) lt.progress(1); }, 4200);
  } else {
    ladenBeenden();
    auftaktStarten();
  }

  /* ---------- Fortschritt ---------- */
  if (q("#fortschritt")) gsap.to("#fortschritt", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: .3 } });

  /* ---------- Auftakt: das Bild sinkt, der Titel zieht sich zurück ---------- */
  var auftakt = q(".auftakt");
  if (auftakt) {
    gsap.to(".auftakt .szene-bild", { yPercent: 14, ease: "none", scrollTrigger: { trigger: auftakt, start: "top top", end: "bottom top", scrub: true } });
    gsap.to(".auftakt .szene-inhalt", { opacity: 0, y: -40, ease: "none", scrollTrigger: { trigger: auftakt, start: "35% top", end: "85% top", scrub: true } });
  }

  /* ---------- Kapitelkopf der Bereichsseite ---------- */
  var kk = q(".kapitel-kopf");
  if (kk) {
    gsap.fromTo(".kapitel-kopf .szene-bild img", { scale: 1.1 }, { scale: 1, duration: 2.4, ease: "expo.out" });
    gsap.to(".kapitel-kopf .szene-bild", { yPercent: 12, ease: "none", scrollTrigger: { trigger: kk, start: "top top", end: "bottom top", scrub: true } });
  }

  /* ---------- Kino-Szenen nur auf breiten Bildschirmen ---------- */
  var mm = gsap.matchMedia();
  /* Prinzip-Szene erst ab 1101 px: darunter wäre die Netzgrafik zu klein, dort steht die Liste */
  mm.add("(min-width: 1101px)", function () {
    var prinzip = q(".prinzip"), netz = q(".prinzip .netz svg");
    if (prinzip && netz && window.DrawSVGPlugin) {
      var tp = gsap.timeline({ scrollTrigger: { trigger: prinzip, start: "top top", end: "+=140%", scrub: .8, pin: true, anticipatePin: 1 } });
      tp.from(qa(".mitte-rahmen, .mitte-innen", netz), { drawSVG: 0, duration: 1 })
        .from(qa(".mitte-text", netz), { opacity: 0, duration: .5 }, "-=.3")
        .from(q(".linie.sie", netz), { drawSVG: 0, duration: .8 })
        .from(q(".sie-text", netz), { opacity: 0, duration: .4 }, "-=.4")
        .from(qa(".linie.zu", netz), { drawSVG: 0, duration: .8, stagger: .16 })
        .from(qa(".knoten", netz), { opacity: 0, scale: .7, transformOrigin: "50% 50%", duration: .4, stagger: .16 }, "-=1.2")
        .from(qa(".knoten-text", netz), { opacity: 0, duration: .4, stagger: .16 }, "-=1.2")
        .from(qa(".prinzip-kopf p, .prinzip-kopf .legende"), { opacity: 0, y: 16, duration: .7, stagger: .15 }, "-=.4")
        .to({}, { duration: .8 });
    }
  });

  mm.add("(min-width: 901px)", function () {
    doc.classList.add("kino");

    /* Bereiche: horizontale Fahrt durch vier Tafeln */
    var wrap = q(".bereiche-wrap"), bahn = q(".bahn");
    if (wrap && bahn) {
      var strecke = function () { return bahn.scrollWidth - window.innerWidth; };
      var fahrt = gsap.to(bahn, {
        x: function () { return -strecke(); }, ease: "none",
        scrollTrigger: { trigger: wrap, start: "top top", end: function () { return "+=" + strecke(); }, scrub: .6, pin: true, anticipatePin: 1, invalidateOnRefresh: true,
          snap: { snapTo: 1 / (qa(".tafel", bahn).length - 1), duration: { min: .35, max: .9 }, delay: .15, inertia: false, ease: "power2.inOut" } }
      });
      /* Tastatur: ein fokussierter Link in einer Tafel holt diese Tafel ins Bild */
      var tafeln = qa(".tafel", bahn);
      bahn.addEventListener("focusin", function (e) {
        var t = e.target.closest(".tafel"); if (!t) return;
        var st = fahrt.scrollTrigger, i = tafeln.indexOf(t);
        if (!st || i < 0) return;
        window.scrollTo({ top: st.start + (st.end - st.start) * (i / (tafeln.length - 1)), behavior: "instant" });
      });
      tafeln.forEach(function (t) {
        var bild = q(".szene-bild img", t);
        if (bild) gsap.fromTo(bild, { xPercent: -8, scale: 1.12 }, { xPercent: 8, scale: 1.12, ease: "none",
          scrollTrigger: { trigger: t, containerAnimation: fahrt, start: "left right", end: "right left", scrub: true } });
        gsap.from(q(".tafel-inhalt", t), { opacity: 0, y: 30, ease: "none",
          scrollTrigger: { trigger: t, containerAnimation: fahrt, start: "left 70%", end: "left 25%", scrub: true } });
      });
    }

    /* Mandat: gepinnte Filmrolle, ein Schritt nach dem anderen */
    var mandat = q(".mandat"), anzeige = q(".rolle-anzeige");
    var schritte = qa(".rolle li");
    if (mandat && anzeige && schritte.length) {
      var nrEl = q(".gross-nr", anzeige), wechsel = q(".wechsel", anzeige), striche = qa(".skala i", anzeige);
      var aktuell = -1;
      var setzen = function (i) {
        if (i === aktuell) return;
        aktuell = i;
        var li = schritte[i];
        wechsel.classList.add("raus");
        setTimeout(function () {
          nrEl.textContent = String(i + 1);
          q("h3", wechsel).textContent = q("h3", li).textContent;
          q("p", wechsel).textContent = q("p", li).textContent;
          wechsel.classList.remove("raus");
        }, 220);
        striche.forEach(function (s, k) { s.classList.toggle("an", k <= i); });
      };
      setzen(0);
      ScrollTrigger.create({
        trigger: mandat, start: "top top", end: "+=" + (schritte.length * 55) + "%", pin: true, anticipatePin: 1,
        onUpdate: function (self) { setzen(Math.min(schritte.length - 1, Math.floor(self.progress * schritte.length * 0.999))); }
      });
    }

    return function () { doc.classList.remove("kino"); };
  });

  mm.add("(max-width: 1100px)", function () {
    qa(".netz-liste .ebene").forEach(function (e, i) {
      gsap.from(e, { opacity: 0, x: -10, duration: .7, ease: "power2.out", delay: i * .08,
        scrollTrigger: { trigger: e, start: "top 88%", once: true } });
    });
  });

  /* ---------- Spirale (nach den Pins anlegen, sonst stimmen die Positionen nicht) dreht sich mit dem Lesen ---------- */
  var spirale = q(".spirale img");
  if (spirale) gsap.fromTo(spirale, { rotate: -18 }, { rotate: 24, ease: "none", scrollTrigger: { trigger: ".evolution", start: "top bottom", end: "bottom top", scrub: true } });

  /* ---------- Titelkarte der Bereichsseite ---------- */
  qa(".titelkarte p").forEach(function (p) {
    gsap.from(p, { opacity: .15, y: 30, ease: "none", scrollTrigger: { trigger: p, start: "top 85%", end: "top 45%", scrub: true } });
  });

  ScrollTrigger.sort();
  window.addEventListener("load", function () {
    ScrollTrigger.refresh();
    /* refresh() misst bei Position 0 und stellt danach einen alten Stand her:
       Sprungziele aus der Adresse danach erneut anfahren */
    if (location.hash.length > 1) {
      var ziel = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (ziel) ziel.scrollIntoView({ behavior: "instant", block: "start" });
    }
  });
})();
