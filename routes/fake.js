var express = require('express');
var router = express.Router();

const FakeAccount = require('../public/javascripts/fake-account');
var fake = new FakeAccount();

router.get("/", async (req, res, next) => {
    res.json(fake.getInfo());
});

router.get("/getTradeToken", (req, res, next) => {
    fake.getTradeToken()
          .then(response => res.send(response))
          .catch(error => res.status(400).send(error));
});

router.get("/getApiKey", (req, res, next) => {
    fake.getApiKey()
          .then(response => res.send(response))
          .catch(error => res.status(400).send(error));
});

router.get("/isLoggedIn", (req, res, next) => {
    fake.isLoggedIn()
          .then(response => res.send(response))
          .catch(error => res.status(400).send(error));
});

router.post("/login", (req, res, next) => {
    fake.login(req.body.login, req.body.password, req.body.guard)
          .then(response => res.send(response))
          .catch(error => res.status(400).send(error));
});

router.post("/acceptOffer", (req, res, next) => {
    fake.acceptOffer(req.body.tradeofferid, req.body.partnerID64, req.body.partnerID32)
        .then(response => res.send(response))
        .catch(error => res.status(400).send(error));
});

router.put("/refresh", (req, res, next) => {
    fake.refreshInfo()
        .then(response => res.send(response))
        .catch(error => res.status(400).send(error));
});

router.put("/updateName", (req, res, next) => {
    fake.updateName(req.body.name)
          .then(response => res.send(response))
          .catch(error => res.status(400).send(error));
});

router.put("/updateAvatar", (req, res, next) => {
    fake.updateAvatar(req.body.url)
          .then(response => res.send(response))
          .catch(error => res.status(400).send(error));
});

router.post("/setRandomProfile", (req, res, next) => {
    fake.setRandomProfile()
        .then(() => res.send(200))
        .catch(error => res.status(400).send(error));
});

router.post("/logout", (req, res, next) => {
    if (fake.isLoggedIn()) {
        fake.logout();
        fake = new FakeAccount();
        res.send("Successfully Logged Out");
    }
    else {
        res.status(400).send("Already Logged Out. Cannot Log Out again");
    }
})

module.exports = { router, fake };