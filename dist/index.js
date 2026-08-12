"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const analytics_routes_1 = __importDefault(require("./routes/analytics.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(express_1.default.json());
// Routes
app.use('/api/analytics', analytics_routes_1.default);
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'RAM SEO Backend is running' });
});
app.listen(PORT, () => {
    console.log(`🚀 RAM SEO Backend running on http://localhost:${PORT}`);
});
