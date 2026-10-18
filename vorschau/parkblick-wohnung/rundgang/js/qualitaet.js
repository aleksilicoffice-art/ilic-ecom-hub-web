// Qualitätsstufen, Geräteerkennung, URL-Parameter und FPS-Messung.
// Stufen steuern DPR, Schattenauflösung, Post-Processing und Textur-Satz (1k / 512).
export const PARAMS = new URLSearchParams(location.search);

export const STUFEN = {
  hoch:    { dpr: 2,    schatten: 2048, post: true,  ao: true,  bloom: true,  msaa: 4, texturen: "1k",  glas: "physisch", anisotropie: 8, punktlichter: 99, schattenArt: "pcf" },
  mittel:  { dpr: 1.5,  schatten: 2048, post: true,  ao: false, bloom: true,  msaa: 4, texturen: "1k",  glas: "einfach",  anisotropie: 4, punktlichter: 6,  schattenArt: "pcf" },
  niedrig: { dpr: 1.25, schatten: 1024, post: false, ao: false, bloom: false, msaa: 0, texturen: "512", glas: "einfach",  anisotropie: 2, punktlichter: 4, schattenArt: "pcf" },
};
export const STUFEN_REIHE = ["hoch", "mittel", "niedrig"];

export function istTouch() {
  if (PARAMS.has("touch")) return PARAMS.get("touch") !== "0";
  return matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 1;
}
export function istIPhone() {
  return /iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1 && innerWidth < 900);
}

// Reihenfolge: URL → gespeicherte Wahl → Gerät (Touch startet auf „niedrig" — flüssig vor schön).
export function ermittleStufe() {
  const p = PARAMS.get("stufe");
  if (STUFEN[p]) return p;
  try { const s = localStorage.getItem("rundgang.stufe"); if (STUFEN[s]) return s; } catch {}
  return istTouch() ? "niedrig" : "hoch";
}
export function merkeStufe(id) { try { localStorage.setItem("rundgang.stufe", id); } catch {} }

// Effektiver Pixelabstand: Stufen-Deckel, per ?dpr= überschreibbar (Füllraten-Proxy fürs Handy).
export function pixelRatio(stufe) {
  const p = parseFloat(PARAMS.get("dpr"));
  if (p > 0) return p;
  return Math.min(window.devicePixelRatio || 1, stufe.dpr);
}

// Gleitende FPS-Messung (1 s Mittel, 1 %-Low über 5 s) + Auto-Downgrade-Signal.
export class FpsMesser {
  constructor({ aufwaermen = 6, schwelle = 27, dauer = 4 } = {}) {
    this.zeiten = []; this.lang = [];
    this.fps = 0; this.low1 = 0; this.zeit = 0;
    this.aufwaermen = aufwaermen; this.schwelle = schwelle; this.dauer = dauer;
    this.langsamSeit = 0; this.ausgeloest = false;
  }
  tick(dt) {
    if (!(dt > 0) || dt > 0.5) return null;      // Tab-Wechsel u. ä. ignorieren
    this.zeit += dt;
    const jetzt = this.zeit;
    this.zeiten.push([jetzt, dt]); this.lang.push([jetzt, dt]);
    while (this.zeiten.length && this.zeiten[0][0] < jetzt - 1) this.zeiten.shift();
    while (this.lang.length && this.lang[0][0] < jetzt - 5) this.lang.shift();
    // Median statt Mittelwert: einzelne Ruckler (Shader, Uploads) verfälschen die Bildrate sonst
    const dts = this.zeiten.map((x) => x[1]).sort((a, b) => a - b);
    this.fps = dts.length ? 1 / dts[dts.length >> 1] : 0;
    if (this.lang.length > 20) {
      const sortiert = this.lang.map((x) => x[1]).sort((a, b) => b - a);
      this.low1 = 1 / sortiert[Math.floor(sortiert.length * 0.01)];
    }
    if (this.ausgeloest || jetzt < this.aufwaermen) return null;
    if (this.fps < this.schwelle) { this.langsamSeit += dt; if (this.langsamSeit >= this.dauer) { this.ausgeloest = true; console.info(`[qualitaet] langsam: Median ${this.fps.toFixed(0)} fps über ${this.dauer}s (t=${jetzt.toFixed(1)}s)`); return "langsam"; } }
    else this.langsamSeit = Math.max(0, this.langsamSeit - dt * 0.5);
    return null;
  }
}
