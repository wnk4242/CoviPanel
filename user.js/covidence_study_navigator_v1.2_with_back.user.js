// ==UserScript==
// @name         Covidence Study Navigator (Auto-Advance)
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Adds a persistent panel to step through study numbers on Covidence, with Enter and auto-advance after screening selection.
// @author       ChatGPT
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
        panel.style.top = "10px";
        panel.style.left = "10px";
        panel.style.zIndex = "9999";
        panel.style.background = "#f9f9f9";
        panel.style.border = "1px solid #ccc";
        panel.style.padding = "10px";
        panel.style.width = "250px";
        panel.style.fontSize = "14px";
        panel.style.fontFamily = "sans-serif";
        panel.style.boxShadow = "2px 2px 10px rgba(0,0,0,0.2)";

        panel.innerHTML = `
            <strong>Covidence Study Panel</strong><br>
            <textarea id='studyListInput' rows='3' style='width:100%; margin-top:5px;' placeholder='e.g., 1,2,3'></textarea>
            <button id='startBtn' style='margin-top:5px;'>Start</button>
            <div id='studyControls' style='display:none; margin-top:10px;'>
                <div>Current: <span id='currentStudy'>?</span></div>
                <button id='pressEnterBtn' style='margin-top:5px;'>⏎ Enter</button>
                <button id='backBtn' style='margin-top:5px;'>⬅️ Back</button>
                <button id='nextBtn' style='margin-top:5px;'>➡️ Next</button>
                <button id='resetBtn' style='margin-top:5px;'>🔄 Reset</button>
            </div>
        `;
        document.body.appendChild(panel);

        const listInput = panel.querySelector('#studyListInput');
        const startBtn = panel.querySelector('#startBtn');
        const controls = panel.querySelector('#studyControls');
        const currentDisplay = panel.querySelector('#currentStudy');
        const nextBtn = panel.querySelector('#nextBtn');
        const resetBtn = panel.querySelector('#resetBtn');
        const pressEnterBtn = panel.querySelector('#pressEnterBtn');
        const backBtn = panel.querySelector('#backBtn');

        let studies = [];
        let index = 0;

        const savedList = GM_getValue('studyList', '');
        const savedIndex = GM_getValue('studyIndex', 0);
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
                const searchBox = document.querySelector("input[placeholder='Search studies']");
                if (searchBox) {
                    searchBox.focus();
                    searchBox.value = studyID;
                    searchBox.dispatchEvent(new Event('input', { bubbles: true }));
                    searchBox.blur();
                }
                GM_setValue('studyIndex', index);
            } else {
                alert("✅ All studies done!");
            }
        }

        startBtn.onclick = function() {
            const rawInput = listInput.value.trim();
            if (!rawInput) {
                alert("Please enter at least one study number.");
                return;
            }
            studies = rawInput.split(',').map(s => s.trim()).filter(Boolean);
            index = 0;
            GM_setValue('studyList', studies.join(','));
            GM_setValue('studyIndex', index);
            listInput.style.display = 'none';
            startBtn.style.display = 'none';
            controls.style.display = 'block';
            updateStudy();
        };

        nextBtn.onclick = function() {
            if (index < studies.length - 1) {
                index++;
                updateStudy();
            } else {
                alert("✅ All studies completed!");
                GM_setValue('studyIndex', studies.length);
            }
        };

        pressEnterBtn.onclick = function() {
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

        backBtn.onclick = function() {
            if (index > 0) {
                index--;
                updateStudy();
            }
        };

        resetBtn.onclick = function() {
            GM_setValue('studyList', '');
            GM_setValue('studyIndex', 0);
            location.reload();
        };

        const observer = new MutationObserver(() => {
            const decisionMade = document.querySelector('[data-automation-id="decision-made-indicator"]');
            if (decisionMade && decisionMade.innerText.match(/yes|no|maybe/i)) {
                setTimeout(() => {
                    if (index < studies.length - 1) {
                        index++;
                        updateStudy();
                    }
                }, 1000);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    window.addEventListener('load', () => {
        setTimeout(createPanel, 1000);
    });
})();
