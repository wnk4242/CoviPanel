// ==UserScript==
// @name         Covidence Study Navigator (Final with Color-Coded Decisions)
// @namespace    http://tampermonkey.net/
// @version      1.8.8
// @description  Draggable Covidence panel with saved position, decision logging, CSV export, color-coded decision display, and in-panel decision buttons.
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
        panel.style.padding = "12px";
        panel.style.width = "270px";
        panel.style.fontSize = "14px";
        panel.style.fontFamily = "sans-serif";
        panel.style.boxShadow = "2px 2px 10px rgba(0,0,0,0.2)";
        panel.style.cursor = "move";

        panel.innerHTML = `
            <strong style="font-size: 15px;">Covidence Study Panel</strong>
            <textarea id='studyListInput' rows='3' style='width:100%; margin-top:10px; font-size: 13px;' placeholder='e.g., 1,2,3'></textarea>
            <button id='startBtn' style='margin-top:10px; width: 100%;'>Start</button>
            <div id='studyControls' style='display:none; margin-top:15px;'>
                <div style="margin-bottom: 5px;">Current: <span id='currentStudy'>?</span></div>
                <div id="progressText" style="margin-bottom: 6px; font-size: 12px; color: #333;">0 of 0</div>
                <div style="margin-bottom: 12px; height: 10px; background: #eee; border-radius: 4px;">
                    <div id="progressBar" style="height: 100%; background: #4caf50; width: 0%; border-radius: 4px;"></div>
                </div>
                <div style="margin-bottom: 30px; display: flex; flex-direction: column; gap: 12px; align-items: center;">
                    <button id="panelNoBtn" style="background-color: #f44336; color: white; width: 80%; padding: 10px 0; border-radius: 6px; font-weight: bold;">No</button>
                    <button id="panelMaybeBtn" style="background-color: #ff9800; color: white; width: 80%; padding: 10px 0; border-radius: 6px; font-weight: bold;">Maybe</button>
                    <button id="panelYesBtn" style="background-color: #4caf50; color: white; width: 80%; padding: 10px 0; border-radius: 6px; font-weight: bold;">Yes</button>
                </div>
                <div style="margin-bottom: 20px; display: flex; flex-direction: column; gap: 8px; align-items: center;">
                    <button id='resetBtn' style='background-color: #001f3f; color: white; width: 80%; padding: 8px 0; border-radius: 6px; font-weight: bold;'>Reset</button>
                    <button id='backBtn' style='background-color: #001f3f; color: white; width: 80%; padding: 8px 0; border-radius: 6px; font-weight: bold;'>Back</button>
                    <button id='nextBtn' style='background-color: #001f3f; color: white; width: 80%; padding: 8px 0; border-radius: 6px; font-weight: bold;'>Next</button>
                </div>
                <button id='exportBtn' style='width: 100%; margin-bottom: 10px;'>📥 Export decisions to .csv</button>
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
            setTimeout(simulateEnter, 1000);
        };

        function updateStudy() {
            if (index < studies.length) {
                const studyID = "#" + studies[index];
                currentDisplay.textContent = studyID;
                if (decisions[studies[index]]) {
                    const dec = decisions[studies[index]];
                    let color = dec === "Yes" ? "green" : dec === "No" ? "red" : "orange";
                    currentDisplay.innerHTML += ` <span style="color:${color}">✔ Done: ${dec}</span>`;
                }
                if (progressBar && studies.length > 0) {
                    const progress = Math.round(((index + 1) / studies.length) * 100);
                    progressBar.style.width = progress + '%';
                }
                if (progressText) progressText.textContent = `${index + 1} of ${studies.length}`;
                const searchBox = document.querySelector("input[placeholder='Search studies']");
                if (searchBox) {
                    searchBox.focus();
                    searchBox.value = studyID;
                    searchBox.dispatchEvent(new Event('input', { bubbles: true }));
                    searchBox.blur();
                }
                GM_setValue('studyIndex', index);
                attachDecisionListeners();
            }
        }

        function simulateEnter() {
            const searchBox = document.querySelector("input[placeholder='Search studies']");
            if (searchBox) {
                const enterEvent = new KeyboardEvent('keydown', {
                    bubbles: true,
                    cancelable: true,
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13
                });
                searchBox.dispatchEvent(enterEvent);
            }
        }

        function attachDecisionListeners() {
            const buttons = document.querySelectorAll("button.vote-option");
            buttons.forEach(btn => {
                const value = btn.value;
                if (["Yes", "No", "Maybe"].includes(value) && !btn.dataset.csvAttached) {
                    btn.dataset.csvAttached = "true";
                    btn.addEventListener("click", () => {
                        const currentID = studies[index];
                        decisions[currentID] = value;
                        GM_setValue("decisions", JSON.stringify(decisions));
                        let color = value === "Yes" ? "green" : value === "No" ? "red" : "orange";
                        currentDisplay.innerHTML = `#${currentID} <span style="color:${color}">✔ Done: ${value}</span>`;
                    });
                }
            });
        }

        function simulateDecision(value) {
            const button = document.querySelector(`button.vote-option[value="${value}"]`);
            if (button) button.click();
        }

        panelYesBtn.onclick = () => simulateDecision("Yes");
        panelNoBtn.onclick = () => simulateDecision("No");
        panelMaybeBtn.onclick = () => simulateDecision("Maybe");

        nextBtn.onclick = function () {
            if (index < studies.length - 1) {
                index++;
                updateStudy();
                simulateEnter();
            } else {
                alert("All studies completed!");
            }
        };

        backBtn.onclick = function () {
            if (index > 0) {
                index--;
                updateStudy();
                simulateEnter();
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

        const observer = new MutationObserver(() => attachDecisionListeners());
        observer.observe(document.body, { childList: true, subtree: true });
    }

    window.addEventListener('load', () => {
        setTimeout(createPanel, 500);
    });
})();
