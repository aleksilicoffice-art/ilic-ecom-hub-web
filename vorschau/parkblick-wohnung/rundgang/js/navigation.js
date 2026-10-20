// Navigation: Raumgraph aus Türen/Durchgängen/Portalen, Pfadsuche (BFS), sanfte Fahrten (Tippen auf den Boden,
// Raum-Chips, Führung). Fahrten laufen über die Steuerung (Position + Blickziel) und brechen bei Eingabe ab.
import * as THREE from "three";
import { raumAn } from "./plan.js";

const TEMPO = 1.9, ANKUNFT = 0.15, BLOCKADE_S = 0.8;   // Blockade: kein Fortschritt mehr → Wegpunkt gilt als erreicht

export class Navigation {
  constructor({ PLAN, steuerung, boeden, kamera }) {
    Object.assign(this, { PLAN, steuerung, boeden, kamera });
    this.ray = new THREE.Raycaster(); this.fahrt = null; this.blockaden = 0; this.hoerer = { ankunft: [], start: [], abbruch: [], puppenhausAus: [] };
    this.graph = this._baueGraph();
    steuerung.an("eingabe", () => { if (this.fahrt && this.steuerung.eingabeAktiv) this.abbrechen(); });
    steuerung.an("tipp", (x, y) => this.tipp(x, y));
  }
  an(ev, fn) { this.hoerer[ev].push(fn); }
  _melde(ev, ...a) { for (const f of this.hoerer[ev]) f(...a); }

