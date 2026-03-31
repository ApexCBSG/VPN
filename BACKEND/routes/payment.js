const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Plan = require('../models/Plan');



router.get('/offerings', async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ sortOrder: 1 });
    res.json(plans);
  } catch (err) {
    res.status(500).json({ msg: 'Server error fetching offerings' });
  }
});


router.post('/revenuecat-webhook', async (req, res) => {
  const { event } = req.body;
  
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.REVENUECAT_WEBHOOK_TOKEN}`) {
    return res.status(401).json({ msg: 'Unauthorized' });
  }

  try {
    const { app_user_id, type, expiration_at_ms } = event;
    const user = await User.findById(app_user_id);

    if (!user) {
      console.error(`User not found for RevenueCat ID: ${app_user_id}`);
      return res.status(404).end();
    }

    switch (type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
        user.tier = 'premium';
        user.expiryDate = new Date(expiration_at_ms);
        user.rcUserId = app_user_id;
        break;
      
      case 'EXPIRATION':
      case 'CANCELLATION':
        user.tier = 'free';
        break;
      
      default:
        console.log(`Unhandled RevenueCat event: ${type}`);
    }

    await user.save();
    res.status(200).json({ received: true });

  } catch (err) {
    console.error('RevenueCat Webhook Error:', err);
    res.status(500).json({ msg: 'Internal server error' });
  }
});

module.exports = router;
