let mongoose = require('mongoose');

let productSchema = new mongoose.Schema({
    brandName:String,
    name:String,
    type:String,
    size:Array,
    color:String,
    price:Number,
    amount:Array,
    imgUrl:String,
    description:String,
    newProd:Boolean,
    forSale:Boolean
});

module.exports = mongoose.model("product",productSchema,"products");