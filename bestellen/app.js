// Bestellseite — Konfigurator, Live-Preis & Versand. Reines ES-Modul, kein Build.
// Preise/Logik kommen aus ./katalog.js (öffentliche Kopie von cockpit/templates/angebot.js).

import { PAKETE, UPSELLS, ABOS, getPaket, getAbo, berechneSummen, eur } from "./katalog.js";

/* ============================================================================
   >>> VON ALEKS ZU PFLEGEN — die einzigen zwei Stellen: <<<

   1) FORMSPREE_ENDPOINT — Formular-Versand.
      Kostenloses Formular auf formspree.io anlegen → URL hier eintragen,
      z. B. "https://formspree.io/f/abcdwxyz".
      SOLANGE LEER: Fallback öffnet das E-Mail-Programm des Kunden mit fertig
      ausgefülltem Text an KONTAKT_MAIL — kein Lead geht verloren.

   2) PAY_LINK — Bezahllink für die Anzahlung (Stripe/PayPal), kommt SPÄTER.
      Laut Prozess wird der Link NACH der Demo per E-Mail verschickt.
      Wenn hier trotzdem ein Link steht, zeigt der Danke-Screen zusätzlich
      einen optionalen "Anzahlung direkt sichern"-Button für ganz Eilige.
   ============================================================================ */
const FORMSPREE_ENDPOINT = "https://formspree.io/f/mykanorw";
const PAY_LINK = "";
const KONTAKT_MAIL = "kontakt@ilic-ecomhub.de";

// 3) CAL_LINK — Cal.com-Termin am Ende (Danke-Screen). Form "username/event-slug".
//    Buchungen landen automatisch in Aleks' Google-Kalender + Bestätigungsmail.
//    LEER lassen → kein Kalender, Danke-Screen bleibt unverändert.
const CAL_LINK = "aleksandar-ilic-9nquq7/kennenlernen-demo-zusammen-anschauen";

const $ = (id) => document.getElementById(id);
const ANZAHLUNG_PROZENT = 50;   // wie im Angebots-Standard (Cockpit/AGB: bis zu 50 %)

// ---- Auswahl-Zustand des Konfigurators ----
const state = {
  step: 1,
  paketId: "standard",
  addons: [],        // Upsell-IDs
  aboId: "",
  aboLaufzeit: 12,
  ziele: [],         // Mehrfachauswahl Chips
};

const STEP_TITLES = { 1: "Dein Betrieb", 2: "Paket wählen", 3: "Extras & Pflege", 4: "Deine Wünsche", 5: "Kontakt", 6: "Zusammenfassung" };
const LAST = 6;

// ============================== Seiten-Basics ==============================
$("yr").textContent = new Date().getFullYear();

const hd = $("hd");
addEventListener("scroll", () => hd.classList.toggle("scrolled", scrollY > 10), { passive: true });

$("faq").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (btn) btn.closest(".q").classList.toggle("open");
});

// Referenzen: „Mehr Branchen anzeigen" blendet die restlichen Demo-Karten ein
$("refMoreBtn")?.addEventListener("click", () => {
  document.querySelectorAll(".ref.hidden").forEach((el) => el.classList.remove("hidden"));
  $("refMore").style.display = "none";
});

// ============================== Preis-Karten (Sektion „Preise") ==============================
function renderPlans() {
  $("planCards").innerHTML = PAKETE.map((p) => `
    <div class="plan${p.beliebt ? " pop" : ""}">
      ${p.beliebt ? `<span class="tag">Beliebt</span>` : ""}
      <div class="pn">${p.name}</div>
      <div class="pp">${eur(p.preis)} <small>einmalig</small></div>
      <div class="pd">${p.kurz}</div>
      <ul>${p.text.split("·").map((f) => `<li>${f.trim()}</li>`).join("")}</ul>
      <a class="btn ghost full" href="#konfigurator" data-pak="${p.id}">Dieses Paket wählen →</a>
    </div>`).join("");
}
// Klick auf eine Preis-Karte wählt das Paket direkt im Konfigurator vor
$("planCards").addEventListener("click", (e) => {
  const a = e.target.closest("[data-pak]");
  if (a) { state.paketId = a.dataset.pak; renderPaketPick(); updatePrice(); }
});

