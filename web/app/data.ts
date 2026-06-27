import raw from "../public/data/data.json";

export type RoomType = { id: number; name: string; color: string; count: number };
export type Sample = {
  id: string;
  rooms: number;
  connections: number;
  roomTypes: number[];
  walls: string;
  roomsImg: string;
  graphImg: string;
};
export type SiteData = {
  stats: {
    apartments: number; floors: number; geometries: number;
    trainSamples: number; testSamples: number; statsOver: number;
    avgRooms: number; medianRooms: number;
  };
  roomTypes: RoomType[];
  roomsHistogram: { rooms: number; count: number }[];
  samples: Sample[];
  eval: {
    baseline: null | {
      fid: number; density: number; coverage: number;
      precision: number; recall: number;
    };
    note: string;
  };
};

export const data = raw as SiteData;
export const asset = (p: string) => "/" + p.replace(/^\//, "");
