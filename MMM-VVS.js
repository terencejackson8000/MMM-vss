Module.register("MMM-VVS", {

  defaults: {
    exampleContent: "",
    endpoint: "https://www.efa-bw.de/trias",
    requestorRef: "",

    originStopPointRef: "",
    destinationStopPointRef: "",

    updateInterval: 60 * 1000,
    numberOfResults: 3,
    includeIntermediateStops: true,

    title: "VVS Trips"
  },

  start() {
    this.trips = [];
    this.error = null;

    this.sendFetch();
    setInterval(() => this.sendFetch(), this.config.updateInterval);
  },
  
  localIsoWithOffset(date = new Date()) {
    const pad = n => String(n).padStart(2, "0");

    const tzOffsetMin = -date.getTimezoneOffset();
    const sign = tzOffsetMin >= 0 ? "+" : "-";
    const hh = pad(Math.floor(Math.abs(tzOffsetMin) / 60));
    const mm = pad(Math.abs(tzOffsetMin) % 60);

    return (
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
      `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
      `.${String(date.getMilliseconds()).padStart(3, "0")}` +
      `${sign}${hh}:${mm}`
    );
  },

  sendFetch() {
    Log.debug("[MMM-VVS] sendFetch");
    const now = this.localIsoWithOffset();
    Log.debug(`[MMM-VVS] ${now}`);
    this.sendSocketNotification("VVS_FETCH", {
      endpoint: this.config.endpoint,
      originStopPointRef: this.config.originStopPointRef,
      destinationStopPointRef: this.config.destinationStopPointRef,
      numberOfResults: this.config.numberOfResults,
      includeIntermediateStops: this.config.includeIntermediateStops,
      requestorRef: this.config.requestorRef,
      departureTime: now,
    });
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "VVS_RESULT") {
      this.trips = payload.trips || [];
      this.error = null;
      this.updateDom();
    }

    if (notification === "VVS_ERROR") {
      this.error = payload.message || "Unknown error";
      this.trips = [];
      this.updateDom();
    }
  },

  getDom() {
    const wrapper = document.createElement("div");

    const title = document.createElement("div");
    title.className = "bright";
    title.innerText = this.config.title;
    wrapper.appendChild(title);

    if (this.error) {
      const err = document.createElement("div");
      err.className = "small dimmed";
      err.innerText = this.error;
      wrapper.appendChild(err);
      return wrapper;
    }

    if (!this.trips.length) {
      const empty = document.createElement("div");
      empty.className = "small dimmed";
      empty.innerText = "No trips";
      wrapper.appendChild(empty);
      return wrapper;
    }

    const list = document.createElement("div");
    list.className = "small";

    for (const t of this.trips) {
      let startTime = t.startEstimatedTime ?? t.startTimetabledTime;
      let endTime = t.endEstimatedTime ?? t.endTimetabledTime;
      const row = document.createElement("div");
      row.style.marginTop = "8px";

      const headline = document.createElement("div");
      headline.className = "bright";
      headline.innerText = `${this.formatTime(startTime)} → ${this.formatTime(endTime)} (${t.durationMinutes ?? "?"} min)`;
      row.appendChild(headline);

      const legs = document.createElement("div");
      legs.className = "dimmed";
      legs.innerText = (t.legs || [])
        .map(l => l.mode === "walk" ? "Walk" : (l.line || l.mode || "PT"))
        .join(" · ");
      row.appendChild(legs);

      list.appendChild(row);
    }

    wrapper.appendChild(list);
    return wrapper;
  },

  formatTime(iso) {
    if (!iso) return "?";
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
})
