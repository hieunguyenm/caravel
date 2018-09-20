const busStopSheets = "https://docs.google.com/spreadsheets/d/1TMpZpGhaBMZ-6WCIt9LFFFgsTzqFgBMBooFbNslSduU/edit#gid=668726526";
const railStationSheets = "https://docs.google.com/spreadsheets/d/1UlWzP01e5s_tS0SH6Nt6yyC8kDTKKS2TXGkWPuzveKA/edit#gid=1317920253";
const luasStopSheets = "https://docs.google.com/spreadsheets/d/1NOVdhw52sINE9jv0vZQmvTMtGgH0PttqAM89yUUrv94/edit#gid=392345518";

if (!("fetch" in window)) {
  alert("Your browser is not supported at this time, please use another browser.");
}

const xmlParser = new DOMParser();

function getSheetsPromise(sheetsUrl, filter) {
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
    });
  });
}

function getQueryString(param) {
  const regParam = param.replace(/[[\]]/g, "\\$&");
  const regex = new RegExp(`[?&]${regParam}(=([^&#]*)|&|#|$)`);
  const results = regex.exec(window.location.href);
  if (!results) return null;
  if (!results[2]) return "";
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function fetchBusInfo(id) {
  fetch(`https://data.smartdublin.ie/cgi-bin/rtpi/realtimebusinformation?stopid=${id}&format=json`)
    .then(response => response.text())
    .then((data) => {
      const jsonData = JSON.parse(data);
      const tableBody = document.querySelector("#bus-table-body");

      if (jsonData.errorcode === "0") {
        let bodyString = "";

        jsonData.results.forEach((value) => {
          bodyString += `<tr><td>${value.route}</td><td>${value.destination}</td><td>${value.duetime}</td></tr>`;
        });

        tableBody.innerHTML = bodyString;
        document.querySelector("#bus-div").removeAttribute("hidden");
      } else {
        tableBody.innerHTML = "<tr><td>-</td><td>-</td><td>-</td></tr>";
        document.querySelector("#bus-div").removeAttribute("hidden");
      }
    })
    .catch(error => console.log(error));
}

function fetchRailInfo(id) {
  fetch(`https://corsproxy.nguyenhi.eu/https://api.irishrail.ie/realtime/realtime.asmx/getStationDataByCodeXML?StationCode=${id}`)
    .then(response => response.text())
    .then((data) => {
      let bodyString = "<tr>";
      let doc = xmlParser.parseFromString(data, "text/xml");
      let stationData = doc.getElementsByTagName("objStationData");

      if (stationData.length !== 0) {
        Array.from(stationData).forEach((value) => {
          if (value.children[2].childNodes[0].nodeValue !==
            value.children[6].childNodes[0].nodeValue) {
            bodyString += `<td>${value.children[16].childNodes[0].nodeValue}</td>`;
          } else {
            bodyString += `<td>${value.children[17].childNodes[0].nodeValue}</td>`;
          }

          bodyString += `<td>${value.children[7].childNodes[0].nodeValue} ` +
            `(from ${value.children[6].childNodes[0].nodeValue})</td>` +
            `<td>${value.children[13].childNodes[0].nodeValue}</td></tr>`;
        });
      } else {
        bodyString += "<td>-</td><td>-</td><td>-</td></tr>";
      }

      document.querySelector("#rail-table-body").innerHTML = bodyString;
      document.querySelector("#rail-div").removeAttribute("hidden");
    });
}

function fetchLuasInfo(id) {
  let bodyString = "<tr>";
  fetch(`https://corsproxy.nguyenhi.eu/http://luasforecasts.rpa.ie/xml/get.ashx?action=forecast&stop=${id}&encrypt=false`)
    .then(response => response.text())
    .then((data) => {
      const doc = xmlParser.parseFromString(data, "text/xml");
      Array.from(doc.getElementsByTagName("direction")).forEach((direction) => {
        const directionName = direction.attributes[0].nodeValue;
        Array.from(direction.children).forEach((tram) => {
          bodyString += `<td>${directionName}</td><td>${tram.attributes[1].nodeValue}</td>` +
            `<td>${tram.attributes[0].nodeValue}</td></tr>`;
        });
      });
    })
    .then(() => {
      document.querySelector("#luas-table-body").innerHTML = bodyString;
      document.querySelector("#luas-div").removeAttribute("hidden");
    });
}

document.querySelector("#home").addEventListener("click", () => {
  window.location = "/";
});

document.querySelector(".hero-body").addEventListener("click", () => {
  window.location = "/";
});

const mode = getQueryString("mode");
const id = getQueryString("id");

let favButton = document.querySelector("#is-fav");
let favData = {};
let mainSheets;
let filterString;

switch (mode) {
  case "bus":
    document.querySelector("#breadcrumb-mode").innerHTML = "Dublin Bus";
    mainSheets = busStopSheets;
    filterString = `select A,B,C where A = ${id}`;

    localforage.getItem("bus").then((data) => {
      if (data) {
        favData = data;
      }
    });

    fetchBusInfo(id);
    break;
  case "rail":
    document.querySelector("#breadcrumb-mode").innerHTML = "Irish Rail";
    mainSheets = railStationSheets;
    filterString = `select A,B where lower(A) = lower('${id}')`;

    localforage.getItem("rail").then((data) => {
      if (data) {
        favData = data;
      }
    });

    fetchRailInfo(id);
    break;
  case "luas":
    document.querySelector("#breadcrumb-mode").innerHTML = "LUAS";
    mainSheets = luasStopSheets;
    filterString = `select C,A,B where lower(B) contains lower('${id}')`;

    localforage.getItem("luas").then((data) => {
      if (data) {
        favData = data;
      }
    });

    fetchLuasInfo(id);
    break;
  default:
}

localforage.getItem(mode).then((data) => {
  if (data && data[id.toUpperCase()]) {
    favButton.innerHTML = "Remove from favourites";
    favButton.classList.replace("is-info", "is-danger");
  }
});

document.querySelector("#breadcrumb-id").innerHTML = id.toUpperCase();

favButton.addEventListener("click", () => {
  if (favButton.classList.contains("is-info")) {
    getSheetsPromise(mainSheets, filterString).then((res) => {
        let index = res.rows.length > 1 ? 1 : 0;
        let arr = [
          res.rows[index].cellsArray[0],
          res.rows[index].cellsArray[1]
        ];

        if (mode === "bus" || mode === "luas") {
          arr.push(res.rows[index].cellsArray[2]);
        }

        favData[id.toUpperCase()] = arr;
        localforage.setItem(mode, favData);
      })
      .then(() => {
        favButton.innerHTML = "Remove from favourites";
        favButton.classList.replace("is-info", "is-danger");
      });
  } else if (favButton.classList.contains("is-danger")) {
    delete favData[id.toUpperCase()];
    favButton.innerHTML = "Add to favourites";
    favButton.classList.replace("is-danger", "is-info");
    localforage.setItem(mode, favData);
  }
});
