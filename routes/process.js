var express = require('express');
var router = express.Router();

const SteamAPI = require('../public/javascripts/steam-api');

const { fake } = require('./fake');
const { victim } = require('./victim');
const { write } = require('../public/lib/message-writer');

router.post("/start", (req, res, next) => {
    write(res, "Process started");

    SteamAPI.startProcess(
        victim, 
        fake, 
        req.body?.interval,
        res
    );
});

module.exports = router;