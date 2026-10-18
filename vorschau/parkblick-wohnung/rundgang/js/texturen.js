// Prozedurale Canvas-Texturen (kein Download nötig): Fliesenspiegel, Fassaden-Fensterraster, später Bildschirm/Buchrücken.
import * as THREE from "three";

function canvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")]; }
function textur(c, { srgb = true, aniso = 4 } = {}) {
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Fliesen 30 × 60 cm, Kachel = 1,2 m × 1,2 m (4 × 2 Fliesen), helle Fuge. Liefert Farbe + Rauheit.
export function fliesenTexturen() {
  const [c, g] = canvas(512, 512), [cr, gr] = canvas(512, 512);
  g.fillStyle = "#d9d6cf"; g.fillRect(0, 0, 512, 512); gr.fillStyle = "#777"; gr.fillRect(0, 0, 512, 512);
  const bw = 128, bh = 256, fuge = 3;
  for (let y = 0; y < 2; y++) for (let x = 0; x < 4; x++) {
    const hell = 232 + Math.round((Math.sin(x * 12.9 + y * 7.1) * 0.5 + 0.5) * 8);
    g.fillStyle = `rgb(${hell},${hell - 2},${hell - 6})`; g.fillRect(x * bw + fuge, y * bh + fuge, bw - fuge * 2, bh - fuge * 2);
    gr.fillStyle = "#3a3a3a"; gr.fillRect(x * bw + fuge, y * bh + fuge, bw - fuge * 2, bh - fuge * 2);
  }
  return { farbe: textur(c), rauheit: textur(cr, { srgb: false }) };
}

// Fassade: Kachel = 3,2 m × 3,2 m (eine Etage), ein Fenster je Kachel; Emissive-Map für Nachtfenster.
export function fassadenTexturen() {
  const [c, g] = canvas(256, 256), [ce, ge] = canvas(256, 256);
  g.fillStyle = "#d7d2c8"; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#cfc9be"; g.fillRect(0, 248, 256, 8);              // Geschossband
  ge.fillStyle = "#000"; ge.fillRect(0, 0, 256, 256);
  const fx = 80, fy = 70, fw = 96, fh = 112;                       // Fenster 1,2 × 1,4 m
  g.fillStyle = "#f2efe8"; g.fillRect(fx - 6, fy - 6, fw + 12, fh + 12); // Laibung
  g.fillStyle = "#2b3440"; g.fillRect(fx, fy, fw, fh);
  g.fillStyle = "rgba(255,255,255,.12)"; g.fillRect(fx, fy, fw, fh / 2);
  g.fillStyle = "#f2efe8"; g.fillRect(fx + fw / 2 - 2, fy, 4, fh);
  const warm = Math.random() > 0.5; ge.fillStyle = "#e9b56b"; if (warm) ge.fillRect(fx, fy, fw, fh);
  return { farbe: textur(c), emissive: textur(ce) };
}

// Mehrere Fassaden-Varianten (Fensterraster mit zufällig beleuchteten Fenstern) — je Gebäude eine.
export function fassadenSatz(n = 3) { return Array.from({ length: n }, () => fassadenTexturen()); }

// Dunkler Bildschirm mit leichtem Verlauf (TV aus).
export function bildschirmTextur() {
  const [c, g] = canvas(256, 144);
  const grad = g.createLinearGradient(0, 0, 256, 144); grad.addColorStop(0, "#1a1d22"); grad.addColorStop(1, "#0c0e11");
  g.fillStyle = grad; g.fillRect(0, 0, 256, 144);
  return textur(c);
}

// Kunstdrucke für die Bilderrahmen (ersetzen den Poly-Haven-Platzhalter „Ray Homes"): ruhige, grafische Motive in den
// Farben der Einrichtung. Jeder Aufruf mit anderem Index liefert ein anderes Motiv.
export function kunstdruckTextur(variante = 0) {
  const [c, g] = canvas(512, 720);
  const sand = "#e9e1d3", terra = "#b9734f", salbei = "#8a9a7b", tinte = "#2b2622", messing = "#b08a4a", creme = "#f4efe6";
  g.fillStyle = creme; g.fillRect(0, 0, 512, 720);
  const v = ((variante % 4) + 4) % 4;
  if (v === 0) {            // Bogen + Sonne
    g.fillStyle = sand; g.fillRect(96, 120, 320, 480);
    g.fillStyle = terra; g.beginPath(); g.arc(256, 330, 120, Math.PI, 0); g.lineTo(376, 600); g.lineTo(136, 600); g.closePath(); g.fill();
    g.fillStyle = creme; g.beginPath(); g.arc(256, 300, 46, 0, Math.PI * 2); g.fill();
  } else if (v === 1) {     // drei Linienblätter
    g.strokeStyle = tinte; g.lineWidth = 3; g.lineCap = "round";
    for (let i = 0; i < 3; i++) { const x = 150 + i * 106; g.beginPath(); g.moveTo(x, 600); g.quadraticCurveTo(x + 40, 420, x, 170); g.quadraticCurveTo(x - 40, 420, x, 600); g.stroke(); g.beginPath(); g.moveTo(x, 600); g.lineTo(x, 190); g.stroke(); }
    g.fillStyle = salbei; g.globalAlpha = .35; g.beginPath(); g.arc(256, 390, 150, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
  } else if (v === 2) {     // Farbfelder
    g.fillStyle = salbei; g.fillRect(90, 110, 332, 250);
    g.fillStyle = terra; g.fillRect(90, 370, 160, 240);
    g.fillStyle = sand; g.fillRect(262, 370, 160, 240);
    g.fillStyle = tinte; g.fillRect(90, 360, 332, 6);
  } else {                  // Kreise
    g.fillStyle = sand; g.fillRect(80, 100, 352, 520);
    for (let i = 0; i < 5; i++) { g.strokeStyle = i % 2 ? messing : tinte; g.lineWidth = 2.5; g.beginPath(); g.arc(256, 360, 60 + i * 36, 0, Math.PI * 2); g.stroke(); }
    g.fillStyle = terra; g.beginPath(); g.arc(256, 360, 30, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = "rgba(43,38,34,.55)"; g.font = "600 14px Hanken Grotesk, system-ui, sans-serif"; g.fillText("Nº " + (v + 1), 96, 660);
  const t = textur(c); t.flipY = false;    // glTF-UV-Konvention
  return t;
}
