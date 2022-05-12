import { Plugin, TAbstractFile, TFile, loadMermaid, loadMathJax, Platform } from 'obsidian';
import { checkLine, checkLines } from './cm5/checkLine';
import { OzanImagePluginSettingsTab } from './settings';
import { WYSIWYG_Style } from './cm5/constants';
import { OzanImagePluginSettings, DEFAULT_SETTINGS } from './settings';
import * as ObsidianHelpers from 'src/util/obsidianHelper';
import * as ImageHandler from 'src/util/imageHandler';
import * as WidgetHandler from 'src/cm5/widgetHandler';
import { isAnExcalidrawFile, excalidrawPluginIsLoaded } from 'src/util/excalidrawHandler';
import { buildExtension } from 'src/cm6';
import { getFileCmBelongsTo } from 'src/cm5/cm5Helper';
import { format } from 'path';

export default class OzanImagePlugin extends Plugin {
    settings: OzanImagePluginSettings;
    loadedStyles: Array<HTMLStyleElement>;
    imagePromiseList: Array<string> = [];

    async onload() {
        console.log('Image in Editor Plugin is loaded 1');

        this.addSettingTab(new OzanImagePluginSettingsTab(this.app, this));

        await this.loadSettings();

        try {
            loadMathJax();
            loadMermaid();
        } catch (err) {
            console.log(err);
        }

        // --> New Editor (CM6)
        if (this.settings.cm6RenderAll) {
            const extension = buildExtension({ plugin: this });
            this.registerEditorExtension(extension);
        }

        // --> Legacy Editor (CM5) - Events only to be loaded on Desktop
        if (!Platform.isMobile) {
            this.addCommand({
                id: 'toggle-render-all',
                name: 'Legacy Editor: Toggle Render All',
                callback: () => {
                    this.handleToggleRenderAll(!this.settings.renderAll);
                    this.settings.renderAll = !this.settings.renderAll;
                    this.saveSettings();
                },
            });

            this.addCommand({
                id: 'toggle-WYSIWYG',
                name: 'Legacy Editor: Toggle WYSIWYG',
                callback: () => {
                    this.handleWYSIWYG(!this.settings.WYSIWYG);
                    this.settings.WYSIWYG = !this.settings.WYSIWYG;
                    this.saveSettings();
                },
            });

            this.addCommand({
                id: 'toggle-render-pdf',
                name: 'Legacy Editor: Toggle Render PDF',
                callback: () => {
                    this.settings.renderPDF = !this.settings.renderPDF;
                    this.app.workspace.iterateCodeMirrors((cm) => {
                        this.handleInitialLoad(cm);
                    });
                    this.saveSettings();
                },
            });

            this.addCommand({
                id: 'toggle-render-iframe',
                name: 'Legacy Editor: Toggle Render Iframe',
                callback: () => {
                    this.settings.renderIframe = !this.settings.renderIframe;
                    this.app.workspace.iterateCodeMirrors((cm) => {
                        this.handleInitialLoad(cm);
                    });
                    this.saveSettings();
                },
            });

            this.addCommand({
                id: 'toggle-refresh-images-after-changes',
                name: 'Legacy Editor: Toggle Refresh Images After Changes',
                callback: () => {
                    this.handleRefreshImages(!this.settings.refreshImagesAfterChange);
                    this.settings.refreshImagesAfterChange = !this.settings.refreshImagesAfterChange;
                    this.saveSettings();
                },
            });

            document.on('contextmenu', `div.CodeMirror-linewidget.oz-image-widget > img[data-path]`, this.onImageMenu, false);

            document.on('click', `.oz-obsidian-inner-link`, this.onClickTransclusionLink);

            if (this.settings.previewOnHoverInternalLink) {
                document.on('mouseover', '.oz-obsidian-inner-link', this.filePreviewOnHover);
            }

            if (this.settings.WYSIWYG) this.load_WYSIWYG_Styles();
            this.registerCodeMirror((cm: CodeMirror.Editor) => {
                debugger
                cm.on('change', this.codemirrorLineChanges);
                console.log('..................')
                this.handleInitialLoad(cm);
            });
            if (!this.settings.renderAll) return;
            if (!this.settings.refreshImagesAfterChange) return;
            this.app.vault.on('modify', this.handleFileModify);
        }

        this.registerMarkdownPostProcessor((element, context) => {
            console.log('-------------')
            const embeds = element.querySelectorAll("div.internal-embed");
    
            for (let index = 0; index < embeds.length; index++) {
                const embed = embeds.item(index);
                console.log(embed);
                const src = embed.getAttr('src');
                if(src) {
                    if (src.startsWith('.attachments/')) {
                        embed.className = "internal-embed image-embed is-loaded";
                        const image = element.createEl('img');
                        // this.app.vault.getResourcePath(this.app.vault.getAbstractFileByPath(context.sourcePath)[0])
                        console.log("getAbstractFileByPath", this.app.vault.getAbstractFileByPath(context.sourcePath).path);
                        image.src = 'file:///Users/jasonsjiang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/CS/Linux/' + src;
                        // embed.innerHTML = '';
                        embed.appendChild(image);
                    }
                }
            // const codeblock = codeblocks.item(index);
            // const text = codeblock.innerText.trim();
            // const isEmoji = text[0] === ":" && text[text.length - 1] === ":";
    
            // if (isEmoji) {
            //     context.addChild(new Emoji(codeblock, text));
            // }
            }
        });
    }

