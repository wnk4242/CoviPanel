// ==UserScript==
// @name         Covidence Study Navigator
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Draggable Covidence panel with saved position, decision logging, CSV export, color-coded decision display, jump-to links, and built-in button support to auto-navigate to the next study.
// @match        *://*.covidence.org/*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function () {
    'use strict';
    if (window.top !== window.self) return;

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
            <strong style="font-size: 15px;">Covidence Study Panel</strong>
            <textarea id='studyListInput' rows='6' style='width:100%; margin-top:10px; font-size: 15px;' placeholder='Paste study IDs from Excel or type them manually, separated by commas (e.g., 1, 2, 3)'></textarea>
            <button id='startBtn' style='margin-top:10px; width: 100%;'>Start</button>
            <div id='studyControls' style='display:none; margin-top:15px;'>
                <div style="margin-bottom: 5px;">Current study: <span id='currentStudy'>?</span></div>
                <div id="progressText" style="margin-bottom: 6px; font-size: 12px; color: #333;">0 of 0</div>
                <div style="margin-bottom: 12px; height: 10px; background: #eee; border-radius: 4px;">
                    <div id="progressBar" style="height: 100%; background: #4caf50; width: 0%; border-radius: 4px;"></div>
                </div>
                <div style="margin-bottom: 30px; display: flex; flex-direction: column; gap: 12px; align-items: center;">
                    <button id="panelMaybeBtn" style="background-color: #ff9800; color: white; width: 80%; padding: 10px 0; border-radius: 6px; font-weight: bold;">Maybe</button>
                    <button id="panelYesBtn" style="background-color: #4caf50; color: white; width: 80%; padding: 10px 0; border-radius: 6px; font-weight: bold;">Yes</button>
                    <button id="panelNoBtn" style="background-color: #f44336; color: white; width: 80%; padding: 10px 0; border-radius: 6px; font-weight: bold;">No</button>
                </div>
                <div style="margin-bottom: 20px; display: flex; flex-direction: column; gap: 8px; align-items: center;">
                    <button id='nextBtn' style='background-color: #001f3f; color: white; width: 80%; padding: 8px 0; border-radius: 6px; font-weight: bold;'>Next</button>
                    <button id='backBtn' style='background-color: #001f3f; color: white; width: 80%; padding: 8px 0; border-radius: 6px; font-weight: bold;'>Back</button>
                    <button id='resetBtn' style='background-color: #001f3f; color: white; width: 80%; padding: 8px 0; border-radius: 6px; font-weight: bold;'>Reset</button>
                </div>
                <div style='display: flex; justify-content: center;'>
                    <button id='exportBtn' style='background-color: #c0c0c0; color: white; font-weight: bold; width: 80%; padding: 8px 0; border-radius: 20px; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 13px; margin-bottom: 10px;'>
                        <span style="font-size: 16px;">📥</span> Export decisions to .csv
                    </button>
                </div>
                <button id='toggleSummaryBtn' style='margin: 0 auto 8px auto; display: block; background: none; border: none; color: #007BFF; font-size: 13px; cursor: pointer;'>Show decisions ▼</button>
                <div id='summaryList' style='display:none; font-size: 12px; line-height: 1.4; max-height: 150px; overflow-y: auto;'></div>
            
                <!-- Keyword Search UI -->
                <div style='margin-top: 14px;'>
                    <input id='keywordInput' placeholder='Enter keywords separated by commas' style='width:100%; padding: 4px; font-size: 13px; margin-bottom: 4px;'>
                    <button id='addKeywordsBtn' style='width: 100%; padding: 6px 0; background-color: #007BFF; color: white; border: none; border-radius: 4px; font-weight: bold;'>Add Keywords</button>
                    <button id='clearHighlightsBtn' style='width: 100%; margin-top: 6px; padding: 6px 0; background-color: #888; color: white; border: none; border-radius: 4px; font-weight: bold;'>Clear Highlights</button>
                    <div id='keywordTags' style='margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px;'></div>
                </div>
