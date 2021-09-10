var express = require("express");
var router = express.Router();

var { login, logout, retrieveAPIKey, isLoggedOn } = require("../public/javascripts/user");
var fs = require("fs");
var path = require("path");

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
                .then(key => state.APIKey = key)
                .finally(() => {
                    updateJSON();
                    res.send(response);
                });
        })
        .catch(error => {
            res.status(401).send(error);
        });
});

router.post("/logout", function (req, res, next) {
    logout().then(() => res.status(200).send("Logged Out"));
})

module.exports = router;