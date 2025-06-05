// ==UserScript==
// @name         Covidence Study Navigator
// @namespace    http://tampermonkey.net/
// @version      5.2
// @description  Draggable Covidence panel with saved position, decision logging, CSV export, color-coded decision display.
// @match        *://*.covidence.org/*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    let lastVotedStudy = null;
    'use strict';
    if (window.top !== window.self) return;


    const LEVELS = [
    { threshold: 2, title: "Research Assistant I 🤦‍♂️" },
    { threshold: 4, title: "Research Assistant II 🤷‍♂️" },
    { threshold: 6, title: "PhD Student 1 Yr. 👦" },
    { threshold: 8, title: "PhD Student 4 Yr. 🧔" },
    { threshold: 10, title: "PhD Candidate 👴" },
    { threshold: 12, title: "Dr. 👨‍🎓" },
    { threshold: 14, title: "Postdoc 1 Yr. 🙂" },
    { threshold: 16, title: "Postdoc 9 Yr. 😭" },
    { threshold: 18, title: "Assistant Prof. 👨‍🏫" },
    { threshold: 20, title: "Associate Prof. 🦹‍♂️" },
    { threshold: 22, title: "Professor 🧙‍♂️" },
    { threshold: 24, title: "Emeritus Prof. 🥂" }
];

function updateLifetimeProgressUI() {
    const count = parseInt(GM_getValue("totalStudiesScreened", "0"), 10);
    let currentLevel = 0;
    let currentTitle = LEVELS[0].title;
    let nextThreshold = LEVELS[0].threshold;

    for (let i = 0; i < LEVELS.length; i++) {
        if (count < LEVELS[i].threshold) {
            currentLevel = i + 1;
            currentTitle = LEVELS[i].title;
            nextThreshold = LEVELS[i].threshold;
            break;
        }
        if (i === LEVELS.length - 1) {
            currentLevel = LEVELS.length;
            currentTitle = LEVELS[i].title;
            nextThreshold = LEVELS[i].threshold;
        }
    }

    const progress = Math.min(100, Math.round((count / nextThreshold) * 100));
    const bar = document.getElementById("lifetimeProgressBar");
    const text = document.getElementById("lifetimeProgressText");
    const levelTitle = document.getElementById("lifetimeRankTitle");
    const levelLeft = document.getElementById("levelLeft");
    const levelRight = document.getElementById("levelRight");

    if (bar) bar.style.width = progress + "%";
    if (text) text.textContent = `${count} / ${nextThreshold} studies`;
    if (levelTitle) levelTitle.textContent = currentTitle;
    if (levelLeft) levelLeft.textContent = `Lv. ${currentLevel}`;
    if (levelRight) levelRight.textContent = `Lv. ${currentLevel + 1}`;
}


function createLevelProgressUI(parent) {
    const container = document.getElementById("lifetimeProgressContainer") || document.createElement("div");
    container.id = "lifetimeProgressContainer";
    container.style.margin = "14px 0 8px 0";
    const count = parseInt(GM_getValue("totalStudiesScreened", "0"), 10);

    let currentLevel = 0;
    let currentTitle = LEVELS[0].title;
    let nextThreshold = LEVELS[0].threshold;
let previousLevel = parseInt(GM_getValue("lastLevel", "0"), 10);

    for (let i = 0; i < LEVELS.length; i++) {
        if (count < LEVELS[i].threshold) {
            currentLevel = i + 1;
            currentTitle = LEVELS[i].title;
            nextThreshold = LEVELS[i].threshold;
            break;
        }
        if (i === LEVELS.length - 1) {
            currentLevel = LEVELS.length;
            currentTitle = LEVELS[i].title;
            nextThreshold = LEVELS[i].threshold;
        }
    }

if (currentLevel > previousLevel) {
    GM_setValue("showRankUpNextLoad", currentTitle);
}
GM_setValue("lastLevel", currentLevel);


    const progress = Math.min(100, Math.round((count / nextThreshold) * 100));
    container.innerHTML = `
        <!-- Rank + Reset Row -->
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 600; margin-bottom: 4px;">
<div style="flex: 1; text-align: center;" id="lifetimeRankTitle">${currentTitle}</div>

            <button id="resetProgressBtn" title="Reset progress" style="background: none; border: none; cursor: pointer; font-size: 14px; color: #888;">🔄</button>
        </div>

        <!-- Levels + XP Row -->
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: bold; margin-bottom: 6px;">
            <span id="levelLeft">Lv. ${currentLevel}</span>
            <span id="lifetimeProgressText">${count} / ${nextThreshold} studies</span>
            <span id="levelRight">Lv. ${currentLevel + 1}</span>
        </div>

        <!-- Progress Bar -->
        <div style="height: 8px; background: #ddd; border-radius: 4px; margin-bottom: 6px;">
            <div id="lifetimeProgressBar" style="height: 100%; width: ${progress}%; background: #2196F3; border-radius: 4px;"></div>
        </div>
    `;

    if (!document.getElementById("lifetimeProgressContainer")) {
        parent.insertBefore(container, parent.firstChild);
    }
}

