// Öffentlicher Preis-Katalog für die Bestellseite (ilic-ecomhub.de/bestellen/).
// =============================================================================
// WICHTIG (Privat/Öffentlich-Grenze): Diese Datei ist die ÖFFENTLICHE Quelle der
// Preise. Sie ist eine bewusst eigenständige Kopie der Logik aus
// cockpit/templates/angebot.js — die öffentliche Seite importiert NICHT aus dem
// privaten cockpit/. Preise dürfen öffentlich sein (CLAUDE.md §8).
//   → Bei Preisänderung BEIDE Stellen pflegen: hier UND cockpit/templates/angebot.js.
// Reines ES-Modul, kein Build. Wird von ./index.html per <script type="module"> genutzt.

// ---- kleine Helfer ----
export const num = (v) => {
  if (typeof v === "number") return isFinite(v) ? v : 0;
  const s = String(v ?? "").replace(/[^\d.,-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
};
export const eur = (n) => num(n).toLocaleString("de-DE") + " €";

// ---- Pakete (Einmalpreise) ----
export const PAKETE = [
  { id: "basic", name: "Website „Basic“", preis: 499,
    kurz: "Eine starke Seite, die dich findbar macht.",
    text: "1-Page Website, mobil-optimiert · Kontaktformular · Google Maps · Öffnungszeiten · Klick-to-Call." },
  { id: "standard", name: "Website „Standard“", preis: 999, beliebt: true,
    kurz: "Der Allrounder für die meisten Betriebe.",
    text: "Mehrseitige Website (3–5 Seiten) · Galerie · Leistungen & Preise · Buchungslink · WhatsApp-Button · SEO-Grundlagen · Kontaktformular." },
  { id: "premium", name: "Website „Premium“", preis: 1799,
    kurz: "Das Komplettpaket mit Buchung & KI.",
    text: "Vollständige Website · Online-Buchungssystem · KI-Chatbot · Google-Business-Setup · Analytics · Texte per KI." },
  { id: "kiosk", name: "Präsenz-Seite (Kiosk)", preis: 300,
    kurz: "Schnell gefunden: Sortiment, Zeiten, Weg.",
    text: "Einfache, schnelle Seite: Sortiment · Öffnungszeiten · Anfahrt & Karte · Kontakt — für gute Auffindbarkeit bei Google." },
];

// ---- Zusatzleistungen (öffentlich kuratierte Auswahl) ----
export const UPSELLS = [
  { id: "fotos", name: "Fotoshooting vor Ort", preis: 120, info: "Ich komme vorbei und mache eigene Bilder." },
  { id: "kibilder", name: "KI-Bilder statt Stockfotos", preis: 50, info: "Passende, einzigartige Bilder per KI." },
  { id: "buchung", name: "Online-Buchungssystem", preis: 199, info: "Termine direkt über die Website." },
  { id: "chatbot", name: "KI-Chatbot", preis: 300, info: "Beantwortet häufige Fragen automatisch." },
  { id: "sprache", name: "Zweite Sprache", preis: 250, info: "Website zusätzlich in einer weiteren Sprache." },
];

// ---- Pflege-Abos (monatlich, Staffel nach Laufzeit) ----
export const ABOS = [
  { id: "", name: "Kein Abo", inhalt: "Nach Übergabe läuft alles auf dich.", staffel: { 3: 0, 6: 0, 12: 0 } },
  { id: "basic", name: "Basic Care", inhalt: "Hosting, Domain-Verwaltung, technische Wartung & 1 Inhaltsupdate pro Monat.",
    staffel: { 3: 79, 6: 71, 12: 63 } },
  { id: "active", name: "Active Care", inhalt: "Wie Basic Care + 2–3 Updates/Monat, Google-Business-Pflege & saisonale Anpassungen.",
    staffel: { 3: 149, 6: 134, 12: 119 } },
  { id: "growth", name: "Growth Care", inhalt: "Wie Active Care + Monatsreport, neue Unterseite pro Quartal & KI-Content.",
    staffel: { 3: 249, 6: 224, 12: 199 } },
];

export const getPaket = (id) => PAKETE.find((p) => p.id === id) || PAKETE[1];
export const getAbo = (id) => ABOS.find((a) => a.id === id) || ABOS[0];

// ---- Geld-Logik (eine Quelle der Wahrheit, identisch zu angebot.js) ----
export function berechneSummen(d) {
  const paketPreis = num(d.paketPreis);
  const addons = (d.addons || []).map((a) => ({ name: a.name, preis: num(a.preis) }));
  const addonSum = addons.reduce((s, a) => s + a.preis, 0);
  const rabatt = num(d.rabatt);
  const einmalGesamt = Math.max(0, paketPreis + addonSum - rabatt);
  const proz = d.anzahlungProzent != null && d.anzahlungProzent !== "" ? num(d.anzahlungProzent) : 50;
  const anzahlung = Math.round((einmalGesamt * proz) / 100);
  const rest = einmalGesamt - anzahlung;
  return { paketPreis, addons, addonSum, rabatt, einmalGesamt, proz, anzahlung, rest };
}
