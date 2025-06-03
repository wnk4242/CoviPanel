// ==UserScript==
// @name         Covidence Study Navigator
// @namespace    http://tampermonkey.net/
// @version      6.3.5
// @description  Draggable Covidence panel with saved position, decision logging, CSV export, color-coded decision display.
// @match        *://*.covidence.org/*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==
// Store panel background image data
let panelButtonImage = GM_getValue("panelButtonImage", "");
(function() {
function applyButtonBackgrounds() {
  const btns = [
    document.getElementById("panelMaybeBtn"),
    document.getElementById("panelYesBtn"),
    document.getElementById("panelNoBtn")
  ];

  if (!panelButtonImage) {
    btns.forEach(btn => {
      if (!btn) return;
      btn.style.backgroundImage = "";
      btn.style.backgroundSize = "";
      btn.style.backgroundPosition = "";
      btn.style.backgroundRepeat = "";
      btn.style.textShadow = "";
    });
    return;
  }

  // Use total background height as 300% to divide across 3 buttons
  btns.forEach((btn, index) => {
    if (!btn) return;
    btn.style.backgroundImage = `url('${panelButtonImage}')`;
    btn.style.backgroundSize = `100% ${btns.length * 100}%`; // Full width, triple height
    btn.style.backgroundPosition = `center ${index * (100 / (btns.length - 1))}%`;
    btn.style.backgroundRepeat = "no-repeat";
    btn.style.color = "white";
    btn.style.textShadow = "0 0 4px rgba(0,0,0,0.6)";
  });
}


    let lastVotedStudy = null;
    let lastDecisionTime = null;
let totalDecisionTimeMs = 0;
let totalDecisionsMade = 0;
let openaiKeyFromFile = GM_getValue("openaiKeyFromFile", "");
    'use strict';
    if (window.top !== window.self) return;


const LEVELS = [
  { threshold: 0, title: "Research Assistant I 🤦‍♂️" },
  { threshold: 2, title: "Research Assistant II 🤷‍♂️" },
  { threshold: 4, title: "PhD Student 1 Yr. 👦" },
  { threshold: 6, title: "PhD Student 4 Yr. 🧔" },
  { threshold: 8, title: "PhD Candidate 👴" },
  { threshold: 10, title: "Dr. 👨‍🎓" },
  { threshold: 12, title: "Postdoc 1 Yr. 🙂" },
  { threshold: 14, title: "Postdoc 9 Yr. 😭" },
  { threshold: 16, title: "Assistant Prof. 👨‍🏫" },
  { threshold: 18, title: "Associate Prof. 🦹‍♂️" },
  { threshold: 20, title: "Professor 🧙‍♂️" },
  { threshold: 22, title: "Emeritus Prof. 🥂" }
];

const LEVEL_DETAILS = {
  "Research Assistant I 🤦‍♂️": { desc: "Doesn't understand research at all.", emoji: "🤦‍♂️" },
  "Research Assistant II 🤷‍♂️": { desc: "Still confused but trying.", emoji: "🤷‍♂️" },
  "PhD Student 1 Yr. 👦": { desc: "Newbie in grad school.", emoji: "👦" },
  "PhD Student 4 Yr. 🧔": { desc: "Has a beard of experience.", emoji: "🧔" },
  "PhD Candidate 👴": { desc: "Old and wise (but still poor).", emoji: "👴" },
  "Dr. 👨‍🎓": { desc: "Finally got the title, still no job.", emoji: "👨‍🎓" },
  "Postdoc 1 Yr. 🙂": { desc: "Optimistic researcher.", emoji: "🙂" },
  "Postdoc 9 Yr. 😭": { desc: "Send help.", emoji: "😭" },
  "Assistant Prof. 👨‍🏫": { desc: "Grading forever.", emoji: "👨‍🏫" },
  "Associate Prof. 🦹‍♂️": { desc: "Master of committees.", emoji: "🦹‍♂️" },
  "Professor 🧙‍♂️": { desc: "Wizard of academia.", emoji: "🧙‍♂️" },
  "Emeritus Prof. 🥂": { desc: "Retired. Toasting to freedom.", emoji: "🥂" }
};


function toggleSummary() {
  const prog = document.getElementById("lifetimeProgressContainer");
  const show = prog?.style.display === "none";
  if (prog) prog.style.display = show ? "" : "none";
  GM_setValue("showSummary", show);
}


function toggleAISection() {
  const aiWrapper = document.getElementById("aiSectionContainer");
  if (aiWrapper) {
    const show = aiWrapper.style.display === "none";
    aiWrapper.style.display = show ? "" : "none";
    GM_setValue("showAI", show);
  }
}


function toggleBothSections() {
  const summaryList = document.getElementById("summaryList");
  const prog = document.getElementById("lifetimeProgressContainer");
  const summary = document.getElementById("decisionSummaryContainer");
  const ai = document.querySelector("#runAIButton")?.closest("#summaryList > div:last-child");

  const anyHidden = [prog, summary, ai].some(el => el?.style.display === "none");

  if (summaryList) summaryList.style.display = "block";

  if (prog) {
    prog.style.display = anyHidden ? "" : "none";
    GM_setValue("showSummary", anyHidden);
  }
  if (summary) {
    summary.style.display = anyHidden ? "" : "none";
    GM_setValue("showSummary", anyHidden);
  }
     if (summary) {
    GM_setValue("showDecisionCounts", summary.style.display !== "none");
  }
  if (ai) {
    ai.style.display = anyHidden ? "" : "none";
    GM_setValue("showAI", anyHidden);
  }

  // Also update summaryVisible for main summaryList visibility
  GM_setValue("summaryVisible", true);
}



function createFloatingToggleMenu(targetBtn) {
  document.getElementById("floatingToggleMenu")?.remove();

  const menu = document.createElement("div");
  menu.id = "floatingToggleMenu";
  menu.style.cssText = `
    position: absolute;
    background: #f9f9f9;
    border: 1px solid #ccc;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    padding: 6px 0;
    z-index: 9999;
    user-select: none;
    font-family: sans-serif;
  `;

const options = [
  { label: "Toggle Summary", fn: toggleSummary },
  {
    label: "Toggle Decision Counts",
    fn: () => {
      const decisionSummary = document.getElementById("decisionSummaryContainer");
      if (decisionSummary) {
        const visible = decisionSummary.style.display === "none";
        decisionSummary.style.display = visible ? "" : "none";
        GM_setValue("showDecisionCounts", visible);
      }
    }
  },
  { label: "Toggle AI Section", fn: toggleAISection }
];



  options.forEach(({ label, fn }) => {
    const btn = document.createElement("div");
    btn.textContent = label;
    btn.style.cssText = `
      padding: 6px 12px;
      font-size: 13px;
      cursor: pointer;
      white-space: nowrap;
    `;
    btn.onmouseenter = () => btn.style.background = "#eee";
    btn.onmouseleave = () => btn.style.background = "transparent";
    btn.onclick = () => {
      fn();
      menu.remove();
    };
    menu.appendChild(btn);
  });

  const rect = targetBtn.getBoundingClientRect();
  menu.style.left = rect.left + window.scrollX + "px";
  menu.style.top = rect.bottom + window.scrollY + 4 + "px";

  document.body.appendChild(menu);

  const removeMenu = (e) => {
    if (!menu.contains(e.target) && e.target !== targetBtn) {
      menu.remove();
      document.removeEventListener("mousedown", removeMenu);
    }
  };
  document.addEventListener("mousedown", removeMenu);
}



function updateLifetimeProgressUI() {
    const count = parseInt(GM_getValue("totalStudiesScreened", "0"), 10);
    let currentLevel = 0;
    let currentTitle = LEVELS[0].title;
    let nextThreshold = LEVELS[0].threshold;

for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (count >= LEVELS[i].threshold) {
        currentLevel = i + 1;
        currentTitle = LEVELS[i].title;
        nextThreshold = LEVELS[i + 1] ? LEVELS[i + 1].threshold : LEVELS[i].threshold;
        break;
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

    for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (count >= LEVELS[i].threshold) {
        currentLevel = i + 1;
        currentTitle = LEVELS[i].title;
        nextThreshold = LEVELS[i + 1] ? LEVELS[i + 1].threshold : LEVELS[i].threshold;
        break;
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
<div id="lifetimeRankTitleWrapper" style="flex: 1; text-align: center; position: relative;">
  <span id="lifetimeRankTitle" style="cursor: help;">${currentTitle}</span>
  <div id="rankTooltip" style="display:none; position:absolute; top:120%; left:50%; transform:translateX(-50%); background:#fff; border:1px solid #ccc; border-radius:6px; padding:6px 10px; box-shadow:0 4px 8px rgba(0,0,0,0.1); white-space:nowrap; z-index:9999; font-size:13px; text-align:center;"></div>
</div>


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
const titleEl = container.querySelector("#lifetimeRankTitle");
const tooltipEl = container.querySelector("#rankTooltip");

if (titleEl && tooltipEl) {
    const detail = LEVEL_DETAILS[currentTitle];
    if (detail) {
        tooltipEl.innerHTML = `<div style="font-size: 24px;">${detail.emoji}</div><div style="margin-top: 4px;">${detail.desc}</div>`;

        titleEl.addEventListener("mouseenter", () => {
            tooltipEl.style.display = "block";
        });
        titleEl.addEventListener("mouseleave", () => {
            tooltipEl.style.display = "none";
        });
    }
}



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


function showSkinOptionsMenu(anchorBtn) {
  document.getElementById("skinOptionsMenu")?.remove();

  const menu = document.createElement("div");
  menu.id = "skinOptionsMenu";
  menu.style.cssText = `
    position: absolute;
    background: white;
    border: 1px solid #ccc;
    border-radius: 6px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    font-family: sans-serif;
    font-size: 13px;
    z-index: 99999;
    padding: 6px 0;
  `;

const options = [
  {
    label: "🔁 Reset to default",
    fn: () => {
GM_setValue("panelButtonImage", "");
panelButtonImage = "";
applyButtonBackgrounds();
    }
  },
  {
    label: "🖼️ Upload Image...",
    fn: () => {
      setTimeout(() => skinImageInput.click(), 100);
    }
  }
];



  options.forEach(({ label, fn }) => {
    const item = document.createElement("div");
    item.textContent = label;
    item.style.cssText = "padding: 6px 12px; cursor: pointer;";
    item.onmouseenter = () => item.style.background = "#eee";
    item.onmouseleave = () => item.style.background = "white";
    item.onclick = () => {
      fn();
      menu.remove();
    };
    menu.appendChild(item);
  });

  const rect = anchorBtn.getBoundingClientRect();
  menu.style.left = `${rect.left + window.scrollX}px`;
  menu.style.top = `${rect.bottom + window.scrollY + 4}px`;
  document.body.appendChild(menu);

  document.addEventListener("mousedown", function dismiss(e) {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener("mousedown", dismiss);
    }
  });
}


    function createPanel() {
        if (document.getElementById("covidence-panel")) return;
if (GM_getValue("showSummary") === undefined) GM_setValue("showSummary", true);
  if (GM_getValue("showAI") === undefined) GM_setValue("showAI", true);
        if (GM_getValue("showDecisionCounts") === undefined) GM_setValue("showDecisionCounts", true);
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


        panel.innerHTML = `
<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
  <div id="covidence-header" style="font-size: 15px; font-weight: bold; cursor: move;">CoviPanel 1.0</div>
  <div id="topRightIcons" style="display: none; gap: 7px; flex-direction: row; align-items: center;">
    <button id="returnBtn" title="Return to current study" style="background:none; border:none; cursor:pointer; font-size:22px;" aria-label="Return to current study">◉</button>
    <button id="uploadSkinBtn" title="Panel appearance options" style="background:none; border:none; cursor:pointer; font-size:17px;" aria-label="Panel skin options">📷</button>
<input type="file" id="skinImageInput" accept=".jpg,.jpeg,.png,.gif" style="display:none;">
    <button id="exportBtn" title="Export decisions to .csv" style="background:none; border:none; cursor:pointer; font-size:21px;" aria-label="Export decisions to .csv">🖫</button>
       <button id="resetBtn" style="display: none;"></button>
  </div>
</div>
            <textarea id='studyListInput' rows='6' style='width:100%; margin-top:10px; font-size: 13px;' placeholder='Enter study IDs to start screening. \nYou may enter study IDs in three ways: \n1) Pasting them directly from Excel \n2) Using "-" and "," (e.g., 3-6 or 3,4,5,6) \n3) Clicking the "Detect" button below \n'></textarea>

            <button id='startBtn' style='margin-top:10px; width: 100%;'>▶ Begin Screening</button>
            <div id='studyControls' style='display:none; margin-top:15px;'>
              <div style="margin-bottom: 5px;">Current study: <span id='currentStudy'>?</span><span id='progressInline' style='margin-left: 8px; font-size: 14px; color: #555;'></span>

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
<div style='margin-top: -15px; margin-bottom: 0px;'>
  <div style='display: flex; gap: 6px; align-items: center;'>
    <div style='position: relative; flex: 1; max-width: 220px;'>
      <input id='keywordInput' placeholder='Enter keywords' style='width: 100%; padding: 4px; font-size: 13px;'>
      <div id='keywordHistoryDropdown' style='position:absolute; top:100%; left:0; right:0; background:white; border:1px solid #ccc; max-height:100px; overflow-y:auto; font-size:13px; z-index:9999; display:none;'></div>
    </div>
    <button id='addKeywordsBtn' title='Search keyword' style='background: none; border: none; cursor: pointer; font-size: 18px;'>🔍︎</button>
    <span id='summaryToggleIcon' title='Toggle decision summary'>⋯</span>
  </div>
  <div id='keywordTags' style='margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px;'></div>
</div>



<div id='summaryList' style='display:none; font-size: 12px; line-height: 1.4;'>
  <div id="lifetimeProgressContainer" style="height: 48px;"></div>
  <div id="decisionSummaryContainer" style="min-height: 36px; margin-top: 20px;"></div>
<div id="summarySpacer" style="height: 1px;"></div>
</div>`;

        document.body.appendChild(panel);
        const toggleDotsStyle = document.createElement("style");
toggleDotsStyle.textContent = `
#summaryToggleIcon {
  display: inline-block;
  cursor: pointer;
  font-size: 18px;
  padding: 0px 4px;
  border-radius: 4px;
  line-height: 1;
}
#summaryToggleIcon:hover {
  background-color: #ccc;
}
`;

document.head.appendChild(toggleDotsStyle);




const styleFixCursor = document.createElement('style');
styleFixCursor.textContent = `
#covidence-panel *:not(input):not(textarea):not(button) {
  cursor: default !important;
}
`;
document.head.appendChild(styleFixCursor);
      let isDragging = false, offsetX, offsetY;
panel.addEventListener("mousedown", function(e) {
    // Prevent drag when clicking inside input, textarea, or button
  if (
  ["textarea", "input", "button"].includes(e.target.tagName.toLowerCase()) ||
  e.target.id === "summaryToggleIcon" ||
  e.target.closest("#floatingToggleMenu")
) return;

    isDragging = true;
    offsetX = e.clientX - panel.offsetLeft;
    offsetY = e.clientY - panel.offsetTop;
});


document.addEventListener("mousemove", function(e) {
    if (isDragging) {
        panel.style.left = (e.clientX - offsetX) + "px";
        panel.style.top = (e.clientY - offsetY) + "px";
        GM_setValue("panelLeft", panel.style.left);
        GM_setValue("panelTop", panel.style.top);
    }
});

document.addEventListener("mouseup", function() {
    isDragging = false;
});


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
        applyButtonBackgrounds();
        const summaryList = panel.querySelector('#summaryList');
        const toggleSummaryBtn = panel.querySelector('#toggleSummaryBtn');

const returnBtn = panel.querySelector('#returnBtn');
        const uploadSkinBtn = panel.querySelector('#uploadSkinBtn');
const skinImageInput = panel.querySelector('#skinImageInput');
let skinHoldTimer;

uploadSkinBtn.addEventListener("mousedown", () => {
  skinHoldTimer = setTimeout(() => {
    showSkinOptionsMenu(uploadSkinBtn);
  }, 10);
});

uploadSkinBtn.addEventListener("mouseup", () => {
  clearTimeout(skinHoldTimer);
});

uploadSkinBtn.addEventListener("mouseleave", () => {
  clearTimeout(skinHoldTimer);
});



skinImageInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
const dataUrl = event.target.result;
GM_setValue("panelButtonImage", dataUrl);
panelButtonImage = dataUrl;
applyButtonBackgrounds();
  };
  reader.readAsDataURL(file);
});

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


        }



const tripleDotBtn = document.getElementById("summaryToggleIcon");
if (tripleDotBtn) {
  tripleDotBtn.style.userSelect = "none";
  tripleDotBtn.style.cursor = "pointer";

  let holdTimer;
  let held = false;

  tripleDotBtn.addEventListener("mousedown", () => {
    held = false;
    holdTimer = setTimeout(() => {
      held = true;
      createFloatingToggleMenu(tripleDotBtn);
    }, 200);
  });

  tripleDotBtn.addEventListener("mouseup", () => {
    clearTimeout(holdTimer);
    if (!held) toggleBothSections();
  });

  tripleDotBtn.addEventListener("mouseleave", () => {
    clearTimeout(holdTimer);
  });
}



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

            updateStudy();
        }

        startBtn.onclick = function() {
            GM_setValue("sessionStartTime", Date.now());




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
// 🛠 Force visibility ONCE when session starts
GM_setValue("showSummary", true);
GM_setValue("showAI", true);
GM_setValue("showDecisionCounts", true);
GM_setValue("summaryVisible", true);

lastDecisionTime = Date.now();
updateStudy();
const panelEl = document.getElementById("covidence-panel");
if (panelEl) panelEl.style.display = "none";
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
                lastDecisionTime = Date.now();
                attachDecisionListeners();
                updateSummary();
            createLevelProgressUI(summaryList);
            summaryList.insertAdjacentHTML('beforeend', `

`);
                updatePanelDecisionButtonsState();
                setTimeout(updatePanelDecisionButtonsState, 300);
                const counted = studies.filter(id => ["Yes", "No", "Maybe"].includes(decisions[id])).length;
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
        GM_setValue("totalTimeMs", "0");
        updateLifetimeProgressUI();

        // 🔄 Refresh tooltip contents
        const levelTitle = document.getElementById("lifetimeRankTitle");
        const tooltip = document.getElementById("rankTooltip");
        if (levelTitle && tooltip) {
            const newTitle = LEVELS[0].title;
            const detail = LEVEL_DETAILS[newTitle];
            levelTitle.textContent = newTitle;
            if (detail) {
                tooltip.innerHTML = `<div style="font-size: 24px;">${detail.emoji}</div><div style="margin-top: 4px;">${detail.desc}</div>`;
            }
        }
    }
}


        });


