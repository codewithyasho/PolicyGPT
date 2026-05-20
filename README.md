# Policy Summarizer Chrome Extension

Welcome to the Policy Summarizer! This is a Chrome Extension that uses Artificial Intelligence (Groq API) to automatically read and summarize boring, lengthy website policies like Terms & Conditions, Privacy Policies, and Refund Policies.

This README will explain how the entire project works, step by step, so you can understand every piece of the code.

---

## 🏗️ Project Architecture: How it all connects

A Chrome Extension is basically a tiny website that lives inside your browser and has special permissions to interact with the web pages you visit. Our extension is made up of **four main parts**:

### 1. The ID Card (`manifest.json`)

This is the configuration file for the extension. Think of it as the "ID Card" that tells Chrome:

- **What is the extension called?** (Policy Summarizer)
- **What permissions does it need?**
  - `storage`: To securely save your Groq API key.
  - `activeTab` & `scripting`: To read the current webpage you are on.
- **Which files run where?** It registers the popup, the background script, and the content script.

### 2. The Injected UI (`content.js` & `content.css`)

This is the script that gets **injected directly into the website you are currently visiting** (e.g., `amazon.in`).

- **What it does:** When the page loads, `content.js` creates that sleek floating "Summarize Policies" button in the bottom right corner.
- **When clicked:** It scans the entire webpage looking for links (`<a>` tags) that have words like "terms", "privacy", "policy", or "refund".
- **The handover:** Once it finds those links, it cannot call the AI directly (due to browser security rules). Instead, it sends a "message" containing those links to our background script.
- **The result:** When the background script replies with the AI summary, `content.js` creates a beautiful glassmorphism panel to display the text to the user.

### 3. The Brain in the Background (`background.js`)

This is a Service Worker—an invisible script that runs in the background of your browser, completely separate from the webpage you are viewing.

- **What it does:** It listens for messages from `content.js`.
- **The Process:**
  1. It receives the list of policy links.
  2. It invisibly fetches the HTML content of those links in the background.
  3. It strips away all the messy HTML code (buttons, images, headers) and extracts just the plain text.
  4. It takes your Groq API key from storage and sends the plain text to the **Groq AI (Llama-3)** with strict instructions to summarize it and find "Red Flags".
  5. It sends the AI's summarized response back to the `content.js` so it can be displayed.

### 4. The Settings Menu (`popup/popup.html`, `popup.js`, `popup.css`)

This is the mini-website that appears when you click the extension's puzzle-piece icon in your Chrome toolbar.

- **What it does:** It provides a simple, secure form where you can paste your Groq API Key.
- **How it works:** When you click "Save Key", `popup.js` takes the text from the input box and uses Chrome's local storage API (`chrome.storage.local`) to save it securely on your computer.

---

## 🚀 Step-by-Step Flow: What happens when you use it?

1. **You visit a website.** (e.g., a shopping site).
2. Chrome looks at `manifest.json` and injects `content.js` into the site.
3. `content.js` adds the floating button to the bottom right corner of your screen.
4. **You click the button.**
5. `content.js` quickly scans the page's footer for links to Terms & Conditions or Privacy Policies.
6. `content.js` sends a message to the invisible `background.js`: *"Hey, I found these 3 policy links. Please summarize them!"*
7. `background.js` reads your saved Groq API key from Chrome Storage.
8. `background.js` invisibly downloads the text from those 3 policy links.
9. `background.js` sends that text to Groq's super-fast AI servers.
10. The AI reads the text, creates a bulleted summary, and sends it back to `background.js`.
11. `background.js` sends the summary back to `content.js`.
12. `content.js` opens the sleek floating panel and displays the summary to you!

---

## 🛠️ How to Edit or Add Features

- **Want to change the AI prompt?**
  Open `background.js` and look for the `systemPrompt` variable. You can change how the AI responds (e.g., "Make it sound like a pirate", or "Only focus on the refund policy").
  
- **Want to change the look of the button or panel?**
  Open `content.css`. This contains all the styling. You can change colors, sizes, and fonts here.
  
- **Want to add more keywords to scan for?**
  Open `content.js` and find the `findPolicyLinks()` function. You can add more words to the `keywords` array (like "cookie", "data", "eula").

Enjoy building and modifying your AI extension!
