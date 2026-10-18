// HUD: Raum-Chips, Führung, Tageszeit, Licht, Grundriss, Übersicht (Puppenhaus), Foto, Vollbild, Qualität, Hilfe,
// Hotspots mit Info-Karte, Raumanzeige, Tastenkürzel, Toasts. Reine DOM-Logik, keine Szene-Konstruktion.
import * as THREE from "three";
import { raumAn } from "./plan.js";
import { TAGESZEITEN, TAGESZEIT_REIHE } from "./licht.js";
import { STUFEN_REIHE, merkeStufe, istIPhone, PARAMS } from "./qualitaet.js";

const $ = (id) => document.getElementById(id);

export class UI {
  constructor({ PLAN, licht, nav, steuerung, renderer, kamera, szene, post, stufeId, bau, minimap, wechsleStufe }) {
    Object.assign(this, { PLAN, licht, nav, steuerung, renderer, kamera, szene, post, stufeId, bau, minimap, wechsleStufe });
    this.ray = new THREE.Raycaster(); this.tmp = new THREE.Vector3(); this.tour = null; this.toastTimer = 0; this.takt = 0;
    this.kopf = $("kopf"); this.leiste = $("leiste"); this.info = $("info"); this.hilfe = $("hilfe"); this.menue = $("qualitaet-menue"); this.toastEl = $("toast");
    this._chips(); this._werkzeuge(); this._hotspots(); this._tasten();
    nav.an("ankunft", (f) => { if (f.meldung) this.toast(f.meldung); if (this.tour) this._tourWeiter(f); });
    nav.an("abbruch", () => { if (this.tour) this.tourStopp("Führung beendet — Sie gehen jetzt selbst."); });
    steuerung.an("lock", (an) => { if (an) this.toast("Maus gefangen — Esc gibt sie frei", 1800); });
  }
  zeige() { this.kopf.hidden = false; this.leiste.hidden = false; if (!istIPhone() && !document.fullscreenEnabled) $("btn-voll").classList.add("versteckt"); if (istIPhone()) $("btn-voll").classList.add("versteckt"); }

  // ---- Chips + Führung
  _chips() {
    for (const b of this.leiste.querySelectorAll(".chip[data-raum]")) b.addEventListener("click", () => { this.tourStopp(); this.nav.gehZuRaum(b.dataset.raum); this.steuerung.setzeModus("ego"); });
    $("btn-tour").addEventListener("click", () => (this.tour ? this.tourStopp("Führung gestoppt.") : this.tourStart()));
  }
  tourStart() {
    this.steuerung.setzeModus("ego"); this.tour = { i: 0, timer: 0, warten: false };
    $("btn-tour").setAttribute("aria-pressed", "true"); $("btn-tour").textContent = "■ Führung stoppen";
    this._tourSchritt();
  }
  _tourSchritt() {
    const stopp = this.PLAN.tour[this.tour.i]; if (!stopp) return this.tourStopp("Ende der Führung — gehen Sie jetzt frei weiter.");
    this.tour.warten = false;
    const ok = this.nav.gehZu(stopp.pos, { yaw: stopp.yaw, pitch: stopp.pitch, meldung: stopp.text });
    if (!ok) { this.tour.i++; this._tourSchritt(); }
  }
  _tourWeiter(f) { const stopp = this.PLAN.tour[this.tour.i]; this.tour.warten = true; this.tour.timer = stopp?.dauer ?? 3; }
  tourStopp(meldung) { if (!this.tour) return; this.tour = null; this.nav.abbrechen(); $("btn-tour").setAttribute("aria-pressed", "false"); $("btn-tour").textContent = "▶ Führung"; if (meldung) this.toast(meldung); }

