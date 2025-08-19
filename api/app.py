import os, json
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
from mutagen.mp3 import MP3
from io import BytesIO
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[1]
load_dotenv(dotenv_path=ROOT_DIR / ".env")

app = Flask(__name__, static_folder="../static", static_url_path="")
CORS(app)

def load_songs_data():
    try:
        links_raw = os.getenv("SONGS_LINKS_JSON")
        pls_raw = os.getenv("SONGS_PLAYLISTS_JSON")
        if links_raw and pls_raw:
            return json.loads(links_raw), json.loads(pls_raw)
    except Exception as e:
        print("Failed to parse env JSON:", e)
    return {}, {}


songsLinks, songsByPlaylist = load_songs_data()

# Cache of durations
duration_cache = {}

def to_direct_dropbox(url: str) -> str:
    return (url.replace("www.dropbox.com", "dl.dropboxusercontent.com")
               .replace("dl=0", "dl=1"))


@app.route("/api/songs", methods=["GET"])
def api_songs():
    return jsonify({"songsLinks": songsLinks, "songsByPlaylist": songsByPlaylist})

@app.route("/api/init-durations", methods=["POST"])
def api_init_durations():
    links = {k: to_direct_dropbox(v["url"]) for k, v in songsLinks.items()}

    for key, url in links.items():
        if key in duration_cache:
            continue
        try:
            print(f"Fetching duration for {key} ...")
            r = requests.get(url, timeout=15)
            if r.status_code != 200:
                duration_cache[key] = None
                continue
            audio = MP3(BytesIO(r.content))
            duration_cache[key] = audio.info.length
            print(f"Cached {key}: {duration_cache[key]:.2f}s")
        except Exception as e:
            print(f"Error processing {key}: {e}")
            duration_cache[key] = None

    return jsonify({"cached": duration_cache})

@app.route("/api/get-durations", methods=["POST"])
def api_get_durations():
    """
    Body: { "songs": ["song1","song2", ...] }
    """
    data = request.json or {}
    keys = data.get("songs", [])
    durations = {k: duration_cache.get(k) for k in keys}
    return jsonify(durations)

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    full = os.path.join(app.static_folder, path)
    if path != "" and os.path.exists(full):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, "index.html")

if __name__ == "__main__":
    app.run(debug=True)