function showRankUpToast(rankTitle) {
    const toast = document.createElement('div');
    toast.className = 'rank-toast';
toast.innerHTML = `
    <strong style="display: block; font-size: 18px; text-align: center;">Rank Up! 🎉</strong>
    <span style="display: block; font-size: 20px; text-align: center;">${rankTitle}</span>
`;

    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.padding = '16px 20px';
    toast.style.background = '#fff'; // White background
    toast.style.color = '#333'; // Darker text
    toast.style.fontSize = '16px';
    toast.style.border = '2px solid #2196F3'; // Blue border
    toast.style.borderRadius = '10px';
    toast.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.15)';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    toast.style.zIndex = '99999';
    toast.style.textAlign = 'center';

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}




    function createPanel() {
        if (document.getElementById("covidence-panel")) return;

        const panel = document.createElement("div");
        panel.id = "covidence-panel";
        panel.style.position = "fixed";
        const savedLeft = GM_getValue('panelLeft', '10px');
        const savedTop = GM_getValue('panelTop', '10px');
        panel.style.left = savedLeft;
        panel.style.top = savedTop;
        panel.style.zIndex = "9999";
        panel.style.background = "#f9f9f9";
        panel.style.border = "1px solid #ccc";
        panel.style.padding = "15px";
        panel.style.width = "300px";
        panel.style.fontSize = "14px";
        panel.style.fontFamily = "sans-serif";
        panel.style.boxShadow = "2px 2px 10px rgba(0,0,0,0.2)";
        panel.style.cursor = "move";

        panel.innerHTML = `
            <strong style="font-size: 15px;">Covidence Study Navigator</strong>
            <div id="topRightIcons" style="position: absolute; top: 11px; right: 10px; display: none; gap: 7px; flex-direction: row;">
              <button id="exportBtn" title="Export decisions to .csv" style="background:none; border:none; cursor:pointer; font-size:22px;" aria-label="Export decisions to .csv">🖫</button>
              <button id="resetBtn" title="Start a new screening session" style="background:none; border:none; cursor:pointer; font-size:21px;" aria-label="Start a new screening session">⟳</button>
            </div>
            <textarea id='studyListInput' rows='6' style='width:100%; margin-top:10px; font-size: 13px;' placeholder='Enter study IDs to start screening. \nYou may enter study IDs in three ways: \n1) Pasting them directly from Excel \n2) Using "-" and "," (e.g., 3-6 or 3,4,5,6) \n3) Clicking the "Detect" button below \n'></textarea>

            <button id='startBtn' style='margin-top:10px; width: 100%;'>▶ Begin Screening</button>
            <div id='studyControls' style='display:none; margin-top:15px;'>
              <div style="margin-bottom: 5px;">Current study: <span id='currentStudy'>?</span><span id='progressInline' style='margin-left: 8px; font-size: 14px; color: #555;'></span>
  <button id='skipBtn' title='Skip this study' style='margin-left: 6px; background: none; border: none; font-size: 16px; cursor: not-allowed; opacity: 0.5;' disabled>⏭</button>
              </div>              <div style="margin-bottom: 12px; height: 10px; background: #eee; border-radius: 4px;">
                <div id="progressBar" style="height: 100%; background: #4caf50; width: 0%; border-radius: 4px;"></div>
              </div>
              <div style="margin-bottom: 30px; display: flex; flex-direction: column; gap: 12px; align-items: center;">
                <button id="panelMaybeBtn" style="background-color: #ff9800; color: white; width: 80%; padding: 10px 0; border-radius: 6px; font-weight: bold;">Maybe</button>
                <button id="panelYesBtn" style="background-color: #4caf50; color: white; width: 80%; padding: 10px 0; border-radius: 6px; font-weight: bold;">Yes</button>
                <button id="panelNoBtn" style="background-color: #f44336; color: white; width: 80%; padding: 10px 0; border-radius: 6px; font-weight: bold;">No</button>
              </div>
              <div style="margin-bottom: 20px; display: flex; flex-direction: column; gap: 8px; align-items: center;"></div>
              <!-- Keyword Search UI -->
              <div style='margin-top: -15px; margin-bottom: 14px;'>
                <div style='display: flex; gap: 6px;'>
                  <div style='position: relative; flex: 1;'>
                    <input id='keywordInput' placeholder='Enter keywords' style='width: 100%; padding: 4px; font-size: 13px;'>
                    <div id='keywordHistoryDropdown' style='position:absolute; top:100%; left:0; right:0; background:white; border:1px solid #ccc; max-height:100px; overflow-y:auto; font-size:13px; z-index:9999; display:none;'></div>
                  </div>
                  <button id='addKeywordsBtn' title='Search keyword' style='background: none; border: none; cursor: pointer; font-size: 18px;'>🔍︎</button>
                </div>
                <div id='keywordTags' style='margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px;'></div>
              </div>
              <button id='toggleSummaryBtn' style='margin: 0 auto 8px auto; display: block; background: none; border: none; color: #007BFF; font-size: 13px; cursor: pointer;'>Show decisions ▼</button>
              <div id='summaryList' style='display:none; font-size: 12px; line-height: 1.4; max-height: 150px; overflow-y: auto;'></div>
            </div>`;

        document.body.appendChild(panel);

        let isDragging = false,
            offsetX, offsetY;
        panel.addEventListener("mousedown", function(e) {
            if (["textarea", "input", "button"].includes(e.target.tagName.toLowerCase())) return;
            isDragging = true;
            offsetX = e.clientX - panel.offsetLeft;
            offsetY = e.clientY - panel.offsetTop;
        });
        document.addEventListener("mousemove", function(e) {
            if (isDragging) {
                panel.style.left = (e.clientX - offsetX) + "px";
                panel.style.top = (e.clientY - offsetY) + "px";
                GM_setValue('panelLeft', panel.style.left);
                GM_setValue('panelTop', panel.style.top);
            }
        });
        document.addEventListener("mouseup", () => { isDragging = false; });

        const listInput = panel.querySelector('#studyListInput');
        let detectIDsBtn;

        // ✅ Add detect visible study IDs button (only on front panel)
        detectIDsBtn = document.createElement("button");
        detectIDsBtn.textContent = "👀 Detect Unscreened Studies";
        detectIDsBtn.style.marginTop = "6px";
        detectIDsBtn.style.width = "100%";
        listInput.insertAdjacentElement("afterend", detectIDsBtn);

        detectIDsBtn.onclick = () => {
            const matches = document.body.innerText.match(/#\d+/g) || [];
            const uniqueIDs = [...new Set(matches.map(x => x.replace('#', '')))];
            if (uniqueIDs.length) {
                listInput.value = uniqueIDs.join(', ');
                alert(`✅ Detected ${uniqueIDs.length} unique study IDs.`);
            } else {
                alert("No study IDs found on this page.");
            }
        };

        const startBtn = panel.querySelector('#startBtn');
        const controls = panel.querySelector('#studyControls');
        const currentDisplay = panel.querySelector('#currentStudy');
        const resetBtn = panel.querySelector('#resetBtn');
        const exportBtn = panel.querySelector('#exportBtn');
        const panelYesBtn = panel.querySelector('#panelYesBtn');
        const panelNoBtn = panel.querySelector('#panelNoBtn');
        const panelMaybeBtn = panel.querySelector('#panelMaybeBtn');
        const progressBar = panel.querySelector('#progressBar');
        const progressInline = panel.querySelector('#progressInline');
        const summaryList = panel.querySelector('#summaryList');
        const toggleSummaryBtn = panel.querySelector('#toggleSummaryBtn');
        const skipBtn = panel.querySelector('#skipBtn');

        function simulateEnter() {
            const searchBox = document.querySelector("input[placeholder='Search studies']");
            if (searchBox && searchBox.value.startsWith("#")) {
                const enterEvent = new KeyboardEvent("keydown", {
                    bubbles: true,
                    cancelable: true,
                    key: "Enter",
                    code: "Enter",
                    keyCode: 13
                });
                searchBox.dispatchEvent(enterEvent);
            }
        }


        function updatePanelDecisionButtonsState() {
            const isScreeningPage = window.location.href.includes("review_studies/screen?filter=all&id=");
            const alreadyVoted = document.querySelector("button.vote-option.selected");
            const shouldDisable = !isScreeningPage || alreadyVoted;

            [panelYesBtn, panelNoBtn, panelMaybeBtn].forEach(btn => {
                btn.disabled = shouldDisable;
                btn.style.opacity = shouldDisable ? "0.5" : "1";
                btn.style.cursor = shouldDisable ? "not-allowed" : "pointer";
            });

            if (skipBtn) {
                const allDisabled = [panelYesBtn, panelNoBtn, panelMaybeBtn].every(btn => btn.disabled);
                skipBtn.disabled = !allDisabled;
                skipBtn.style.opacity = allDisabled ? '1' : '0.5';
                skipBtn.style.cursor = allDisabled ? 'pointer' : 'not-allowed';
            }
        }



        toggleSummaryBtn.addEventListener('click', () => {
            const isHidden = summaryList.style.display === 'none';
            summaryList.style.display = isHidden ? 'block' : 'none';
            toggleSummaryBtn.textContent = isHidden ? 'Hide decisions ▲' : 'Show decisions ▼';
            GM_setValue('summaryVisible', isHidden);
        });

        let studies = [],
            index = 0,
            decisions = {};

        const savedList = GM_getValue('studyList', '');
        const savedIndex = GM_getValue('studyIndex', 0);
        decisions = JSON.parse(GM_getValue('decisions', '{}'));

        if (savedList) {
            studies = savedList.split(',');
            index = savedIndex;
            listInput.style.display = 'none';
            startBtn.style.display = 'none';
            if (detectIDsBtn) detectIDsBtn.style.display = 'none';
            controls.style.display = 'block';
            // moved to summaryList
            document.getElementById("topRightIcons").style.display = "flex";
            const visible = GM_getValue('summaryVisible', false);
            summaryList.style.display = visible ? 'block' : 'none';
            toggleSummaryBtn.textContent = visible ? 'Hide decisions ▲' : 'Show decisions ▼';
            updateStudy();
        }

        startBtn.onclick = function() {
            const rawInput = listInput.value.trim();
            if (!rawInput) return alert("Please enter at least one study number.");
            const cleanInput = rawInput.replace(/\n|\r/g, ',');
            const parts = cleanInput.split(',').map(s => s.trim()).filter(Boolean);
            studies = [];

            parts.forEach(part => {
                const rangeMatch = part.match(/^(\d+)\s*-\s*(\d+)$/);
                if (rangeMatch) {
                    const start = parseInt(rangeMatch[1], 10);
                    const end = parseInt(rangeMatch[2], 10);
                    if (start <= end) {
                        for (let i = start; i <= end; i++) {
                            studies.push(String(i));
                        }
                    }
                } else {
                    studies.push(part);
                }
            });

            index = 0;
            GM_setValue('studyList', studies.join(','));
            GM_setValue('studyIndex', index);
            listInput.style.display = 'none';
            startBtn.style.display = 'none';
            if (detectIDsBtn) detectIDsBtn.style.display = 'none';
            controls.style.display = 'block';
            // moved to summaryList
            document.getElementById("topRightIcons").style.display = "flex";
            updateStudy();
            setTimeout(simulateEnter, 300);
        };

        function updateStudy() {
            if (index < studies.length) {
                const studyID = "#" + studies[index];
                currentDisplay.textContent = studyID;
                const searchBox = document.querySelector("input[placeholder='Search studies']");
                if (searchBox) {
                    searchBox.focus();
                    searchBox.value = studyID;
                    searchBox.dispatchEvent(new Event('input', {
                        bubbles: true
                    }));
                    searchBox.blur();
                }
                GM_setValue('studyIndex', index);
                attachDecisionListeners();
                updateSummary();
            createLevelProgressUI(summaryList);
            summaryList.insertAdjacentHTML('beforeend', `

`);
                updatePanelDecisionButtonsState();
                setTimeout(updatePanelDecisionButtonsState, 300);
                const counted = studies.filter(id => ["Yes", "No", "Maybe", "Skipped"].includes(decisions[id])).length;
const progress = Math.round((counted / studies.length) * 100);
if (progressBar && studies.length > 0) {
    progressBar.style.width = progress + '%';
}
if (progressInline) progressInline.textContent = `(${counted} of ${studies.length} done)`;

            }
        }

        function attachDecisionListeners() {
            const buttons = document.querySelectorAll("button.vote-option");
            buttons.forEach(btn => {
                const value = btn.value;
                if (["Yes", "No", "Maybe"].includes(value) && !btn.dataset.csvAttached) {
                    btn.dataset.csvAttached = "true";
                    btn.addEventListener("click", () => {
                        if (window.__fromPanel) return;
                        const currentID = studies[index];
                        if (lastVotedStudy === currentID) return;
                        lastVotedStudy = currentID;

                        decisions[currentID] = value;
                        GM_setValue("decisions", JSON.stringify(decisions));


                        currentDisplay.textContent = `#${currentID}`;
                        updateSummary();
            createLevelProgressUI(summaryList);
            summaryList.insertAdjacentHTML('beforeend', `

`);
                        updatePanelDecisionButtonsState();
                setTimeout(updatePanelDecisionButtonsState, 300);
                    });
                }
            });
        }



        summaryList.addEventListener('click', function(e) {
            if (e.target.id === 'resetProgressBtn') {
                if (confirm('Reset your lifetime progress?')) {
                    GM_setValue("totalStudiesScreened", "0");
                    GM_setValue("lastLevel", "0");
                    updateLifetimeProgressUI();
                }
            }
        });


        function updateSummary() {
            const maybeList = studies.filter(id => decisions[id] === "Maybe");
            const yesList = studies.filter(id => decisions[id] === "Yes");
            const noList = studies.filter(id => decisions[id] === "No");

            function makeColoredList(ids, color) {
                return ids.map(id => `<span style="color:${color};">${id}</span>`).join(', ');
            }

            summaryList.innerHTML = `<div style="margin-bottom: 10px;"></div>` +

                `<strong style="color:orange;">Maybe:</strong> ${makeColoredList(maybeList, 'orange')}<br>
     <strong style="color:green;">Yes:</strong> ${makeColoredList(yesList, 'green')}<br>
     <strong style="color:red;">No:</strong> ${makeColoredList(noList, 'red')}`;


        }

        setInterval(() => {
            if (panel.dataset.jumpTo) {
                const jumpID = panel.dataset.jumpTo;
                const idx = studies.indexOf(jumpID);
                if (idx >= 0) {
                    index = idx;
                    GM_setValue('studyIndex', index);
                    updateStudy();
                    setTimeout(simulateEnter, 300);
                }
                delete panel.dataset.jumpTo;
            }
        }, 500);



        function simulateDecision(value) {
            window.__fromPanel = true;
            const currentID = studies[index];
            decisions[currentID] = value;
            GM_setValue("decisions", JSON.stringify(decisions));
            const totalKey = "totalStudiesScreened";
            const prev = parseInt(GM_getValue(totalKey, "0"), 10);
            GM_setValue(totalKey, (prev + 1).toString());
            updateLifetimeProgressUI();

            currentDisplay.textContent = `#${currentID}`;
            updateSummary();
            createLevelProgressUI(summaryList);
            summaryList.insertAdjacentHTML('beforeend', `

`);
            updatePanelDecisionButtonsState();

            const button = document.querySelector(`button.vote-option[value="${value}"]`);
            if (button) button.click();

            if (index < studies.length - 1) {
                index++;
                GM_setValue('studyIndex', index);
                setTimeout(() => {
                    updateStudy();
                    setTimeout(() => {
                        simulateEnter();
                        window.__fromPanel = false;
                    }, 300);
                }, 100);
            } else {
                window.__fromPanel = false;

                const allFinished = studies.every(id =>
                    ["Yes", "No", "Maybe", "Skipped"].includes(decisions[id])
                );

// ✅ Ensure progress bar updates to 100% before alert
const counted = studies.filter(id => ["Yes", "No", "Maybe", "Skipped"].includes(decisions[id])).length;
const progress = Math.round((counted / studies.length) * 100);
progressBar.style.width = progress + '%';
progressInline.textContent = `${counted} of ${studies.length} studies done`;


                if (allFinished) {
                    updateSummary();
            createLevelProgressUI(summaryList);
            summaryList.insertAdjacentHTML('beforeend', `

`);

                    if (progressInline) progressInline.textContent = `(${counted} of ${studies.length} done)`;
                    setTimeout(() => {
                        alert("You've reached the end of your study list!");

                        const csvHeader = "Study ID,Decision";
                        const csvRows = studies.filter(id => decisions[id]).map(id => `${id},${decisions[id]}`);
                        const csvContent = "data:text/csv;charset=utf-8," + [csvHeader, ...csvRows].join("\n");
                        const encodedUri = encodeURI(csvContent);
                        const link = document.createElement("a");
                        link.setAttribute("href", encodedUri);
                        link.setAttribute("download", "covidence_decisions.csv");
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);

                        GM_setValue('studyList', '');
                        GM_setValue('studyIndex', 0);
                        GM_setValue('decisions', '{}');

                        listInput.style.display = 'block';
                        startBtn.style.display = 'block';
                        if (detectIDsBtn) detectIDsBtn.style.display = 'block';
                        controls.style.display = 'none';
                        listInput.value = '';
                        document.getElementById("topRightIcons").style.display = "none";

                        const match = window.location.href.match(/\/reviews\/(\d+)\//);
                        if (match) {
                            const reviewID = match[1];
                            const targetURL = `https://${location.hostname}/reviews/${reviewID}/review_studies/screen?filter=vote_required_from`;
                            window.location.href = targetURL;
                        }
                    }, 100);
                }
            }
        }
resetBtn.onclick = function() {
            GM_setValue('studyList', '');
            GM_setValue('studyIndex', 0);
            GM_setValue('decisions', '{}');
            location.reload();
        };

        exportBtn.onclick = function() {
            const csvHeader = "Study ID,Decision";
            const csvRows = studies.filter(id => decisions[id]).map(id => `${id},${decisions[id]}`);
            const csvContent = "data:text/csv;charset=utf-8," + [csvHeader, ...csvRows].join("\n");
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "covidence_decisions.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        panelYesBtn.onclick = () => simulateDecision("Yes");
        panelNoBtn.onclick = () => simulateDecision("No");
        panelMaybeBtn.onclick = () => simulateDecision("Maybe");
        skipBtn.onclick = () => {
            if (!skipBtn.disabled) simulateDecision("Skipped");
        };

        const keywordInput = panel.querySelector('#keywordInput');
        const keywordHistoryDropdown = panel.querySelector('#keywordHistoryDropdown');
        keywordInput.addEventListener('focus', renderKeywordHistoryDropdown);
        document.addEventListener('click', (e) => {
            const isInside = panel.contains(e.target) &&
                  (e.target === keywordInput || keywordHistoryDropdown.contains(e.target));
            if (!isInside) {
                keywordHistoryDropdown.style.display = 'none';
            }
        });


        const addKeywordsBtn = panel.querySelector('#addKeywordsBtn');
        const keywordTags = panel.querySelector('#keywordTags');
        const savedTags = JSON.parse(GM_getValue('keywordTags', '[]'));
        renderKeywordTags(savedTags);


        const styleTag = document.createElement('style');
        styleTag.textContent = `.keyword-highlight { background-color: yellow; font-weight: bold; }`;
        document.head.appendChild(styleTag);



        function highlightKeyword(keyword) {
            if (!keyword.trim()) return;
            const regex = new RegExp(`(${keyword})`, 'gi');
            const treeWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            const nodes = [];
            while (treeWalker.nextNode()) {
                const node = treeWalker.currentNode;
                if (!node.parentNode.closest('#covidence-panel')) nodes.push(node);
            }
            nodes.forEach(node => {
                if (regex.test(node.nodeValue)) {
                    const span = document.createElement('span');
                    span.innerHTML = node.nodeValue.replace(regex, '<mark class="keyword-highlight">$1</mark>');
                    node.parentNode.replaceChild(span, node);
                }
            });
        }

        function renderKeywordHistoryDropdown() {
            const history = JSON.parse(GM_getValue('keywordSearchHistory', '[]'));
            keywordHistoryDropdown.innerHTML = '';

            if (history.length === 0) {
                keywordHistoryDropdown.style.display = 'none';
                return;
            }

            history.slice().reverse().forEach(item => {
                const row = document.createElement('div');
                row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 4px 6px; cursor: pointer;';

                const label = document.createElement('span');
                label.textContent = item;
                label.style.flex = '1';
                label.onclick = () => {
                    keywordInput.value = item;
                    keywordHistoryDropdown.style.display = 'none';
                };

                const removeBtn = document.createElement('span');
                removeBtn.textContent = '×';
                removeBtn.style.cssText = 'color: red; margin-left: 8px; font-weight: bold; cursor: pointer;';
                removeBtn.addEventListener('mousedown', (e) => {
                    e.stopPropagation(); // prevent triggering fill-in
                    const updated = history.filter(k => k !== item);
                    GM_setValue('keywordSearchHistory', JSON.stringify(updated));
                    renderKeywordHistoryDropdown();
                });

                row.appendChild(label);
                row.appendChild(removeBtn);
                row.onmouseenter = () => { row.style.background = '#f0f0f0'; };
                row.onmouseleave = () => { row.style.background = 'white'; };

                keywordHistoryDropdown.appendChild(row);
            });

            keywordHistoryDropdown.style.display = 'block';
        }


        addKeywordsBtn.onclick = () => {
            const raw = keywordInput.value.trim();
            if (!raw) return;

            const newKeywords = raw.split(',').map(k => k.trim()).filter(Boolean);
            const currentKeywords = JSON.parse(GM_getValue('keywordTags', '[]'));
            const updated = [...new Set([...currentKeywords, ...newKeywords])];
            GM_setValue('keywordTags', JSON.stringify(updated));
            renderKeywordTags(updated);

            // ✅ Save to keyword search history
            const history = JSON.parse(GM_getValue('keywordSearchHistory', '[]'));
            const newHistory = [...new Set([...history, ...newKeywords])];
            GM_setValue('keywordSearchHistory', JSON.stringify(newHistory));

            keywordInput.value = '';
            keywordHistoryDropdown.style.display = 'none';
        };



        setInterval(updatePanelDecisionButtonsState, 1500);

        function renderKeywordTags(tags) {
            keywordTags.innerHTML = '';
            tags.forEach(word => {
                const wrapper = document.createElement('div');
                wrapper.style.cssText = 'display:flex; align-items:center; background:#eee; border:1px solid #ccc; border-radius:4px; padding:2px 6px; font-size:13px; gap:4px;';

                const span = document.createElement('span');
                span.textContent = word;
                span.style.cursor = 'pointer';
                span.onclick = () => highlightKeyword(word);

                const removeBtn = document.createElement('span');
                removeBtn.textContent = '×';
                removeBtn.style.cssText = 'color:red; cursor:pointer; font-weight:bold;';
                removeBtn.onclick = () => {
                    const updatedTags = tags.filter(k => k !== word);
                    GM_setValue('keywordTags', JSON.stringify(updatedTags));
                    renderKeywordTags(updatedTags);
                };

                wrapper.appendChild(span);
                wrapper.appendChild(removeBtn);
                keywordTags.appendChild(wrapper);
            });
        }

    }

window.addEventListener('load', () => {
    setTimeout(createPanel, 5);

    // 👇 Check if a toast was queued
    const pendingToast = GM_getValue("showRankUpNextLoad", null);
    if (pendingToast) {
        setTimeout(() => {
            showRankUpToast(pendingToast);
            GM_setValue("showRankUpNextLoad", null);
        }, 800); // slight delay so panel loads first
    }
});

    // ✅ Automatically click "Next" after built-in button — unless triggered from panel
    document.body.addEventListener("click", function(e) {
        const voteBtn = e.target.closest("button.vote-option");
        if (voteBtn && ["Yes", "No", "Maybe"].includes(voteBtn.value)) {
        let currentID = voteBtn?.closest("li")?.querySelector("span")?.textContent?.trim() || null;
        if (currentID && lastVotedStudy === currentID) return;
        lastVotedStudy = currentID;
        const panel = document.getElementById("covidence-panel");
        const studyControlsVisible = panel && panel.querySelector('#studyControls')?.style.display !== 'none';
        if (!studyControlsVisible) return;
            if (window.__fromPanel) return;

            const savedList = GM_getValue('studyList', '');
            const savedIndex = GM_getValue('studyIndex', 0);
            const decisions = JSON.parse(GM_getValue('decisions', '{}'));
            const studies = savedList.split(',').map(s => s.trim()).filter(Boolean);

           currentID = studies[savedIndex];
            if (currentID) {
                decisions[currentID] = voteBtn.value;
                GM_setValue("decisions", JSON.stringify(decisions));
            const totalKey = "totalStudiesScreened";
            const prev = parseInt(GM_getValue(totalKey, "0"), 10);
            GM_setValue(totalKey, (prev + 1).toString());
            updateLifetimeProgressUI();

            }

            const allFinished = studies.every(id =>
                ["Yes", "No", "Maybe", "Skipped"].includes(decisions[id])
            );

            if (allFinished) {
                // ✅ Update summary first
                const panel = document.getElementById("covidence-panel");
                if (panel) {
                    const currentDisplay = panel.querySelector('#currentStudy');
                    if (currentDisplay) currentDisplay.textContent = `#${currentID}`;
                    const summaryList = panel.querySelector('#summaryList');
                    const toggleSummaryBtn = panel.querySelector('#toggleSummaryBtn');
        const skipBtn = panel.querySelector('#skipBtn');
                    const maybeList = studies.filter(id => decisions[id] === "Maybe");
                    const yesList = studies.filter(id => decisions[id] === "Yes");
                    const noList = studies.filter(id => decisions[id] === "No");
                    function makeColoredList(ids, color) {
                        return ids.map(id => `<span style="color:${color};">${id}</span>`).join(', ');
                    }
                    summaryList.innerHTML = `<div style="margin-bottom: 10px;"></div>` +

                        `<strong style="color:orange;">Maybe:</strong> ${makeColoredList(maybeList, 'orange')}<br>
             <strong style="color:green;">Yes:</strong> ${makeColoredList(yesList, 'green')}<br>
             <strong style="color:red;">No:</strong> ${makeColoredList(noList, 'red')}`;
                    summaryList.style.display = 'block';
                    toggleSummaryBtn.textContent = 'Hide decisions ▲';
                    GM_setValue('summaryVisible', true);
                }

                // ⏱️ Delay popup so the UI visibly updates first

                // ✅ Update progress bar before final popup
                const counted = studies.filter(id => ["Yes", "No", "Maybe", "Skipped"].includes(decisions[id])).length;
                const progress = Math.round((counted / studies.length) * 100);
                if (progressBar && studies.length > 0) {
                    progressBar.style.width = progress + '%';
                }
                if (progressInline) {
                    progressInline.textContent = `${counted} of ${studies.length} studies done`;
                }
if (progressInline) progressInline.textContent = `(${counted} of ${studies.length} done)`;

                // ✅ Synchronously force progress bar + trophy UI before alert
const summaryList = document.querySelector('#summaryList');
if (summaryList && !document.getElementById("lifetimeProgressContainer")) {
    createLevelProgressUI(summaryList);
}

                setTimeout(() => {
                    alert("You've reached the end of your study list!");

                    // ✅ Export CSV
                    const csvHeader = "Study ID,Decision";
                    const csvRows = studies.filter(id => decisions[id]).map(id => `${id},${decisions[id]}`);
                    const csvContent = "data:text/csv;charset=utf-8," + [csvHeader, ...csvRows].join("\n");
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", "covidence_decisions.csv");
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    // ✅ Reset panel
                    GM_setValue('studyList', '');
                    GM_setValue('studyIndex', 0);
                    GM_setValue('decisions', '{}');

                    if (panel) {
                        const listInput = panel.querySelector('#studyListInput');
        let detectIDsBtn;

        // ✅ Add detect visible study IDs button (only on front panel)
        detectIDsBtn = document.createElement("button");
        detectIDsBtn.textContent = "📋 Detect Visible Study IDs";
        detectIDsBtn.style.marginTop = "6px";
        detectIDsBtn.style.width = "100%";
        listInput.insertAdjacentElement("afterend", detectIDsBtn);

        detectIDsBtn.onclick = () => {
            const matches = document.body.innerText.match(/#\d+/g) || [];
            const uniqueIDs = [...new Set(matches.map(x => x.replace('#', '')))];
            if (uniqueIDs.length) {
                listInput.value = uniqueIDs.join(', ');
                alert(`✅ Detected ${uniqueIDs.length} unique study IDs.`);
            } else {
                alert("No visible study IDs found on this page.");
            }
        };

                        const startBtn = panel.querySelector('#startBtn');
                        const controls = panel.querySelector('#studyControls');
                        listInput.style.display = 'block';
                        startBtn.style.display = 'block';
                        if (detectIDsBtn) detectIDsBtn.style.display = 'block';
                        controls.style.display = 'none';
                        listInput.value = '';
                        document.getElementById("topRightIcons").style.display = "none";
                    }

                    // ✅ Redirect
                    const match = window.location.href.match(/\/reviews\/(\d+)\//);
                    if (match) {
                        const reviewID = match[1];
                        const targetURL = `https://${location.hostname}/reviews/${reviewID}/review_studies/screen?filter=vote_required_from`;
                        window.location.href = targetURL;
                    }
                }, 100); // allow DOM to update before blocking alert
            }
            else {
                // ✅ Go to next study
                const currentID = studies[savedIndex];
                if (!decisions[currentID]) {
                    decisions[currentID] = "Skipped";
                    GM_setValue("decisions", JSON.stringify(decisions));
            const totalKey = "totalStudiesScreened";
            const prev = parseInt(GM_getValue(totalKey, "0"), 10);
            GM_setValue(totalKey, (prev + 1).toString());
            updateLifetimeProgressUI();

                }

                const newIndex = savedIndex + 1;
                if (newIndex < studies.length) {
                    GM_setValue('studyIndex', newIndex);
                    setTimeout(() => {
                        const panel = document.getElementById("covidence-panel");
                        if (panel) {
                            const currentDisplay = panel.querySelector('#currentStudy');
                            if (currentDisplay) currentDisplay.textContent = `#${studies[newIndex]}`;
                            panel.dataset.jumpTo = studies[newIndex];
                        }
                    }, 100);
                }
            }
        }
    });


})();