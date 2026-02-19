import React, { useState, useMemo } from 'react';
import axios from 'axios';
import {
    Upload, FileUp, Calendar, BarChart3,
    TrendingUp, Eye, MessageCircle, Share2,
    Layers, Instagram, Facebook, Download, RefreshCcw, BookImage,
    AlertCircle, CheckCircle2, ArrowRight, Database, Cpu, FileSpreadsheet,
    ArrowDown, ArrowUp, Table, Search, Youtube, ExternalLink, UserPlus, MousePointerClick,
    PlusCircle
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        return date.toLocaleString('en-GB', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', '');
    } catch (e) {
        return dateStr;
    }
};

function App() {
    const [fbPostFiles, setFbPostFiles] = useState([]);
    const [igPostFiles, setIgPostFiles] = useState([]);
    const [igStoryFiles, setIgStoryFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState(null);
    const [processingStep, setProcessingStep] = useState('');

    // Manual Facebook Data State
    const [manualFbReach, setManualFbReach] = useState('');
    const [manualFbInteractions, setManualFbInteractions] = useState('');
    const [manualFbStoryCount, setManualFbStoryCount] = useState('');
    const [manualFbStoryViews, setManualFbStoryViews] = useState(''); // NEW: Manual Views
    const [manualFbStoriesJson, setManualFbStoriesJson] = useState(''); // NEW: For raw JSON from parser

    // Sheet Sync State
    const [showSyncModal, setShowSyncModal] = useState(false);
    const [syncWeekLabel, setSyncWeekLabel] = useState('');
    const [manualIgFollowers, setManualIgFollowers] = useState('');
    const [manualFbFollowers, setManualFbFollowers] = useState('');
    const [scriptUrl, setScriptUrl] = useState(localStorage.getItem('script_url') || '');
    const [syncStatus, setSyncStatus] = useState('');

    // Track which posts have been manually edited so they remain editable
    const [editedPostIds, setEditedPostIds] = useState(new Set());

    // Default range: Last 90 days
    const today = new Date().toISOString().split('T')[0];
    const lastQuarter = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(lastQuarter);
    const [endDate, setEndDate] = useState(today);

    const canUpload = fbPostFiles.length > 0 || igPostFiles.length > 0 || igStoryFiles.length > 0;

    const uploadFiles = async () => {
        if (!canUpload) {
            alert('Please select files to upload.');
            return;
        }

        setLoading(true);
        try {
            if (fbPostFiles.length > 0) {
                setProcessingStep('Uploading Facebook Posts...');
                const formData = new FormData();
                fbPostFiles.forEach(f => formData.append('files', f));
                await axios.post(`${API_URL}/upload/facebook`, formData);
            }

            if (igPostFiles.length > 0) {
                setProcessingStep('Uploading Instagram Posts...');
                const formData = new FormData();
                igPostFiles.forEach(f => formData.append('files', f));
                await axios.post(`${API_URL}/upload/instagram`, formData);
            }

            if (igStoryFiles.length > 0) {
                setProcessingStep('Uploading Instagram Stories...');
                const formData = new FormData();
                igStoryFiles.forEach(f => formData.append('files', f));
                await axios.post(`${API_URL}/upload/stories`, formData);
            }

            setProcessingStep('Calculating metrics...');
            const res = await axios.get(`${API_URL}/report`, {
                params: {
                    start_date: startDate,
                    end_date: endDate,
                    fb_story_views: manualFbStoryViews || 0
                }
            });
            setReport(res.data);
            setProcessingStep('');
            // Reset edited IDs on new report generation
            setEditedPostIds(new Set());

        } catch (error) {
            console.error(error);
            alert("Error processing files. Check console.");
            setProcessingStep('');
        } finally {
            setLoading(false);
        }
    };

    const handleSyncClick = () => {
        if (!report) return;

        // Auto-generate label: "13th Jan - 19th Jan"
        const s = new Date(startDate);
        const e = new Date(endDate);
        // Helper to add 'th', 'st', 'nd'
        const getNth = (d) => {
            if (d > 3 && d < 21) return 'th';
            switch (d % 10) {
                case 1: return "st";
                case 2: return "nd";
                case 3: return "rd";
                default: return "th";
            }
        };
        const sDay = s.getDate();
        const eDay = e.getDate();
        const label = `${sDay}${getNth(sDay)} ${s.toLocaleString('default', { month: 'short' })} - ${eDay}${getNth(eDay)} ${e.toLocaleString('default', { month: 'short' })}`;

        setSyncWeekLabel(label);
        setShowSyncModal(true);
        setSyncStatus('');
    };

    const executeSync = async () => {
        if (!scriptUrl) {
            alert("Please enter your Google Script URL");
            return;
        }
        localStorage.setItem('script_url', scriptUrl);
        setSyncStatus('Syncing...');

        try {
            // Parse Manual Story Data
            let fbStoriesData = [];
            if (manualFbStoriesJson) {
                try {
                    fbStoriesData = JSON.parse(manualFbStoriesJson);
                } catch (e) {
                    alert("Invalid JSON in Facebook Stories box. Please copy accurately from the Parser tool.");
                    setSyncStatus('');
                    return;
                }
            } else {
                if (!confirm("⚠️ Warning: No Facebook Stories Data provided. The 'Facebook Stories' sheet will be empty. Continue?")) {
                    setSyncStatus('');
                    return;
                }
            }

            // Prepare Payload
            const payload = {
                script_url: scriptUrl,
                week_label: syncWeekLabel,

                // 1. Instagram Posts
                instagram_posts: report.instagram.posts,

                // 2. Instagram Stories (Use raw data but ensure publish_time is formatted in backend or use raw)
                instagram_stories: report.stories.data,

                // 3. Facebook Posts
                facebook_posts: report.facebook.posts,

                // 4. Facebook Stories (Parsed from Manual JSON)
                facebook_stories: fbStoriesData,

                // 5. Overall Analysis
                overall_stats: {
                    date_range: `${startDate} to ${endDate}`,
                    // Use Aggregated Data (Top Cards) to match Dashboard numbers perfectly
                    total_reach: (report.aggregated.instagram.total_reach + (finalFacebookData?.total_reach || report.aggregated.facebook.total_reach)),
                    total_engagement: (report.aggregated.instagram.total_engagement + (finalFacebookData?.total_engagement || report.aggregated.facebook.total_engagement)),
                    ig_followers: manualIgFollowers,
                    fb_followers: manualFbFollowers
                }
            };

            const res = await axios.post(`${API_URL}/sync-sheet`, payload);
            console.log(res.data);
            setSyncStatus('✅ Sync Complete!');
            setTimeout(() => setShowSyncModal(false), 2000);

        } catch (error) {
            console.error(error);
            setSyncStatus('❌ Sync Failed. Check console.');
        }
    };

    const clearData = async () => {
        await axios.post(`${API_URL}/clear`);
        setReport(null);
        setFbPostFiles([]);
        setIgPostFiles([]);
        setIgStoryFiles([]);
        setManualFbReach('');
        setManualFbInteractions('');
        setEditedPostIds(new Set());
    };

    const handleUpdatePostReach = (platform, postId, newReach) => {
        if (!report) return;

        const newReport = { ...report };
        const posts = [...newReport[platform].posts];
        const index = posts.findIndex(p => p.post_id === postId);

        if (index === -1) return;

        // Update the specific post
        const oldReach = posts[index].reach;
        posts[index] = {
            ...posts[index],
            reach: newReach,
            engagement_rate: newReach > 0 ? (posts[index].total_engagement / newReach) : 0
        };

        // Mark as edited
        setEditedPostIds(prev => new Set(prev).add(postId));

        // Recalculate Platform Stats
        const totalReach = posts.reduce((sum, p) => sum + p.reach, 0);
        const totalEngagement = posts.reduce((sum, p) => sum + p.total_engagement, 0);
        const totalViews = posts.reduce((sum, p) => sum + p.views, 0);

        const newStats = {
            ...newReport[platform].stats,
            total_reach: totalReach,
            avg_engagement_rate_reach: totalReach > 0 ? (totalEngagement / totalReach) : 0
        };

        // Recalculate Rankings
        const bestReach = [...posts].sort((a, b) => b.reach - a.reach)[0];
        // Keep leastReach calculation implicitly, but usually 0 reaches affect this heavily.

        newReport[platform] = {
            ...newReport[platform],
            posts: posts,
            stats: newStats,
            rankings: {
                ...newReport[platform].rankings,
                best_reach: bestReach,
                // We don't strictly need to re-sort least reach for the card if it's not critical, but let's do it for consistency
                least_reach: [...posts].sort((a, b) => a.reach - b.reach)[0]
            }
        };

        // Recalculate Aggregated Table
        if (newReport.aggregated && newReport.aggregated[platform]) {
            const oldAgg = newReport.aggregated[platform];
            const deltaReach = newReach - oldReach;
            const newTotalReach = oldAgg.total_reach + deltaReach;

            const erWithViews = newTotalReach > 0 ? (oldAgg.total_engagement / newTotalReach) * 100 : 0;
            const erWoViews = newTotalReach > 0 ? (oldAgg.interactions_wo_views / newTotalReach) * 100 : 0;
            const vvRate = newTotalReach > 0 ? (oldAgg.total_views / newTotalReach) * 100 : 0;

            newReport.aggregated[platform] = {
                ...oldAgg,
                total_reach: newTotalReach,
                eng_rate_with_views: erWithViews,
                eng_rate_wo_views: erWoViews,
                video_view_rate: vvRate
            };
        }

        setReport(newReport);
    };

    // AUGMENTED FACEBOOK DATA
    const finalFacebookData = useMemo(() => {
        if (!report || !report.aggregated) return null;

        const base = report.aggregated.facebook;
        const addedReach = parseInt(manualFbReach) || 0;
        const addedInteractions = parseInt(manualFbInteractions) || 0;

        const newTotalReach = base.total_reach + addedReach;
        const newInteractionsWoViews = base.interactions_wo_views + addedInteractions;
        const newTotalEngagement = base.total_engagement + addedInteractions;

        const newEngRateWithViews = newTotalReach > 0 ? (newTotalEngagement / newTotalReach) * 100 : 0;
        const newEngRateWoViews = newTotalReach > 0 ? (newInteractionsWoViews / newTotalReach) * 100 : 0;
        const newVideoViewRate = newTotalReach > 0 ? (base.total_views / newTotalReach) * 100 : 0;

        const postCount = report.facebook.stats.total_posts;
        const newAvgInteraction = postCount > 0 ? (newInteractionsWoViews / postCount) : 0;

        return {
            ...base,
            total_reach: newTotalReach,
            total_engagement: newTotalEngagement,
            interactions_wo_views: newInteractionsWoViews,
            eng_rate_with_views: newEngRateWithViews,
            eng_rate_wo_views: newEngRateWoViews,
            video_view_rate: newVideoViewRate,
            average_interaction: newAvgInteraction
        };
    }, [report, manualFbReach, manualFbInteractions]);


    const downloadCSV = () => {
        if (!report) return;

        // ... csv logic (omitted for brevity in memory, but included in full file write below)
        const csvSafe = (str) => `"${String(str || '').replace(/"/g, '""')}"`;
        let csvContent = "data:text/csv;charset=utf-8,";

        csvContent += `Report Period,${startDate} to ${endDate}\n\n`;

        // AGGREGATED TABLES
        if (report.aggregated) {
            // Instagram
            csvContent += "INSTAGRAM WEEKLY PARTICULARS\n";
            const ig = report.aggregated.instagram;
            csvContent += `Total Reach,${ig.total_reach}\n`;
            csvContent += `Total Engagement,${ig.total_engagement}\n`;
            csvContent += `Total Views,${ig.total_views}\n`;
            csvContent += `Interactions (w/o Views),${ig.interactions_wo_views}\n`;
            csvContent += `Eng Rate (with Views),${ig.eng_rate_with_views.toFixed(2)}%\n`;
            csvContent += `Eng Rate (w/o Views),${ig.eng_rate_wo_views.toFixed(2)}%\n`;
            csvContent += `Video View Rate,${ig.video_view_rate.toFixed(2)}%\n`;
            csvContent += `Avg Interaction,${ig.average_interaction.toFixed(2)}\n\n`;

            // Facebook
            csvContent += "FACEBOOK WEEKLY PARTICULARS (With Manual Story Data)\n";
            const fb = finalFacebookData || report.aggregated.facebook;
            csvContent += `Total Reach,${fb.total_reach}\n`;
            csvContent += `Total Engagement,${fb.total_engagement}\n`;
            csvContent += `Total Views,${fb.total_views}\n`;
            csvContent += `Interactions (w/o Views),${fb.interactions_wo_views}\n`;
            csvContent += `Eng Rate (with Views),${fb.eng_rate_with_views.toFixed(2)}%\n`;
            csvContent += `Eng Rate (w/o Views),${fb.eng_rate_wo_views.toFixed(2)}%\n`;
            csvContent += `Video View Rate,${fb.video_view_rate.toFixed(2)}%\n`;
            csvContent += `Avg Interaction,${fb.average_interaction.toFixed(2)}\n\n`;
        }

        // FACEBOOK POSTS
        csvContent += "FACEBOOK POSTS DETAIL\n";
        csvContent += "Date,Post ID,Type,Description,Reach,Views,Likes,Comments,Shares,Total Eng,Eng Rate,Link\n";
        report.facebook.posts.forEach(p => {
            csvContent += `${p.publish_time},${p.post_id},${p.post_type},${csvSafe(p.description)},${p.reach},${p.views},${p.likes},${p.comments},${p.shares},${p.total_engagement},${(p.engagement_rate * 100).toFixed(2)}%,${p.permalink}\n`
        });
        csvContent += "\n";

        // INSTAGRAM POSTS
        csvContent += "INSTAGRAM POSTS DETAIL\n";
        csvContent += "Date,Post ID,Type,Description,Reach,Views,Likes,Comments,Shares,Saves,Total Eng,Eng Rate,Link\n";
        report.instagram.posts.forEach(p => {
            csvContent += `${p.publish_time},${p.post_id},${p.post_type},${csvSafe(p.description)},${p.reach},${p.views},${p.likes},${p.comments},${p.shares},${p.saves},${p.total_engagement},${(p.engagement_rate * 100).toFixed(2)}%,${p.permalink}\n`
        });
        csvContent += "\n";

        // STORIES
        csvContent += "INSTAGRAM STORIES DETAIL\n";
        csvContent += "Date,Post ID,Reach,Views,Likes,Shares,Replies,Link Clicks,Link\n";
        report.stories.data.forEach(s => {
            csvContent += `${s.publish_time},${s.post_id},${s.reach},${s.views},${s.likes},${s.shares},${s.replies},${s.link_clicks},${s.permalink}\n`
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `meta_report_split_${startDate}_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 font-sans p-4 md:p-8">
            <div className="max-w-7xl mx-auto">

                {/* HEADER */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-slate-800 pb-6">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl shadow-2xl">
                            <BarChart3 className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                                Meta Analytics Engine (Beta)
                            </h1>
                            <p className="text-slate-500 text-sm">Last 90 Days Analysis</p>
                        </div>
                    </div>
                    <button
                        onClick={clearData}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 border border-red-900/30 hover:bg-red-950/30 rounded-lg transition-colors"
                    >
                        <RefreshCcw className="w-4 h-4" /> Reset
                    </button>
                </header>

                {/* INPUT SECTION */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                    <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <UploadCard
                            icon={Facebook} title="Facebook Posts"
                            files={fbPostFiles} onChange={setFbPostFiles}
                            color="blue" desc="Full CSV Support"
                        />
                        <UploadCard
                            icon={Instagram} title="Instagram Posts"
                            files={igPostFiles} onChange={setIgPostFiles}
                            color="pink" desc="Standard Export"
                        />
                        <UploadCard
                            icon={BookImage} title="Instagram Stories"
                            files={igStoryFiles} onChange={setIgStoryFiles}
                            color="purple" desc="Stories Export"
                        />
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden">
                        <div className="mb-4 p-3 bg-blue-900/20 border border-blue-800/50 rounded-lg">
                            <h3 className="flex items-center gap-2 text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">
                                <AlertCircle className="w-3 h-3" /> How It Works
                            </h3>
                            <p className="text-[10px] text-slate-400 leading-relaxed">
                                This Date Selector is a <strong>Filter</strong>. It ignores data outside this range.
                                <br /><br />
                                Upload a full 3-month CSV, then set these dates (e.g., Feb 1st - Feb 7th)
                                to see reports specifically for that week.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Start Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
                                    <input
                                        type="date"
                                        value={startDate}
                                        max={today}
                                        onChange={e => setStartDate(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-10 pr-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:border-slate-600 transition-colors"
                                        onClick={(e) => e.target.showPicker && e.target.showPicker()}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">End Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
                                    <input
                                        type="date"
                                        value={endDate}
                                        max={today}
                                        onChange={e => setEndDate(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pl-10 pr-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:border-slate-600 transition-colors"
                                        onClick={(e) => e.target.showPicker && e.target.showPicker()}
                                    />
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={uploadFiles} disabled={loading || !canUpload}
                            className="mt-6 w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 transition-all flex justify-center items-center gap-2"
                        >
                            {loading ? (
                                <><RefreshCcw className="w-4 h-4 animate-spin" /> {processingStep || 'Processing...'}</>
                            ) : (
                                <><BarChart3 className="w-4 h-4" /> Generate Report</>
                            )}
                        </button>
                    </div>
                </div>

                {/* REPORT RESULTS */}
                {report && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">

                        {/* HEADER & ACTIONS */}
                        <div className="flex flex-col md:flex-row justify-between items-center bg-slate-900/50 p-6 rounded-xl border border-slate-800 gap-4">
                            <h2 className="text-2xl font-bold text-white">Analysis Results</h2>
                            <div className="flex gap-4">
                                <button onClick={downloadCSV} className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg shadow-lg shadow-green-900/20 transition-all">
                                    <FileSpreadsheet className="w-4 h-4" /> Download CSV
                                </button>
                                <button onClick={handleSyncClick} className="flex items-center gap-2 px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-lg shadow-lg shadow-yellow-900/20 transition-all">
                                    <Database className="w-4 h-4" /> Sync Sheets
                                </button>
                            </div>
                        </div>

                        {/* MANUAL ENTRY SECTION */}
                        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <PlusCircle className="w-4 h-4" /> Manual Weekly Data (Facebook + Followers)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                <input
                                    type="number"
                                    placeholder="FB Reach"
                                    value={manualFbReach}
                                    onChange={e => setManualFbReach(e.target.value)}
                                    className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:border-blue-500 outline-none transition-colors"
                                />
                                <input
                                    type="number"
                                    placeholder="FB Views"
                                    value={manualFbStoryViews}
                                    onChange={e => setManualFbStoryViews(e.target.value)}
                                    className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:border-blue-500 outline-none transition-colors"
                                />
                                <input
                                    type="number"
                                    placeholder="FB Interactions"
                                    value={manualFbInteractions}
                                    onChange={e => setManualFbInteractions(e.target.value)}
                                    className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:border-blue-500 outline-none transition-colors"
                                />
                                <input
                                    type="number"
                                    placeholder="FB Stories Count"
                                    value={manualFbStoryCount}
                                    onChange={e => setManualFbStoryCount(e.target.value)}
                                    className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:border-blue-500 outline-none transition-colors"
                                />
                                <input
                                    type="number"
                                    placeholder="IG Followers"
                                    value={manualIgFollowers}
                                    onChange={e => setManualIgFollowers(e.target.value)}
                                    className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:border-pink-500 outline-none transition-colors font-bold"
                                />
                                <input
                                    type="number"
                                    placeholder="FB Followers"
                                    value={manualFbFollowers}
                                    onChange={e => setManualFbFollowers(e.target.value)}
                                    className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:border-blue-500 outline-none transition-colors font-bold"
                                />
                            </div>

                            <textarea
                                placeholder='Paste "Full Story Data JSON" from Facebook Parser here...'
                                value={manualFbStoriesJson}
                                onChange={e => setManualFbStoriesJson(e.target.value)}
                                className="w-full h-20 bg-slate-950 border border-purple-500/30 rounded-lg px-4 py-2 text-xs text-purple-200 mt-4 focus:border-purple-500 outline-none font-mono"
                            ></textarea>

                            <p className="text-[10px] text-slate-500 mt-2 italic">
                                * Enter Facebook data from Parser Tool above. Enter 'IG & FB Followers' for the Google Sheet report.
                            </p>
                        </div>

                        {/* SPLIT PARTICULARS (Two Tables side by side) */}
                        {report.aggregated && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <ParticularsTable
                                    title="Instagram Weekly Particulars"
                                    subtitle="(Includes Posts + Stories stats)"
                                    data={report.aggregated.instagram}
                                    icon={Instagram}
                                    color="pink"
                                    storiesIncluded={true}
                                />
                                <ParticularsTable
                                    title="Facebook Weekly Particulars"
                                    subtitle={manualFbReach ? "(Inc. Posts + Manual Stories)" : "(Includes Posts only - Add Manual Data above)"}
                                    data={finalFacebookData || report.aggregated.facebook}
                                    icon={Facebook}
                                    color="blue"
                                    storiesIncluded={!!manualFbReach || !!manualFbInteractions}
                                />
                            </div>
                        )}

                        {/* ---> FACEBOOK DETAIL <--- */}
                        <PlatformSection
                            platform="Facebook"
                            icon={Facebook}
                            color="blue"
                            stats={report.facebook.stats}
                            rankings={report.facebook.rankings}
                            posts={report.facebook.posts}
                            editedPostIds={editedPostIds}
                            onUpdateReach={(postId, val) => handleUpdatePostReach('facebook', postId, val)}
                        />

                        {/* ---> INSTAGRAM DETAIL <--- */}
                        <PlatformSection
                            platform="Instagram"
                            icon={Instagram}
                            color="pink"
                            stats={report.instagram.stats}
                            rankings={report.instagram.rankings}
                            posts={report.instagram.posts}
                            editedPostIds={editedPostIds}
                            onUpdateReach={(postId, val) => handleUpdatePostReach('instagram', postId, val)}
                        />

                        {/* ---> STORIES DETAIL (Unchanged) <--- */}
                        {report.stories.stats.total_stories > 0 && (() => {
                            const stories = report.stories.data.map(s => ({
                                ...s,
                                total_engagement: (s.likes || 0) + (s.shares || 0) + (s.replies || 0) + (s.link_clicks || 0),
                                description: "Story"
                            }));
                            const bestReach = [...stories].sort((a, b) => b.reach - a.reach)[0];
                            const bestEng = [...stories].sort((a, b) => b.total_engagement - a.total_engagement)[0];

                            return (
                                <section className="space-y-6">
                                    <div className="flex items-center gap-3 border-b border-purple-500/30 pb-4">
                                        <div className="p-2 bg-purple-500/10 rounded-lg"><BookImage className="w-6 h-6 text-purple-500" /></div>
                                        <h2 className="text-2xl font-bold text-white">Instagram Stories</h2>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                                        <KPICard label="Total Stories" value={report.stories.stats.total_stories} sub="Count" />
                                        <KPICard label="Reach" value={report.stories.stats.total_reach} sub="Sum (Reach)" />
                                        <KPICard label="Total Views" value={report.stories.stats.total_views} sub="Sum (Views)" />
                                        <KPICard label="Link Clicks" value={report.stories.stats.total_link_clicks} sub="Sum (Clicks)" />
                                        <KPICard label="Avg Views" value={Math.round(report.stories.stats.avg_views_per_story)} sub="Views / Count" />
                                        <KPICard label="Profile Visits" value={report.stories.stats.total_profile_visits} sub="Sum (Visits)" />
                                        <KPICard label="Interactions" value={report.stories.stats.total_interactions} sub="Total Actions" />
                                    </div>

                                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-4">Top Story Performers</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <RankingCard title="🏆 Best Story Reach" data={bestReach} metric="Reach" color="green" showDate={true} />
                                        <RankingCard title="🔥 Best Story Engagement" data={bestEng} metric="Total Eng." color="orange" showDate={true} />
                                    </div>

                                    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/30">
                                        <table className="w-full text-sm text-left text-slate-300">
                                            <thead className="text-xs text-slate-400 uppercase bg-slate-900/80 border-b border-slate-800">
                                                <tr>
                                                    <th className="px-6 py-4">Date</th>
                                                    <th className="px-6 py-4">Reach</th>
                                                    <th className="px-6 py-4">Views</th>
                                                    <th className="px-6 py-4">Likes</th>
                                                    <th className="px-6 py-4">Replies</th>
                                                    <th className="px-6 py-4">Clicks</th>
                                                    <th className="px-6 py-4">Visits</th>
                                                    <th className="px-6 py-4">Interactions</th>
                                                    <th className="px-6 py-4 text-center">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800">
                                                {report.stories.data.map((post) => (
                                                    <tr key={post.post_id} className="hover:bg-slate-800/30">
                                                        <td className="px-6 py-4 font-mono text-slate-500">{formatDate(post.publish_time)}</td>
                                                        <td className="px-6 py-4 text-white">{post.reach.toLocaleString()}</td>
                                                        <td className="px-6 py-4 text-white">{post.views.toLocaleString()}</td>
                                                        <td className="px-6 py-4">{post.likes.toLocaleString()}</td>
                                                        <td className="px-6 py-4">{post.replies.toLocaleString()}</td>
                                                        <td className="px-6 py-4 text-pink-400">{post.link_clicks.toLocaleString()}</td>
                                                        <td className="px-6 py-4">{post.profile_visits?.toLocaleString() || 0}</td>
                                                        <td className="px-6 py-4 font-bold text-orange-400">{((post.likes || 0) + (post.shares || 0) + (post.replies || 0) + (post.link_clicks || 0) + (post.profile_visits || 0) + (post.sticker_taps || 0) + (post.follows || 0)).toLocaleString()}</td>
                                                        <td className="px-6 py-4 text-center">
                                                            {post.permalink && (
                                                                <a href={post.permalink} target="_blank" rel="noreferrer"
                                                                    className="inline-flex p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-blue-400 transition-colors" title="View Story">
                                                                    <ExternalLink className="w-4 h-4" />
                                                                </a>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>
                            );
                        })()}

                    </div>
                )}
            </div>

            {/* SYNC MODAL */}
            {
                showSyncModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl relative">
                            <button onClick={() => setShowSyncModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white">✕</button>

                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-yellow-500/10 rounded-xl"><Database className="w-6 h-6 text-yellow-500" /></div>
                                <h2 className="text-xl font-bold text-white">Sync to Google Sheets</h2>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-slate-400 uppercase font-bold mb-1 block">Google Script URL</label>
                                    <input
                                        type="text"
                                        placeholder="https://script.google.com/macros/s/..."
                                        value={scriptUrl}
                                        onChange={e => setScriptUrl(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:border-yellow-500 outline-none"
                                    />
                                    <p className="text-[10px] text-slate-500 mt-1">Deploy the provided Code.gs as a Web App and paste URL here.</p>
                                </div>

                                <div>
                                    <label className="text-xs text-slate-400 uppercase font-bold mb-1 block">Week Label</label>
                                    <input
                                        type="text"
                                        value={syncWeekLabel}
                                        onChange={e => setSyncWeekLabel(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:border-yellow-500 outline-none"
                                    />
                                </div>

                                <button
                                    onClick={() => executeSync()}
                                    disabled={syncStatus === 'Syncing...'}
                                    className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-xl shadow-lg shadow-yellow-900/20 transition-all mt-4 disabled:opacity-50 flex justify-center"
                                >
                                    {syncStatus === 'Syncing...' ? (
                                        <RefreshCcw className="w-5 h-5 animate-spin" />
                                    ) : (
                                        "Confirm & Sync"
                                    )}
                                </button>

                                {syncStatus && (
                                    <div className={`text-center text-sm font-bold mt-2 ${syncStatus.includes('Failed') ? 'text-red-400' : 'text-green-400'}`}>
                                        {syncStatus}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

// === SUB-COMPONENTS ===

function ParticularsTable({ title, subtitle, data, icon: Icon, color, storiesIncluded }) {
    if (!data) return null;
    return (
        <section className="space-y-4">
            <div className={`flex items-center gap-3 border-b border-${color}-500/30 pb-4`}>
                <div className={`p-2 bg-${color}-500/10 rounded-lg shadow-lg`}>
                    <Icon className={`w-6 h-6 text-${color}-500`} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">{title}</h2>
                    <p className="text-xs text-slate-500">{subtitle}</p>
                </div>
            </div>

            <div className="overflow-x-hidden rounded-xl border border-slate-700 bg-slate-900/50 shadow-2xl">
                <table className="w-full text-sm text-left text-slate-300">
                    <thead className="text-xs text-white uppercase bg-slate-800/80 border-b border-slate-700">
                        <tr>
                            <th className="px-6 py-4 font-bold w-2/3">Particulars & Formula</th>
                            <th className="px-6 py-4 font-bold text-right">Value</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        <tr className="hover:bg-slate-800/30">
                            <td className="px-6 py-4">
                                <span className="font-medium text-white block">Total Reach</span>
                                <span className="text-[10px] text-slate-500 font-mono italic">
                                    {storiesIncluded ? 'Reach(Posts) + Reach(Stories)' : 'Sum(Reach of Posts)'}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-lg text-green-400">{data.total_reach.toLocaleString()}</td>
                        </tr>
                        <tr className="hover:bg-slate-800/30">
                            <td className="px-6 py-4">
                                <span className="font-medium text-white block">Total Engagement</span>
                                <span className="text-[10px] text-slate-500 font-mono italic">
                                    {storiesIncluded
                                        ? 'Post Interactions + Story Interactions + Views'
                                        : 'Post Interactions (Raw) + Views'}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-lg text-blue-400">{data.total_engagement.toLocaleString()}</td>
                        </tr>
                        <tr className="hover:bg-slate-800/30">
                            <td className="px-6 py-4">
                                <span className="font-medium text-white block">Total Views</span>
                                <span className="text-[10px] text-slate-500 font-mono italic">
                                    Sum(Views of Posts)
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-lg text-white">{data.total_views.toLocaleString()}</td>
                        </tr>
                        <tr className="hover:bg-slate-800/30">
                            <td className="px-6 py-4">
                                <span className="font-medium text-white block">Total Interactions (w/o Views)</span>
                                <span className="text-[10px] text-slate-500 font-mono italic">
                                    Total Eng - Total Views
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-lg text-orange-400">{data.interactions_wo_views.toLocaleString()}</td>
                        </tr>
                        <tr className="hover:bg-slate-800/30">
                            <td className="px-6 py-4">
                                <span className="font-medium text-white block">Engagement Rate (with Views)</span>
                                <span className="text-[10px] text-slate-500 font-mono italic">
                                    (Total Eng / Total Reach) * 100
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-lg text-purple-400">{data.eng_rate_with_views.toFixed(2)}%</td>
                        </tr>
                        <tr className="hover:bg-slate-800/30">
                            <td className="px-6 py-4">
                                <span className="font-medium text-white block">Engagement Rate (w/o Views)</span>
                                <span className="text-[10px] text-slate-500 font-mono italic">
                                    (Interactions / Total Reach) * 100
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-lg text-pink-400">{data.eng_rate_wo_views.toFixed(2)}%</td>
                        </tr>
                        <tr className="hover:bg-slate-800/30">
                            <td className="px-6 py-4">
                                <span className="font-medium text-white block">Video View Rate</span>
                                <span className="text-[10px] text-slate-500 font-mono italic">
                                    (Total Views / Total Reach) * 100
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-lg text-yellow-400">{data.video_view_rate.toFixed(2)}%</td>
                        </tr>
                        <tr className="hover:bg-slate-800/30">
                            <td className="px-6 py-4">
                                <span className="font-medium text-white block">Average Interaction</span>
                                <span className="text-[10px] text-slate-500 font-mono italic">
                                    Interactions / Total Posts
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-lg text-white">
                                {data.average_interaction ? Math.round(data.average_interaction).toLocaleString() : 0}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function PlatformSection({ platform, icon: Icon, color, stats, rankings, posts, editedPostIds, onUpdateReach }) {
    if (stats.total_posts === 0) return null;

    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');

    const handleEditClick = (post) => {
        setEditingId(post.post_id);
        setEditValue(post.reach);
    };

    const handleSave = (postId) => {
        const newValue = parseInt(editValue);
        if (!isNaN(newValue)) {
            onUpdateReach(postId, newValue);
        }
        setEditingId(null);
    };

    return (
        <section className="space-y-6">
            <div className={`flex items-center gap-3 border-b border-${color}-500/30 pb-4`}>
                <div className={`p-2 bg-${color}-500/10 rounded-lg`}><Icon className={`w-6 h-6 text-${color}-500`} /></div>
                <h2 className="text-2xl font-bold text-white">{platform} Posts Detail</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <KPICard label="Total Posts" value={stats.total_posts} sub="Count" />
                <KPICard label="Total Reach" value={stats.total_reach} color={`text-${color}-400`} sub="Sum(Reach)" />
                <KPICard label="Total Views" value={stats.total_views} sub="Sum(Views)" />
                <KPICard label="Total Eng." value={stats.total_engagement} sub="L+C+S+Saves (No Views)" />
                <KPICard label="Eng Rate" value={(stats.avg_engagement_rate_reach * 100).toFixed(2) + "%"} sub="Total Eng / Total Reach" />
            </div>

            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-4">Top & Bottom Performers</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <RankingCard title="🏆 Best Reach" data={rankings.best_reach} metric="Reach" color="green" showDate={true} />
                <RankingCard title="📉 Least Reach" data={rankings.least_reach} metric="Reach" color="red" showDate={true} />
                <RankingCard title="🔥 Best Engagement" data={rankings.best_engagement} metric="Total Eng." color="orange" showDate={true} />
                <RankingCard title="❄️ Least Engagement" data={rankings.least_engagement} metric="Total Eng." color="slate" showDate={true} />
            </div>

            <div className="mt-6">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">All Posts Data</h3>
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/30 max-h-96 overflow-y-auto">
                    <table className="w-full text-sm text-left text-slate-300">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-900/80 sticky top-0 border-b border-slate-700">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Post Type</th>
                                <th className="px-6 py-4 min-w-[200px]">Description</th>
                                <th className="px-6 py-4 text-right">Reach</th>
                                <th className="px-6 py-4 text-right">Views</th>
                                <th className="px-6 py-4 text-right">Likes</th>
                                <th className="px-6 py-4 text-right">Comments</th>
                                <th className="px-6 py-4 text-right">Shares</th>
                                <th className="px-6 py-4 text-right">Saves</th>
                                <th className="px-6 py-4 text-right">Total Eng</th>
                                <th className="px-6 py-4 text-right">Eng Rate</th>
                                <th className="px-6 py-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {posts.map((post) => (
                                <tr key={post.post_id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4 font-mono text-slate-500 whitespace-nowrap">{formatDate(post.publish_time)}</td>
                                    <td className="px-6 py-4 text-xs uppercase font-bold text-slate-500">{post.post_type}</td>
                                    <td className="px-6 py-4 text-white line-clamp-1 block max-w-xs">{post.description || '-'}</td>
                                    <td className="px-6 py-4 text-right font-medium text-white">
                                        {editingId === post.post_id ? (
                                            <div className="flex items-center justify-end gap-1">
                                                <input
                                                    type="number"
                                                    value={editValue}
                                                    onChange={e => setEditValue(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && handleSave(post.post_id)}
                                                    className="w-20 bg-slate-950 border border-blue-500 rounded px-1 text-right text-white focus:outline-none"
                                                    autoFocus
                                                />
                                                <CheckCircle2 className="w-4 h-4 text-green-500 cursor-pointer" onClick={() => handleSave(post.post_id)} />
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-end gap-2 group">
                                                {post.reach.toLocaleString()}
                                                {(post.reach === 0 || editedPostIds.has(post.post_id)) && (
                                                    <button onClick={() => handleEditClick(post)} title="Fix Missing Reach" className="group-hover:opacity-100 opacity-50 transition-opacity">
                                                        <PlusCircle className={`w-4 h-4 ${editedPostIds.has(post.post_id) ? 'text-green-500' : 'text-yellow-400'} hover:text-white`} />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">{post.views.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right">{post.likes.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right">{post.comments.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right">{post.shares.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right">{(post.saves || 0).toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right font-bold text-white">{post.total_engagement.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right text-green-400">{(post.engagement_rate * 100).toFixed(2)}%</td>
                                    <td className="px-6 py-4 text-center">
                                        {post.permalink && (
                                            <a href={post.permalink} target="_blank" rel="noreferrer"
                                                className="inline-flex p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-blue-400 transition-colors" title="View Post on Meta">
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    )
}

function UploadCard({ icon: Icon, title, files, onChange, color, desc }) {
    // ...
    const hasFiles = files.length > 0;
    return (
        <div className={`border rounded-2xl p-4 transition-all ${hasFiles ? `border-${color}-500 bg-${color}-500/10` : 'border-slate-800 bg-slate-900/50'}`}>
            <div className="flex items-center gap-3 mb-2">
                <Icon className={`w-5 h-5 text-${color}-500`} />
                <h3 className="font-bold text-white">{title}</h3>
            </div>
            <p className="text-xs text-slate-500 mb-3">{desc}</p>
            <label className={`block w-full text-center py-2 rounded-lg text-sm font-bold cursor-pointer transition-colors ${hasFiles ? `bg-${color}-500 text-white` : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                {hasFiles ? `${files.length} File(s) Ready` : 'Choose CSV'}
                <input type="file" multiple accept=".csv" onChange={e => onChange([...e.target.files])} className="hidden" />
            </label>
        </div>
    )
}

function KPICard({ label, value, sub, color = "text-white" }) {
    return (
        <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
            <div className="text-xs text-slate-500 font-bold uppercase mb-1">{label}</div>
            <div className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</div>
            {sub && <div className="text-xs text-slate-600 mt-1 font-mono italic">{sub}</div>}
        </div>
    )
}

function RankingCard({ title, data, metric, color, showDate }) {
    if (!data) return <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 h-full flex items-center justify-center text-slate-600 text-xs uppercase">No Data</div>;

    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div>
                <h4 className={`text-xs font-bold uppercase mb-3 flex items-center gap-2 text-${color}-400`}>
                    {title}
                </h4>
                {showDate && data.publish_time && (
                    <div className="text-xs text-slate-500 font-mono mb-1">{formatDate(data.publish_time)}</div>
                )}
                <div className="flex justify-between items-end mb-2">
                    <div className="text-2xl font-bold text-white">
                        {metric === 'Total Eng.' ? data.total_engagement.toLocaleString() : data[metric.toLowerCase().replace('reach', 'reach')].toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-500 uppercase">{metric}</div>
                </div>
                <div className="text-xs text-slate-400 line-clamp-2 h-8 leading-4 mb-2">
                    {data.description || "No description"}
                </div>
            </div>
            <a href={data.permalink} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-2 pt-2 border-t border-slate-800">
                View Post <ArrowRight className="w-3 h-3" />
            </a>
        </div>
    )
}

export default App;
