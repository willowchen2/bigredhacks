const { endSession } = require("../_session");

module.exports = (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  endSession(res);
  res.status(200).json({ ok: true });
};
