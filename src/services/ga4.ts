import { google } from "googleapis";

const DATE_RANGES: Record<string, { startDate: string; endDate: string }> = {
  today: { startDate: "today", endDate: "today" },
  yesterday: { startDate: "yesterday", endDate: "yesterday" },
  weekly: { startDate: "7daysAgo", endDate: "today" },
  monthly: { startDate: "30daysAgo", endDate: "today" },
};

export const getAnalyticsData = async (
  propertyId: string,
  client: any,
  range: string = "weekly",
  customStart: string | null = null,
  customEnd: string | null = null
) => {
  const analyticsData = google.analyticsdata({ version: "v1beta", auth: client });

  const dateRange =
    range === "custom" && customStart && customEnd
      ? { startDate: customStart, endDate: customEnd }
      : DATE_RANGES[range] || DATE_RANGES.weekly;

  const propertyName = propertyId.startsWith('properties/') ? propertyId : `properties/${propertyId}`;

  const [
    report,
    devices,
    countries,
    sources,
    pages,
    realtime,
    trend,
    newReturning,
    browsers,
    operatingSystems,
  ] = await Promise.all([
    // Core metrics
    analyticsData.properties.runReport({
      property: propertyName,
      requestBody: {
        dateRanges: [dateRange],
        metrics: [
          { name: "totalUsers" },
          { name: "sessions" },
          { name: "bounceRate" },
          { name: "averageSessionDuration" },
          { name: "screenPageViewsPerSession" },
          { name: "engagedSessions" },
        ],
      },
    }),
    // Devices
    analyticsData.properties.runReport({
      property: propertyName,
      requestBody: {
        dateRanges: [dateRange],
        dimensions: [{ name: "deviceCategory" }],
        metrics: [{ name: "totalUsers" }],
      },
    }),
    // Countries
    analyticsData.properties.runReport({
      property: propertyName,
      requestBody: {
        dateRanges: [dateRange],
        dimensions: [{ name: "country" }],
        metrics: [{ name: "totalUsers" }],
        limit: "50",
        orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
      },
    }),
    // Sources
    analyticsData.properties.runReport({
      property: propertyName,
      requestBody: {
        dateRanges: [dateRange],
        dimensions: [{ name: "sessionSource" }],
        metrics: [{ name: "sessions" }],
      },
    }),
    // Pages
    analyticsData.properties.runReport({
      property: propertyName,
      requestBody: {
        dateRanges: [dateRange],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }],
        limit: "25",
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      },
    }),
    // Realtime
    analyticsData.properties.runRealtimeReport({
      property: propertyName,
      requestBody: {
        dimensions: [
          { name: "unifiedScreenName" },
          { name: "country" },
          { name: "city" },
          { name: "deviceCategory" },
        ],
        metrics: [{ name: "activeUsers" }],
        limit: "100",
      },
    }),
    // Trend
    analyticsData.properties.runReport({
      property: propertyName,
      requestBody: {
        dateRanges: [dateRange],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "totalUsers" }, { name: "sessions" }],
        orderBys: [{ dimension: { dimensionName: "date" } }],
        limit: "366",
      },
    }),
    // New vs Returning
    analyticsData.properties.runReport({
      property: propertyName,
      requestBody: {
        dateRanges: [dateRange],
        dimensions: [{ name: "newVsReturning" }],
        metrics: [{ name: "totalUsers" }],
      },
    }),
    // Browsers
    analyticsData.properties.runReport({
      property: propertyName,
      requestBody: {
        dateRanges: [dateRange],
        dimensions: [{ name: "browser" }],
        metrics: [{ name: "totalUsers" }],
        limit: "20",
        orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
      },
    }),
    // OS
    analyticsData.properties.runReport({
      property: propertyName,
      requestBody: {
        dateRanges: [dateRange],
        dimensions: [{ name: "operatingSystem" }],
        metrics: [{ name: "totalUsers" }],
        limit: "20",
        orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
      },
    }),
  ]);

  return {
    report: report.data,
    devices: devices.data,
    countries: countries.data,
    sources: sources.data,
    pages: pages.data,
    realtime: realtime.data,
    trend: trend.data,
    newReturning: newReturning.data,
    browsers: browsers.data,
    operatingSystems: operatingSystems.data,
  };
};

