// ==UserScript==
// @name         Instagram++
// @namespace    maxhyt.instagrampp
// @version      4.0.1
// @description  Add addtional features to Instagram
// @author       Maxhyt
// @license      AGPL-3.0
// @icon         https://icons.duckduckgo.com/ip2/instagram.com.ico
// @homepage     https://github.com/ducng99/InstagramPP
// @match        https://www.instagram.com/*
// @match        https://beta.ducng.dev/InstagramPP/
// @require      https://cdn.jsdelivr.net/npm/js-cookie@3.0.1/dist/js.cookie.min.js
// @run-at       document-start
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_openInTab
// @grant        unsafeWindow
// ==/UserScript==

(function () {
    "use strict"
    
    const STORAGE_VARS = { BlockSeenStory: "block_seen_story", AutoReportSpamComments: "auto_report_spam_comments",
                          ReportedComments: "reported_comments", CheckedComments: "checked_comments" };
    let CapturedMediaURLs = [];
    let ReportCommentsQueue = [];
    const SETTINGS_PAGE = "https://beta.ducng.dev/InstagramPP/";
    
    LoadSettings();

    setInterval(MainLoop, 2000);
    ReportLoop();

    function MainLoop() {
        // Story
        let storyMenu = document.querySelector("._8p8kF");
        if (storyMenu && !storyMenu.querySelector('.igpp_download')) {
            const newNode = document.createElement('div');
            newNode.innerHTML = '<button class="wpO6b igpp_download" type="button"><div class="QBdPU"><svg width="18" height="18" fill="#ffffff" color="#ffffff" class="_8-yf5" viewBox="0 0 16 16"><path d="M8 2a5.53 5.53 0 0 0-3.594 1.342c-.766.66-1.321 1.52-1.464 2.383C1.266 6.095 0 7.555 0 9.318 0 11.366 1.708 13 3.781 13h8.906C14.502 13 16 11.57 16 9.773c0-1.636-1.242-2.969-2.834-3.194C12.923 3.999 10.69 2 8 2zm2.354 6.854-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 1 1 .708-.708L7.5 9.293V5.5a.5.5 0 0 1 1 0v3.793l1.146-1.147a.5.5 0 0 1 .708.708z"/></svg></div></button>';
            const downloadButton = newNode.firstChild;
            downloadButton.addEventListener('click', DownloadStory);
            storyMenu.insertBefore(downloadButton, storyMenu.firstChild);
        }

        // News Feed
        let articles = [...document.body.querySelectorAll("article.M9sTE.L_LMM")];
        Promise.all(articles.map(ProcessArticle));
        
        // Video
        [...document.body.querySelectorAll('video.tWeCl')].forEach(video => {
            if (video && video.volume == 1) {
                video.volume = 0.5;
            }
        });
    }
    
    function DownloadStory() {
        let stPicLink = document.body.querySelector("img.y-yJ5")?.getAttribute("srcset")?.split(" ")[0];
        let stVidLink = document.body.querySelector("video.y-yJ5.OFkrO")?.querySelector("source")?.getAttribute("src");

        if (stVidLink) {
            window.open(stVidLink, '_blank');
        }
        else if (stPicLink) {
            window.open(stPicLink, '_blank');
        }
        else {
            alert('Error: Cannot Find the link');
        }
    }

    async function ProcessArticle(article) {
        let feedMenu = article.querySelector('.ltpMr.Slqrh');

        if (!feedMenu.querySelector('.igpp_download')) {
            const src = GetMediaSrc(article);

            if (src) {
                let newNode = document.createElement("div");
                newNode.innerHTML = `<span class="igpp_download"><a class="wpO6b" href="${src}" target="_blank"><div class="QBdPU"><svg class="_8-yf5" width="24" height="24" viewBox="0 0 16 16" color="#262626" fill="#262626" aria-label="Download"><path fill-rule="evenodd" d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path fill-rule="evenodd" d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg></div></a></span>`;
                feedMenu.appendChild(newNode.firstChild);
            }
        }
        
        let arrowSwitchLeft = article.querySelector('.coreSpriteLeftChevron');
        if (arrowSwitchLeft && !arrowSwitchLeft.classList.contains('igpp_checked')) {
            arrowSwitchLeft.addEventListener('click', () => { ResetDownloadLink(article, 100); });
            arrowSwitchLeft.classList.add('igpp_checked');
        }

        let arrowSwitchRight = article.querySelector('.coreSpriteRightChevron');
        if (arrowSwitchRight && !arrowSwitchRight.classList.contains('igpp_checked')) {
            arrowSwitchRight.addEventListener('click', () => { ResetDownloadLink(article, 100); });
            arrowSwitchRight.classList.add('igpp_checked');
        }
        
        if (GM_getValue(STORAGE_VARS.AutoReportSpamComments)) {
            const list_comments = article.querySelectorAll('ul.XQXOT.pXf-y > ul.Mr508');
            const toBeCheckedComments = {};
            const IDsToElement = {};
            
            list_comments.forEach(comment_container => {
                if (!comment_container.hasAttribute("igpp_checked")) {

                    const commentText = comment_container.querySelector('ul.MOdxS > span').textContent;
                    const timeLink = comment_container.querySelector('a.gU-I7');
                    const match = /\/p\/[a-z0-9-]+\/c\/(\d+)/i.exec(timeLink.href);

                    if (timeLink && match) {
                        comment_container.setAttribute("igpp_checked", "");
                        
                        if (GetReportedComments().indexOf(match[1]) === -1) {
                            toBeCheckedComments[match[1]] = commentText;
                            IDsToElement[match[1]] = comment_container;
                        }
                        else {
                            comment_container.remove();
                        }
                    }
                }
            });
            
            const checkedCommentsResult = Object.entries(await CheckSpamComments(toBeCheckedComments));
            
            checkedCommentsResult.forEach(comment => {
                if (comment[1]) {
                    if (IDsToElement[comment[0]]) {
                        IDsToElement[comment[0]].remove();
                    }
                    AddReportCommentID(comment[0]);
                }
            });
        }
    }

    function GetMediaSrc(article) {
        let mediaIndex = -1;
        const mediaCountDOM = article.querySelector("div._3eoV-.IjCL9");

        if (mediaCountDOM && mediaCountDOM.children.length > 1) {
            let current = mediaCountDOM.querySelector(".Yi5aA.XCodT");
            mediaIndex = [...mediaCountDOM.children].indexOf(current);
        }

        const dateDOM = article.querySelector("a.c-Yi7");
        if (dateDOM) {
            for (const links of CapturedMediaURLs) {
                if (dateDOM.href.includes(links.postID)) {
                    if (mediaIndex === -1) {
                        return links.src;
                    }
                    else {
                        return links.srcs[mediaIndex];
                    }
                }
            }
        }

        return null;
    }

    function ResetDownloadLink(article, timeout) {
        setTimeout(() => {
            article.querySelector(".igpp_download")?.remove();
            ProcessArticle(article);
        }, timeout);
    }

    const XHR_open = XMLHttpRequest.prototype.open;

    // Overwrite the native method
    XMLHttpRequest.prototype.open = function () {
        if (GM_getValue(STORAGE_VARS.BlockSeenStory) && arguments[1].includes("/stories/reel/seen")) {
            return;
        }
        
        // Assign an event listener
        this.addEventListener("load", event => {
            let response = JSON.parse(event.target.responseText);

            if (event.target.responseURL === "https://i.instagram.com/api/v1/feed/timeline/") {
                response.feed_items.forEach(item => {
                    ParseMediaObjFromAPI(item.media_or_ad);
                });
            }
            else if (event.target.responseURL.includes("https://www.instagram.com/graphql/query/")) {
                const media = response.data.user?.edge_owner_to_timeline_media.edges;
                if (media) {
                    media.forEach(edge => ParseMediaObjFromGraphQL(edge.node));
                }
            }
            else if (event.target.responseURL.includes("https://www.instagram.com/explore/grid/")) {
                let sections = response.sectional_items;

                sections.forEach(section => {
                    if (section.layout_type === "media_grid") {
                        section.layout_content.medias.forEach(media => ParseMediaObjFromAPI(media.media));
                    }
                    else if (section.layout_type.startsWith('two_by_two')) {
                        if (section.layout_content.two_by_two_item.channel) {
                            ParseMediaObjFromAPI(section.layout_content.two_by_two_item.channel.media);
                        }
                        else {
                            ParseMediaObjFromAPI(section.layout_content.two_by_two_item.media);
                        }
                        section.layout_content.fill_items.forEach(item => ParseMediaObjFromAPI(item.media));
                    }
                });
            }
            else if (event.target.responseURL.includes("https://i.instagram.com/api/v1/media/")) {
                if (response.items && response.items[0]) {
                    ParseMediaObjFromAPI(response.items[0]);
                }
            }
        }, false);
        // Call the stored reference to the native method
        XHR_open.apply(this, arguments);
    };

    window.addEventListener('load', () => {
        const AllScripts = document.querySelectorAll('script');
        AllScripts.forEach(script => {
            if (script.innerHTML.startsWith("window.__additionalDataLoaded")) {
                let matches = /window\.__additionalDataLoaded\('.*',(.*)\);/.exec(script.innerHTML);
                if (matches[1]) {
                    if (matches[1].startsWith('{"items":')) {
                        let media = JSON.parse(matches[1])?.items;
                        if (media) {
                            media.forEach(item => ParseMediaObjFromAPI(item));
                        }
                    }
                    else if (matches[1].includes("feed_items")) {
                        let feed_items = JSON.parse(matches[1])?.feed_items;
                        if (feed_items) {
                            feed_items.forEach(item => ParseMediaObjFromAPI(item.media_or_ad));
                        }
                    }
                }
            }
        });
    });

    function ParseMediaObjFromGraphQL(media, save = true) {
        const postID = media.shortcode;

        if (media.__typename === "GraphSidecar") {
            let links = [];

            media.edge_sidecar_to_children.edges.forEach(edge => {
                let link = ParseMediaObjFromGraphQL(edge.node, false);
                links.push(link.src);
            });

            CapturedMediaURLs.push({ postID, srcs: links });
        }
        else if (media.is_video) {
            let src = media.video_url;
            if (src) {
                if (save) CapturedMediaURLs.push({ postID, src });
                return { postID, src };
            }
        }
        else if (media.__typename === "GraphImage") {
            let src = media.display_resources[media.display_resources.length - 1]?.src;
            if (src) {
                if (save) CapturedMediaURLs.push({ postID, src });
                return { postID, src };
            }
        }
    }

    function ParseMediaObjFromAPI(item, save = true) {
        const postID = item.code;
        
        if (item.carousel_media) {
            let links = [];

            item.carousel_media.forEach(media => {
                let link = ParseMediaObjFromAPI(media, false);
                links.push(link.src);
            });

            CapturedMediaURLs.push({ postID, srcs: links });
        }
        else if (item.video_versions) {
            let src = item.video_versions[item.video_versions.length - 1].url;
            if (save) CapturedMediaURLs.push({ postID, src });
            return { postID, src };
        }
        else if (item.image_versions2) {
            let src = item.image_versions2.candidates[0].url;
            if (save) CapturedMediaURLs.push({ postID, src });
            return { postID, src };
        }
    }
    
    /* START - REPORT SPAM SECTION */
    
    async function ReportLoop() {
        while (GM_getValue(STORAGE_VARS.AutoReportSpamComments, false)) {
            const tmp_ReportCommentsQueue = [...ReportCommentsQueue];
            for (let i = 0; i < tmp_ReportCommentsQueue.length; i++) {
                const id = tmp_ReportCommentsQueue[i];
                ReportCommentsQueue.splice(ReportCommentsQueue.indexOf(id), 1);
                if (await SendReport(id)) {
                    AddReportedComment(id);
                }
                await Sleep(2000);
            }
            
            await Sleep(2000);
        }
    }
    
    async function CheckSpamComments(comments) {
        if (Object.keys(comments).length > 0)
        {
            const res = await fetch("https://4ze85p5fce.execute-api.ap-southeast-2.amazonaws.com/v1/IsInstagramCommentSpam", {
                body: JSON.stringify(comments),
                method: 'POST'
            });

            return await res.json();
        }
        
        return {};
    }
    
    async function SendReport(comment_id) {
        const requestForm = new FormData;
        requestForm.append("entry_point", "1");
        requestForm.append("location", "3");
        requestForm.append("object_type", "2");
        requestForm.append("object_id", comment_id);
        requestForm.append("container_module", "postPage");
        requestForm.append("frx_prompt_request_type", "1");
        
        try {
            let res_report_request = await fetch("https://www.instagram.com/reports/web/get_frx_prompt/", {
                body: new URLSearchParams(requestForm),
                method: 'POST',
                headers: {
                    "X-CSRFToken": Cookies.get('csrftoken'),
                    "X-Instagram-AJAX": unsafeWindow._sharedData.rollout_hash,
                    "X-IG-App-ID": 936619743392459
                }
            });

            res_report_request = await res_report_request.json();

            if (res_report_request.status === "ok") {
                const context = res_report_request.response.context;

                const reportForm = new FormData;
                reportForm.append("context", context);
                reportForm.append("selected_tag_type", "ig_spam_v3");

                let res_report = await fetch("https://www.instagram.com/reports/web/log_tag_selected/", {
                    body: new URLSearchParams(reportForm),
                    method: 'POST',
                    headers: {
                        "X-CSRFToken": Cookies.get('csrftoken'),
                        "X-Instagram-AJAX": unsafeWindow._sharedData.rollout_hash,
                        "X-IG-App-ID": 936619743392459
                    }
                });
                res_report = await res_report.json();

                if (res_report.status === "ok") {
                    console.log(`Report ${comment_id} success`);
                    return true;
                }
                else {
                    console.error("Failed to send report", res_report);
                }
            }
            else {
                console.error("Failed to send report request", res_report_request);
            }
        }
        catch (ex) {
            console.error("Failed send report", ex);
        }
        
        return false;
    }
    
    function AddReportCommentID(id) {
        ReportCommentsQueue = [...new Set([...ReportCommentsQueue, id])];
    }
    
    function GetReportedComments() {
        return JSON.parse(GM_getValue(STORAGE_VARS.ReportedComments, "[]"));
    }
    
    function AddReportedComment(id) {
        let storedIDs = GetReportedComments();
        GM_setValue(STORAGE_VARS.ReportedComments, JSON.stringify([...new Set([...storedIDs, id])]));
    }
    
    /* END - REPORT SPAM SECTION */
    
    // Open settings page
    GM_registerMenuCommand("Settings", () => window.open(SETTINGS_PAGE, "_blank"));
    
    function LoadSettings() {
        // Set default settings if not exists
        if (GM_getValue(STORAGE_VARS.BlockSeenStory, null) === null) {
            GM_setValue(STORAGE_VARS.BlockSeenStory, true);
        }
        
        if (GM_getValue(STORAGE_VARS.AutoReportSpamComments, null) === null) {
            GM_setValue(STORAGE_VARS.AutoReportSpamComments, false);
        }
        
        // Setup settings page
        if (window.location.href.includes(SETTINGS_PAGE)) {
            window.addEventListener('load', () => {
                document.getElementById(STORAGE_VARS.BlockSeenStory).checked = GM_getValue(STORAGE_VARS.BlockSeenStory);
                document.getElementById(STORAGE_VARS.AutoReportSpamComments).checked = GM_getValue(STORAGE_VARS.AutoReportSpamComments);
                
                document.querySelector("#save_settings").addEventListener('click', () => {
                    GM_setValue(STORAGE_VARS.BlockSeenStory, document.getElementById(STORAGE_VARS.BlockSeenStory).checked);
                    GM_setValue(STORAGE_VARS.AutoReportSpamComments, document.getElementById(STORAGE_VARS.AutoReportSpamComments).checked);
                });
            });
        }
    }
    
    function Sleep(time) {
        return new Promise(resolve => setTimeout(() => resolve(), time));
    }
})();
