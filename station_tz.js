const fs = require("fs");
const geoTz = require("geo-tz");

const stations = fs.readFileSync("./Amtrak_Stations.geojson", "utf-8");

const stationsJSON = JSON.parse(stations);

let parsedStations = {};

stationsJSON.features.forEach((feature) => {
  let tz = geoTz.find(
    feature.geometry.coordinates[1],
    feature.geometry.coordinates[0]
  );
  parsedStations[feature.properties.code] = tz ?? "Unknown";
});

console.log(geoTz.find(73.1673, 44.0153));
