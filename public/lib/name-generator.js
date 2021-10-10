const names = [
    "人blessed人 1000-7",
    "zxc king 5-3 pos or jungle suffered",
    "throw down your tears suffered",
    "hate damaged",
    "weak ༒スdying as a lifestyleス༒",
    "通eternal despair通 mode:",
    "hollow 9 y.o. スdeathス",
    "zxczxc clown blessed",
    "はno brainは dead inside",
    "no brain グsadグ broken",
    "broken 12 y.o.",
    "kill me weak abandoned",
    "影anti social影 hollow",
    "マblessedマ ♕death♕"
];

const getRandomName = () => {
    return names[Math.floor(Math.random() * names.length)];
}

module.exports = { getRandomName };