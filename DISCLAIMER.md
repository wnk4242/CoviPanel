## Disclaimer: Data Privacy & Scope

**CoviPanel** is a client-side userscript built with Tampermonkey that runs entirely within your browser while using Covidence. It is intended to enhance your personal screening workflow and **does not collect, transmit, or scrape data from external sources**.

### 🔒 Data Handling
- CoviPanel **only accesses data already visible in your browser**, such as abstracts and metadata shown on Covidence study pages.
- The script **does not send data to any external servers** unless you explicitly enable the optional AI assistant, which requires entering your own OpenAI API key.
- All interactions (study IDs, decisions, settings) are stored locally using `GM_setValue`, a Tampermonkey feature that saves data **on your own device only**.

### ⚠️ No Web Scraping
CoviPanel **does not perform web scraping** in the conventional sense. It does not:
- Bypass login systems,
- Access hidden content or protected APIs,
- Harvest data from the Covidence backend.

Instead, it simply reads information already rendered in your browser and helps you organize it more efficiently.
