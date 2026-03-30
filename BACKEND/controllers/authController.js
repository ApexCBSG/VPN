const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

// @route   POST api/auth/register
exports.register = async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationTokenExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    user = new User({ 
      email, 
      password,
      verificationToken: verificationCode,
      verificationTokenExpire
    });

    await user.save();

    // Send Verification Email
    try {
      await sendEmail({
        email: user.email,
        subject: 'Verify your Sentinel account',
        message: `Your verification code is: ${verificationCode}. It expires in 10 minutes.`,
        html: `<h1>Welcome to Sentinel's Veil</h1><p>Your verification code is: <b>${verificationCode}</b></p>`
      });

      res.status(201).json({ msg: 'Verification code sent to email' });
    } catch (err) {
      console.error(err);
      user.verificationToken = undefined;
      user.verificationTokenExpire = undefined;
      await user.save();
      return res.status(500).json({ msg: 'Email could not be sent' });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @route   POST api/auth/verify
exports.verifyEmail = async (req, res) => {
  const { email, code } = req.body;

  try {
    const user = await User.findOne({
      email,
      verificationToken: code,
      verificationTokenExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ msg: 'Invalid or expired verification code' });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpire = undefined;
    await user.save();

    const payload = { user: { id: user.id } };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, msg: 'Email verified successfully' });
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

// @route   POST api/auth/login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    if (!user.isVerified) {
      return res.status(401).json({ msg: 'Please verify your email first', email: user.email });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const payload = { user: { id: user.id } };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @route   POST api/auth/forgotpassword
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: 'There is no user with that email' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 mins

    await user.save();

    // Send email
    const resetUrl = `sentinel://reset-password/${resetToken}`;
    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please use this token to reset your password: ${resetToken}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password reset token',
        message,
        html: `<p>Use this token to reset your password in the app:</p><h2>${resetToken}</h2>`
      });

      res.status(200).json({ msg: 'Email sent' });
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();
      return res.status(500).json({ msg: 'Email could not be sent' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

// @route   PUT api/auth/resetpassword/:resettoken
exports.resetPassword = async (req, res) => {
  const resetPasswordToken = crypto.createHash('sha256').update(req.params.resettoken).digest('hex');

  try {
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ msg: 'Invalid reset token' });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({ msg: 'Password reset success' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};
