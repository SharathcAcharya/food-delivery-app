const https = require('https');
const fs = require('fs');
const path = require('path');

const images = [
	{
		name: 'paneer-tikka.jpg',
		url: 'https://www.cookwithmanali.com/wp-content/uploads/2015/07/Restaurant-Style-Paneer-Tikka-500x500.jpg'
	},
	{
		name: 'chicken-65.jpg',
		url: 'https://www.indianhealthyrecipes.com/wp-content/uploads/2022/03/chicken-65-recipe-500x500.jpg'
	},
	{
		name: 'butter-chicken.jpg',
		url: 'https://cafedelites.com/wp-content/uploads/2019/01/Butter-Chicken-IMAGE-500x500.jpg'
	},
	{
		name: 'paneer-butter-masala.jpg',
		url: 'https://www.indianveggiedelight.com/wp-content/uploads/2021/08/restaurant-style-paneer-butter-masala-featured-500x500.jpg'
	},
	{
		name: 'cheese-pizza.jpg',
		url: 'https://www.cookingclassy.com/wp-content/uploads/2014/07/four-cheese-pizza-2-500x500.jpg'
	},
	{
		name: 'chicken-burger.jpg',
		url: 'https://www.kitchensanctuary.com/wp-content/uploads/2019/08/Crispy-Chicken-Burger-square-FS-4518-500x500.jpg'
	},
	{
		name: 'greek-salad.jpg',
		url: 'https://www.aheadofthyme.com/wp-content/uploads/2016/03/the-perfect-greek-salad-7-500x500.jpg'
	},
	{
		name: 'grilled-chicken-salad.jpg',
		url: 'https://www.eatwell101.com/wp-content/uploads/2019/04/Blackened-Chicken-and-Avocado-Salad-recipe-1-500x500.jpg'
	},
	{
		name: 'mango-lassi.jpg',
		url: 'https://www.indianhealthyrecipes.com/wp-content/uploads/2021/05/mango-lassi-recipe-500x500.jpg'
	},
	{
		name: 'cold-coffee.jpg',
		url: 'https://www.indianhealthyrecipes.com/wp-content/uploads/2022/04/cold-coffee-recipe-500x500.jpg'
	},
	{
		name: 'gulab-jamun.jpg',
		url: 'https://www.indianhealthyrecipes.com/wp-content/uploads/2014/09/gulab-jamun-recipe-500x500.jpg'
	},
	{
		name: 'chocolate-brownie.jpg',
		url: 'https://preppykitchen.com/wp-content/uploads/2019/09/brownies-recipe-500x500.jpg'
	}
];

const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
	fs.mkdirSync(uploadsDir, { recursive: true });
}

// Download images
images.forEach(image => {
	const filePath = path.join(uploadsDir, image.name);
	https.get(image.url, (response) => {
		const fileStream = fs.createWriteStream(filePath);
		response.pipe(fileStream);
		
		fileStream.on('finish', () => {
			console.log(`Downloaded: ${image.name}`);
			fileStream.close();
		});
	}).on('error', (err) => {
		console.error(`Error downloading ${image.name}:`, err.message);
	});
});