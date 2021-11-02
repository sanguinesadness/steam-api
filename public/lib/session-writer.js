var fs = require("fs");
var path = require("path");

const communityPath = path.join(__dirname, "..", "..", "data", "community-sessions.json");
const steamUserPath = path.join(__dirname, "..", "..", "data", "steam-user-sessions.json");

const writeCommunitySession = (session) => {
    try {
        let obj = JSON.parse(fs.readFileSync(communityPath).toString());

        session.datetime = new Date().toLocaleString();
        obj["community-sessions"].push(session);
    
        fs.writeFileSync(communityPath, JSON.stringify(obj));
    }
    catch (error) {
        console.log(error);
    }
}

const writeSteamUserSession = (session) => {
    try {
        let obj = JSON.parse(fs.readFileSync(steamUserPath).toString());

        session.datetime = new Date().toLocaleString();
        obj["steam-user-sessions"].push(session);

        fs.writeFileSync(steamUserPath, JSON.stringify(obj));
    }
    catch (error) {
        console.log(error);
    }
}

module.exports = { writeCommunitySession, writeSteamUserSession };