  // ---- Werkzeuge
  _werkzeuge() {
    for (const b of this.leiste.querySelectorAll("[data-zeit]")) b.addEventListener("click", () => this.setzeTageszeit(b.dataset.zeit));
    $("btn-licht").addEventListener("click", () => { this.licht.schalte("alle", !this.licht.alleAn()); this._syncLicht(); });
    $("btn-plan").addEventListener("click", () => this.setzePlan(!this.minimap.sichtbar));
    $("btn-puppenhaus").addEventListener("click", () => this.setzePuppenhaus(this.steuerung.modus !== "puppenhaus"));
    $("btn-foto").addEventListener("click", () => this.foto());
    $("btn-voll").addEventListener("click", () => this.vollbild());
    $("btn-qualitaet").addEventListener("click", (e) => { e.stopPropagation(); this.menue.hidden = !this.menue.hidden; });
    for (const b of this.menue.querySelectorAll("[data-stufe]")) { b.setAttribute("aria-checked", b.dataset.stufe === this.stufeId ? "true" : "false"); b.addEventListener("click", () => { this.menue.hidden = true; this.wechsleStufe(b.dataset.stufe); }); }
    document.addEventListener("pointerdown", (e) => { if (!this.menue.hidden && !this.menue.contains(e.target)) this.menue.hidden = true; });
    $("btn-hilfe").addEventListener("click", () => this.hilfeZeigen());
    this.info.querySelector(".schliessen").addEventListener("click", () => { this.info.hidden = true; });
    document.addEventListener("fullscreenchange", () => $("btn-voll").setAttribute("aria-pressed", document.fullscreenElement ? "true" : "false"));
  }
  setzeTageszeit(id) { this.licht.setzeTageszeit(id); for (const b of this.leiste.querySelectorAll("[data-zeit]")) b.setAttribute("aria-pressed", b.dataset.zeit === id ? "true" : "false"); this.toast(TAGESZEITEN[id].label, 1200); setTimeout(() => this._syncLicht(), 50); }
  _syncLicht() { $("btn-licht").setAttribute("aria-pressed", this.licht.alleAn() ? "true" : "false"); }
  setzePlan(an) { this.minimap.setzeSichtbar(an); $("btn-plan").setAttribute("aria-pressed", an ? "true" : "false"); }
  setzePuppenhaus(an) {
    this.tourStopp(); this.nav.abbrechen();
    this.steuerung.setzeModus(an ? "puppenhaus" : "ego"); this.bau.oben.visible = !an; this.renderer.shadowMap.needsUpdate = true;
    $("btn-puppenhaus").setAttribute("aria-pressed", an ? "true" : "false");
    if (an) this.toast("Übersicht: ziehen dreht, Rad/Pinch zoomt, Klick auf einen Raum führt hinein", 3200);
  }
  hilfeZeigen() { if (this.hilfe.open) this.hilfe.close(); else { document.exitPointerLock?.(); this.hilfe.showModal(); } }
  vollbild() {
    const el = document.documentElement;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el)?.catch?.(() => this.toast("Vollbild hier nicht verfügbar"));
  }
  async foto() {
    this.post.render();                                               // frischer Frame im selben Tick
    const quelle = this.renderer.domElement, c = document.createElement("canvas"); c.width = quelle.width; c.height = quelle.height;
    const g = c.getContext("2d"); g.drawImage(quelle, 0, 0);
    const s = c.width / 1200; g.fillStyle = "rgba(34,32,29,.55)"; g.fillRect(0, c.height - 46 * s, c.width, 46 * s);
    g.fillStyle = "#F7F5F1"; g.font = `600 ${Math.round(17 * s)}px Hanken Grotesk, system-ui, sans-serif`; g.textBaseline = "middle";
    g.fillText("Musterwohnung Parkblick · 3D-Rundgang · Exposé Boost · fiktives Musterobjekt", 18 * s, c.height - 23 * s);
    const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.9)); if (!blob) return this.toast("Foto nicht möglich");
    const datei = new File([blob], "parkblick-3d-rundgang.jpg", { type: "image/jpeg" });
    if (navigator.canShare?.({ files: [datei] })) { try { await navigator.share({ files: [datei], title: "Musterwohnung Parkblick" }); return; } catch {} }
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = datei.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    this.toast("Foto gespeichert", 1500);
  }

  // ---- Hotspots
  _hotspots() {
    const box = $("hotspots"); this.spots = [];
    for (const r of this.PLAN.raeume) {
      if (!r.hotspot) continue;
      const b = document.createElement("button"); b.className = "hotspot"; b.type = "button"; b.textContent = "i"; b.setAttribute("aria-label", `Info: ${r.hotspot.titel}`);
      b.addEventListener("click", (e) => { e.stopPropagation(); this.infoZeigen(r); });
      box.appendChild(b); this.spots.push({ r, el: b, pos: new THREE.Vector3(...r.hotspot.pos) });
    }
  }
  infoZeigen(r) { $("info-eyebrow").textContent = `${r.name} · ${r.flaeche}`; $("info-titel").textContent = r.hotspot.titel; $("info-text").textContent = r.hotspot.text; this.info.hidden = false; }
  _hotspotsAktualisieren() {
    const kam = this.kamera; kam.updateMatrixWorld(); const kp = kam.getWorldPosition(this.tmp.clone());
    for (const s of this.spots) {
      const d = s.pos.distanceTo(kp);
      if (d > 7 || this.steuerung.modus === "puppenhaus") { s.el.hidden = true; continue; }
      const p = s.pos.clone().project(kam);
      if (p.z > 1 || Math.abs(p.x) > 1.05 || Math.abs(p.y) > 1.05) { s.el.hidden = true; continue; }
      if ((this.takt & 7) === 0) { // Verdeckung alle 8 Frames prüfen
        this.ray.set(kp, s.pos.clone().sub(kp).normalize()); this.ray.far = d - 0.15;
        const treffer = this.ray.intersectObjects(this.bau.meshes.putz ? [this.bau.meshes.putz, this.bau.meshes.decke ?? this.bau.meshes["decke@oben"]].filter(Boolean) : [], false);
        s.verdeckt = treffer.length > 0;
      }
      s.el.hidden = !!s.verdeckt;
      s.el.style.left = `${(p.x * 0.5 + 0.5) * innerWidth}px`; s.el.style.top = `${(-p.y * 0.5 + 0.5) * innerHeight}px`;
      s.el.style.opacity = d > 5.5 ? String(1 - (d - 5.5) / 1.5) : "1";
    }
  }

  // ---- Tasten
  _tasten() {
    addEventListener("keydown", (e) => {
      if (e.target.closest?.("input,textarea,select,[contenteditable]")) return;
      const k = e.key.toLowerCase(); const i = parseInt(e.key, 10);
      if (i >= 1 && i <= 4) this.setzeTageszeit(TAGESZEIT_REIHE[i - 1]);
      else if (k === "l") { this.licht.schalte("alle", !this.licht.alleAn()); this._syncLicht(); }
      else if (k === "m") this.setzePlan(!this.minimap.sichtbar);
      else if (k === "v") this.setzePuppenhaus(this.steuerung.modus !== "puppenhaus");
      else if (k === "p") this.foto();
      else if (k === "f") this.vollbild();
      else if (k === "h") this.hilfeZeigen();
      else if (k === "escape") { this.info.hidden = true; this.menue.hidden = true; }
      else return;
      e.preventDefault();
    });
  }

  toast(text, dauer = 2200) { this.toastEl.textContent = text; this.toastEl.classList.add("an"); clearTimeout(this.toastTimer); this.toastTimer = setTimeout(() => this.toastEl.classList.remove("an"), dauer); }

  update(dt) {
    this.takt++;
    if (this.tour?.warten) { this.tour.timer -= dt; if (this.tour.timer <= 0) { this.tour.i++; this._tourSchritt(); } }
    if ((this.takt & 15) === 0) { const r = raumAn(this.steuerung.position.x, this.steuerung.position.z); const name = this.steuerung.modus === "puppenhaus" ? "Übersicht" : r?.name ?? "—"; if ($("raum-anzeige").textContent !== name) { $("raum-anzeige").textContent = name; for (const b of this.leiste.querySelectorAll(".chip[data-raum]")) b.classList.toggle("aktiv", b.dataset.raum === r?.id && this.steuerung.modus !== "puppenhaus"); } }
    this._hotspotsAktualisieren();
    this.minimap.update();
  }
}
