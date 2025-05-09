# Covidence Study Navigator (Tampermonkey Script)

This is a browser-based tool designed to help researchers efficiently complete their screening tasks on [Covidence](https://www.covidence.org/). When conducting a systematic review, you may be randomly assigned hundreds of studies. Covidence requires you to manually search for each study using a numeric label (e.g., #2175), screen the record, and record your decision. This tool automates and organizes that process within the Covidence interface.

## Features

- Paste a custom list of study numbers (e.g., from Excel) directly into a panel embedded in the Covidence interface.
- Automatically navigate to each study in the list.
- Make Yes/No/Maybe decisions using built-in buttons on the panel.
- Record and log decisions in real time.
- Export screening decisions as a CSV file for tracking or auditing.
- Click on logged study IDs in a summary section to jump directly to a specific study.


## Installation Instructions (Chrome)

### Step 1: Install the Tampermonkey Extension

1. Visit [https://www.tampermonkey.net/](https://www.tampermonkey.net/)
2. Select the Chrome version and install it from the Chrome Web Store
3. After installation, you should see the Tampermonkey icon in your browser toolbar

### Step 2: Install the Covidence Study Navigator Script

1. Download the script file:  
   [covidence_study_navigator_with_done_label.user.js](./covidence_study_navigator.js)
2. Open the file in your browser
3. Tampermonkey will display a prompt to install the script
4. Click "Install"

## How to Use in Covidence

1. Navigate to your Covidence screening page
2. A floating panel will appear in the upper-left corner of the screen

   [Insert screenshot of the panel here]

3. Paste your list of study numbers into the input box. You can copy numbers from Excel even if they are listed one per row.
4. Click "Start" to begin screening
5. For each study:
   - Click "Enter" to search
   - Review the paper
   - Click Yes, No, or Maybe
   - The current study will be marked "Done"
   - Click "Next" to continue to the next study
   - Use "Back" to return to the previous study
6. When ready, click "Export CSV" to download a file containing your decisions:

   Example:
