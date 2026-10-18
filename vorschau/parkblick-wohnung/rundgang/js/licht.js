// Licht: prozeduraler Himmel (Sky) als Hintergrund + Umgebungslicht (PMREM), Sonne mit Schatten,
// vier Tageszeiten mit weichem Übergang, schaltbare Innenleuchten, Nacht-Automatik.
import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { PARAMS } from "./qualitaet.js";

// az: Azimut ab Nord (−z) im Uhrzeigersinn Richtung Ost (+x); el: Höhe über Horizont, Grad.
export const TAGESZEITEN = {
  morgen: { label: "Morgen", az: 100, el: 18, sonne: 7.0, farbe: 0xffe2b8, exposure: 0.7, turbidity: 4, rayleigh: 2,   mie: 0.005, mieG: 0.8,  umgebung: 0.8, aussenEnv: 0.5, hemi: 0.12, innen: false, wolken: 0.35, nebel: 0xdde6ec },
  mittag: { label: "Mittag", az: 200, el: 48, sonne: 8.5, farbe: 0xfff4e0, exposure: 0.62, turbidity: 3, rayleigh: 1.6, mie: 0.004, mieG: 0.8,  umgebung: 0.8, aussenEnv: 0.5, hemi: 0.13, innen: false, wolken: 0.3,  nebel: 0xe4ebf0 },
  abend:  { label: "Abend",  az: 275, el: 7,  sonne: 5.0, farbe: 0xffa057, exposure: 0.8, turbidity: 8, rayleigh: 3,   mie: 0.02,  mieG: 0.9,  umgebung: 0.8, aussenEnv: 0.45, hemi: 0.09, innen: true,  wolken: 0.45, nebel: 0xe9c9a8 },
  nacht:  { label: "Nacht",  az: 275, el: -14, sonne: 0,  farbe: 0x8fa3c8, exposure: 1.15, turbidity: 6, rayleigh: 1,   mie: 0.005, mieG: 0.8,  umgebung: 0.8, aussenEnv: 0.15, hemi: 0.09, innen: true,  wolken: 0.2,  nebel: 0x1b2230 },
};
export const TAGESZEIT_REIHE = ["morgen", "mittag", "abend", "nacht"];

const grad = Math.PI / 180;
function sonnenRichtung(az, el, ziel = new THREE.Vector3()) {
  return ziel.set(Math.sin(az * grad) * Math.cos(el * grad), Math.sin(el * grad), -Math.cos(az * grad) * Math.cos(el * grad));
}