export function formatAnalytics(data: any) {
  const newReturning = { new: 0, returning: 0 };
  (data?.newReturning?.rows || []).forEach((row: any) => {
    const type = (row.dimensionValues?.[0]?.value || "").toLowerCase().trim();
    const count = Number(row.metricValues?.[0]?.value || 0);
    if (type === "new" || type.startsWith("new")) newReturning.new += count;
    else newReturning.returning += count;
  });
  const canonicalTotal = newReturning.new + newReturning.returning;

  const reportRows = data?.report?.rows || [];
  let sessions = 0, engagedSessions = 0;
  let bounceRate = 0, avgSessionDuration = 0, pagesPerSession = 0;

  reportRows.forEach((row: any) => {
    sessions += Number(row.metricValues?.[1]?.value || 0);
    engagedSessions += Number(row.metricValues?.[5]?.value || 0);
  });
  if (reportRows.length > 0) {
    bounceRate = parseFloat(reportRows[0]?.metricValues?.[2]?.value || 0) * 100;
    avgSessionDuration = parseFloat(reportRows[0]?.metricValues?.[3]?.value || 0);
    pagesPerSession = parseFloat(reportRows[0]?.metricValues?.[4]?.value || 0);
  }

  const devices: any = {};
  (data?.devices?.rows || []).forEach((row: any) => {
    const k = row.dimensionValues?.[0]?.value || "Unknown";
    devices[k] = Number(row.metricValues?.[0]?.value || 0);
  });

  const countries: any = {};
  (data?.countries?.rows || []).forEach((row: any) => {
    const k = row.dimensionValues?.[0]?.value || "Unknown";
    if (k !== "(not set)") countries[k] = Number(row.metricValues?.[0]?.value || 0);
  });

  const trafficSources: any = {};
  (data?.sources?.rows || []).forEach((row: any) => {
    const s = row.dimensionValues?.[0]?.value || "Direct";
    if (s !== "(not set)") trafficSources[s] = Number(row.metricValues?.[0]?.value || 0);
  });

  const topPages = (data?.pages?.rows || []).map((row: any) => ({
    page: row.dimensionValues?.[0]?.value || "/",
    views: Number(row.metricValues?.[0]?.value || 0),
  }));

  const rtRows = data?.realtime?.rows || [];
  const realtimeUsers = rtRows.reduce((s: number, r: any) => s + Number(r.metricValues?.[0]?.value || 0), 0);
  
  const rtByPage: any = {};
  const rtByCountry: any = {};
  const rtByDevice: any = {};
  rtRows.forEach((row: any) => {
    const screen = row.dimensionValues?.[0]?.value || "Unknown";
    const country = row.dimensionValues?.[1]?.value || "Unknown";
    const device = row.dimensionValues?.[3]?.value || "Unknown";
    const users = Number(row.metricValues?.[0]?.value || 0);

    rtByPage[screen] = (rtByPage[screen] || 0) + users;
    if (country !== "(not set)") rtByCountry[country] = (rtByCountry[country] || 0) + users;
    rtByDevice[device] = (rtByDevice[device] || 0) + users;
  });
  
  const sortDesc = (obj: any) => Object.entries(obj).map(([name, users]) => ({ name, users })).sort((a: any, b: any) => b.users - a.users);

  const newRatio = canonicalTotal > 0 ? newReturning.new / canonicalTotal : 0;
  const returningRatio = canonicalTotal > 0 ? newReturning.returning / canonicalTotal : 0;

  const trend = (data?.trend?.rows || []).map((row: any) => {
    const raw = row.dimensionValues?.[0]?.value || "";
    const d = raw.length === 8 ? new Date(`${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`) : new Date();
    const dayUsers = Number(row.metricValues?.[0]?.value || 0);
    const daySessions = Number(row.metricValues?.[1]?.value || 0);
    return {
      date: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      users: dayUsers,
      sessions: daySessions,
      newUsers: Math.round(dayUsers * newRatio),
      returningUsers: Math.round(dayUsers * returningRatio),
    };
  });

  const browsers: any = {};
  (data?.browsers?.rows || []).forEach((row: any) => {
    const k = row.dimensionValues?.[0]?.value || "Unknown";
    if (k !== "(not set)") browsers[k] = Number(row.metricValues?.[0]?.value || 0);
  });

  const operatingSystems: any = {};
  (data?.operatingSystems?.rows || []).forEach((row: any) => {
    const k = row.dimensionValues?.[0]?.value || "Unknown";
    if (k !== "(not set)") operatingSystems[k] = Number(row.metricValues?.[0]?.value || 0);
  });

  return {
    users: canonicalTotal,
    sessions,
    bounceRate,
    avgSessionDuration,
    pagesPerSession,
    engagedUsers: engagedSessions,
    realtimeUsers,
    realtimeDetail: {
      byPage: sortDesc(rtByPage),
      byCountry: sortDesc(rtByCountry),
      byDevice: sortDesc(rtByDevice),
    },
    countries,
    devices,
    trafficSources,
    topPages,
    trend,
    newReturning,
    browsers,
    operatingSystems,
  };
}