function updateSummary() {
    document.getElementById("floatingToggleMenu")?.remove();
    const summaryList = document.getElementById("summaryList");

const decisionSummaryContainer = document.getElementById("decisionSummaryContainer");
if (decisionSummaryContainer) decisionSummaryContainer.innerHTML = "";
    const decisionsMap = {
        Maybe: { color: "orange", list: [] },
        Yes: { color: "green", list: [] },
        No: { color: "red", list: [] },
    };

    for (const id of studies) {
        const vote = decisions[id];
        if (decisionsMap[vote]) {
            decisionsMap[vote].list.push(id);
        }
    }

    Object.entries(decisionsMap).forEach(([label, { color, list }]) => {
        const wrapper = document.createElement("div");
        wrapper.style.marginBottom = "2px";
        wrapper.style.fontSize = "12px";
        wrapper.style.lineHeight = "1.4";

        const container = document.createElement("div");
        container.style.display = "flex";
        container.style.alignItems = "flex-start";
        container.style.flexWrap = "nowrap";
        container.style.overflow = "hidden";

        const textSpan = document.createElement("div");
        textSpan.style.flex = "1 1 auto";
        textSpan.style.overflow = "hidden";
        textSpan.style.whiteSpace = "nowrap";
        textSpan.style.textOverflow = "ellipsis";
        textSpan.innerHTML = `<strong style="color:${color}">${label}:</strong> ` +
            `<span style="color:${color}">${list.join(", ")}</span>`;

        const toggleBtn = document.createElement("div");
        toggleBtn.textContent = "[+]";
        toggleBtn.style.flex = "0 0 auto";
        toggleBtn.style.color = "#007BFF";
        toggleBtn.style.cursor = "pointer";
        toggleBtn.style.fontSize = "11px";
        toggleBtn.style.marginLeft = "6px";
        toggleBtn.style.userSelect = "none";

        let expanded = false;
        toggleBtn.onclick = () => {
            expanded = !expanded;
            textSpan.style.whiteSpace = expanded ? "normal" : "nowrap";
            textSpan.style.overflow = expanded ? "visible" : "hidden";
            textSpan.style.textOverflow = expanded ? "unset" : "ellipsis";
            toggleBtn.textContent = expanded ? "[–]" : "[+]";
        };

        container.appendChild(textSpan);
        container.appendChild(toggleBtn);
        wrapper.appendChild(container);
if (decisionSummaryContainer) {
  decisionSummaryContainer.appendChild(wrapper);
}
    })
// === AI Assistant Section inside #summaryList ===
const aiWrapper = document.createElement("div");
aiWrapper.id = "aiSectionContainer";
aiWrapper.style.marginTop = "15px";



const content = document.createElement("div");
content.style.display = "block";
content.innerHTML = `
  <div style="padding-top: 0; position: relative;">

    <!-- Fixed top bar -->
<div id="aiHeaderBar" style="
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
">
<button id="runAIButton" style="
  font-size: 13px;
  font-family: inherit;
  color: #2c3e50;
  background-color: #f5f5f5;
  border: 1px solid #ccc;
  padding: 2px 8px;
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
  text-align: center;
  flex-grow: 1;
">🤖 Ask AI for This Study</button>

<div id="togglePromptInputs" title="Toggle prompt settings" style="
  font-size: 16px;
  color: #007BFF;
  cursor: pointer !important;     /* ← Force hand cursor */
  margin-left: 8px;
  user-select: none;
  display: flex;
  align-items: center;
  padding: 2px;
">⚙️</div>

</div>

    <div id="aiDecisionOutput" style="margin-top:6px; font-size:13px;"></div>



    <!-- Scrollable content -->
    <div id="aiInputsWrapper" style="display: none;">

     <label style="display:block; margin-top:6px;">Study Inclusion Criteria (required):</label>
      <textarea id="inclusionCriteriaInput" rows="3" style="width:100%; font-size:13px; margin-bottom:6px;" placeholder="Define your inclusion criteria. AI will make a decision based on them."></textarea>

     <label style="display:block; margin-top:6px;">General Prompt for AI (optional):</label>
      <textarea id="systemPromptInput" rows="3" style="width:100%; font-size:13px; margin-bottom:6px;" placeholder="e.g., You are a senior researcher. Keep answers short."></textarea>



<div style="display: flex; gap: 6px; align-items: center;">
  <button id="loadAPIKeyBtn" style="
    flex: 1;
    font-size: 13px;
    padding: 4px 10px;
    border: 1px solid #ccc;
    border-radius: 6px;
    background: #f5f5f5;
    cursor: pointer;
    line-height: 1;
  ">📂 Load API Key from File</button>
  <button id="clearAPIKeyBtn" title="Clear stored key" style="
    font-size: 15px;
    padding: 4px;
    background: none;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    line-height: 1;
  ">🗑️</button>
</div>




      <input id="apiKeyFileInput" type="file" accept=".txt" style="display:none;" />
      <div id="apiKeyStatus" style="margin: 6px 0; font-size: 13px; color: green;"></div>
    </div>


  </div>
`;

// Toggle the AI Prompt inputs visibility
const togglePromptBtn = content.querySelector("#togglePromptInputs");
const promptInputs = content.querySelector("#aiInputsWrapper");
    let ledEffectTriggered = GM_getValue("ledEffectTriggered", false);
function checkAndToggleLEDEffect() {
  const runBtn = content.querySelector("#runAIButton");
  const inclusionInput = content.querySelector("#inclusionCriteriaInput");
  const inclusionText = inclusionInput ? inclusionInput.value.trim() : "";
  const hasAPIKey = !!GM_getValue("openaiKeyFromFile", "").trim();
  const wasTriggered = GM_getValue("ledEffectTriggered", false);

  if (runBtn) {
    if (inclusionText && hasAPIKey) {
      runBtn.classList.add("led-border");

      if (!wasTriggered) {
        runBtn.classList.add("led-flash");
        GM_setValue("ledEffectTriggered", true);

        setTimeout(() => runBtn.classList.remove("led-flash"), 1000);
      }
    } else {
      runBtn.classList.remove("led-border");
      runBtn.classList.remove("led-flash");
      GM_setValue("ledEffectTriggered", false);
    }
  }
}



togglePromptBtn.onclick = () => {
  const isHidden = promptInputs.style.display === "none";
  promptInputs.style.display = isHidden ? "block" : "none";
  togglePromptBtn.textContent = isHidden ? "⚙️" : "⚙️";
};



aiWrapper.appendChild(content);
const existingAI = [...summaryList.querySelectorAll("div")].find(div =>
  div.querySelector("#runAIButton")
);
if (existingAI) existingAI.remove();
summaryList.appendChild(aiWrapper);
// Restore visibility state
const summaryVisible = GM_getValue("showSummary", true);
const aiVisible = GM_getValue("showAI", true);
const decisionCountsVisible = GM_getValue("showDecisionCounts", true);

document.getElementById("lifetimeProgressContainer").style.display = summaryVisible ? "" : "none";
document.getElementById("decisionSummaryContainer").style.display = decisionCountsVisible ? "" : "none";
document.getElementById("aiSectionContainer").style.display = aiVisible ? "" : "none";


// Restore previous inputs
const savedCriteria = GM_getValue("inclusionCriteriaText", "");
    const savedPrompt = GM_getValue("customSystemPrompt", "");
if (savedPrompt) {
  content.querySelector("#systemPromptInput").value = savedPrompt;
}
if (savedCriteria) {
  content.querySelector("#inclusionCriteriaInput").value = savedCriteria;
}
    checkAndToggleLEDEffect();
if (openaiKeyFromFile) {
  content.querySelector("#apiKeyStatus").textContent = "✅ API key loaded from file (saved)";
}

// Save new API key
content.querySelector("#loadAPIKeyBtn").onclick = () => content.querySelector("#apiKeyFileInput").click();
content.querySelector("#apiKeyFileInput").addEventListener("change", (event) => {
  const file = event.target.files[0];
  const statusEl = content.querySelector("#apiKeyStatus");
  if (!file) return;

  const reader = new FileReader();
reader.onload = (e) => {
  const statusEl = content.querySelector("#apiKeyStatus");
  const raw = e.target.result || "";
  const trimmed = raw.trim().split(/\r?\n/)[0].trim(); // Take only the first line

  // Store the trimmed key
  openaiKeyFromFile = trimmed;

  // Validation: starts with sk- and at least 20 characters after sk-
  const isValid = /^sk-[A-Za-z0-9-_]{20,}/.test(trimmed);

  if (isValid) {
    GM_setValue("openaiKeyFromFile", openaiKeyFromFile);
    statusEl.style.color = "green";
    statusEl.textContent = "✅ API key loaded from file.";
  } else {
    openaiKeyFromFile = "";
    GM_setValue("openaiKeyFromFile", "");
    statusEl.style.color = "red";
    statusEl.textContent = "❌ Invalid API key format. Please upload a valid key.";
  }

  checkAndToggleLEDEffect();
};


  reader.onerror = () => {
    statusEl.style.color = "red";
    statusEl.textContent = "❌ Failed to read API key file.";
  };

  reader.readAsText(file);
});
// ✅ Clear API Key logic
content.querySelector("#clearAPIKeyBtn").addEventListener("click", () => {
  GM_setValue("openaiKeyFromFile", "");
  openaiKeyFromFile = "";
  content.querySelector("#apiKeyStatus").textContent = "❌ API key cleared.";
  content.querySelector("#apiKeyStatus").style.color = "red";
  checkAndToggleLEDEffect();
});


// Save inclusion criteria
content.querySelector("#inclusionCriteriaInput").addEventListener("input", (e) => {
  GM_setValue("inclusionCriteriaText", e.target.value);
  checkAndToggleLEDEffect();
});

// Save system prompt
content.querySelector("#systemPromptInput").addEventListener("input", (e) => {
  GM_setValue("customSystemPrompt", e.target.value);
});
// Ask AI button
content.querySelector("#runAIButton").onclick = async () => {
    const { author, year } = extractAuthorAndYear();
const output = content.querySelector("#aiDecisionOutput");


  const criteria = content.querySelector("#inclusionCriteriaInput").value.trim();

  const currentID = document.querySelector("#currentStudy")?.textContent?.replace("#", "");

  if (!openaiKeyFromFile || !criteria) return alert("Please load your API key and enter inclusion criteria.");
  const abstract = extractAbstractText();
  if (!abstract) return output.textContent = "❌ Could not extract abstract.";

  output.textContent = "⏳ Asking ChatGPT...";
const systemPrompt = GM_getValue("customSystemPrompt", "You are an assistant screening research abstracts for inclusion based on user-defined criteria. Keep explanations short and simple.");
const customInstruction = systemPrompt.trim(); // reuse same input
const hasCustomInstruction = !!customInstruction;
  try {
      const { author, year } = extractAuthorAndYear();
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKeyFromFile}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-nano",
messages: [
  { role: "system", content: systemPrompt },
  {
    role: "user",
content:
  `First Author: ${author}\n` +
  `Publication Year: ${year}\n` +
  `Abstract Text: ${abstract}\n\n` +
  `Inclusion Criteria: ${criteria}\n\n` +
  (hasCustomInstruction
    ? customInstruction
    : `Should this study be included in the review? Reply in this format: ${author} (${year}): your decision (Yes, No, or Maybe), followed by a short explanation under 3 sentences.`)


  }
],
        temperature: 0.2,
      }),
    });

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || "No response.";
      // ✅ Extract just "Yes", "No", or "Maybe" for IRR
