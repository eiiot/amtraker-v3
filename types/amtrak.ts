export interface Amtrak {
  type: AmtrakType;
  id: number;
  geometry: Geometry;
  properties: Properties;
}

export interface Geometry {
  type: GeometryType;
  coordinates: number[];
}

export enum GeometryType {
  Point = "Point",
}

export interface Properties {
  OBJECTID: number;
  lon: number | null;
  lat: number | null;
  gx_id: string;
  ViewStn2: null;
  ViewStn1: null;
  Station40: null | string;
  Station39: null | string;
  Station38: null | string;
  Station37: null | string;
  Station36: null | string;
  Station35: null | string;
  Station34: null | string;
  StatusMsg: null | string;
  Station33: null | string;
  Station32: null | string;
  Station31: null | string;
  Station27: null | string;
  Station26: null | string;
  Station25: null | string;
  Station24: null | string;
  Station23: null | string;
  Station22: null | string;
  Station21: null | string;
  Station30: null | string;
  Station29: null | string;
  Station28: null | string;
  Station13: null | string;
  Station12: null | string;
  Station11: null | string;
  Station10: null | string;
  Station9: null | string;
  Station8: null | string;
  Station7: null | string;
  Station6: null | string;
  Station5: null | string;
  Station4: null | string;
  Station3: null | string;
  Station2: null | string;
  Station1: null | string;
  Station20: null | string;
  Station19: null | string;
  Station18: null | string;
  Station17: null | string;
  Station16: null | string;
  Station15: null | string;
  Station14: null | string;
  EventSchDp: null;
  EventSchAr: null;
  Heading: Heading | null;
  LastValTS: string;
  EventTZ: null;
  EventT: null;
  EventDT: null;
  EventCode: null | string;
  DestCode: string;
  OrigCode: string;
  RouteName: string;
  TrainState: TrainState;
  OriginTZ: OriginTZ;
  OrigSchDep: string;
  Aliases: null | string;
  updated_at: string;
  created_at: string;
  CMSID: string;
  ID: number;
  TrainNum: string;
  Velocity: null | string;
  Station41: null;
  Station42: null;
}

export interface RawStation {
  code: string;
  tz: string;
  bus: boolean;
  scharr: string | null;
  schdep: string | null;
  schcmnt: string;
  autoarr: boolean;
  autodep: boolean;
  estarr: string | null;
  estdep: string | null;
  postarr: string | null;
  postdep: string | null;
  postcmnt: string | null;
  estarrcmnt: string | null;
  estdepcmnt: string | null;
}

export enum Heading {
  E = "E",
  N = "N",
  NE = "NE",
  NW = "NW",
  S = "S",
  SE = "SE",
  SW = "SW",
  W = "W",
}

export enum OriginTZ {
  C = "C",
  E = "E",
  P = "P",
}

export enum TrainState {
  Active = "Active",
  Predeparture = "Predeparture",
}

export enum AmtrakType {
  Feature = "Feature",
}
