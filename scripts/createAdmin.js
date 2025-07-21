require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Simple color functions for terminal output since Chalk v5 is ESM-only
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgBlue: '\x1b[44m',
  bgCyan: '\x1b[46m'
};

// Helper functions for colored output
const colorize = {
  cyan: (text) => `${colors.cyan}${colors.bright}${text}${colors.reset}`,
  yellow: (text) => `${colors.yellow}${text}${colors.reset}`,
  yellowBold: (text) => `${colors.yellow}${colors.bright}${text}${colors.reset}`,
  green: (text) => `${colors.green}${text}${colors.reset}`,
  greenBold: (text) => `${colors.green}${colors.bright}${text}${colors.reset}`,
  red: (text) => `${colors.red}${text}${colors.reset}`,
  redBold: (text) => `${colors.red}${colors.bright}${text}${colors.reset}`,
  redDim: (text) => `${colors.red}${colors.dim}${text}${colors.reset}`,
  blue: (text) => `${colors.blue}${text}${colors.reset}`,
  blueBold: (text) => `${colors.blue}${colors.bright}${text}${colors.reset}`,
  white: (text) => `${colors.white}${text}${colors.reset}`,
  whiteBold: (text) => `${colors.white}${colors.bright}${text}${colors.reset}`,
  gray: (text) => `${colors.white}${colors.dim}${text}${colors.reset}`,
  bgGreen: (text) => `${colors.bgGreen}${colors.white}${colors.bright}${text}${colors.reset}`,
  bgRed: (text) => `${colors.bgRed}${colors.white}${colors.bright}${text}${colors.reset}`,
  bgBlue: (text) => `${colors.bgBlue}${colors.white}${colors.bright}${text}${colors.reset}`,
  bgCyan: (text) => `${colors.bgCyan}${colors.white}${colors.bright}${text}${colors.reset}`
};
// Helper function to create a spinner animation
function createSpinner() {
  const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  let timer;
  return {
    start: (text) => {
      process.stdout.write(colorize.blue(spinnerFrames[i]) + ' ' + text);
      timer = setInterval(() => {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        i = (i + 1) % spinnerFrames.length;
        process.stdout.write(colorize.blue(spinnerFrames[i]) + ' ' + text);
      }, 80);
    },
    stop: (success = true, message = '') => {
      clearInterval(timer);
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      if (success) {
        process.stdout.write(colorize.green('✓ ') + colorize.greenBold(message) + '\n');
      } else {
        process.stdout.write(colorize.red('✖ ') + colorize.redBold(message) + '\n');
      }
    }
  };
}
// Clear console and display header
console.clear();
// Display header
console.log(colorize.cyan('╔═══════════════════════════════════════════════╗'));
console.log(colorize.cyan('║                                               ║'));
console.log(colorize.cyan('║           FOOD DELIVERY ADMIN SETUP          ║'));
console.log(colorize.cyan('║                                               ║'));
console.log(colorize.cyan('╚═══════════════════════════════════════════════╝'));

console.log('\n' + colorize.yellowBold('⚡ This utility will create an admin user for your application.'));
console.log(colorize.yellow('⚡ Follow the steps below to complete the setup.\n'));