const decisionOnly = (reply.match(/\b(Yes|No|Maybe)\b/i) || [])[1] || "Maybe";

output.innerHTML = `
  💬 AI:
  <span style="
    display: inline-block;
    filter: blur(5px);
    user-select: none;
    cursor: pointer;
    transition: filter 0.3s ease;
  " title="Click to reveal" onclick="this.style.filter='none'; this.style.cursor='default'; this.title='';">
    <strong>${reply}</strong>
  </span>
  <div id="aiHintText" style="
    font-size: 11px;
    color: #777;
    margin-top: 4px;
    text-align: right;
    padding-right: 10px;
    width: 100%;
  ">(Click to reveal AI response)</div>
`;


    if (currentID) {
      const aiDecisions = JSON.parse(GM_getValue("chatgpt_decisions", "{}"));
      aiDecisions[currentID] = decisionOnly;
// 📝 Save the full explanation separately (optional but useful)
const aiExplanations = JSON.parse(GM_getValue("chatgpt_explanations", "{}"));
aiExplanations[currentID] = reply;
GM_setValue("chatgpt_explanations", JSON.stringify(aiExplanations));
      GM_setValue("chatgpt_decisions", JSON.stringify(aiDecisions));
    }
  } catch (err) {
    console.error(err);
    output.textContent = "❌ Error calling ChatGPT.";
  }
};
checkAndToggleLEDEffect();
    ;
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

            if (lastDecisionTime) {
                const elapsed = Date.now() - lastDecisionTime;
                totalDecisionTimeMs += elapsed;
                totalDecisionsMade += 1;
            }

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
    ["Yes", "No", "Maybe"].includes(decisions[id])
);

