const express = require('express');
const { stats } = require('../controllers/statsController');

const router = express.Router();

router.get('/stats', stats);

module.exports = router;
