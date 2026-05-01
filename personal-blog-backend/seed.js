// seed.js

// 1. IMPORT NECESSARY MODULES
// We need mongoose to interact with our database.
const mongoose = require('mongoose');
// We need dotenv to load our environment variables from the .env file.
const dotenv = require('dotenv');
// We need our User model to create a new user.
const User = require('./models/userModel');

// 2. CONFIGURE DOTENV
// This loads the variables from your .env file (like MONGO_URI) into process.env
dotenv.config();

// 3. DEFINE THE ADMIN USER'S CREDENTIALS
// It's a good practice to define these at the top.
// IMPORTANT: Change this password to something strong and unique for your project.
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'adi24';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '9785854770';

// 4. THE MAIN SEEDING FUNCTION
const seedAdmin = async () => {
  try {
    // 5. CONNECT TO THE DATABASE
    // We use the MONGO_URI from our environment variables.
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Database connected successfully.');

    // 6. CHECK IF THE ADMIN USER ALREADY EXISTS
    // This makes our script "idempotent" - meaning you can run it multiple times
    // without creating duplicate users.
    const existingAdmin = await User.findOne({ username: ADMIN_USERNAME });

    if (existingAdmin) {
      console.log('Admin user already exists. No action taken.');
      return; // Exit the function if the admin is already there.
    }

    // 7. CREATE AND SAVE THE NEW ADMIN USER
    // If the admin user doesn't exist, we create a new one.
    console.log('Admin user not found. Creating a new one...');
    const adminUser = new User({
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD, // We provide the plain-text password here.
    });

    // When we call .save(), our pre-save middleware in userModel.js will automatically
    // trigger, hashing this plain-text password before it hits the database.
    // This is the magic of Mongoose middleware in action!
    await adminUser.save();

    console.log('----------------------------------------------------');
    console.log('Admin user created successfully!');
    console.log(`Username: ${ADMIN_USERNAME}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
    console.log('You can now use these credentials to log in.');
    console.log('----------------------------------------------------');

  } catch (error) {
    // If any error occurs, we log it to the console.
    console.error('Error during admin user seeding:', error);
  } finally {
    // 8. DISCONNECT FROM THE DATABASE
    // This is a crucial step. Whether the script succeeds or fails,
    // we must close the connection to the database to prevent hanging processes.
    console.log('Disconnecting from database...');
    await mongoose.disconnect();
    console.log('Database disconnected.');
  }
};

// 9. EXECUTE THE SEEDING FUNCTION
seedAdmin();
