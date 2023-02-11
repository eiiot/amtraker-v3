import * as crypto from "crypto-js";
import * as fs from "fs";
import * as moment from "moment-timezone";
import * as schedule from "node-schedule";

import { Amtrak, RawStation } from "./types/amtrak";
import {
  Train,
  Station,
  StationStatus,
  TrainResponse,
  StationResponse,
} from "./types/amtraker";

import { trainNames } from "./data/trains";
import * as stationMetaData from "./data/stations";
import cache from "./cache";

const trainUrl =
  "https://maps.amtrak.com/services/MapDataService/trains/getTrainsData";
const stationUrl =
  "https://maps.amtrak.com/services/MapDataService/stations/trainStations";
const sValue = "9a3686ac";
const iValue = "c6eb2f7f5c4740c1a2f708fefd947d39";
const publicKey = "69af143c-e8cf-47f8-bf09-fc1f61e5cc33";
const masterSegment = 88;

const amtrakerCache = new cache();

const decrypt = (content, key) => {
  return crypto.AES.decrypt(
    crypto.lib.CipherParams.create({
      ciphertext: crypto.enc.Base64.parse(content),
    }),
    crypto.PBKDF2(key, crypto.enc.Hex.parse(sValue), {
      keySize: 4,
      iterations: 1e3,
    }),
    { iv: crypto.enc.Hex.parse(iValue) }
  ).toString(crypto.enc.Utf8);
};

const fetchTrainsForCleaning = async () => {
  const response = await fetch(trainUrl);
  const data = await response.text();

  const mainContent = data.substring(0, data.length - masterSegment);
  const encryptedPrivateKey = data.substr(
    data.length - masterSegment,
    data.length
  );
  const privateKey = decrypt(encryptedPrivateKey, publicKey).split("|")[0];

  return JSON.parse(decrypt(mainContent, privateKey)).features;
};

const fetchStationsForCleaning = async () => {
  const response = await fetch(stationUrl);
  const data = await response.text();

  const mainContent = data.substring(0, data.length - masterSegment);
  const encryptedPrivateKey = data.substr(
    data.length - masterSegment,
    data.length
  );
  const privateKey = decrypt(encryptedPrivateKey, publicKey).split("|")[0];
  return JSON.parse(decrypt(mainContent, privateKey)).StationsDataResponse
    .features;
};

const now = new Date();
const year = now.getFullYear();
let dst_start = new Date(year, 2, 14);
let dst_end = new Date(year, 10, 7);
dst_start.setDate(14 - dst_start.getDay()); // adjust date to 2nd Sunday
dst_end.setDate(7 - dst_end.getDay()); // adjust date to the 1st Sunday

const isDST = Number(now >= dst_start && now < dst_end);

const parseDate = (badDate: string | null, code: string | null) => {
  if (badDate == null || code == null) return null;

  //first is standard time, second is daylight savings
  const offsets = {
    "America/New_York": ["-05:00", "-04:00"],
    "America/Detroit": ["-05:00", "-04:00"],
    "America/Chicago": ["-06:00", "-05:00"],
    "America/Denver": ["-07:00", "-06:00"],
    "America/Phoenix": ["-07:00", "-07:00"],
    "America/Los_Angeles": ["-08:00", "-07:00"],
    "America/Boise": ["-07:00", "-06:00"],
    "America/Toronto": ["-05:00", "-04:00"],
    "America/Indiana/Indianapolis": ["-05:00", "-04:00"],
    "America/Kentucky/Louisville": ["-05:00", "-04:00"],
    "America/Vancouver": ["-08:00", "-07:00"],
  };

  const timeZone = stationMetaData.timeZones[code] ?? "";

  try {
    const dateArr = badDate.split(" ");
    let MDY = dateArr[0].split("/").map((num) => Number(num));
    let HMS = dateArr[1].split(":").map((num) => Number(num));

    if (dateArr.length == 3 && dateArr[2] == "PM") {
      HMS[0] += 12; //adds 12 hour difference for time zone
    }

    const month = MDY[0].toString().padStart(2, "0");
    const date = MDY[1].toString().padStart(2, "0");
    const year = MDY[2].toString().padStart(4, "0");

    const hour = HMS[0].toString().padStart(2, "0");
    const minute = HMS[1].toString().padStart(2, "0");
    const second = HMS[2].toString().padStart(2, "0");

    return `${year}-${month}-${date}T${hour}:${minute}:${second}${offsets[timeZone][isDST]}`;
  } catch (e) {
    console.log("Couldn't parse date:", badDate, code);
    return null;
  }
};