// ============================== Konfigurator: Auswahl-UI ==============================
function renderPaketPick() {
  $("pakPick").innerHTML = PAKETE.map((p) => `
    <label class="pk${state.paketId === p.id ? " sel" : ""}">
      <input type="radio" name="paket" value="${p.id}" ${state.paketId === p.id ? "checked" : ""}>
      <span class="pkt"><b>${p.name}</b>${p.beliebt ? `<span class="pop-tag">Beliebt</span>` : ""}<small>${p.kurz}</small></span>
      <span class="pkp">${eur(p.preis)}</span>
    </label>`).join("");
}
$("pakPick").addEventListener("change", (e) => {
  if (e.target.name === "paket") { state.paketId = e.target.value; renderPaketPick(); updatePrice(); }
});

function renderUpsells() {
  $("upPick").innerHTML = UPSELLS.map((u) => `
    <label class="pk${state.addons.includes(u.id) ? " sel" : ""}">
      <input type="checkbox" value="${u.id}" ${state.addons.includes(u.id) ? "checked" : ""}>
      <span class="pkt"><b>${u.name}</b><small>${u.info}</small></span>
      <span class="pkp">+ ${eur(u.preis)}</span>
    </label>`).join("");
}
$("upPick").addEventListener("change", (e) => {
  const id = e.target.value;
  if (e.target.checked) { if (!state.addons.includes(id)) state.addons.push(id); }
  else state.addons = state.addons.filter((x) => x !== id);
  e.target.closest(".pk").classList.toggle("sel", e.target.checked);
  updatePrice();
});

function renderAbo() {
  $("fAbo").innerHTML = ABOS.map((a) => {
    const lbl = a.id ? `${a.name} — ab ${eur(a.staffel[12])}/Mon.` : a.name;
    return `<option value="${a.id}"${state.aboId === a.id ? " selected" : ""}>${lbl}</option>`;
  }).join("");
}
$("fAbo").addEventListener("change", (e) => {
  state.aboId = e.target.value;
  $("aboLzWrap").style.display = state.aboId ? "block" : "none";
  updatePrice();
});
$("fAboLz").addEventListener("change", (e) => { state.aboLaufzeit = Number(e.target.value); updatePrice(); });

$("zielChips").addEventListener("click", (e) => {
  const c = e.target.closest(".chip");
  if (!c) return;
  c.classList.toggle("sel");
  const v = c.dataset.v;
  if (c.classList.contains("sel")) { if (!state.ziele.includes(v)) state.ziele.push(v); }
  else state.ziele = state.ziele.filter((x) => x !== v);
});

// ============================== Preis-Logik ==============================
function docData() {
  return {
    paketPreis: getPaket(state.paketId).preis,
    addons: UPSELLS.filter((u) => state.addons.includes(u.id)),
    rabatt: 0,
    anzahlungProzent: ANZAHLUNG_PROZENT,
  };
}
function updatePrice() {
  const s = berechneSummen(docData());
  $("wzPrice").textContent = eur(s.einmalGesamt);
}

// ============================== Wizard-Navigation ==============================
function showStep(n) {
  state.step = n;
  document.querySelectorAll(".wz-step").forEach((el) => el.classList.toggle("on", Number(el.dataset.step) === n));
  $("wzNum").textContent = n;
  $("wzTitle").textContent = STEP_TITLES[n];
  $("wzBar").style.width = (n / LAST) * 100 + "%";
  $("btnBack").style.visibility = n === 1 ? "hidden" : "visible";
  $("btnNext").innerHTML = n === LAST ? "🚀 Kostenlose Demo anfordern" : "Weiter →";
  if (n === LAST) renderSummary();
}

function markBad(el, bad) { el.classList.toggle("bad", bad); }
function validateStep(n) {
  let ok = true;
  if (n === 1) {
    [["fBetrieb", (v) => v.trim()], ["fOrt", (v) => v.trim()], ["fBranche", (v) => v]].forEach(([id, t]) => {
      const el = $(id), good = !!t(el.value);
      markBad(el, !good); if (!good) ok = false;
    });
  }
  if (n === 5) {
    const name = $("fName"), mail = $("fEmail"), consent = $("fConsent");
    markBad(name, !name.value.trim()); if (!name.value.trim()) ok = false;
    const mailOk = /^\S+@\S+\.\S+$/.test(mail.value.trim());
    markBad(mail, !mailOk); if (!mailOk) ok = false;
    consent.closest(".consent").classList.toggle("bad", !consent.checked);
    if (!consent.checked) ok = false;
  }
  return ok;
}
// Fehler-Markierung verschwindet, sobald der Kunde korrigiert
document.querySelectorAll(".wz-body input, .wz-body select").forEach((el) => {
  el.addEventListener("input", () => { el.classList.remove("bad"); el.closest(".consent")?.classList.remove("bad"); });
});

