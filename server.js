const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { createServer } = require('http');
const WebSocket = require('ws');
const { Server } = require('socket.io');
const NotificationService = require('./services/notification');
const { verifyToken, verifyAdmin } = require('./middleware/auth');
require('dotenv').config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3005;

// Create HTTP server
const httpServer = createServer(app);

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
	origin: true,
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization']
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Routes
const { router: authRouter } = require('./routes/auth');
app.use('/api/auth', authRouter);

// Food routes (public access for GET, authentication for admin operations)
app.use('/api/food', require('./routes/food'));
app.use('/api/reviews', require('./routes/review'));
app.use('/api/order', verifyToken, require('./routes/order'));
app.use('/api/location', verifyToken, require('./routes/location'));
app.use('/api/rewards', verifyToken, require('./routes/rewards'));
app.use('/api/notifications', verifyToken, require('./routes/notification'));

// Cart routes (requires authentication)
app.use('/api/cart', verifyToken, require('./routes/cart'));

// Profile route
app.get('/profile', verifyToken, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Admin route protection
app.get('/admin.html', verifyToken, verifyAdmin, (req, res, next) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Handle client-side routing - must be after API routes
app.get('/*', (req, res, next) => {
    // Check if the request is for a static file
    const ext = path.extname(req.path);
    if (ext) {
        // If it's a static file that doesn't exist, let express.static handle the 404
        next();
    } else {
        // For all other routes, send the index.html file
        const filePath = req.path === '/' ? 'index.html' : `${req.path.substring(1)}.html`;
        const fullPath = path.join(__dirname, 'public', filePath);
        
        // Check if the HTML file exists
        if (require('fs').existsSync(fullPath)) {
            res.sendFile(fullPath);
        } else {
            // If the specific page doesn't exist, send index.html
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        }
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
	console.error('Express error:', err);
	if (err.type === 'entity.parse.failed') {
		return res.status(400).json({ message: 'Invalid JSON format' });
	}
	if (err.name === 'UnauthorizedError') {
		return res.status(401).json({ message: 'Invalid token' });
	}
	if (err.name === 'ValidationError') {
		return res.status(400).json({ message: err.message });
	}
	res.status(500).json({ message: 'Internal server error' });
});

// Start server
async function startServer() {
	try {
		await mongoose.connect(process.env.MONGODB_URI, {
			useNewUrlParser: true,
			useUnifiedTopology: true
		});
		console.log('MongoDB Connected Successfully');

		httpServer.listen(PORT, () => {
			console.log(`Server is running on port ${PORT}`);
		});

		// WebSocket setup
		const wss = new WebSocket.Server({ server: httpServer });
		const clients = new Map();

		wss.on('connection', (ws) => {
			console.log('New WebSocket connection');
			ws.on('message', (message) => {
				try {
					const data = JSON.parse(message);
					if (data.type === 'register' && data.userId) {
						clients.set(data.userId, ws);
					}
				} catch (error) {
					console.error('WebSocket error:', error);
				}
			});
		});

		global.broadcastNotification = (userId, message, type) => {
			const ws = clients.get(userId.toString());
			if (ws) ws.send(JSON.stringify({ type: 'notification', message, notificationType: type }));
		};

		global.broadcastOrderUpdate = (orderId, status, userId, data = {}) => {
			const ws = clients.get(userId.toString());
			if (ws) ws.send(JSON.stringify({ type: 'orderUpdate', orderId, status, ...data }));
		};

		return httpServer;
	} catch (error) {
		console.error('Server startup error:', error);
		process.exit(1);
	}
}

// Handle process termination
process.on('SIGTERM', () => {
	console.log('Received SIGTERM. Performing graceful shutdown...');
	process.exit(0);
});

process.on('SIGINT', () => {
	console.log('Received SIGINT. Performing graceful shutdown...');
	process.exit(0);
});

// Start the application
startServer().catch(err => {
	console.error('Failed to start server:', err);
	process.exit(1);
});
