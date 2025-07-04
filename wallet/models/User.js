 const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  email: String,
  wallet: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet' }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