$("btnBack").addEventListener("click", () => { if (state.step > 1) showStep(state.step - 1); });
$("btnNext").addEventListener("click", () => {
  if (!validateStep(state.step)) return;
  if (state.step < LAST) showStep(state.step + 1);
  else submitAnfrage();
});

// ============================== Zusammenfassung ==============================
function leadDaten() {
  const s = berechneSummen(docData());
  const abo = getAbo(state.aboId);
  return {
    betrieb: $("fBetrieb").value.trim(), ort: $("fOrt").value.trim(), branche: $("fBranche").value,
    paket: getPaket(state.paketId).name, paketPreis: getPaket(state.paketId).preis,
    extras: UPSELLS.filter((u) => state.addons.includes(u.id)).map((u) => `${u.name} (${eur(u.preis)})`).join(", ") || "keine",
    abo: abo.id ? `${abo.name}, ${state.aboLaufzeit} Monate, ${eur(abo.staffel[state.aboLaufzeit])}/Mon.` : "kein Abo",
    ziele: state.ziele.join(", ") || "—", stil: $("fStil").value.trim() || "—", inhalte: $("fInhalte").value || "—",
    name: $("fName").value.trim(), email: $("fEmail").value.trim(), tel: $("fTel").value.trim() || "—",
    einmalGesamt: s.einmalGesamt, anzahlung: s.anzahlung, rest: s.rest,
  };
}

function renderSummary() {
  const d = leadDaten();
  const s = berechneSummen(docData());
  const abo = getAbo(state.aboId);
  const addonRows = UPSELLS.filter((u) => state.addons.includes(u.id))
    .map((u) => `<div class="li"><span>${u.name}</span><b>${eur(u.preis)}</b></div>`).join("");
  $("sumBox").innerHTML = `
    <div class="li"><span><b>${d.betrieb || "—"}</b><small>${d.ort}${d.branche ? " · " + d.branche : ""}</small></span></div>
    <div class="li"><span>${d.paket}<small>${getPaket(state.paketId).kurz}</small></span><b>${eur(s.paketPreis)}</b></div>
    ${addonRows}
    ${abo.id ? `<div class="li abo"><span>Pflege-Abo: ${abo.name} · ${state.aboLaufzeit} Monate<small>${abo.inhalt}</small></span><b>${eur(abo.staffel[state.aboLaufzeit])}/Mon.</b></div>` : ""}
    <div class="li tot"><span>Einmalig gesamt</span><b>${eur(s.einmalGesamt)}</b></div>
    <div class="li abo"><span>Nach der Demo: ${s.proz} % Anzahlung<small>Rest (${eur(s.rest)}) erst bei Live-Schaltung</small></span><b>${eur(s.anzahlung)}</b></div>`;
}

// ============================== Versand ==============================
function anfrageText(d) {
  return [
    `Neue Demo-Anfrage über ilic-ecomhub.de/bestellen`,
    ``,
    `BETRIEB:  ${d.betrieb} (${d.ort}) — ${d.branche}`,
    `PAKET:    ${d.paket} — ${eur(d.paketPreis)}`,
    `EXTRAS:   ${d.extras}`,
    `ABO:      ${d.abo}`,
    `ZIELE:    ${d.ziele}`,
    `STIL:     ${d.stil}`,
    `INHALTE:  ${d.inhalte}`,
    `SUMME:    ${eur(d.einmalGesamt)} einmalig · Anzahlung nach Demo: ${eur(d.anzahlung)}`,
    ``,
    `KONTAKT:  ${d.name} · ${d.email} · Tel: ${d.tel}`,
  ].join("\n");
}

async function submitAnfrage() {
  const d = leadDaten();
  const btn = $("btnNext");
  btn.disabled = true; btn.textContent = "Sende …";

  let ok = false;
  if (FORMSPREE_ENDPOINT) {
    try {
      const r = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ ...d, message: anfrageText(d), _subject: `Demo-Anfrage: ${d.betrieb} (${d.ort})`, _replyto: d.email }),
      });
      ok = r.ok;
    } catch { ok = false; }
  }
  // Kein automatischer mailto-Redirect (hängt ohne Mail-Programm) — stattdessen
  // zeigt der Danke-Screen vorbefüllte E-Mail-/WhatsApp-Buttons (siehe showDanke).
  showDanke(d, !ok);
  btn.disabled = false;
}

