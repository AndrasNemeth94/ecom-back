const express = require("express");
const dotenv = require("dotenv").config();
const jwt = require("jsonwebtoken");
const jwt_decode = require("jwt-decode");
const bcryptjs = require("bcryptjs");
const User = require("../schemas/user");
const Order = require("../schemas/order");
const Product = require("../schemas/product");
const router = express.Router();
const nodemailer = require("nodemailer");
const moment = require("moment-timezone");
const mongoose = require("mongoose");
const user = require("../schemas/user");

//DB connection
const encodePW = encodeURIComponent(process.env.uri_pass);
const URI_CONNECT = `mongodb+srv://stockadmin:${encodePW}@cluster0.oartu.mongodb.net/ecom?retryWrites=true&w=majority`;
const secretKey = process.env.secret;
mongoose.connect(URI_CONNECT, {
  useFindAndModify: false,
});

mongoose.connection.once("open", (err) => {
  if (err) {
    console.error("Error while db connection! " + err);
  } else {
    console.log("Connected");
  }
});

const user_mail = process.env.MAIL_USER;
const user_pw = process.env.MAIL_PASSWORD;

//--------SMTP for order notification---------
async function sendNotificationMail(orderModel, prodArrayHtml) {
  try {
    const transport = nodemailer.createTransport({
      host: "smtp.mail.yahoo.com",
      port: 465,
      secure: true,
      auth: {
        user: user_mail,
        pass: user_pw,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
    const htmlTemplate = `<h1>StockAngel Order Notification</h1>
            <h2>Your order has been processed successfully!</h2>
            <h3>Item list:</h3>
            <div>${prodArrayHtml}</div>
            <div>
            <p>time of order: ${orderModel.orderTime}</p>
            <p>payment type: ${orderModel.payment}</p>
            <p>delivery: ${orderModel.deliveryType}</p>
            <p>total: ${orderModel.totalPrice} $</p>
            <p>note: ${orderModel.note} </p>
            </div><br>
            <div>
            <h2>Thank you for ordering, we will deliver your items as soon as possible!</h2>
            </div>
            <small>This is a server-generated e-mail, you do not need to reply</small>`;

    const mailOptions = {
      from: "StockAngel(noreply) <stockangelofficial@yahoo.com>",
      to: orderModel.user.email,
      subject: "StockAngel order notification!",
      text: "Your order has been processed successfully!",
      html: htmlTemplate,
    };

    // verify connection configuration
    transport.verify(function (error, success) {
      if (error) {
        console.log(error);
      } else {
        console.log("Server is ready to take our messages" + success);
      }
    });

    const result = await transport.sendMail(mailOptions);
  } catch (error) {
    console.log("Error! (email): " + error);
    return error;
  }
}

//Sign up POST
router.post("/signup", (req, res) => {
  let userData = req.body;
  let user = new User(userData);

  user.save((err, registratedUser) => {
    if (err) {
      console.error("Error while registration! " + err);
      res
        .status(401)
        .send({ errorType: "err", message: "registration failed!" });
    } else {
      let payload = {
        subject: registratedUser._id,
      };
      let token = jwt.sign(payload, secretKey);
      res.status(200).send({ token });
      console.log("[Sign up POST] : sikeres a regisztráció!");
    }
  });
});

//Login POST
router.post("/login", async (req, res) => {
  const email = req.body.email;
  const pw = req.body.password;

  const user = await User.findOne({ email });
  if (user) {
    const auth = await bcryptjs.compareSync(pw, user.password);
    if (auth) {
      let payload = {
        subject: user._id,
      };
      let token = jwt.sign(payload, secretKey);
      res.status(200).send({ token });
    } else {
      res.status(401).send("Password is missing or incorrect!");
    }
  } else {
    res.status(401).send("Email is missing or incorrect!");
  }
});

//verify token
function verifyToken(req, res, next) {
  let authKey = req.headers.authorization;
  if (!authKey) {
    res.status(401).send("Request is unauthorized!");
  }
  let token = authKey.split(" ")[1];
  if (token === "null") {
    res.status(401).send("Request is unauthorized!");
  }
  let payload = jwt.verify(token, secretKey);
  if (!payload) {
    res.status(401).send("Request is unauthorized!");
  }
  req._id = payload.subject;
  next();
}

//Profile GET
router.get("/profile", verifyToken, async (req, res) => {
  const _id = req._id;
  let profileUser;

  const user = await User.findOne({ _id });
  if (user) {
    profileUser = {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      address: user.address,
      user_id: user._id,
    };
  } else {
    throw Error("User not found!");
  }
  const userOrder = await Order.find({ "user.user_id": _id });
  res.status(200).send([profileUser, userOrder]);
});

//Home GET products
router.get("/homeProd", async (req, res) => {
  try {
    const products = await Product.find({ newProd: true });
    res.send(products);
  } catch (err) {
    throw Error("Cannot find any products!");
  }
});

//Shoes GET
router.get("/shoes", async (req, res) => {
  try {
    const shoes = await Product.find({ type: "shoe" });
    res.send(shoes);
  } catch (err) {
    throw Error("Cannot find any shoes!");
  }
});

//Tshirts GET
router.get("/tshirts", async (req, res) => {
  try {
    const tshirts = await Product.find({ type: "tshirt" });
    res.send(tshirts);
  } catch (err) {
    throw Error("Cannot find any tshirts!");
  }
});

//Sweaters GET
router.get("/sweaters", async (req, res) => {
  try {
    const sweaters = await Product.find({ type: "sweater" });
    res.send(sweaters);
  } catch (err) {
    throw Error("Cannot find any sweaters!");
  }
});

//Order POST
router.post("/order", (req, res) => {
  let orderModel = {
    prodList: req.body.prodList,
    user: {
      email: req.body.user.email,
      firstName: req.body.user.firstName,
      lastName: req.body.user.lastName,
      address: req.body.user.address,
      user_id: req.body.user.user_id,
    },
    payment: req.body.payment,
    deliveryType: req.body.deliveryType,
    note: req.body.note,
    totalPrice: req.body.totalPrice,
    orderTime: moment().format("MMMM Do YYYY, h:mm:ss a").toString(),
    isDelivered: false,
  };

  let order = new Order(orderModel);
  order.save((error) => {
    if (error) {
      res.status(401).send({
        errorType: "error",
        message: "An error has occured while sending your order!",
      });
    } else {
      //email for order notification
      res.json("Your order has been processed!");

      //HTML construction for email
      prodArrayHtml = ``;
      function constructHtml() {
        orderModel.prodList.forEach((el) => {
          prodArrayHtml += `<p>-------------------------</p>
                            <h2> ${el.brandName}</h2>
                            <h3>${el.name}</h3>
                            <p>item size: ${el.size}</p>
                            <p>item color: ${el.color}</p>
                            <p>item price: ${el.price} $</p>
                            <p>item amount: ${el.amount}</p>
                            <p>-------------------------</p>`;
        });
        return prodArrayHtml;
      }
      //sending notification email for user
      try {
        constructHtml();
      } catch (error) {
        return error;
      } finally {
        try {
          sendNotificationMail(orderModel, prodArrayHtml);
        } catch (error) {
          return error;
        }
      }
    }
  });
});
//POST profile change
router.post("/datachange", (req, res) => {
  User.findOne({ email: req.body.email }, (err, user) => {
    if (err) {
      res.status(401).send("Error while searching for the user!");
    } else {
      if (user) {
        let updatedUser = {
          email: req.body.email,
          password: user.password,
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          address: req.body.address,
        };
        User.findOneAndUpdate({ email: req.body.email }, updatedUser, (err) => {
          if (err) {
            res.status(401).send("Error while updating user data!");
          } else {
            res.json("User data has been updated successfully!");
          }
        });
      } else {
        res.status(401).send("Invalid email!");
      }
    }
  });
});

//GET User data
router.get("/userdata", verifyToken, (req, res) => {
  let auth = req.headers.authorization;
  let token = auth.split(" ")[1];
  let decodedToken = jwt_decode(token, { payload: true });

  User.findById({ _id: decodedToken.subject }, (error, user) => {
    if (error) {
      res.status(404).send("Userdetails are not in the database!");
    } else {
      res.status(200).send({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        address: user.address,
        user_id: user._id,
      });
    }
  });
});

router.get("/", (req, res) => {
  res.send(" API works");
});
module.exports = router;
