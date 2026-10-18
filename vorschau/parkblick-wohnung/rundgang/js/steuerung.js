// Steuerung: EINE Blicklogik für Maus (Pointer Lock + Drag), Tastatur (WASD/Pfeile/Shift) und Touch
// (linker Bereich = Joystick unter dem Finger, Rest = Umsehen, kurzes Tippen = Ziel). Kreis-Kollision gegen
// achsparallele Rechtecke, achsgetrennt aufgelöst (Gleiten an Wänden). Augenhöhe 1,60 m, kein Kopfwackeln.
import * as THREE from "three";

const GEHEN = 1.5, SCHNELL = 3.0, RADIUS = 0.28, AUGE = 1.6;
const PITCH_MAX = 80 * Math.PI / 180;
const TASTEN = { KeyW: "vor", ArrowUp: "vor", KeyS: "zurueck", ArrowDown: "zurueck", KeyA: "links", ArrowLeft: "links", KeyD: "rechts", ArrowRight: "rechts", ShiftLeft: "schnell", ShiftRight: "schnell" };

export class Steuerung {
  constructor({ canvas, rig, kopf, kamera, kollision, touch, start, joystickEl }) {
    Object.assign(this, { canvas, rig, kopf, kamera, kollision, touch, joystickEl });
    this.yaw = start.yaw; this.pitch = start.pitch; this.yawZiel = start.yaw; this.pitchZiel = start.pitch;
    this.vel = new THREE.Vector2(); this.tasten = new Set(); this.joy = new THREE.Vector2();
    this.pointer = new Map(); this.aktiv = false; this.gesperrt = false;
    this.hoerer = { eingabe: [], tipp: [], lock: [] };
    this.sensMaus = 0.0022; this.sensDrag = 0.0045; this.hFov = 72;
    this.modus = "ego"; this.orbit = { mitte: new THREE.Vector3(4.5, 0, 5.6), dist: 16, yaw: Math.PI * 0.85, pitch: -0.95 }; this.egoMerk = null; this.pinch = null;
    rig.position.set(start.pos[0], AUGE, start.pos[2]);
    this._binden();
    this.setzeFov();
  }
  an(ev, fn) { this.hoerer[ev].push(fn); }
  _melde(ev, ...a) { for (const f of this.hoerer[ev]) f(...a); }

