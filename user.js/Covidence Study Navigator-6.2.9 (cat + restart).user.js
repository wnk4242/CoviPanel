// ==UserScript==
// @name         Covidence Study Navigator
// @namespace    http://tampermonkey.net/
// @version      6.2.9
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
  <div id="covidence-header" style="font-size: 15px; font-weight: bold; cursor: move;">Covidence Panel</div>
  <div id="topRightIcons" style="display: none; gap: 7px; flex-direction: row; align-items: center;">
    <button id="returnBtn" title="Return to current study" style="background:none; border:none; cursor:pointer; font-size:22px;" aria-label="Return to current study">◉</button>
    <button id="uploadSkinBtn" title="Panel appearance options" style="background:none; border:none; cursor:pointer; font-size:17px;" aria-label="Panel skin options">📷</button>
<input type="file" id="skinImageInput" accept=".jpg,.jpeg,.png,.gif" style="display:none;">
    <button id="exportBtn" title="Export decisions to .csv" style="background:none; border:none; cursor:pointer; font-size:20px;" aria-label="Export decisions to .csv">🖫</button>
    <button id="resetBtn" title="Start a new screening session" style="background:none; border:none; cursor:pointer; font-size:18px;" aria-label="Start a new screening session">⟳</button>
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
        // 🐱 Add draggable cat GIF to the panel
const catGif = document.createElement("img");
catGif.src = "data:image/gif;base64,R0lGODlh4AHgAfcAAP//AAAAAHVqZtt8TfeiovGXa////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH5BAkhAAAAIf8LTkVUU0NBUEUyLjADAQAAACwAAAAA4AHgAQAI/gABCBxIsKDBgwgTKlzIsKHDhxAjSpxIsaLFixgzatzIsaPHjyBDihxJsqTJkyhTqlzJsqXLlzBjypxJs6bNmzhz6tzJs6fPn0CDCh1KtKjRo0iTKl3KtKnTp1CjSp1KtarVq1izat3KtavXr2DDih1LtqzZs2jTql3Ltq3bt3Djyp1Lt67du3jz6t3Lt6/fv4ADCx5MuLDhw4gTK17MuLHjx5AjS55MubLly5gza97MubPnz6BDix5NurTp06hTfw3AurXr17Bjy55N+7Xq209r697Nmzbu30t7Cx+uG7jxo8STK299vPnQ5dCHO5/+M7r13dSz77zOfbb27ze7/ou3Db68zPHoA5hf/zL9ePbwV7oXH7/+yfnd7esfiZ/7/v8f9XcdgARuJKB1BSZYU28KNggUgw5GuB1vElaIE4QWZngehRp22B6HHoaoEoYillgSiSamCBKKKrZoIIguxpgRizLWKBGNNubYEI469ogQjz4GORCQQopIZJE9HolkjkouWWOTTsYIZZQtTkllilZeWWKWWobIZZcdfglmhmKOWWGZZkaIZpoNrslmgm6+qV2ccv5HZ5363YlnfXruCV+ffq4HaKDlDUrod4Yeml2iik7HaKPNPQqpcZJO+lullt6GaaapbcrpaQdG92looUI3KmilLnfqZ6kqt6pn/q0m92pnsRI3K2e1SnerZrkKtyuvvcL4a2XBCjvsZMVid6xlyRa3LLHN+vYsZdFKO61k1Xp37bbcduvtt+CGK+645JZr7rnopqvuuuy26+678MYr77w+ejqRvfTGhG9E++brUr8PAeyvfMbaJPDAKR3MkMIIm8SwQg83zF/BC1IscVMR/2jxxcFtvKGyHEeV8UEjh8xRyQWhbPKMHuvb8spEqTzkyzALJbNAN9d8L83/8qzzh7sJIPTQRBfdZ28DJK300kznnG9vRUdN9NG8MW310k7TC7XUUlO929VgZz3v1lwb7bNDSINttdjykl320F7rpvbaZ//ckdtvCxB3/m1zN1233S8GnTfcfy+Udt9Jsx0v3m/vTRviSisOL+NlOz4b5IkXDjhGlHNtuWyYDyD5u513rXlChyM+urulR/15bKGv3m7rZoMcuNyYy84u7VOfrvHXufu+OUW8E267Rqn3rfu6vRHg/PPQR/86bNFXD/3y6jZvvfXTv7Y998IPfyNv31ffvWvlSx+++BBpn77z57f2/vPYp+v++/GzNj/867OPNvn7y18A9keA+qHrfukTIAENeC4Elk+BAeyf/xYGwPlB0IISnCDEKoi/DALAgd9joLlA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"; // or your base64 version
catGif.id = "draggableCatGif";
catGif.draggable = false; // 🛑 Prevent browser drag ghost

catGif.style.cssText = `
  position: absolute;
  top: ${GM_getValue("catTop", "8px")};
  left: ${GM_getValue("catLeft", "240px")};
  width: 40px;
  height: 40px;
  opacity: 0.9;
  z-index: 10001;
  cursor: grab;
  cursor: -webkit-grab;
  user-select: none;
  pointer-events: auto;
  -webkit-user-drag: none;
`;
panel.appendChild(catGif);


