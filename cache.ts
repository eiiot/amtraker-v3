import { StationMeta, StationResponse, Train, TrainResponse } from "./types/amtraker";
import * as fs from "fs";

export default class cache {
  trains: TrainResponse;
  stations: StationResponse;

  constructor() {
    this.trains = {};
    this.stations = {};
    return;
  }

  getTrains() {
    return this.trains;
  }

  getStation(code: string) {
    return this.stations[code];
  }

  getStations() {
    return this.stations;
  }

  setTrains(data: TrainResponse) {
    fs.writeFileSync('cache.json', JSON.stringify(data, null, 2));

    Object.keys(data).forEach((key) => {
      data[key].forEach((train) => {
        train.stations.forEach((station) => {
          const stationData = this.getStation(station.code);
          //console.log(stationData)

          if (stationData && !stationData.trains.includes(train.trainID)) {
            stationData.trains.push(train.trainID);
          }

          this.setStation(station.code, stationData);
        })
      })
    })

    this.trains = data;
  }

  setStation(code: string, data: StationMeta) {
    console.log('setting', code)
    this.stations[code] = data;
  }

  setStations(data: StationResponse) {
    this.stations = data;
  }
}
