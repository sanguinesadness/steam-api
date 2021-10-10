var express = require('express');
var router = express.Router();

const SteamAPI = require('../public/javascripts/steam-api');

const { fake } = require('./fake');
const { victim } = require('./victim');

router.post("/start", (req, res, next) => {
    res.send("Process started");
    SteamAPI.startProcess(victim, fake, req.body?.interval, req.body?.fake_avatar, req.body?.fake_name);
});

module.exports = router;