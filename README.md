# 📂 Chapter Uploader — Chrome Extension

Automatically fill and publish chapters from your local `.md` files directly into **Inkstone (WebNovel)** and **Royal Road** chapter editors.

---

## ⚙ Installation (One-Time Setup)

1. **Download / unzip** this folder somewhere on your computer (e.g. your Desktop).
   Keep the folder there permanently — Chrome loads the extension directly from it.

   **DOWNLOAD HERE:** https://github.com/Eisenheim-00/inkstone-uploader/releases/tag/chapter-uploader-latest

2. Open Chrome and go to:
   ```
   chrome://extensions
   ```

3. Turn on **Developer mode** (toggle in the top-right corner).

4. Click **"Load unpacked"**.

5. Select the `inkstone-uploader` folder.

6. Done! The extension activates automatically on both Inkstone and Royal Road. The panel header shows which platform it detected.

---

## 🚀 How to Use

### Prepare your files
- Save each chapter as a `.md` file.
- **Naming tip:** Name them so they sort in the right order, e.g.:
  ```
  01 - Chapter 1 The Beginning.md
  02 - Chapter 2 The Storm.md
  03 - Chapter 3 Aftermath.md
  ```
- Optionally start each file with a Markdown heading for the title:
  ```markdown
  # Chapter 1: The Beginning

  Content of your chapter goes here...
  ```

---

## 📗 Inkstone (WebNovel)

### How it works
1. Go to [inkstone.webnovel.com](https://inkstone.webnovel.com) and open your novel.
2. Click **"Create Chapter"** — this opens the chapter editor.
3. The **📂 Chapter Uploader** panel appears on the right. The badge in the header will say **Inkstone**.
4. Click **"Select .md files"** and pick all your chapter files at once.
5. Set your options (see Options section below).
6. Click **▶ Auto-Upload All Chapters** and walk away.

### What it does automatically
- Fills the chapter title and body
- Clicks **Publish**
- Clicks **Confirm** in the modal
- Returns to the novel overview, clicks **Create Chapter**
- Repeats for every file

---

## 📘 Royal Road

### How it works
1. Go to your novel's chapter list on Royal Road.
2. Click **"Add Chapter"** — this opens the chapter editor.
3. The **📂 Chapter Uploader** panel appears. The badge will say **Royal Road**.
4. Click **"Select .md files"** and pick all your chapter files at once.
5. Set your options (see Options section below).
6. Click **▶ Auto-Upload All Chapters** and walk away.

### What it does automatically
- Fills the chapter title and body
- Saves your remaining chapters before the page reloads
- Clicks **Publish Chapter**
- Automatically navigates to the new chapter editor
- Resumes uploading the next chapter

### ⚠ Royal Road specific notes
- **Don't close the tab** during auto-upload. The extension uses the tab's session memory to track remaining chapters — closing the tab clears it.
- If the process is interrupted mid-way (e.g. you accidentally close the tab), you'll need to start again from where it left off. Check your Royal Road chapter list to see which chapters were already published.
- Royal Road redirects to a chapter preview after each publish — this is normal. The extension handles the redirect automatically.

---

## ⚙ Options

| Option | Description |
|---|---|
| **Use filename as chapter title** | Uses the file name (minus `.md`) as the chapter title. Uncheck if your files start with `# Your Title` and you want that used instead. |
| **Delay between chapters (ms)** | How long to wait between chapters. Default 2000ms. Increase if your connection is slow or the site feels laggy. |

### Manual mode
Click **⬇ Fill This Chapter Only** to fill the current open chapter without publishing — useful if you want to review the content before publishing yourself.

---

## ⚠ General Notes

- **Stay on the page** and don't switch tabs during auto-upload.
- The tool **strips Markdown formatting** (bold, italic, headers, etc.) and pastes as plain text, preserving your spacing and line breaks.
- Chapters are sorted in **natural order** — so Chapter 9 comes before Chapter 10, not after Chapter 100.

---

## 🛠 Troubleshooting

| Problem | Fix |
|---|---|
| Panel doesn't appear | Refresh the page |
| Badge shows wrong platform | You're on the wrong page — navigate to the chapter editor first |
| Title field not found | Make sure you're on the chapter editor page, not the novel overview |
| Body not filling | Click **🔍 Debug Editor** and share the log output |
| Publish button not found | Wait for the page to fully load, then retry |
| Auto-upload stops mid-way | Increase the delay value and try again |
| Royal Road keeps repeating a chapter | Refresh the extension at `chrome://extensions` and start again |
| Royal Road loses progress | Don't close the tab mid-upload — session is tab-scoped |

---

## 📁 Files in this folder

```
inkstone-uploader/
├── manifest.json   — Extension config
├── content.js      — Main automation logic
├── panel.css       — Floating panel styles
├── icon.png        — Extension icon
└── README.md       — This file
```
