// public/status.js — Phase 27 §27l. The standalone status page's only script. Fetches /api/v1/status (the
// public, cached Phase-22 endpoint) and renders it. Degrades gracefully if the API is unreachable: it says so
// rather than showing a blank page. No framework, no dependencies — it loads even when the main app bundle is
// broken. Served from CloudFront as a plain file (script-src 'self', CSP-clean).
(function () {
  "use strict";
  var LABEL = { operational: "Operational", degraded: "Degraded", outage: "Outage", maintenance: "Maintenance" };
  var CLASS = { operational: "ok", degraded: "degraded", outage: "outage", maintenance: "degraded" };

  function worst(services) {
    var order = { operational: 0, maintenance: 1, degraded: 2, outage: 3 };
    return services.reduce(function (acc, s) {
      return (order[s.status] || 0) > (order[acc] || 0) ? s.status : acc;
    }, "operational");
  }

  function setOverall(status, text) {
    document.getElementById("overall-dot").className = "dot " + (CLASS[status] || "");
    document.getElementById("overall-text").textContent = text;
  }

  function render(data) {
    var services = (data && data.services) || [];
    var list = document.getElementById("services");
    list.textContent = "";
    services.forEach(function (s) {
      var li = document.createElement("li");
      var name = document.createElement("span");
      name.className = "name";
      name.textContent = s.name || s.service || "Service";
      var state = document.createElement("span");
      state.className = "state";
      var dot = document.createElement("span");
      dot.className = "dot " + (CLASS[s.status] || "");
      var txt = document.createElement("span");
      txt.textContent = LABEL[s.status] || s.status || "Unknown";
      state.appendChild(dot);
      state.appendChild(txt);
      li.appendChild(name);
      li.appendChild(state);
      list.appendChild(li);
    });

    if (services.length) {
      var overall = worst(services);
      setOverall(overall, overall === "operational" ? "All systems operational" : "Some systems are " + (LABEL[overall] || overall).toLowerCase());
    } else {
      setOverall("operational", "All systems operational");
    }
    document.getElementById("updated").textContent = new Date().toLocaleString();
  }

  fetch("/api/v1/status", { headers: { accept: "application/json" } })
    .then(function (r) { if (!r.ok) throw new Error("status " + r.status); return r.json(); })
    .then(render)
    .catch(function () {
      // The API itself is unreachable — say so honestly instead of a blank page.
      setOverall("degraded", "We can't reach our status service right now");
      document.getElementById("updated").textContent = new Date().toLocaleString();
    });
})();
