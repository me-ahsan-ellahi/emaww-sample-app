const converter = require("xml-js");
const fileClient = require("fs");
const { createClient } = require("redis");
let xmlPath = null;
let keyFlag = false;

const redisClient = createClient({ url: process.env.REDIS_URL });

redisClient.on("error", (err) => console.log("Redis Client Error: ", err));

(async () => await redisClient.connect())();

const setRedisKey = async (key, value) =>
  await redisClient.set(key, JSON.stringify(value));

if (process.argv.length < 3) {
  console.log("Enter path to config.xml file");

  process.exit();
}

process.argv.slice(2).map((arg) => {
  if (arg.endsWith("xml")) {
    xmlPath = arg;
  } else if (arg === "-v") {
    keyFlag = true;
  }
});

if (xmlPath === null) {
  console.log("Enter valid path to config.xml file");

  process.exit();
}

const xml = fileClient.readFileSync(xmlPath);
const result = converter.xml2js(xml, { compact: true });
const resultData = result.config;

const subdomains = resultData.subdomains.subdomain.map(
  (subdomain) => subdomain._text
);
setRedisKey("subdomains", subdomains);
if (keyFlag) console.log(`Subdomains: ${JSON.stringify(subdomains)}`);

const cookies = resultData.cookies.cookie.map((cookie) => ({
  key: `cookie:${cookie._attributes.name}:${cookie._attributes.host}`,
  value: cookie._text,
}));
cookies.map((cookie) => {
  setRedisKey(cookie.key, cookie.value);
  if (keyFlag) console.log(`${cookie.key}: ${cookie.value}`);
});

redisClient.quit();
