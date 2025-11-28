import telebot
import requests
import json
import os

def start_bot():
    print("Бот запущен...")
    bot.polling()

BOT_TOKEN = "8437761728:AAFh1QSQamm0HX4vDsvNF3UIRyqFyFK_bVA"
API_URL = "http://localhost:5000/api/add-product"

bot = telebot.TeleBot(BOT_TOKEN)

AKCII_FILE = "akcii.json"
NOVINKI_FILE = "novinki.json"

def save_to_file(filename, data):
    items = []
    if os.path.exists(filename):
        with open(filename, "r", encoding="utf-8") as f:
            items = json.load(f)
    items.append(data)
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)

@bot.message_handler(commands=['start', 'help'])
def send_welcome(message):
    bot.reply_to(message, (
        "📦 Используйте:\n"
        "/tovar — добавить товар (с адресом)\n"
        "/akcia — добавить акцию\n"
        "/new — добавить новый товар\n"
        "/example — пример формата"
    ))

@bot.message_handler(commands=['example'])
def send_example(message):
    example = {
        "category": "Одноразовые сигареты",
        "brand": "Мишки",
        "name": "150440",
        "image_url": "https://via.placeholder.com/300?text=Мишки",
        "flavor": "Клубника",  # ← ОДНО ЗНАЧЕНИЕ, НЕ МАССИВ!
        "city": "Северодвинск",
        "street": "Ленина, аа"
    }
    bot.send_message(
        message.chat.id,
        f"```json\n{json.dumps(example, ensure_ascii=False, indent=2)}\n```",
        parse_mode="Markdown"
    )

# === /tovar ===
@bot.message_handler(commands=['tovar'])
def handle_tovar(message):
    bot.reply_to(message, "Отправьте JSON с товаром (включая city и street):")

@bot.message_handler(func=lambda m: m.reply_to_message and "Отправьте JSON с товаром" in m.reply_to_message.text)
def add_product_from_tovar(message):
    try:
        data = json.loads(message.text)
        required = ["category", "brand", "name", "flavor", "city", "street", "image_url"]
        if not all(k in data for k in required):
            raise ValueError("Не хватает полей: " + ", ".join(required))
        data["street"] = data["street"].strip()

        resp = requests.post(API_URL, json=data, timeout=5)
        if resp.status_code == 200:
            bot.reply_to(message, "✅ Товар добавлен!")
        elif resp.status_code == 409:
            bot.reply_to(message, "⚠️ Такой товар уже существует.")
        else:
            bot.reply_to(message, f"❌ Ошибка сервера: {resp.status_code}")
    except json.JSONDecodeError:
        bot.reply_to(message, "❌ Неверный JSON. Используйте /example")
    except Exception as e:
        bot.reply_to(message, f"❌ Ошибка: {str(e)}")

# === /akcia ===
@bot.message_handler(commands=['akcia'])
def handle_akcia(message):
    bot.reply_to(message, "Отправьте JSON для акции (без city/street, flavor — строка):")

@bot.message_handler(func=lambda m: m.reply_to_message and "Отправьте JSON для акции" in m.reply_to_message.text)
def add_akcia(message):
    try:
        data = json.loads(message.text)
        required = ["category", "brand", "name", "flavor", "image_url"]
        if not all(k in data for k in required):
            raise ValueError("Не хватает полей: " + ", ".join(required))

        # Если передан массив flavors — берем первый элемент
        if isinstance(data.get("flavors"), list) and len(data["flavors"]) > 0:
            data["flavor"] = data["flavors"][0]
            del data["flavors"]

        # Убедимся, что flavor — строка
        if not isinstance(data["flavor"], str):
            raise ValueError("Поле 'flavor' должно быть строкой")

        save_to_file(AKCII_FILE, data)
        bot.reply_to(message, "✅ Акция добавлена!")
    except json.JSONDecodeError:
        bot.reply_to(message, "❌ Неверный JSON. Используйте /example")
    except Exception as e:
        bot.reply_to(message, f"❌ Ошибка: {str(e)}")

# === /new ===
@bot.message_handler(commands=['new'])
def handle_new(message):
    bot.reply_to(message, "Отправьте JSON для нового товара (без city/street, flavor — строка):")

@bot.message_handler(func=lambda m: m.reply_to_message and "Отправьте JSON для нового товара" in m.reply_to_message.text)
def add_new_product(message):
    try:
        data = json.loads(message.text)
        required = ["category", "brand", "name", "flavor", "image_url"]
        if not all(k in data for k in required):
            raise ValueError("Не хватает полей: " + ", ".join(required))

        # Если передан массив flavors — берем первый элемент
        if isinstance(data.get("flavors"), list) and len(data["flavors"]) > 0:
            data["flavor"] = data["flavors"][0]
            del data["flavors"]

        # Убедимся, что flavor — строка
        if not isinstance(data["flavor"], str):
            raise ValueError("Поле 'flavor' должно быть строкой")

        save_to_file(NOVINKI_FILE, data)
        bot.reply_to(message, "✅ Новый товар добавлен!")
    except json.JSONDecodeError:
        bot.reply_to(message, "❌ Неверный JSON. Используйте /example")
    except Exception as e:
        bot.reply_to(message, f"❌ Ошибка: {str(e)}")

if __name__ == "__main__":
    print("Бот запущен...")

    bot.polling()