// ✅ Ensure progress bar updates to 100% before alert
const counted = studies.filter(id => ["Yes", "No", "Maybe"].includes(decisions[id])).length;

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
                       const startTime = GM_getValue("sessionStartTime", null);
let sessionMsg = "";
if (startTime) {
    const elapsedMs = Date.now() - startTime;

    // ✅ Update total time
    const previousTotal = parseInt(GM_getValue("totalTimeMs", "0"), 10);
    const newTotal = previousTotal + elapsedMs;
    GM_setValue("totalTimeMs", newTotal);

    // ⏱ Format session
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const sessionTimeStr = `${hours}h ${mins}m ${secs}s`;

    // ⏱ Format total
    const totalSec = Math.floor(newTotal / 1000);
    const totalH = Math.floor(totalSec / 3600);
    const totalM = Math.floor((totalSec % 3600) / 60);
    const totalS = totalSec % 60;
    const totalTimeStr = `${totalH}h ${totalM}m ${totalS}s`;
sessionMsg = `\n⏱ Session time: ${sessionTimeStr}\n🕒 Total time: ${totalTimeStr}`;



    GM_setValue("sessionStartTime", null);
}

                        const avgDecisionTimeSec = totalDecisionsMade > 0
    ? (totalDecisionTimeMs / totalDecisionsMade / 1000).toFixed(1)
    : "0.0";

