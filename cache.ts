import { StationResponse, TrainResponse } from "./types/amtraker";

export default class cache {
  trains: TrainResponse;

  constructor() {
    this.trains = {};
    return;
  }

  get(key: string) {
    return this[key];
  }

  setTrains(key: string, data: TrainResponse) {
    this[key] = data;
  }

  setStations(key: string, data: StationResponse) {
    this[key] = data;
  }
}