const generateCmnt = (
  scheduledDate: string,
  actualDate: string,
  code: string
) => {
  let parsedScheduledDate = parseDate(scheduledDate, code);
  let parsedActualDate = parseDate(actualDate, code);
  let earlyOrLate = moment(parsedScheduledDate).isBefore(parsedActualDate)
    ? "Late"
    : "Early";

  let diff = moment(parsedActualDate).diff(parsedScheduledDate);

  let duration = moment.duration(diff);
  let hrs = duration.hours(),
    mins = duration.minutes();

  let string =
    (hrs > 0 ? Math.abs(hrs) + " Hours, " : "") +
    (Math.abs(mins) + " Minutes ");

  if (mins < 5 && earlyOrLate === "Late") {
    return "On Time";
  } else {
    return string + earlyOrLate;
  }
};

const parseRawStation = (rawStation: RawStation) => {
  let status: StationStatus;
  let arr: string;
  let dep: string;
  let arrCmnt: string;
  let depCmnt: string;

  if (rawStation.estarr == null && rawStation.postarr == null) {
    // is this the first station
    if (rawStation.postdep != null) {
      // if the train has departed
      //console.log("has departed first station");
      status = StationStatus.Departed;
      dep = parseDate(rawStation.postdep, rawStation.code);
      depCmnt = generateCmnt(
        rawStation.schdep,
        rawStation.postdep,
        rawStation.code
      );
    } else {
      // if the train hasn't departed
      //console.log("has not departed first station");
      status = StationStatus.Station;
      dep = parseDate(rawStation.estdep, rawStation.code);
      depCmnt = generateCmnt(
        rawStation.schdep,
        rawStation.estdep,
        rawStation.code
      );
    }
  } else if (rawStation.postarr == null) {
    // is this the last station
    if (rawStation.postarr != null) {
      // if the train has arrived
      //console.log("has arrived last station");
      status = StationStatus.Station;
      arr = parseDate(rawStation.postarr, rawStation.code);
      arrCmnt = generateCmnt(
        rawStation.scharr,
        rawStation.postarr,
        rawStation.code
      );
    } else {
      // if the train is enroute
      //console.log("enroute to last station");
      status = StationStatus.Enroute;
      arr = parseDate(rawStation.estarr, rawStation.code);
      arrCmnt = generateCmnt(
        rawStation.scharr,
        rawStation.estarr,
        rawStation.code
      );
    }
  } else {
    // for all other stations
    if (rawStation.estarr != null && rawStation.estdep != null) {
      // if the train is enroute
      //console.log("enroute");
      status = StationStatus.Enroute;
      arr = parseDate(rawStation.estarr, rawStation.code);
      dep = parseDate(rawStation.estdep, rawStation.code);
      arrCmnt = generateCmnt(
        rawStation.scharr ?? rawStation.schdep,
        rawStation.estarr,
        rawStation.code
      );
      depCmnt = generateCmnt(
        rawStation.schdep,
        rawStation.estdep,
        rawStation.code
      );
    } else if (rawStation.postarr != null && rawStation.estdep != null) {
      // if the train has arrived but not departed
      //console.log("not departed");
      status = StationStatus.Station;
      arr = parseDate(rawStation.postarr, rawStation.code);
      dep = parseDate(rawStation.estdep, rawStation.code);
      arrCmnt = generateCmnt(
        rawStation.scharr ?? rawStation.schdep,
        rawStation.postarr,
        rawStation.code
      );
      depCmnt = generateCmnt(
        rawStation.schdep,
        rawStation.estdep,
        rawStation.code
      );
    } else if (rawStation.postdep != null || rawStation.postcmnt != null) {
      // if the train has departed
      //console.log("has departed");
      status = StationStatus.Departed;
      arr = parseDate(rawStation.postarr, rawStation.code);
      dep = parseDate(rawStation.postdep, rawStation.code);
      arrCmnt = generateCmnt(
        rawStation.scharr ?? rawStation.schdep,
        rawStation.postarr,
        rawStation.code
      );
      depCmnt = generateCmnt(
        rawStation.schdep,
        rawStation.postdep,
        rawStation.code
      );
    } else {
      console.log("wtf goin on??????");
      console.log(rawStation);
    }
  }

  return {
    name: stationMetaData.stationNames[rawStation.code],
    code: rawStation.code,
    tz: stationMetaData.timeZones[rawStation.code],
    bus: rawStation.bus,
    schArr:
      parseDate(rawStation.scharr, rawStation.code) ??
      parseDate(rawStation.schdep, rawStation.code),
    schDep:
      parseDate(rawStation.schdep, rawStation.code) ??
      parseDate(rawStation.scharr, rawStation.code),
    arr: arr ?? dep,
    dep: dep ?? arr,
    arrCmnt: arrCmnt ?? depCmnt,
    depCmnt: depCmnt ?? arrCmnt,
    status: status,
  } as Station;
};

