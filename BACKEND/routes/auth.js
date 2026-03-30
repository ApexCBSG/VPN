const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  verifyEmail, 
  forgotPassword, 
  resetPassword 
} = require('../controllers/authController');

// @route   POST api/auth/register
router.post('/register', register);

// @route   POST api/auth/verify
router.post('/verify', verifyEmail);

// @route   POST api/auth/login
router.post('/login', login);

// @route   POST api/auth/forgotpassword
router.post('/forgotpassword', forgotPassword);

// @route   PUT api/auth/resetpassword/:resettoken
router.put('/resetpassword/:resettoken', resetPassword);

module.exports = router;
