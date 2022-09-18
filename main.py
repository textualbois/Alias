import os
import telebot

API_KEY = os.getenv('API_KEY')
bot = telebot.TeleBot(API_KEY)

@bot.message_handler(commands = ['Start',"start"])
def start(message):
    bot.send_message(message.chat.id, "Alias multi это бесплатная \
        версия игры Alias для телеграм с выбором языков игры \n\
        Можно играть с 1,2, либо всех устройств - не обязательно \
        передавать устройство или находиться в одной комнате.\n\
        Позже добавиться возможность играть с любого колиества устройств\n\n\
        Как играть: \n\
        1) Направьте", )



bot.polling()