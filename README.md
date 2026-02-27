# 📂 Inkstone Chapter Uploader — Chrome Extension

Automatically fill and publish chapters from your local `.md` files directly into the Inkstone chapter editor.

---

## ⚙ Installation (One-Time Setup)

1. **Download / unzip** this folder somewhere on your computer (e.g. your Desktop).
   Keep the folder there permanently — Chrome loads the extension directly from it.

2. Open Chrome and go to:
   ```
   chrome://extensions
   ```

3. Turn on **Developer mode** (toggle in the top-right corner).

4. Click **"Load unpacked"**.

5. Select the `inkstone-uploader` folder.

6. Done! You'll see the extension listed. No need to pin it — it activates automatically on Inkstone.

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

### Uploading

1. Go to [inkstone.webnovel.com](https://inkstone.webnovel.com) and open your novel.
2. Click **"Create Chapter"** — this opens the chapter editor.
3. A floating panel titled **📂 Chapter Uploader** will appear on the right side.
4. Click **"Select .md files"** and pick all your chapter files at once.
5. Choose your options:
   - ✅ **Use filename as chapter title** — uses the file name (minus `.md`) as the title.
     Uncheck this if your files start with `# Your Title` and you want to use that instead.
   - **Delay between chapters** — time (ms) to wait between chapters during auto-upload.
     Default 2000ms (2 seconds) is safe. Increase if Inkstone feels slow on your connection.
6. Click **▶ Auto-Upload All Chapters** and watch it go!

### Manual mode
- Click **⬇ Fill This Chapter Only** to just fill the current open chapter without publishing.
  Useful if you want to review before hitting Publish yourself.

---

## ⚠ Important Notes

- **Stay on the page** during auto-upload. Don't switch tabs or the automation may break.
- Inkstone must be open on the chapter editor page for the tool to work.
- After each chapter is published, Inkstone should automatically open a new blank editor.
  If it doesn't, the auto-uploader will pause and tell you in the log.
- The tool **strips Markdown formatting** (bold, italic, headers, etc.) since Inkstone's
  editor doesn't render Markdown syntax.

---

## 🛠 Troubleshooting

| Problem | Fix |
|---|---|
| Panel doesn't appear | Refresh the Inkstone page |
| Title field not found | Make sure you're on the chapter editor page (after clicking Create Chapter) |
| Body not filling | Click once inside the chapter editor area, then try again |
| Publish button not found | Wait a moment for the page to fully load, then retry |
| Auto-upload stops mid-way | Increase the delay value and try again |

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
