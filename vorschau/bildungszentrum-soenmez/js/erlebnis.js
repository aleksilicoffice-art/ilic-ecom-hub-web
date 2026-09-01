/* ============================================================
   BAUKASTEN · erlebnis.js — der generische GSAP-Kern
   ============================================================
   Übernimmt alles, was auf jeder Erlebnis-Seite gleich ist. Die Seite
   selbst schreibt nur noch ihre Szenen:

     <script src="js/gsap.min.js"></script>
     <script src="js/ScrollTrigger.min.js"></script>
     <script src="js/DrawSVGPlugin.min.js"></script>
     <script src="js/SplitText.min.js"></script>
     <script src="js/erlebnis.js"></script>
     <script>
       ERLEBNIS.start({
         rating: 4.8,                       // Zähler im Stimmen-Block (optional)
         szenen: function(h){               // eigene GSAP-Szenen der Seite
           // h.q, h.kompakt(), h.strecke(mobil, desktop) stehen bereit
         }
       });
     </script>

   Fallbacks: reduced-motion oder fehlendes GSAP → html.statisch, alles
   sichtbar ohne Animation. Loader hat Klick-Skip + 4200-ms-Notbremse.
   Herkunft: destilliert aus kamm2karim (05.08.2026).                     */

(function () {
  var docEl = document.documentElement;

  function start(opt) {
    opt = opt || {};
    // ?statisch in der URL erzwingt den animationsfreien Pfad — zum Prüfen
    // des Fallbacks, ohne Systemeinstellungen umzustellen.
    var reduziert = window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      /[?&]statisch/.test(location.search);

    /* Heutigen Wochentag markieren — läuft auch im statischen Modus */
    var heute = new Date().getDay();
    var zeile = document.querySelector('.zeiten div[data-tag="' + heute + '"]');
    if (zeile) zeile.classList.add("heute");

    if (reduziert || !window.gsap || !window.ScrollTrigger) {
      docEl.classList.add("statisch");
      docEl.classList.remove("laden");
      return;
    }

    var plugins = [ScrollTrigger];
    if (window.DrawSVGPlugin) plugins.push(DrawSVGPlugin);
    if (window.SplitText) plugins.push(SplitText);
    gsap.registerPlugin.apply(gsap, plugins);
    ScrollTrigger.config({ ignoreMobileResize: true });
    gsap.defaults({ ease: "none" });

    var h = {
      q: function (s) { return document.querySelector(s); },
      kompakt: function () { return window.innerWidth < 960; },
      strecke: function (mobil, desktop) {
        return function () { return "+=" + (h.kompakt() ? mobil : desktop) + "%"; };
      },
    };

    /* ---------- Loader ---------- */
    function loaderFertig() {
      docEl.classList.remove("laden");
      var l = h.q("#loader");
      if (l) l.style.display = "none";
      ScrollTrigger.refresh();
    }
    var loaderEl = h.q("#loader");
    if (!loaderEl || window.scrollY > 60) {
      loaderFertig();
    } else {
      var lt = gsap.timeline({ onComplete: loaderFertig });
      /* Ring zeichnet sich; das Motiv IM Ring animiert die Seite selbst
         über opt.loader(lt), eingefügt nach dem Ring. */
      if (loaderEl.querySelector(".lader-ring .ring") && window.DrawSVGPlugin) {
        lt.from(".lader-ring .ring", { drawSVG: 0, duration: 0.7, ease: "power2.inOut" });
      }
      if (typeof opt.loader === "function") opt.loader(lt, h);
      lt.from(".lade-zeile span, .lade-zeile em", { yPercent: 130, stagger: 0.07, duration: 0.5, ease: "power4.out" }, 0.55)
        .from(".lade-ort", { autoAlpha: 0, duration: 0.35 }, 0.8)
        .to("#loader", { yPercent: -100, duration: 0.7, ease: "power4.inOut" }, "+=0.3");
      loaderEl.addEventListener("click", function () { lt.progress(1); });
      setTimeout(function () { if (docEl.classList.contains("laden")) lt.progress(1); }, 4200);
    }

    /* ---------- Fortschrittsbalken ---------- */
    if (h.q("#fortschritt")) {
      gsap.to("#fortschritt", { scaleX: 1, scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });
    }

    /* ---------- Headline-Reveals (.split) ---------- */
    if (window.SplitText) {
      document.fonts.ready.then(function () {
        document.querySelectorAll(".split").forEach(function (el) {
          var sp = SplitText.create(el, { type: "words", mask: "words" });
          gsap.from(sp.words, {
            yPercent: 115, stagger: 0.06, duration: 0.7, ease: "power4.out",
            scrollTrigger: { trigger: el, start: "top 82%", once: true },
          });
        });
      });
    }

    /* ---------- Stimmen (Zähler, Sterne, Zitate) ---------- */
    var zahlEl = h.q(".rating .zahl");
    if (zahlEl && opt.rating) {
      var zahlObj = { v: 0 };
      gsap.to(zahlObj, {
        v: opt.rating, duration: 1.2, ease: "power2.out",
        scrollTrigger: { trigger: "#stimmen", start: "top 70%", once: true },
        onUpdate: function () { zahlEl.textContent = zahlObj.v.toFixed(1).replace(".", ","); },
      });
      gsap.from(".sterne svg", {
        scale: 0, transformOrigin: "center", stagger: 0.09, duration: 0.45, ease: "back.out(2.2)",
        scrollTrigger: { trigger: "#stimmen", start: "top 70%", once: true },
      });
      gsap.from(".zitat", {
        y: 46, autoAlpha: 0, stagger: 0.14, duration: 0.7, ease: "power3.out",
        scrollTrigger: { trigger: ".zitate", start: "top 82%", once: true },
      });
    }

    /* ---------- Szenen der Seite ---------- */
    if (typeof opt.szenen === "function") opt.szenen(h);

    /* ---------- Failsafe ---------- */
    window.addEventListener("load", function () { ScrollTrigger.refresh(); });
  }

  window.ERLEBNIS = { start: start };
})();
