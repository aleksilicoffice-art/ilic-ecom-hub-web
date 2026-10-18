// Materialkatalog + Texturlader. Alle PBR-Texturen liegen unter assets/texturen/<name>/{farbe,normal,arm|rauheit}.jpg
// (plus 512/ für die Stufe „niedrig"). Welt-UVs in Metern kommen aus geometrie.weltUV → repeat bleibt 1.
import * as THREE from "three";

// Meter pro Textur-Kachel (physische Größe der jeweiligen Poly-Haven/ambientCG-Textur, Augenmaß).
export const KACHEL = { parkett: 2.4, putz: 2.0, terrazzo: 1.8, marmor: 1.6, stoff: 0.7, beton: 2.2, furnier: 1.4, rasen: 1.6 };

export class Materialien {
  constructor({ renderer, manager, stufe, basis = "assets/texturen/" }) {
    this.renderer = renderer; this.stufe = stufe; this.basis = basis;
    this.lader = new THREE.TextureLoader(manager);
    this.aniso = Math.min(stufe.anisotropie, renderer.capabilities.getMaxAnisotropy());
    this.texturen = new Map(); this.cache = new Map();
    this.unterordner = stufe.texturen === "512" ? "512/" : "";
  }
  textur(name, map, srgb = false) {
    const key = `${name}/${map}`;
    if (this.texturen.has(key)) return this.texturen.get(key);
    const t = this.lader.load(`${this.basis}${name}/${this.unterordner}${map}.jpg`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = this.aniso;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    this.texturen.set(key, t);
    return t;
  }
  // PBR-Material aus Texturset; Rauheit/Metall skalieren die Maps.
  // ohneFarbmap: nur Relief (Normal/AO/Rauheit) mit eigener Farbe — für Putz, Stoff, Beton, deren Farbmaps nicht passen.
  pbr(name, { farbe = 0xffffff, rauheit = 1, metall = 0, normalStaerke = 1, env = 1, rauheitsMap = "arm", ohneFarbmap = false, ...rest } = {}) {
    const key = JSON.stringify([name, farbe, rauheit, metall, normalStaerke, env, rauheitsMap, ohneFarbmap, rest]);
    if (this.cache.has(key)) return this.cache.get(key);
    const m = new THREE.MeshStandardMaterial({
      color: farbe, roughness: rauheit, metalness: metall, envMapIntensity: env,
      map: ohneFarbmap ? null : this.textur(name, "farbe", true),
      normalMap: this.textur(name, "normal"),
      normalScale: new THREE.Vector2(normalStaerke, normalStaerke),
      ...rest,
    });
    if (rauheitsMap === "arm") { const arm = this.textur(name, "arm"); m.aoMap = arm; m.roughnessMap = arm; m.metalnessMap = arm; m.aoMapIntensity = 0.9; }
    else if (rauheitsMap) { m.roughnessMap = this.textur(name, rauheitsMap); }
    this.cache.set(key, m);
    return m;
  }
  // Einfarbiges Standardmaterial (Lack, Keramik, Metall, Stoffe ohne Textur).
  einfach(farbe, { rauheit = 0.6, metall = 0, emissive = 0x000000, emissiveIntensity = 1, env = 1, seite, transparent, opacity } = {}) {
    const key = JSON.stringify(["e", farbe, rauheit, metall, emissive, emissiveIntensity, env, seite, transparent, opacity]);
    if (this.cache.has(key)) return this.cache.get(key);
    const m = new THREE.MeshStandardMaterial({ color: farbe, roughness: rauheit, metalness: metall, emissive, emissiveIntensity, envMapIntensity: env });
    if (seite) m.side = seite;
    if (transparent) { m.transparent = true; m.opacity = opacity ?? 0.5; m.depthWrite = false; }
    this.cache.set(key, m);
    return m;
  }
  // Fensterglas: bewusst KEINE Transmission (löst einen zweiten vollen Szenen-Pass aus → 21 statt 60 fps),
  // sondern leicht getönte Transparenz mit kräftiger Umgebungsreflexion.
  glas({ milch = false } = {}) {
    const key = `glas:${milch}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const m = new THREE.MeshStandardMaterial({ color: milch ? 0xe9ecef : 0xe4edf2, roughness: milch ? 0.6 : 0.04, metalness: 0, transparent: true, opacity: milch ? 0.78 : 0.12, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.4 });
    this.cache.set(key, m);
    return m;
  }
  // Katalog mit abgestimmten Parametern (Rauheit nach Material: Parkett 0,35 … Stoff 0,9).
  get parkett()  { return this.pbr("parkett",  { rauheit: 0.85, normalStaerke: 0.8 }); }
  get putz()     { return this.pbr("putz",     { farbe: 0xf1ece3, rauheit: 1.0, normalStaerke: 0.6, env: 0.35, ohneFarbmap: true }); }
  get decke()    { return this.pbr("putz",     { farbe: 0xfaf7f2, rauheit: 1.0, normalStaerke: 0.35, env: 0.6, ohneFarbmap: true }); }
  get terrazzo() { return this.pbr("terrazzo", { rauheit: 0.7, normalStaerke: 0.6 }); }
  get marmor()   { return this.pbr("marmor",   { rauheit: 0.9, normalStaerke: 0.4, rauheitsMap: "rauheit" }); }
  get stoff()    { return this.stoffIn(0xcfc3b2); }
  stoffIn(farbe) { return this.pbr("stoff",    { farbe, rauheit: 1.0, normalStaerke: 0.9, env: 0.5, ohneFarbmap: true }); }
  get beton()    { return this.pbr("beton",    { farbe: 0xb9b4ab, rauheit: 1.0, normalStaerke: 0.6, ohneFarbmap: true }); }
  get furnier()  { return this.pbr("furnier",  { rauheit: 0.9, normalStaerke: 0.5 }); }
  get rasen()    { return this.pbr("rasen",    { farbe: 0xb9c99a, rauheit: 1.0, normalStaerke: 0.5, rauheitsMap: null, env: 0.4 }); }
  get weissLack(){ return this.einfach(0xf2efe9, { rauheit: 0.35 }); }
  get messing()  { return this.einfach(0xb08a4a, { rauheit: 0.35, metall: 0.9 }); }
  get schwarzMatt(){ return this.einfach(0x2a2724, { rauheit: 0.7, metall: 0.2 }); }
  get keramik()  { return this.einfach(0xfbfbf8, { rauheit: 0.15 }); }
}