  _binden() {
    const c = this.canvas;
    c.addEventListener("pointerdown", (e) => this._down(e));
    c.addEventListener("pointermove", (e) => this._move(e));
    c.addEventListener("pointerup", (e) => this._up(e));
    c.addEventListener("pointercancel", (e) => this._up(e));
    c.addEventListener("contextmenu", (e) => e.preventDefault());
    c.addEventListener("wheel", (e) => { if (this.modus !== "puppenhaus") return; e.preventDefault(); this.orbit.dist = THREE.MathUtils.clamp(this.orbit.dist * (1 + Math.sign(e.deltaY) * 0.08), 7, 30); }, { passive: false });
    document.addEventListener("mousemove", (e) => { if (document.pointerLockElement === c) { this._blick(-e.movementX * this.sensMaus, -e.movementY * this.sensMaus); } });
    document.addEventListener("pointerlockchange", () => this._melde("lock", document.pointerLockElement === c));
    addEventListener("keydown", (e) => { if (e.target.closest?.("input,textarea,select,[contenteditable]")) return; const t = TASTEN[e.code]; if (t) { this.tasten.add(t); this._melde("eingabe"); e.preventDefault(); } });
    addEventListener("keyup", (e) => { const t = TASTEN[e.code]; if (t) this.tasten.delete(t); });
    addEventListener("blur", () => { this.tasten.clear(); this.pointer.clear(); this.joy.set(0, 0); this._joystickZeigen(false); });
  }
  _down(e) {
    if (!this.aktiv || this.gesperrt) return;
    const istTouchPointer = e.pointerType === "touch" || this.touch;
    const joystickZone = this.modus === "ego" && istTouchPointer && e.clientX < innerWidth * 0.4 && ![...this.pointer.values()].some((p) => p.typ === "joystick");
    this.pointer.set(e.pointerId, { typ: joystickZone ? "joystick" : "blick", x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t0: performance.now(), bewegt: 0 });
    try { this.canvas.setPointerCapture?.(e.pointerId); } catch {}
    if (joystickZone) this._joystickZeigen(true, e.clientX, e.clientY);
    else if (e.pointerType === "mouse" && !this.touch && document.pointerLockElement !== this.canvas) { /* Lock erst beim Klick ohne Bewegung (in _up) */ }
    this._melde("eingabe");
  }
  _move(e) {
    const p = this.pointer.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; p.bewegt += Math.hypot(dx, dy);
    if (this.modus === "puppenhaus") {                                   // Orbit: ziehen dreht, zwei Finger zoomen
      const zeiger = [...this.pointer.values()];
      if (zeiger.length >= 2) { const d = Math.hypot(zeiger[0].x - zeiger[1].x, zeiger[0].y - zeiger[1].y); if (this.pinch) this.orbit.dist = THREE.MathUtils.clamp(this.orbit.dist * (this.pinch / d), 7, 30); this.pinch = d; }
      else { this.orbit.yaw -= dx * 0.006; this.orbit.pitch = THREE.MathUtils.clamp(this.orbit.pitch - dy * 0.004, -1.45, -0.35); }
      this._melde("eingabe"); return;
    }
    if (p.typ === "joystick") {
      const r = 46; const vx = (p.x - p.x0) / r, vy = (p.y - p.y0) / r; const l = Math.hypot(vx, vy);
      const k = l > 1 ? 1 / l : 1; this.joy.set(vx * k, vy * k);
      this._joystickKnopf(this.joy.x * r, this.joy.y * r);
    } else if (document.pointerLockElement !== this.canvas) {
      // Drag = „Welt greifen": nach rechts ziehen → Blick dreht nach links
      this._blick(dx * this.sensDrag, dy * this.sensDrag);
    }
    this._melde("eingabe");
  }
  _up(e) {
    const p = this.pointer.get(e.pointerId); if (!p) return;
    this.pointer.delete(e.pointerId); if (this.pointer.size < 2) this.pinch = null;
    if (this.modus === "puppenhaus") { if (performance.now() - p.t0 < 250 && p.bewegt < 8) this._melde("tipp", e.clientX, e.clientY); return; }
    if (p.typ === "joystick") { this.joy.set(0, 0); this._joystickZeigen(false); return; }
    const dauer = performance.now() - p.t0;
    if (dauer < 250 && p.bewegt < 8) {
      if (e.pointerType === "mouse" && !this.touch && document.pointerLockElement !== this.canvas) { this.canvas.requestPointerLock?.({ unadjustedMovement: true })?.catch?.(() => this.canvas.requestPointerLock()); }
      else this._melde("tipp", e.clientX, e.clientY);
    }
  }
  _blick(dyaw, dpitch) { this.yawZiel += dyaw; this.pitchZiel = THREE.MathUtils.clamp(this.pitchZiel + dpitch, -PITCH_MAX, PITCH_MAX); }
  _joystickZeigen(an, x, y) { const j = this.joystickEl; if (!j) return; j.hidden = !an; if (an) { j.style.left = `${x}px`; j.style.top = `${y}px`; this._joystickKnopf(0, 0); } }
  _joystickKnopf(x, y) { const k = this.joystickEl?.firstElementChild; if (k) k.style.transform = `translate(${x}px, ${y}px)`; }

  // Modus: "ego" (Begehung) oder "puppenhaus" (Orbit über der Wohnung ohne Decke)
  setzeModus(m) {
    if (m === this.modus) return;
    if (m === "puppenhaus") { this.egoMerk = { pos: this.rig.position.clone(), yaw: this.yawZiel, pitch: this.pitchZiel }; this.joy.set(0, 0); this._joystickZeigen(false); document.exitPointerLock?.(); this.orbit.yaw = this.yawZiel + Math.PI; this.yaw = this.orbit.yaw; }
    else if (this.egoMerk) { this.rig.position.copy(this.egoMerk.pos); this.setzeBlick(this.egoMerk.yaw, this.egoMerk.pitch, true); }
    this.modus = m;
  }
  // Blick von außen setzen (Fahrten, Raumwechsel)
  setzeBlick(yaw, pitch = this.pitchZiel, sofort = false) { this.yawZiel = yaw; this.pitchZiel = THREE.MathUtils.clamp(pitch, -PITCH_MAX, PITCH_MAX); if (sofort) { this.yaw = yaw; this.pitch = this.pitchZiel; } }
  setzePosition(x, z) { this.rig.position.set(x, AUGE, z); }
  get position() { return this.rig.position; }
  get eingabeAktiv() { return this.tasten.size > 0 || this.joy.lengthSq() > 0.01 || [...this.pointer.values()].some((p) => p.typ === "blick" && p.bewegt > 8); }

