# Covidence Study Navigator (Tampermonkey Script)

This is a browser-based tool designed to help researchers efficiently complete their screening tasks on [Covidence](https://www.covidence.org/). When conducting a systematic review, you may be randomly assigned hundreds of studies. Covidence requires you to manually search for each study using a numeric label (e.g., #2175), screen the record, and record your decision. This tool automates and organizes that process within the Covidence interface.

## Features

- Paste a custom list of study numbers (e.g., from Excel) directly into a panel embedded in the Covidence interface.
- Automatically navigate to each study in the list.
- Make Yes/No/Maybe decisions using built-in buttons on the panel.
- Record and log decisions in real time.
- Export screening decisions as a CSV file for tracking or auditing.
- Click on logged study IDs in a summary section to jump directly to a specific study.

![UI](CSN_UI.png)


## How to Install Tampermonkey and Add This Script

### ✅ Step 1: Add Tampermonkey to Chrome  
1. Go to the [Chrome Web Store](https://chrome.google.com/webstore/) and search for **Tampermonkey**.

![Step 1.1](installation/install_step1.1.png)

2. Click **Add to Chrome** on the extension page.

3. Alternatively, visit [tampermonkey.net](https://www.tampermonkey.net/) and click **Get from Store**.

![Step 1](installation/install_step1.png)  
---

### ✅ Step 2: Pin Tampermonkey to Your Toolbar  
![Step 1.2](installation/install_step1.2.png)  

1. Click the puzzle piece icon (Extensions) in the top-right of Chrome.  
2. Find **Tampermonkey** and click the pin icon to keep it visible in your toolbar.

---

### ✅ Step 3: Open the Tampermonkey Dashboard  
![Step 2](installation/install_step2.png)  

1. Click the **Tampermonkey** icon in your toolbar.  
2. Choose **Dashboard** from the dropdown menu.

---

### ✅ Step 4: Create a New Userscript  
![Step 2.1](installation/install_step2.1.png)  

1. In the dashboard, click the **➕ (plus)** icon at the top right to create a new script.  
2. Delete the default code entirely in the code editor and paste the code in **Covidence Study Navigator.user.js** into the code editor and click **File > Save**.
3. Once saved, the script will automatically run whenever you visit Covidence.  
![Step 3](installation/install_step3.png)  

