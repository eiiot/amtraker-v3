export interface Train {
  routeName: string;
  trainNum: number;
  trainID: string;
  stations: Station[];
  heading: Heading;
  eventCode: string;
  origCode: string;
  originTZ: string[];
  destCode: string;
  destTZ: string[];
  trainState: TrainState;
  velocity: number;
  statusMsg: string;
  createdAt: string;
  updatedAt: string;
  lastValTS: string;
  objectID: number;
}

export enum Heading {
  N = "North",
  NE = "Northeast",
  NW = "Northwest",
  S = "South",
  SE = "Southeast",
  SW = "Southwest",
  E = "East",
  W = "West",
}

export enum TrainState {
  Active = "Active",
  Predeparture = "Predeparture",
}

export interface Station {
  name: string;
  code: string;
  tz: string;
  bus: boolean;
  schArr: string;
  schDep: string;
  arr: string;
  dep: string;
  arrCmnt: string;
  depCmnt: string;
  status: StationStatus;
}

export interface StationMeta {
  name: string;
  code: string;
  tz: string;
  lat: number;
  lon: number;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: number;
  trains: string[];
}

export enum StationStatus {
  Enroute = "Enroute",
  Station = "Station",
  Departed = "Departed",
  Unknown = "Unknown",
}

export interface TrainResponse {
  [key: string]: Train[];
}

export interface StationResponse {
  [key: string]: StationMeta;
}