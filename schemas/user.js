let mongoose = require("mongoose");
const bcryptjs = require("bcryptjs");

let userSchema = new mongoose.Schema({
  email: String,
  password: String,
  firstName: String,
  lastName: String,
  address: String,
});

userSchema.pre("save", async function (next) {
  const salt = await bcryptjs.genSalt(10);
  this.password = await bcryptjs.hashSync(this.password, salt);
  next();
});
module.exports = mongoose.model("user", userSchema, "users");
