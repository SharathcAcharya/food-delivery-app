const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../public/uploads/profiles');
if (!fs.existsSync(uploadDir)) {
	fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
	destination: function(req, file, cb) {
		cb(null, uploadDir);
	},
	filename: function(req, file, cb) {
		const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
		cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
	}
});

// File filter function
const fileFilter = (req, file, cb) => {
	const allowedTypes = /jpeg|jpg|png/;
	const mimetype = allowedTypes.test(file.mimetype);
	const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

	if (mimetype && extname) {
		return cb(null, true);
	}
	cb(new Error('Only .png, .jpg and .jpeg format allowed!'), false);
};

// Configure multer upload
const upload = multer({
	storage: storage,
	limits: {
		fileSize: 5 * 1024 * 1024, // 5MB limit
		files: 1 // Only allow 1 file per request
	},
	fileFilter: fileFilter
});

// Error handling middleware
const handleUploadError = (error, req, res, next) => {
	if (error instanceof multer.MulterError) {
		if (error.code === 'LIMIT_FILE_SIZE') {
			return res.status(400).json({ message: 'File size too large. Maximum size is 5MB.' });
		}
		return res.status(400).json({ message: error.message });
	}
	
	if (error.message === 'Only .png, .jpg and .jpeg format allowed!') {
		return res.status(400).json({ message: error.message });
	}
	
	next(error);
};

// Delete old profile image
const deleteOldProfileImage = (imagePath) => {
	if (!imagePath || imagePath.includes('placeholder')) return;
	
	const fullPath = path.join(__dirname, '../public', imagePath);
	fs.unlink(fullPath, (err) => {
		if (err) console.error('Error deleting old profile image:', err);
	});
};

module.exports = {
	upload,
	handleUploadError,
	deleteOldProfileImage
};