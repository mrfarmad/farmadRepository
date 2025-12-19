class CommandQueue {
  constructor() {
    this.queue = [];
  }

  enqueue(cmd) {
    this.queue.push(cmd);
  }

  next() {
    return this.queue.shift();
  }
}

module.exports = { CommandQueue };