</div>
        `;

        document.body.appendChild(panel);

        let isDragging = false, offsetX, offsetY;
        panel.addEventListener("mousedown", function (e) {
            if (["textarea", "input", "button"].includes(e.target.tagName.toLowerCase())) return;
            isDragging = true;
            offsetX = e.clientX - panel.offsetLeft;
            offsetY = e.clientY - panel.offsetTop;
        });
        document.addEventListener("mousemove", function (e) {
            if (isDragging) {
                panel.style.left = (e.clientX - offsetX) + "px";
                panel.style.top = (e.clientY - offsetY) + "px";
                GM_setValue('panelLeft', panel.style.left);
                GM_setValue('panelTop', panel.style.top);
            }
        });
        document.addEventListener("mouseup", () => isDragging = false);

        const listInput = panel.querySelector('#studyListInput');
        const startBtn = panel.querySelector('#startBtn');
        const controls = panel.querySelector('#studyControls');
        const currentDisplay = panel.querySelector('#currentStudy');
        const nextBtn = panel.querySelector('#nextBtn');
        const backBtn = panel.querySelector('#backBtn');
        const resetBtn = panel.querySelector('#resetBtn');
        const exportBtn = panel.querySelector('#exportBtn');
        const panelYesBtn = panel.querySelector('#panelYesBtn');
        const panelNoBtn = panel.querySelector('#panelNoBtn');
        const panelMaybeBtn = panel.querySelector('#panelMaybeBtn');
        const progressBar = panel.querySelector('#progressBar');
        const progressText = panel.querySelector('#progressText');
        const summaryList = panel.querySelector('#summaryList');
        const toggleSummaryBtn = panel.querySelector('#toggleSummaryBtn');

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
            const isSearchPage = window.location.href.includes("review_studies/screen?filter=all&id=");
            [panelYesBtn, panelNoBtn, panelMaybeBtn].forEach(btn => {
                btn.disabled = !isSearchPage;
                btn.style.opacity = isSearchPage ? "1" : "0.5";
                btn.style.cursor = isSearchPage ? "pointer" : "not-allowed";
            });
        }

        toggleSummaryBtn.addEventListener('click', () => {
            const isHidden = summaryList.style.display === 'none';
            summaryList.style.display = isHidden ? 'block' : 'none';
            toggleSummaryBtn.textContent = isHidden ? 'Hide decisions ▲' : 'Show decisions ▼';
            GM_setValue('summaryVisible', isHidden);
        });

        let studies = [], index = 0, decisions = {};

        const savedList = GM_getValue('studyList', '');
        const savedIndex = GM_getValue('studyIndex', 0);
        decisions = JSON.parse(GM_getValue('decisions', '{}'));

        if (savedList) {
            studies = savedList.split(',');
            index = savedIndex;
            listInput.style.display = 'none';
            startBtn.style.display = 'none';
            controls.style.display = 'block';
            const visible = GM_getValue('summaryVisible', false);
            summaryList.style.display = visible ? 'block' : 'none';
            toggleSummaryBtn.textContent = visible ? 'Hide decisions ▲' : 'Show decisions ▼';
            updateStudy();
        }

        startBtn.onclick = function () {
            const rawInput = listInput.value.trim();
            if (!rawInput) return alert("Please enter at least one study number.");
            const cleanInput = rawInput.replace(/\n|\r/g, ',');
            studies = cleanInput.split(',').map(s => s.trim()).filter(Boolean);
            index = 0;
            GM_setValue('studyList', studies.join(','));
            GM_setValue('studyIndex', index);
            listInput.style.display = 'none';
            startBtn.style.display = 'none';
            controls.style.display = 'block';
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
                    searchBox.dispatchEvent(new Event('input', { bubbles: true }));
                    searchBox.blur();
                }
                GM_setValue('studyIndex', index);
                attachDecisionListeners();
                updateSummary();
                updatePanelDecisionButtonsState();
                if (progressBar && studies.length > 0) {
                    const progress = Math.round(((index + 1) / studies.length) * 100);
                    progressBar.style.width = progress + '%';
                }
                if (progressText) progressText.textContent = `${index + 1} of ${studies.length}`;
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
                        decisions[currentID] = value;
                        GM_setValue("decisions", JSON.stringify(decisions));
                        currentDisplay.textContent = `#${currentID}`;
                        updateSummary();
                        updatePanelDecisionButtonsState();
                    });
                }
            });
        }

        function updateSummary() {
            const maybeList = studies.filter(id => decisions[id] === "Maybe");
            const yesList = studies.filter(id => decisions[id] === "Yes");
            const noList = studies.filter(id => decisions[id] === "No");
            const skippedList = studies.filter(id => decisions[id] === "Skipped");

            function makeClickableList(ids, color) {
                return ids.map(id => `<a href="#" data-jump-id="${id}" style="color:${color}; text-decoration:underline;">${id}</a>`).join(', ');
            }

            summaryList.innerHTML =
                `<strong style="color:orange;">Maybe:</strong> ${makeClickableList(maybeList, 'orange')}<br>
                 <strong style="color:green;">Yes:</strong> ${makeClickableList(yesList, 'green')}<br>
                 <strong style="color:red;">No:</strong> ${makeClickableList(noList, 'red')}<br>
                 <strong style="color:gray;">Skipped:</strong> ${makeClickableList(skippedList, 'gray')}`;

            summaryList.querySelectorAll('a[data-jump-id]').forEach(a => {
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    const jumpID = a.getAttribute('data-jump-id');
                    panel.dataset.jumpTo = jumpID;
                });
            });
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
            currentDisplay.textContent = `#${currentID}`;
            updateSummary();
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
                alert("You’ve reached the end of the list.");
                window.__fromPanel = false;
            }
        }

        nextBtn.onclick = function () {
            const currentID = studies[index];
            if (!decisions[currentID]) {
                decisions[currentID] = "Skipped";
                GM_setValue("decisions", JSON.stringify(decisions));
                updateSummary();
            }

            if (index < studies.length - 1) {
                index++;
                updateStudy();
                setTimeout(simulateEnter, 300);
            } else {
                alert("You’ve reached the end of the list.");
            }
        };

        backBtn.onclick = function () {
            if (index > 0) {
                index--;
                updateStudy();
                setTimeout(simulateEnter, 300);
            }
        };

        resetBtn.onclick = function () {
            GM_setValue('studyList', '');
            GM_setValue('studyIndex', 0);
            GM_setValue('decisions', '{}');
            location.reload();
        };

        exportBtn.onclick = function () {
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

        const keywordInput = panel.querySelector('#keywordInput');
        const addKeywordsBtn = panel.querySelector('#addKeywordsBtn');
        const clearHighlightsBtn = panel.querySelector('#clearHighlightsBtn');
        const keywordTags = panel.querySelector('#keywordTags');

        const styleTag = document.createElement('style');
        styleTag.textContent = `.keyword-highlight { background-color: yellow; font-weight: bold; }`;
        document.head.appendChild(styleTag);

        function clearHighlights() {
            document.querySelectorAll('mark.keyword-highlight').forEach(mark => {
                const parent = mark.parentNode;
                parent.replaceChild(document.createTextNode(mark.textContent), mark);
                parent.normalize();
            });
        }

        function highlightKeyword(keyword) {
            if (!keyword.trim()) return;
            clearHighlights();
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

        addKeywordsBtn.onclick = () => {
            const raw = keywordInput.value.trim();
            if (!raw) return;
            const keywords = [...new Set(raw.split(',').map(k => k.trim()).filter(Boolean))];
            keywordTags.innerHTML = '';
            keywords.forEach(word => {
                const tag = document.createElement('button');
                tag.textContent = word;
                tag.style.cssText = 'background:#eee; border:1px solid #ccc; border-radius:4px; padding:2px 6px; cursor:pointer; font-size:13px;';
                tag.onclick = () => highlightKeyword(word);
                keywordTags.appendChild(tag);
            });
            keywordInput.value = '';
        };

        clearHighlightsBtn.onclick = () => clearHighlights();
    }

    window.addEventListener('load', () => {
        setTimeout(createPanel, 5);
    });

    // ✅ Automatically click "Next" after built-in button — unless triggered from panel
    document.body.addEventListener("click", function (e) {
        const voteBtn = e.target.closest("button.vote-option");
        if (voteBtn && ["Yes", "No", "Maybe"].includes(voteBtn.value)) {
            if (window.__fromPanel) return;
            setTimeout(() => {
                const panel = document.getElementById("covidence-panel");
                if (!panel) return;
                const nextBtn = panel.querySelector("#nextBtn");
                if (nextBtn) nextBtn.click();
            }, 100);
        }
    });
})();
