const express = require('express');
const router = express.Router();
const { connectNode, disconnectNode, preauthNode } = require('../controllers/vpnController');
const { auth } = require('../middlewares/authMiddleware');




router.post('/preauth', auth, preauthNode);
router.post('/connect', auth, connectNode);




router.post('/disconnect', auth, disconnectNode);

module.exports = router;
