const busStopSheets = "https://docs.google.com/spreadsheets/d/1TMpZpGhaBMZ-6WCIt9LFFFgsTzqFgBMBooFbNslSduU/edit#gid=668726526";
const railStationSheets = "https://docs.google.com/spreadsheets/d/1UlWzP01e5s_tS0SH6Nt6yyC8kDTKKS2TXGkWPuzveKA/edit#gid=1317920253";
const luasStopSheets = "https://docs.google.com/spreadsheets/d/1NOVdhw52sINE9jv0vZQmvTMtGgH0PttqAM89yUUrv94/edit#gid=392345518";

function switchTabs(tab, target) {
  const elements = document.querySelectorAll("#front-tabs li");

  elements.forEach((elem) => {
    if (elem.id === tab) {
      elem.classList.add("is-active");
    } else if (elem.classList.contains("is-active")) {
      elem.classList.remove("is-active");
    }
  });

  const panes = document.querySelectorAll(".tab-pane");

  panes.forEach((tabPage) => {
    if (tabPage.id === target) {
      tabPage.style.display = "block";
    } else {
      tabPage.style.display = "none";
    }
  });
}

function getSheetsPromise(sheetsUrl, mode, filter) {
  return new Promise((resolve, reject) => {
    sheetrock({
      url: sheetsUrl,
      query: filter,
      reset: true,
      callback: (error, options, response) => {
        if (!error) {
          resolve(response);
        } else {
          reject(error);
        }
      },
      rowTemplate: (row) => {
        let rowString = `<tr class="clicky-row" data-href="/results.html?mode=${mode}&id=`;

        switch (mode) {
          case "bus":
            rowString += `${row.cellsArray[0]}"><td>${row.cellsArray[0]}</td><td>${row.cellsArray[1]}</td><td>${row.cellsArray[2]}</td></tr>`;
            break;
          case "rail":
            rowString += `${row.cellsArray[0]}"><td>${row.cellsArray[0]}</td><td>${row.cellsArray[1]}</td></tr>`;
            break;
          case "luas":
            rowString += `${row.cellsArray[1]}"><td>${row.cellsArray[0]}</td><td>${row.cellsArray[1]}</td><td>${row.cellsArray[2]}</td></tr>`;
            break;
          default:
        }

        return rowString;
      }
    });
  });
}

function updateTables(type, values) {
  let bodyHTML = values.html;

  if (values.html === "") {
    if (!values.rows) {
      document.querySelector(`#${type}-search-info`).textContent = "No results found.";
      document.querySelector(`#${type}-table`).setAttribute("hidden", "");
      return;
    }

    bodyHTML = `<tr class="clicky-row" data-href="/results.html?mode=${type}&id=`;

    values.rows.forEach((row) => {
      switch (type) {
        case "bus":
          bodyHTML += `${row.cellsArray[0]}"><td>${row.cellsArray[0]}</td><td>${row.cellsArray[1]}</td><td>${row.cellsArray[2]}</td></tr>`;
          break;
        case "rail":
          bodyHTML += `${row.cellsArray[0]}"><td>${row.cellsArray[0]}</td><td>${row.cellsArray[1]}</td></tr>`;
          break;
        case "luas":
          bodyHTML += `${row.cellsArray[2]}"><td>${row.cellsArray[0]}</td><td>${row.cellsArray[1]}</td><td>${row.cellsArray[2]}</td></tr>`;
          break;
        default:
      }
    });
  }

  document.querySelector(`#${type}-search-info`).textContent = "";
  document.querySelector(`#${type}-table-body`).innerHTML = bodyHTML;
  document.querySelector(`#${type}-table`).removeAttribute("hidden");
  document.querySelectorAll(".clicky-row").forEach((row) => {
    row.addEventListener("click", () => {
      window.location = row.dataset.href;
    });
  });
}

