// ==UserScript==
// @name         ResetEra GiftHelper
// @version      1.2
// @description  Helper functions for ResetEra's GiftBot posts
// @match        *://*.resetera.com/threads/*
// @match        *://*.resetera.com/conversations/*
// @match        *://*.resetera.com/conversations/add?to=GiftBot*
// @require      http://code.jquery.com/jquery-latest.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.3/underscore-min.js
// @connect      api.steampowered.com
// @connect      steamcommunity.com
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// ==/UserScript==

//Note: this script is based entirely in PeteTNT's script for NeoGAF (https://github.com/petetnt/neogaf-monkeybot). All credit goes to him.

/* global $ GM_info GM_xmlhttpRequest*/
var ownedGames = JSON.parse(localStorage.getItem("giftHelper_steamGameList")) || [];
var lastUpdate = localStorage.getItem("giftHelper_steamGameListUpdatedOn") || "";
var giftBotUrl = "https://www.resetera.com/conversations/add?to=GiftBot&title=entry";
var giftBotPosts = $("[data-author='GiftBot']");
var allPosts = giftBotPosts;
var storeUrl = "http://store.steampowered.com/search/?term=";
var storePageUrl = "http://store.steampowered.com/app/";
var allGames = JSON.parse(localStorage.getItem("giftHelper_steamGameWholeList")) || [];
var lastWholeGameListUpdate = localStorage.getItem("giftHelper_steamGameWholeListUpdatedOn") || "";

/**
 * Sanitizes names of the games
 * @param   {string} name Name of the game
 * @returns {string} sanitized name
 */
function sanitizeName(name) {
    //Note: this will break games with "steam" in its name
    return name.toLowerCase().replace('(steam)', '').replace(/\W+/gi, "");
}

/**
 * Checks if user owns the game on steam
 * @param   {string}  name Name of the game
 * @param   {line}    line Modbot line of the game
 * @returns {boolean} true if owned, false if not
 */
function checkIfOwnedOnSteam(name, line) {
    var owned = ownedGames.indexOf(sanitizeName(name)) !== -1;
    return ownedGames.indexOf(sanitizeName(name)) !== -1 && !/uPlay|\(GoG\)|\(Origin\)|Desura/.test(line);
}

/**
 * Gets a map { appid, sanitizedName } if the game exists on the Steam store
 * @param {string} name - Name of the game
 * @param {string} line - Modbot line of the game
 * @returns {object|boolean|null} - object of { appid, sanitizedName }
 *                                if the game exists on the Steam store,
 *                                false if not a Steam game, null if not found
 */
function getIfOnSteam(name, line) {
    if (/uPlay|\(GoG\)|\(Origin\)|Desura/.test(line)) {
        return false;
    }

    return allGames.find(function findGame(game) {
        return game.sanitizedName === sanitizeName(name);
    });
}

/**
 * Navigate to the PM page for the game you clicked
 * @param {Event} event - Click event
 */
function clickHandler(event) {
    var elem = $(this);
    event.preventDefault();
    localStorage.setItem("giftHelper_raffleLine", elem.data("giftbotline"));
    localStorage.setItem("giftHelper_raffleName", elem.data("giftbotname"));
    if(event.which !== 2){
        window.location.href = giftBotUrl;
    }
}

/**
  * Escape special characters to be able to treat games such as "Cosmic Dust & Rust" with a "&"
  * See: https://stackoverflow.com/questions/784586/ and http://stackoverflow.com/questions/1787322/
  *
  * @param {string} text - text to escape
  * @returns {string} - modified text
  */