  // Vertikales FOV aus horizontalem (Hochformat wird sonst zum Tunnel)
  setzeFov() {
    const a = this.kamera.aspect || 1;
    const v = 2 * Math.atan(Math.tan((this.hFov * Math.PI / 180) / 2) / a) * 180 / Math.PI;
    this.kamera.fov = THREE.MathUtils.clamp(v, 50, 100); this.kamera.updateProjectionMatrix();
  }

  // Kreis gegen Rechtecke, nur Hindernisse im Körperbereich (0,35–1,75 m)
  _kollidiere(pos) {
    for (let runde = 0; runde < 2; runde++) {
      for (const r of this.kollision) {
        if (r.yMin > 1.75 || r.yMax < 0.35) continue;
        const nx = Math.max(r.x1, Math.min(pos.x, r.x2)), nz = Math.max(r.z1, Math.min(pos.z, r.z2));
        let dx = pos.x - nx, dz = pos.z - nz; const d2 = dx * dx + dz * dz;
        if (d2 >= RADIUS * RADIUS) continue;
        if (d2 < 1e-9) { // Mittelpunkt im Rechteck: zur nächsten Kante schieben
          const l = pos.x - r.x1, rr = r.x2 - pos.x, o = pos.z - r.z1, u = r.z2 - pos.z; const m = Math.min(l, rr, o, u);
          if (m === l) pos.x = r.x1 - RADIUS; else if (m === rr) pos.x = r.x2 + RADIUS; else if (m === o) pos.z = r.z1 - RADIUS; else pos.z = r.z2 + RADIUS;
          continue;
        }
        const d = Math.sqrt(d2), k = (RADIUS - d) / d; pos.x += dx * k; pos.z += dz * k;
      }
    }
  }

  update(dt) {
    if (this.modus === "puppenhaus") {
      const o = this.orbit; const ziel = new THREE.Vector3(o.mitte.x + Math.sin(o.yaw) * Math.cos(o.pitch) * o.dist, o.mitte.y - Math.sin(o.pitch) * o.dist, o.mitte.z + Math.cos(o.yaw) * Math.cos(o.pitch) * o.dist);
      this.rig.position.lerp(ziel, 1 - Math.exp(-dt * 8));
      this.yaw += (o.yaw - this.yaw) * (1 - Math.exp(-dt * 8)); this.pitch += (o.pitch - this.pitch) * (1 - Math.exp(-dt * 8));
      this.rig.rotation.y = this.yaw; this.kopf.rotation.x = this.pitch; this.vel.set(0, 0); return;
    }
    // Blick dämpfen
    const kb = 1 - Math.exp(-dt * 18);
    this.yaw += (this.yawZiel - this.yaw) * kb; this.pitch += (this.pitchZiel - this.pitch) * kb;
    this.rig.rotation.y = this.yaw; this.kopf.rotation.x = this.pitch;
    if (!this.aktiv || this.gesperrt) { this.vel.set(0, 0); return; }
    // Wunschbewegung (lokal: x = seitwärts, y = vorwärts)
    let sx = 0, sy = 0;
    if (this.tasten.has("vor")) sy += 1; if (this.tasten.has("zurueck")) sy -= 1;
    if (this.tasten.has("rechts")) sx += 1; if (this.tasten.has("links")) sx -= 1;
    sx += this.joy.x; sy -= this.joy.y;
    const l = Math.hypot(sx, sy); if (l > 1) { sx /= l; sy /= l; }
    const schnell = this.tasten.has("schnell") || this.joy.length() > 0.85;
    const tempo = schnell ? SCHNELL : GEHEN;
    const kv = 1 - Math.exp(-dt * 10);
    this.vel.x += (sx * tempo - this.vel.x) * kv; this.vel.y += (sy * tempo - this.vel.y) * kv;
    if (this.vel.lengthSq() < 1e-6) return;
    const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    const wx = -s * this.vel.y + c * this.vel.x, wz = -c * this.vel.y - s * this.vel.x;
    const p = this.rig.position;
    p.x += wx * dt; this._kollidiere(p);
    p.z += wz * dt; this._kollidiere(p);
    p.y = AUGE;
  }
}
