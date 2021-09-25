const axios = require("axios");
const qs = require("qs");
const SteamUser = require("steam-user");
const SteamCommunity = require("steamcommunity");
const HTMLParser = require("node-html-parser");
const EResult = require("steam-user/enums/EResult");
const { bcadd, bcsub } = require("locutus/php/bc");

const client = new SteamUser();
const community = new SteamCommunity();

const communityURL = 'https://steamcommunity.com';

class Offers {
    static makeOffer = (options) => {
        let tradeOffer = {
            newversion: true,
            version: 2,
            me: { assets: options.itemsFromMe, currency: [], ready: false },
            them: { assets: options.itemsFromThem, currency: [], ready: false }
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

        return new Promise((resolve, reject) => {
            axios.post(`${communityURL}/tradeoffer/new/send`, qs.stringify(data), config)
                .then(response => {
                    console.log(`Offer ${response.data.tradeofferid} has been created ✓`);
                    resolve(response);
                })
                .catch(error => reject(error));
        });
    }

    static cancelOffer = async (apiKey, offerId) => {
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

    static declineOffer = async (apiKey, offerId) => {
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

    static getTradeOffer = async (apiKey, offerId) => {
        const config = {
            params: {
                key: apiKey,
                tradeofferid: offerId
            }
        };

        return new Promise((resolve, reject) => {
            axios.get("https://api.steampowered.com/IEconService/GetTradeOffer/v1/", config)
                .then(response => resolve(response.data.response.offer))
                .catch(error => reject(error));
        });
    }

    static getActiveTradeOffers = async (apiKey) => {
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

    static startCheckingOffers = async (apiKey, accountIdToSkip) => {
        return new Promise((resolve, reject) => {
            const checkingInterval = setInterval(() => {
                console.log("Checking offers...");

                Offers.getActiveTradeOffers(apiKey)
                    .then(offers => {
                        try {
                            const firstSentOffer = offers.trade_offers_sent ? offers.trade_offers_sent[0] : "";
                            const firstReceivedOffer = offers.trade_offers_received ? offers.trade_offers_received[0] : "";

                            if (firstSentOffer.accountid_other == accountIdToSkip || firstReceivedOffer.accountid_other == accountIdToSkip) {
                                return;
                            }

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
                        catch { }
                    })
                    .catch();
            }, 1000);
        });
    }

    static createTradeAccessToken = async (profileUrl, sessionId, cookies) => {
        return new Promise((resolve, reject) => {
            const config = {
                headers: {
                    Cookie: cookies.join(";"),
                    Host: "steamcommunity.com"
                }
            };

            const data = {
                sessionid: sessionId
            };

            axios.post(`${profileUrl}tradeoffers/newtradeurl`, qs.stringify(data), config)
                 .then(response => resolve(response.data))
                 .catch(error => reject(error));
        });
    }
}

class User {
    static isLoggedOn = () => Boolean(client.steamID);

    static login = async (login, password, guard) => {
        return new Promise((resolve, reject) => {
            if (User.isLoggedOn()) {
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

    static logout = async () => {
        return new Promise((resolve, reject) => {
            try {
                client.logOff();
                
                if (!User.isLoggedOn()) {
                    resolve();
                }
            }
            catch (ex) {
                reject(ex);
            }
        });
    }

    static setUserName = async (name) => {
        return new Promise((resolve, reject) => {
            try {
                client.setPersona(SteamUser.EPersonaState.Online, name);
                resolve();
            }
            catch (ex) {
                reject(ex);
            }
        });
    }

    static obtainUserInfo = async (apiKey, steamId64) => {
        const config = {
            params: {
                key: apiKey,
                steamids: steamId64
            }
        };

        return new Promise((resolve, reject) => {
            axios.get("https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/", config)
                 .then(response => resolve(response.data.response.players[0]))
                 .catch(error => reject(error));
        })
    }

    static getId32 = () => client.steamID.accountid.toString();

    static getId64 = () => Converter.ID32toID64(client.steamID.accountid);
}

class Community {
    static setUserAvatar = async (imgUrl) => {
        return new Promise((resolve, reject) => {
            community.uploadAvatar(imgUrl, "jpg", (err, url) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(url);
                }
            })
        });
    }

    static setUserName = async (name) => {
        return new Promise((resolve, reject) => {
            community.editProfile({ name }, (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(name);
                }
            });
        });
    }

    static isLoggedIn = async () => {
        return new Promise((resolve, reject) => {
            if (community.loggedIn((err, loggedIn) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(loggedIn);              
                }
            }));
        });
    }

    static login = async (login, password, guard) => {
        const isLoggedIn = await this.isLoggedIn();

        return new Promise((resolve, reject) => {
            if (isLoggedIn) {
                reject("Already logged in, cannot log in again");
            }
            else {
                community.login({
                    accountName: login,
                    password: password, 
                    twoFactorCode: guard
                }, (err, sessionID, cookies, steamguard, oAuthToken) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve({ sessionID, cookies, steamguard, oAuthToken });
                    }
                });
            }
        });
    }

    static getTradeAccessToken = async () => {
        return new Promise((resolve, reject) => {
            community.getTradeURL((err, url, token) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(token);
                }
            });
        });
    }
}

class Converter {
    static baseId = "76561197960265728";

    static ID64toID32 = (steamId64) => {
        return bcsub(steamId64, Converter.baseId);
    }
    
    static ID32toID64 = (steamId32) => {
        return bcadd(steamId32, Converter.baseId);
    }
}

class SteamAPIManager {
    static createAPIKey = async (options) => {
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

    static retrieveAPIKey = (domain, sessionID, cookies) => {
        return new Promise((resolve, reject) => {
            SteamAPIManager.getAPIKey(cookies)
                .then(key => resolve(key))
                .catch(() => {
                    SteamAPIManager.createAPIKey({
                        domain: domain,
                        sessionID: sessionID,
                        cookies: cookies
                    }).then(() => {
                        SteamAPIManager.getAPIKey(cookies)
                            .then(key => resolve(key))
                            .catch(err => reject(err));
                    }).catch((err) => reject(err));
                })
        });
    }
    
    static getAPIKey = async (cookies) => {
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
}

module.exports = { Offers, User, Converter, SteamAPIManager, Community };