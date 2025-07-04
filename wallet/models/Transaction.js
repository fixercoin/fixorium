 const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  wallet: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet' },
  type: String,
  amount: Number,
  timestamp: Date
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
