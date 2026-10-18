// Einstieg: Renderer, Qualitätsstufe, Laden, Architektur, Licht, Post, Schleife.
import * as THREE from "three";
import { PARAMS, STUFEN, ermittleStufe, pixelRatio, istTouch, FpsMesser } from "./qualitaet.js";
import { Materialien } from "./material.js";
import { PLAN } from "./plan.js";
import { baueArchitektur } from "./bau.js";
import { Licht } from "./licht.js";
import { Post } from "./post.js";
import { Steuerung } from "./steuerung.js";
import { Navigation } from "./navigation.js";
import { baueLeuchten, baueMoebel } from "./moebel.js";
import { ladeModelle } from "./modelle.js";
import { UI } from "./ui.js";
import { Minimap } from "./minimap.js";
import { merkeStufe, STUFEN_REIHE } from "./qualitaet.js";

const $ = (id) => document.getElementById(id);
const canvas = $("buehne"), lade = $("lade"), fuellung = $("lade-fuellung"), status = $("lade-status"), startBtn = $("lade-start"), fpsBox = $("fps");
const DEBUG = PARAMS.has("debug");

const stufeId = ermittleStufe(), stufe = STUFEN[stufeId];
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !stufe.post, powerPreference: "high-performance" });
renderer.setPixelRatio(pixelRatio(stufe));
renderer.toneMapping = THREE.AgXToneMapping; renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true; renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.type = (PARAMS.get("schatten") || stufe.schattenArt) === "basic" ? THREE.BasicShadowMap : THREE.PCFShadowMap;
renderer.info.autoReset = false;

const szene = new THREE.Scene();
// Kamera-Rig: rig (Position + Gier) → kopf (Nicken) → Kamera. Steuerung (Zug 2) bewegt nur rig/kopf.
const rig = new THREE.Object3D(), kopf = new THREE.Object3D();
const kamera = new THREE.PerspectiveCamera(70, 1, 0.05, 1500);
rig.add(kopf); kopf.add(kamera); szene.add(rig);
rig.position.set(...PLAN.start.pos); rig.rotation.y = PLAN.start.yaw; kopf.rotation.x = PLAN.start.pitch;
// ?blick=x,z,yawGrad,pitchGrad setzt den Standpunkt (Debug/Screenshots)
if (PARAMS.has("blick")) { const [bx, bz, by = 180, bp = 0] = PARAMS.get("blick").split(",").map(Number); rig.position.set(bx, 1.6, bz); rig.rotation.y = by * Math.PI / 180; kopf.rotation.x = bp * Math.PI / 180; }
// Debug-Draufsicht (?debug=1): orthografisch von oben, Decken ausgeblendet
const topKamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
topKamera.position.set(4.5, 60, 5.2); topKamera.up.set(0, 0, -1); topKamera.lookAt(4.5, 0, 5.2);

const manager = new THREE.LoadingManager();
manager.onProgress = (url, l, g) => { const p = Math.round((l / Math.max(g, 1)) * 100); fuellung.style.width = `${p}%`; fuellung.parentElement.setAttribute("aria-valuenow", p); status.textContent = `${l} von ${g} Dateien geladen …`; };

const mat = new Materialien({ renderer, manager, stufe });
const stats = { fps: 0, low1: 0, calls: 0, tris: 0, stufe: stufeId, dpr: renderer.getPixelRatio() };
window.__rundgang = { stats, renderer, szene, kamera, rig, kopf, stufe: stufeId, PARAMS, PLAN };

