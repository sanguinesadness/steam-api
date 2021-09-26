const axios = require('axios');
const qs = require('qs');
const SteamConverter = require('./steam-converter');
const HTMLParser = require("node-html-parser");

const apiURL = "https://api.steampowered.com";
const communityURL = 'https://steamcommunity.com';

class SteamAPI {
    static getProfileInfo = async (apiKey, ID64) => {
        const config = {
            params: {
                key: apiKey,
                steamids: ID64
            }
        };

        return new Promise((resolve, reject) => {
            axios.get(`${apiURL}/ISteamUser/GetPlayerSummaries/v2/`, config)
                 .then(response => resolve(response.data.response.players[0]))
                 .catch(error => reject(error));
        })
    }

    static getActiveOffers = async (apiKey) => {
        const config = {
            params: {
                key: apiKey,
                get_sent_offers: 1,
                get_received_offers: 1,
                active_only: 1
            }
        };

        return new Promise((resolve, reject) => {
            axios.get(`${apiURL}/IEconService/GetTradeOffers/v1/`, config)
                .then(response => resolve(response.data.response))
                .catch(error => reject(error));
        });
    }

    static getOfferInfo = async (apiKey, offerID) => {
        const config = {
            params: {
                key: apiKey,
                tradeofferid: offerID
            }
        };

        return new Promise((resolve, reject) => {
            axios.get(`${apiURL}/IEconService/GetTradeOffer/v1/`, config)
                .then(response => resolve(response.data.response.offer))
                .catch(error => reject(error));
        });
    }

    static cancelOffer = async (apiKey, offerId) => {
        const data = {
            key: apiKey,
            tradeofferid: offerId
        };

        return new Promise((resolve, reject) => {
            axios.post(`${apiURL}/IEconService/CancelTradeOffer/v1/`, qs.stringify(data))
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
            axios.post(`${apiURL}/IEconService/DeclineTradeOffer/v1/`, qs.stringify(data))
                .then(response => {
                    console.log(`Offer ${offerId} declined ✓`);
                    resolve(response);
                })
                .catch(error => reject(error));
        });
    }

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
            partner: options.partnerID64 || SteamConverter.ID32toID64(options.partnerID32),
            tradeoffermessage: options.message || "",
            json_tradeoffer: JSON.stringify(tradeOffer),
            captcha: "",
        };

        let query = {
            partner: options.partnerID32 || SteamConverter.ID64toID32(options.partnerID64)
        };

        if (options.tradeToken !== undefined) {
            data.trade_offer_create_params = JSON.stringify({ trade_offer_access_token: options.tradeToken });
            query.token = options.tradeToken;
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

    static getTradeToken = async (profileUrl, sessionID, cookies) => {
        return new Promise((resolve, reject) => {
            const config = {
                headers: {
                    Cookie: cookies.join(";"),
                    Host: "steamcommunity.com"
                }
            };

            const data = {
                sessionid: sessionID
            };

            axios.post(`${profileUrl}tradeoffers/newtradeurl`, qs.stringify(data), config)
                 .then(response => resolve(response.data))
                 .catch(error => reject(error));
        });
    }

    // Creates new Web API Key
    static createAPIKey = async (domain, sessionID, cookies) => {
        return new Promise((resolve, reject) => {
            const data = {
                domain: domain,
                agreeToTerms: "agreed",
                sessionid: sessionID,
                Submit: "Register"
            };
    
            const config = {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Cookie: cookies.join(";")
                }
            }
    
            axios.post(`${communityURL}/dev/registerkey`, qs.stringify(data), config)
                 .then(response => resolve(response))
                 .catch(error => reject(error));
        });
    }   

    // Requests existing Web API Key
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

    // Requests existing Web API Key. If haven't got, Creates new and Requests it again
    static retrieveAPIKey = (domain, sessionID, cookies) => {
        return new Promise((resolve, reject) => {
            this.getAPIKey(cookies)
                .then(key => resolve(key))
                .catch(() => {
                    this.createAPIKey(domain || "localhost", sessionID, cookies)
                        .then(() => {
                            this.getAPIKey(cookies)
                                .then(key => resolve(key))
                                .catch(err => reject(err));
                        })
                        .catch((err) => reject(err));
                })
        });
    }
}

module.exports = SteamAPI;