// 🐾 Cat drag logic
let isDraggingCat = false;
let catOffsetX = 0, catOffsetY = 0;

catGif.addEventListener("mousedown", (e) => {
  isDraggingCat = true;
  catGif.style.cursor = "grabbing";
catGif.style.cursor = "-webkit-grabbing";
  catOffsetX = e.clientX - catGif.offsetLeft;
  catOffsetY = e.clientY - catGif.offsetTop;
  e.stopPropagation(); // don't interfere with panel drag
});

document.addEventListener("mousemove", (e) => {
  if (!isDraggingCat) return;
  const panelRect = panel.getBoundingClientRect();
  const newX = e.clientX - panelRect.left - catOffsetX;
  const newY = e.clientY - panelRect.top - catOffsetY;
  catGif.style.left = `${Math.max(0, Math.min(newX, panel.offsetWidth - catGif.offsetWidth))}px`;
  catGif.style.top = `${Math.max(0, Math.min(newY, panel.offsetHeight - catGif.offsetHeight))}px`;
});

document.addEventListener("mouseup", () => {
  if (isDraggingCat) {
    GM_setValue("catTop", catGif.style.top);
    GM_setValue("catLeft", catGif.style.left);
  }
  isDraggingCat = false;
  catGif.style.cursor = "grab";
catGif.style.cursor = "-webkit-grab";
});

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

exportBtn.onclick = function() {
    const aiDecisions = JSON.parse(GM_getValue("chatgpt_decisions", "{}"));
    const aiExplanations = JSON.parse(GM_getValue("chatgpt_explanations", "{}"));
    const csvHeader = "Study ID,User Decision,ChatGPT Decision,ChatGPT Reason";
    const csvRows = studies.map(id => {
        const userVote = decisions[id] || "";
        const aiVote = aiDecisions[id] || "";
        const reason = aiExplanations[id]
            ? `"${aiExplanations[id].replace(/"/g, '""')}"`
            : "";
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
};



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
    ["Yes", "No", "Maybe"].includes(decisions[id])
);

            if (allFinished) {
                // ✅ Update summary first
                const panel = document.getElementById("covidence-panel");
                if (panel) {
                    const currentDisplay = panel.querySelector('#currentStudy');
                    if (currentDisplay) currentDisplay.textContent = `#${currentID}`;
                    const summaryList = panel.querySelector('#summaryList');
                    const toggleSummaryBtn = panel.querySelector('#toggleSummaryBtn');

                    const maybeList = studies.filter(id => decisions[id] === "Maybe");
                    const yesList = studies.filter(id => decisions[id] === "Yes");
                    const noList = studies.filter(id => decisions[id] === "No");
                    function makeColoredList(ids, color) {
                        return ids.map(id => `<span style="color:${color};">${id}</span>`).join(', ');
                    }
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

// Inject into summaryList
const decisionSummaryContainer = document.getElementById("decisionSummaryContainer");
if (decisionSummaryContainer) {
  decisionSummaryContainer.innerHTML = "";
  decisionSummaryContainer.appendChild(makeToggleBlock("Maybe", maybeList, "orange"));
  decisionSummaryContainer.appendChild(makeToggleBlock("Yes", yesList, "green"));
  decisionSummaryContainer.appendChild(makeToggleBlock("No", noList, "red"));
}

                    summaryList.style.display = 'block';
                    toggleSummaryBtn.textContent = 'Hide decisions ▲';
                    GM_setValue('summaryVisible', true);
                }

                // ⏱️ Delay popup so the UI visibly updates first

                // ✅ Update progress bar before final popup
                const counted = studies.filter(id => ["Yes", "No", "Maybe"].includes(decisions[id])).length;
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
const aiDecisions = JSON.parse(GM_getValue("chatgpt_decisions", "{}"));
const irr = computeIRR(decisions, aiDecisions, studies);


const maybeCount = Object.values(decisions).filter(v => v === "Maybe").length;
const yesCount = Object.values(decisions).filter(v => v === "Yes").length;
const noCount = Object.values(decisions).filter(v => v === "No").length;
const totalCount = maybeCount + yesCount + noCount;

const maybePct = totalCount ? ((maybeCount / totalCount) * 100).toFixed(1) : "0.0";
const yesPct = totalCount ? ((yesCount / totalCount) * 100).toFixed(1) : "0.0";
const noPct = totalCount ? ((noCount / totalCount) * 100).toFixed(1) : "0.0";

alert(
  "You've reached the end of your study list!" + sessionMsg +
     `\n⏳ Avg decision time: ${avgDecisionTimeSec}s` +
     `\n🤖 Interrater Reliability with ChatGPT: ${irr}` +
  "\n\n📊 Decision breakdown:\n" +
  `• Maybe: ${maybeCount} (${maybePct}%)\n` +
  `• Yes: ${yesCount} (${yesPct}%)\n` +
  `• No: ${noCount} (${noPct}%)`

);




                    // ✅ Export CSV
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
                        const existingAI = panel.querySelector("div:has(#runAIButton)");
if (existingAI) existingAI.remove();

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
    );

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