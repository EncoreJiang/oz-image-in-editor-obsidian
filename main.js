/*
THIS IS A GENERATED/BUNDLED FILE BY ROLLUP
if you want to view the source visit the plugins github repository
*/

'use strict';

var obsidian = require('obsidian');

// Remove Widgets in CodeMirror Editor
const clearWidges = (cm) => {
    var lastLine = cm.lastLine();
    for (let i = 0; i <= lastLine; i++) {
        // Get the current Line
        const line = cm.lineInfo(i);
        // Clear the image widgets if exists
        if (line.widgets) {
            for (const wid of line.widgets) {
                if (wid.className === 'oz-image-widget') {
                    wid.clear();
                }
            }
        }
    }
};
// Http, Https Link Check
const filename_is_a_link = (filename) => filename.startsWith('http');
// Image Name and Alt Text
const getFileNameAndAltText = (linkType, match) => {
    /*
       linkType 1: [[myimage.jpg|#x-small]]
       linkType2: ![#x-small](myimage.jpg)
       returns { fileName: '', altText: '' }
    */
    var file_name_regex;
    var alt_regex;
    if (linkType == 1) {
        file_name_regex = /(?<=\[\[).*(jpe?g|png|gif)/;
        alt_regex = /(?<=\|).*(?=]])/;
    }
    else if (linkType == 2) {
        file_name_regex = /(?<=\().*(jpe?g|png|gif)/;
        alt_regex = /(?<=\[)(^$|.*)(?=\])/;
    }
    var file_match = match[0].match(file_name_regex);
    var alt_match = match[0].match(alt_regex);
    return { fileName: file_match ? file_match[0] : '',
        altText: alt_match ? alt_match[0] : '' };
};
// Getting Active Markdown File
const getActiveNoteFile = (workspace) => {
    return workspace.activeLeaf.view.file;
};
const getPathOfVault = (vault) => {
    var path = vault.adapter.basePath;
    if (path.startsWith('/'))
        return 'app://local' + path;
    return 'app://local/' + path;
};
// Temporary Solution until getResourcePath improved 
const getPathOfImage = (vault, image) => {
    // vault.getResourcePath(image) 
    return getPathOfVault(vault) + '/' + image.path;
};
const getFileCmBelongsTo = (cm, workspace) => {
    var _a;
    let leafs = workspace.getLeavesOfType("markdown");
    for (let i = 0; i <= leafs.length; i++) {
        if (((_a = leafs[i].view.sourceMode) === null || _a === void 0 ? void 0 : _a.cmEditor) == cm) {
            return leafs[i].view.file;
        }
    }
    return null;
};

class OzanImagePlugin extends obsidian.Plugin {
    constructor() {
        super(...arguments);
        // Line Edit Changes
        this.codemirrorLineChanges = (cm, changes) => {
            changes.some((change) => {
                this.check_line(cm, change.to.line);
            });
        };
        // Check Single Line
        this.check_line = (cm, line_number, targetFile) => {
            // Regex for [[ ]] format
            const image_line_regex_1 = /!\[\[.*(jpe?g|png|gif).*\]\]/;
            // Regex for ![ ]( ) format
            const image_line_regex_2 = /!\[(^$|.*)\]\(.*(jpe?g|png|gif)\)/;
            // Get the Line edited
            const line = cm.lineInfo(line_number);
            if (line === null)
                return;
            // Current Line Comparison with Regex
            const match_1 = line.text.match(image_line_regex_1);
            const match_2 = line.text.match(image_line_regex_2);
            // Clear the widget if link was removed
            var line_image_widget = line.widgets ? line.widgets.filter((wid) => wid.className === 'oz-image-widget') : false;
            if (line_image_widget && (!match_1 || !match_2))
                line_image_widget[0].clear();
            // If any of regex matches, it will add image widget
            if (match_1 || match_2) {
                // Clear the image widgets if exists
                if (line.widgets) {
                    for (const wid of line.widgets) {
                        if (wid.className === 'oz-image-widget') {
                            wid.clear();
                        }
                    }
                }
                // Get the file name and alt text depending on format
                var filename = '';
                var alt = '';
                if (match_1) {
                    // Regex for [[myimage.jpg|#x-small]] format
                    filename = getFileNameAndAltText(1, match_1).fileName;
                    alt = getFileNameAndAltText(1, match_1).altText;
                }
                else if (match_2) {
                    // Regex for ![#x-small](myimage.jpg) format
                    filename = getFileNameAndAltText(2, match_2).fileName;
                    alt = getFileNameAndAltText(2, match_2).altText;
                }
                // Create Image
                const img = document.createElement('img');
                // Prepare the src for the Image
                if (filename_is_a_link(filename)) {
                    img.src = filename;
                }
                else {
                    // Source Path
                    var sourcePath = '';
                    if (targetFile != null) {
                        sourcePath = targetFile.path;
                    }
                    else {
                        let activeNoteFile = getActiveNoteFile(this.app.workspace);
                        sourcePath = activeNoteFile ? activeNoteFile.path : '';
                    }
                    var image = this.app.metadataCache.getFirstLinkpathDest(decodeURIComponent(filename), sourcePath);
                    if (image != null)
                        img.src = getPathOfImage(this.app.vault, image);
                }
                // Image Properties
                img.alt = alt;
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
                // Add Image widget under the Image Markdown
                cm.addLineWidget(line_number, img, { className: 'oz-image-widget' });
            }
        };
        // Check All Lines Function
        this.check_lines = (cm) => {
            // Last Used Line Number in Code Mirror
            var lastLine = cm.lastLine();
            var file = getFileCmBelongsTo(cm, this.app.workspace);
            for (let i = 0; i <= lastLine; i++) {
                this.check_line(cm, i, file);
            }
        };
        // Handle file after file-open event
        this.handleFileOpen = (targetFile) => {
            // If any file fired, iterated CodeMirrors
            this.app.workspace.iterateCodeMirrors((cm) => {
                this.check_lines(cm);
            });
        };
    }
    onload() {
        // Each file open will fire
        this.registerEvent(this.app.workspace.on("file-open", this.handleFileOpen));
        // Register event for each change
        this.registerCodeMirror((cm) => {
            cm.on("changes", this.codemirrorLineChanges);
        });
    }
    onunload() {
        this.app.workspace.iterateCodeMirrors((cm) => {
            this.app.workspace.off("file-open", this.handleFileOpen);
            cm.off("changes", this.codemirrorLineChanges);
            clearWidges(cm);
        });
        new obsidian.Notice('Image in Editor Plugin is unloaded');
    }
}

module.exports = OzanImagePlugin;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsic3JjL3V0aWxzLnRzIiwic3JjL21haW4udHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgV29ya3NwYWNlLCBNYXJrZG93blZpZXcsIFZhdWx0LCBURmlsZSwgbm9ybWFsaXplUGF0aCB9IGZyb20gJ29ic2lkaWFuJztcblxuLy8gUmVtb3ZlIFdpZGdldHMgaW4gQ29kZU1pcnJvciBFZGl0b3JcbmNvbnN0IGNsZWFyV2lkZ2VzID0gKGNtOiBDb2RlTWlycm9yLkVkaXRvcikgPT4ge1xuXG4gICAgdmFyIGxhc3RMaW5lID0gY20ubGFzdExpbmUoKTtcblxuICAgIGZvcihsZXQgaT0wOyBpIDw9IGxhc3RMaW5lOyBpKyspe1xuXG4gICAgICAgIC8vIEdldCB0aGUgY3VycmVudCBMaW5lXG4gICAgICAgIGNvbnN0IGxpbmUgPSBjbS5saW5lSW5mbyhpKTtcblxuICAgICAgICAvLyBDbGVhciB0aGUgaW1hZ2Ugd2lkZ2V0cyBpZiBleGlzdHNcbiAgICAgICAgaWYgKGxpbmUud2lkZ2V0cyl7XG4gICAgICAgICAgICBmb3IoY29uc3Qgd2lkIG9mIGxpbmUud2lkZ2V0cyl7XG4gICAgICAgICAgICAgICAgaWYgKHdpZC5jbGFzc05hbWUgPT09ICdvei1pbWFnZS13aWRnZXQnKXtcbiAgICAgICAgICAgICAgICAgICAgd2lkLmNsZWFyKClcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgfVxufVxuXG4vLyBIdHRwLCBIdHRwcyBMaW5rIENoZWNrXG5jb25zdCBmaWxlbmFtZV9pc19hX2xpbmsgPSAoZmlsZW5hbWU6IHN0cmluZykgPT4gZmlsZW5hbWUuc3RhcnRzV2l0aCgnaHR0cCcpO1xuXG4gLy8gSW1hZ2UgTmFtZSBhbmQgQWx0IFRleHRcbmNvbnN0IGdldEZpbGVOYW1lQW5kQWx0VGV4dCA9KGxpbmtUeXBlOiBudW1iZXIsIG1hdGNoOiBhbnkpID0+IHtcblxuICAgIC8qIFxuICAgICAgIGxpbmtUeXBlIDE6IFtbbXlpbWFnZS5qcGd8I3gtc21hbGxdXVxuICAgICAgIGxpbmtUeXBlMjogIVsjeC1zbWFsbF0obXlpbWFnZS5qcGcpIFxuICAgICAgIHJldHVybnMgeyBmaWxlTmFtZTogJycsIGFsdFRleHQ6ICcnIH0gICBcbiAgICAqL1xuXG4gICAgdmFyIGZpbGVfbmFtZV9yZWdleDtcbiAgICB2YXIgYWx0X3JlZ2V4O1xuXG4gICAgaWYobGlua1R5cGUgPT0gMSl7XG4gICAgICAgIGZpbGVfbmFtZV9yZWdleCA9IC8oPzw9XFxbXFxbKS4qKGpwZT9nfHBuZ3xnaWYpLztcbiAgICAgICAgYWx0X3JlZ2V4ID0gLyg/PD1cXHwpLiooPz1dXSkvO1xuICAgIH0gZWxzZSBpZihsaW5rVHlwZSA9PSAyKXtcbiAgICAgICAgZmlsZV9uYW1lX3JlZ2V4ID0gLyg/PD1cXCgpLiooanBlP2d8cG5nfGdpZikvO1xuICAgICAgICBhbHRfcmVnZXggPSAvKD88PVxcWykoXiR8LiopKD89XFxdKS87XG4gICAgfVxuXG4gICAgdmFyIGZpbGVfbWF0Y2ggPSBtYXRjaFswXS5tYXRjaChmaWxlX25hbWVfcmVnZXgpO1xuICAgIHZhciBhbHRfbWF0Y2ggPSBtYXRjaFswXS5tYXRjaChhbHRfcmVnZXgpO1xuXG4gICAgcmV0dXJuIHsgZmlsZU5hbWU6IGZpbGVfbWF0Y2ggPyBmaWxlX21hdGNoWzBdIDogJycsIFxuICAgICAgICAgICAgYWx0VGV4dDogYWx0X21hdGNoID8gYWx0X21hdGNoWzBdIDogJycgfVxuXG59ICAgIFxuXG4vLyBHZXR0aW5nIEFjdGl2ZSBNYXJrZG93biBGaWxlXG5jb25zdCBnZXRBY3RpdmVOb3RlRmlsZSA9ICh3b3Jrc3BhY2U6IFdvcmtzcGFjZSkgPT4ge1xuICAgIHJldHVybiAod29ya3NwYWNlLmFjdGl2ZUxlYWYudmlldyBhcyBNYXJrZG93blZpZXcpLmZpbGU7XG59XG5cbi8vIEdldCBBY3RpdmUgRWRpdG9yXG5jb25zdCBnZXRDbUVkaXRvciA9ICh3b3Jrc3BhY2U6IFdvcmtzcGFjZSk6IENvZGVNaXJyb3IuRWRpdG9yID0+IHtcbiAgICByZXR1cm4gd29ya3NwYWNlLmdldEFjdGl2ZVZpZXdPZlR5cGUoTWFya2Rvd25WaWV3KT8uc291cmNlTW9kZT8uY21FZGl0b3Jcbn1cblxuY29uc3QgZ2V0UGF0aE9mVmF1bHQgPSAodmF1bHQ6IFZhdWx0KTogc3RyaW5nID0+IHtcbiAgICB2YXIgcGF0aCA9IHZhdWx0LmFkYXB0ZXIuYmFzZVBhdGg7XG4gICAgaWYocGF0aC5zdGFydHNXaXRoKCcvJykpIHJldHVybiAnYXBwOi8vbG9jYWwnICsgcGF0aFxuICAgIHJldHVybiAnYXBwOi8vbG9jYWwvJyArIHBhdGhcbn1cblxuLy8gVGVtcG9yYXJ5IFNvbHV0aW9uIHVudGlsIGdldFJlc291cmNlUGF0aCBpbXByb3ZlZCBcbmNvbnN0IGdldFBhdGhPZkltYWdlID0gKHZhdWx0OiBWYXVsdCwgaW1hZ2U6IFRGaWxlKSA9PiB7XG4gICAgLy8gdmF1bHQuZ2V0UmVzb3VyY2VQYXRoKGltYWdlKSBcbiAgICByZXR1cm4gZ2V0UGF0aE9mVmF1bHQodmF1bHQpICsgJy8nICsgaW1hZ2UucGF0aFxufVxuXG5jb25zdCBnZXRGaWxlQ21CZWxvbmdzVG8gPSAoY206IENvZGVNaXJyb3IuRWRpdG9yLCB3b3Jrc3BhY2U6IFdvcmtzcGFjZSkgPT4ge1xuICAgIGxldCBsZWFmcyA9IHdvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoXCJtYXJrZG93blwiKTtcbiAgICBmb3IobGV0IGk9MDsgaSA8PSBsZWFmcy5sZW5ndGg7IGkrKyl7XG4gICAgICAgIGlmKGxlYWZzW2ldLnZpZXcuc291cmNlTW9kZT8uY21FZGl0b3IgPT0gY20pe1xuICAgICAgICAgICAgcmV0dXJuIGxlYWZzW2ldLnZpZXcuZmlsZVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xufSBcblxuZXhwb3J0IHsgY2xlYXJXaWRnZXMsIGZpbGVuYW1lX2lzX2FfbGluaywgZ2V0RmlsZU5hbWVBbmRBbHRUZXh0LFxuICAgIGdldEFjdGl2ZU5vdGVGaWxlLCBnZXRDbUVkaXRvciwgZ2V0UGF0aE9mSW1hZ2UsIGdldEZpbGVDbUJlbG9uZ3NUbyB9OyIsImltcG9ydCB7IFBsdWdpbiwgTm90aWNlLCBURmlsZSB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCB7IGNsZWFyV2lkZ2VzLCBmaWxlbmFtZV9pc19hX2xpbmssIGdldEZpbGVOYW1lQW5kQWx0VGV4dCxcbiAgICAgICAgZ2V0QWN0aXZlTm90ZUZpbGUsIGdldFBhdGhPZkltYWdlLCBnZXRGaWxlQ21CZWxvbmdzVG8gfSBmcm9tICcuL3V0aWxzJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgT3phbkltYWdlUGx1Z2luIGV4dGVuZHMgUGx1Z2lue1xuXG4gICAgb25sb2FkKCl7XG4gICAgICAgIC8vIEVhY2ggZmlsZSBvcGVuIHdpbGwgZmlyZVxuICAgICAgICB0aGlzLnJlZ2lzdGVyRXZlbnQoXG4gICAgICAgICAgICB0aGlzLmFwcC53b3Jrc3BhY2Uub24oXCJmaWxlLW9wZW5cIiwgdGhpcy5oYW5kbGVGaWxlT3BlbilcbiAgICAgICAgKVxuICAgICAgICAvLyBSZWdpc3RlciBldmVudCBmb3IgZWFjaCBjaGFuZ2VcbiAgICAgICAgdGhpcy5yZWdpc3RlckNvZGVNaXJyb3IoIChjbTogQ29kZU1pcnJvci5FZGl0b3IpID0+IHtcbiAgICAgICAgICAgIGNtLm9uKFwiY2hhbmdlc1wiLCB0aGlzLmNvZGVtaXJyb3JMaW5lQ2hhbmdlcyk7XG4gICAgICAgIH0pICAgICAgICBcbiAgICB9XG5cbiAgICBvbnVubG9hZCgpe1xuICAgICAgICB0aGlzLmFwcC53b3Jrc3BhY2UuaXRlcmF0ZUNvZGVNaXJyb3JzKCAoY20pID0+IHtcbiAgICAgICAgICAgIHRoaXMuYXBwLndvcmtzcGFjZS5vZmYoXCJmaWxlLW9wZW5cIiwgdGhpcy5oYW5kbGVGaWxlT3Blbik7XG4gICAgICAgICAgICBjbS5vZmYoXCJjaGFuZ2VzXCIsIHRoaXMuY29kZW1pcnJvckxpbmVDaGFuZ2VzKTtcbiAgICAgICAgICAgIGNsZWFyV2lkZ2VzKGNtKTtcbiAgICAgICAgfSk7XG4gICAgICAgIG5ldyBOb3RpY2UoJ0ltYWdlIGluIEVkaXRvciBQbHVnaW4gaXMgdW5sb2FkZWQnKTtcbiAgICB9XG5cbiAgICAvLyBMaW5lIEVkaXQgQ2hhbmdlc1xuICAgIGNvZGVtaXJyb3JMaW5lQ2hhbmdlcyA9IChjbTogYW55LCBjaGFuZ2VzOiBhbnkpID0+IHtcbiAgICAgICAgY2hhbmdlcy5zb21lKCAoY2hhbmdlOiBhbnkpID0+IHtcbiAgICAgICAgICAgIHRoaXMuY2hlY2tfbGluZShjbSwgY2hhbmdlLnRvLmxpbmUpO1xuICAgICAgICB9KVxuICAgIH1cblxuICAgIC8vIENoZWNrIFNpbmdsZSBMaW5lXG4gICAgY2hlY2tfbGluZTogYW55ID0gKGNtOiBDb2RlTWlycm9yLkVkaXRvciwgbGluZV9udW1iZXI6IG51bWJlciwgdGFyZ2V0RmlsZT86VEZpbGUpID0+IHtcblxuICAgICAgICAvLyBSZWdleCBmb3IgW1sgXV0gZm9ybWF0XG4gICAgICAgIGNvbnN0IGltYWdlX2xpbmVfcmVnZXhfMSA9IC8hXFxbXFxbLiooanBlP2d8cG5nfGdpZikuKlxcXVxcXS9cbiAgICAgICAgLy8gUmVnZXggZm9yICFbIF0oICkgZm9ybWF0XG4gICAgICAgIGNvbnN0IGltYWdlX2xpbmVfcmVnZXhfMiA9IC8hXFxbKF4kfC4qKVxcXVxcKC4qKGpwZT9nfHBuZ3xnaWYpXFwpL1xuICAgICAgICAvLyBHZXQgdGhlIExpbmUgZWRpdGVkXG4gICAgICAgIGNvbnN0IGxpbmUgPSBjbS5saW5lSW5mbyhsaW5lX251bWJlcik7XG4gICAgICAgIFxuICAgICAgICBpZihsaW5lID09PSBudWxsKSByZXR1cm47XG5cbiAgICAgICAgLy8gQ3VycmVudCBMaW5lIENvbXBhcmlzb24gd2l0aCBSZWdleFxuICAgICAgICBjb25zdCBtYXRjaF8xID0gbGluZS50ZXh0Lm1hdGNoKGltYWdlX2xpbmVfcmVnZXhfMSk7XG4gICAgICAgIGNvbnN0IG1hdGNoXzIgPSBsaW5lLnRleHQubWF0Y2goaW1hZ2VfbGluZV9yZWdleF8yKTtcblxuICAgICAgICAvLyBDbGVhciB0aGUgd2lkZ2V0IGlmIGxpbmsgd2FzIHJlbW92ZWRcbiAgICAgICAgdmFyIGxpbmVfaW1hZ2Vfd2lkZ2V0ID0gbGluZS53aWRnZXRzID8gbGluZS53aWRnZXRzLmZpbHRlcigod2lkOiB7IGNsYXNzTmFtZTogc3RyaW5nOyB9KSA9PiB3aWQuY2xhc3NOYW1lID09PSAnb3otaW1hZ2Utd2lkZ2V0JykgOiBmYWxzZTtcbiAgICAgICAgaWYobGluZV9pbWFnZV93aWRnZXQgJiYgKCFtYXRjaF8xIHx8ICFtYXRjaF8yKSkgbGluZV9pbWFnZV93aWRnZXRbMF0uY2xlYXIoKTtcblxuICAgICAgICAvLyBJZiBhbnkgb2YgcmVnZXggbWF0Y2hlcywgaXQgd2lsbCBhZGQgaW1hZ2Ugd2lkZ2V0XG4gICAgICAgIGlmKG1hdGNoXzEgfHwgbWF0Y2hfMil7XG4gICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDbGVhciB0aGUgaW1hZ2Ugd2lkZ2V0cyBpZiBleGlzdHNcbiAgICAgICAgICAgIGlmIChsaW5lLndpZGdldHMpe1xuICAgICAgICAgICAgICAgIGZvcihjb25zdCB3aWQgb2YgbGluZS53aWRnZXRzKXtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHdpZC5jbGFzc05hbWUgPT09ICdvei1pbWFnZS13aWRnZXQnKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpZC5jbGVhcigpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEdldCB0aGUgZmlsZSBuYW1lIGFuZCBhbHQgdGV4dCBkZXBlbmRpbmcgb24gZm9ybWF0XG4gICAgICAgICAgICB2YXIgZmlsZW5hbWUgPSAnJztcbiAgICAgICAgICAgIHZhciBhbHQgPSAnJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYobWF0Y2hfMSl7XG4gICAgICAgICAgICAgICAgLy8gUmVnZXggZm9yIFtbbXlpbWFnZS5qcGd8I3gtc21hbGxdXSBmb3JtYXRcbiAgICAgICAgICAgICAgICBmaWxlbmFtZSA9IGdldEZpbGVOYW1lQW5kQWx0VGV4dCgxLCBtYXRjaF8xKS5maWxlTmFtZVxuICAgICAgICAgICAgICAgIGFsdCA9IGdldEZpbGVOYW1lQW5kQWx0VGV4dCgxLCBtYXRjaF8xKS5hbHRUZXh0XG4gICAgICAgICAgICB9IGVsc2UgaWYobWF0Y2hfMil7XG4gICAgICAgICAgICAgICAgLy8gUmVnZXggZm9yICFbI3gtc21hbGxdKG15aW1hZ2UuanBnKSBmb3JtYXRcbiAgICAgICAgICAgICAgICBmaWxlbmFtZSA9IGdldEZpbGVOYW1lQW5kQWx0VGV4dCgyLCBtYXRjaF8yKS5maWxlTmFtZVxuICAgICAgICAgICAgICAgIGFsdCA9IGdldEZpbGVOYW1lQW5kQWx0VGV4dCgyLCBtYXRjaF8yKS5hbHRUZXh0XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENyZWF0ZSBJbWFnZVxuICAgICAgICAgICAgY29uc3QgaW1nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG5cbiAgICAgICAgICAgIC8vIFByZXBhcmUgdGhlIHNyYyBmb3IgdGhlIEltYWdlXG4gICAgICAgICAgICBpZihmaWxlbmFtZV9pc19hX2xpbmsoZmlsZW5hbWUpKXtcbiAgICAgICAgICAgICAgICBpbWcuc3JjID0gZmlsZW5hbWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFNvdXJjZSBQYXRoXG4gICAgICAgICAgICAgICAgdmFyIHNvdXJjZVBhdGggPSAnJztcbiAgICAgICAgICAgICAgICBpZih0YXJnZXRGaWxlICE9IG51bGwpe1xuICAgICAgICAgICAgICAgICAgICBzb3VyY2VQYXRoID0gdGFyZ2V0RmlsZS5wYXRoO1xuICAgICAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgICAgICBsZXQgYWN0aXZlTm90ZUZpbGUgPSBnZXRBY3RpdmVOb3RlRmlsZSh0aGlzLmFwcC53b3Jrc3BhY2UpO1xuICAgICAgICAgICAgICAgICAgICBzb3VyY2VQYXRoID0gYWN0aXZlTm90ZUZpbGUgPyBhY3RpdmVOb3RlRmlsZS5wYXRoIDogJyc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBpbWFnZSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0Rmlyc3RMaW5rcGF0aERlc3QoZGVjb2RlVVJJQ29tcG9uZW50KGZpbGVuYW1lKSwgc291cmNlUGF0aCk7XG4gICAgICAgICAgICAgICAgaWYoaW1hZ2UgIT0gbnVsbCkgaW1nLnNyYyA9IGdldFBhdGhPZkltYWdlKHRoaXMuYXBwLnZhdWx0LCBpbWFnZSlcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSW1hZ2UgUHJvcGVydGllc1xuICAgICAgICAgICAgaW1nLmFsdCA9IGFsdDtcbiAgICAgICAgICAgIGltZy5zdHlsZS5tYXhXaWR0aCA9ICcxMDAlJztcbiAgICAgICAgICAgIGltZy5zdHlsZS5oZWlnaHQgPSAnYXV0byc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFkZCBJbWFnZSB3aWRnZXQgdW5kZXIgdGhlIEltYWdlIE1hcmtkb3duXG4gICAgICAgICAgICBjbS5hZGRMaW5lV2lkZ2V0KGxpbmVfbnVtYmVyLCBpbWcsIHtjbGFzc05hbWU6ICdvei1pbWFnZS13aWRnZXQnfSk7ICAgICAgICAgICAgXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDaGVjayBBbGwgTGluZXMgRnVuY3Rpb25cbiAgICBjaGVja19saW5lczogYW55ID0gKGNtOiBDb2RlTWlycm9yLkVkaXRvcikgPT4ge1xuICAgICAgICAvLyBMYXN0IFVzZWQgTGluZSBOdW1iZXIgaW4gQ29kZSBNaXJyb3JcbiAgICAgICAgdmFyIGxhc3RMaW5lID0gY20ubGFzdExpbmUoKTtcbiAgICAgICAgdmFyIGZpbGUgPSBnZXRGaWxlQ21CZWxvbmdzVG8oY20sIHRoaXMuYXBwLndvcmtzcGFjZSk7XG4gICAgICAgIGZvcihsZXQgaT0wOyBpIDw9IGxhc3RMaW5lOyBpKyspe1xuICAgICAgICAgICAgdGhpcy5jaGVja19saW5lKGNtLCBpLCBmaWxlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIEhhbmRsZSBmaWxlIGFmdGVyIGZpbGUtb3BlbiBldmVudFxuICAgIGhhbmRsZUZpbGVPcGVuID0gKHRhcmdldEZpbGU6IFRGaWxlKTogdm9pZCA9PiB7XG4gICAgICAgIC8vIElmIGFueSBmaWxlIGZpcmVkLCBpdGVyYXRlZCBDb2RlTWlycm9yc1xuICAgICAgICB0aGlzLmFwcC53b3Jrc3BhY2UuaXRlcmF0ZUNvZGVNaXJyb3JzKCAoY20pID0+IHtcbiAgICAgICAgICAgIHRoaXMuY2hlY2tfbGluZXMoY20pO1xuICAgICAgICB9KVxuICAgIH1cbn0iXSwibmFtZXMiOlsiUGx1Z2luIiwiTm90aWNlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFFQTtBQUNBLE1BQU0sV0FBVyxHQUFHLENBQUMsRUFBcUI7SUFFdEMsSUFBSSxRQUFRLEdBQUcsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBRTdCLEtBQUksSUFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxRQUFRLEVBQUUsQ0FBQyxFQUFFLEVBQUM7O1FBRzVCLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7O1FBRzVCLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBQztZQUNiLEtBQUksTUFBTSxHQUFHLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBQztnQkFDMUIsSUFBSSxHQUFHLENBQUMsU0FBUyxLQUFLLGlCQUFpQixFQUFDO29CQUNwQyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUE7aUJBQ2Q7YUFDSjtTQUNKO0tBRUo7QUFDTCxDQUFDLENBQUE7QUFFRDtBQUNBLE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxR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
