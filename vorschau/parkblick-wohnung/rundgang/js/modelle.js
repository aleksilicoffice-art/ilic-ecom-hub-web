// glTF-Modelle (Poly Haven) laden, platzieren, klonen, Schatten setzen, Kollisionsboxen ableiten.
// Stufe „niedrig" lädt die 512er-Texturvarianten über einen URL-Modifier des LoadingManagers.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { kollisionsRechteck } from "./geometrie.js";
import { kunstdruckTextur } from "./texturen.js";

export async function ladeModelle(PLAN, { manager, stufe, kollision, debug = false }) {
  const gruppe = new THREE.Group(); gruppe.name = "modelle";
  if (stufe.texturen === "512") manager.setURLModifier((url) => (/\/assets\/modelle\/[^/]+\/textures\/(?!512\/)/.test(url) ? url.replace("/textures/", "/textures/512/") : url));
  const lader = new GLTFLoader(manager);
  const cache = new Map();
  const lade = (id) => { if (!cache.has(id)) cache.set(id, lader.loadAsync(`assets/modelle/${id}/${id}_1k.gltf`)); return cache.get(id); };
  const eintraege = PLAN.moebel.filter((m) => m.typ === "gltf");
  const ergebnisse = await Promise.allSettled(eintraege.map((m) => lade(m.modell)));
  const masse = {}, objekte = {}; let kunstNr = 0;
  eintraege.forEach((m, i) => {
    const r = ergebnisse[i];
    if (r.status !== "fulfilled") { console.warn(`[modelle] ${m.modell} fehlt:`, r.reason?.message || r.reason); return; }
    const o = r.value.scene.clone(true);
    o.traverse((k) => {
      if (!k.isMesh) return;
      k.castShadow = true; k.receiveShadow = true;
      if (m.farbe !== undefined) { k.material = k.material.clone(); k.material.map = null; k.material.color.set(m.farbe); }
      // Transmission (Glas der Bilderrahmen/Uhr) würde einen zweiten vollen Szenen-Pass auslösen → einfache Transparenz
      // Glas: Transmission würde einen zweiten vollen Szenen-Pass auslösen; „*_glass"-Materialien der 1k-JPG-Exporte haben
      // zudem keinen Alphakanal und keinen metallicFactor (→ schwarzer Spiegel). Beides → einfache, fast unsichtbare Scheibe.
      if (k.material.transmission > 0 || /_glass$/i.test(k.material.name || "")) {
        const alt = k.material; k.material = alt.clone(); k.material.transmission = 0; k.material.map = null; k.material.metalnessMap = null; k.material.roughnessMap = null;
        k.material.color.set(0xffffff); k.material.transparent = true; k.material.opacity = 0.08; k.material.depthWrite = false; k.material.metalness = 0; k.material.roughness = 0.04;
        k.renderOrder = 7; k.castShadow = false;
      }
      // Platzhalter-Motiv der Rahmen durch eigene Kunstdrucke ersetzen (je Rahmen ein anderes)
      if (/_artwork$/i.test(k.material.name || "")) { k.material = k.material.clone(); k.material.map = kunstdruckTextur(m.motiv ?? kunstNr++); k.material.normalMap = null; k.material.roughness = 0.75; k.material.needsUpdate = true; }
      k.material.envMapIntensity = 0.8;
    });
    const s = m.skal ?? 1;
    o.scale.setScalar(s); o.rotation.y = (m.rotY ?? 0) * Math.PI / 180; o.position.set(...m.pos);
    o.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(o);
    if (!masse[m.modell]) { // Rohmaße des unrotierten Modells (Debug)
      const roh = new THREE.Box3().setFromObject(r.value.scene), rs = roh.getSize(new THREE.Vector3()); let tris = 0; o.traverse((k) => { if (k.isMesh) tris += (k.geometry.index ? k.geometry.index.count : k.geometry.attributes.position.count) / 3; }); masse[m.modell] = { tris: Math.round(tris), b: +rs.x.toFixed(2), h: +rs.y.toFixed(2), t: +rs.z.toFixed(2), minY: +roh.min.y.toFixed(2) }; }
    if (m.kollision !== false && box.max.y > 0.35) kollision.push(kollisionsRechteck(box.min.x + 0.03, box.min.z + 0.03, box.max.x - 0.03, box.max.z - 0.03, box.min.y, box.max.y, m.id));
    o.name = m.id; o.userData.moebel = m; gruppe.add(o); objekte[m.id] = o;
  });
  if (debug) console.table(masse);
  return { gruppe, masse, objekte };
}
