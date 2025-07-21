const readline = require('readline');

class Spinner {
  constructor(message = '') {
    this.message = message;
    this.frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    this.interval = null;
    this.currentFrame = 0;
    this.isSpinning = false;
  }

  start(message = this.message) {
    this.message = message;
    this.isSpinning = true;
    this.currentFrame = 0;
    
    if (this.interval) {
      clearInterval(this.interval);
    }
    
    process.stdout.write('\r');
    
    this.interval = setInterval(() => {
      const frame = this.frames[this.currentFrame];
      process.stdout.write(`\r${frame} ${this.message}`);
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
    }, 80);
    
    return this;
  }

  stop(message = '') {
    if (!this.isSpinning) return this;
    
    clearInterval(this.interval);
    this.interval = null;
    this.isSpinning = false;
    
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    
    if (message) {
      process.stdout.write(message + '\n');
    }
    
    return this;
  }

  update(message) {
    this.message = message;
    return this;
  }
}

module.exports = Spinner;