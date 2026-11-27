// emails/index.js — barrel export for the email HTML templates.
module.exports = {
  awardAlert: require("./awardAlert"),
  expiryWarning: require("./expiryWarning"),
  priceDrop: require("./priceDrop"),
  monthlySummary: require("./monthlySummary"),
  bookingConfirmation: require("./bookingConfirmation"),
};
