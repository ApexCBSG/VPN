const express = require('express');
const router = express.Router();
const { connectNode, disconnectNode } = require('../controllers/vpnController');
const auth = require('../middlewares/authMiddleware');

// @route   POST api/vpn/connect
// @desc    Register a peer on a VPN node and get config
// @access  Private
router.post('/connect', auth, connectNode);

// @route   POST api/vpn/disconnect
// @desc    Remove a peer from a VPN node
// @access  Private
router.post('/disconnect', auth, disconnectNode);

module.exports = router;