const bau = baueArchitektur(PLAN, mat);
szene.add(bau.gruppe);
if (DEBUG) {
  bau.oben.visible = false;
  // Kollisionsrechtecke als Linien
  const linien = [];
  for (const k of bau.kollision) { if (k.yMin > 1.9 || k.yMax < 0.4) continue; const y = 0.05; linien.push(k.x1, y, k.z1, k.x2, y, k.z1, k.x2, y, k.z1, k.x2, y, k.z2, k.x2, y, k.z2, k.x1, y, k.z2, k.x1, y, k.z2, k.x1, y, k.z1); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(linien, 3));
  szene.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xff2a2a })));
  console.table(PLAN.raeume.map((r) => ({ raum: r.id, x: `${r.rect[0]}–${r.rect[2]}`, z: `${r.rect[1]}–${r.rect[3]}`, m2: ((r.rect[2] - r.rect[0]) * (r.rect[3] - r.rect[1])).toFixed(1) })));
  console.info(`[bau] ${Object.keys(bau.meshes).length} Meshes, ${bau.kollision.length} Kollisionsrechtecke`);
}
const licht = new Licht({ renderer, szene, stufe, huelle: bau.huelle, sonde: new THREE.Vector3(4.6, 1.5, 7.4), aussenMaterialien: bau.aussenMaterialien });
const leuchten = baueLeuchten(PLAN, mat, licht); szene.add(leuchten.gruppe);
const moebel = baueMoebel(PLAN, mat, licht); szene.add(moebel.gruppe); bau.kollision.push(...moebel.kollision);
// Punktlichter begrenzen (jedes kostet pro Pixel): Stufe oder ?lichter=N; überzählige werden entfernt, Leuchtkörper bleiben emissiv
{ const max = PARAMS.has("lichter") ? parseInt(PARAMS.get("lichter"), 10) : stufe.punktlichter;
  let n = 0; for (const l of licht.lampen) if (l.licht) { n++; if (n > max) { l.licht.removeFromParent(); l.licht = null; } }
  window.__rundgang.punktlichter = Math.min(n, max); }
const modelle = await ladeModelle(PLAN, { manager, stufe, kollision: bau.kollision, debug: DEBUG }); szene.add(modelle.gruppe);
window.__rundgang.modelle = modelle;
const post = new Post({ renderer, szene, kamera: DEBUG ? topKamera : kamera, stufe, huelle: bau.huelle });
window.__rundgang.bau = bau; window.__rundgang.licht = licht;
const steuerung = new Steuerung({ canvas, rig, kopf, kamera, kollision: bau.kollision, touch: istTouch(), start: { pos: rig.position.toArray(), yaw: rig.rotation.y, pitch: kopf.rotation.x }, joystickEl: $("joystick") });
const nav = new Navigation({ PLAN, steuerung, boeden: bau.boeden, kamera });
window.__rundgang.steuerung = steuerung; window.__rundgang.nav = nav;
// Stufenwechsel: Pixelmaß/Post/Schatten live, Textur-Satz erst nach Neuladen (Menü lädt neu).
let aktStufe = stufeId;
function wendeStufeAn(id, { neuladen = false, merken = false } = {}) {
  if (!STUFEN[id]) return; if (merken) merkeStufe(id);      // nur die bewusste Wahl im Menü wird gespeichert
  if (neuladen) { try { sessionStorage.setItem("rundgang.standort", JSON.stringify({ pos: [rig.position.x, rig.position.z], yaw: steuerung.yawZiel, pitch: steuerung.pitchZiel, zeit: licht.zeitId })); } catch {}
    const u = new URL(location.href); u.searchParams.delete("stufe"); location.href = u.toString(); return; }
  aktStufe = id; const s = STUFEN[id];
  renderer.setPixelRatio(pixelRatio(s)); stats.dpr = renderer.getPixelRatio(); stats.stufe = id;
  post.setzeStufe(s); resize();
  if (licht.sonne.shadow.mapSize.x !== s.schatten) { licht.sonne.shadow.mapSize.set(s.schatten, s.schatten); licht.sonne.shadow.map?.dispose(); licht.sonne.shadow.map = null; renderer.shadowMap.needsUpdate = true; }
}
const minimap = new Minimap({ canvas: $("minimap"), PLAN, steuerung, nav });
const ui = new UI({ PLAN, licht, nav, steuerung, renderer, kamera, szene, post, stufeId, bau, minimap, wechsleStufe: (id) => wendeStufeAn(id, { neuladen: true, merken: true }) });
nav.an("puppenhausAus", () => ui.setzePuppenhaus(false));
addEventListener("resize", () => minimap.resize());
window.__rundgang.ui = ui; window.__rundgang.wendeStufeAn = wendeStufeAn;

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); kamera.aspect = w / h; steuerung.setzeFov();
  const halb = 7.2, a = w / h; topKamera.left = -halb * a; topKamera.right = halb * a; topKamera.top = halb; topKamera.bottom = -halb; topKamera.updateProjectionMatrix();
  post.setSize(w, h);
}
addEventListener("resize", resize); resize();

