const NodeHelper = require("node_helper");
const request = require("request-promise-native");
const { XMLParser } = require("fast-xml-parser");
const Log = require("logger");

module.exports = NodeHelper.create({
  start() {
    this.parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: false });
    Log.info("node_helper started");
  },

  async socketNotificationReceived(notification, payload) {
    Log.debug("socketNotificationReceived: " + notification);
    if (notification !== "VVS_FETCH") return;

    try {
      const { requestorRef, departureTime, endpoint, originStopPointRef, destinationStopPointRef, numberOfResults, includeIntermediateStops } = payload;
      Log.debug(`VVS_FETCH: ${endpoint} ${originStopPointRef} ${destinationStopPointRef}`);
      if (!endpoint || !originStopPointRef || !destinationStopPointRef) {
        throw new Error("Missing endpoint/originStopPointRef/destinationStopPointRef");
      }

      const tripXml = this.buildTripRequestXml({
        originStopPointRef,
        destinationStopPointRef,
        departureTime: departureTime,
        numberOfResults: numberOfResults,
        requestorRef: requestorRef,
        includeIntermediateStops: includeIntermediateStops ?? true
      });

      const xmlResponse = await this.postXml(endpoint, tripXml);
      Log.debug(`Now extracting trips ${xmlResponse}`);
      const trips = this.extractTrips(xmlResponse);

      this.sendSocketNotification("VVS_RESULT", { trips });
    } catch (err) {
      this.sendSocketNotification("VVS_ERROR", { message: err.message });
    }
  },

  buildTripRequestXml({ requestorRef, originStopPointRef, destinationStopPointRef, departureTime, numberOfResults, includeIntermediateStops }) {
    return `
    <?xml version="1.0" encoding="UTF-8"?>
<Trias version="1.2" xmlns="http://www.vdv.de/trias" xmlns:siri="http://www.siri.org.uk/siri" 
xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.vdv.de/trias ../trias-xsd-v1.1/Trias.xsd">
    <ServiceRequest>
        <RequestTimestamp>${departureTime}</RequestTimestamp>
        <siri:RequestorRef>${requestorRef}</siri:RequestorRef>
        <RequestPayload>
            <TripRequest>
                <Origin>
                    <LocationRef>
                        <StopPointRef>${originStopPointRef}</StopPointRef>
                    </LocationRef>
                    <DepArrTime>${departureTime}</DepArrTime>
                </Origin>
                <Destination>
                    <LocationRef>
                        <StopPointRef>${destinationStopPointRef}</StopPointRef>
                    </LocationRef>
                </Destination>
                <Params>
                    <NumberOfResults>${numberOfResults}</NumberOfResults>
                    <IncludeTrackSections>true</IncludeTrackSections>
                    <IncludeIntermediateStops>true</IncludeIntermediateStops>
                    <IncludeLegProjection>true</IncludeLegProjection>
                    <IncludeFares>true</IncludeFares>
                </Params>
            </TripRequest>
        </RequestPayload>
    </ServiceRequest>
</Trias>`
  },

  async postXml(endpoint, xmlBody) {
    // Node 18+ has global fetch. MagicMirror on older Node might not.
    // If fetch is not available, upgrade Node or add node-fetch.
    if (typeof fetch !== "function") {
      throw new Error("fetch is not available. Use Node 18+ or add node-fetch.");
    }
    Log.debug(`postXml: ${endpoint} ${JSON.stringify(xmlBody)}`);

    try {
      const res = await request({
        method: "POST",
        uri: endpoint,
        headers: {
          "Content-Type": "text/xml; charset=UTF-8",
          "Accept": "text/xml"
        },
        body: xmlBody,
        resolveWithFullResponse: true
      });

      //Log.debug(`postXml response ${res.statusCode} ${JSON.stringify(res.body)}`)

      if (res.statusCode < 200 || res.statusCode >= 300) {
        throw new Error(`HTTP ${res.statusCode}: ${res.body}`);
      }

      return res.body;
    } catch (err) {
      Log.error(`postXml failed ${err.message}`);
      throw err;
    }
  },

  findTripResults(obj, results = []) {
    if (!obj || typeof obj !== "object") return results;

    for (const [key, value] of Object.entries(obj)) {
      if (key === "trias:TripResult") {
        results.push(...(Array.isArray(value) ? value : [value]));
      } else {
        this.findTripResults(value, results);
      }
    }

    return results;
  },

  extractTrips(tripResponseXml) {
    const parsed = this.parser.parse(tripResponseXml);
    const tripResults = this.findTripResults(parsed);

    let beautfiedResults = [];

    for (const tripResult of tripResults) {
      let leg = tripResult['trias:Trip']['trias:TripLeg'];
      let start = leg['trias:TimedLeg']['trias:LegBoard']['trias:StopPointName']['trias:Text'];
      let startTimetabledTime = leg['trias:TimedLeg']['trias:LegBoard']['trias:ServiceDeparture']['trias:TimetabledTime'];
      let startEstimatedTime = leg['trias:TimedLeg']['trias:LegBoard']['trias:ServiceDeparture']['trias:EstimatedTime'];
      let end = leg['trias:TimedLeg']['trias:LegAlight']['trias:StopPointName']['trias:Text'];
      let endTimetabledTime = leg['trias:TimedLeg']['trias:LegAlight']['trias:ServiceArrival']['trias:TimetabledTime'];
      let endEstimatedTime = leg['trias:TimedLeg']['trias:LegAlight']['trias:ServiceArrival']['trias:EstimatedTime'];

      beautfiedResults.push({
        start: start,
        startTimetabledTime: startTimetabledTime,
        startEstimatedTime: startEstimatedTime,
        end: end,
        endTimetabledTime: endTimetabledTime,
        endEstimatedTime: endEstimatedTime,
      })
    }

    Log.debug(`beautfiedResults ${JSON.stringify(beautfiedResults)}`)

    return beautfiedResults;
  },

  // TRIAS durations are often ISO 8601 duration like "PT17M"
  durationToMinutes(duration) {
    if (typeof duration !== "string") return null;
    const match = duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return null;
    const hours = match[1] ? parseInt(match[1], 10) : 0;
    const mins = match[2] ? parseInt(match[2], 10) : 0;
    return hours * 60 + mins;
  }
});
