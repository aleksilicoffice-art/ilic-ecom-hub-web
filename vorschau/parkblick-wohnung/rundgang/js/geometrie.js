// Geometrie-Helfer: Welt-UVs in Metern (nahtlose Texturen über Segmentgrenzen), Boxen, Zusammenführen.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const _p = new THREE.Vector3(), _n = new THREE.Vector3();

// UV = Weltkoordinate / Meter-pro-Kachel, projiziert nach dominanter Normale (Box-Projektion).
// Dadurch läuft eine Textur über alle Wandsegmente und Böden ohne Sprung weiter.
export function weltUV(geo, meterProKachel = 1, matrix = null, versatz = [0, 0]) {
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  if (!nor) geo.computeVertexNormals();
  const n2 = geo.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    _p.fromBufferAttribute(pos, i); _n.fromBufferAttribute(n2, i);
    if (matrix) { _p.applyMatrix4(matrix); _n.transformDirection(matrix); }
    const ax = Math.abs(_n.x), ay = Math.abs(_n.y), az = Math.abs(_n.z);
    let u, v;
    if (ay >= ax && ay >= az) { u = _p.x; v = _p.z; }
    else if (ax >= az) { u = _p.z; v = _p.y; }
    else { u = _p.x; v = _p.y; }
    uv[i * 2] = u / meterProKachel + versatz[0];
    uv[i * 2 + 1] = v / meterProKachel + versatz[1];
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geo;
}

// Box mit Mittelpunkt (cx, cy, cz) und Maßen (w, h, d), optional um Y gedreht; in Weltkoordinaten eingebacken.
export function box(w, h, d, cx = 0, cy = 0, cz = 0, rotY = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Matrix4().makeRotationY(rotY).setPosition(cx, cy, cz);
  g.applyMatrix4(m);
  return g;
}
// Box, die von (x1,y1,z1) bis (x2,y2,z2) reicht (achsparallel) — bequem für Wände/Platten.
export function boxVonBis(x1, y1, z1, x2, y2, z2) {
  return box(Math.abs(x2 - x1), Math.abs(y2 - y1), Math.abs(z2 - z1), (x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
}
export function rundbox(w, h, d, radius = 0.02, segmente = 3, cx = 0, cy = 0, cz = 0, rotY = 0) {
  const g = new RoundedBoxGeometry(w, h, d, segmente, Math.min(radius, Math.min(w, h, d) / 2));
  g.applyMatrix4(new THREE.Matrix4().makeRotationY(rotY).setPosition(cx, cy, cz));
  return g;
}
// Mehrere Geometrien (gleiche Attribute) zu einer zusammenführen; leere Liste → null.
export function vereine(liste) {
  const g = liste.filter(Boolean);
  if (!g.length) return null;
  const alle = g.map((x) => { const y = x.index ? x.toNonIndexed() : x; if (!y.attributes.uv) weltUV(y, 1); return y; });
  const r = mergeGeometries(alle, false);
  g.forEach((x) => x.dispose());
  return r;
}
// Zylinder/Rohr (für Tisch- und Lampenbeine, Handläufe, Stangen).
export function zylinder(r, h, cx = 0, cy = 0, cz = 0, seg = 16, rTop = r) {
  const g = new THREE.CylinderGeometry(rTop, r, h, seg);
  g.translate(cx, cy, cz);
  return g;
}
export function kugel(r, cx = 0, cy = 0, cz = 0, seg = 16) {
  const g = new THREE.SphereGeometry(r, seg, Math.max(8, seg / 2));
  g.translate(cx, cy, cz);
  return g;
}
// Achsparalleles Kollisionsrechteck in XZ mit Höhenbereich (für Spielerkreis-Kollision).
export function kollisionsRechteck(x1, z1, x2, z2, yMin = 0, yMax = 2.6, name = "") {
  return { x1: Math.min(x1, x2), z1: Math.min(z1, z2), x2: Math.max(x1, x2), z2: Math.max(z1, z2), yMin, yMax, name };
}

// Sammler: Geometrien je Material einsammeln und am Ende zu wenigen Meshes zusammenführen (Draw-Calls sparen).
export class Sammler {
  constructor() { this.eimer = new Map(); }
  add(key, material, kachel, geo, opts = {}) {
    if (!geo) return;
    let e = this.eimer.get(key);
    if (!e) { e = { material, kachel, geos: [], wirft: true, empfaengt: true, transparent: false, renderOrder: 0, ...opts }; this.eimer.set(key, e); }
    e.geos.push(geo);
  }
  meshes(ziel) {
    const out = [];
    for (const [key, e] of this.eimer) {
      const geo = vereine(e.geos); if (!geo) continue;
      weltUV(geo, e.kachel);
      const m = new THREE.Mesh(geo, e.material); m.name = key;
      m.castShadow = e.wirft && !e.transparent; m.receiveShadow = e.empfaengt && !e.transparent;
      if (e.renderOrder) m.renderOrder = e.renderOrder;
      ziel.add(m); out.push(m);
    }
    return out;
  }
}
