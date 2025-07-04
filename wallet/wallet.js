 const User = require('https://htmlpreview.github.io/?https://github.com/fixercoin/fixorium/blob/main/wallet/models/User');
const Wallet = require('https://htmlpreview.github.io/?https://github.com/fixercoin/fixorium/blob/main/wallet/models/Wallet');
const Transaction = require('https://htmlpreview.github.io/?https://github.com/fixercoin/fixorium/blob/main/wallet/models/Transaction');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

class WalletScript {
  async createUser(username, password, email) {
    try {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        throw new Error('Username already exists');
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({ username, password: hashedPassword, email });
      await user.save();
      return user;
    } catch (error) {
      console.error(error);
    }
  }

  async createWallet(userId) {
    try {
      const existingWallet = await Wallet.findOne({ user: userId });
      if (existingWallet) {
        throw new Error('Wallet already exists for this user');
      }
      const wallet = new Wallet({ user: userId, balance: 0 });
      await wallet.save();
      const user = await User.findById(userId);
      user.wallet = wallet._id;
      await user.save();
      return wallet;
    } catch (error) {
      console.error(error);
    }
  }

  // Other methods...
}

module.exports = WalletScript;