const updateTrains = async () => {
  let stations: StationResponse = {};
  console.log("Updating trains...");
  fetchStationsForCleaning()
    .then((stationData) => {
      stationData.forEach((station) => {
        amtrakerCache.setStation(station.properties.Code, {
          name: stationMetaData.stationNames[station.properties.Code],
          code: station.properties.Code,
          tz: stationMetaData.timeZones[station.properties.Code],
          lat: station.properties.lat,
          lon: station.properties.lon,
          address1: station.properties.Address1,
          address2: station.properties.Address2,
          city: station.properties.City,
          state: station.properties.State,
          zip: station.properties.Zipcode,
          trains: [],
        });
      });

      fetchTrainsForCleaning()
        .then((amtrakData) => {
          let trains: TrainResponse = {};

          amtrakData.forEach((property) => {
            let rawTrainData = property.properties;
            //console.log(property)

            let rawStations: Array<RawStation> = [];

            for (let i = 1; i < 41; i++) {
              let station = rawTrainData[`Station${i}`];
              if (station == undefined) {
                continue;
              } else {
                try {
                  let rawStation = JSON.parse(station);
                  if (rawStation.code === "CBN") continue;
                  rawStations.push(rawStation);
                } catch (e) {
                  console.log("Error parsing station:", e);
                  continue;
                }
              }
            }

            let stations = rawStations.map((station) => {
              const result = parseRawStation(station);

              if (result.code === "" && rawTrainData.TrainNum == 0) {
                //whats debugging? lol
                console.log(station);
                console.log(result);
              }

              return result;
            });

            if (stations.length === 0) {
              console.log(
                "No stations found for train:",
                rawTrainData.TrainNum
              );
              return;
            }

            let train: Train = {
              routeName: trainNames[+rawTrainData.TrainNum]
                ? trainNames[+rawTrainData.TrainNum]
                : rawTrainData.RouteName,
              trainNum: +rawTrainData.TrainNum,
              trainID: `${+rawTrainData.TrainNum}-${new Date(
                stations[0].schDep
              ).getDate()}`,
              lat: property.geometry.coordinates[1],
              lon: property.geometry.coordinates[0],
              trainTimely: (
                stations.find(
                  (station) => station.code === rawTrainData.EventCode
                ) || { arrCmnt: "Unknown" }
              ).arrCmnt,
              stations: stations,
              heading: rawTrainData.Heading ? rawTrainData.Heading : "N",
              eventCode: rawTrainData.EventCode
                ? rawTrainData.EventCode
                : stations[0].code,
              origCode: rawTrainData.OrigCode,
              originTZ: stationMetaData.timeZones[rawTrainData.OrigCode],
              destCode: rawTrainData.DestCode,
              destTZ: stationMetaData.timeZones[rawTrainData.DestCode],
              trainState: rawTrainData.TrainState,
              velocity: +rawTrainData.Velocity,
              statusMsg:
                stations.filter(
                  (station) =>
                    !station.arr &&
                    !station.dep &&
                    station.code ===
                      (rawTrainData.EventCode
                        ? rawTrainData.EventCode
                        : stations[0].code)
                ).length > 0
                  ? "SERVICE DISRUPTION"
                  : rawTrainData.StatusMsg,
              createdAt: parseDate(
                rawTrainData.created_at,
                rawTrainData.EventCode
              )
                ? parseDate(rawTrainData.created_at, rawTrainData.EventCode)
                : stations[0].schDep,
              updatedAt: parseDate(
                rawTrainData.updated_at,
                rawTrainData.EventCode
              )
                ? parseDate(rawTrainData.updated_at, rawTrainData.EventCode)
                : stations[0].schDep,
              lastValTS: parseDate(
                rawTrainData.LastValTS,
                rawTrainData.EventCode
              )
                ? parseDate(rawTrainData.LastValTS, rawTrainData.EventCode)
                : stations[0].schDep,
              objectID: rawTrainData.OBJECTID,
            };

            trains[rawTrainData.TrainNum] = trains[rawTrainData.TrainNum] || [];
            trains[rawTrainData.TrainNum].push(train);
          });

          amtrakerCache.setTrains(trains);
          console.log("set trains cache");
        })
        .catch((e) => {
          console.log("Error fetching train data:", e);
        });
    })
    .catch((e) => {
      console.log("Error fetching station data:", e);
    });
};

