(function() {
    "use strict";

    window.onload = () => {
        userConnection();
        getCurrencies();
    };
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/service-worker.js").then(function() {
            console.log("Service Worker Registered");
            if (!navigator.serviceWorker.controller) {
                return;
            }
        });
    }

    function userConnection() {
        if (navigator.onLine) {
            snack("Internet is available");
        } else {
            snack("You are offline currency convertion is not real time!!!");
        }
    }

    function snack(text) {
        let x = document.querySelector("#snackbar");
        x.className = "show";
        x.innerHTML = text;
        setTimeout(() => {
            x.className = x.className.replace("show", "");
        }, 3000);
    }

    function loadDropdown(json) {
        let currenciesList = [];
        for (let item in json.results) {
            let currencyName = json.results[item].currencyName;
            currenciesList.push(`${item} (${currencyName})`);
        }
        const selectfrom = document.querySelector("#from");
        for (let value in currenciesList.sort()) {
            selectfrom.options[selectfrom.options.length] = new Option(
                currenciesList[value],
                currenciesList[value]
            );
        }
        const select = document.querySelector("#to");
        for (let value in currenciesList.sort()) {
            select.options[select.options.length] = new Option(
                currenciesList[value],
                currenciesList[value]
            );
        }
    }
    document.querySelector("#convert").addEventListener("click", function() {
        //get api to convert currency
        userConnection();
        convertCurrency();
    });
    function checkDB(query, amt) {
        let transactCheck = db
            .transaction("currencies")
            .objectStore("currencies");
        let countRequest = transactCheck.count();
        countRequest.onsuccess = () => {
            if (countRequest.result !== 0) {
                checkCount = true;
                getData(query, amt);
            }
        };
    }
    let db;
    let checkCount = false;
    function openDatabase(query, amt) {
        if (!navigator.serviceWorker) {
            return Promise.resolve();
        }
        let request = self.indexedDB.open("currency", 1);
        request.onupgradeneeded = event => {
            db = event.target.result;
            let store = db.createObjectStore("currencies", { keyPath: "id" });
            store.createIndex("rate", "id", { unique: true });
        };
        request.onsuccess = function(event) {
            db = event.target.result;
            checkDB(query, amt);
        };
    }

    function getCurrencies() {
        const url = "https://free.currencyconverterapi.com/api/v5/currencies";

        if ("caches" in window) {
            caches.match(url).then(function(response) {
                if (response) {
                    response.json().then(function updateFromCache(json) {
                        loadDropdown(json);
                    });
                }
            });
        }
        // Fetch the latest data.
        fetch(url)
            .then(response => {
                let results = response.json();
                return results;
            })
            .then(json => {
                loadDropdown(json);
                storeData({
                    id: query,
                    rate: val
                });
            })
            .catch(ex => {
                console.log("parsing failed", ex);
            });
    }

    function storeData(data) {
        // If the browser doesn't support service worker,
        let transactStore = db
            .transaction("currencies", "readwrite")
            .objectStore("currencies");
        transactStore.put(data);
        transactStore.onsuccess = () => {
            console.info("[Transaction] ALL DONE!");
        };
    }

    function getData(query, amt) {
        let transactGet = db
            .transaction("currencies")
            .objectStore("currencies");
        let json = transactGet.get(query);
        json.onsuccess = () => {
            try {
                let val = json.result.rate;
                if (val) {
                    let total = val * amt;
                    document.querySelector("#outputAmt").value =
                        Math.round(total * 100) / 100;
                }
            } catch (ex) {
                checkCount = false;
                document.querySelector("#outputAmt").value = 0;
            }
        };
    }

    function convertCurrency() {
        const fromCurrency = document.querySelector("#from").value.substr(0, 3);
        const toCurrency = document.querySelector("#to").value.substr(0, 3);
        let amt = document.querySelector("#amount").value;
        const query = `${fromCurrency}_${toCurrency}`;
        const url = `https://free.currencyconverterapi.com/api/v5/convert?q=${query}`;
        openDatabase(query, amt);
        fetch(url)
            .then(response => {
                let results = response.json();

                return results;
            })
            .then(json => {
                let val = json.results[query].val;
                storeData({
                    id: query,
                    rate: val
                });
                if (checkCount === false) {
                    if (val) {
                        let total = val * amt;
                        document.querySelector("#outputAmt").value =
                            Math.round(total * 100) / 100;
                    }
                }
            })
            .catch(ex => {
                console.log("parsing error", ex);
            });
    }
})();
