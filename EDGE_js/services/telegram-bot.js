const TelegramBot = require('node-telegram-bot-api');

class TelegramBotService {
  constructor({ token, registry }) {
    this.token = token;
    this.registry = registry;
    this.bot = null;
  }

  async start() {
    if (!this.token) {
      console.log('⚠️ TELEGRAM_BOT_TOKEN not set, skipping bot');
      return;
    }
    this.bot = new TelegramBot(this.token, { polling: true });
    this.bot.onText(/\/status/, (msg) => {
      const devices = this.registry.list();
      const text = devices.map((d) => `${d.id}: ${JSON.stringify(d.state)}`).join('\n') || 'No devices registered';
      this.bot.sendMessage(msg.chat.id, text);
    });
    console.log('🤖 Telegram bot started');
  }

  async stop() {
    if (this.bot) await this.bot.stopPolling();
  }
}

module.exports = { TelegramBotService };
