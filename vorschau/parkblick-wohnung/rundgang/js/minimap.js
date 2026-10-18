// Grundriss-Minimap (Canvas 2D) aus plan.js: Räume, Wände, Öffnungen, Standort + Blickkegel. Tippen → Fahrt dorthin.
import { raumAn } from "./plan.js";

export class Minimap {
  constructor({ canvas, PLAN, steuerung, nav }) {
    Object.assign(this, { canvas, PLAN, steuerung, nav });
    this.ctx = canvas.getContext("2d");
    const [hx1, hz1, hx2, hz2] = PLAN.meta.huelle; const [, , , bz2] = PLAN.balkon.rect;
    this.welt = { x1: hx1 - 0.4, z1: hz1 - 0.4, x2: hx2 + 0.4, z2: Math.max(hz2, bz2) + 0.4 };
    this.sichtbar = false; this.letzte = 0;
    canvas.addEventListener("pointerdown", (e) => { e.stopPropagation(); const [x, z] = this.weltPunkt(e); if (raumAn(x, z)) nav.gehZu([x, z]); });
    this.resize();
  }
  resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2), r = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.round(r.width * dpr); this.canvas.height = Math.round(r.height * dpr);
    const w = this.welt; const sx = this.canvas.width / (w.x2 - w.x1), sz = this.canvas.height / (w.z2 - w.z1);
    this.s = Math.min(sx, sz); this.ox = (this.canvas.width - (w.x2 - w.x1) * this.s) / 2; this.oz = (this.canvas.height - (w.z2 - w.z1) * this.s) / 2;
    this.dpr = dpr; this.zeichne(true);
  }
  px(x, z) { return [this.ox + (x - this.welt.x1) * this.s, this.oz + (z - this.welt.z1) * this.s]; }
  weltPunkt(e) { const r = this.canvas.getBoundingClientRect(); const cx = (e.clientX - r.left) * this.dpr, cz = (e.clientY - r.top) * this.dpr; return [this.welt.x1 + (cx - this.ox) / this.s, this.welt.z1 + (cz - this.oz) / this.s]; }
  setzeSichtbar(an) { this.sichtbar = an; this.canvas.hidden = !an; if (an) { this.resize(); } }
  zeichne(erzwinge = false) {
    if (!this.sichtbar && !erzwinge) return;
    const c = this.ctx, P = this.PLAN; c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const akt = raumAn(this.steuerung.position.x, this.steuerung.position.z);
    // Räume
    for (const r of P.raeume) {
      const [x1, z1, x2, z2] = r.rect; const [a, b] = this.px(x1, z1), [e, f] = this.px(x2, z2);
      c.fillStyle = r === akt ? "rgba(164,123,60,.28)" : r.aussen ? "rgba(34,32,29,.06)" : "rgba(255,255,255,.55)";
      c.fillRect(a, b, e - a, f - b);
    }
    // Wände (mit Öffnungen als Lücken)
    c.fillStyle = "#22201D";
    for (const w of P.waende) {
      const x = Math.abs(w.bis[1] - w.von[1]) < 1e-4;
      const a0 = Math.min(x ? w.von[0] : w.von[1], x ? w.bis[0] : w.bis[1]), b0 = Math.max(x ? w.von[0] : w.von[1], x ? w.bis[0] : w.bis[1]);
      const cc = x ? w.von[1] : w.von[0], d = Math.max(w.dicke, 0.14);
      let cursor = a0; const teile = [];
      for (const o of [...(w.oeffnungen || [])].sort((p, q) => p.von - q.von)) { if (o.unten < 0.05 || o.typ === "fenster") { teile.push([cursor, o.von, false]); teile.push([o.von, o.bis, o.typ === "fenster" ? "fenster" : "tuer"]); cursor = o.bis; } }
      teile.push([cursor, b0, false]);
      for (const [s, e, art] of teile) {
        if (e <= s) continue;
        const [p1, q1] = x ? this.px(s, cc - d / 2) : this.px(cc - d / 2, s), [p2, q2] = x ? this.px(e, cc + d / 2) : this.px(cc + d / 2, e);
        if (!art) { c.fillStyle = "#22201D"; c.fillRect(p1, q1, p2 - p1, q2 - q1); }
        else if (art === "fenster") { c.fillStyle = "#9fc3d8"; c.fillRect(p1, q1, p2 - p1, q2 - q1); }
      }
    }
    // Balkonbrüstung
    const [bx1, bz1, bx2, bz2] = P.balkon.rect; c.strokeStyle = "#22201D"; c.lineWidth = 1.5 * this.dpr; c.beginPath();
    const [m1, n1] = this.px(bx1, bz1), [m2, n2] = this.px(bx2, bz2); c.moveTo(m1, n1); c.lineTo(m1, n2); c.lineTo(m2, n2); c.lineTo(m2, n1); c.stroke();
    // Raumnamen
    c.fillStyle = "rgba(34,32,29,.75)"; c.font = `${Math.round(9 * this.dpr)}px Hanken Grotesk, system-ui, sans-serif`; c.textAlign = "center";
    for (const r of P.raeume) { const [x1, z1, x2, z2] = r.rect; const [a, b] = this.px((x1 + x2) / 2, (z1 + z2) / 2 + 0.15); c.fillText(r.name, a, b); }
    // Standort + Blickkegel
    const p = this.steuerung.position, yaw = this.steuerung.yaw; const [sx, sz] = this.px(p.x, p.z);
    const dx = -Math.sin(yaw), dz = -Math.cos(yaw), fov = 0.62;
    c.fillStyle = "rgba(164,123,60,.35)"; c.beginPath(); c.moveTo(sx, sz);
    const L = 1.9 * this.s; c.lineTo(sx + (dx * Math.cos(fov) - dz * Math.sin(fov)) * L, sz + (dz * Math.cos(fov) + dx * Math.sin(fov)) * L);
    c.lineTo(sx + (dx * Math.cos(-fov) - dz * Math.sin(-fov)) * L, sz + (dz * Math.cos(-fov) + dx * Math.sin(-fov)) * L); c.closePath(); c.fill();
    c.fillStyle = "#A47B3C"; c.beginPath(); c.arc(sx, sz, 4 * this.dpr, 0, Math.PI * 2); c.fill();
    c.strokeStyle = "#fff"; c.lineWidth = 1.5 * this.dpr; c.stroke();
  }
  update() { if (this.sichtbar) this.zeichne(); }
}
