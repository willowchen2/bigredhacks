// Tells the page who is signed in, plus the public client id needed to render the button.
const { getUser } = require("../_session");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    user: await getUser(req),
    clientId: process.env.GOOGLE_CLIENT_ID || null
  });
};