export class Licht {
  constructor({ renderer, szene, stufe, huelle, mitte, sonde = null, aussenMaterialien = [] }) {
    this.renderer = renderer; this.szene = szene; this.stufe = stufe;
    this.sondePos = sonde; this.aussenMaterialien = aussenMaterialien;
    this.mitte = mitte || huelle.getCenter(new THREE.Vector3());
    this.radius = huelle.getSize(new THREE.Vector3()).length() / 2 + 1;
    this.lampen = []; this.uhr = 0;
    this.pmrem = new THREE.PMREMGenerator(renderer); this.pmrem.compileEquirectangularShader();

    // Himmel im Bild (mit Sonnenscheibe) + zweiter Himmel nur für das Umgebungslicht (ohne Scheibe).
    // Himmel zuletzt zeichnen (renderOrder): hinter Wänden fällt er dem Tiefentest zum Opfer, statt die ganze Fläche mit Wolken-Noise zu rechnen.
    this.sky = new Sky(); this.sky.scale.setScalar(2000); this.sky.name = "himmel"; this.sky.renderOrder = 50; this.sky.visible = PARAMS.get("sky") !== "0"; szene.add(this.sky);
    this.envSky = new Sky(); this.envSky.material.uniforms.showSunDisc.value = 0;
    this.envSzene = new THREE.Scene(); this.envSzene.add(this.envSky);

    this.sonne = new THREE.DirectionalLight(0xffffff, 3);
    this.sonne.castShadow = true;
    const s = this.sonne.shadow; s.mapSize.set(stufe.schatten, stufe.schatten);
    const r = this.radius;
    s.camera.left = -r; s.camera.right = r; s.camera.top = r; s.camera.bottom = -r; s.camera.near = 1; s.camera.far = 40 + 2 * r;
    s.bias = -0.0002; s.normalBias = 0.03; s.intensity = 0.9; s.radius = 3; s.camera.updateProjectionMatrix();
    this.sonne.target.position.copy(this.mitte);
    szene.add(this.sonne, this.sonne.target);

    this.hemi = new THREE.HemisphereLight(0xdfe8ee, 0xc9bca8, 0.1); szene.add(this.hemi);   // Bodenfarbe hell: Decken bekommen Rücklicht
    this.hemiNacht = new THREE.Color(0xffd3a3);
    szene.fog = new THREE.Fog(0xdde6ec, 80, 420);

    this.von = null; this.nach = TAGESZEITEN.morgen; this.t = 1; this.dauer = 1.5; this.envStufen = 0;
    this.zeitId = "morgen"; this.schattenDirty = true; this.sondeFaellig = false;
    // Innenraum-Lichtsonde: Würfelkamera im Wohnzimmer → PMREM → scene.environment (statt reinem Himmel).
    if (this.sondePos) {
      this.sondeRT = new THREE.WebGLCubeRenderTarget(stufe.post ? 256 : 128, { type: THREE.HalfFloatType, generateMipmaps: false });
      this.sondeKamera = new THREE.CubeCamera(0.1, 400, this.sondeRT); this.sondeKamera.position.copy(this.sondePos);
    }
    this.wende(1); this.backeUmgebung();
  }
  // Sonde rendern: Himmel-Env als Grundlage setzen, Szene aus dem Raum heraus aufnehmen, daraus das Umgebungslicht bauen.
  // Nach Tageszeit-/Lampenwechsel erneut (ein paar ms).
  // Die Aufnahme nutzt das jeweils aktuelle Umgebungslicht (zu Beginn: gedämpfter Himmel, danach die letzte Sonde) —
  // so konvergiert die Helligkeit wie bei echter Mehrfachreflexion, statt vom überhellen Himmel auszugehen.
  rendereSonde(iterationen = 1) {
    if (!this.sondeKamera) return;
    const r = this.renderer;
    const sichtbar = this.sky.visible; this.sky.visible = true;
    if (!this.innenRT) { this.szene.environment = this.envRT.texture; this.szene.environmentIntensity = 0.12; }
    for (let i = 0; i < iterationen; i++) {
      this.sondeKamera.update(r, this.szene);
      const neu = this.pmrem.fromCubemap(this.sondeRT.texture);
      if (this.innenRT) this.innenRT.dispose();
      this.innenRT = neu; this.szene.environment = neu.texture;
      this.szene.environmentIntensity = this.aktuell().umgebung;
    }
    this.sky.visible = sichtbar; this.sondeFaellig = false;
  }

