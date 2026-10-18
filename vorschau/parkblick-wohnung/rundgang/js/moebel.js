// Parametrische Einrichtung: Leuchten (Teil 1) und Möbel (Teil 2). Alles aus Boxen, Rundboxen, Zylindern, Drehkörpern —
// gesammelt je Material und zu wenigen Meshes verschmolzen. Lampen registrieren sich beim Licht (Schaltgruppen).
import * as THREE from "three";
import { box, rundbox, zylinder, kugel, kollisionsRechteck, Sammler, weltUV } from "./geometrie.js";
import { KACHEL } from "./material.js";
import { bildschirmTextur } from "./texturen.js";

const grad = Math.PI / 180;

// ---------------------------------------------------------------- Teil 1: Leuchten aus plan.lichter
export function baueLeuchten(PLAN, mat, licht) {
  const gruppe = new THREE.Group(); gruppe.name = "leuchten";
  const H = PLAN.meta.hoehe;
  const metall = mat.schwarzMatt;
  for (const L of PLAN.lichter) {
    const [x, z] = L.pos; const g = new THREE.Group(); g.name = L.id;
    const schirm = schirmMaterial(); let lichtPos;
    if (L.typ === "decke") {
      g.add(new THREE.Mesh(zylinder(0.19, 0.012, 0, H - 0.006, 0, 32), mat.weissLack));
      g.add(new THREE.Mesh(zylinder(0.17, 0.04, 0, H - 0.03, 0, 32), schirm));
      lichtPos = new THREE.Vector3(0, H - 0.12, 0);
    } else if (L.typ === "pendel") {
      const h = L.hoehe ?? 1.8, r = L.radius ?? 0.15;
      g.add(new THREE.Mesh(zylinder(0.03, 0.02, 0, H - 0.01, 0, 16), metall));
      g.add(new THREE.Mesh(zylinder(0.003, H - h - r, 0, (H + h + r) / 2, 0, 6), metall));
      g.add(new THREE.Mesh(zylinder(0.03, 0.05, 0, h + r + 0.02, 0, 16), metall));
      const k = new THREE.Mesh(kugel(r, 0, h, 0, 24), schirm); k.castShadow = false; g.add(k);
      lichtPos = new THREE.Vector3(0, h - r * 0.4, 0);
    } else if (L.typ === "wand") {
      const h = L.hoehe ?? 2.0;
      g.add(new THREE.Mesh(box(0.12, 0.2, 0.06, 0, h, 0.03), metall));
      g.add(new THREE.Mesh(box(0.1, 0.1, 0.05, 0, h, 0.06), schirm));
      lichtPos = new THREE.Vector3(0, h, 0.15);
    }
    g.position.set(x, 0, z); gruppe.add(g);
    let punkt = null;
    if (L.licht !== false) { punkt = new THREE.PointLight(0xffd9a8, 0, 7, 2); punkt.position.copy(lichtPos); g.add(punkt); }
    licht.registriereLampe({ id: L.id, gruppe: L.gruppe, licht: punkt, emissive: [schirm], staerke: L.cd ?? 4, emissiveStaerke: 2.2 });
  }
  return { gruppe };
}
function schirmMaterial(farbe = 0xfbf7ef) { return new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.6, metalness: 0, emissive: 0xffd9a8, emissiveIntensity: 0 }); }

