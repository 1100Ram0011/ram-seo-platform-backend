"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleCallback = exports.googleLogin = exports.getGa4Overview = exports.getGa4Properties = void 0;
const googleapis_1 = require("googleapis");
const ga4_1 = require("../services/ga4");
const getGa4Properties = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken)
            return res.status(400).json({ error: "Missing refresh token" });
        const tempClient = new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
        tempClient.setCredentials({ refresh_token: refreshToken });
        const analyticsAdmin = googleapis_1.google.analyticsadmin({ version: "v1beta", auth: tempClient });
        const accounts = await analyticsAdmin.accountSummaries.list();
        const properties = [];
        for (const account of accounts.data.accountSummaries || []) {
            for (const property of account.propertySummaries || []) {
                properties.push({
                    accountId: account.account,
                    accountName: account.displayName,
                    propertyId: property.property?.split("/")[1] || "",
                    propertyName: property.displayName
                });
            }
        }
        res.json(properties);
    }
    catch (error) {
        console.error("GA4 Properties Error:", error.message);
        res.status(500).json({ error: "Failed to fetch properties" });
    }
};
exports.getGa4Properties = getGa4Properties;
const getGa4Overview = async (req, res) => {
    try {
        // In this simplified architecture, the frontend sends the refreshToken and propertyId 
        // since we are bypassing Prisma for the MVP.
        const { refreshToken, propertyId, range } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ error: 'Google Analytics not connected. Missing refresh token.' });
        }
        if (!propertyId) {
            return res.status(400).json({ error: 'No GA4 Property ID provided.' });
        }
        const tempClient = new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
        tempClient.setCredentials({ refresh_token: refreshToken });
        const selectedRange = range || "weekly";
        const rawData = await (0, ga4_1.getAnalyticsData)(propertyId, tempClient, selectedRange);
        const formattedData = (0, ga4_1.formatAnalytics)(rawData);
        res.json(formattedData);
    }
    catch (error) {
        console.error("GA4 Overview Error:", error.message);
        res.status(500).json({ error: 'Failed to fetch GA4 overview' });
    }
};
exports.getGa4Overview = getGa4Overview;
const googleLogin = (req, res) => {
    try {
        const oauth2Client = new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, `http://localhost:5000/api/analytics/auth/google/callback`);
        const url = oauth2Client.generateAuthUrl({
            access_type: "offline",
            prompt: "consent",
            scope: [
                "https://www.googleapis.com/auth/analytics.readonly",
                "https://www.googleapis.com/auth/userinfo.email",
                "https://www.googleapis.com/auth/userinfo.profile"
            ],
        });
        return res.redirect(url);
    }
    catch (error) {
        console.error("Google Login Error:", error.message);
        res.status(500).json({ error: "Failed to initiate Google login" });
    }
};
exports.googleLogin = googleLogin;
const googleCallback = async (req, res) => {
    try {
        const { code } = req.query;
        if (!code) {
            return res.status(400).send("Invalid request");
        }
        const oauth2Client = new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, `http://localhost:5000/api/analytics/auth/google/callback`);
        const { tokens } = await oauth2Client.getToken(code);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        if (tokens.refresh_token) {
            return res.redirect(`${frontendUrl}/dashboard/settings?connect=true&refreshToken=${tokens.refresh_token}`);
        }
        else {
            return res.redirect(`${frontendUrl}/dashboard/settings?error=no_refresh_token`);
        }
    }
    catch (error) {
        console.error("Google Callback Error:", error.message);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(`${frontendUrl}/dashboard/settings?error=google_auth_failed`);
    }
};
exports.googleCallback = googleCallback;
