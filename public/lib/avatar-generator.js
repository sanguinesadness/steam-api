const avatars = [
    "https://i.pinimg.com/564x/d7/1c/a1/d71ca1d5cd12a7c4b1b9731d564c8f5e.jpg",
    "https://i.pinimg.com/564x/af/92/26/af92261c7db0e4bfbc9425a78d1bce05.jpg",
    "https://i.pinimg.com/564x/a2/3d/41/a23d41f2748a26e2c939316ef7e3f665.jpg",
    "https://i.pinimg.com/236x/2c/a8/e2/2ca8e2e78dad0e08dd62f1158d277225.jpg",
    "https://i.pinimg.com/564x/c2/3c/b9/c23cb9776979a91449456a7c42a0cf9b.jpg",
    "https://i.pinimg.com/564x/a6/45/c8/a645c8e9694cc4ef78eb492590cbc81c.jpg",
    "https://i.pinimg.com/564x/8a/9a/40/8a9a40206fe784ef72de8e77fba21fad.jpg",
    "https://i.pinimg.com/564x/cd/19/01/cd1901cb7e280799c2b27553e113f903.jpg",
    "https://i.pinimg.com/564x/11/fd/65/11fd653a02b383beeca3c5600d31d871.jpg",
    "https://i.pinimg.com/564x/d9/87/8b/d9878b6be5e05e7604307604a824ec45.jpg",
    "https://i.pinimg.com/564x/c7/2e/5a/c72e5a34a77d27fc2074f24fc5acf59e.jpg",
    "https://i.pinimg.com/564x/1c/cc/e1/1ccce1b482063ee0aa921cd7f6ee97f0.jpg",
    "https://i.pinimg.com/564x/4e/32/f0/4e32f0f0d225f7a0473ffda2d0e50c7f.jpg",
    "https://i.pinimg.com/564x/0b/3c/b1/0b3cb1f9ec42a3f48a04d4408ad5a757.jpg",
    "https://i.pinimg.com/564x/0d/37/d3/0d37d39aaa3e5da437ee08a77a6fb65a.jpg",
    "https://i.pinimg.com/564x/28/5f/a6/285fa6d99e9e3bcaeb0b3be5d9a66ed7.jpg",
    "https://i.pinimg.com/564x/91/98/4d/91984d605a984cef234fd2f25d26d188.jpg",
    "https://i.pinimg.com/564x/84/a2/dd/84a2dda57ef329f30487dac92f45b880.jpg"
];

const getRandomAvatar = () => {
    return avatars[Math.floor(Math.random() * avatars.length)];
}

module.exports = { getRandomAvatar };