// ---------------------------------------------------------------- Teil 2: Möbel aus plan.moebel (typ "param")
export function baueMoebel(PLAN, mat, licht) {
  const gruppe = new THREE.Group(); gruppe.name = "moebel";
  const S = new Sammler(); const kollision = []; const einzel = [];
  const M = {
    holz: mat.furnier, weiss: mat.weissLack, schwarz: mat.schwarzMatt, messing: mat.messing, keramik: mat.keramik, marmor: mat.marmor,
    chrom: mat.einfach(0xd8dadc, { rauheit: 0.25, metall: 1 }), stahl: mat.einfach(0xb9bcbf, { rauheit: 0.4, metall: 0.9 }),
    glasSchwarz: mat.einfach(0x15171a, { rauheit: 0.15, metall: 0.3 }), dunkel: mat.einfach(0x2b2724, { rauheit: 0.8 }),
    leinen: mat.stoffIn(0xeae4da), bettwaesche: mat.stoffIn(0xf2eee7), polster: mat.stoffIn(0xc9bfae), kissen: mat.stoffIn(0xd6cdbd),
    spiegel: mat.einfach(0xe0e5e9, { rauheit: 0.03, metall: 1, env: 1.6 }),
    beton: mat.einfach(0xb3aea6, { rauheit: 0.95 }), erde: mat.einfach(0x3f3128, { rauheit: 1 }),
    laub: mat.einfach(0x5c8a42, { rauheit: 0.95, env: 0.3 }), laub2: mat.einfach(0x4f7a3a, { rauheit: 0.95, env: 0.3 }),
    orange: mat.einfach(0xe8903a, { rauheit: 0.5 }), vorhang: new THREE.MeshStandardMaterial({ color: 0xece6dc, roughness: 1, metalness: 0, side: THREE.DoubleSide, transparent: true, opacity: 0.9, depthWrite: false }),
  };
  const buchFarben = [0x7a5c4a, 0x465a6b, 0xa89b84, 0x5e6b4f, 0x8c3b2f, 0xd8cdb8, 0x2f3b4a, 0xb08a4a, 0x6b4f6e];
  const buchMat = buchFarben.map((f) => mat.einfach(f, { rauheit: 0.85 }));
  let zufall = 7;
  const rnd = () => { zufall = (zufall * 9301 + 49297) % 233280; return zufall / 233280; };

  // Platzierungs-Matrix: lokales +z = Front; Ursprung am Boden
  const matrix = (m) => new THREE.Matrix4().makeRotationY((m.rotY ?? 0) * grad).setPosition(m.pos?.[0] ?? 0, m.pos?.[1] ?? 0, m.pos?.[2] ?? 0);
  const add = (key, material, kachel, geo, T, opts) => { if (geo) { geo.applyMatrix4(T); S.add(key, material, kachel, geo, opts); } };
  const rect = (T, x1, z1, x2, z2, yMin, yMax, name) => { // lokales Rechteck → Welt-AABB
    const pts = [[x1, z1], [x2, z1], [x1, z2], [x2, z2]].map(([x, z]) => new THREE.Vector3(x, 0, z).applyMatrix4(T));
    const xs = pts.map((p) => p.x), zs = pts.map((p) => p.z);
    kollision.push(kollisionsRechteck(Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs), yMin, yMax, name));
  };
  const lampe = (m, cfg, schirm, lichtPos, T) => {
    let punkt = null;
    if (cfg.cd) { punkt = new THREE.PointLight(0xffd9a8, 0, 6, 2); punkt.position.copy(lichtPos.clone().applyMatrix4(T)); gruppe.add(punkt); }
    licht.registriereLampe({ id: cfg.id || m.id, gruppe: cfg.gruppe || m.raum, licht: punkt, emissive: [schirm], staerke: cfg.cd ?? 1, emissiveStaerke: 2.4 });
  };
  const einzelMesh = (geo, material, T, { wirft = true, empfaengt = true, renderOrder = 0 } = {}) => { geo.applyMatrix4(T); const mesh = new THREE.Mesh(geo, material); mesh.castShadow = wirft; mesh.receiveShadow = empfaengt; mesh.renderOrder = renderOrder; gruppe.add(mesh); einzel.push(mesh); return mesh; };

  // Bauteile ------------------------------------------------------
  const B = {
    teppich(m, T) { add(`teppich${m.farbe}`, mat.stoffIn(m.farbe ?? 0xcdc3b3), KACHEL.stoff, rundbox(m.b, 0.012, m.t, 0.006, 2, 0, 0.006, 0), T, { wirft: false }); },

    esstisch(m, T) {
      const b = m.b ?? 1.6, t = m.t ?? 0.9;
      add("holz", M.holz, KACHEL.furnier, rundbox(b, 0.04, t, 0.008, 2, 0, 0.76, 0), T);
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add("holz", M.holz, KACHEL.furnier, box(0.06, 0.74, 0.06, sx * (b / 2 - 0.1), 0.37, sz * (t / 2 - 0.1)), T);
      rect(T, -b / 2 + 0.05, -t / 2 + 0.05, b / 2 - 0.05, t / 2 - 0.05, 0, 0.78, m.id);
    },

    sofa(m, T) {
      const b = m.b ?? 2.3, t = m.t ?? 0.95;
      add("polster", M.polster, KACHEL.stoff, rundbox(b, 0.38, t, 0.04, 3, 0, 0.3, 0), T);                          // Korpus
      add("polster", M.polster, KACHEL.stoff, rundbox(b, 0.42, 0.22, 0.05, 3, 0, 0.62, -t / 2 + 0.11), T);           // Rückenlehne
      for (const s of [-1, 1]) add("polster", M.polster, KACHEL.stoff, rundbox(0.16, 0.6, t, 0.05, 3, s * (b / 2 - 0.08), 0.33, 0), T); // Armlehnen
      const n = 3, kb = (b - 0.36) / n;
      for (let i = 0; i < n; i++) {
        const x = -b / 2 + 0.18 + kb * (i + 0.5);
        add("kissen", M.kissen, KACHEL.stoff, rundbox(kb - 0.02, 0.15, t - 0.34, 0.05, 3, x, 0.565, 0.05), T);        // Sitzkissen
        add("kissen", M.kissen, KACHEL.stoff, rundbox(kb - 0.04, 0.4, 0.14, 0.05, 3, x, 0.84, -t / 2 + 0.28), T);     // Rückenkissen
      }
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add("schwarz", M.schwarz, 1, zylinder(0.02, 0.11, sx * (b / 2 - 0.12), 0.055, sz * (t / 2 - 0.1), 10), T);
      rect(T, -b / 2, -t / 2, b / 2, t / 2, 0, 0.9, m.id);
    },

    bett(m, T) { // lokal: Kopfteil bei z 0, Fußende bei z 2.1
      const b = 1.9, l = 2.1;
      add("holz", M.holz, KACHEL.furnier, box(b, 0.26, l, 0, 0.27, l / 2), T);                                       // Rahmen
      for (const [sx, sz] of [[-1, 0.1], [1, 0.1], [-1, l - 0.1], [1, l - 0.1]]) add("holz", M.holz, KACHEL.furnier, box(0.08, 0.14, 0.08, sx * (b / 2 - 0.08), 0.07, sz), T);
      add("polster", M.polster, KACHEL.stoff, rundbox(b, 1.1, 0.08, 0.03, 3, 0, 0.55, 0.04), T);                     // Kopfteil gepolstert
      add("bettwaesche", M.bettwaesche, KACHEL.stoff, rundbox(1.8, 0.2, l - 0.14, 0.04, 3, 0, 0.5, 0.08 + (l - 0.14) / 2), T); // Matratze
      add("bettwaesche", M.bettwaesche, KACHEL.stoff, rundbox(1.86, 0.14, 1.45, 0.06, 4, 0, 0.67, 1.3), T);          // Decke
      add("bettwaesche", M.bettwaesche, KACHEL.stoff, rundbox(1.86, 0.1, 0.22, 0.05, 4, 0, 0.74, 0.62), T);          // Umschlag
      for (const s of [-1, 1]) add("bettwaesche", M.bettwaesche, KACHEL.stoff, rundbox(0.72, 0.13, 0.46, 0.06, 4, s * 0.45, 0.665, 0.4), T); // Kopfkissen
      rect(T, -b / 2, 0, b / 2, l, 0, 0.75, m.id);
    },

    nachttisch(m, T) {
      add("holz", M.holz, KACHEL.furnier, rundbox(0.45, 0.5, 0.42, 0.01, 2, 0, 0.25, 0), T);
      add("dunkel", M.dunkel, 1, box(0.37, 0.004, 0.006, 0, 0.3, 0.212), T);                                         // Schubladenfuge
      add("messing", M.messing, 1, zylinder(0.012, 0.02, 0, 0.18, 0.22, 10).rotateX(0), T, { wirft: false });
      add("messing", M.messing, 1, zylinder(0.06, 0.02, 0, 0.51, 0, 20), T);                                          // Lampenfuß
      add("messing", M.messing, 1, zylinder(0.01, 0.26, 0, 0.64, 0, 8), T);
      const schirm = schirmMaterial(0xf6efe3);
      einzelMesh(zylinder(0.12, 0.2, 0, 0.86, 0, 24, 0.09), schirm, T, { wirft: false });
      if (m.licht) lampe(m, m.licht, schirm, new THREE.Vector3(0, 0.86, 0), T);
      rect(T, -0.225, -0.21, 0.225, 0.21, 0, 0.5, m.id);
    },

    schrank(m, T) {
      const b = m.b ?? 2.6, h = m.h ?? 2.3, t = m.t ?? 0.6;
      add("holz", M.holz, KACHEL.furnier, box(b, h - 0.08, t, 0, 0.08 + (h - 0.08) / 2, 0), T);
      add("dunkel", M.dunkel, 1, box(b - 0.06, 0.08, t - 0.06, 0, 0.04, -0.03), T);                                   // Sockel zurückgesetzt
      const n = Math.max(2, Math.round(b / 0.65));
      for (let i = 1; i < n; i++) add("dunkel", M.dunkel, 1, box(0.005, h - 0.12, 0.006, -b / 2 + (b / n) * i, 0.08 + (h - 0.08) / 2, t / 2), T);
      for (let i = 0; i < n; i++) { const x = -b / 2 + (b / n) * (i + 0.5); const s = i % 2 ? -1 : 1; add("schwarz", M.schwarz, 1, box(0.016, 0.32, 0.016, x + s * (b / n / 2 - 0.05), 1.05, t / 2 + 0.014), T, { wirft: false }); }
      rect(T, -b / 2, -t / 2, b / 2, t / 2, 0, h, m.id);
    },

    tv(m, T) {
      const b = m.b ?? 1.45, h = m.h ?? 0.82;
      add("glasSchwarz", M.glasSchwarz, 1, rundbox(b, h, 0.028, 0.006, 2, 0, 0, 0), T, { wirft: false });
      const schirm = new THREE.MeshStandardMaterial({ map: bildschirmTextur(), roughness: 0.12, metalness: 0.2, emissive: 0x0b0d10, emissiveIntensity: 0.4 });
      einzelMesh(new THREE.PlaneGeometry(b - 0.03, h - 0.03).translate(0, 0, 0.0145), schirm, T, { wirft: false });
      add("schwarz", M.schwarz, 1, box(0.3, 0.3, 0.02, 0, 0, -0.024), T, { wirft: false });
    },

    regal(m, T) {
      const b = m.b ?? 2.0, h = m.h ?? 2.1, t = m.t ?? 0.32, n = 5;
      for (const s of [-1, 1]) add("holz", M.holz, KACHEL.furnier, box(0.025, h, t, s * (b / 2 - 0.0125), h / 2, 0), T);
      add("holz", M.holz, KACHEL.furnier, box(b - 0.05, h, 0.012, 0, h / 2, -t / 2 + 0.006), T);                     // Rückwand
      const fach = (h - 0.05) / n;
      for (let i = 0; i <= n; i++) add("holz", M.holz, KACHEL.furnier, box(b - 0.05, 0.025, t - 0.012, 0, 0.0125 + i * fach, 0.006), T);
      for (let i = 0; i < n; i++) {                                                                                    // Bücher je Fach
        const y0 = 0.025 + i * fach; const anteil = [0.75, 0.5, 0.85, 0.35, 0.6][i % 5];
        let x = -b / 2 + 0.05 + rnd() * 0.1; const xEnde = -b / 2 + 0.05 + (b - 0.1) * anteil;
        while (x < xEnde) {
          const bw = 0.02 + rnd() * 0.03, bh = 0.17 + rnd() * 0.09, bt = 0.14 + rnd() * 0.05;
          add(`buch${Math.floor(rnd() * buchMat.length)}`, buchMat[Math.floor(rnd() * buchMat.length)], 1, box(bw, bh, bt, x + bw / 2, y0 + bh / 2, 0.02 + (0.2 - bt) / 2), T, { wirft: false });
          x += bw + (rnd() < 0.08 ? 0.06 : 0.002);
        }
        if (i % 2 === 1) add("keramik", M.keramik, 1, rundbox(0.22, 0.14, 0.14, 0.01, 2, b / 2 - 0.2, y0 + 0.07, 0.03), T, { wirft: false });  // Box als Deko
      }
      rect(T, -b / 2, -t / 2, b / 2, t / 2, 0, h, m.id);
    },

    vorhang(m, T) {
      const b = m.b ?? 1.6, h = 2.42, breite = 0.58, ueber = 0.25;
      const stange = new THREE.CylinderGeometry(0.012, 0.012, b + 2 * ueber + 0.1, 10); stange.rotateZ(Math.PI / 2); stange.translate(0, h + 0.05, 0);
      add("messing", M.messing, 1, stange, T, { wirft: false });
      for (const s of [-1, 1]) {
        add("messing", M.messing, 1, kugel(0.022, s * (b / 2 + ueber + 0.05), h + 0.05, 0, 10), T, { wirft: false });
        add("messing", M.messing, 1, box(0.02, 0.02, 0.08, s * (b / 2 + ueber - 0.1), h + 0.05, -0.04), T, { wirft: false });
        const g = new THREE.PlaneGeometry(breite, h - 0.03, 24, 1); const pos = g.attributes.position;
        for (let i = 0; i < pos.count; i++) { const u = (pos.getX(i) + breite / 2) / breite; pos.setZ(i, Math.sin(u * Math.PI * 7) * 0.035); }
        g.computeVertexNormals(); g.translate(s * (b / 2 + ueber - breite / 2 + 0.02), (h - 0.03) / 2 + 0.03, 0);
        einzelMesh(g, M.vorhang, T, { wirft: true, empfaengt: true, renderOrder: 6 });
      }
    },

    stehlampe(m, T) {
      add("schwarz", M.schwarz, 1, zylinder(0.15, 0.02, 0, 0.01, 0, 24), T);
      add("schwarz", M.schwarz, 1, zylinder(0.012, 1.5, 0, 0.77, 0, 8), T);
      const schirm = schirmMaterial(0xf3ebdd);
      einzelMesh(zylinder(0.2, 0.34, 0, 1.68, 0, 28, 0.14), schirm, T, { wirft: false });
      if (m.licht) lampe(m, m.licht, schirm, new THREE.Vector3(0, 1.6, 0), T);
      rect(T, -0.15, -0.15, 0.15, 0.15, 0, 1.85, m.id);
    },

    garderobe(m, T) {
      add("holz", M.holz, KACHEL.furnier, box(0.9, 0.16, 0.02, 0, 1.75, 0.01), T, { wirft: false });
      for (let i = 0; i < 4; i++) { const x = -0.33 + i * 0.22; add("messing", M.messing, 1, zylinder(0.008, 0.07, x, 1.75, 0.055, 8).rotateX(0), T, { wirft: false }); add("messing", M.messing, 1, kugel(0.014, x, 1.75, 0.09, 10), T, { wirft: false }); }
    },

    schuhbank(m, T) {
      add("holz", M.holz, KACHEL.furnier, box(0.9, 0.04, 0.35, 0, 0.4, 0), T);
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add("holz", M.holz, KACHEL.furnier, box(0.04, 0.38, 0.04, sx * 0.41, 0.19, sz * 0.14), T);
      add("polster", M.polster, KACHEL.stoff, rundbox(0.86, 0.06, 0.32, 0.02, 3, 0, 0.45, 0), T);
      for (const [x, f] of [[-0.25, M.dunkel], [-0.12, M.dunkel], [0.2, M.schwarz], [0.32, M.schwarz]]) add("dunkel", f, 1, rundbox(0.1, 0.07, 0.27, 0.02, 2, x, 0.035, 0.02), T, { wirft: false });
      rect(T, -0.45, -0.18, 0.45, 0.18, 0, 0.48, m.id);
    },

    spiegel(m, T) {
      const b = m.b ?? 0.5, h = m.h ?? 1.3;
      add("schwarz", M.schwarz, 1, box(b, h, 0.02, 0, 0, 0.01), T, { wirft: false });
      add("spiegel", M.spiegel, 1, box(b - 0.04, h - 0.04, 0.004, 0, 0, 0.022), T, { wirft: false });
    },

    waschtisch(m, T) { // lokal: Wand bei z 0, Front nach +z; Ursprung = Mitte Unterschrank
      add("holz", M.holz, KACHEL.furnier, rundbox(1.2, 0.42, 0.46, 0.01, 2, 0, 0.64, 0.24), T);
      add("dunkel", M.dunkel, 1, box(1.12, 0.004, 0.006, 0, 0.64, 0.472), T);
      add("keramik", M.keramik, 1, box(1.24, 0.03, 0.5, 0, 0.865, 0.25), T);
      const profil = [[0, 0], [0.05, 0.002], [0.14, 0.03], [0.19, 0.08], [0.21, 0.12], [0.215, 0.125]].map(([r, y]) => new THREE.Vector2(r, y));
      const becken = new THREE.LatheGeometry(profil, 28); becken.translate(0, 0.88, 0.26);
      add("keramik", M.keramik, 1, becken, T);
      add("chrom", M.chrom, 1, zylinder(0.015, 0.22, 0, 0.99, 0.06, 12), T, { wirft: false });
      const ausl = new THREE.CylinderGeometry(0.011, 0.011, 0.18, 10); ausl.rotateX(Math.PI / 2); ausl.translate(0, 1.1, 0.15);
      add("chrom", M.chrom, 1, ausl, T, { wirft: false });
      add("schwarz", M.schwarz, 1, box(1.1, 0.8, 0.02, 0, 1.55, 0.01), T, { wirft: false });
      add("spiegel", M.spiegel, 1, box(1.06, 0.76, 0.004, 0, 1.55, 0.022), T, { wirft: false });
      const schirm = schirmMaterial(0xfdf8ef);
      for (const s of [-1, 1]) { add("chrom", M.chrom, 1, box(0.04, 0.04, 0.1, s * 0.62, 1.8, 0.05), T, { wirft: false }); einzelMesh(kugel(0.045, s * 0.62, 1.8, 0.12, 14), schirm, T, { wirft: false }); }
      if (m.licht) lampe(m, m.licht, schirm, new THREE.Vector3(0, 1.85, 0.3), T);
      add("leinen", M.leinen, KACHEL.stoff, rundbox(0.3, 0.42, 0.025, 0.01, 2, 0.75, 0.6, 0.47), T, { wirft: false }); // Handtuch an der Seite
      rect(T, -0.62, 0, 0.62, 0.5, 0.4, 0.9, m.id);
    },

    wc(m, T) {
      add("keramik", M.keramik, 1, box(0.8, 1.0, 0.18, 0, 0.5, 0.09), T);
      add("chrom", M.chrom, 1, box(0.2, 0.12, 0.006, 0, 0.82, 0.183), T, { wirft: false });
      add("keramik", M.keramik, 1, rundbox(0.36, 0.3, 0.54, 0.1, 4, 0, 0.3, 0.45), T);
      add("weiss", M.weiss, 1, rundbox(0.37, 0.035, 0.5, 0.05, 3, 0, 0.465, 0.45), T, { wirft: false });
      rect(T, -0.2, 0, 0.2, 0.74, 0, 0.5, m.id);
    },

    dusche(m, T) { // lokal: Glaswand entlang z ab x 0, Duschbereich x 0..1, Wand (Armatur) bei z 0
      einzelMesh(box(0.01, 2.0, 1.18, 0.005, 1.0, 0.59), mat.glas(), T, { wirft: false, empfaengt: false, renderOrder: 5 });
      add("chrom", M.chrom, 1, box(0.02, 2.0, 0.02, 0.005, 1.0, 0.01), T, { wirft: false });
      add("chrom", M.chrom, 1, box(0.02, 0.02, 1.18, 0.005, 1.99, 0.59), T, { wirft: false });
      add("chrom", M.chrom, 1, box(0.03, 1.1, 0.03, 0.5, 1.55, 0.02), T, { wirft: false });
      const arm = new THREE.CylinderGeometry(0.012, 0.012, 0.36, 10); arm.rotateX(Math.PI / 2); arm.translate(0.5, 2.1, 0.2);
      add("chrom", M.chrom, 1, arm, T, { wirft: false });
      add("chrom", M.chrom, 1, zylinder(0.12, 0.012, 0.5, 2.1, 0.38, 28), T, { wirft: false });
      add("chrom", M.chrom, 1, box(0.14, 0.06, 0.05, 0.5, 1.05, 0.04), T, { wirft: false });
      add("chrom", M.chrom, 1, zylinder(0.012, 0.22, 0.68, 1.3, 0.05, 10), T, { wirft: false });
      add("dunkel", M.dunkel, 1, box(0.1, 0.004, 0.1, 0.5, 0.002, 0.6), T, { wirft: false });
      rect(T, 0, 0, 0.02, 1.18, 0, 2, m.id);
    },

    handtuchhalter(m, T) {
      const stange = new THREE.CylinderGeometry(0.01, 0.01, 0.6, 10); stange.rotateZ(Math.PI / 2); stange.translate(0, 0, 0.08);
      add("chrom", M.chrom, 1, stange, T, { wirft: false });
      for (const s of [-1, 1]) add("chrom", M.chrom, 1, box(0.02, 0.02, 0.08, s * 0.28, 0, 0.04), T, { wirft: false });
      add("leinen", mat.stoffIn(0xcfd8d4), KACHEL.stoff, rundbox(0.26, 0.5, 0.035, 0.012, 3, -0.14, -0.22, 0.09), T, { wirft: false });
      add("leinen2", mat.stoffIn(0xe6e1d7), KACHEL.stoff, rundbox(0.26, 0.5, 0.035, 0.012, 3, 0.14, -0.22, 0.09), T, { wirft: false });
    },

    buecherstapel(m, T) {
      const buecher = [[0.24, 0.03, 0.17, 0, 0], [0.21, 0.025, 0.15, 0.01, 0.12], [0.18, 0.02, 0.13, -0.01, -0.08]];
      let y = 0;
      buecher.forEach(([b, h, t, dx, rot], i) => { add(`buch${i + 2}`, buchMat[i + 2], 1, box(b, h, t, dx, y + h / 2, 0, rot), T, { wirft: false }); y += h; });
    },

    kuebel(m, T) {
      add("beton", M.beton, 1, zylinder(0.22, 0.45, 0, 0.225, 0, 24, 0.19), T);
      add("erde", M.erde, 1, zylinder(0.18, 0.02, 0, 0.44, 0, 20), T, { wirft: false });
      for (let i = 0; i < 7; i++) { const a = i * 0.9 + 0.3, r = i < 5 ? 0.12 : 0.04; add(i % 2 ? "laub" : "laub2", i % 2 ? M.laub : M.laub2, 1, kugel(0.11 + rnd() * 0.06, Math.cos(a) * r, 0.55 + rnd() * 0.12, Math.sin(a) * r, 10), T); }
      rect(T, -0.22, -0.22, 0.22, 0.22, 0, 0.7, m.id);
    },

    // Einbauküche — feste Welt-Koordinaten (Raum Küche 0–3,4 × 0–3,0; Fenster über der Spüle x 1,0–2,4)
    kuechenzeile(m, T) {
      const I = new THREE.Matrix4(); const front = (x1, x2, z, y1, y2, drehung = 0) => { // Front mit Griff
        const w = x2 - x1 - 0.004, h = y2 - y1 - 0.004;
        if (drehung === 0) { add("holz", M.holz, KACHEL.furnier, box(w, h, 0.02, (x1 + x2) / 2, (y1 + y2) / 2, z + 0.01), I); add("schwarz", M.schwarz, 1, box(0.2, 0.012, 0.016, (x1 + x2) / 2, y2 - 0.06, z + 0.028), I, { wirft: false }); }
        else { add("holz", M.holz, KACHEL.furnier, box(0.02, h, w, z + 0.01, (y1 + y2) / 2, (x1 + x2) / 2), I); add("schwarz", M.schwarz, 1, box(0.016, 0.012, 0.2, z + 0.028, y2 - 0.06, (x1 + x2) / 2), I, { wirft: false }); }
      };
      // Korpusse (Nordzeile x 0,6–2,8 · Westzeile z 0,6–2,4 · Halbinsel x 0,6–2,6 / z 2,4–3,0)
      add("holz", M.holz, KACHEL.furnier, box(2.2, 0.76, 0.58, 1.7, 0.48, 0.29), I);
      add("holz", M.holz, KACHEL.furnier, box(0.58, 0.76, 2.4, 0.29, 0.48, 1.8), I);
      add("holz", M.holz, KACHEL.furnier, box(2.0, 0.76, 0.58, 1.6, 0.48, 2.69), I);
      add("dunkel", M.dunkel, 1, box(2.2, 0.1, 0.5, 1.7, 0.05, 0.3), I); add("dunkel", M.dunkel, 1, box(0.5, 0.1, 2.4, 0.3, 0.05, 1.8), I); add("dunkel", M.dunkel, 1, box(2.0, 0.1, 0.5, 1.6, 0.05, 2.7), I); // Sockel
      // Fronten Nord (Front bei z 0,58): Tür · Spülenschrank (2 Türen) · Spülmaschine
      front(0.6, 1.2, 0.58, 0.1, 0.86); front(1.2, 1.7, 0.58, 0.1, 0.86); front(1.7, 2.2, 0.58, 0.1, 0.86); front(2.2, 2.8, 0.58, 0.1, 0.86);
      // Fronten West (Front bei x 0,58): Tür · Backofen · 3 Schubladen
      front(0.6, 1.2, 0.58, 0.1, 0.86, 1);
      add("glasSchwarz", M.glasSchwarz, 1, box(0.02, 0.58, 0.56, 0.59, 0.5, 1.5), I, { wirft: false }); add("stahl", M.stahl, 1, box(0.03, 0.02, 0.5, 0.615, 0.7, 1.5), I, { wirft: false });
      add("glasSchwarz", M.glasSchwarz, 1, box(0.022, 0.22, 0.5, 0.59, 0.4, 1.5), I, { wirft: false });                 // Ofenfenster-Andeutung dunkler
      for (let i = 0; i < 3; i++) front(1.8, 2.4, 0.58, 0.1 + i * 0.2533, 0.1 + (i + 1) * 0.2533, 1);
      // Fronten Halbinsel (Front nach Norden bei z 2,4): 3 Türen; Rückseite Paneel
      for (let i = 0; i < 3; i++) { const x1 = 0.6 + i * 0.6667, x2 = x1 + 0.6667; add("holz", M.holz, KACHEL.furnier, box(x2 - x1 - 0.004, 0.756, 0.02, (x1 + x2) / 2, 0.48, 2.39), I); add("schwarz", M.schwarz, 1, box(0.2, 0.012, 0.016, (x1 + x2) / 2, 0.8, 2.372), I, { wirft: false }); }
      add("holz", M.holz, KACHEL.furnier, box(2.0, 0.86, 0.02, 1.6, 0.43, 2.99), I);
      // Arbeitsplatten (Marmor): Nord · West · Halbinsel mit 0,32 m Überstand nach Süden
      add("marmor", M.marmor, KACHEL.marmor, box(2.8, 0.04, 0.62, 1.4, 0.88, 0.31), I);
      add("marmor", M.marmor, KACHEL.marmor, box(0.62, 0.04, 2.4, 0.31, 0.88, 1.8), I);
      add("marmor", M.marmor, KACHEL.marmor, box(2.0, 0.04, 0.92, 1.6, 0.88, 2.86), I);
      // Rückwand (Marmor) · Oberschränke West · Dunstabzug
      add("marmor", M.marmor, KACHEL.marmor, box(1.0, 0.6, 0.015, 0.5, 1.2, 0.0075), I, { wirft: false }); add("marmor", M.marmor, KACHEL.marmor, box(0.4, 0.6, 0.015, 2.6, 1.2, 0.0075), I, { wirft: false });
      add("marmor", M.marmor, KACHEL.marmor, box(0.015, 0.6, 1.8, 0.0075, 1.2, 1.5), I, { wirft: false });
      add("holz", M.holz, KACHEL.furnier, box(0.35, 0.8, 0.6, 0.175, 1.85, 0.9), I); add("holz", M.holz, KACHEL.furnier, box(0.35, 0.8, 0.6, 0.175, 1.85, 2.1), I);
      front(0.6, 1.2, 0.35, 1.45, 2.25, 1); front(1.8, 2.4, 0.35, 1.45, 2.25, 1);
      add("stahl", M.stahl, 1, box(0.5, 0.06, 0.6, 0.25, 1.55, 1.5), I, { wirft: false }); add("stahl", M.stahl, 1, box(0.25, 0.7, 0.25, 0.125, 1.95, 1.5), I, { wirft: false });
      // Kochfeld (West, über dem Ofen) · Spüle (Nord, unter dem Fenster) · Armatur
      add("glasSchwarz", M.glasSchwarz, 1, box(0.52, 0.008, 0.58, 0.31, 0.904, 1.5), I, { wirft: false });
      for (const [dx, dz] of [[-0.13, -0.15], [0.13, -0.15], [-0.13, 0.15], [0.13, 0.15]]) add("dunkel", M.dunkel, 1, zylinder(0.085, 0.003, 0.31 + dx, 0.909, 1.5 + dz, 24), I, { wirft: false });
      add("stahl", M.stahl, 1, box(0.56, 0.012, 0.44, 1.7, 0.906, 0.31), I, { wirft: false }); add("dunkel", M.dunkel, 1, box(0.5, 0.01, 0.38, 1.7, 0.907, 0.31), I, { wirft: false });
      add("chrom", M.chrom, 1, zylinder(0.015, 0.32, 1.7, 1.06, 0.08, 12), I, { wirft: false });
      const ausl = new THREE.CylinderGeometry(0.011, 0.011, 0.24, 10); ausl.rotateX(Math.PI / 2); ausl.translate(1.7, 1.22, 0.2); add("chrom", M.chrom, 1, ausl, I, { wirft: false });
      // Hochschrank (Kühlschrank) x 2,8–3,4
      add("holz", M.holz, KACHEL.furnier, box(0.6, 2.2, 0.6, 3.1, 1.1, 0.3), I);
      add("dunkel", M.dunkel, 1, box(0.56, 0.005, 0.006, 3.1, 1.0, 0.603), I, { wirft: false });
      add("schwarz", M.schwarz, 1, box(0.016, 0.6, 0.016, 2.86, 1.45, 0.615), I, { wirft: false }); add("schwarz", M.schwarz, 1, box(0.016, 0.3, 0.016, 2.86, 0.75, 0.615), I, { wirft: false });
      // Deko: Obstschale + Orangen auf der Halbinsel, Schneidebrett, zwei Vorratsgläser
      const schale = new THREE.LatheGeometry([[0, 0], [0.1, 0.005], [0.16, 0.04], [0.18, 0.07]].map(([r, y]) => new THREE.Vector2(r, y)), 28); schale.translate(1.9, 0.9, 2.8);
      add("keramik", M.keramik, 1, schale, I, { wirft: false });
      for (const [dx, dz, dy] of [[0, 0, 0.04], [0.07, 0.03, 0.045], [-0.06, 0.04, 0.045], [0.01, -0.07, 0.045], [0.02, 0.01, 0.11]]) add("orange", M.orange, 1, kugel(0.042, 1.9 + dx, 0.9 + dy, 2.8 + dz, 12), I, { wirft: false });
      add("holz", M.holz, KACHEL.furnier, rundbox(0.38, 0.02, 0.26, 0.008, 2, 2.4, 0.91, 0.3), I, { wirft: false });
      for (const x of [0.2, 0.38]) { einzelMesh(zylinder(0.055, 0.18, x, 0.99, 2.15, 16), mat.glas(), I, { wirft: false, empfaengt: false, renderOrder: 5 }); add("holz", M.holz, KACHEL.furnier, zylinder(0.056, 0.02, x, 1.09, 2.15, 16), I, { wirft: false }); }
      kollision.push(kollisionsRechteck(0.6, 0, 3.4, 0.6, 0, 0.9, "kueche-nord"), kollisionsRechteck(0, 0.6, 0.6, 3.0, 0, 0.9, "kueche-west"), kollisionsRechteck(0.6, 2.4, 2.6, 3.32, 0, 0.9, "theke"), kollisionsRechteck(2.8, 0, 3.4, 0.6, 0, 2.2, "kuehlschrank"));
    },
  };

  for (const m of PLAN.moebel) {
    if (m.typ !== "param") continue;
    const bauer = B[m.art]; if (!bauer) { console.warn("[moebel] unbekannt:", m.art); continue; }
    bauer(m, matrix(m));
  }
  S.meshes(gruppe);
  return { gruppe, kollision };
}
