import * as stationMetaData from "./data/stations";
import * as moment from "moment-timezone";

const parseDate = (badDate: string, code: string | null) => {
  try {
    let fixedDate = moment(badDate, [
      "MM-DD-YYYY HH:mm:ss",
      "MM-DD-YYY hh:mm:ss A",
    ]).tz(code ? stationMetaData.timeZones[code][0] : "");
    return fixedDate.format();
  } catch (e) {
    console.log("Couldn't parse date");
    return null;
  }
};

console.log(parseDate("7/28/2022 5:08:03 PM", "PHL"));
