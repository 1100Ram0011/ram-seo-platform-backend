import { Request, Response } from 'express';
import { google } from 'googleapis';
import { getAnalyticsData, formatAnalytics } from '../services/ga4';

export const getGa4Properties = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: "Missing refresh token" });

    const tempClient = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    tempClient.setCredentials({ refresh_token: refreshToken });

    const analyticsAdmin = google.analyticsadmin({ version: "v1beta", auth: tempClient });
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
  } catch (error: any) {
    console.error("GA4 Properties Error:", error.message);
    res.status(500).json({ error: "Failed to fetch properties" });
  }
};

export const getGa4Overview = async (req: Request, res: Response) => {
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

    const tempClient = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    tempClient.setCredentials({ refresh_token: refreshToken });

    const selectedRange = (range as string) || "weekly";

    const rawData = await getAnalyticsData(propertyId, tempClient, selectedRange);
    const formattedData = formatAnalytics(rawData);

    res.json(formattedData);
  } catch (error: any) {
    console.error("GA4 Overview Error:", error.message);
    res.status(500).json({ error: 'Failed to fetch GA4 overview' });
  }
};

export const googleLogin = (req: Request, res: Response) => {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/analytics/auth/google/callback`
    );

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
  } catch (error: any) {
    console.error("Google Login Error:", error.message);
    res.status(500).json({ error: "Failed to initiate Google login" });
  }
};

export const googleCallback = async (req: Request, res: Response) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).send("Invalid request");
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/analytics/auth/google/callback`
    );

    const { tokens } = await oauth2Client.getToken(code as string);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    if (tokens.refresh_token) {
      return res.redirect(`${frontendUrl}/dashboard/settings?connect=true&refreshToken=${tokens.refresh_token}`);
    } else {
      return res.redirect(`${frontendUrl}/dashboard/settings?error=no_refresh_token`);
    }
  } catch (error: any) {
    console.error("Google Callback Error:", error.message);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/dashboard/settings?error=google_auth_failed`);
  }
};