function searchBusStops(filter) {
  getSheetsPromise(busStopSheets, "bus", `select A,B,C where lower(B) contains lower('${filter}') or lower(C) ` +
      `contains lower('${filter}') or A contains '${filter}'`)
    .then(values => updateTables("bus", values))
    .catch((error) => {
      document.querySelector("#bus-table").setAttribute("hidden", "");
      document.querySelector("#bus-search-info").textContent = "No results found.";
    });
}

function searchRailStations(filter) {
  getSheetsPromise(railStationSheets, "rail", `select A,B where lower(A) contains lower('${filter}') or lower(B) ` +
      `contains lower('${filter}')`)
    .then(values => updateTables("rail", values))
    .catch((error) => {
      document.querySelector("#rail-table").setAttribute("hidden", "");
      document.querySelector("#rail-search-info").textContent = "No results found.";
    });
}

function searchLuasStops(filter) {
  getSheetsPromise(luasStopSheets, "luas", `select C,A,B where lower(B) contains lower('${filter}') or lower(C) ` +
      `contains lower('${filter}') or lower(A) contains lower('${filter}')`)
    .then(values => updateTables("luas", values))
    .catch((error) => {
      document.querySelector("#luas-table").setAttribute("hidden", "");
      document.querySelector("#luas-search-info").textContent = "No results found.";
    });
}

function listFavourites(mode) {
  localforage.getItem(mode).then((data) => {
    if (data && Object.keys(data).length > 0) {
      let bodyString = "";

      Object.entries(data).forEach((i) => {
        bodyString += `<tr class="clicky-row" data-href="/results.html?mode=${mode}&id=${i[0]}"><td>${i[1][0]}</td><td>${i[1][1]}</td>`;

        if (i[1].length > 2) {
          bodyString += `<td>${i[1][2]}</td>`;
        }

        bodyString += "</tr>";
      });

      document.querySelector(`#${mode}-fav`).innerHTML = bodyString;
    }
  }).then(() => {
    document.querySelectorAll(".clicky-row").forEach((row) => {
      row.addEventListener("click", () => {
        window.location = row.dataset.href;
      });
    });
  });
}

listFavourites("bus");
listFavourites("rail");
listFavourites("luas");

document.querySelectorAll(".columns").forEach(columns => columns.removeAttribute("hidden"));

document.querySelectorAll("#front-tabs li").forEach((tabs) => {
  tabs.onclick = () => {
    switchTabs(tabs.id, tabs.dataset.target);
  };
});

const panes = document.querySelectorAll(".tab-pane");

panes.forEach((pane) => {
  if (!pane.classList.contains("is-active")) {
    pane.style.display = "none";
  }
});

document.querySelector("#bus-search-button").addEventListener("click", () => {
  const filter = document.querySelector("#bus-search-input").value;

  if (filter !== "") {
    searchBusStops(filter);
  }
});

document.querySelector("#bus-search-input").addEventListener("keydown", (e) => {
  if (!e) {
    e = window.event;
  }

  if (e.keyCode === 13) {
    const filter = document.querySelector("#bus-search-input").value;

    if (filter !== "") {
      searchBusStops(filter);
    }
  }
});

document.querySelector("#rail-search-button").addEventListener("click", () => {
  const filter = document.querySelector("#rail-search-input").value;

  if (filter !== "") {
    searchRailStations(filter);
  }
});

document.querySelector("#rail-search-input").addEventListener("keydown", (e) => {
  if (!e) {
    e = window.event;
  }

  if (e.keyCode === 13) {
    const filter = document.querySelector("#rail-search-input").value;

    if (filter !== "") {
      searchRailStations(filter);
    }
  }
});

document.querySelector("#luas-search-button").addEventListener("click", () => {
  const filter = document.querySelector("#luas-search-input").value;

  if (filter !== "") {
    searchLuasStops(filter);
  }
});

document.querySelector("#luas-search-input").addEventListener("keydown", (e) => {
  if (!e) {
    e = window.event;
  }

  if (e.keyCode === 13) {
    const filter = document.querySelector("#luas-search-input").value;

    if (filter !== "") {
      searchLuasStops(filter);
    }
  }
});

document.querySelector("#hero-section").addEventListener("click", () => {
  window.location = "/";
});
