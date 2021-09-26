const { bcadd, bcsub } = require("locutus/php/bc");

class Converter {
    static baseId = "76561197960265728";

    static ID64toID32 = (steamId64) => {
        return bcsub(steamId64, this.baseId);
    }
    
    static ID32toID64 = (steamId32) => {
        return bcadd(steamId32, this.baseId);
    }
}

module.exports = Converter;