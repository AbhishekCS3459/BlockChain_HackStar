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
    this.blockchain.push(newBlock);
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

  verifyProductAuthenticity(qrCodeId) {
    for (let i = 1; i < this.blockchain.length; i++) {
      const currentBlock = this.blockchain[i];
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

  getBlockchainData() {
    return this.blockchain;
  }

  getBlockByIndex(index) {
    return this.blockchain[index];
  }

  getBlockCount() {
    return this.blockchain.length;
  }
}

module.exports = { CryptoBlock, CryptoBlockchain };