const maybeCount = Object.values(decisions).filter(v => v === "Maybe").length;
const yesCount = Object.values(decisions).filter(v => v === "Yes").length;
const noCount = Object.values(decisions).filter(v => v === "No").length;
const totalCount = maybeCount + yesCount + noCount;

const maybePct = totalCount ? ((maybeCount / totalCount) * 100).toFixed(1) : "0.0";
const yesPct = totalCount ? ((yesCount / totalCount) * 100).toFixed(1) : "0.0";
const noPct = totalCount ? ((noCount / totalCount) * 100).toFixed(1) : "0.0";

const aiDecisions = JSON.parse(GM_getValue("chatgpt_decisions", "{}"));
const irr = computeIRR(decisions, aiDecisions, studies);

alert(
  "You've reached the end of your study list!" + sessionMsg +
    `\n⏳ Avg decision time: ${avgDecisionTimeSec}s` +
    `\n🤖 Interrater Reliability with ChatGPT: ${irr}` +
  "\n\n📊 Decision breakdown:\n" +
  `• Maybe: ${maybeCount} (${maybePct}%)\n` +
  `• Yes: ${yesCount} (${yesPct}%)\n` +
  `• No: ${noCount} (${noPct}%)`
);


const aiExplanations = JSON.parse(GM_getValue("chatgpt_explanations", "{}"));
const csvHeader = "Study ID,User Decision,ChatGPT Decision,ChatGPT Reason";
const csvRows = studies.map(id => {
    const userVote = decisions[id] || "";
    const aiVote = aiDecisions[id] || "";
    const reason = aiExplanations[id] ? `"${aiExplanations[id].replace(/"/g, '""')}"` : "";
    return `${id},${userVote},${aiVote},${reason}`;
});
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
                        const existingAI = document.querySelector("#covidence-panel div:has(#runAIButton)");
