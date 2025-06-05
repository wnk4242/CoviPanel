// ==UserScript==
// @name         Covidence Study Navigator (Final with Color-Coded Decisions)
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  Draggable Covidence panel with saved position, decision logging, CSV export, and color-coded decision display.
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
        panel.style.padding = "10px";
        panel.style.width = "250px";
        panel.style.fontSize = "14px";
        panel.style.fontFamily = "sans-serif";
        panel.style.boxShadow = "2px 2px 10px rgba(0,0,0,0.2)";
        panel.style.cursor = "move";

        panel.innerHTML = `
            <strong>Covidence Study Panel</strong><br>
            <textarea id='studyListInput' rows='3' style='width:100%; margin-top:5px;' placeholder='e.g., 1,2,3'></textarea>
            <button id='startBtn' style='margin-top:5px;'>Start</button>
            <div id='studyControls' style='display:none; margin-top:10px;'>
                <div>Current: <span id='currentStudy'>?</span></div>
                <div id="progressText" style="margin: 2px 0 6px 0; font-size: 12px; color: #333;">0 of 0</div>
                <div style="margin-top: 6px; height: 10px; background: #eee; border-radius: 4px;">
                    <div id="progressBar" style="height: 100%; background: #4caf50; width: 0%; border-radius: 4px;"></div>
                </div>
                <button id='pressEnterBtn' style='margin-top:5px;'>⏎ Enter</button>
                <button id='backBtn' style='margin-top:5px;'>⬅️ Back</button>
                <button id='nextBtn' style='margin-top:5px;'>➡️ Next</button>
                <button id='resetBtn' style='margin-top:5px;'>🔄 Reset</button>
                <button id='exportBtn' style='margin-top:5px;'>📥 Export CSV</button>
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
        const pressEnterBtn = panel.querySelector('#pressEnterBtn');
        const exportBtn = panel.querySelector('#exportBtn');
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
        };

        nextBtn.onclick = function () {
            if (index < studies.length - 1) {
                index++;
                updateStudy();
            } else {
                alert("All studies completed!");
            }
        };

        backBtn.onclick = function () {
            if (index > 0) {
                index--;
                updateStudy();
            }
        };

        pressEnterBtn.onclick = function () {
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
        setTimeout(createPanel, 1000);
    });
})();
