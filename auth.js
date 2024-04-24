require("dotenv").config();
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const qs = require("qs");
const https = require("https");

const rejectUnauthorized = {
  https: {
    checkServerIdentity: (host, cert) => {
      console.log(host, cert);
      return true;
    },
  },
  validateStatus: (status) => {
    // Only reject responses with status codes outside the 2xx range
    return status >= 200 && status < 300;
  },
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
}; // Пришлось так сделать из-за ошибок с сертификатом

const getToken = async () => {
  const config = {
    ...rejectUnauthorized,

    method: "post",
    maxBodyLength: Infinity,
    url: "https://ngw.devices.sberbank.ru:9443/api/v2/oauth",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      RqUID: uuidv4(),
      Authorization: `Basic ${process.env.gigachatToken}`,
    },
    data: qs.stringify({
      scope: process.env.gigaScope,
    }),
  };

  try {
    const response = await axios(config);
    const { access_token: accessToken, expires_at: expiresAt } = response.data;
    return { accessToken, expiresAt };
  } catch (error) {
    console.log(error);
  }
};

const giga = async (content = "", system = "") => {
  if (!content) return;

  const token = await getToken();

  if (!token) return console.log("orrer");

  const messages = [];
  if (system) {
    messages.push({ role: "system", content: system });
  }

  const data = JSON.stringify({
    model: "GigaChat",
    messages: messages.concat([
      {
        role: "user",
        content,
      },
    ]),
    temperature: 1,
    top_p: 0.1,
    n: 1,
    stream: false,
    max_tokens: 512,
    repetition_penalty: 1,
    update_interval: 0,
  });

  console.log(messages);

  const config = {
    ...rejectUnauthorized,

    method: "post",
    maxBodyLength: Infinity,
    url: "https://gigachat.devices.sberbank.ru/api/v1/chat/completions",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token.accessToken}`,
      rejectUnauthorized: false,
    },
    data,
  };

  try {
    const response = await axios(config);
    const message = response.data.choices[0].message;
    return message.content;
  } catch (e) {
    console.log(e);
  }
};

module.exports = { getToken, giga };
