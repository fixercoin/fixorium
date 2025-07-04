 const express = require('express');
const app = express();
const WalletScript = require('./wallet');
const mongoose = require('mongoose');

mongoose.connect('mongodb:                                                                          

app.use(express.json());

app.post('//localhost/wallet', { useNewUrlParser: true, useUnifiedTopology: true });

app.use(express.json());

app.post('/create-user', async (req, res) => {
  try {
    const user = await WalletScript.createUser(req.body.username, req.body.password, req.body.email);
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/create-wallet', async (req, res) => {
  try {
    const wallet = await WalletScript.createWallet(req.body.userId);
    res.json(wallet);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

                         

app.listen(3000, () => {
  console.log('// Other API endpoints...

app.listen(3000, () => {
  console.log('Server started on port 3000');
});
