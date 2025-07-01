import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

if (!BOT_TOKEN || !ADMIN_CHAT_ID) {
  console.error('❗ Iltimos, .env faylda BOT_TOKEN va ADMIN_CHAT_ID ni to‘g‘ri kiriting.');
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Webhook’ni o‘chirish
bot.deleteWebHook()
  .then(() => {
    console.log('Webhook muvaffaqiyatli o‘chirildi, polling ishlashiga ruxsat berildi.');
  })
  .catch(console.error);

const userStates = {};

const mainMenu = {
  reply_markup: {
    keyboard: [
      ['📦 Сделать предзаказ'],
      ['🛍 Как работает', '📆 Сроки и отправка'],
      ['📩 Связаться с админом']
    ],
    resize_keyboard: true,
  },
};

const products = [
  [{ text: '👗 Платье', callback_data: 'product_Платье' }],
  [{ text: '👟 Кроссовки', callback_data: 'product_Кроссовки' }],
  [{ text: '👜 Сумка', callback_data: 'product_Сумка' }],
];

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Добро пожаловать! Выберите действие из меню ниже:', mainMenu);
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!userStates[chatId]) {
    userStates[chatId] = { step: null, data: {} };
  }

  if (text === '📦 Сделать предзаказ') {
    bot.sendMessage(chatId, 'Выберите товар:', {
      reply_markup: { inline_keyboard: products },
    });
  } else if (text === '🛍 Как работает') {
    bot.sendMessage(chatId, 'Вы выбираете товар, отправляете данные и мы связываемся для подтверждения.');
  } else if (text === '📆 Сроки и отправка') {
    bot.sendMessage(chatId, 'Отправка осуществляется в течение 2-3 дней после подтверждения заказа.');
  } else if (text === '📩 Связаться с админом') {
    bot.sendMessage(chatId, 'Напишите администратору: @your_admin_username');
  } else {
    handleSteps(chatId, text);
  }
});

bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data.startsWith('product_')) {
    const product = data.replace('product_', '');
    userStates[chatId] = { step: 'name', data: { product } };
    bot.sendMessage(chatId, `Вы выбрали: ${product}. Введите ваше имя:`);
  }

  bot.answerCallbackQuery(query.id).catch((e) => console.error('Callback query error:', e));
});

function handleSteps(chatId, text) {
  const user = userStates[chatId];
  if (!user || !user.step) return;

  switch (user.step) {
    case 'name':
      user.data.name = text.trim();
      user.step = 'phone';
      bot.sendMessage(chatId, 'Введите ваш номер телефона:');
      break;

    case 'phone':
      if (!/^(\+?\d{7,15})$/.test(text.trim())) {
        bot.sendMessage(chatId, 'Пожалуйста, введите корректный номер телефона (цифры и + только). Попробуйте снова:');
        return;
      }
      user.data.phone = text.trim();
      user.step = 'address';
      bot.sendMessage(chatId, 'Введите адрес доставки:');
      break;

    case 'address':
      user.data.address = text.trim();

      const orderMessage =
        `🆕 Новый заказ\n` +
        `👤 Имя: ${user.data.name}\n` +
        `📱 Телефон: ${user.data.phone}\n` +
        `📦 Товар: ${user.data.product}\n` +
        `🏠 Адрес: ${user.data.address}`;

      bot.sendMessage(ADMIN_CHAT_ID, orderMessage);

      bot.sendMessage(chatId, 'Спасибо за заказ! Мы свяжемся для подтверждения.', mainMenu);

      userStates[chatId] = { step: null, data: {} };
      break;
  }
}

bot.on('polling_error', (error) => {
  console.error('Polling error:', error.code, error.message);
});

console.log('Telegram bot is running...');
