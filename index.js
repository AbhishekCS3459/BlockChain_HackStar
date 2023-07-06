const express = require("express");
const mongoose = require("mongoose");
const CryptoBlockModel = require("./model/CryptoBlock");
const dotenv = require("dotenv");
const http = require("http");
const socketIO = require("socket.io");
// Import the package
const WS = require("ws");
const SHA256 = require("crypto-js/sha256");

class CryptoBlock {
  constructor(
    index,
    timestamp,
    dataSeedId,
    qrCodeId,
    priceId,
    companyName,
    precedingHash = ""
  ) {
    this.index = index;
    this.timestamp = timestamp;
    this.dataSeedId = dataSeedId;
    this.qrCodeId = qrCodeId;
    this.priceId = priceId;
    this.companyName = companyName;
    this.precedingHash = precedingHash;
    this.hash = this.computeHash();
    this.nonce = 0;
  }

  computeHash() {
    return SHA256(
      this.index +
        this.precedingHash +
        this.timestamp +
        this.dataSeedId +
        this.qrCodeId +
        this.priceId +
        this.companyName +
        this.nonce
    ).toString();
  }
  
  proofOfWork(difficulty) {
    while (
      this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")
    ) {
      this.nonce++;
      this.hash = this.computeHash();
    }
  }
}

class CryptoBlockchain {
  constructor() {
    this.blockchain = [this.startGenesisBlock()];
    this.difficulty = 4;
    this.blockTime = 30000; // 30 seconds in milliseconds
  }

  startGenesisBlock() {
    return new CryptoBlock(0, Date.now(), "Genesis Block", "", "", "", "0");
  }

  obtainLastBlock() {
    return this.blockchain[this.blockchain.length - 1];
  }

  addNewBlock(newBlock) {
    newBlock.precedingHash = this.obtainLastBlock().hash;
    newBlock.proofOfWork(this.difficulty);
    newBlock.hash = newBlock.computeHash(); // Compute and assign the hash value
    this.blockchain.push(Object.freeze(newBlock));

    const blockTimeDifference =
      Date.now() - parseInt(this.obtainLastBlock().timestamp);
    if (blockTimeDifference < this.blockTime) {
      this.difficulty++;
    } else {
      this.difficulty--;
    }

    // Emit the new block to other nodes in the network
    io.emit("newBlock", newBlock);
  }

  checkChainValidity() {
    for (let i = 1; i < this.blockchain.length; i++) {
      const currentBlock = this.blockchain[i];
      const precedingBlock = this.blockchain[i - 1];
      if (currentBlock.hash !== currentBlock.computeHash()) {
        return false;
      }
      if (currentBlock.precedingHash !== precedingBlock.hash) {
        return false;
      }
    }
    return true;
  }
  async initializeBlockchain() {
    // Fetch the blockchain data from the MongoDB database
    this.blockchain = await CryptoBlockModel.find();
    console.log(this.blockchain);
    // Return the fetched blockchain data
  }
  async verifyProductAuthenticity(qrCodeId) {
    await this.initializeBlockchain(); // Initialize the blockchain with data from the database

    for (let i = 0; i < this.blockchain.length; i++) {
      const currentBlock = this.blockchain[i];
      console.log(currentBlock);

      if (currentBlock.qrCodeId === qrCodeId) {
        return {
          authentic: true,
          dataSeedId: currentBlock.dataSeedId,
          priceId: currentBlock.priceId,
          companyName: currentBlock.companyName,
        };
      }
    }

    return { authentic: false };
  }
}

const app = express();
app.use(express.json());
dotenv.config();
const PORT = process.env.PORT || 4000;
const blockchain = new CryptoBlockchain();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on("connected", () => {
  console.log("Database connection successful");
});


// Create HTTP server and attach socket.io
// const server = http.createServer(app);
// const io = socketIO(server);

// Socket.io```javascript
// io.on("connection", (socket) => {
//   console.log("Node connected: " + socket.id);

