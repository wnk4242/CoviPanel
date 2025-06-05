// ==UserScript==
// @name         Covidence Study Navigator
// @namespace    http://tampermonkey.net/
// @version      3.9.9 (front panel issues)
// @description  Draggable Covidence panel with saved position, decision logging, CSV export, color-coded decision display.
// @match        *://*.covidence.org/*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
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

            <div id="topRightIcons" style="position: absolute; top: 11px; right: 10px; display: flex; flex-direction: row; align-items: center; gap: 6px;">
        <input id='keywordInput' placeholder='Enter keywords' style='padding: 3px 6px; font-size: 13px; width: 199px; border: 1px solid #ccc; border-radius: 4px;'>
        <button id='searchKeywordBtn' title='Search keyword' style='background: none; border: none; cursor: pointer; font-size: 20px;'>🔍︎</button>
        <button id="exportBtn" title="Export decisions to .csv" style="background:none; border:none; cursor:pointer; font-size:22px;">🖫</button>
        <button id="resetBtn" title="Start a new screening session" style="background:none; border:none; cursor:pointer; font-size:21px;">⟳</button>
        <div id='keywordHistoryDropdown' style='position:absolute; top: 100%; left: 0; background:white; border:1px solid #ccc; max-height:100px; overflow-y:auto; font-size:13px; z-index:9999; display:none; width: 198px;'></div>
    </div>
            <textarea id='studyListInput' rows='6' style='width:100%; margin-top:10px; font-size: 15px;' placeholder='You may paste study IDs from Excel, enter a range using a hyphen (e.g., 1-10), or combine individual and range IDs with commas (e.g., 1, 3-5).'></textarea>
            <button id='startBtn' style='margin-top:10px; width: 100%;'>Start</button>
            <div id='studyControls' style='display:none; margin-top:35px;'>
              <div style="margin-bottom: 5px;">Current study: <span id='currentStudy'>?</span>
  <button id='skipBtn' title='Skip this study' style='margin-left: 6px; background: none; border: none; font-size: 16px; cursor: not-allowed; opacity: 0.5;' disabled>⏭</button>
              </div>
              <div id="progressText" style="margin-bottom: 6px; font-size: 12px; color: #333;">0 of 0</div>
              <div style="margin-bottom: 12px; height: 10px; background: #eee; border-radius: 4px;">
                <div id="progressBar" style="height: 100%; background: #4caf50; width: 0%; border-radius: 4px;"></div>
              </div>
              <div style="margin-bottom: 30px; display: flex; flex-direction: column; gap: 12px; align-items: center;">
                <button id="panelMaybeBtn" style="background-color: #ff9800; color: white; width: 80%; padding: 10px 0; border-radius: 6px; font-weight: bold;">Maybe</button>
                <button id="panelYesBtn" style="background-color: #4caf50; color: white; width: 80%; padding: 10px 0; border-radius: 6px; font-weight: bold;">Yes</button>
                <button id="panelNoBtn" style="background-color: #f44336; color: white; width: 80%; padding: 10px 0; border-radius: 6px; font-weight: bold;">No</button>
              </div>
              <div style="margin-bottom: 20px; display: flex; flex-direction: column; gap: 8px; align-items: center;"></div>
              <!-- Keyword Search UI -->
                  </div>

                </div>
                <div id='keywordTags' style='margin-top: -25px; display: flex; flex-wrap: wrap; gap: 6px;'></div>
              </div>
              <button id='toggleSummaryBtn' style='margin: 0 auto 8px auto; margin-top: 10px; margin-bottom: 8px; display: block; background: none; border: none; color: #007BFF; font-size: 13px; cursor: pointer;'>Show decisions ▼</button>
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
        const startBtn = panel.querySelector('#startBtn');
        const controls = panel.querySelector('#studyControls');
        const currentDisplay = panel.querySelector('#currentStudy');
        const resetBtn = panel.querySelector('#resetBtn');
        const exportBtn = panel.querySelector('#exportBtn');
        const panelYesBtn = panel.querySelector('#panelYesBtn');
        const panelNoBtn = panel.querySelector('#panelNoBtn');
        const panelMaybeBtn = panel.querySelector('#panelMaybeBtn');
        const progressBar = panel.querySelector('#progressBar');
        const progressText = panel.querySelector('#progressText');
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
            controls.style.display = 'block';
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
            controls.style.display = 'block';
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
                updatePanelDecisionButtonsState();
                setTimeout(updatePanelDecisionButtonsState, 300);
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
                setTimeout(updatePanelDecisionButtonsState, 300);
                    });
                }
            });
        }

        function updateSummary() {
            const maybeList = studies.filter(id => decisions[id] === "Maybe");
            const yesList = studies.filter(id => decisions[id] === "Yes");
            const noList = studies.filter(id => decisions[id] === "No");

            function makeColoredList(ids, color) {
                return ids.map(id => `<span style="color:${color};">${id}</span>`).join(', ');
            }

            summaryList.innerHTML =
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
                window.__fromPanel = false;

                const allFinished = studies.every(id =>
                    ["Yes", "No", "Maybe", "Skipped"].includes(decisions[id])
                );

                if (allFinished) {
                    updateSummary();

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


        const searchKeywordBtn = panel.querySelector('#searchKeywordBtn');
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


        searchKeywordBtn.onclick = () => {
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
    });

    // ✅ Automatically click "Next" after built-in button — unless triggered from panel
    document.body.addEventListener("click", function(e) {
        const voteBtn = e.target.closest("button.vote-option");
        if (voteBtn && ["Yes", "No", "Maybe"].includes(voteBtn.value)) {
        const panel = document.getElementById("covidence-panel");
        const studyControlsVisible = panel && panel.querySelector('#studyControls')?.style.display !== 'none';
        if (!studyControlsVisible) return;
            if (window.__fromPanel) return;

            const savedList = GM_getValue('studyList', '');
            const savedIndex = GM_getValue('studyIndex', 0);
            const decisions = JSON.parse(GM_getValue('decisions', '{}'));
            const studies = savedList.split(',').map(s => s.trim()).filter(Boolean);

            const currentID = studies[savedIndex];
            if (currentID) {
                decisions[currentID] = voteBtn.value;
                GM_setValue("decisions", JSON.stringify(decisions));
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
                    summaryList.innerHTML =
                        `<strong style="color:orange;">Maybe:</strong> ${makeColoredList(maybeList, 'orange')}<br>
             <strong style="color:green;">Yes:</strong> ${makeColoredList(yesList, 'green')}<br>
             <strong style="color:red;">No:</strong> ${makeColoredList(noList, 'red')}`;
                    summaryList.style.display = 'block';
                    toggleSummaryBtn.textContent = 'Hide decisions ▲';
                    GM_setValue('summaryVisible', true);
                }

                // ⏱️ Delay popup so the UI visibly updates first
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
                        const startBtn = panel.querySelector('#startBtn');
                        const controls = panel.querySelector('#studyControls');
                        listInput.style.display = 'block';
                        startBtn.style.display = 'block';
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