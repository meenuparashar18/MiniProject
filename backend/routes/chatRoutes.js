const express = require('express');
const { chat, writingTools } = require('../controllers/chatController');

const router = express.Router();

router.post('/', chat);
router.post('/writing-tools', writingTools);

module.exports = router;