//   // Listen for new blocks from other nodes
//   socket.on("newBlock", (newBlock) => {
//     console.log("Received new block from node: " + socket.id);
//     blockchain.addNewBlock(newBlock);
//   });
//   // Handle node disconnection
//   socket.on("disconnect", () => {
//     // Handle node disconnection here
//     console.log("Node disconnected: " + socket.id);
//   });
// });
// Function to get actual addresses of peers from a configuration file
function getPeersFromConfig() {
  // Read the configuration file or fetch the data from the source
  const config = require("./peersConfig.json"); // Example: peersConfig.json

  // Extract the peer addresses from the configuration
  const peers = config.peers;

  // Return the array of peer addresses
  return peers;
}

// Get the actual peer addresses from the configuration
const PEERS = getPeersFromConfig();

// Create HTTP server
const server = http.createServer(app);

// Attach socket.io to the server
const io = socketIO(server);

// Listens for connections
io.on("connection", (socket) => {
  console.log("Node connected: " + socket.id);

  // Listens for messages
  socket.on("message", (message) => {
    // Parse the message from JSON into an object
    const _message = JSON.parse(message);

    switch (_message.type) {
      case "TYPE_HANDSHAKE":
        const nodes = _message.data;

        nodes.forEach((node) => connect(node));

        // We will need to handle more types of messages in the future, so I have used a switch-case.
    }
  });

  // Listen for new blocks from other nodes
  socket.on("newBlock", (newBlock) => {
    console.log("Received new block from node: " + socket.id);
    blockchain.addNewBlock(newBlock);
  });

  // Handle node disconnection
  socket.on("disconnect", () => {
    // Handle node disconnection here
    console.log("Node disconnected: " + socket.id);
  });
});

// Arrays to hold connected and opened sockets and addresses
const opened = [];
const connected = [];

const MY_ADDRESS = "http://localhost:3000"; // Update your address accordingly


// Function to connect to a peer
async function connect(address) {
  // Only connect to the node if we haven't already and it's not our own address
  if (!connected.includes(address) && address !== MY_ADDRESS) {
    const socket = io;

    // Add the socket and address to the opened and connected lists
    if (!opened.find((peer) => peer.address === address)) {
      opened.push({ socket, address });
    }
    if (!connected.includes(address)) {
      connected.push(address);
    }
  }
}

// Connect to prefixed peers
PEERS.forEach((peer) => connect(peer));

app.post("/block", async (req, res) => {
  const { dataSeedId, qrCodeId, priceId, companyName } = req.body;
  if (dataSeedId && qrCodeId && priceId && companyName) {
    const currentTimeMillis = Date.now();
    const currentTimeSeconds = Math.floor(currentTimeMillis / 1000);

    const newBlockData = {
      index: blockchain.blockchain.length,
      timestamp: currentTimeSeconds,
      dataSeedId,
      qrCodeId,
      priceId,
      companyName,
      precedingHash: blockchain.obtainLastBlock().hash,
      hash: "",
      nonce: 0,
    };

    const newBlock = new CryptoBlock(
      newBlockData.index,
      newBlockData.timestamp,
      newBlockData.dataSeedId,
      newBlockData.qrCodeId,
      newBlockData.priceId,
      newBlockData.companyName
    );
    newBlock.proofOfWork(blockchain.difficulty);
    newBlockData.hash = newBlock.computeHash();

    if (blockchain.checkChainValidity()) {
      blockchain.addNewBlock(newBlock);
      const newCryptoBlockModel = new CryptoBlockModel(newBlockData);
      await newCryptoBlockModel.save();
    
      res.json({
        message: "New block added to the blockchain:",
        block: newBlockData,
      });
    } 
    else {
      res
        .status(400)
        .json({ error: "Blockchain is invalid. Cannot add new block." });
    }
  } else {
    res.status(400).json({ error: "Missing data in the request body." });
  }
});

app.get("/blockchain", async (req, res) => {
  const blockchainData = await CryptoBlockModel.find();
  res.json(blockchainData);
});

app.get("/verify/:qrCodeId", async (req, res) => {
  const { qrCodeId } = req.params;
  const verificationResult = await blockchain.verifyProductAuthenticity(
    qrCodeId
  );

  // console.log(qrCodeId);
  res.json(verificationResult);
});
app.get("/", (req, res) => {
  res.send("Hello World!");
});

// Start the server
app.listen(PORT, () => {
  console.log(`Blockchain API is running on port ${PORT}`);
});
