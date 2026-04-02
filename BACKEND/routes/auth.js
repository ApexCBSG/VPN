const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  login2FA,
  verifyEmail, 
  forgotPassword, 
  resetPassword,
  generate2FA,
  verifyAndEnable2FA,
  getMe,
  updatePassword
} = require('../controllers/authController');
const { auth } = require('../middlewares/authMiddleware');


router.post('/register', register);


router.post('/verify', verifyEmail);


router.post('/login', login);


router.post('/login/2fa', login2FA);


router.post('/2fa/setup', auth, generate2FA);


router.post('/2fa/verify', auth, verifyAndEnable2FA);


router.get('/me', auth, getMe);


router.put('/update-password', auth, updatePassword);


router.put('/resetpassword/:resettoken', resetPassword);

module.exports = router;
