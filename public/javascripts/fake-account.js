const SteamCommunity = require("steamcommunity");
const SteamAPI = require("./steam-api");
const SteamConverter = require("./steam-converter");
const MessageMarks = require("../lib/message-marks");

const { writeCommunitySession } = require("../lib/session-writer");
const { getRandomAvatar } = require("../lib/avatar-generator");
const { getRandomName } = require("../lib/name-generator");

var community = new SteamCommunity();

class FakeAccount {
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
        this.ID32 = community.steamID.accountid;
        this.ID64 = SteamConverter.ID32toID64(community.steamID.accountid);

        return new Promise((resolve, reject) => {
            Promise.race([this.refillApiKey(), this.refillTradeToken()])
                   .finally(() => {
                       writeCommunitySession(this.getInfo());
                       resolve(this.getInfo());
                   });
        });
    }

    async login(login, password, guard) {
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
                }, (error, sessionID, cookies, steamguard, oAuthToken) => {
                    if (error) {
                        reject(error);
                    }
                    else {
                        this.data.login = login;
                        this.data.password = password;
                        this.data.guard = guard;
                        this.sessionID = sessionID;
                        this.cookies = cookies;

                        this.refreshInfo().finally(() => resolve({
                            sessionID: sessionID,
                            cookies: cookies
                        }));
                    }
                });
            }
        });
    }

    async isLoggedIn() {
        return new Promise((resolve, reject) => {
            if (community.loggedIn((error, loggedIn) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(loggedIn);
                }
            }));
        });
    }

    async updateName(name) {
        return new Promise((resolve, reject) => {
            community.editProfile({ name }, (error) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(name);
                }
            });
        });
    }

    async setRandomName() {
        return this.updateName(getRandomName());
    }

    async updateAvatar(imgUrl) {
        return new Promise((resolve, reject) => {
            community.uploadAvatar(imgUrl, "jpg", (error, url) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(url);
                }
            })
        });
    }

    async setRandomAvatar() {
        return this.updateAvatar(getRandomAvatar());
    }

    async getTradeToken() {
        return new Promise((resolve, reject) => {
            community.getTradeURL((error, url, token) => {
                if (error) {
                    reject(`Error while requesting Trade Access Token ${MessageMarks.error}`, error);
                }
                else {
                    resolve(token);
                }
            });
        });
    }

    async refillTradeToken() {
        return new Promise((resolve, reject) => {
            this.getTradeToken()
                .then(token => {
                    this.tradeToken = token;
                    resolve(`Trade Access Token refilled ${MessageMarks.success}`);
                })
                .catch(() => reject(`Trade Access Token not refilled ${MessageMarks.error}`));
        });
    }

    async getApiKey(domain) {
        return new Promise((resolve, reject) => {
            community.getWebApiKey(domain || "localhost", (error, key) => {
                if (error) {
                    reject(`Error while requesting Web API Key ${MessageMarks.error}`, error);
                }
                else {
                    resolve(key);
                }
            });
        });
    }

    async refillApiKey() {
        return new Promise((resolve, reject) => {
            this.getApiKey()
                .then(key => {
                    this.apiKey = key;
                    resolve(`Web API Key refilled ${MessageMarks.success}`);
                })
                .catch(() => reject(`Web API Key not refilled ${MessageMarks.error}`));
        });
    }

    async makeOffer(partnerID32, partnerID64, partnerTradeToken, itemsFromThem, itemsFromMe, message) {
        return SteamAPI.makeOffer({
            partnerID64: partnerID64,
            partnerID32: partnerID32,
            tradeToken: partnerTradeToken,
            cookies: this.cookies,
            sessionID: this.sessionID,
            itemsFromMe: itemsFromMe || [],
            itemsFromThem: itemsFromThem || [],
            message: message
        });
    }

    async acceptOffer(tradeOfferID, partnerID64, partnerID32) {
        return SteamAPI.acceptOffer({
            tradeOfferID: tradeOfferID,
            partnerID64: partnerID64,
            partnerID32: partnerID32,
            cookies: this.cookies,
            sessionID: this.sessionID
        });
    }

    reInitCommunity() {
        community = new SteamCommunity();
    }
}

module.exports = FakeAccount 