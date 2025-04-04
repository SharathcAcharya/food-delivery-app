const https = require('https');
const fs = require('fs');
const path = require('path');

const images = [
	{
		name: 'paneer-tikka.jpg',
		url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&h=500&fit=crop'
	},
	{
		name: 'chicken-65.jpg',
		url: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=500&h=500&fit=crop'
	},
	{
		name: 'butter-chicken.jpg',
		url: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=500&h=500&fit=crop'
	},
	{
		name: 'paneer-butter-masala.jpg',
		url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&h=500&fit=crop'
	},
	{
		name: 'cheese-pizza.jpg',
		url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&h=500&fit=crop'
	},
	{
		name: 'chicken-burger.jpg',
		url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&h=500&fit=crop'
	},
	{
		name: 'greek-salad.jpg',
		url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&h=500&fit=crop'
	},
	{
		name: 'grilled-chicken-salad.jpg',
		url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&h=500&fit=crop'
	},
	{
		name: 'mango-lassi.jpg',
		url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&h=500&fit=crop'
	},
	{
		name: 'cold-coffee.jpg',
		url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&h=500&fit=crop'
	},
	{
		name: 'gulab-jamun.jpg',
		url: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=500&h=500&fit=crop'
	},
	{
		name: 'chocolate-brownie.jpg',
		url: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=500&h=500&fit=crop'
	}
];

const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
	fs.mkdirSync(uploadsDir, { recursive: true });
}

// Function to download an image with retry logic
async function downloadImage(image, retries = 3) {
	const filePath = path.join(uploadsDir, image.name);
	
	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			await new Promise((resolve, reject) => {
				https.get(image.url, (response) => {
					if (response.statusCode !== 200) {
						reject(new Error(`Failed to download ${image.name}: Status code ${response.statusCode}`));
						return;
					}
					
					const fileStream = fs.createWriteStream(filePath);
					response.pipe(fileStream);
					
					fileStream.on('finish', () => {
						fileStream.close();
						// Verify file size
						const stats = fs.statSync(filePath);
						if (stats.size < 1000) { // If file is too small, probably an error
							fs.unlinkSync(filePath);
							reject(new Error(`Downloaded file too small for ${image.name}`));
						} else {
							console.log(`Successfully downloaded: ${image.name}`);
							resolve();
						}
					});
					
					fileStream.on('error', (err) => {
						fs.unlinkSync(filePath);
						reject(err);
					});
				}).on('error', (err) => {
					reject(err);
				});
			});
			return; // Success, exit the retry loop
		} catch (error) {
			console.error(`Attempt ${attempt} failed for ${image.name}:`, error.message);
			if (attempt === retries) {
				console.error(`Failed to download ${image.name} after ${retries} attempts`);
			} else {
				// Wait before retrying
				await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
			}
		}
	}
}

// Download all images
async function downloadAllImages() {
	for (const image of images) {
		await downloadImage(image);
	}
}

downloadAllImages().catch(console.error);