// Shader vorab kompilieren, damit der erste Blick nicht ruckelt
status.textContent = "Licht und Materialien werden vorbereitet …";
try { await renderer.compileAsync(szene, DEBUG ? topKamera : kamera); } catch (e) { console.warn("[app] compileAsync", e); }
// Alle Texturen jetzt auf die GPU (sonst ruckelt der erste Blick in jeden Raum), dann vier Blickrichtungen vorrendern.
{ const gesehen = new Set();
  szene.traverse((o) => { const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []; for (const m of ms) for (const k of ["map", "normalMap", "roughnessMap", "metalnessMap", "aoMap", "emissiveMap"]) { const t = m[k]; if (t && !gesehen.has(t)) { gesehen.add(t); renderer.initTexture(t); } } });
  status.textContent = `Bild wird vorbereitet … (${gesehen.size} Texturen)`;
  licht.update(0);
  const yaw0 = rig.rotation.y;
  for (let i = 0; i < 4; i++) { rig.rotation.y = yaw0 + i * Math.PI / 2; post.render(); await new Promise((r) => setTimeout(r, 0)); }
  rig.rotation.y = yaw0; }
let frames = 0; window.__rundgang.frames = () => frames;
status.textContent = "Bereit."; fuellung.style.width = "100%"; startBtn.disabled = false;
window.__rundgang.ladezeit = Math.round(performance.now()) / 1000; console.info(`[app] bereit nach ${window.__rundgang.ladezeit} s (${stufeId})`);
try { const m = JSON.parse(sessionStorage.getItem("rundgang.standort") || "null"); if (m && !PARAMS.has("blick")) { steuerung.setzePosition(m.pos[0], m.pos[1]); steuerung.setzeBlick(m.yaw, m.pitch, true); if (m.zeit) ui.setzeTageszeit(m.zeit); sessionStorage.removeItem("rundgang.standort"); } } catch {}
function starten() { lade.classList.add("weg"); steuerung.aktiv = true; ui.zeige(); canvas.focus(); if (!PARAMS.has("auto") && !sessionStorage.getItem("rundgang.hilfe")) { setTimeout(() => ui.toast(istTouch() ? "Links ziehen = gehen · rechts wischen = umsehen · tippen = hingehen" : "Klick ins Bild, dann W A S D gehen und Maus umsehen · H für Hilfe", 4500), 600); try { sessionStorage.setItem("rundgang.hilfe", "1"); } catch {} } }
startBtn.addEventListener("click", starten);
if (PARAMS.has("auto")) starten();


const fps = new FpsMesser(); window.__rundgang.fpsMesser = fps; const uhr = new THREE.Timer(); let zeit = 0;
if (PARAMS.has("fps")) fpsBox.hidden = false;
const drehen = PARAMS.has("drehen");
renderer.setAnimationLoop(() => {
  uhr.update(); const dt = Math.min(uhr.getDelta(), 0.1); zeit += dt; frames++;
  if (drehen) steuerung.setzeBlick(PLAN.start.yaw + Math.sin(zeit * 0.3) * 0.9);
  steuerung.update(dt); nav.update(dt);
  licht.update(dt); ui.update(dt);
  post.render();
  const info = renderer.info.render; stats.calls = info.calls; stats.tris = info.triangles; renderer.info.reset();
  const sig = steuerung.aktiv ? fps.tick(dt) : null; stats.fps = Math.round(fps.fps); stats.low1 = Math.round(fps.low1);
  if (sig === "langsam" && !PARAMS.has("stufe")) { const i = STUFEN_REIHE.indexOf(aktStufe); if (i < STUFEN_REIHE.length - 1) { wendeStufeAn(STUFEN_REIHE[i + 1]); ui.toast(`Bildqualität automatisch auf „${STUFEN_REIHE[i + 1]}" gesetzt, damit es flüssig bleibt`, 3500); fps.ausgeloest = false; fps.langsamSeit = 0; fps.zeit = 0; } }
  if (!fpsBox.hidden) fpsBox.textContent = `${stats.fps} fps · low1 ${stats.low1} · ${stats.calls} calls · ${(stats.tris / 1000).toFixed(0)}k tris\n${stats.stufe} · dpr ${stats.dpr} · ${innerWidth}×${innerHeight} · touch ${istTouch()}`;
});
