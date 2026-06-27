export const CSV_COLUMNS: { name: string; meaning: string }[] = [
  { name: "apartment_id", meaning: "Hash id of the apartment" },
  { name: "site_id / building_id", meaning: "Site and building the unit belongs to" },
  { name: "plan_id", meaning: "A whole floor (may hold several apartments)" },
  { name: "floor_id", meaning: "Floor identifier" },
  { name: "unit_id", meaning: "A single apartment = one training example" },
  { name: "area_id", meaning: "Room id (empty for walls/openings)" },
  { name: "unit_usage", meaning: "e.g. RESIDENTIAL" },
  { name: "entity_type", meaning: "area = room · separator = wall · opening = door/window" },
  { name: "entity_subtype", meaning: "e.g. BATHROOM, WALL, DOOR" },
  { name: "geom", meaning: "Geometry as a WKT polygon string" },
  { name: "elevation / height", meaning: "Vertical position and room height (m)" },
  { name: "zoning", meaning: "Zone tag (Zone1…, Structure)" },
  { name: "roomtype", meaning: "Balcony · Bathroom · Bedroom · Corridor · Kitchen · Livingroom · Storeroom · Structure" },
];

export const ENTITY_COUNTS: { type: string; count: number; note: string }[] = [
  { type: "separator", count: 602196, note: "walls" },
  { type: "opening", count: 281320, note: "doors / windows" },
  { type: "area", count: 203330, note: "rooms" },
];

export const V2_FOLDERS: { name: string; content: string }[] = [
  { name: "graph_in", content: "Access graph (input): nodes = zoning_type, edges = door / passage / entrance" },
  { name: "struct_in", content: "(512,512,3) tensor: ch0 = wall mask, ch1/ch2 = world y/x per pixel" },
  { name: "graph_out", content: "Target graph: nodes carry geometry (polygon) + room_type + centroid" },
  { name: "full_out", content: "(512,512,3) model-ready tensor (not a viewable image)" },
];

export const SAMPLE_ROWS: { unit: string; entity: string; subtype: string; roomtype: string; geom: string }[] = [
  { unit: "7300", entity: "area", subtype: "BATHROOM", roomtype: "Bathroom", geom: "POLYGON ((-2.7338 4.0798, -1.7053 4.0798, …))" },
  { unit: "7300", entity: "area", subtype: "LIVING_ROOM", roomtype: "Livingroom", geom: "POLYGON ((5.8279 7.8169, 3.6491 7.8169, …))" },
  { unit: "7300", entity: "separator", subtype: "WALL", roomtype: "Structure", geom: "POLYGON ((10.1120 4.9799, 9.6245 4.9799, …))" },
  { unit: "7300", entity: "separator", subtype: "WALL", roomtype: "Structure", geom: "POLYGON ((-1.1112 6.4521, -1.1112 4.0798, …))" },
  { unit: "7300", entity: "opening", subtype: "DOOR", roomtype: "Structure", geom: "POLYGON ((2.1043 4.0798, 2.9870 4.0798, …))" },
];
