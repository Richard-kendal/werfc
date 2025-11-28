from flask import Flask, jsonify
from flask_cors import CORS
import json
import os
import re
import uuid

app = Flask(__name__)
CORS(app)

DATA_FILE = "products.json"
AKCII_FILE = "akcii.json"
NOVINKI_FILE = "novinki.json"

def normalize_street(s):
    return re.sub(r'[^а-яa-z0-9\s]', '', s.lower()).strip()

def generate_id():
    return str(int(uuid.uuid4().int & (1 << 32) - 1))

def load_json_file(filename):
    if not os.path.exists(filename):
        return []
    try:
        with open(filename, "r", encoding="utf-8") as f:
            content = f.read().strip()
            if not content:
                return []
            return json.loads(content)
    except (json.JSONDecodeError, IOError):
        return []

def save_json_file(filename, data):
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def load_products():
    return load_json_file(DATA_FILE)

def save_products(data):
    save_json_file(DATA_FILE, data)

@app.route("/api/products", methods=["GET"])
def get_products():
    return jsonify(load_products())

@app.route("/api/akcii", methods=["GET"])
def get_akcii():
    return jsonify(load_json_file(AKCII_FILE))

@app.route("/api/novinki", methods=["GET"])
def get_novinki():
    return jsonify(load_json_file(NOVINKI_FILE))

@app.route("/api/add-product", methods=["POST"])
def add_product():
    from flask import request
    product = request.get_json()
    if not product:
        return {"error": "No JSON"}, 400

    required = ["category", "brand", "name", "flavor", "city", "street", "image_url"]
    if not all(k in product for k in required):
        return {"error": "Missing fields"}, 400

    product["street"] = product["street"].strip()
    product["id"] = generate_id()
    products = load_products()

    for p in products:
        if (
            p["category"] == product["category"] and
            p["brand"] == product["brand"] and
            p["name"] == product["name"] and
            p["flavor"] == product["flavor"] and
            p["city"] == product["city"] and
            normalize_street(p["street"]) == normalize_street(product["street"])
        ):
            return {"error": "Товар уже существует"}, 409

    products.append(product)
    save_products(products)
    return {"status": "ok", "id": product["id"]}

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=False)