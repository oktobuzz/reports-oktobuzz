// ULTRA ROBUST VERSION 2.0
function doPost(e) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var logs = ss.getSheetByName("Logs");
    if (!logs) logs = ss.insertSheet("Logs");
    logs.appendRow([new Date(), "Starting Sync..."]);

    try {
        if (!e || !e.postData || !e.postData.contents) {
            logs.appendRow([new Date(), "Error: No Post Data received"]);
            return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": "No data" }));
        }

        var params = JSON.parse(e.postData.contents);

        // 1. INSTAGRAM POSTS
        try {
            if (params.instagram_posts && params.instagram_posts.length > 0) {
                logs.appendRow([new Date(), "Processing IG Posts: " + params.instagram_posts.length]);
                appendInstagramPosts(ss, params.week_label, params.instagram_posts);
            } else {
                logs.appendRow([new Date(), "Skipping IG Posts (Empty)"]);
            }
        } catch (err) {
            logs.appendRow([new Date(), "ERROR IG Posts: " + err.toString()]);
        }

        // 2. INSTAGRAM STORIES
        try {
            if (params.instagram_stories && params.instagram_stories.length > 0) {
                logs.appendRow([new Date(), "Processing IG Stories: " + params.instagram_stories.length]);
                appendInstagramStories(ss, params.week_label, params.instagram_stories);
            } else {
                logs.appendRow([new Date(), "Skipping IG Stories (Empty)"]);
            }
        } catch (err) {
            logs.appendRow([new Date(), "ERROR IG Stories: " + err.toString()]);
        }

        // 3. FACEBOOK POSTS
        try {
            if (params.facebook_posts && params.facebook_posts.length > 0) {
                logs.appendRow([new Date(), "Processing FB Posts: " + params.facebook_posts.length]);
                appendFacebookPosts(ss, params.week_label, params.facebook_posts);
            } else {
                logs.appendRow([new Date(), "Skipping FB Posts (Empty)"]);
            }
        } catch (err) {
            logs.appendRow([new Date(), "ERROR FB Posts: " + err.toString()]);
        }

        // 4. FACEBOOK STORIES
        try {
            if (params.facebook_stories && params.facebook_stories.length > 0) {
                logs.appendRow([new Date(), "Processing FB Stories: " + params.facebook_stories.length]);
                appendFacebookStories(ss, params.week_label, params.facebook_stories);
            } else {
                logs.appendRow([new Date(), "Skipping FB Stories (Empty)"]);
            }
        } catch (err) {
            logs.appendRow([new Date(), "ERROR FB Stories: " + err.toString()]);
        }

        // 5. OVERALL ANALYSIS
        try {
            if (params.overall_stats) {
                logs.appendRow([new Date(), "Processing Overall Analysis"]);
                appendOverall(ss, params.week_label, params.overall_stats);
            }
        } catch (err) {
            logs.appendRow([new Date(), "ERROR Overall: " + err.toString()]);
        }

        logs.appendRow([new Date(), "Sync Completed Successfully"]);
        return ContentService.createTextOutput(JSON.stringify({ "status": "success", "message": "Logged to sheet" }))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        logs.appendRow([new Date(), "FATAL ERROR: " + error.toString()]);
        return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

// -------------------------------------------------------------
function getDayName(dateStr) {
    try {
        if (!dateStr) return "";
        var d = new Date(dateStr.replace(/-/g, "/"));
        if (isNaN(d.getTime())) return "Invalid Date";
        var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[d.getDay()];
    } catch (e) { return "Error"; }
}

function safeInt(val) {
    return parseInt(val) || 0;
}

// -------------------------------------------------------------
// HELPER: Format Header Row
function formatHeaderRow(sheet, row, headers) {
    var range = sheet.getRange(row, 1, 1, headers.length);
    range.setValues([headers]);
    range.setBackground("#FF9900");
    range.setFontWeight("bold");
    range.setHorizontalAlignment("center");
    range.setBorder(true, true, true, true, true, true);
}

// HELPER: Format Total Row
function formatTotalRow(sheet, row, totalData) {
    var range = sheet.getRange(row, 1, 1, totalData.length);
    range.setValues([totalData]);
    range.setFontWeight("bold");
    range.setBackground("#EEEEEE");
    range.setBorder(true, true, true, true, true, true);
}

// -------------------------------------------------------------
// 1. INSTAGRAM POSTS
function appendInstagramPosts(ss, weekLabel, posts) {
    var sheet = ss.getSheetByName("Instagram");
    if (!sheet) sheet = ss.insertSheet("Instagram");

    var lastRow = sheet.getLastRow();
    var startRow = lastRow + (lastRow === 0 ? 1 : 2);
    var headers = ["Week", "Date", "Day", "Type", "Views", "Likes", "Comments", "Shares", "Saves", "Total Interactions", "Reach", "Profile Visits", "Website", "Categorywise", "Link"];
    formatHeaderRow(sheet, startRow, headers);

    var rows = [];
    var tViews = 0, tLikes = 0, tComments = 0, tShares = 0, tSaves = 0, tInteractions = 0, tReach = 0;

    posts.forEach(function (p, index) {
        var inter = (safeInt(p.likes) + safeInt(p.comments) + safeInt(p.shares) + safeInt(p.saves));
        rows.push([
            index === 0 ? weekLabel : "",
            p.publish_time ? p.publish_time.split(' ')[0] : "",
            getDayName(p.publish_time),
            p.post_type || "",
            safeInt(p.views), safeInt(p.likes), safeInt(p.comments), safeInt(p.shares), safeInt(p.saves), inter, safeInt(p.reach),
            "", "", "", p.permalink || ""
        ]);
        tViews += safeInt(p.views); tLikes += safeInt(p.likes); tComments += safeInt(p.comments); tShares += safeInt(p.shares);
        tSaves += safeInt(p.saves); tInteractions += inter; tReach += safeInt(p.reach);
    });

    if (rows.length > 0) {
        sheet.getRange(startRow + 1, 1, rows.length, rows[0].length).setValues(rows);
        var totalRowIdx = startRow + 1 + rows.length;
        var totalData = ["", "", "", "Total", tViews, tLikes, tComments, tShares, tSaves, tInteractions, tReach, "", "", "", ""];
        formatTotalRow(sheet, totalRowIdx, totalData);
    }
}

// -------------------------------------------------------------
// 2. INSTAGRAM STORIES
function appendInstagramStories(ss, weekLabel, stories) {
    var sheet = ss.getSheetByName("Instagram stories");
    if (!sheet) sheet = ss.insertSheet("Instagram stories");

    var lastRow = sheet.getLastRow();
    var startRow = lastRow + (lastRow === 0 ? 1 : 2);
    var headers = ["Week", "Day", "Date", "Views", "Reach", "Likes", "Sticker taps", "Replies", "Total Interactions", "Remarks"];
    formatHeaderRow(sheet, startRow, headers);

    var rows = [];
    var tViews = 0, tReach = 0, tLikes = 0, tTaps = 0, tReplies = 0, tInteractions = 0;

    stories.forEach(function (s, index) {
        var tap = s.sticker_taps || 0;
        var inter = (safeInt(s.likes) + safeInt(s.replies) + safeInt(tap));
        rows.push([
            index === 0 ? weekLabel : "",
            getDayName(s.publish_time),
            s.publish_time || "",
            safeInt(s.views), safeInt(s.reach), safeInt(s.likes), safeInt(tap), safeInt(s.replies), inter, ""
        ]);
        tViews += safeInt(s.views); tReach += safeInt(s.reach); tLikes += safeInt(s.likes); tTaps += safeInt(tap); tReplies += safeInt(s.replies); tInteractions += inter;
    });

    if (rows.length > 0) {
        sheet.getRange(startRow + 1, 1, rows.length, rows[0].length).setValues(rows);
        var totalRowIdx = startRow + 1 + rows.length;
        var totalData = ["", "", "Total", tViews, tReach, tLikes, tTaps, tReplies, tInteractions, ""];
        formatTotalRow(sheet, totalRowIdx, totalData);
    }
}

// -------------------------------------------------------------
// 3. FACEBOOK POSTS
function appendFacebookPosts(ss, weekLabel, posts) {
    var sheet = ss.getSheetByName("Facebook");
    if (!sheet) sheet = ss.insertSheet("Facebook");

    var lastRow = sheet.getLastRow();
    var startRow = lastRow + (lastRow === 0 ? 1 : 2);
    var headers = ["Week", "Day", "Date", "Type", "Reach", "Likes", "Comments", "Share", "Link clicks", "Engagement", "Video views", "Brandwise", "Category", "Link"];
    formatHeaderRow(sheet, startRow, headers);

    var rows = [];
    var tReach = 0, tLikes = 0, tComments = 0, tShares = 0, tClicks = 0, tEng = 0, tViews = 0;

    posts.forEach(function (p, index) {
        var eng = (safeInt(p.likes) + safeInt(p.comments) + safeInt(p.shares) + safeInt(p.link_clicks));
        rows.push([
            index === 0 ? weekLabel : "",
            getDayName(p.publish_time),
            p.publish_time ? p.publish_time.split(' ')[0] : "",
            p.post_type || "",
            safeInt(p.reach), safeInt(p.likes), safeInt(p.comments), safeInt(p.shares), safeInt(p.link_clicks), eng, safeInt(p.views),
            "", "", p.permalink || ""
        ]);
        tReach += safeInt(p.reach); tLikes += safeInt(p.likes); tComments += safeInt(p.comments); tShares += safeInt(p.shares); tClicks += safeInt(p.link_clicks); tEng += eng; tViews += safeInt(p.views);
    });

    if (rows.length > 0) {
        sheet.getRange(startRow + 1, 1, rows.length, rows[0].length).setValues(rows);
        var totalRowIdx = startRow + 1 + rows.length;
        var totalData = ["", "", "", "Total", tReach, tLikes, tComments, tShares, tClicks, tEng, tViews, "", "", ""];
        formatTotalRow(sheet, totalRowIdx, totalData);
    }
}

// -------------------------------------------------------------
// 4. FACEBOOK STORIES
function appendFacebookStories(ss, weekLabel, stories) {
    var sheet = ss.getSheetByName("Facebook stories");
    if (!sheet) sheet = ss.insertSheet("Facebook stories");

    var lastRow = sheet.getLastRow();
    var startRow = lastRow + (lastRow === 0 ? 1 : 2);
    var headers = ["Week", "Day", "Date", "Views", "Reach", "Likes", "Shares", "Replies", "Link Clicks", "Interactions", "Remarks"];
    formatHeaderRow(sheet, startRow, headers);

    var rows = [];
    var tViews = 0, tReach = 0, tLikes = 0, tShares = 0, tReplies = 0, tClicks = 0, tInter = 0;

    stories.forEach(function (s, index) {
        rows.push([
            index === 0 ? weekLabel : "",
            getDayName(s.date),
            s.date || "",
            safeInt(s.views), safeInt(s.reach), safeInt(s.likes), safeInt(s.shares), safeInt(s.replies), safeInt(s.link_clicks), safeInt(s.interactions), ""
        ]);
        tViews += safeInt(s.views); tReach += safeInt(s.reach); tLikes += safeInt(s.likes); tShares += safeInt(s.shares); tReplies += safeInt(s.replies); tClicks += safeInt(s.link_clicks); tInter += safeInt(s.interactions);
    });

    if (rows.length > 0) {
        sheet.getRange(startRow + 1, 1, rows.length, rows[0].length).setValues(rows);
        var totalRowIdx = startRow + 1 + rows.length;
        var totalData = ["", "", "Total", tViews, tReach, tLikes, tShares, tReplies, tClicks, tInter, ""];
        formatTotalRow(sheet, totalRowIdx, totalData);
    }
}

// -------------------------------------------------------------
// 5. OVERALL ANALYSIS
function appendOverall(ss, weekLabel, stats) {
    var sheet = ss.getSheetByName("Overall Analysis");
    if (!sheet) sheet = ss.insertSheet("Overall Analysis");
    if (sheet.getLastRow() === 0) {
        formatHeaderRow(sheet, 1, ["Week", "Date Range", "Total Reach", "Total Engagement", "IG Followers", "FB Followers"]);
    }
    var row = [weekLabel, stats.date_range, stats.total_reach, stats.total_engagement, stats.ig_followers, stats.fb_followers];
    sheet.appendRow(row);
}
