// Architektur aus plan.js: Wände mit Öffnungen (Laibungen entstehen aus den Segmentboxen), Böden/Decken je Raum,
// Platten, Sockelleisten, Fliesenspiegel, Zargen + Türblätter, Fensterrahmen + Glas + Fensterbänke, Balkon mit
// Glasbrüstung, Baukörper darunter/darüber, Park. Liefert gemergte Meshes je Material + Kollisionsrechtecke.
import * as THREE from "three";
import { weltUV, box, boxVonBis, vereine, zylinder, kugel, kollisionsRechteck } from "./geometrie.js";
import { KACHEL } from "./material.js";
import { fliesenTexturen, fassadenSatz } from "./texturen.js";

const EPS = 1e-4, UEBER = 0.3, YBOT = -0.05, SOCKEL_H = 0.07, SOCKEL_D = 0.012;
const TUER_ZARGE = 0.06, BLATT_D = 0.04;

export function baueArchitektur(PLAN, mat) {
  const H = PLAN.meta.hoehe, YTOP = H + UEBER;
  const [ix1, iz1, ix2, iz2] = PLAN.meta.innen, [hx1, hz1, hx2, hz2] = PLAN.meta.huelle;
  const mitte = { x: (ix1 + ix2) / 2, z: (iz1 + iz2) / 2 };
  const gruppe = new THREE.Group(); gruppe.name = "architektur";
  const oben = new THREE.Group(); oben.name = "oben"; gruppe.add(oben);   // Decken + Baukörper darüber (Puppenhaus blendet aus)
  const kollision = [], boeden = [], tuerBlaetter = [];
  const sammler = new Map();
  const fliesen = fliesenTexturen();
  const fassaden = fassadenSatz(4);

  // Materialien, die bau.js zusätzlich braucht
  const M = {
    putz: mat.putz, decke: mat.decke, parkett: mat.parkett, terrazzo: mat.terrazzo, beton: mat.beton,
    weiss: mat.weissLack, furnier: mat.furnier, messing: mat.messing, schwarz: mat.schwarzMatt,
    glas: mat.glas(), milch: mat.glas({ milch: true }),
    rohbeton: mat.einfach(0xb3aea6, { rauheit: 0.95 }),
    fassade: mat.einfach(0xd7d2c8, { rauheit: 0.9, env: 0.4 }),
    fliesen: new THREE.MeshStandardMaterial({ map: fliesen.farbe, roughnessMap: fliesen.rauheit, roughness: 1, metalness: 0, envMapIntensity: 0.8 }),
    rasen: mat.rasen, weg: mat.einfach(0xc8c1b3, { rauheit: 0.95, env: 0.3 }),
    laub: [0x4f7a3a, 0x5c8a42, 0x47703a, 0x6a9450].map((f) => mat.einfach(f, { rauheit: 0.95, env: 0.3 })),
    stamm: mat.einfach(0x5a4632, { rauheit: 0.95, env: 0.2 }),
    holzAussen: mat.einfach(0x8a6a4a, { rauheit: 0.8 }),
    laterne: mat.einfach(0xfff1d6, { emissive: 0xffd9a0, emissiveIntensity: 0, rauheit: 0.5 }),
    nachbar: fassaden.map((f) => new THREE.MeshStandardMaterial({ map: f.farbe, emissiveMap: f.emissive, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.9, metalness: 0, envMapIntensity: 0.3 })),
  };

  const sammle = (schluessel, material, kachel, geo, opts = {}) => {
    if (!geo) return;
    const key = opts.ziel === oben ? `${schluessel}@oben` : schluessel;   // je Zielgruppe ein eigenes Mesh
    let s = sammler.get(key);
    if (!s) { s = { material, kachel, geos: [], wirft: true, empfaengt: true, ziel: gruppe, transparent: false, ...opts }; sammler.set(key, s); }
    s.geos.push(geo);
  };

  // ------------------------------------------------------------------ Wände
  const istX = (w) => Math.abs(w.bis[1] - w.von[1]) < EPS;
  const wandInfo = (w) => {
    const x = istX(w);
    const a = Math.min(x ? w.von[0] : w.von[1], x ? w.bis[0] : w.bis[1]), b = Math.max(x ? w.von[0] : w.von[1], x ? w.bis[0] : w.bis[1]);
    const c = x ? w.von[1] : w.von[0];
    const innenSeite = Math.sign((x ? mitte.z : mitte.x) - c) || 1;  // +1: Innenraum liegt bei größerer Koordinate
    return { x, a, b, c, d: w.dicke, innenSeite, p1: c - w.dicke / 2, p2: c + w.dicke / 2 };
  };
  // Box im Wandsystem: s..e entlang der Achse, q1..q2 quer, y1..y2
  const wandBox = (i, s, e, q1, q2, y1, y2) => (i.x ? boxVonBis(s, y1, q1, e, y2, q2) : boxVonBis(q1, y1, s, q2, y2, e));
  const wandRect = (i, s, e, q1, q2, y1, y2, name) => (i.x ? kollisionsRechteck(s, q1, e, q2, y1, y2, name) : kollisionsRechteck(q1, s, q2, e, y1, y2, name));

  for (const w of PLAN.waende) {
    const i = wandInfo(w);
    const oeff = [...(w.oeffnungen || [])].sort((p, q) => p.von - q.von);
    // Schichten: Außenwand = 0,2 Putz innen + Rest Fassade außen; Innenwand = eine Putzschicht
    const schichten = w.aussen
      ? (i.innenSeite > 0 ? [[i.p2 - 0.2, i.p2, "putz"], [i.p1, i.p2 - 0.2, "fassade"]] : [[i.p1, i.p1 + 0.2, "putz"], [i.p1 + 0.2, i.p2, "fassade"]])
      : [[i.p1, i.p2, "putz"]];
    const stuecke = []; // [s, e, y1, y2]
    let cursor = i.a;
    for (const o of oeff) {
      if (o.von > cursor + EPS) stuecke.push([cursor, o.von, YBOT, YTOP]);
      if (o.unten > 0.001) stuecke.push([o.von, o.bis, YBOT, o.unten]);
      if (o.oben < YTOP - EPS) stuecke.push([o.von, o.bis, o.oben, YTOP]);
      cursor = o.bis;
    }
    if (cursor < i.b - EPS) stuecke.push([cursor, i.b, YBOT, YTOP]);
    for (const [q1, q2, matKey] of schichten) {
      for (const [s, e, y1, y2] of stuecke) {
        sammle(matKey, M[matKey], matKey === "putz" ? KACHEL.putz : 3.2, wandBox(i, s, e, q1, q2, y1, y2));
      }
    }
    for (const [s, e, y1, y2] of stuecke) kollision.push(wandRect(i, s, e, i.p1, i.p2, y1, y2, w.id));

    // Öffnungen ausstatten
    for (const o of oeff) {
      if (o.typ === "fenster" || o.typ === "balkontuer") baueFenster(i, o, w);
      else if (o.typ === "tuer" || o.typ === "haustuer") baueTuer(i, o, w);
      else if (o.typ === "durchgang") { /* offen */ }
      // Boden in der Öffnung (Schwelle)
      if (o.unten < 0.05) {
        const bodenMat = o.typ === "balkontuer" || o.typ === "haustuer" ? "schwarz" : "parkett";
        const y1 = -0.02, y2 = bodenMat === "schwarz" ? 0.015 : 0;
        sammle(bodenMat, M[bodenMat], KACHEL.parkett, wandBox(i, o.von, o.bis, i.p1, i.p2, y1, y2), { wirft: false });
      }
    }
  }

  function baueFenster(i, o, w) {
    const breite = o.bis - o.von, hoehe = o.oben - o.unten;
    const ebene = i.c - i.innenSeite * (i.d / 2 - 0.12);           // Fensterebene 12 cm hinter der Außenkante
    const tiefe = 0.07, q1 = ebene - tiefe / 2, q2 = ebene + tiefe / 2, r = 0.06;
    const rahmen = [
      wandBox(i, o.von, o.von + r, q1, q2, o.unten, o.oben), wandBox(i, o.bis - r, o.bis, q1, q2, o.unten, o.oben),
      wandBox(i, o.von + r, o.bis - r, q1, q2, o.oben - r, o.oben), wandBox(i, o.von + r, o.bis - r, q1, q2, o.unten, o.unten + r),
    ];
    const fluegel = o.fluegel || (breite > 1.3 ? 2 : 1);
    if (fluegel === 2) { const m = (o.von + o.bis) / 2; rahmen.push(wandBox(i, m - r / 2, m + r / 2, q1, q2, o.unten + r, o.oben - r)); }
    if (o.typ === "balkontuer") rahmen.push(wandBox(i, o.von + r, o.bis - r, q1, q2, 0.9 - r / 2, 0.9 + r / 2)); // Querholm Tür
    for (const g of rahmen) sammle("weiss", M.weiss, 1, g, { wirft: false });
    const glasKey = o.milch ? "milch" : "glas";
    sammle(glasKey, M[glasKey], 1, wandBox(i, o.von + r, o.bis - r, ebene - 0.004, ebene + 0.004, o.unten + r, o.oben - r), { wirft: false, empfaengt: false, transparent: true });
    if (o.unten > 0.1) { // Fensterbank innen (ragt 4 cm vor) + außen (2 cm)
      const innenKante = i.c + i.innenSeite * i.d / 2;
      const [b1, b2] = i.innenSeite > 0 ? [q2, innenKante + 0.04] : [innenKante - 0.04, q1];
      sammle("weiss", M.weiss, 1, wandBox(i, o.von - 0.05, o.bis + 0.05, b1, b2, o.unten - 0.03, o.unten + 0.01));
      kollision.push(wandRect(i, o.von, o.bis, Math.min(b1, b2), Math.max(b1, b2), 0, o.unten + 0.01, "fensterbank"));
      const aussenKante = i.c - i.innenSeite * i.d / 2;
      const [a1, a2] = i.innenSeite > 0 ? [aussenKante - 0.02, q1] : [q2, aussenKante + 0.02];
      sammle("fassade", M.fassade, 3.2, wandBox(i, o.von - 0.03, o.bis + 0.03, a1, a2, o.unten - 0.04, o.unten));
    }
  }

  function baueTuer(i, o, w) {
    const breite = o.bis - o.von, r = TUER_ZARGE;
    const q1 = i.p1 - 0.015, q2 = i.p2 + 0.015;
    const zarge = [wandBox(i, o.von, o.von + r, q1, q2, 0, o.oben), wandBox(i, o.bis - r, o.bis, q1, q2, 0, o.oben), wandBox(i, o.von + r, o.bis - r, q1, q2, o.oben - r, o.oben)];
    for (const g of zarge) sammle("weiss", M.weiss, 1, g, { wirft: false });
    const blattB = breite - 2 * r - 0.008, blattH = o.oben - r - 0.012;
    // Richtung ins Zielzimmer + Winkel
    const zielRaum = PLAN.raeume.find((x) => x.id === o.nach);
    const zielPerp = zielRaum ? (i.x ? (zielRaum.rect[1] + zielRaum.rect[3]) / 2 : (zielRaum.rect[0] + zielRaum.rect[2]) / 2) : i.c + i.innenSeite;
    const seite = Math.sign(zielPerp - i.c) || 1;
    const winkel = o.typ === "haustuer" ? 0 : (o.winkel ?? 100) * Math.PI / 180;
    const hingeAchse = o.anschlag === "ende" ? o.bis - r : o.von + r, richtung = o.anschlag === "ende" ? -1 : 1;
    const dirAchse = i.x ? new THREE.Vector3(richtung, 0, 0) : new THREE.Vector3(0, 0, richtung);
    const dirNach = i.x ? new THREE.Vector3(0, 0, seite) : new THREE.Vector3(seite, 0, 0);
    const offen = dirAchse.clone().multiplyScalar(Math.cos(winkel)).addScaledVector(dirNach, Math.sin(winkel));
    const hingeQ = winkel === 0 ? i.c : i.c + seite * (i.d / 2 - BLATT_D / 2 - 0.004);
    const hinge = i.x ? new THREE.Vector3(hingeAchse, 0, hingeQ) : new THREE.Vector3(hingeQ, 0, hingeAchse);
    const theta = Math.atan2(-offen.z, offen.x);
    const blattMat = o.typ === "haustuer" ? "furnier" : "weiss";
    const dicke = o.typ === "haustuer" ? 0.06 : BLATT_D;
    const mk = (geo) => geo.applyMatrix4(new THREE.Matrix4().makeRotationY(theta).setPosition(hinge));
    sammle(blattMat, M[blattMat], KACHEL.furnier, mk(box(blattB, blattH, dicke, blattB / 2, blattH / 2 + 0.01, 0)));
    // Drücker beidseitig (Messing): Rosette + Griff
    for (const s of [-1, 1]) {
      const gz = s * (dicke / 2 + 0.012);
      const rosette = new THREE.CylinderGeometry(0.025, 0.025, 0.012, 12); rosette.rotateX(Math.PI / 2); rosette.translate(blattB - 0.08, 1.05, gz);
      sammle("messing", M.messing, 1, mk(rosette), { wirft: false });
      sammle("messing", M.messing, 1, mk(box(0.12, 0.018, 0.018, blattB - 0.08 - 0.045, 1.05, gz + s * 0.02)), { wirft: false });
    }
    // Kollision des Türblatts (AABB der Grundfläche)
    const ende = hinge.clone().addScaledVector(offen, blattB);
    const pad = 0.03;
    kollision.push(kollisionsRechteck(Math.min(hinge.x, ende.x) - pad, Math.min(hinge.z, ende.z) - pad, Math.max(hinge.x, ende.x) + pad, Math.max(hinge.z, ende.z) + pad, 0, 2, `tuer-${o.nach || "haus"}`));
    tuerBlaetter.push({ hinge, offen, breite: blattB, raum: o.nach });
  }
  // ------------------------------------------------------------------ Böden, Decken, Platten
  for (const r of PLAN.raeume) {
    const [x1, z1, x2, z2] = r.rect;
    if (r.aussen) continue;
    const bodenMat = r.boden === "terrazzo" ? "terrazzo" : "parkett";
    sammle(bodenMat, M[bodenMat], KACHEL[bodenMat], boxVonBis(x1, -0.02, z1, x2, 0, z2), { wirft: false });
    sammle("decke", M.decke, KACHEL.putz, boxVonBis(x1, H, z1, x2, H + 0.02, z2), { wirft: false, ziel: oben });
  }
  // Rohbetonplatten (unter dem Boden / über der Decke), Baukörper
  sammle("rohbeton", M.rohbeton, 2, boxVonBis(hx1, -0.3, hz1, hx2, -0.02, hz2), { wirft: false });
  sammle("rohbeton", M.rohbeton, 2, boxVonBis(hx1, H + 0.02, hz1, hx2, H + UEBER, hz2), { wirft: false, ziel: oben });

  // ------------------------------------------------------------------ Sockelleisten + Fliesenspiegel
  const kantenSpannen = (raum, kante) => {
    const [x1, z1, x2, z2] = raum.rect;
    const def = { n: { x: true, koord: z1, a: x1, b: x2, seite: -1 }, s: { x: true, koord: z2, a: x1, b: x2, seite: 1 }, w: { x: false, koord: x1, a: z1, b: z2, seite: -1 }, o: { x: false, koord: x2, a: z1, b: z2, seite: 1 } }[kante];
    const spannen = [];
    for (const w of PLAN.waende) {
      const i = wandInfo(w); if (i.x !== def.x) continue;
      const face = def.seite < 0 ? i.p2 : i.p1;                   // Wandfläche, die zum Raum zeigt
      if (Math.abs(face - def.koord) > 0.02) continue;
      if (Math.sign(i.c - def.koord) !== def.seite) continue;
      let s = Math.max(def.a, i.a), e = Math.min(def.b, i.b); if (e - s < 0.02) continue;
      let teile = [[s, e]];
      for (const o of w.oeffnungen || []) if (o.unten < 0.05) teile = teile.flatMap(([ts, te]) => (o.bis <= ts || o.von >= te ? [[ts, te]] : [[ts, Math.max(ts, o.von)], [Math.min(te, o.bis), te]])).filter(([ts, te]) => te - ts > 0.02);
      spannen.push(...teile);
    }
    return { ...def, spannen };
  };
  for (const r of PLAN.raeume) {
    if (r.aussen) continue;
    const band = PLAN.baender?.[r.id];
    for (const k of ["n", "s", "w", "o"]) {
      const sp = kantenSpannen(r, k);
      for (const [s, e] of sp.spannen) {
        const [q1, q2] = sp.seite < 0 ? [sp.koord, sp.koord + SOCKEL_D] : [sp.koord - SOCKEL_D, sp.koord];
        const mkB = (qa, qb, y1, y2) => (sp.x ? boxVonBis(s, y1, qa, e, y2, qb) : boxVonBis(qa, y1, s, qb, y2, e));
        if (band?.fliesen) {
          const [f1, f2] = sp.seite < 0 ? [sp.koord, sp.koord + 0.01] : [sp.koord - 0.01, sp.koord];
          sammle("fliesen", M.fliesen, 1.2, mkB(f1, f2, 0, band.fliesen), { wirft: false });
        } else {
          sammle("weiss", M.weiss, 1, mkB(q1, q2, 0, SOCKEL_H), { wirft: false });
        }
      }
    }
  }

  // ------------------------------------------------------------------ Balkon
  {
    const b = PLAN.balkon, [px1, pz1, px2, pz2] = b.platte, [bx1, bz1, bx2, bz2] = b.rect;
    sammle("beton", M.beton, KACHEL.beton, boxVonBis(px1, -0.24, pz1, px2, -0.02, pz2), { wirft: true });
    sammle("fassade", M.fassade, 3.2, boxVonBis(px1, H, pz1, px2, H + 0.25, pz2), { ziel: oben });   // Balkondecke (Platte darüber)
    const hoehe = b.bruestung;
    const kanten = { w: [[bx1, bz1], [bx1, bz2]], s: [[bx1, bz2], [bx2, bz2]], o: [[bx2, bz2], [bx2, bz1]] };
    for (const k of b.offen) {
      const [[ax, az], [ex, ez]] = kanten[k]; const len = Math.hypot(ex - ax, ez - az); const n = Math.max(1, Math.round(len / 1.1));
      const dx = (ex - ax) / len, dz = (ez - az) / len;
      const senkrecht = Math.abs(dx) > 0.5; // Kante läuft entlang x → Brüstung quer dazu dünn in z
      for (let j = 0; j <= n; j++) { const x = ax + dx * (len * j / n), z = az + dz * (len * j / n); sammle("schwarz", M.schwarz, 1, box(0.04, hoehe, 0.04, x, hoehe / 2, z)); }
      // Glas durchgehend + Handlauf
      const cx = (ax + ex) / 2, cz = (az + ez) / 2;
      sammle("glas", M.glas, 1, senkrecht ? box(len - 0.06, hoehe - 0.14, 0.012, cx, 0.1 + (hoehe - 0.14) / 2, cz) : box(0.012, hoehe - 0.14, len - 0.06, cx, 0.1 + (hoehe - 0.14) / 2, cz), { wirft: false, empfaengt: false, transparent: true });
      sammle("schwarz", M.schwarz, 1, senkrecht ? box(len + 0.04, 0.04, 0.06, cx, hoehe + 0.02, cz) : box(0.06, 0.04, len + 0.04, cx, hoehe + 0.02, cz));
      kollision.push(senkrecht ? kollisionsRechteck(Math.min(ax, ex), cz - 0.05, Math.max(ax, ex), cz + 0.05, 0, hoehe, "bruestung") : kollisionsRechteck(cx - 0.05, Math.min(az, ez), cx + 0.05, Math.max(az, ez), 0, hoehe, "bruestung"));
    }
  }

  // ------------------------------------------------------------------ Baukörper darunter/darüber, Nachbarbalkone
  {
    const y0 = PLAN.aussen.bodenY;
    const geb = M.nachbar[0];
    sammle("gebaeude", geb, 3.2, boxVonBis(hx1, y0, hz1, hx2, -0.3, hz2), { wirft: false });
    sammle("gebaeude", geb, 3.2, boxVonBis(hx1, H + UEBER, hz1, hx2, H + UEBER + 6.4, hz2), { wirft: false, ziel: oben });
    sammle("fassade", M.fassade, 3.2, boxVonBis(hx1 - 0.1, H + UEBER + 6.4, hz1 - 0.1, hx2 + 0.1, H + UEBER + 6.9, hz2 + 0.1), { wirft: false, ziel: oben });
    const [px1, pz1, px2, pz2] = PLAN.balkon.platte;
    for (const dy of [-3.2, -6.4, 3.2]) { // Balkone der Nachbarwohnungen
      const ziel = dy > 0 ? oben : gruppe;
      sammle("fassade", M.fassade, 3.2, boxVonBis(px1, dy - 0.24, pz1, px2, dy - 0.02, pz2), { wirft: false, ziel });
      sammle("glas", M.glas, 1, box(px2 - px1 - 0.2, 1.0, 0.012, (px1 + px2) / 2, dy + 0.6, pz2 - 0.1), { wirft: false, empfaengt: false, transparent: true, ziel });
      sammle("schwarz", M.schwarz, 1, box(px2 - px1 - 0.1, 0.04, 0.06, (px1 + px2) / 2, dy + 1.12, pz2 - 0.1), { wirft: false, ziel });
    }
  }

  // ------------------------------------------------------------------ Park
  {
    const y0 = PLAN.aussen.bodenY, A = PLAN.aussen;
    sammle("rasen", M.rasen, KACHEL.rasen, box(320, 0.1, 320, 4.5, y0 - 0.05, 40), { wirft: false });
    // Weg als Kette gedrehter Boxen
    for (let k = 0; k < A.weg.length - 1; k++) {
      const [ax, az] = A.weg[k], [bx, bz] = A.weg[k + 1]; const len = Math.hypot(bx - ax, bz - az) + 0.6;
      sammle("weg", M.weg, 2, box(len, 0.03, 2.4, (ax + bx) / 2, y0 + 0.015, (az + bz) / 2, -Math.atan2(bz - az, bx - ax)), { wirft: false });
    }
    let n = 0;
    for (const [x, z, s] of A.baeume) {
      const h = 4.5 * s, rk = 2.4 * s, laub = M.laub[n++ % M.laub.length];
      sammle("stamm", M.stamm, 1, zylinder(0.22 * s, h, x, y0 + h / 2, z, 8, 0.16 * s));
      const kronen = [[0, h + rk * 0.6, 0, rk], [rk * 0.6, h + rk * 0.3, rk * 0.2, rk * 0.75], [-rk * 0.5, h + rk * 0.2, -rk * 0.4, rk * 0.7], [0.1, h + rk * 1.3, 0.2, rk * 0.65]];
      for (const [dx, dy, dz, r] of kronen) sammle(`laub${n % M.laub.length}`, laub, 1, kugel(r, x + dx, y0 + dy, z + dz, 9));
    }
    for (const [x, z] of A.buesche) sammle("laub1", M.laub[1], 1, kugel(0.9, x, y0 + 0.6, z, 8));
    for (const [x, z, rot] of A.baenke) { sammle("holzAussen", M.holzAussen, 1, box(1.8, 0.06, 0.45, x, y0 + 0.45, z, rot)); sammle("holzAussen", M.holzAussen, 1, box(1.8, 0.4, 0.05, x, y0 + 0.7, z, rot)); sammle("schwarz", M.schwarz, 1, box(1.6, 0.42, 0.4, x, y0 + 0.21, z, rot)); }
    for (const [x, z] of A.laternen) { sammle("schwarz", M.schwarz, 1, zylinder(0.05, 4, x, y0 + 2, z, 8)); sammle("laterne", M.laterne, 1, kugel(0.22, x, y0 + 4.15, z, 10), { wirft: false }); }
    A.nachbarn.forEach(([x, z, b, t, h], k) => sammle(`nachbar${k % M.nachbar.length}`, M.nachbar[k % M.nachbar.length], 3.2, box(b, h, t, x, y0 + h / 2, z), { wirft: false }));
  }

  // ------------------------------------------------------------------ Meshes erzeugen
  const meshes = {};
  for (const [key, s] of sammler) {
    const geo = vereine(s.geos); if (!geo) continue;
    weltUV(geo, s.kachel);
    const m = new THREE.Mesh(geo, s.material); m.name = key;
    m.castShadow = s.wirft && !s.transparent; m.receiveShadow = s.empfaengt && !s.transparent;
    if (s.transparent) { m.renderOrder = 5; }
    if (["parkett", "terrazzo", "beton"].includes(key)) { m.userData.istBoden = true; boeden.push(m); }
    if (key.startsWith("glas") || key.startsWith("milch")) m.userData.istGlas = true;
    s.ziel.add(m); meshes[key] = m;
  }
  const huelle = new THREE.Box3(new THREE.Vector3(hx1, -0.3, hz1), new THREE.Vector3(Math.max(hx2, PLAN.balkon.platte[2]), H + UEBER, Math.max(hz2, PLAN.balkon.platte[3])));
  for (const m of [...M.nachbar, M.laterne]) m.userData.nachtLicht = true;   // Fenster/Laternen leuchten nachts
  M.laterne.userData.nachtStaerke = 6; for (const m of M.nachbar) m.userData.nachtStaerke = 1.4;
  const aussenMaterialien = [M.rasen, M.weg, ...M.laub, M.stamm, M.holzAussen, M.laterne, ...M.nachbar, M.fassade, M.beton];
  return { gruppe, oben, kollision, boeden, meshes, huelle, tuerBlaetter, materialien: M, aussenMaterialien };
}
