import os
import telebot
import re

API_KEY = os.getenv('API_KEY')
bot = telebot.TeleBot(API_KEY)

@bot.message_handler(commands = ['Start',"start"])
def start(message):
    bot.send_message(message.chat.id, "Доступные команды: \n командовать ты здесь не можешь", )

@bot.message_handler(commands = ['Greet',"greet"])
def greet(message):
    bot.reply_to(message, "solam voram")

@bot.message_handler(commands = ['Solam','solam'])
def solam(message):
    bot.send_message(message.chat.id, "solam")

def isGreeting(message):
    print("message is",message.text)
    greetings_file = open('greetings.txt','r',encoding="utf-8")
    greetings = greetings_file.read().split('\n')
    print(greetings)
    for greeting in greetings:
        print("\n",greeting)
        pattern = re.compile(greeting,re.IGNORECASE)
        if re.match(pattern, message.text):
            return True
    send_badGreeting(message)
    return False    


@bot.message_handler(func=isGreeting)
def send_goodGreeting(message):
    bot.send_message(message.chat.id, "Привет, кросотка")


def send_badGreeting(message):
    bot.send_message(message.chat.id, "тебе не кажется, стоит сначала поздороваться?")

bot.polling()