const express = require('express');
const router = express.Router();
const Block = require('./models/Block');

router.post('/block', async (req, res) => {
  const block = new Block(req.body);
  await block.save();
  res.status(201).send(block);
});

router.get('/blocks', async (req, res) => {
  const blocks = await Block.find();
  res.send(blocks);
});

module.exports = router;

