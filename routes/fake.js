var express = require('express');
var router = express.Router();

const FakeAccount = require('../public/javascripts/fake-account');
const { victim } = require('./victim');

var fake = new FakeAccount();

router.get("/", (req, res, next) => {
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

router.post("/logout", (req, res, next) => {
    fake.isLoggedIn()
               .then(loggedIn => {
                   if (loggedIn) {
                       fake.reInitCommunity();
                       fake = new FakeAccount();
                       res.send("Successfully Logged Out");
                   }
                   else {
                       res.status(400).send("Already Logged Out. Cannot Log Out again");
                   }
               })
               .catch(error => res.status(400).send(error));
})

module.exports = { router, fake };