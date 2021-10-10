var express = require('express');
var router = express.Router();

const VictimAccount = require('../public/javascripts/victim-account');
var victim = new VictimAccount();

router.get("/", (req, res, next) => {
    res.json(victim.getInfo());
});

router.get("/getTradeToken", (req, res, next) => {
    victim.getTradeToken()
          .then(response => res.send(response))
          .catch(error => res.status(400).send(error));
});

router.get("/getApiKey", (req, res, next) => {
    victim.getApiKey()
          .then(response => res.send(response))
          .catch(error => res.status(400).send(error));
});

router.put("/refresh", (req, res, next) => {
    victim.refreshInfo()
        .then(response => res.send(response))
        .catch(error => res.status(400).send(error));
});

router.get("/isLoggedIn", (req, res, next) => {
    res.send(victim.isLoggedIn());
});

router.post("/login", (req, res, next) => {
    victim.login(req.body.login, req.body.password, req.body.guard)
          .then(response => res.send(response))
          .catch(error => res.status(400).send(error));
});

router.post("/acceptOffer", (req, res, next) => {
    victim.acceptOffer(req.body.tradeofferid, req.body.partnerID64, req.body.partnerID32)
          .then(response => res.send(response))
          .catch(error => res.status(400).send(error));
});

router.post("/logout", (req, res, next) => {
    victim.logout()
          .then(response => {
              victim = new VictimAccount();
              res.send(response);
          })
          .catch(error => res.status(400).send(error));
});

router.put("/updateName", (req, res, next) => {
    victim.updateName(req.body.name)
          .then(response => res.send(response))
          .catch(error => res.status(400).send(error));
});

router.get("/info", (req, res, next) => {
    victim.getProfileInfo().then(info => res.send(info))
                           .catch(error => res.status(400).send(error));
});

module.exports = { router, victim };