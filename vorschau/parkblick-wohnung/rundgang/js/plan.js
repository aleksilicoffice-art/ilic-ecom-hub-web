// Grundriss „Musterwohnung Parkblick" — NUR DATEN. Einheiten Meter; x → Ost, z → Süd, y nach oben; Norden = −z.
// Raum-Rechtecke sind Innenmaße (Wandflächen). Wände als Mittellinie + Dicke; Öffnungen in absoluten Koordinaten
// entlang der Wandachse (x bei Ost-West-Wänden, z bei Nord-Süd-Wänden). Blickwinkel yaw: 0 = Nord, π = Süd, +π/2 = West, −π/2 = Ost.
const H = 2.6, WA = 0.3, WI = 0.12;
const N = 0, S = Math.PI, W = Math.PI / 2, O = -Math.PI / 2;

export const PLAN = {
  meta: {
    name: "Musterwohnung Parkblick", fiktiv: true, hoehe: H, wandInnen: WI, wandAussen: WA,
    huelle: [-0.3, -0.3, 9.3, 9.7],      // Außenkante des Baukörpers (x1, z1, x2, z2)
    innen: [0, 0, 9.0, 9.4],             // Innenkante
    etage: 3, bodenAussen: -9.6,         // 3. OG: Gelände liegt 9,6 m tiefer
  },

  raeume: [
    { id: "flur",     name: "Flur",         rect: [3.52, 0,    5.20, 5.72], boden: "parkett", flaeche: "9,5 m²",
      kamera: { pos: [4.36, 1.6, 1.3], yaw: S, pitch: 0 },
      hotspot: { pos: [4.36, 1.45, 3.2], titel: "Flur", text: "Langer Flur mit Garderobe und Spiegel — von hier gehen alle Räume ab. Türen in Weiß, durchgehendes Eichenparkett." } },
    { id: "kueche",   name: "Küche",        rect: [0,    0,    3.40, 3.00], boden: "parkett", flaeche: "10,2 m²",
      kamera: { pos: [2.6, 1.6, 2.1], yaw: W + 0.5, pitch: 0 },
      hotspot: { pos: [1.4, 1.3, 1.5], titel: "Küche", text: "Einbauküche in L-Form mit Halbinsel und zwei Barhockern, Fenster über der Spüle nach Norden, Steinarbeitsplatte, Eichenfronten." } },
    { id: "essen",    name: "Essbereich",   rect: [0,    3.00, 3.40, 5.72], boden: "parkett", flaeche: "9,0 m²",
      kamera: { pos: [2.9, 1.6, 5.2], yaw: W + 0.35, pitch: 0 },
      hotspot: { pos: [1.7, 1.4, 4.7], titel: "Essbereich", text: "Offen zu Küche und Wohnzimmer. Westfenster — die Abendsonne fällt hier auf den Tisch." } },
    { id: "wohnen",   name: "Wohnzimmer",   rect: [0,    5.72, 9.00, 9.40], boden: "parkett", flaeche: "33 m²",
      kamera: { pos: [4.6, 1.6, 6.3], yaw: S, pitch: 0 },
      hotspot: { pos: [5.0, 1.3, 7.3], titel: "Wohnzimmer", text: "Rund 33 m² nach Süden mit zwei Fenstern und Balkontür. Sofa als Raumteiler zum Essbereich, TV-Wand, Leseecke am Regal." } },
    { id: "balkon",   name: "Balkon",       rect: [5.60, 9.70, 9.00, 11.20], boden: "beton", flaeche: "5,1 m²", aussen: true,
      kamera: { pos: [7.3, 1.6, 10.3], yaw: S, pitch: -0.1 },
      hotspot: { pos: [6.3, 1.5, 10.4], titel: "Balkon", text: "Südbalkon mit Glasbrüstung und freiem Blick über den Park. Platz für Bistrotisch und zwei Stühle." } },
    { id: "schlafen", name: "Schlafzimmer", rect: [5.32, 0,    9.00, 3.60], boden: "parkett", flaeche: "13,2 m²",
      kamera: { pos: [5.9, 1.6, 2.6], yaw: O + 0.6, pitch: 0 },
      hotspot: { pos: [7.1, 1.4, 2.5], titel: "Schlafzimmer", text: "Ostfenster für die Morgensonne, Platz für ein 1,80-m-Bett mit Nachttischen und einen Kleiderschrank über die ganze Südwand." } },
    { id: "bad",      name: "Bad",          rect: [5.32, 3.72, 9.00, 5.60], boden: "terrazzo", flaeche: "6,9 m²",
      kamera: { pos: [5.8, 1.6, 4.75], yaw: O, pitch: 0 },
      hotspot: { pos: [7.0, 1.4, 4.6], titel: "Bad", text: "Tageslichtbad mit bodengleicher Dusche, Doppelwaschtisch und Terrazzoboden. Fliesenspiegel bis 1,20 m." } },
  ],

  // Offene Übergänge ohne Wand (für Raumgraph/Minimap): Linie [[x,z],[x,z]]
  portale: [
    { von: "kueche", nach: "essen",  linie: [[0.6, 3.0], [3.4, 3.0]] },
    { von: "essen",  nach: "wohnen", linie: [[0, 5.72], [3.4, 5.72]] },
    { von: "flur",   nach: "wohnen", linie: [[3.52, 5.72], [5.2, 5.72]] },
  ],

  waende: [
    { id: "aussen-n", von: [-0.3, -0.15], bis: [9.3, -0.15], dicke: WA, aussen: true, oeffnungen: [
      { typ: "fenster",  von: 1.0,  bis: 2.4,  unten: 0.9, oben: 2.2, raum: "kueche" },
      { typ: "haustuer", von: 3.86, bis: 4.86, unten: 0,   oben: 2.1, raum: "flur", nach: "flur", anschlag: "ende" } ] },
    { id: "aussen-o", von: [9.15, 0], bis: [9.15, 9.4], dicke: WA, aussen: true, oeffnungen: [
      { typ: "fenster", von: 1.0, bis: 2.6, unten: 0.8, oben: 2.3, raum: "schlafen" },
      { typ: "fenster", von: 4.2, bis: 5.0, unten: 1.3, oben: 2.1, raum: "bad", milch: true } ] },
    { id: "aussen-s", von: [-0.3, 9.55], bis: [9.3, 9.55], dicke: WA, aussen: true, oeffnungen: [
      { typ: "fenster",    von: 0.9, bis: 2.9, unten: 0.5, oben: 2.3, raum: "wohnen", fluegel: 2 },
      { typ: "fenster",    von: 3.6, bis: 5.2, unten: 0.5, oben: 2.3, raum: "wohnen", fluegel: 2 },
      { typ: "balkontuer", von: 6.3, bis: 8.1, unten: 0,   oben: 2.3, raum: "wohnen", fluegel: 2 } ] },
    { id: "aussen-w", von: [-0.15, 0], bis: [-0.15, 9.4], dicke: WA, aussen: true, oeffnungen: [
      { typ: "fenster", von: 3.6, bis: 5.0, unten: 0.9, oben: 2.3, raum: "essen" } ] },
    { id: "flur-w", von: [3.46, 0], bis: [3.46, 5.72], dicke: WI, oeffnungen: [
      { typ: "tuer",      von: 1.0, bis: 1.9, unten: 0, oben: 2.08, von_raum: "flur", nach: "kueche", anschlag: "anfang" },
      { typ: "durchgang", von: 3.7, bis: 5.3, unten: 0, oben: 2.2 } ] },
    { id: "flur-o", von: [5.26, 0], bis: [5.26, 5.72], dicke: WI, oeffnungen: [
      { typ: "tuer", von: 1.4, bis: 2.3, unten: 0, oben: 2.08, von_raum: "flur", nach: "schlafen", anschlag: "ende" },
      { typ: "tuer", von: 4.3, bis: 5.2, unten: 0, oben: 2.08, von_raum: "flur", nach: "bad", anschlag: "anfang" } ] },
    { id: "schlafen-bad", von: [5.32, 3.66], bis: [9.0, 3.66], dicke: WI, oeffnungen: [] },
    { id: "bad-wohnen",   von: [5.32, 5.66], bis: [9.0, 5.66], dicke: WI, oeffnungen: [] },
  ],

  balkon: { rect: [5.6, 9.7, 9.0, 11.2], platte: [5.4, 9.7, 9.3, 11.2], bruestung: 1.1, offen: ["w", "s", "o"] },

  // Fliesenspiegel/Sockel-Ausnahmen je Raum
  baender: { bad: { fliesen: 1.2 } },

  aussen: {
    bodenY: -9.6,
    weg: [[7.3, 12.5], [9.5, 18], [14, 25], [16, 34], [12, 44], [4, 52], [-6, 60], [-10, 72]],
    baeume: [[-8, 16, 1.0], [2, 19, 0.8], [20, 15, 1.1], [26, 24, 0.9], [-16, 26, 1.2], [-2, 30, 1.0], [8, 37, 0.9], [24, 38, 1.1], [-22, 40, 1.0], [-9, 44, 0.85], [20, 50, 1.0], [2, 58, 1.1], [-20, 56, 0.9], [30, 60, 1.0], [12, 66, 0.95], [-30, 20, 1.1], [36, 14, 0.9], [-36, 34, 1.0], [40, 44, 1.1], [-4, 78, 1.0], [22, 80, 0.9], [-26, 74, 1.1], [44, 26, 0.95], [-40, 52, 1.0], [34, 74, 1.0]],
    buesche: [[4, 14], [11, 16], [-3, 22], [18, 30], [-12, 34], [6, 46], [26, 46], [-18, 50]],
    baenke: [[10.5, 21, 0.5], [-7, 61, -0.6]],
    laternen: [[5.8, 15], [13, 28], [10, 42], [-4, 55]],
    nachbarn: [[-42, 30, 22, 14, 10], [52, 38, 18, 16, 13], [8, 95, 40, 16, 12], [-30, 90, 24, 14, 9]],   // x, z, breite, tiefe, hoehe
  },

  // Einrichtung. typ "gltf": Poly-Haven-Modell (assets/modelle/<modell>/), typ "param": parametrisch aus moebel.js.
  // pos = [x, y, z] Standpunkt (y = 0 Boden), rotY in Grad (0 = Front nach Süden/+z, 90 = nach Osten … je Modell geprüft).
  moebel: [
    // --- Küche
    { id: "kueche",      typ: "param", art: "kuechenzeile", raum: "kueche" },
    { id: "hocker-1",    typ: "gltf",  modell: "bar_chair_round_01", pos: [1.25, 0, 3.45], rotY: 0,   raum: "essen" },
    { id: "hocker-2",    typ: "gltf",  modell: "bar_chair_round_01", pos: [2.05, 0, 3.45], rotY: 20,  raum: "essen" },
    { id: "uhr",         typ: "gltf",  modell: "wall_clock", pos: [3.38, 1.95, 3.35], rotY: -90, raum: "essen", kollision: false, skal: 1.0 },
    // --- Essbereich
    { id: "esstisch",    typ: "param", art: "esstisch", pos: [1.7, 0, 4.65], rotY: 0, b: 1.6, t: 0.9, raum: "essen" },
    { id: "stuhl-1",     typ: "gltf",  modell: "dining_chair_02", pos: [1.3, 0, 4.05], rotY: 180, raum: "essen" },
    { id: "stuhl-2",     typ: "gltf",  modell: "dining_chair_02", pos: [2.1, 0, 4.05], rotY: 175, raum: "essen" },
    { id: "stuhl-3",     typ: "gltf",  modell: "dining_chair_02", pos: [1.3, 0, 5.25], rotY: 5,   raum: "essen" },
    { id: "stuhl-4",     typ: "gltf",  modell: "dining_chair_02", pos: [2.1, 0, 5.25], rotY: -8,  raum: "essen" },
    { id: "vase-tisch",  typ: "gltf",  modell: "ceramic_vase_04", pos: [1.7, 0.76, 4.65], rotY: 30, raum: "essen", kollision: false, skal: 0.8 },
    { id: "pflanze-ess", typ: "gltf",  modell: "potted_plant_02", pos: [0.6, 0, 5.3], rotY: 40, raum: "essen" },
    // --- Flur
    { id: "laeufer",     typ: "param", art: "teppich", pos: [4.36, 0, 3.0], b: 0.8, t: 3.2, farbe: 0xb9aa96, raum: "flur" },
    { id: "garderobe",   typ: "param", art: "garderobe", pos: [5.19, 0, 0.8], rotY: -90, raum: "flur" },
    { id: "schuhbank",   typ: "param", art: "schuhbank", pos: [3.73, 0, 2.55], rotY: 90, raum: "flur" },
    { id: "bild-flur-0", typ: "gltf",  modell: "hanging_picture_frame_01", pos: [3.53, 1.6, 2.55], rotY: 90, raum: "flur", kollision: false, skal: 1.5 },
    { id: "bild-flur-1", typ: "gltf",  modell: "hanging_picture_frame_01", pos: [5.19, 1.55, 3.05], rotY: -90, raum: "flur", kollision: false },
    { id: "bild-flur-2", typ: "gltf",  modell: "hanging_picture_frame_01", pos: [5.19, 1.55, 3.75], rotY: -90, raum: "flur", kollision: false },
    // --- Wohnzimmer
    { id: "sofa",        typ: "param", art: "sofa", pos: [3.2, 0, 7.6], rotY: -90, b: 2.3, t: 0.95, raum: "wohnen" },
    { id: "kissen-sofa", typ: "gltf",  modell: "throw_pillows_01", pos: [3.25, 0.47, 6.95], rotY: -90, raum: "wohnen", kollision: false, farbe: 0xb7c2a8 },
    { id: "couchtisch",  typ: "gltf",  modell: "coffee_table_round_01", pos: [1.75, 0, 7.6], rotY: 0, raum: "wohnen" },
    { id: "teppich-wohn",typ: "param", art: "teppich", pos: [1.95, 0, 7.6], b: 2.1, t: 2.8, farbe: 0xcdc3b3, raum: "wohnen" },
    { id: "buecher-ct",  typ: "param", art: "buecherstapel", pos: [1.95, 0.5, 7.35], rotY: 15, raum: "wohnen" },
    { id: "sideboard",   typ: "gltf",  modell: "modern_wooden_cabinet", pos: [0.27, 0, 7.6], rotY: 90, raum: "wohnen" },
    { id: "tv",          typ: "param", art: "tv", pos: [0.017, 1.4, 7.6], rotY: 90, b: 1.45, h: 0.82, raum: "wohnen" },
    { id: "foto-sb",     typ: "gltf",  modell: "standing_picture_frame_01", pos: [0.27, 0.69, 8.45], rotY: 80, raum: "wohnen", kollision: false },
    { id: "vase-sb",     typ: "gltf",  modell: "ceramic_vase_02", pos: [0.27, 0.69, 6.8], rotY: 0, raum: "wohnen", kollision: false },
    { id: "sessel",      typ: "gltf",  modell: "mid_century_lounge_chair", pos: [7.9, 0, 7.5], rotY: 225, raum: "wohnen" },
    { id: "stehlampe",   typ: "param", art: "stehlampe", pos: [8.6, 0, 6.35], raum: "wohnen", licht: { id: "stehlampe", gruppe: "wohnen", cd: 2.5 } },
    { id: "pflanze-wohn",typ: "gltf",  modell: "potted_plant_02", pos: [8.4, 0, 8.85], rotY: 160, raum: "wohnen", skal: 1.15 },
    { id: "lesesessel",  typ: "gltf",  modell: "modern_arm_chair_01", pos: [4.75, 0, 8.6], rotY: 195, raum: "wohnen" },
    { id: "beistell",    typ: "gltf",  modell: "side_table_01", pos: [3.95, 0, 8.95], rotY: 0, raum: "wohnen" },
    { id: "regal",       typ: "param", art: "regal", pos: [8.83, 0, 7.0], rotY: -90, b: 2.0, h: 2.1, t: 0.32, raum: "wohnen" },
    { id: "vase-regal",  typ: "gltf",  modell: "ceramic_vase_02", pos: [8.83, 1.28, 7.5], rotY: 0, raum: "wohnen", kollision: false, skal: 0.7 },
    { id: "bild-wohn-1", typ: "gltf",  modell: "hanging_picture_frame_01", pos: [6.3, 1.55, 5.735], rotY: 0, raum: "wohnen", kollision: false, skal: 1.3 },
    { id: "bild-wohn-2", typ: "gltf",  modell: "hanging_picture_frame_01", pos: [7.25, 1.55, 5.735], rotY: 0, raum: "wohnen", kollision: false, skal: 1.3 },
    { id: "vorhang-w1",  typ: "param", art: "vorhang", pos: [1.9, 0, 9.33], rotY: 0, b: 2.0, raum: "wohnen" },
    { id: "vorhang-w2",  typ: "param", art: "vorhang", pos: [4.4, 0, 9.33], rotY: 0, b: 1.6, raum: "wohnen" },
    { id: "vorhang-bt",  typ: "param", art: "vorhang", pos: [7.2, 0, 9.33], rotY: 0, b: 1.8, raum: "wohnen" },
    // --- Schlafzimmer
    { id: "bett",        typ: "param", art: "bett", pos: [7.16, 0, 0.06], rotY: 0, raum: "schlafen" },
    { id: "kissen-bett", typ: "gltf",  modell: "throw_pillows_01", pos: [6.75, 0.56, 0.75], rotY: 0, raum: "schlafen", kollision: false, farbe: 0xd8cfc0 },
    { id: "nacht-1",     typ: "param", art: "nachttisch", pos: [5.85, 0, 0.3], raum: "schlafen", licht: { id: "nacht-1", gruppe: "schlafen", cd: 1.8 } },
    { id: "nacht-2",     typ: "param", art: "nachttisch", pos: [8.47, 0, 0.3], raum: "schlafen", licht: { id: "nacht-2", gruppe: "schlafen" } },
    { id: "schrank",     typ: "param", art: "schrank", pos: [7.5, 0, 3.3], rotY: 180, b: 2.6, h: 2.3, t: 0.6, raum: "schlafen" },
    { id: "kommode",     typ: "gltf",  modell: "drawer_cabinet", pos: [5.58, 0, 2.98], rotY: 90, raum: "schlafen" },
    { id: "teppich-schl",typ: "param", art: "teppich", pos: [7.16, 0, 2.3], b: 2.4, t: 1.3, farbe: 0xc9bfae, raum: "schlafen" },
    { id: "pflanze-schl",typ: "gltf",  modell: "potted_plant_02", pos: [8.45, 0, 2.5], rotY: 220, raum: "schlafen", skal: 0.9 },
    { id: "bild-schl",   typ: "gltf",  modell: "hanging_picture_frame_01", pos: [7.16, 1.75, 0.02], rotY: 0, raum: "schlafen", kollision: false, skal: 1.6 },
    { id: "vorhang-schl",typ: "param", art: "vorhang", pos: [8.93, 0, 1.8], rotY: 90, b: 1.6, raum: "schlafen" },
    // --- Bad
    { id: "waschtisch",  typ: "param", art: "waschtisch", pos: [6.2, 0, 3.72], rotY: 0, raum: "bad", licht: { id: "spiegel-licht", gruppe: "bad", cd: 1.5 } },
    { id: "wc",          typ: "param", art: "wc", pos: [7.4, 0, 3.72], rotY: 0, raum: "bad" },
    { id: "dusche",      typ: "param", art: "dusche", pos: [8.0, 0, 3.72], rotY: 0, raum: "bad" },
    { id: "handtuecher", typ: "param", art: "handtuchhalter", pos: [6.7, 1.05, 5.6], rotY: 180, raum: "bad" },
    { id: "badematte",   typ: "param", art: "teppich", pos: [7.5, 0, 5.05], b: 0.8, t: 0.5, farbe: 0xe6e1d7, raum: "bad" },
    { id: "pflanze-bad", typ: "gltf",  modell: "potted_plant_04", pos: [5.55, 0.9, 3.95], rotY: 0, raum: "bad", kollision: false },
    // --- Balkon
    { id: "bistro",      typ: "gltf",  modell: "outdoor_table_chair_set_01", pos: [7.9, -0.02, 10.5], rotY: 90, raum: "balkon" },
    { id: "pflanze-balk",typ: "gltf",  modell: "potted_plant_02", pos: [6.0, -0.02, 10.9], rotY: 90, raum: "balkon", skal: 1.1 },
    { id: "kuebel",      typ: "param", art: "kuebel", pos: [6.0, -0.02, 10.1], raum: "balkon" },
  ],

  // Leuchten: typ decke (flache Deckenleuchte), pendel (Kugel an Schnur), wand. „licht:false" = nur Leuchtkörper
  // (emissiv), kein Punktlicht — hält die Zahl der Punktlichter klein (Handy). cd = Candela des Punktlichts.
  lichter: [
    { id: "flur-1",     typ: "decke",  pos: [4.36, 1.7],  raum: "flur",     gruppe: "flur",     licht: false },
    { id: "flur-2",     typ: "decke",  pos: [4.36, 3.6],  raum: "flur",     gruppe: "flur",     cd: 4 },
    { id: "kueche-1",   typ: "decke",  pos: [1.7, 1.5],   raum: "kueche",   gruppe: "kueche",   cd: 4.5 },
    { id: "theke-1",    typ: "pendel", pos: [1.25, 2.7],  raum: "kueche",   gruppe: "kueche",   licht: false, hoehe: 1.65, radius: 0.11 },
    { id: "theke-2",    typ: "pendel", pos: [2.05, 2.7],  raum: "kueche",   gruppe: "kueche",   licht: false, hoehe: 1.65, radius: 0.11 },
    { id: "essen-1",    typ: "pendel", pos: [1.7, 4.7],   raum: "essen",    gruppe: "essen",    cd: 4, hoehe: 1.85, radius: 0.18 },
    { id: "wohnen-1",   typ: "decke",  pos: [2.2, 7.6],   raum: "wohnen",   gruppe: "wohnen",   cd: 5 },
    { id: "wohnen-2",   typ: "decke",  pos: [6.2, 7.6],   raum: "wohnen",   gruppe: "wohnen",   licht: false },
    { id: "schlafen-1", typ: "decke",  pos: [7.16, 1.9],  raum: "schlafen", gruppe: "schlafen", cd: 4 },
    { id: "bad-1",      typ: "decke",  pos: [7.0, 4.65],  raum: "bad",      gruppe: "bad",      cd: 3.5 },
    { id: "balkon-1",   typ: "wand",   pos: [8.9, 9.76],  raum: "balkon",   gruppe: "balkon",   licht: false, hoehe: 2.1 },
  ],

  start: { raum: "flur", pos: [4.36, 1.6, 0.9], yaw: S, pitch: 0 },
  tour: [
    { raum: "flur",     pos: [4.36, 1.2],  yaw: S,        pitch: 0,     dauer: 3, text: "Willkommen — wir starten im Flur." },
    { raum: "kueche",   pos: [2.4, 1.8],   yaw: W + 0.4,  pitch: -0.05, dauer: 4, text: "Küche mit Halbinsel und Nordfenster." },
    { raum: "essen",    pos: [2.6, 4.9],   yaw: W + 0.5,  pitch: 0,     dauer: 4, text: "Essbereich mit Abendsonne von Westen." },
    { raum: "wohnen",   pos: [4.8, 6.9],   yaw: S + 0.25, pitch: 0,     dauer: 4, text: "Wohnzimmer nach Süden." },
    { raum: "balkon",   pos: [7.3, 10.5],  yaw: S,        pitch: -0.15, dauer: 5, text: "Balkon mit Parkblick." },
    { raum: "wohnen",   pos: [5.4, 8.0],   yaw: W + 0.15, pitch: 0,     dauer: 4, text: "Sofa, TV-Wand und Essbereich dahinter." },
    { raum: "schlafen", pos: [6.3, 2.7],   yaw: O + 0.7,  pitch: 0,     dauer: 4, text: "Schlafzimmer mit Morgensonne." },
    { raum: "bad",      pos: [6.2, 4.7],   yaw: O,        pitch: 0,     dauer: 4, text: "Tageslichtbad mit bodengleicher Dusche." },
    { raum: "wohnen",   pos: [5.2, 8.5],   yaw: N,        pitch: 0,     dauer: 3, text: "Ende der Führung — gehen Sie jetzt frei weiter." },
  ],
};

export function raumZu(id) { return PLAN.raeume.find((r) => r.id === id); }
export function raumAn(x, z) {
  for (const r of PLAN.raeume) { const [x1, z1, x2, z2] = r.rect; if (x >= x1 && x <= x2 && z >= z1 && z <= z2) return r; }
  return null;
}