  // ---- Tageszeit ----
  setzeTageszeit(id, { sofort = false } = {}) {
    if (!TAGESZEITEN[id]) return;
    this.zeitId = id;
    this.von = this.aktuell(); this.nach = TAGESZEITEN[id]; this.t = sofort ? 1 : 0; this.envStufen = 0;
    if (sofort) { this.wende(1); this.backeUmgebung(); }
    this.automatik(this.nach.innen);
  }
  aktuell() { // Schnappschuss der momentanen Werte (für weiche Übergänge mitten im Übergang)
    const a = this.von, b = this.nach, t = this.t;
    if (!a || t >= 1) return { ...b };
    const m = {}; for (const k of Object.keys(b)) m[k] = typeof b[k] === "number" && !["farbe", "nebel"].includes(k) ? a[k] + (b[k] - a[k]) * t : b[k];
    m.farbe = new THREE.Color(a.farbe).lerp(new THREE.Color(b.farbe), t).getHex();
    m.nebel = new THREE.Color(a.nebel).lerp(new THREE.Color(b.nebel), t).getHex();
    return m;
  }
  wende(t) {
    const a = this.von || this.nach, b = this.nach;
    const mix = (k) => a[k] + (b[k] - a[k]) * t;
    const dir = sonnenRichtung(a.az, a.el).lerp(sonnenRichtung(b.az, b.el), t).normalize();
    this.sonne.position.copy(this.mitte).addScaledVector(dir, 20 + this.radius);
    this.sonne.intensity = mix("sonne") * (dir.y > 0.02 ? 1 : 0);
    this.sonne.color.set(a.farbe).lerp(new THREE.Color(b.farbe), t);
    this.sonne.visible = this.sonne.intensity > 0.001;
    for (const sky of [this.sky, this.envSky]) {
      const u = sky.material.uniforms;
      u.sunPosition.value.copy(dir); u.turbidity.value = mix("turbidity"); u.rayleigh.value = mix("rayleigh");
      u.mieCoefficient.value = mix("mie"); u.mieDirectionalG.value = mix("mieG"); u.cloudCoverage.value = mix("wolken");
    }
    this.renderer.toneMappingExposure = mix("exposure");
    this.szene.environmentIntensity = mix("umgebung");
    const nacht = THREE.MathUtils.clamp(1 - (a.sonne * (1 - t) + b.sonne * t) / 4.5, 0, 1);   // 0 = Tag, 1 = Nacht
    for (const m of this.aussenMaterialien) { m.envMapIntensity = mix("aussenEnv"); if (m.userData.nachtLicht) m.emissiveIntensity = nacht * (m.userData.nachtStaerke || 1); }
    this.hemi.intensity = mix("hemi");
    this.hemi.color.set(0xcfe0ee).lerp(this.hemiNacht, THREE.MathUtils.clamp(1 - (a.sonne * (1 - t) + b.sonne * t) / 4.5, 0, 1));
    this.szene.fog.color.set(a.nebel).lerp(new THREE.Color(b.nebel), t);
    this.schattenDirty = true;
  }
  backeUmgebung() {
    const alt = this.envRT;
    this.envRT = this.pmrem.fromScene(this.envSzene, 0.04);
    for (const m of this.aussenMaterialien) m.envMap = this.envRT.texture;   // Außenwelt sieht den Himmel
    if (!this.innenRT) this.szene.environment = this.envRT.texture;         // Innen: Sonde, bis sie da ist
    if (alt) alt.dispose();
    this.sondeFaellig = true;
  }

  // ---- Innenleuchten ----
  registriereLampe({ id, gruppe = "alle", licht = null, emissive = [], staerke = 1, emissiveStaerke = 2.5 }) {
    const l = { id, gruppe, licht, emissive, staerke, emissiveStaerke, an: false };
    this.lampen.push(l); this.schalteLampe(l, false); return l;
  }
  schalteLampe(l, an) {
    l.an = an;
    if (l.licht) l.licht.intensity = an ? l.staerke : 0;
    for (const m of l.emissive) m.emissiveIntensity = an ? l.emissiveStaerke : 0;
    this.schattenDirty = true; this.sondeFaellig = true;
  }
  schalte(gruppe, an) { for (const l of this.lampen) if (gruppe === "alle" || l.gruppe === gruppe || l.id === gruppe) this.schalteLampe(l, an); }
  alleAn() { return this.lampen.length > 0 && this.lampen.every((l) => l.an); }
  automatik(innen) { this.schalte("alle", innen); }

  // ---- pro Frame ----
  update(dt) {
    this.uhr += dt;
    this.sky.material.uniforms.time.value = this.uhr * 60;
    if (this.t < 1) {
      this.t = Math.min(1, this.t + dt / this.dauer);
      this.wende(this.t);
      const stufe = Math.floor(this.t * 3);
      if (stufe > this.envStufen || this.t >= 1) { this.envStufen = stufe + 1; this.backeUmgebung(); }
    }
    if (this.schattenDirty) { this.renderer.shadowMap.needsUpdate = true; this.schattenDirty = false; }
    if (this.sondeFaellig && this.t >= 1) this.rendereSonde(this.innenRT ? 1 : 2);
  }
}