if (existingAI) existingAI.remove();

                        listInput.value = '';
                        document.getElementById("topRightIcons").style.display = "none";

                        const match = window.location.href.match(/\/reviews\/(\d+)\//);
                        if (match) {
                            const reviewID = match[1];
                            const targetURL = `https://${location.hostname}/reviews/${reviewID}/review_studies/screen?filter=vote_required_from`;
                             // 👇 ADD THIS LINE to hide the panel
  document.getElementById("covidence-panel")?.remove();
                            window.location.href = targetURL;
                        }
                    }, 100);
                }
            }
        }
resetBtn.onclick = function() {
    // First export the decisions to CSV
let csv = "Study ID,Decision\n";
for (const [id, vote] of Object.entries(decisions)) {
  csv += `${id},${vote}\n`;
}
const blob = new Blob([csv], { type: "text/csv" });
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = `covidence_decisions_${new Date().toISOString().split("T")[0]}.csv`;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);

            GM_setValue('studyList', '');
            GM_setValue('studyIndex', 0);
            GM_setValue('decisions', '{}');
    GM_setValue("chatgpt_decisions", '{}');
    GM_setValue("sessionStartTime", null);
// Redirect to screening page instead of reload
const match = window.location.href.match(/reviews\/(\d+)\//);
if (match && match[1]) {
  const reviewID = match[1];
  const targetURL = `https://${location.hostname}/reviews/${reviewID}/review_studies/screen?filter=vote_required_from`;
  window.location.href = targetURL;
}
        };

let exportHoldTimer, exportHeld = false;

exportBtn.addEventListener("mousedown", () => {
  exportHeld = false;
  exportHoldTimer = setTimeout(() => {
    exportHeld = true;
    showExportFloatingMenu(exportBtn);
  }, 200);
});

