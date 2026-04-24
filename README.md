# GDrive PDF Annotator

GDrive PDF Annotator is a lightweight, powerful web application built with **Google Apps Script**. It allows users to browse, open, and annotate PDF files directly from their Google Drive without leaving the browser.

## 🚀 Features

- **Seamless Drive Integration:** Browse "My Drive", "Shared with me", and "Starred" files.
- **Advanced Annotation Tools:**
  - **Pen & Highlighter:** Draw or highlight with adjustable colors.
  - **Text Tool:** Add comments directly onto the PDF.
  - **Author Tags:** Automatically adds your initials next to annotations for easy identification.
  - **Eraser & Undo:** Easily correct or remove annotations.
- **Smart Versioning:** - Save annotation progress in a linked JSON history file.
  - Restore previous versions of your annotations.
- **High-Quality Export:**
  - Flatten annotations into a new PDF file.
  - **Smart Rotation Handling:** Correctly aligns annotations even on rotated or landscape PDF pages.
  - Overwrite protection with a confirmation prompt.
- **Performance Optimized:** - Lazy loading (infinite scroll) for folders with many files.
  - Fast rendering using PDF.js and Fabric.js.

## 🛠️ Tech Stack

- **Backend:** Google Apps Script (GAS)
- **Frontend:** Vue.js 3, Vuetify 3 (Material Design)
- **PDF Libraries:** PDF.js (Rendering), PDF-lib (Exporting/Flattening)
- **Canvas Engine:** Fabric.js

## ⚙️ Installation & Setup

1. Create a new [Google Apps Script](https://script.google.com/) project.
2. Copy the content of `Code.js` into the script editor.
3. Create an HTML file named `Index.html` and paste the corresponding code.
4. (Optional) Set a specific `BASE_FOLDER_ID` in `Code.js` if you want the app to open in a specific directory.
5. Deploy as a **Web App**:
   - Execute as: *Me*
   - Who has access: *Anyone with a Google Account* (or restricted to your domain).
6. Authorize the necessary permissions (Drive API).

## 📖 Usage

- **Browse:** Use the sidebar to navigate through your Drive folders.
- **Annotate:** Select a PDF, use the toolbar to add drawings or text. 
- **Save:** Click "Save" to store your progress in the history.
- **Export:** Click "Export PDF" to create a flattened version of the document in the same Drive folder.
