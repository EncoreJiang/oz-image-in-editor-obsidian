import OzanImagePlugin from 'src/main';
import { debounce, editorLivePreviewField, editorViewField, normalizePath, TFile } from 'obsidian';
import { EditorState, Text } from '@codemirror/state';
import { RangeSetBuilder } from '@codemirror/rangeset';
import { Decoration, DecorationSet, EditorView } from '@codemirror/view';
import { createPNGFromExcalidrawFile } from 'src/util/excalidrawHandler';
import * as TransclusionHandler from 'src/util/transclusionHandler';
import * as ObsidianHelpers from 'src/util/obsidianHelper';
import { ImageDecoration, PDFDecoration, CustomHTMLDecoration, TransclusionDecoration, ImageWidget } from 'src/cm6/widget';
import { detectLink, transclusionTypes } from 'src/cm6/linkDetector';
import { getLinesToCheckForRender } from 'src/cm6/cm6Helper';
import { nextTick } from 'process';
import * as path from 'path';

// import { statefulDecorations } from 'src/cm6/stateField';

export class StatefulDecorationSet {
    editor: EditorView;
    decoCache: { [cls: string]: Decoration } = {};

    constructor(editor: EditorView) {
        this.editor = editor;
    }

    debouncedUpdate = debounce(this.updateAsyncDecorations, 50, true);

    updateAsyncDecorations(params: { view?: EditorView; state?: EditorState; newDoc: Text; plugin: OzanImagePlugin }): DecorationSet {
        const { view, state, newDoc, plugin } = params;
        const lineNrs = getLinesToCheckForRender(state ? state : view.state, newDoc);
        console.log(lineNrs);
        if (lineNrs.length > 0) {
            const decos = this.getDecorationsForLines({ lineNrs, view, newDoc, plugin });
            return decos;
            // console.log("decos:", decos, this.editor.state.field(statefulDecorations.field).size);
            // if (decos || this.editor.state.field(statefulDecorations.field).size) {
            //     view.dispatch({ effects: statefulDecorations.update.of(decos || Decoration.none) });
            // }
        }
        return Decoration.set([]);
    }

