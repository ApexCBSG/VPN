const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected for seeding...');

    const email = 'admin@gmail.com';
    const password = 'admin123';


    let user = await User.findOne({ email });

    if (user) {
      console.log('Admin user already exists. Updating privileges...');
      user.role = 'admin';
      user.isVerified = true;
      user.password = password;
      await user.save();
    } else {
      console.log('Creating new administrative account...');
      user = new User({
        email,
        password,
        role: 'admin',
        isVerified: true,
        tier: 'premium'
      });
      await user.save();
    }

    console.log('Administrative account initialized successfully.');
    console.log('Email:', email);
    console.log('Role: Administrator');

    process.exit(0);
  } catch (err) {
    console.error('Seeding selection failure:', err);
    process.exit(1);
  }
};

seedAdmin();
