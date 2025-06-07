## 📢 Disclaimer: Data Privacy & Scope

**CoviPanel** is a client-side userscript built with Tampermonkey that runs entirely within your browser while using [Covidence](https://www.covidence.org/). It is designed to enhance your personal screening workflow and **does not collect, transmit, or scrape data from external sources**.

### 🔒 Data Handling
- CoviPanel **only interacts with content already visible in your browser**, such as abstracts, titles, authors, and other study information rendered by the Covidence web interface.
- The script **does not send data to any external servers** unless you explicitly activate the optional AI assistant.
- If you use the AI assistant feature, **all OpenAI API requests are initiated locally from your browser**, using an API key that you load yourself. **No data is routed through third-party servers or shared with the script author.**

### 🗂️ What Is Stored and Where
All persistent data is stored **locally in your browser** via Tampermonkey’s `GM_setValue` feature. This includes:
- ✅ **Study IDs** that you enter for screening;
- ✅ **Screening decisions** you make (Yes / No / Maybe);
- ✅ **Panel settings** such as position, appearance, keyword search history, and visibility toggles;
- ✅ **Optional inclusion criteria** and **AI prompt settings**, if you use the AI assistant;
- ✅ **Your own OpenAI API key**, if you choose to save it locally.

None of this data is uploaded or synced to the cloud. It is entirely confined to your own browser environment.

### ⚠️ No Web Scraping
CoviPanel **does not perform web scraping** in the conventional sense. It does not:
- Bypass login systems,
- Access protected APIs,
- Request data directly from Covidence servers.

Instead, it reads content already loaded in the current page’s DOM and helps you log and organize your work more efficiently.
