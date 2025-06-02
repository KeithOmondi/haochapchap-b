const express = require("express");
const ErrorHandler = require("./middleware/error");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();

// Enable CORS with credentials for specific origins
// Allow preflight requests for all routes
const corsOptions = {
  origin: ["https://haochapchap-punr.vercel.app", "http://localhost:5173"],
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));


// Increase JSON and URL-encoded body parser limits to 50mb
app.use(express.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// Cookie parser
app.use(cookieParser());

// Basic test route
app.use("/test", (req, res) => {
  res.send("Hello world!");
});

// Load environment variables in development
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({
    path: "config/.env",
  });
}

// Import routes
const user = require("./controller/user");
const shop = require("./controller/shop");
const product = require("./controller/product");
const event = require("./controller/event");
const coupon = require("./controller/coupounCode");
const payment = require("./controller/payment");
const booking = require("./controller/booking");
const conversation = require("./controller/conversation");
const withdraw = require("./controller/withdraw");
const message = require("./controller/message");
const publicReview = require("./controller/publicReview");

// Use routes with prefix
app.use("/api/v2/user", user);
app.use("/api/v2/conversation", conversation);
app.use("/api/v2/booking", booking);
app.use("/api/v2/shop", shop);
app.use("/api/v2/product", product);
app.use("/api/v2/event", event);
app.use("/api/v2/coupon", coupon);
app.use("/api/v2/payment", payment);
app.use("/api/v2/withdraw", withdraw);
app.use("/api/v2/message", message);
app.use("/api/v2/public-review", publicReview);

// Global error handler middleware
app.use(ErrorHandler);

module.exports = app;