    getDecorationsForLines(params: { lineNrs: number[]; view: EditorView; newDoc: Text; plugin: OzanImagePlugin }) {
        const { newDoc, view, lineNrs, plugin } = params;

        let rangeBuilder = new RangeSetBuilder<Decoration>();

  let widgets = []

        // --> Get Source File
        const mdView = view.state.field(editorViewField);
        const sourceFile: TFile = mdView.file;

        if (view.state.field(editorLivePreviewField)) {
            const element = mdView.contentEl

            nextTick(() => {

                const embeds = element.querySelectorAll("div.internal-embed");
                console.log("-------------", element.innerHTML)
        
                for (let index = 0; index < embeds.length; index++) {
                    const embed = embeds.item(index);
                    console.log(embed);
                    const src = embed.getAttr('src');
                    if(src) {
                        if (src.startsWith('.attachments/')) {
                            embed.className = "internal-embed image-embed is-loaded";
                            const image = element.createEl('img');
                            // this.app.vault.getResourcePath(this.app.vault.getAbstractFileByPath(context.sourcePath)[0])
                            const href = window.require("url").pathToFileURL(
                                path.join((plugin.app.vault.adapter as any)['basePath'], sourceFile.parent.path, src)).href;
                            console.log("getAbstractFileByPath", href);
                            image.src =  "app://local/" + href.replace("file:///", "");
                            embed.innerHTML = '';
                            embed.appendChild(image);
                            // image.addEventListener("click", (event) => {event.stopPropagation(); }), true;
                        }
                    }
                // const codeblock = codeblocks.item(index);
                // const text = codeblock.innerText.trim();
                // const isEmoji = text[0] === ":" && text[text.length - 1] === ":";
        
                // if (isEmoji) {
                //     context.addChild(new Emoji(codeblock, text));
                // }
                }
            })
        }

        return Decoration.set([]);

        // --> Loop Through Lines Found
        if (lineNrs.length > 0) {
            for (const lineNr of lineNrs) {
                const line = newDoc.line(lineNr);
                console.log('line:', line)
                let newDeco: Decoration = null;

                // --> Look at Link Result
                const linkResult = detectLink({ lineText: line.text, plugin: plugin, sourceFile: sourceFile });

                // console.log("linkResult:", linkResult);
                // --> External Link Render
                if (linkResult && linkResult.type === 'external-image' && plugin.settings.renderImages) {
                    const key = linkResult.linkText + linkResult.altText;
                    newDeco = this.decoCache[key];
                    if (!newDeco) {
                        newDeco = this.decoCache[key] = ImageDecoration({
                            url: linkResult.linkText,
                            altText: linkResult.altText,
                            filePath: linkResult.linkText,
                        });
                    }
                }

                // --> Attachments Image Render
                else if (linkResult && linkResult.type === 'attachment-image' && plugin.settings.renderImages) {
                    const key = linkResult.linkText + linkResult.altText;
                    newDeco = this.decoCache[key];
                    let imagePath = 'file:///Users/jasonsjiang/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/CS/' + sourceFile.parent.path + '/' + linkResult.linkText;
                    console.log('imagePath:', imagePath);
                    if (!newDeco) {
                        newDeco = this.decoCache[key] = ImageDecoration({ url: imagePath, altText: linkResult.altText, filePath: imagePath });

                    }

                    widgets.push(Decoration.replace({
                        widget: new ImageWidget({
                        url: imagePath,
                        altText: linkResult.altText,
                        filePath: imagePath,
                    }),
                    side: 1}).range(line.from, line.to));

                }

                // --> Vault Image Render
                else if (linkResult && linkResult.type === 'vault-image' && plugin.settings.renderImages) {
                    const key = linkResult.file.path + linkResult.altText;
                    newDeco = this.decoCache[key];
                    if (!newDeco) {
                        let imagePath = ObsidianHelpers.getPathOfImage(plugin.app.vault, linkResult.file);
                        newDeco = this.decoCache[key] = ImageDecoration({ url: imagePath, altText: linkResult.altText, filePath: linkResult.file.path });
                    }
                }

                // // --> Excalidraw Drawing
                // else if (linkResult && linkResult.type === 'excalidraw' && plugin.settings.renderExcalidraw) {
                //     const key = linkResult.file.path + linkResult.altText;
                //     newDeco = this.decoCache[key];
                //     if (!newDeco) {
                //         let excalidrawImage = await createPNGFromExcalidrawFile(linkResult.file);
                //         newDeco = this.decoCache[key] = ImageDecoration({
                //             url: URL.createObjectURL(excalidrawImage),
                //             altText: linkResult.altText,
                //             filePath: linkResult.file.path,
                //         });
                //     }
                // }

                // // --> External PDF Link Render
                // else if (linkResult && linkResult.type === 'pdf-link' && plugin.settings.renderPDF) {
                //     const key = linkResult.linkText + linkResult.blockRef;
                //     newDeco = this.decoCache[key];
                //     if (!newDeco) {
                //         newDeco = this.decoCache[key] = PDFDecoration({ url: key, filePath: key });
                //     }
                // }

                // // --> Internal PDF File
                // else if (linkResult && linkResult.type === 'pdf-file' && plugin.settings.renderPDF) {
                //     const key = linkResult.file.path + linkResult.blockRef;
                //     newDeco = this.decoCache[key];
                //     if (!newDeco) {
                //         const buffer = await plugin.app.vault.adapter.readBinary(normalizePath(linkResult.file.path));
                //         const arr = new Uint8Array(buffer);
                //         const blob = new Blob([arr], { type: 'application/pdf' });
                //         newDeco = PDFDecoration({ url: URL.createObjectURL(blob) + linkResult.blockRef, filePath: linkResult.file.path });
                //     }
                // }

                // // --> Transclusion Render
                // else if (linkResult && transclusionTypes.contains(linkResult.type) && plugin.settings.renderTransclusion) {
                //     const key = linkResult.file.path + linkResult.blockRef + linkResult.file.stat.mtime;
                //     newDeco = this.decoCache[key];

                //     if (!newDeco) {
                //         let cache = plugin.app.metadataCache.getCache(linkResult.file.path);
                //         let cachedReadOfTarget = await plugin.app.vault.cachedRead(linkResult.file);

                //         // Block Id Transclusion
                //         if (linkResult.type === 'blockid-transclusion') {
                //             const blockId = linkResult.blockRef;
                //             cache = plugin.app.metadataCache.getCache(linkResult.file.path);
                //             if (cache.blocks && cache.blocks[blockId]) {
                //                 const block = cache.blocks[blockId];
                //                 if (block) {
                //                     let htmlDivElement = TransclusionHandler.renderBlockCache(block, cachedReadOfTarget);
                //                     TransclusionHandler.clearHTML(htmlDivElement, plugin);
                //                     newDeco = this.decoCache[key] = TransclusionDecoration({
                //                         htmlDivElement,
                //                         type: linkResult.type,
                //                         filePath: linkResult.file.path,
                //                         blockRef: linkResult.blockRef,
                //                     });
                //                 }
                //             }
                //         }

                //         // Header Transclusion
                //         else if (linkResult.type === 'header-transclusion') {
                //             const blockHeading = cache.headings?.find(
                //                 (h: any) =>
                //                     ObsidianHelpers.clearSpecialCharacters(h.heading) === ObsidianHelpers.clearSpecialCharacters(linkResult.blockRef)
                //             );
                //             if (blockHeading) {
                //                 // --> Start Num
                //                 let startNum = blockHeading.position.start.offset;
                //                 // --> End Num
                //                 const blockHeadingIndex = cache.headings.indexOf(blockHeading);
                //                 let endNum = cachedReadOfTarget.length;
                //                 for (let h of cache.headings.slice(blockHeadingIndex + 1)) {
                //                     if (h.level <= blockHeading.level) {
                //                         endNum = h.position.start.offset;
                //                         break;
                //                     }
                //                 }
                //                 // --> Get HTML Render and add as Widget
                //                 let htmlDivElement = TransclusionHandler.renderHeader(startNum, endNum, cachedReadOfTarget);
                //                 TransclusionHandler.clearHTML(htmlDivElement, plugin);
                //                 newDeco = this.decoCache[key] = TransclusionDecoration({
                //                     htmlDivElement,
                //                     type: linkResult.type,
                //                     filePath: linkResult.file.path,
                //                     blockRef: linkResult.blockRef,
                //                 });
                //             }
                //         }

                //         // File Transclusion
                //         else if (linkResult.type === 'file-transclusion') {
                //             if (cachedReadOfTarget !== '') {
                //                 let htmlDivElement = document.createElement('div');
                //                 htmlDivElement.innerHTML = TransclusionHandler.convertMdToHtml(cachedReadOfTarget);
                //                 TransclusionHandler.clearHTML(htmlDivElement, plugin);
                //                 newDeco = this.decoCache[key] = TransclusionDecoration({
                //                     htmlDivElement,
                //                     type: linkResult.type,
                //                     filePath: linkResult.file.path,
                //                     blockRef: linkResult.blockRef,
                //                 });
                //             }
                //         }
                //     }
                // }

                // // --> Iframe Render
                // else if (linkResult && linkResult.type === 'iframe' && plugin.settings.renderIframe) {
                //     newDeco = CustomHTMLDecoration({ htmlText: linkResult.match });
                // }

                // if (newDeco !== null) {
                //     rangeBuilder.add(line.to, line.to, newDeco);
                //     console.log("rangeBuilder.add", line.to, line.to, newDeco)
                // }

            }
        }
        console.log("widgets:", widgets)
        return Decoration.set(widgets);
        return rangeBuilder.finish();
    }
}
