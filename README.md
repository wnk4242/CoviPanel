# Covidence Study Navigator (Tampermonkey Script)

This is a browser-based tool designed to help researchers efficiently complete their screening tasks on [Covidence](https://www.covidence.org/). When conducting a systematic review, you may be randomly assigned hundreds of studies. Covidence requires you to manually search for each study using a numeric label (e.g., #2175), screen the record, and record your decision. This tool automates and organizes that process within the Covidence interface.

## Features

- Allows you to paste a list of study numbers copied from Excel or other sources
- Navigates forward and backward through the list
- Inserts the current study number into the Covidence search bar
- Provides a button to simulate pressing Enter
- Displays a progress bar and a numerical indicator (e.g., "3 of 50")
- Automatically records Yes/No/Maybe decisions
- Marks studies as "Done" in the panel when completed
- Enables one-click export of your recorded decisions to a CSV file
- Saves your place in the list even if the page is refreshed

## Installation Instructions (Chrome)

### Step 1: Install the Tampermonkey Extension

1. Visit [https://www.tampermonkey.net/](https://www.tampermonkey.net/)
2. Select the Chrome version and install it from the Chrome Web Store
3. After installation, you should see the Tampermonkey icon in your browser toolbar

### Step 2: Install the Covidence Study Navigator Script

1. Download the script file:  
   [covidence_study_navigator_with_done_label.user.js](./covidence_study_navigator_with_done_label.user.js)
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
