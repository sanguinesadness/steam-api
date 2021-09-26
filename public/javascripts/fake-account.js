const SteamCommunity = require("steamcommunity");
const { Converter } = require("./steam");

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
        this.ID64 = Converter.ID32toID64(community.steamID.accountid);

        return new Promise((resolve, reject) => {
            Promise.all([this.getTradeToken(), this.getApiKey()]).then(([token, apiKey]) => {
                this.tradeToken = token;
                this.apiKey = apiKey;

                resolve(this.getInfo());
            }).catch(error => reject(error));
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

    async getTradeToken() {
        return new Promise((resolve, reject) => {
            community.getTradeURL((error, url, token) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(token);
                }
            });
        });
    }

    async getApiKey(domain) {
        return new Promise((resolve, reject) => {
            community.getWebApiKey(domain || "localhost", (error, key) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(key);
                }
            });
        });
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

    reInitCommunity() {
        community = new SteamCommunity();
    }
}

module.exports = FakeAccount 