  // Knoten = Räume, Kanten = Öffnungen mit Durchgangspunkt (+ Versatz auf beiden Seiten)
  _baueGraph() {
    const kanten = [];
    for (const w of this.PLAN.waende) {
      const x = Math.abs(w.bis[1] - w.von[1]) < 1e-4;
      for (const o of w.oeffnungen || []) {
        if (!["tuer", "durchgang", "balkontuer"].includes(o.typ)) continue;
        const m = (o.von + o.bis) / 2, c = x ? w.von[1] : w.von[0], off = w.dicke / 2 + 0.45;
        const p1 = x ? [m, c - off] : [c - off, m], p2 = x ? [m, c + off] : [c + off, m];
        const r1 = raumAn(...p1), r2 = raumAn(...p2); if (!r1 || !r2 || r1 === r2) continue;
        const tor = x ? [m, c] : [c, m];
        kanten.push({ a: r1.id, b: r2.id, punkte: [p1, tor, p2] }, { a: r2.id, b: r1.id, punkte: [p2, tor, p1] });
      }
    }
    for (const p of this.PLAN.portale) {
      const [[ax, az], [bx, bz]] = p.linie; const m = [(ax + bx) / 2, (az + bz) / 2];
      const x = Math.abs(bz - az) < 1e-4; const p1 = x ? [m[0], m[1] - 0.4] : [m[0] - 0.4, m[1]], p2 = x ? [m[0], m[1] + 0.4] : [m[0] + 0.4, m[1]];
      const r1 = raumAn(...p1), r2 = raumAn(...p2); if (!r1 || !r2) continue;
      // Schmale Portale (≤ 1,2 m, z. B. Lücke neben der Halbinsel) wie Türen: Vorpunkt → Mitte → Nachpunkt.
      // Breite Portale: Durchgangspunkt wird je Fahrt auf der Linie gewählt (_wegpunkte).
      const breit = Math.hypot(bx - ax, bz - az) > 1.2;
      kanten.push({ a: r1.id, b: r2.id, punkte: breit ? [p1, p2] : [p1, m, p2], breit }, { a: r2.id, b: r1.id, punkte: breit ? [p2, p1] : [p2, m, p1], breit });
    }
    return kanten;
  }
  _pfad(vonId, nachId) {
    if (vonId === nachId) return [];
    const vorher = new Map([[vonId, null]]), q = [vonId];
    while (q.length) {
      const k = q.shift(); if (k === nachId) break;
      for (const e of this.graph) if (e.a === k && !vorher.has(e.b)) { vorher.set(e.b, e); q.push(e.b); }
    }
    if (!vorher.has(nachId)) return null;
    const weg = []; for (let e = vorher.get(nachId); e; e = vorher.get(e.a)) weg.unshift(e);
    return weg;
  }
  // Breite Portale: statt Mittelpunkt den Punkt auf der Portallinie nehmen, der der Strecke am nächsten liegt
  _wegpunkte(kanten, von, nach) {
    const pts = [];
    let cur = von;
    for (const e of kanten) {
      if (e.breit) {
        const p = this.PLAN.portale.find((pp) => (pp.von === e.a && pp.nach === e.b) || (pp.von === e.b && pp.nach === e.a));
        const [[ax, az], [bx, bz]] = p.linie; const x = Math.abs(bz - az) < 1e-4;
        const zielPkt = nach; const t = x ? THREE.MathUtils.clamp((zielPkt[0] * 0.5 + cur[0] * 0.5 - Math.min(ax, bx)) / Math.abs(bx - ax), 0.12, 0.88) : THREE.MathUtils.clamp((zielPkt[1] * 0.5 + cur[1] * 0.5 - Math.min(az, bz)) / Math.abs(bz - az), 0.12, 0.88);
        const px = x ? Math.min(ax, bx) + t * Math.abs(bx - ax) : ax, pz = x ? az : Math.min(az, bz) + t * Math.abs(bz - az);
        pts.push([px, pz]); cur = [px, pz];
      } else { pts.push(...e.punkte); cur = e.punkte[e.punkte.length - 1]; }
    }
    pts.push(nach);
    return pts;
  }
  gehZu([x, z], { yaw = null, pitch = null, meldung = null } = {}) {
    const pos = this.steuerung.position;
    const von = raumAn(pos.x, pos.z) || this.PLAN.raeume[0], nach = raumAn(x, z);
    if (!nach) return false;
    const kanten = this._pfad(von.id, nach.id); if (kanten === null) return false;
    const punkte = this._wegpunkte(kanten, [pos.x, pos.z], [x, z]);
    this.fahrt = { punkte, i: 0, yawEnde: yaw, pitchEnde: pitch, ziel: nach, meldung, besteD: Infinity, stillstand: 0 };
    this._melde("start", this.fahrt);
    return true;
  }
  gehZuRaum(id, meldung) { const r = this.PLAN.raeume.find((q) => q.id === id); if (!r) return false; return this.gehZu([r.kamera.pos[0], r.kamera.pos[2]], { yaw: r.kamera.yaw, pitch: r.kamera.pitch, meldung }); }
  abbrechen() { if (!this.fahrt) return; this.fahrt = null; this._melde("abbruch"); }
  tipp(clientX, clientY) {
    const nd = new THREE.Vector2((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
    this.ray.setFromCamera(nd, this.kamera);
    const treffer = this.ray.intersectObjects(this.boeden, false)[0]; if (!treffer) return false;
    const p = treffer.point; const raum = raumAn(p.x, p.z); if (!raum) return false;
    if (this.steuerung.modus === "puppenhaus") {                       // aus der Übersicht direkt in den Raum springen
      this.steuerung.setzeModus("ego"); this.steuerung.setzePosition(p.x, p.z); this.steuerung.setzeBlick(raum.kamera.yaw, 0, true);
      this.steuerung._kollidiere(this.steuerung.position); this._melde("puppenhausAus", raum); return true;
    }
    return this.gehZu([p.x, p.z]);
  }
  get unterwegs() { return !!this.fahrt; }
  update(dt) {
    const f = this.fahrt; if (!f) return;
    const pos = this.steuerung.position; const [zx, zz] = f.punkte[f.i];
    const dx = zx - pos.x, dz = zz - pos.z, d = Math.hypot(dx, dz);
    const letzter = f.i === f.punkte.length - 1;
    // Blick in Laufrichtung (außer kurz vor dem letzten Punkt, dann aufs Ziel-Yaw)
    if (d > 0.25) { const yawLauf = Math.atan2(-dx, -dz); this.steuerung.setzeBlick(this._naechsterYaw(yawLauf), letzter && f.pitchEnde !== null ? f.pitchEnde : this.steuerung.pitchZiel); }
    const tempo = letzter ? Math.min(TEMPO, 0.6 + d * 1.6) : TEMPO;
    const schritt = Math.min(d, tempo * dt);
    if (d > 1e-6) { pos.x += dx / d * schritt; pos.z += dz / d * schritt; this.steuerung._kollidiere(pos); }
    // Blockade-Erkennung: kommt die Fahrt (z. B. an einer Möbelkante) nicht mehr näher, gilt der Wegpunkt als erreicht
    const dNeu = Math.hypot(zx - pos.x, zz - pos.z);
    if (dNeu < f.besteD - 0.005) { f.besteD = dNeu; f.stillstand = 0; } else f.stillstand += dt;
    const blockiert = f.stillstand >= BLOCKADE_S;
    if (blockiert) { f.besteD = Infinity; f.stillstand = 0; this.blockaden++; console.info(`[nav] Blockade bei Wegpunkt ${f.i + 1}/${f.punkte.length} (${zx.toFixed(2)} | ${zz.toFixed(2)}), Position ${pos.x.toFixed(2)} | ${pos.z.toFixed(2)}`); }
    if (d - schritt <= ANKUNFT || blockiert) {
      if (letzter) { if (f.yawEnde !== null) this.steuerung.setzeBlick(this._naechsterYaw(f.yawEnde), f.pitchEnde ?? this.steuerung.pitchZiel); this.fahrt = null; this._melde("ankunft", f); }
      else { f.i++; f.besteD = Infinity; f.stillstand = 0; }
    }
  }
  // Kürzeste Drehrichtung: Ziel-Yaw in die Nähe des aktuellen Yaw holen
  _naechsterYaw(y) { const a = this.steuerung.yawZiel; let d = (y - a) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return a + d; }
}
