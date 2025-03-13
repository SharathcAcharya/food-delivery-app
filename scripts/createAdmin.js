const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

async function createAdminUser() {
	try {
		await mongoose.connect(process.env.MONGODB_URI);
		console.log('Connected to MongoDB');

		// Check if admin already exists
		const existingAdmin = await User.findOne({ username: 'admin' });
		if (existingAdmin) {
			console.log('Admin user already exists');
			process.exit(0);
		}

		// Create admin user
		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash('admin123', salt);

		const adminUser = new User({
			name: 'Admin',
			username: 'admin',
			email: 'admin@fooddelivery.com',
			password: hashedPassword,
			phone: '1234567890',
			isAdmin: true
		});

		await adminUser.save();
		console.log('Admin user created successfully');
		console.log('Username: admin');
		console.log('Password: admin123');

	} catch (error) {
		console.error('Error creating admin user:', error);
	} finally {
		await mongoose.disconnect();
		process.exit(0);
	}
}

createAdminUser();