function escapeHtml(text) {
    var map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;"
    };

    return text.replace(/[&<>"]/g, function renameChar(m) { return map[m]; });
}

/**
  * Escape single quotes to copy the entirety of the raffle line for a game such as "Penguins Arena: Sedna's World"
  *
  * @param {string} text - text to escape
  * @returns {string} - modified text
  */
function escapeSingleQuote(text) {
    var map = {
        "'": "&apos;"
    };
    return text.replace(/[']/g, function renameChar(m) { return map[m]; });
}

/**
  * From https://stackoverflow.com/a/23326020
  * Global replace, escaping characters in regex
  */

String.prototype.replaceAll = function(s1, s2) {
    return this.replace(new RegExp(s1.replace(/[.^$*+?()[{\|]/g, '\\$&'), 'g'),
                        s2 );
};

/**
 * Matches games from the modpot posts and replaces the markup on the page
 */
function matchGames() {
    allPosts.each(function matcher(idx, elem) {
        var $elem = $(elem);
        var text = $elem.text();
        var takenSpan = $elem.find("span").filter(function (index) {return $(this).css("text-decoration")=="line-through";});
        var taken = takenSpan.get().map(function (elem) {
            var colorSpan = $(elem).find("span");
            $(colorSpan).css("color", "#aaa");
            return elem.innerText.replace('  ', ' ');
        });
        var giveaways = text.match(/^ *(.*\b(?:GB-)\b.*)/gmi);
        var map = {};

        Object.keys(giveaways || {}).forEach(function mapGiveaways(key) {
            var line = giveaways[key].replace('  ', ' ').replace('Click to expand...', '');
            var split = line.split("--");
            var name = split[0].trim();
            var code = split[1].trim();

            //Avoid processing games more than once
            if (map[name]) {
                return;
            }

            var urlToShow = storeUrl + name;

            var game = getIfOnSteam(name, line);
            if (game) {
                /** inside this block we can access the appid of the game with game.appid **/
                urlToShow = storePageUrl + game.appid;
            }

            map[name] = true;

            if (_.contains(taken, line)  || /Won by/.test(line)) {
                $elem.html(
                    $elem.html().replaceAll(
                        escapeHtml(name),
                        "<span class='takenFlag'>&nbsp;CLAIMED &nbsp;&nbsp</span>" +
                        "<span class='takenText'>" + escapeHtml(name) + "</span>"
                    ));
            } else {
                if (checkIfOwnedOnSteam(name, line)) {
                    $elem.html(
                        $elem.html().replaceAll(
                            escapeHtml(name),
                            "<span class='inLibraryFlag'>IN LIBRARY &nbsp;&nbsp</span>" +
                            "<span class='inLibraryText'>" +
                            "<a class='visitSteamStorePageOwnedGame' " +
                            "title='Click me to visit the Steam store page of your game' " +
                            "href='" + urlToShow + "/'>" + escapeHtml(name) + "</a>" + "</span>"
                        ));
                } else {
                    $elem.html(
                        $elem.html().replaceAll(
                            escapeHtml(name),
                            "<a class='sendGiftBotMessage' data-giftbotline='" + escapeSingleQuote(line) + "' " +
                            "title='Click me to message GiftBot' " +
                            "data-giftbotname='" + escapeSingleQuote(name) + "' " +
                            "href='" + giftBotUrl + "'>" +
                            "<span class='sendPMFlag'> MESSAGE &nbsp;&nbsp</span>" +
                            "</a>" +
                            "<span class='sendPMText'>" +
                            "<a class='visitSteamStorePage' " +
                            "title='Click me to visit the Steam store' " +
                            "href='" + urlToShow + "/'>" + escapeHtml(name) + "</a>" +
                            "</span>"
                        ));
                }
            }
        });

        $(elem).replaceWith($elem);

        $("[data-giftbotline]").on("click auxclick", clickHandler);
    });
}

/**
 * Parses owned games from json response
 * @param {object} json - Json response
 */
function parseOwnedGames(json) {
    ownedGames = json.map(function map(game) {
        return sanitizeName(game.name);
    });

    localStorage.setItem("giftHelper_steamGameList", JSON.stringify(ownedGames));
    localStorage.setItem("giftHelper_steamGameListUpdatedOn", new Date().toDateString());
    localStorage.setItem("giftHelper_version", GM_info.script.version); // jshint ignore:line
    matchGames();
}

/*
 * Parses the whole list of Steam games from json response
 * @param {object} json - Json response
 */
function parseAllGames(json) {
    allGames = json.map(function map(game) {
        return {
            appid: game.appid,
            sanitizedName: sanitizeName(game.name)
        };
    });

    localStorage.setItem("giftHelper_steamGameWholeList", JSON.stringify(allGames));
    localStorage.setItem("giftHelper_steamGameWholeListUpdatedOn", new Date().toDateString());
    localStorage.setItem("giftHelper_version", GM_info.script.version); // jshint ignore:line
}

/**
/**
 * Gets the Steam profile name
 * @throws {Error} - Error if prompting fails
 * @returns {String} - Steam Profile Name
 */
function getProfileName() {
    var steamProfileName = localStorage.getItem("giftHelper_steamProfileName");

    if (!steamProfileName) {
        steamProfileName = window.prompt("GiftHelper says: Enter your Steam profile name (the same in your custom url)");

        if (!steamProfileName || steamProfileName === "") {
            throw new Error("Steam profile name cannot be empty or null");
        }

        localStorage.setItem("giftHelper_steamProfileName", steamProfileName);
    }

    return steamProfileName.trim();
}

/**
 * Retrieves steam ID
 */
function getSteamID(callback) {
    var steamProfileName = getProfileName();
    var steamID = localStorage.getItem("giftHelper_steamID64");
    var url = "http://steamcommunity.com/id/" + steamProfileName + "/?xml=1";

    if (steamID) {
        return callback(steamID);
    }

    return GM_xmlhttpRequest({ // eslint-disable-line new-cap
        method: "GET",
        url: url,
        onload: function onLoad(response) {
            var xmlDoc = $.parseXML(response.responseText);
            var $xml = $(xmlDoc);

            steamID = $xml.find("steamID64").text();
            localStorage.setItem("giftHelper_steamID64", steamID);
            return callback(steamID);
        },
        onerror: function onError(err) {
            console.error("GiftHelper - Retrieving SteamID failed." +
                          "Make sure you have correcly entered your Steam profile name");
            console.log(err);
        }
    });
}

/**
 * Gets the API key from localStorage or from user
 */
function getApiKey() {
    var apiKey = localStorage.getItem("giftHelper_steamApiKey");

    if (!apiKey) {
        apiKey = window.prompt("GiftHelper says: Enter your Steam API key");

        if (!apiKey) {
            throw new Error("GiftHelper - Failed to set Steam API key. Please try again");
        }

        localStorage.setItem("giftHelper_steamApiKey", apiKey);
    }

    return apiKey;
}

/**
 * Handles the loading of Steam games
 * @param {string} - SteamID64
 */
function loadOwnedGames(steamID) {
    var apiKey = getApiKey();
    var service = "http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?";
    var params = "key=" + apiKey + "&include_appinfo=1&steamid=" + steamID + "&format=json";
    var url = service + params;

    GM_xmlhttpRequest({ // eslint-disable-line new-cap
        method: "GET",
        url: url,
        onload: function onLoad(response) {
            parseOwnedGames(JSON.parse(response.responseText).response.games);
        },
        onerror: function onError() {
            console.error("GiftHelper - Retrieving Steam Game List failed. Try again later");
        }
    });
}

/**
 * Handles the loading of the whole list of Steam games
 */
function loadAllGames() {
    var url = "http://api.steampowered.com/ISteamApps/GetAppList/v0001/";

    GM_xmlhttpRequest({ // eslint-disable-line new-cap
        method: "GET",
        url: url,
        onload: function onLoad(response) {
            parseAllGames(JSON.parse(response.responseText).applist.apps.app);
        },
        onerror: function onError() {
            console.error("GiftHelper - Retrieving Whole Steam Game List failed. Try again later");
        }
    });
}
/**
/**
 * Find Steam key
 */
function findSteamKey(href){
    const message = $("#messageList")[0];
    const text = $(message).text();
    const giveaways = text.match(/\w{5}\-\w{5}\-\w{5}/);

    giveaways.forEach(function findKey(steamKey) {
        const redeemPage = "<a href=\"https://store.steampowered.com/account/registerkey?key=" + steamKey + "\">" + steamKey + "</a>";
        $(message).html($(message).html().replace(steamKey, redeemPage));
    });
}

/**
 * Initializes GiftHelper
 * @throws {Error} - Error if SteamID doesn't exist
 */
function init() {
    var href = window.location.href;
    var raffleLine = localStorage.getItem("giftHelper_raffleLine");
    var raffleName = localStorage.getItem("giftHelper_raffleName");

    //Run Steam key check if on win response from GiftBot
    if (window.location.pathname.indexOf("conversations/youve-won") > -1) {
        findSteamKey(href);
    }

    getSteamID(function performActions(steamID) {
        if (!steamID) {
            throw new Error("There's no SteamID, aborting...");
        }

        if (window.top === window.self) {
            if (/threads/.test(href) && allPosts.length) {
                if (!allGames.length ||
                    new Date().toDateString() !== lastWholeGameListUpdate ||
                    localStorage.getItem("giftHelper_version") !== GM_info.script.version) {
                    loadAllGames();
                }

                if (!ownedGames.length ||
                    new Date().toDateString() !== lastUpdate ||
                    localStorage.getItem("giftHelper_version") !== GM_info.script.version) {
                    loadOwnedGames(steamID);
                } else {
                    matchGames();
                }

                document.addEventListener("LiveThreadUpdate", function updateLiveThread() {
                    giftBotPosts = $("[data-author='GiftBot']");
                    allPosts = giftBotPosts;
                    matchGames();
                });
            } else if (/conversations/.test(href)) {
                if (raffleLine) {
                    _.delay(function() {$("iframe").contents().find('body').html(raffleLine);}, 200);
                    localStorage.removeItem("giftHelper_raffleLine");
                    localStorage.removeItem("giftHelper_raffleName");
                }
            }
        }

    });
}

init();

/**
 * Sets up the style sheet
 */
(function () { // eslint-disable-line
    var head;
    var style;

    head = document.getElementsByTagName("head")[0];
    style = document.createElement("style");
    style.type = "text/css";
    var inLibraryFlag = ".inLibraryFlag {background: url(' data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAAKCAYAAABi8KSDAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6OUNDNzBFNTUyMUM0MTFFNDk1REVFODRBNUU5RjA2MUYiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6OUNDNzBFNTYyMUM0MTFFNDk1REVFODRBNUU5RjA2MUYiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo5Q0M3MEU1MzIxQzQxMUU0OTVERUU4NEE1RTlGMDYxRiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo5Q0M3MEU1NDIxQzQxMUU0OTVERUU4NEE1RTlGMDYxRiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/Pv3vUKAAAAAlSURBVHjaYvz//z8DsYARpFhISAivjnfv3jGSp3jUGeQ4AyDAADZHNe2nyOBrAAAAAElFTkSuQmCC') no-repeat 4px 4px #4F95BD; left: 0; top: 42px; font-size: 10px; color: #111111; height: 18px; line-height: 19px; padding: 0 0 0 18px; white-space: nowrap; z-index: 5; display: inline-block; width: 60px; margin-right: 5px;} .inLibraryText { opacity: 0.7; }"; // eslint-disable-line
    var sendPMFlag = ".sendPMFlag {background: url('  data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAS0lEQVR4nGNgIAFMZmBg+E8At8AUn8Sj6AxM0TE8is9D5Q4zQAWwKUZW9J8BSQJZMboiFIXIitEV/WeEqSYEmBgYGHYQoY4YNRAAAPorL+vMPrX1AAAAAElFTkSuQmCC') no-repeat 4px 4px #FFA500; left: 0; top: 42px; font-size: 10px; color: #111111; height: 18px; line-height: 19px; padding: 0 0 0 18px; white-space: nowrap; z-index: 5; display: inline-block; width: 60px; margin-right: 5px;} .sendPMText { opacity: 1; } .sendGiftBotMessage{ padding: 0px !important; }"; // eslint-disable-line
    var takenFlag = ".takenFlag {background: url('   data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAAJcEhZcwAACxIAAAsSAdLdfvwAAAAZdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjAuMTczbp9jAAAAfElEQVQoU12OSwqAMAwFvYQg9P43KLhy60oQBEHwMM9MaUpMYDCfkb5J0mpsxmwwR9hxWxkug+IbZfpxY1GMt43SbSwdeopb8b+RH4NCcIkdt8nFLFNDgijG5yiP8RNzppy5iVHy53LmBfFoY8rUe5dPFtVAHnkC7HZJ9QOjA1ppSV8PVQAAAABJRU5ErkJggg==') no-repeat 4px 4px #6B6B6B; left: 0; top: 42px; font-size: 10px; color: #FFFFFF; height: 18px; line-height: 19px; padding: 0 0 0 18px; white-space: nowrap; z-index: 5; display: inline-block; width: 60px; margin-right: 5px;} .takenText { opacity: 0.7; }"; // eslint-disable-line

    style.innerHTML = inLibraryFlag + " " + sendPMFlag + " " + takenFlag;
    head.appendChild(style);
}());
