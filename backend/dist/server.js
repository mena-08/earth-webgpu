"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/index.ts
const express_1 = __importDefault(require("express"));
const openai_1 = __importDefault(require("openai"));
const path_1 = __importDefault(require("path"));
const axios_1 = __importDefault(require("axios"));
const multer_1 = __importDefault(require("multer"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
(0, dotenv_1.config)({ path: path_1.default.resolve(__dirname, './.env') });
const app = (0, express_1.default)();
const port = 3000;
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
const openai = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Serve static files from the frontend/public directory
app.use(express_1.default.static(path_1.default.join(__dirname, '../../frontend/public')));
app.get('/', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../../frontend/index.html'));
});
app.post('/chat', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { conversation } = req.body;
    const userMessage = req.body.prompt;
    conversation.push({ role: "user", content: userMessage });
    try {
        const response = yield openai.chat.completions.create({
            model: "gpt-4-turbo-2024-04-09",
            messages: conversation
        });
        conversation.push({ role: "assistant", content: response.choices[0].message.content });
        res.json({ reply: response.choices[0].message.content, conversation });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
app.post('/chat_stream', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, e_1, _b, _c;
    var _d, _e;
    const { conversation } = req.body;
    const userMessage = req.body.prompt;
    conversation.push({ role: "user", content: userMessage });
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    const stream = yield openai.chat.completions.create({
        model: "gpt-4o-2024-05-13",
        messages: conversation,
        stream: true,
    });
    try {
        try {
            for (var _f = true, stream_1 = __asyncValues(stream), stream_1_1; stream_1_1 = yield stream_1.next(), _a = stream_1_1.done, !_a; _f = true) {
                _c = stream_1_1.value;
                _f = false;
                const chunk = _c;
                if ((_e = (_d = chunk.choices[0]) === null || _d === void 0 ? void 0 : _d.delta) === null || _e === void 0 ? void 0 : _e.content) {
                    res.write(`${chunk.choices[0].delta.content}\n\n`);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_f && !_a && (_b = stream_1.return)) yield _b.call(stream_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        res.end();
    }
    catch (error) {
        res.status(500).json({ error: "Stream was interrupted" });
    }
}));
app.post('/audio', upload.single('file'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }
    try {
        const response = yield axios_1.default.post('https://api.openai.com/v1/audio/transcriptions', req.file.buffer, {
            headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
            params: { model: 'whisper-1' }
        });
        const transcribed_text = response.data.text;
        // Simulate calling the chat function internally
        const chatResponse = yield axios_1.default.post(`http://localhost:${port}/chat`, {
            conversation: [],
            prompt: transcribed_text
        });
        res.json(chatResponse.data);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
// Route to serve GeoTIFF files
app.get('/geoTIFF/:filename', (req, res) => {
    const filename = req.params.filename;
    const options = {
        root: path_1.default.join(__dirname, '../../frontend/public/geotiff'),
        dotfiles: 'deny', // Correct value
        headers: {
            'x-timestamp': Date.now(),
            'x-sent': true
        }
    };
    //http://localhost:3000/geoTIFF/n19_w156_1arc_v3.tif
    res.sendFile(filename, options, (err) => {
        if (err) {
            console.log(err);
            res.status(500).end();
        }
    });
});
app.listen(port, () => {
    console.log(`Express server running at http://localhost:${port}/`);
});
//# sourceMappingURL=server.js.map