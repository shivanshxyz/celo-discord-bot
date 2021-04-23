"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const web3_1 = __importDefault(require("web3"));
require("dotenv").config();
const ethers = require("ethers");
const bip39 = require("bip39");
const QRCode = require("qrcode");
const fs = require("fs");
const QRContractKit = require("@celo/contractkit");
const QR_FILE = "images/filename.png";
const QR_COLOR = "#42d689";
const QR_BACKGROUND = "#0000";
const QR_REQUEST_PAY_10 = "celo://wallet/pay?address=0x7d247aadeade1b2f9e2066182e1fa6723ba366df&displayName=user";
/**
 *  Constants of faucet and tokens
 *
 */
const AUTHOR = '@aleadorjan';
const TOKEN_DECIMAL = 18n;
const FAUCET_SEND_INTERVAL = 1;
const EMBED_COLOR_PRIMARY = 0x35d07f;
const EMBED_COLOR_SECONDARY = 0xfbcc5c;
const CONSTANT = 10;
const FAUCET_SEND_MSG = "!send";
const FAUCET_BALANCE_MSG = "!balance";
const ADDRESS_LENGTH = 40;
//https://github.com/celo-tools/celo-web-wallet/blob/master/src/erc20.ts
//https://github.com/celo-tools/celo-web-wallet/blob/master/src/consts.ts
const GAS_PRICE = "0x12A05F200";
const GAS = "0x5208";
const TOKEN_NAME = "CELO";
const ADDRESS_PREFIX = "0x";
const BOT_NAME = "Celo Discord Bot";
const BOT_NAME_FOOTER = "A Latam Project";
const URL_WALLET = "https://celowallet.app";
const URL_FAUCET = "https://celo.org/developers/faucet";
const URL_CELO = "https://celo.org";
const URL_SOCIAL_MEDIUM = 'https://medium.com/celoorg';
const URL_SOCIAL_GITHUB = 'https://github.com/celo-org';
const URL_SOCIAL_TWITTER = 'https://twitter.com/CeloOrg';
const URL_SOCIAL_FORUM = 'https://forum.celo.org/';
const URL_SOCIAL_CHAT = 'https://discord.gg/6yWMkgM';
const URL_SOCIAL_YOUTUBE = 'https://youtube.com/channel/UCCZgos_YAJSXm5QX5D5Wkcw';
const URL_SOCIAL_INSTAGRAM = 'https://www.instagram.com/celoorg/';
const URL_SOCIAL_DEFI = 'https://defipulse.com/';
const URL_SOCIAL_LINKEDIN = 'https://www.linkedin.com/company/celoOrg/';
const URL_SOCIAL_TWITCH = 'https://www.twitch.tv/celoorg';
const URL_SOCIAL_REDIT = 'https://www.reddit.com/r/celo/';
const URL_SOCIAL_TELEGRAM = 'https://t.me/celoplatform';
const URL_EXPLORE = "https://alfajores-blockscout.celo-testnet.org";
const URL_DISCORD_INVITE = "https://discord.com/invite/atBpDfqQqX";
const URL_STATUS = "https://alfajores-celostats.celo-testnet.org";
const URL_DISCORD = "https://discord.js.org/";
const CELO_GLYPH_COLOR = "https://i.imgur.com/cvP6lNe.png";
const CELO_GLYPH_COLOR_REVERSE = "https://i.imgur.com/kRfdA0Y.png";
const CELO_LOGO_COLOR = "https://i.imgur.com/QZwffyT.png";
const CELO_LOGO_COLOR_REVERSE = "https://i.imgur.com/z8cwfb1.png";
const CELO_LOGO_MONOCHROME = "https://i.imgur.com/zNTMi1L.png";
const CELO_LOGO_MONOCHROME_REVERSE = "https://i.imgur.com/hAlsUmK.png";
const ABOUT_CELO = "CELO is a utility and governance asset for the Celo community, which has a fixed supply and variable value. With CELO, you can help shape the direction of the Celo Platform.";
const ABOUT_CUSD = "cUSD (Celo Dollars) are a stable asset that follows the US Dollar. With cUSD, you can share money faster, cheaper, and more easily on your mobile phone.";
/*
 *  Params for discord  account configuration
 *
 */
const params = {
    DISCORD_TOKEN: process.env.DISCORD_TOKEN,
    DISCORD_CHANNEL: process.env.DISCORD_CHANNEL,
    RPC_URL: process.env.RPC_URL,
    ACCOUNT_KEY: process.env.ACCOUNT_KEY,
    ACCOUNT_ID: process.env.ACCOUNT_ID,
    TOKEN_COUNT: BigInt(process.env.TOKEN_COUNT || CONSTANT),
};
const web3Api = new web3_1.default(params.RPC_URL);
const kit = QRContractKit.newKitFromWeb3(web3Api);
Object.keys(params).forEach((param) => {
    if (!params[param]) {
        console.log(`Missing ${param} env variables`);
        process.exit(1);
    }
});
let listUsers = {};
/**
 *  Initial server console messages
 *
 */
