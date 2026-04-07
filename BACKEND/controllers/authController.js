const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const { verificationEmail, passwordResetEmail, welcomeEmail, passwordChangedEmail } = require('../utils/emailTemplates');


const generateToken = (id) => {
  return jwt.sign({ user: { id } }, process.env.JWT_SECRET, { expiresIn: '7d' });
};


exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationTokenExpire = Date.now() + 10 * 60 * 1000; 

    user = new User({ 
      name,
      email, 
      password,
      verificationToken: verificationCode,
      verificationTokenExpire
    });

    await user.save();

    
    try {
      const emailTemplate = verificationEmail(verificationCode);
      await sendEmail({
        email: user.email,
        subject: emailTemplate.subject,
        message: emailTemplate.text,
        html: emailTemplate.html
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

    
    if (user.twoFactorEnabled) {
      return res.json({ mfaRequired: true, userId: user._id });
    }

    const token = generateToken(user.id);
    res.json({ 
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        tier: user.tier
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};


exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: 'There is no user with that email' });
    }

    
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; 

    await user.save();

    
    try {
      const emailTemplate = passwordResetEmail(resetToken);
      await sendEmail({
        email: user.email,
        subject: emailTemplate.subject,
        message: emailTemplate.text,
        html: emailTemplate.html
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

    
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Send confirmation email
    const emailTemplate = passwordChangedEmail();
    await sendEmail({
      email: user.email,
      subject: emailTemplate.subject,
      message: emailTemplate.text,
      html: emailTemplate.html
    }).catch(err => console.error('Password change confirmation email failed:', err));

    res.status(200).json({ msg: 'Password reset success' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};



exports.login2FA = async (req, res) => {
  const { userId, code } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code
    });

    if (!verified) return res.status(400).json({ msg: 'Invalid 2FA code' });

    const token = generateToken(user.id);
    res.json({ token });
  } catch (err) {
    res.status(500).send('Server error');
  }
};



exports.generate2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const secret = speakeasy.generateSecret({ name: `Sentinel Admin (${user.email})` });
    
    
    user.twoFactorSecret = secret.base32;
    await user.save();

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
    res.json({ qrCodeUrl, secret: secret.base32 });
  } catch (err) {
    res.status(500).send('Server error');
  }
};



exports.verifyAndEnable2FA = async (req, res) => {
  const { code } = req.body;
  try {
    const user = await User.findById(req.user.id);
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code
    });

    if (!verified) return res.status(400).json({ msg: 'Invalid verification code' });

    user.twoFactorEnabled = true;
    await user.save();
    res.json({ msg: '2FA enabled successfully' });
  } catch (err) {
    res.status(500).send('Server error');
  }
};
// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).send('Server error');
  }
};

// @desc    Update password
// @route   PUT /api/auth/update-password
// @access  Private
exports.updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    // 1. Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Incorrect current password' });
    }

    // 2. Set new password (will be hashed by pre('save') hook)
    user.password = newPassword;
    await user.save();

    // Send confirmation email
    const emailTemplate = passwordChangedEmail();
    await sendEmail({
      email: user.email,
      subject: emailTemplate.subject,
      message: emailTemplate.text,
      html: emailTemplate.html
    }).catch(err => console.error('Password change confirmation email failed:', err));

    res.json({ msg: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};
