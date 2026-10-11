# ClinicPhone

ClinicPhone is a voice assistant for clinics. A patient calls the clinic's phone number, asks a question out loud in Persian, and hears the answer spoken back. There is no typing and no menu to navigate, just a conversation.

Clinics tend to get the same kinds of questions over and over, and answering them usually means someone has to pick up the phone. I wanted to build something that could handle that conversation naturally, using the clinic's own information rather than a model's guesses.

I built the whole thing in Node.js, from the WebSocket server to the database layer to the telephony audio pipeline.

## How it works

1. **Listening.** Asterisk streams the caller's audio to the server over a WebSocket (`chan_websocket`, ulaw at 8 kHz). The server converts it into the PCM format the speech-to-text service expects and forwards it, and gets Persian text back in real time.
2. **Knowing when you're done.** People pause in the middle of sentences, so a silence alone isn't a reliable signal. After a few seconds of quiet, the server scores the transcript to decide whether it is a complete thought or whether the caller is probably still talking. If it's not complete, it keeps listening.
3. **Finding the right information.** The question is turned into an embedding and matched against the clinic's documents stored in the database. If there is earlier context in the conversation, it is used to improve the search for follow-up questions.
4. **Answering.** The most relevant documents are passed to a language model with strict instructions to answer only from that material. If nothing relevant is found, the assistant says it doesn't have enough information instead of inventing an answer.
5. **Speaking back.** The reply is converted to Persian speech, re-encoded as ulaw at 8 kHz with ffmpeg, and sent back to Asterisk in chunks. While the assistant is talking, caller audio is not forwarded to speech-to-text. Listening resumes when Asterisk reports that the audio has finished playing.

Every session and message is saved, so conversations keep their context from one turn to the next.

### Audio formats

| Direction | Format |
|-----------|--------|
| Caller to server | ulaw, 8 kHz, mono, 160-byte frames (20 ms) from Asterisk |
| Server to speech-to-text | 16-bit PCM, mono, 44.1 kHz, 20 ms frames |
| Text-to-speech to server | Audio file (MP3 or WAV) with a header |
| Server to caller | ulaw, 8 kHz, mono, raw, sent in chunks of at most 64,000 bytes |

Asterisk rejects any single WebSocket message larger than 65,500 bytes and hangs up the call, so replies are always split into smaller chunks before they are sent.

## Features

- **Voice-only interaction.** The caller talks and the assistant talks back.
- **Smart turn detection.** The server scores each transcript to decide whether the caller has really finished speaking, so a short pause doesn't cut anyone off.
- **Answers grounded in clinic data.** Responses come from the clinic's own documents using retrieval-augmented generation (RAG), not from the model's general knowledge.
- **Context-aware follow-ups.** The previous message is taken into account when searching, so short follow-up questions still find the right information.
- **Honest fallback.** When no relevant information is found, the assistant says so instead of guessing.
- **Caller identification.** Each caller is identified by their caller ID phone number (mobile or landline, with or without `+98`), and each caller gets their own conversation history.
- **Resilient calls.** Speech-to-text and text-to-speech failures are retried with a spoken fallback message, and a call is closed cleanly after too many failures.
- **Persistent storage.** Sessions, conversations, messages and clinic documents are stored in MySQL.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js |
| Web framework | Express 5 (health check only) |
| Real-time communication | WebSocket (`ws`) |
| Telephony | Asterisk (`chan_websocket`) over a SIP trunk |
| Audio conversion | ffmpeg |
| Database | MySQL with Sequelize |
| Speech-to-text | iotype |
| Language model and embeddings | OpenRouter |
| Text-to-speech | FreeTTS |

## Getting Started

### Prerequisites

- Node.js 18 or higher
- MySQL
- ffmpeg, installed and available on your `PATH`
- API keys for [OpenRouter](https://openrouter.ai), [FreeTTS](https://freetts.org) and iotype
- Asterisk 20.18+, 22.8+ or 23.2+ for the call connection (these versions support the JSON control format this project uses)

### Installation

```bash
git clone https://github.com/benyamin-haghighy/clinic-phone.git
cd clinic-phone
npm install
```

**1. Create the database**

```sql
CREATE DATABASE `clinic-speak`;
```

**2. Add your environment variables**

```bash
cp src/.env.example src/.env
```

Then open `src/.env` and fill in the values:

| Variable | Description |
|----------|-------------|
| `PORT` | Port for the health-check endpoint (`/health`) |
| `OPENROUTER_API_KEY` | Used for the language model and for embeddings |
| `FREE_TTS_API_KEY` | Used for text-to-speech |
| `IO_TYPE_TOKEN` | Used for real-time speech-to-text |
| `WS_HOST` | Address the WebSocket server listens on (default `127.0.0.1`) |
| `WS_PORT` | Port the WebSocket server listens on (default `8080`) |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | MySQL connection used by the app |

The database migrations are run by `sequelize-cli`, which reads its own settings from `src/config/config.json`. If your MySQL credentials differ from the defaults (`root`, empty password, `localhost:3306`), update that file as well.

**3. Run the migrations**

```bash
npm run db:migrate
```

**4. Load the clinic documents**

```bash
node src/saveChunk/chunckDocumnets.js
```

This embeds the documents in `src/saveChunk/chunckDocumnets.js` and stores them in the database. To use your own clinic's information, edit the list in that file before running it. Run it once, since running it again will add the same documents twice.

**5. Start the app**

```bash
npm run dev
```

The WebSocket server listens on `WS_HOST:WS_PORT`. By default it only accepts connections from the same machine, which is what you want when Asterisk runs on the same server.

## Connecting Asterisk

Asterisk connects to this project as an outgoing WebSocket client, so the server only needs to accept connections. The examples below follow the Asterisk `chan_websocket` documentation.

**`websocket_client.conf`**

```ini
[connection1]
type = websocket_client
connection_type = per_call_config
uri = ws://127.0.0.1:8080
protocols = media
```

**Dialplan**

```
exten = _X.,1,Dial(WebSocket/connection1/c(ulaw)f(json)v(phone=${URIENCODE(${CALLERID(num)})}))
```

- `c(ulaw)` sets the codec the whole audio pipeline is built for.
- `f(json)` makes Asterisk send and expect control messages as JSON.
- `v(phone=...)` passes the caller ID to the server in the connection URL. The `+` in international numbers has to be URL-encoded (`%2B`), which `URIENCODE` does for you.

You can check your Asterisk version with `core show version`.

## Project Structure

```
clinic-phone/
└── src/
    ├── app.js               Express app and the call flow
    ├── server.js            Entry point
    ├── config/              Database and application settings
    ├── migrations/          Sequelize migrations
    ├── models/              Sequelize models
    ├── service/
    │   ├── ask_ai/          Answer generation
    │   ├── embedding/       Text embeddings
    │   ├── tts/             Text-to-speech
    │   └── ws/              WebSocket server and speech-to-text connection
    ├── validation/          Turn completion scoring
    ├── saveChunk/           Embeds and stores the clinic documents
    └── utils/               Database helpers, vector search and call audio conversion
```

## Current Limitations

- Callers are identified by their caller ID only, with no verification step.
- The assistant understands and answers in Persian only.
- Replies are sent to Asterisk in one go. Asterisk can queue about 20 seconds of audio, so very long replies may be cut off at the end.
- Document search compares the question against every stored document, which works well for a clinic's knowledge base but isn't built for very large collections.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
