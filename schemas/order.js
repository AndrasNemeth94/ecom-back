let mongoose = require("mongoose");

let orderSchema = new mongoose.Schema({
  prodList: Array,
  user :{
    email: String,
    firstName: String,
    lastName: String,
    address: String,
    user_id: String,
  },
  payment: String,
  deliveryType: String,
  note: String,
  totalPrice: Number,
  orderTime: String,
  isDelivered: Boolean,
});

module.exports = mongoose.model("order", orderSchema, "orders");