function showDanke(d, viaMail) {
  document.querySelectorAll(".wz-step").forEach((el) => el.classList.remove("on"));
  $("wzFoot").style.display = "none";
  $("dkName").textContent = (d.name.split(" ")[0] || d.name) + "!";
  if (viaMail) {
    // Fallback (kein/fehlgeschlagener Formspree): Kunde schickt die fertige
    // Anfrage selbst ab — ein Tipp auf WhatsApp oder E-Mail, Text ist vorbefüllt.
    $("danke").querySelector("h3").textContent = "Fast geschafft — ein Tipp noch!";
    $("danke").querySelector("p").innerHTML =
      `Deine Anfrage ist fertig vorbereitet, <b>${(d.name.split(" ")[0] || "")}</b>. Schick sie mir jetzt mit einem Klick — danach baue ich deine Demo und melde mich innerhalb von <b>48 Stunden</b>.`;
    const row = document.createElement("div");
    row.style.cssText = "display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-top:20px;";
    const wa = document.createElement("a");
    wa.className = "btn big"; wa.target = "_blank"; wa.rel = "noopener";
    wa.href = "https://wa.me/4917643478923?text=" + encodeURIComponent(anfrageText(d));
    wa.textContent = "💬 Per WhatsApp senden";
    const mail = document.createElement("a");
    mail.className = "btn ghost big";
    mail.href = `mailto:${KONTAKT_MAIL}?subject=${encodeURIComponent("Demo-Anfrage: " + d.betrieb)}&body=${encodeURIComponent(anfrageText(d))}`;
    mail.textContent = "📧 Per E-Mail senden";
    row.append(wa, mail);
    const backBtn = $("danke").querySelector("a.btn[href]");
    $("danke").insertBefore(row, backBtn);
    if (backBtn) backBtn.remove();   // „Zurück"-Button weglassen, Fokus aufs Senden
  }
  if (PAY_LINK) {
    const a = document.createElement("a");
    a.className = "btn ghost big"; a.style.marginTop = "10px";
    a.href = PAY_LINK; a.target = "_blank"; a.rel = "noopener";
    a.textContent = "Optional: Anzahlung direkt sichern →";
    $("danke").appendChild(a);
  }
  // Termin-Kalender (Cal.com) einblenden — der starke nächste Schritt vom warmen Lead.
  if (CAL_LINK) mountCalEmbed(d);
  else { const t = $("dkTermin"); if (t) t.style.display = "none"; }

  $("danke").classList.add("on");
  $("wz").scrollIntoView({ behavior: "smooth", block: "center" });
}

// Cal.com-Inline-Embed lazy laden + mit den Formulardaten vorbefüllen.
// Lädt erst HIER (nach Absenden/Einwilligung) — kein Drittanbieter-Script vorher.
let calMounted = false;
function mountCalEmbed(d) {
  if (calMounted) return;
  calMounted = true;
  (function (C, A, L) {
    let p = function (a, ar) { a.q.push(ar); };
    let doc = C.document;
    C.Cal = C.Cal || function () {
      let cal = C.Cal, ar = arguments;
      if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; doc.head.appendChild(doc.createElement("script")).src = A; cal.loaded = true; }
      if (ar[0] === L) {
        const api = function () { p(api, arguments); };
        const ns = ar[1];
        api.q = api.q || [];
        if (typeof ns === "string") { cal.ns[ns] = cal.ns[ns] || api; p(cal.ns[ns], ar); p(cal, ["initNamespace", ns]); }
        else p(cal, ar);
        return;
      }
      p(cal, ar);
    };
  })(window, "https://app.cal.com/embed/embed.js", "init");

  const notes = `Betrieb: ${d.betrieb || "—"} (${d.ort || "—"}) · ${d.branche || "—"} · Paket: ${d.paket || "—"}`;
  window.Cal("init", { origin: "https://cal.com" });
  window.Cal("inline", {
    elementOrSelector: "#cal-embed",
    calLink: CAL_LINK,
    layout: "month_view",
    config: { name: d.name || "", email: d.email || "", notes },
  });
  window.Cal("ui", { hideEventTypeDetails: false, layout: "month_view", cssVarsPerTheme: { light: { "cal-brand": "#53170F" } } });
}

// ============================== Start ==============================
renderPlans();
renderPaketPick();
renderUpsells();
renderAbo();
updatePrice();
showStep(1);