const client = new discord_js_1.Client();
const receivers = {};
console.log(`Starting bot...`);
console.log(`Connecting web3 to ${params.RPC_URL}...`);
/**
 *  Login user
 *
 */
client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`);
});
/**
 * Returns the approximated remaining time until being able to request tokens again.
 * @param {Date} lastTokenRequestMoment
 */
const nextAvailableToken = (lastTokenRequestMoment) => {
    const msPerMinute = 60 * 1000;
    const msPerHour = msPerMinute * 60;
    const availableAt = lastTokenRequestMoment + FAUCET_SEND_INTERVAL * msPerHour;
    let remain = availableAt - Date.now();
    if (remain < msPerMinute) {
        return `${Math.round(remain / 1000)} second(s)`;
    }
    else if (remain < msPerHour) {
        return `${Math.round(remain / msPerMinute)} minute(s)`;
    }
    else {
        return `${Math.round(remain / msPerHour)} hour(s)`;
    }
};
const deleteQRFile = () => {
    fs.unlinkSync(QR_FILE);
};
const onReceiveMessage = async (msg) => {
    const authorId = msg.author.id;
    const messageContent = msg.content;
    const channelId = msg.channel.id;
    if (messageContent.startsWith(`${FAUCET_SEND_MSG}`)) {
        //uncomment before final version
        /*	if (receivers[authorId] > Date.now() - 3600 * 1000) {
            const errorEmbed = new MessageEmbed()
              .setColor(EMBED_COLOR_ERROR)
              .setTitle(`You already received tokens!`)
              .addField("Remaining time", `You still need to wait ${nextAvailableToken(receivers[authorId])} to receive more tokens`)
              .setFooter("Funds transactions are limited to once per hour");
            msg.channel.send(errorEmbed);
            return;
          }*/
        let address = messageContent.slice(`${FAUCET_SEND_MSG}`.length).trim();
        if (address.startsWith(`${ADDRESS_PREFIX}`)) {
            address = address.slice(`${ADDRESS_PREFIX}`.length);
        }
        if (address.length !== ADDRESS_LENGTH) {
            console.log(address.length);
            const errorEmbed = new discord_js_1.MessageEmbed()
                .setColor(EMBED_COLOR_SECONDARY)
                .setTitle("Invalid address")
                .setFooter("Addresses must follow the correct address format");
            msg.channel.send(errorEmbed);
            return;
        }
        //receivers[authorId] = Date.now(); //restriction for sending a Celo faucet
        const accountBalance = BigInt(await web3Api.eth.getBalance(`0x${address}`));
        const fundsTransactionEmbed = new discord_js_1.MessageEmbed()
            .setColor(EMBED_COLOR_PRIMARY)
            .setTitle("Transaction of funds")
            .addField("Current account balance", `${accountBalance / 10n ** TOKEN_DECIMAL} ${TOKEN_NAME}`)
            .setFooter("Funds transactions are limited to once per hour");
        msg.channel.send(fundsTransactionEmbed);
    }
    if (messageContent.startsWith(`${FAUCET_BALANCE_MSG}`)) {
        let address = messageContent.slice(`${FAUCET_BALANCE_MSG}`.length).trim();
        if (address.startsWith(`${ADDRESS_PREFIX}`)) {
            address = address.slice(`${ADDRESS_PREFIX}`.length);
        }
        if (address.length != `${ADDRESS_LENGTH}`) {
            const errorEmbed = new discord_js_1.MessageEmbed()
                .setColor(EMBED_COLOR_SECONDARY)
                .setTitle("Invalid address")
                .setFooter("Addresses must follow the correct address format");
            msg.channel.send(errorEmbed);
            return;
        }
        const accountBalance = BigInt(await web3Api.eth.getBalance(`0x${address}`));
        const balanceEmbed = new discord_js_1.MessageEmbed()
            .setColor(EMBED_COLOR_PRIMARY)
            .setTitle("Account Balance")
            .addField("Account", `${ADDRESS_PREFIX}${address}`, true)
            .addField("Balance", `${accountBalance / 10n ** TOKEN_DECIMAL} ${TOKEN_NAME}`, true);
        msg.channel.send(balanceEmbed);
    }
};
client.on("message", async (msg) => {
    try {
        if (msg.content === "!help") {
            const exampleEmbed = new discord_js_1.MessageEmbed()
                .setColor(EMBED_COLOR_PRIMARY)
                .setURL(URL_DISCORD)
                .setAuthor("author: " + AUTHOR, CELO_LOGO_COLOR, URL_CELO)
                .setDescription(BOT_NAME)
                .setThumbnail(CELO_GLYPH_COLOR)
                .addFields({
                name: "!balance",
                value: "shows the account balance",
                inline: true,
            }, {
                name: "!balance {address}",
                value: " shows the account balance of a specific {address}",
                inline: true,
            }, { name: "!send", value: "send celo", inline: true }, {
                name: "!qr",
                value: "create a qr with send/receive transactions",
                inline: true,
            }, { name: "!wallet", value: "links to online wallet", inline: true }, { name: "!social", value: "links to social networks", inline: true })
                .addField("!help", "!help", true)
                .setImage(CELO_LOGO_COLOR_REVERSE)
                .setTimestamp()
                .setFooter(BOT_NAME_FOOTER, CELO_LOGO_MONOCHROME);
            msg.channel.send(exampleEmbed);
        }
        if (msg.content === "!social") {
            const socialEmbed = new discord_js_1.MessageEmbed()
                .setColor(EMBED_COLOR_PRIMARY)
                .setURL(URL_DISCORD)
                .setAuthor("author: " + msg.author.username, CELO_LOGO_COLOR, URL_CELO)
                .setDescription(BOT_NAME)
                .setThumbnail(CELO_GLYPH_COLOR)
                .addFields({ name: "blog", value: URL_SOCIAL_MEDIUM, inline: true }, { name: "github", value: URL_SOCIAL_GITHUB, inline: true }, { name: "twitter", value: URL_SOCIAL_TWITTER, inline: true }, { name: "forum", value: URL_SOCIAL_FORUM, inline: true }, { name: "chat", value: URL_SOCIAL_CHAT, inline: true }, { name: "youtube", value: URL_SOCIAL_YOUTUBE, inline: true }, { name: "defi", value: URL_SOCIAL_DEFI, inline: true }, { name: "linkedin", value: URL_SOCIAL_LINKEDIN, inline: true }, { name: "twitch", value: URL_SOCIAL_TWITCH, inline: true }, { name: "redit", value: URL_SOCIAL_REDIT, inline: true }, { name: "telegram", value: URL_SOCIAL_TELEGRAM, inline: true })
                .setTimestamp()
                .setFooter(BOT_NAME_FOOTER, CELO_GLYPH_COLOR_REVERSE);
            msg.channel.send(socialEmbed);
        }
        if (msg.content === "qr") {
            QRCode.toFile(QR_FILE, QR_REQUEST_PAY_10, {
                color: {
                    dark: QR_COLOR,
                    light: QR_BACKGROUND, // transparent background
                },
                scale: 6,
            }, function (err) {
                if (err)
                    throw err;
                console.log("done");
            });
            msg.channel.send({ files: [QR_FILE] });
            setTimeout(deleteQRFile, 3000);
        }
        if (msg.content === "!price") {
            const oneGold = await kit.web3.utils.toWei("1", "ether");
            const exchange = await kit.contracts.getExchange();
            const amountOfcUsd = await exchange.quoteGoldSell(oneGold);
            let convertAmount = amountOfcUsd / 10000000000000000;
            const createPriceEmbed = new discord_js_1.MessageEmbed()
                .setColor(EMBED_COLOR_PRIMARY)
                .addField("1 ETH = ", `${convertAmount} CELO `)
                .setTitle(`ETH Price to CELO`)
                .setURL("https://celoreserve.org")
                .setThumbnail("https://cdn-images-1.medium.com/max/374/1*2W_-Wv6zKPhdQNfaWf3Z0g@2x.png")
                .setFooter("Convert ETH - CELO");
            msg.channel.send(createPriceEmbed);
        }
        if (msg.content === "test") {
            //words can be 12 length according to bip39 std https://docs.celo.org/celo-owner-guide/eth-recovery
            let mnemonic = bip39.generateMnemonic();
            console.log(mnemonic);
            const wallet = ethers.Wallet.fromMnemonic(mnemonic);
            const createPrivateEmbed = new discord_js_1.MessageEmbed()
                .setColor(EMBED_COLOR_PRIMARY)
                .addField("Celo address", `Your account address: ${wallet.address}`, true)
                .addField("Celo address", `Your mnemonic phrase (DO NOT SHARE THIS!!): ${mnemonic}`, true)
                .setTitle(`Welcome to your Celo Account (click here to read more) !`)
                .setURL("https://celo.org")
                .setThumbnail("https://cdn-images-1.medium.com/max/374/1*2W_-Wv6zKPhdQNfaWf3Z0g@2x.png")
                .setFooter("Account created ");
            msg.author.send(createPrivateEmbed);
            msg.reply(msg.author.displayAvatarURL() + " Welcome to the Celo Community !!");
            msg.channel.send(`Welcome: ${msg.author.username}\n ID: ${msg.author.id}`);
            msg.channel.send(`Server name: ${msg.guild.name}\nTotal members of the Celo Community Discord BOT: ${msg.guild.memberCount}`);
            msg.channel.send({ files: ["./images/logo.png"] });
        }
        if (msg.content === "balance") {
            msg.channel.send("pong");
            client.user.setActivity("pong activity", { type: "WATCHING" });
            let goldtoken = await kit.contracts.getGoldToken();
            let stabletoken = await kit.contracts.getStableToken();
            let anAddress = "0x8015A9593036f15F4F151900edB7863E7EbBAaF0";
            let celoBalance = await goldtoken.balanceOf(anAddress);
            let cUSDBalance = await stabletoken.balanceOf(anAddress);
            const balanceEmbed = new discord_js_1.MessageEmbed()
                .setColor(EMBED_COLOR_PRIMARY)
                .setTitle("Account Balance")
                .addField("Celo balance", `${anAddress} CELO balance: ${celoBalance.toString()}`, true)
                .addField("Balance", `${anAddress} cUSD balance: ${cUSDBalance.toString()}`, true);
            msg.channel.send(balanceEmbed);
        }
        if (msg.content === "create") {
            msg.channel.send("creating ..");
            client.user.setActivity("create activity", { type: "COMPETING" });
            //const account = await web3Api.eth.accounts.privateKeyToAccount(process.env.ACCOUNT_KEY)
            let randomAccount = await web3Api.eth.accounts.create();
            const createEmbed = new discord_js_1.MessageEmbed()
                .setColor(EMBED_COLOR_PRIMARY)
                .setTitle("Account Address")
                //.addField("Celo address", `Your account address: ${account.address}`, true)
                .addField("Celo address", `Your account address: ${randomAccount.address}`, true);
            msg.channel.send(createEmbed);
        }
        if (msg.content === "wallet") {
            const exampleEmbed = new discord_js_1.MessageEmbed()
                .setColor(EMBED_COLOR_PRIMARY)
                .setTitle("Some title")
                .setURL(URL_WALLET)
                .setAuthor(msg.author.username, CELO_LOGO_COLOR, URL_CELO)
                .setDescription("Online Wallet")
                .setThumbnail(CELO_GLYPH_COLOR)
                .addFields({ name: "Online Wallet", value: URL_WALLET })
                .addField("Inline field title", "Some value here", true)
                .setImage(CELO_LOGO_COLOR_REVERSE)
                .setTimestamp()
                .setFooter("Some footer text here", CELO_LOGO_MONOCHROME);
            msg.author.send(exampleEmbed);
        }
        if (msg.content === "send") {
            msg.channel.send(`Welcome: ${msg.author.username}\n ID: ${msg.author.id}`);
            const account = await web3Api.eth.accounts.privateKeyToAccount(process.env.ACCOUNT_KEY);
            kit.connection.addAccount(account.privateKey);
            console.log(account.address);
            // 12. Specify recipient Address
            let anAddress = "0x8015A9593036f15F4F151900edB7863E7EbBAaF0";
            let amount = 10;
            let goldtoken = await kit.contracts.getGoldToken();
            let stabletoken = await kit.contracts.getStableToken();
            let celotx = await goldtoken
                .transfer(anAddress, amount)
                .send({ from: account.address });
            let cUSDtx = await stabletoken
                .transfer(anAddress, amount)
                .send({ from: account.address, feeCurrency: stabletoken.address });
            let celoReceipt = await celotx.waitReceipt();
            //console.log(celoReceipt);
            let cUSDReceipt = await cUSDtx.waitReceipt();
            let celoBalance = goldtoken.balanceOf(account.address);
            let cUSDBalance = stabletoken.balanceOf(account.address);
            const sendEmbed = new discord_js_1.MessageEmbed()
                .setColor(EMBED_COLOR_PRIMARY)
                .setTitle("Click Here to view your transaction !! ")
                .addField("Transaction Hash", celoReceipt.transactionHash, true)
                .setURL(`${URL_EXPLORE}` +
                "/tx/" +
                celoReceipt.transactionHash +
                "/token_transfers")
                .addField("CELO Transaction receipt: %o", celoReceipt.toString(), true)
                .addField("cUSD Transaction receipt: %o", cUSDReceipt.toString(), true)
                .addField("Celo balance", `Your new account CELO balance: ${celoBalance.toString()}`)
                .addField("cUSD balance", `Your new account cUSD balance: ${cUSDBalance.toString()}`);
            msg.channel.send(sendEmbed);
        }
        await onReceiveMessage(msg);
    }
    catch (e) {
        msg.reply("ERROR");
        console.log(new Date().toISOString(), "ERROR", e.stack || e);
    }
});
client.login(params.DISCORD_TOKEN);