// Main setup function
async function startSetup() {
  // Create spinner
  const spinner = createSpinner();
  
  // Step 1: Connect to MongoDB
  console.log(colorize.blue('▶ ') + colorize.whiteBold('STEP 1/3: ') + colorize.yellow('Connecting to MongoDB'));
  console.log(colorize.gray('  Attempting to connect to database...'));
  
  spinner.start('Connecting to MongoDB...');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    spinner.stop(true, 'Connected to MongoDB successfully!');
    console.log(colorize.gray('  Connection established to: ') + colorize.gray(process.env.MONGODB_URI));
    
    // Step 2: Check for existing admin
    console.log('\n' + colorize.blue('▶ ') + colorize.whiteBold('STEP 2/3: ') + colorize.yellow('Checking for existing admin'));
    console.log(colorize.gray('  Verifying if admin account already exists...'));
    
    spinner.start('Searching database for admin user...');
    const existingAdmin = await User.findOne({ username: 'admin' });
    
    if (existingAdmin) {
      spinner.stop(true, 'Admin user found in database');
      
      console.log('\n' + colorize.bgBlue(' INFO ') + ' Admin user already exists\n');
      console.log(colorize.cyan('╔═══════════════════════════════════════════════╗'));
      console.log(colorize.cyan('║                                               ║'));
      console.log(colorize.cyan('║  ℹ️  No action needed. Admin already exists.   ║'));
      console.log(colorize.cyan('║                                               ║'));
      console.log(colorize.cyan('╚═══════════════════════════════════════════════╝\n'));
      
      await mongoose.disconnect();
      process.exit(0);
    }
    
    spinner.stop(true, 'No existing admin found');
    console.log(colorize.gray('  Database check complete. Creating new admin user...'));

    // Step 3: Create admin user
    console.log('\n' + colorize.blue('▶ ') + colorize.whiteBold('STEP 3/3: ') + colorize.yellow('Creating admin user'));
    console.log(colorize.gray('  Generating secure credentials...'));
    
    spinner.start('Creating admin account...');
    
    // Generate secure password and hash it
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
    spinner.stop(true, 'Admin user created successfully!');
    console.log(colorize.gray('  Admin account has been created with full privileges.'));
    
    // Display credentials in a nice box
    console.log('\n' + colorize.bgGreen(' SUCCESS ') + ' Admin user has been created!\n');
    
    // Display credential box
    console.log(colorize.cyan('╔═══════════════════════════════════════════════╗'));
    console.log(colorize.cyan('║                                               ║'));
    console.log(colorize.cyan('║              ADMIN CREDENTIALS               ║'));
    console.log(colorize.cyan('║                                               ║'));
    console.log(colorize.cyan('╠═══════════════════════════════════════════════╣'));
    console.log(colorize.cyan('║                                               ║'));
    console.log(colorize.cyan('║  ') + colorize.whiteBold('Username: ') + 
               colorize.yellowBold('admin') + 
               ' '.repeat(30) + colorize.cyan('║'));
    console.log(colorize.cyan('║  ') + colorize.whiteBold('Password: ') + 
               colorize.yellowBold('admin123') + 
               ' '.repeat(27) + colorize.cyan('║'));
    console.log(colorize.cyan('║                                               ║'));
    console.log(colorize.cyan('╠═══════════════════════════════════════════════╣'));
    console.log(colorize.cyan('║                                               ║'));
    console.log(colorize.cyan('║  ') + 
               colorize.redBold('🔐 KEEP THESE CREDENTIALS SECURE! 🔐') + 
               '        ' + colorize.cyan('║'));
    console.log(colorize.cyan('║                                               ║'));
    console.log(colorize.cyan('╚═══════════════════════════════════════════════╝'));
    
    console.log('\n' + colorize.greenBold('✨ Setup complete! You can now log in to the admin panel.'));
    console.log(colorize.green('✨ Run the application and navigate to /admin to access the dashboard.\n'));

    // Disconnect
    await mongoose.disconnect();
    process.exit(0);
    
  } catch (error) {
    spinner.stop(false, 'Operation failed');
    
    console.log('\n' + colorize.bgRed(' ERROR ') + ' Failed to create admin user\n');
    
    // Error box
    console.log(colorize.red('╔═══════════════════════════════════════════════╗'));
    console.log(colorize.red('║                                               ║'));
    console.log(colorize.red('║  ⚠️  ERROR DETAILS                           ║'));
    console.log(colorize.red('║                                               ║'));
    console.log(colorize.red('╠═══════════════════════════════════════════════╣'));
    console.log(colorize.red('║                                               ║'));
    console.log(colorize.red('║  ') + colorize.whiteBold('Message: ') + 
               colorize.yellowBold(error.message.substring(0, 33)) + 
               ' '.repeat(Math.max(0, 33 - error.message.length)) + colorize.red('║'));
    console.log(colorize.red('║                                               ║'));
    console.log(colorize.red('╚═══════════════════════════════════════════════╝\n'));
    
    console.log(colorize.redDim(error.stack));
    console.log(colorize.yellow('\nPlease check your database connection and try again.\n'));
    
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Start the setup process
startSetup();
