const mongoose = require("mongoose");

const cryptoBlockSchema = new mongoose.Schema({
  index: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Number,
    required: true,
  },
  dataSeedId: {
    type: String,
    required: true,
    unique: true,
    
  },
  qrCodeId: {
    type: String,
    required: true,
    unique: true,
  },
  priceId: {
    type: String,
    required: true,
  },
  companyName: {
    type: String,
    required: true,
  },
  precedingHash: {
    type: String,
    required: true,
  },
  hash: {
    type: String,
    required: true,
  },
  nonce: {
    type: Number,
    required: true,
  },
});

module.exports = mongoose.model("CryptoBlock", cryptoBlockSchema);