exportBtn.addEventListener("mouseup", () => {
  clearTimeout(exportHoldTimer);
  if (!exportHeld) exportCSV();
});

exportBtn.addEventListener("mouseleave", () => {
  clearTimeout(exportHoldTimer);
});

function exportCSV() {
  const aiDecisions = JSON.parse(GM_getValue("chatgpt_decisions", "{}"));
  const aiExplanations = JSON.parse(GM_getValue("chatgpt_explanations", "{}"));
  const csvHeader = "Study ID,User Decision,ChatGPT Decision,ChatGPT Reason";
  const csvRows = studies.map(id => {
    const userVote = decisions[id] || "";
    const aiVote = aiDecisions[id] || "";
    const reason = aiExplanations[id] ? `"${aiExplanations[id].replace(/"/g, '""')}"` : "";
    return `${id},${userVote},${aiVote},${reason}`;
  });
  const csvContent = "data:text/csv;charset=utf-8," + [csvHeader, ...csvRows].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "covidence_decisions.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function showExportFloatingMenu(anchor) {
  document.getElementById("floatingExportMenu")?.remove();
  const menu = document.createElement("div");
  menu.id = "floatingExportMenu";
  menu.style.cssText = `
    position: absolute;
    top: ${anchor.getBoundingClientRect().bottom + window.scrollY + 4}px;
    left: ${anchor.getBoundingClientRect().left + window.scrollX}px;
    background: white;
    border: 1px solid #ccc;
    border-radius: 6px;
    padding: 6px 12px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    font-family: sans-serif;
    font-size: 13px;
    z-index: 9999;
    cursor: pointer;
  `;
  menu.textContent = "⟳ Restart a new session";
  menu.onmouseenter = () => menu.style.background = "#eee";
  menu.onmouseleave = () => menu.style.background = "white";
  menu.onclick = () => {
    document.getElementById("floatingExportMenu")?.remove();
    resetBtn.click();
  };
  document.body.appendChild(menu);
  document.addEventListener("mousedown", function dismiss(e) {
    if (!menu.contains(e.target) && e.target !== anchor) {
      menu.remove();
      document.removeEventListener("mousedown", dismiss);
    }
  });
}



        panelYesBtn.onclick = () => simulateDecision("Yes");
        panelNoBtn.onclick = () => simulateDecision("No");
        panelMaybeBtn.onclick = () => simulateDecision("Maybe");

