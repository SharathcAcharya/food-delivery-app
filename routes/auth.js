const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Order = require('../models/Order');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { upload, handleUploadError, deleteOldProfileImage } = require('../middleware/imageUpload');
const { verifyToken, verifyAdmin } = require('../middleware/auth');


// Register route with image upload and validation
router.post('/register', upload.single('image'), handleUploadError, async (req, res) => {
	try {
		const { name, username, email, password, phone } = req.body;
		
		// Basic validation
		if (!name || !username || !email || !password || !phone) {
			if (req.file) deleteOldProfileImage(`/uploads/profiles/${req.file.filename}`);
			return res.status(400).json({ message: 'All fields are required' });
		}

		// Password strength validation
		if (password.length < 6) {
			if (req.file) deleteOldProfileImage(`/uploads/profiles/${req.file.filename}`);
			return res.status(400).json({ message: 'Password must be at least 6 characters long' });
		}

		// Phone number validation
		if (!/^\d{10}$/.test(phone)) {
			if (req.file) deleteOldProfileImage(`/uploads/profiles/${req.file.filename}`);
			return res.status(400).json({ message: 'Please enter a valid 10-digit phone number' });
		}

		const existingUser = await User.findOne({ $or: [{ email }, { username }] });
		if (existingUser) {
			if (req.file) deleteOldProfileImage(`/uploads/profiles/${req.file.filename}`);
			return res.status(400).json({ 
				message: `${existingUser.email === email ? 'Email' : 'Username'} already exists` 
			});
		}

		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(password, salt);

		const user = new User({
			name,
			username,
			email,
			password: hashedPassword,
			phone,
			image: req.file ? `/uploads/profiles/${req.file.filename}` : undefined
		});

		await user.save();
		res.status(201).json({ message: 'User registered successfully' });
	} catch (error) {
		if (req.file) deleteOldProfileImage(`/uploads/profiles/${req.file.filename}`);
		
		if (error.name === 'ValidationError') {
			const messages = Object.values(error.errors).map(err => err.message);
			return res.status(400).json({ message: messages.join(', ') });
		}
		
		res.status(500).json({ message: 'Error during registration' });
	}
});

// Login route with improved error handling
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }
        
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        try {
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({ message: 'Invalid username or password' });
            }
        } catch (bcryptError) {
            console.error('Password comparison error:', bcryptError);
            return res.status(500).json({ message: 'Error verifying credentials' });
        }

        // Check if user is admin and trying to log in from non-admin page
        const isAdminLogin = req.headers.referer?.includes('admin-login.html');
        if (user.isAdmin && !isAdminLogin) {
            return res.status(403).json({ message: 'Please use admin login page' });
        }
        if (!user.isAdmin && isAdminLogin) {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        try {
            const token = jwt.sign(
                { 
                    _id: user._id,
                    username: user.username,
                    isAdmin: user.isAdmin
                }, 
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            // Remove sensitive information
            const userResponse = {
                _id: user._id,
                name: user.name,
                username: user.username,
                email: user.email,
                phone: user.phone,
                image: user.image,
                isAdmin: user.isAdmin,
                addresses: user.addresses
            };

            res.status(200).json({
                token,
                user: userResponse
            });
        } catch (jwtError) {
            console.error('JWT signing error:', jwtError);
            return res.status(500).json({ message: 'Error generating authentication token' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error during login' });
    }
});

// Admin login route with improved security
router.post('/admin/login', async (req, res) => {
	try {
		const { username, password } = req.body;
		
		if (!username || !password) {
			return res.status(400).json({ message: 'Username and password are required' });
		}
		
		const user = await User.findOne({ username });
		
		if (!user) {
			return res.status(401).json({ message: 'Invalid admin credentials' });
		}

		if (!user.isAdmin) {
			return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
		}

		const validPassword = await bcrypt.compare(password, user.password);
		
		if (!validPassword) {
			return res.status(401).json({ message: 'Invalid admin credentials' });
		}

		const token = jwt.sign(
			{ 
				id: user._id, 
				isAdmin: user.isAdmin,
				username: user.username 
			},
			process.env.JWT_SECRET,
			{ expiresIn: '1d' }
		);

		res.json({
			token,
			user: {
				id: user._id,
				name: user.name,
				username: user.username,
				isAdmin: user.isAdmin,
				email: user.email,
				phone: user.phone,
				image: user.image
			}
		});
	} catch (error) {
		console.error('Admin login error:', error);
		res.status(500).json({ message: 'Error during admin login' });
	}
});

// Get user profile
router.get('/profile', verifyToken, async (req, res) => {
	try {
		const user = await User.findById(req.user._id)
			.select('-password')
			.lean();

		if (!user) {
			return res.status(404).json({ message: 'User not found' });
		}

		// Include isAdmin in response
		user.isAdmin = req.user.isAdmin;
		res.json(user);

	} catch (error) {
		console.error('Error fetching profile:', error);
		res.status(500).json({ message: 'Error fetching profile' });
	}
});

// Update profile image
router.put('/profile/image', verifyToken, upload.single('image'), handleUploadError, async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ message: 'No image provided' });
		}

		const user = await User.findById(req.user._id);
		if (!user) {
			deleteOldProfileImage(`/uploads/profiles/${req.file.filename}`);
			return res.status(404).json({ message: 'User not found' });
		}

		// Delete old profile image
		deleteOldProfileImage(user.image);

		// Update with new image
		user.image = `/uploads/profiles/${req.file.filename}`;
		await user.save();

		res.json({ 
			message: 'Profile image updated successfully', 
			image: user.image 
		});
	} catch (error) {
		// Delete uploaded image if update fails
		if (req.file) {
			deleteOldProfileImage(`/uploads/profiles/${req.file.filename}`);
		}
		res.status(400).json({ message: error.message });
	}
});

// Update user profile
router.put('/profile', verifyToken, async (req, res) => {
	try {
		const { name, phone, email } = req.body;
		const user = await User.findByIdAndUpdate(
			req.user._id,
			{ name, phone, email },
			{ new: true }
		).select('-password');
		res.json(user);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
});

// Add/Update address
router.post('/address', verifyToken, async (req, res) => {
	try {
		const user = await User.findById(req.user._id);
		user.addresses.push(req.body);
		await user.save();
		res.json(user.addresses);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
});

// Get user notifications
router.get('/notifications', verifyToken, async (req, res) => {
	try {
		const user = await User.findById(req.user._id);
		res.json(user.notifications);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
});

// Mark notifications as read
router.put('/notifications/read', verifyToken, async (req, res) => {
	try {
		const user = await User.findById(req.user._id);
		user.notifications.forEach(notification => {
			notification.read = true;
		});
		await user.save();
		res.json(user.notifications);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
});

// Admin routes
router.get('/users', verifyToken, verifyAdmin, async (req, res) => {

	try {
		const users = await User.find()
			.select('-password')
			.populate('activeOrders');
		res.json(users);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

module.exports = {
	router,
	verifyToken,
	verifyAdmin
};