updateTrains();

schedule.scheduleJob("*/3 * * * *", updateTrains);

Bun.serve({
  port: 80,
  fetch(request) {
    let url = request.url.split("http://0.0.0.0")[1];

    if (url.startsWith("/v2")) {
      url = url.replace("/v2", "/v3");
    }

    if (url === "/") {
      return new Response(
        "Welcome to the Amtreker API! Docs should be available at /docs, if I remembered to add them..."
      );
    }

    if (url === "/docs") {
      return Response.redirect("https://amtrak.piemadd.com", 302);
    }

    if (url === "/v3") {
      return Response.redirect("/v3/trains", 301);
    }

    if (url.startsWith("/v3/trains")) {
      const trainNum = url.split("/")[3];

      const trains = amtrakerCache.getTrains();

      if (trainNum === undefined) {
        console.log("all trains");
        return new Response(JSON.stringify(trains), {
          headers: {
            "Access-Control-Allow-Origin": "*", // CORS
            "content-type": "application/json",
          },
        });
      }

      console.log("train num", trainNum);

      if (trainNum.split("-").length === 2) {
        const trainsArr = trains[trainNum.split("-")[0]];

        if (trainsArr == undefined) {
          return new Response(JSON.stringify([]), {
            headers: {
              "Access-Control-Allow-Origin": "*", // CORS
              "content-type": "application/json",
            },
          });
        }

        for (let i = 0; i < trainsArr.length; i++) {
          if (trainsArr[i].trainID === trainNum) {
            return new Response(
              JSON.stringify({ [trainNum.split("-")[0]]: [trainsArr[i]] }),
              {
                headers: {
                  "Access-Control-Allow-Origin": "*", // CORS
                  "content-type": "application/json",
                },
              }
            );
          }
        }

        return new Response(JSON.stringify([]), {
          headers: {
            "Access-Control-Allow-Origin": "*", // CORS
            "content-type": "application/json",
          },
        });
      }

      if (trains[trainNum] == null) {
        return new Response(JSON.stringify([]), {
          headers: {
            "Access-Control-Allow-Origin": "*", // CORS
            "content-type": "application/json",
          },
        });
      }

      return new Response(
        JSON.stringify({
          [trainNum]: trains[trainNum],
        }),
        {
          headers: {
            "Access-Control-Allow-Origin": "*", // CORS
            "content-type": "application/json",
          },
        }
      );
    }

    if (url.startsWith("/v3/stations")) {
      const stationCode = url.split("/")[3];
      const stations = amtrakerCache.getStations();

      if (stationCode === undefined) {
        console.log("stations");
        return new Response(JSON.stringify(stations), {
          headers: {
            "Access-Control-Allow-Origin": "*", // CORS
            "content-type": "application/json",
          },
        });
      }

      if (stations[stationCode] == null) {
        return new Response(JSON.stringify([]), {
          headers: {
            "Access-Control-Allow-Origin": "*", // CORS
            "content-type": "application/json",
          },
        });
      }

      return new Response(
        JSON.stringify({
          [stationCode]: stations[stationCode],
        }),
        {
          headers: {
            "Access-Control-Allow-Origin": "*", // CORS
            "content-type": "application/json",
          },
        }
      );
    }

    return new Response("Not found", {
      status: 404,
    });
  },
});