    onunload() {
        // Unload CM5 Handlers
        if (!Platform.isMobile) {
            this.app.workspace.iterateCodeMirrors((cm) => {
                cm.off('change', this.codemirrorLineChanges);
                WidgetHandler.clearAllWidgets(cm);
            });
            this.app.vault.off('modify', this.handleFileModify);
            document.off('contextmenu', `div.CodeMirror-linewidget.oz-image-widget > img[data-path]`, this.onImageMenu, false);
            document.off('click', `.oz-obsidian-inner-link`, this.onClickTransclusionLink);
            document.off('mouseover', '.oz-obsidian-inner-link', this.filePreviewOnHover);
            this.unload_WYSIWYG_Styles();
        }
        console.log('Image in Editor Plugin is unloaded');
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    // Context Menu for Rendered Images
    onImageMenu = (event: MouseEvent, target: HTMLElement) => {
        const file = this.app.vault.getAbstractFileByPath(target.dataset.path);
        if (!(file instanceof TFile)) return;
        event.preventDefault();
        event.stopPropagation();
        ImageHandler.addContextMenu(event, this, file);
        return false;
    };

    onClickTransclusionLink = (event: MouseEvent, target: HTMLElement) => {
        event.preventDefault();
        event.stopPropagation();
        ObsidianHelpers.openInternalLink(event, target.getAttr('href'), this.app);
    };

    filePreviewOnHover = (event: MouseEvent, target: HTMLElement) => {
        this.app.workspace.trigger('link-hover', {}, event.target, target.getAttr('href'), target.getAttr('href'));
    };

    // Line Edit Changes
    codemirrorLineChanges = (cm: any, change: any) => {
        checkLines(cm, change.from.line, change.from.line + change.text.length - 1, this);
    };

    // Only Triggered during initial Load
    handleInitialLoad = (cm: CodeMirror.Editor) => {
        debugger
        var lastLine = cm.lastLine();
        var file = getFileCmBelongsTo(cm, this.app.workspace);
        console.log(">>>>>>", file);
        
        for (let i = 0; i < lastLine + 1; i++) {
            checkLine(cm, i, file, this);
        }
    };

    // Handle Toggle for renderAll
    handleToggleRenderAll = (newRenderAll: boolean) => {
        if (newRenderAll) {
            this.registerCodeMirror((cm: CodeMirror.Editor) => {
                cm.on('change', this.codemirrorLineChanges);
                this.handleInitialLoad(cm);
            });
            if (this.settings.refreshImagesAfterChange) this.app.vault.on('modify', this.handleFileModify);
        } else {
            this.app.workspace.iterateCodeMirrors((cm) => {
                cm.off('change', this.codemirrorLineChanges);
                WidgetHandler.clearAllWidgets(cm);
            });
            this.app.vault.off('modify', this.handleFileModify);
        }
    };

    // Handle Transclusion Setting Off
    handleTransclusionSetting = (newSetting: boolean) => {
        this.app.workspace.iterateCodeMirrors((cm) => {
            if (!newSetting) {
                for (let i = 0; i <= cm.lastLine(); i++) {
                    let line = cm.lineInfo(i);
                    WidgetHandler.clearTransclusionWidgets(line);
                }
            } else {
                checkLines(cm, 0, cm.lastLine(), this);
            }
        });
    };

    // Handle Toggle for Refresh Images Settings
    handleRefreshImages = (newRefreshImages: boolean) => {
        if (newRefreshImages) {
            this.app.vault.on('modify', this.handleFileModify);
        } else {
            this.app.vault.off('modify', this.handleFileModify);
        }
    };

    // Handle File Changes to Refhres Images
    handleFileModify = (file: TAbstractFile) => {
        if (!(file instanceof TFile)) return;
        if (ImageHandler.pathIsAnImage(file.path) || (excalidrawPluginIsLoaded(this.app) && isAnExcalidrawFile(file))) {
            this.app.workspace.iterateCodeMirrors((cm) => {
                var lastLine = cm.lastLine();
                checkLines(cm, 0, lastLine, this, file.path);
            });
        }
    };

    // Handle WYSIWYG Toggle
    handleWYSIWYG = (newWYSIWYG: boolean) => {
        if (newWYSIWYG) {
            this.load_WYSIWYG_Styles();
        } else {
            this.unload_WYSIWYG_Styles();
        }
    };

    load_WYSIWYG_Styles = () => {
        this.loadedStyles = Array<HTMLStyleElement>(0);
        var style = document.createElement('style');
        style.innerHTML = WYSIWYG_Style;
        document.head.appendChild(style);
        this.loadedStyles.push(style);
    };

    unload_WYSIWYG_Styles = () => {
        if (!this.loadedStyles || typeof this.loadedStyles[Symbol.iterator] !== 'function') return;
        for (let style of this.loadedStyles) {
            document.head.removeChild(style);
        }
        this.loadedStyles = Array<HTMLStyleElement>(0);
    };

    addToImagePromiseList = (path: string) => {
        if (!this.imagePromiseList.contains(path)) {
            this.imagePromiseList.push(path);
        }
    };

    removeFromImagePromiseList = (path: string) => {
        if (this.imagePromiseList.contains(path)) {
            this.imagePromiseList = this.imagePromiseList.filter((crPath) => crPath !== path);
        }
    };
}