returnBtn.onclick = () => {
    const savedList = GM_getValue('studyList', '');
    const savedIndex = GM_getValue('studyIndex', 0);
    const studies = savedList.split(',').map(s => s.trim()).filter(Boolean);
    const currentStudy = studies[savedIndex];
    if (currentStudy) {
        const panel = document.getElementById("covidence-panel");
        if (panel) panel.dataset.jumpTo = currentStudy;
    }
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
const ledStyle = document.createElement("style");
ledStyle.textContent = `
@keyframes ledFlashLimited {
  0%, 100% { box-shadow: 0 0 0px 0px rgba(33, 150, 243, 0.8); }
  50% { box-shadow: 0 0 12px 6px rgba(33, 150, 243, 0.5); }
}

#runAIButton.led-flash {
  animation: ledFlashLimited 1s ease-in-out 1;
}

#runAIButton.led-border {
  border: 1px solid rgba(33, 150, 243, 0.9) !important;
}
`;

document.head.appendChild(ledStyle);



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
            if (lastDecisionTime) {
                const elapsed = Date.now() - lastDecisionTime;
                totalDecisionTimeMs += elapsed;
                totalDecisionsMade += 1;
            }

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
            const panel = document.getElementById("covidence-panel");
            if (panel) {
                const currentDisplay = panel.querySelector('#currentStudy');
                if (currentDisplay) currentDisplay.textContent = `#${currentID}`;
                const summaryList = panel.querySelector('#summaryList');
                const toggleSummaryBtn = panel.querySelector('#toggleSummaryBtn');

                const maybeList = studies.filter(id => decisions[id] === "Maybe");
                const yesList = studies.filter(id => decisions[id] === "Yes");
                const noList = studies.filter(id => decisions[id] === "No");

                function makeToggleBlock(label, ids, color) {
                    const container = document.createElement("div");
                    container.style.marginBottom = "2px";
                    container.style.fontSize = "12px";
                    container.style.lineHeight = "1.4";
                    container.style.display = "flex";
                    container.style.alignItems = "flex-start";
                    container.style.flexWrap = "nowrap";
                    container.style.overflow = "hidden";

                    const textSpan = document.createElement("div");
                    textSpan.style.flex = "1 1 auto";
                    textSpan.style.overflow = "hidden";
                    textSpan.style.whiteSpace = "nowrap";
                    textSpan.style.textOverflow = "ellipsis";
                    textSpan.innerHTML = `<strong style="color:${color}">${label}:</strong> ` +
                                         `<span style="color:${color}">${ids.join(", ")}</span>`;

                    const toggleBtn = document.createElement("div");
                    toggleBtn.textContent = "[+]";
                    toggleBtn.style.flex = "0 0 auto";
                    toggleBtn.style.color = "#007BFF";
                    toggleBtn.style.cursor = "pointer";
                    toggleBtn.style.fontSize = "11px";
                    toggleBtn.style.marginLeft = "6px";
                    toggleBtn.style.userSelect = "none";

                    let expanded = false;
                    toggleBtn.onclick = () => {
                        expanded = !expanded;
                        textSpan.style.whiteSpace = expanded ? "normal" : "nowrap";
                        textSpan.style.overflow = expanded ? "visible" : "hidden";
                        textSpan.style.textOverflow = expanded ? "unset" : "ellipsis";
                        toggleBtn.textContent = expanded ? "[–]" : "[+]";
                    };

                    container.appendChild(textSpan);
                    container.appendChild(toggleBtn);
                    return container;
                }

                const decisionSummaryContainer = document.getElementById("decisionSummaryContainer");
                if (decisionSummaryContainer) {
                    decisionSummaryContainer.innerHTML = "";
                    decisionSummaryContainer.appendChild(makeToggleBlock("Maybe", maybeList, "orange"));
                    decisionSummaryContainer.appendChild(makeToggleBlock("Yes", yesList, "green"));
                    decisionSummaryContainer.appendChild(makeToggleBlock("No", noList, "red"));
                }

                summaryList.style.display = 'block';
                if (toggleSummaryBtn) toggleSummaryBtn.textContent = 'Hide decisions ▲';
                GM_setValue('summaryVisible', true);
            }

            const counted = studies.filter(id => ["Yes", "No", "Maybe", "Skipped"].includes(decisions[id])).length;
            const progress = Math.round((counted / studies.length) * 100);
            if (progressBar && studies.length > 0) {
                progressBar.style.width = progress + '%';
            }
            if (progressInline) {
                progressInline.textContent = `(${counted} of ${studies.length} done)`;
            }

            if (document.getElementById("summaryList") && !document.getElementById("lifetimeProgressContainer")) {
                createLevelProgressUI(document.getElementById("summaryList"));
            }

            setTimeout(() => {
                const startTime = GM_getValue("sessionStartTime", null);
                let sessionMsg = "";
                if (startTime) {
                    const elapsedMs = Date.now() - startTime;
                    const previousTotal = parseInt(GM_getValue("totalTimeMs", "0"), 10);
                    const newTotal = previousTotal + elapsedMs;
                    GM_setValue("totalTimeMs", newTotal);

                    const totalSeconds = Math.floor(elapsedMs / 1000);
                    const hours = Math.floor(totalSeconds / 3600);
                    const mins = Math.floor((totalSeconds % 3600) / 60);
                    const secs = totalSeconds % 60;
                    const sessionTimeStr = `${hours}h ${mins}m ${secs}s`;

                    const totalSec = Math.floor(newTotal / 1000);
                    const totalH = Math.floor(totalSec / 3600);
                    const totalM = Math.floor((totalSec % 3600) / 60);
                    const totalS = totalSec % 60;
                    const totalTimeStr = `${totalH}h ${totalM}m ${totalS}s`;
                    sessionMsg = `\n⏱ Session time: ${sessionTimeStr}\n🕒 Total time: ${totalTimeStr}`;
                    GM_setValue("sessionStartTime", null);
                }

                const avgDecisionTimeSec = totalDecisionsMade > 0
                    ? (totalDecisionTimeMs / totalDecisionsMade / 1000).toFixed(1)
                    : "0.0";

                const maybeCount = Object.values(decisions).filter(v => v === "Maybe").length;
                const yesCount = Object.values(decisions).filter(v => v === "Yes").length;
                const noCount = Object.values(decisions).filter(v => v === "No").length;
                const totalCount = maybeCount + yesCount + noCount;

                const maybePct = totalCount ? ((maybeCount / totalCount) * 100).toFixed(1) : "0.0";
                const yesPct = totalCount ? ((yesCount / totalCount) * 100).toFixed(1) : "0.0";
                const noPct = totalCount ? ((noCount / totalCount) * 100).toFixed(1) : "0.0";

                const aiDecisions = JSON.parse(GM_getValue("chatgpt_decisions", "{}"));
                const irr = computeIRR(decisions, aiDecisions, studies);

                alert(
                    "You've reached the end of your study list!" + sessionMsg +
                    `\n⏳ Avg decision time: ${avgDecisionTimeSec}s` +
                    `\n🤖 Interrater Reliability with ChatGPT: ${irr}` +
                    "\n\n📊 Decision breakdown:\n" +
                    `• Maybe: ${maybeCount} (${maybePct}%)\n` +
                    `• Yes: ${yesCount} (${yesPct}%)\n` +
                    `• No: ${noCount} (${noPct}%)`
                );

                const aiExplanations = JSON.parse(GM_getValue("chatgpt_explanations", "{}"));
                const csvHeader = "Study ID,User Decision,ChatGPT Decision,ChatGPT Reason";
                const csvRows = studies.map(id => {
                    const userVote = decisions[id] || "";
                    const aiVote = aiDecisions[id] || "";
                    const reason = aiExplanations[id] ? `"${aiExplanations[id].replace(/"/g, '""')}"` : "";
                    return `${id},${userVote},${aiVote},${reason}`;
                });

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

                const match = window.location.href.match(/\/reviews\/(\d+)\//);
                if (match) {
                    const reviewID = match[1];
                    const targetURL = `https://${location.hostname}/reviews/${reviewID}/review_studies/screen?filter=vote_required_from`;
                    document.getElementById("covidence-panel")?.remove();
                    window.location.href = targetURL;
                }
            }, 100);
        } else {
            const newIndex = savedIndex + 1;
            if (newIndex < studies.length) {
                GM_setValue('studyIndex', newIndex);
                setTimeout(() => {
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


function extractAbstractText() {
  const abstractEl = Array.from(document.querySelectorAll("div, section, p")).find(el =>
    el.textContent.toLowerCase().startsWith("abstract") && el.textContent.length > 50
  );
  if (abstractEl) return abstractEl.textContent.replace(/^abstract[:\s]*/i, '').trim();

  const fallback = Array.from(document.querySelectorAll("div, p")).find(el =>
    el.textContent.length > 200 && el.textContent.includes('.') && !el.textContent.includes('\n\n')
  );
  return fallback?.textContent.trim() || '';
}

function computeIRR(userMap, aiMap, idList) {
    let agree = 0;
    let total = 0;

    for (const id of idList) {
        const userVote = userMap[id];
        const aiVote = aiMap[id];
        if (["Yes", "No", "Maybe"].includes(userVote) && ["Yes", "No", "Maybe"].includes(aiVote)) {
            total++;
            if (userVote === aiVote) agree++;
        }
    }

    return total ? (agree / total).toFixed(2) : "N/A";
}
function extractAuthorAndYear() {
  const allText = document.body.innerText;

  // Find the year
  const yearMatch = allText.match(/\b(19|20)\d{2}\b/);  // first 4-digit year
  const year = yearMatch ? yearMatch[0] : "";

  // Match single or multiple author lines (semicolon optional)
  const authorLineMatch = allText.match(/^([A-ZÄÖÅa-zäöå\-']+, [A-ZÄÖÅa-zäöå.\-']+);?/m);
  const fullAuthor = authorLineMatch ? authorLineMatch[1] : "";

  const lastNameOnly = fullAuthor.split(",")[0].trim();

  return { author: lastNameOnly, year };
}





})();