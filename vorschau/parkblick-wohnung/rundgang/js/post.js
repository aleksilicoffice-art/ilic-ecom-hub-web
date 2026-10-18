// Post-Processing: MSAA-Ziel → Render → GTAO (nur „hoch") → dezenter Bloom → Output (Tonemapping/sRGB).
// Ohne Post rendert der Renderer direkt (Stufe „niedrig" / Handy).
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { PARAMS } from "./qualitaet.js";

export class Post {
  constructor({ renderer, szene, kamera, stufe, huelle }) {
    this.renderer = renderer; this.szene = szene; this.kamera = kamera; this.huelle = huelle;
    this.composer = null; this.setzeStufe(stufe);
  }
  setzeStufe(stufe) {
    this.stufe = stufe;
    if (this.composer) { this.composer.dispose?.(); this.composer = null; }
    if (!stufe.post || PARAMS.get("post") === "0") return;
    const r = this.renderer, size = r.getSize(new THREE.Vector2()), dpr = r.getPixelRatio();
    const ziel = new THREE.WebGLRenderTarget(size.x * dpr, size.y * dpr, { type: THREE.HalfFloatType, samples: stufe.msaa });
    const c = new EffectComposer(r, ziel); c.setPixelRatio(dpr); c.setSize(size.x, size.y);
    c.addPass(new RenderPass(this.szene, this.kamera));
    if (stufe.ao && PARAMS.get("ao") !== "0") {
      const ao = new GTAOPass(this.szene, this.kamera, size.x, size.y);
      ao.updateGtaoMaterial({ radius: 0.28, distanceExponent: 1, thickness: 1, scale: 1, samples: 16, distanceFallOff: 1, screenSpaceRadius: false });
      ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, rings: 2, samples: 16 });
      ao.blendIntensity = 0.85; ao.setSceneClipBox(this.huelle);
      c.addPass(ao); this.ao = ao;
    }
    if (stufe.bloom && PARAMS.get("bloom") !== "0") c.addPass(new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.12, 0.4, 1.25));   // nur echte Lichtquellen/Fenster blühen
    c.addPass(new OutputPass());
    this.composer = c;
  }
  setSize(w, h) { if (this.composer) { this.composer.setPixelRatio(this.renderer.getPixelRatio()); this.composer.setSize(w, h); } }
  render() { if (this.composer) this.composer.render(); else this.renderer.render(this.szene, this.kamera); }
}
