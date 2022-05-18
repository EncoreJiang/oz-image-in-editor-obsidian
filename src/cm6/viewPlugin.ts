import { Extension } from '@codemirror/state';
import { DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import OzanImagePlugin from 'src/main';
import { StatefulDecorationSet } from 'src/cm6/decorations';
import { livePreviewActive } from 'src/util/obsidianHelper';

// --> View Plugin
export const getViewPlugin = (params: { plugin: OzanImagePlugin }): Extension => {
    const { plugin } = params;
    console.log("ViewPlugin.fromClass:", ViewPlugin.fromClass)
    const imageViewPlugin = ViewPlugin.fromClass(
        class {
            decoManager: StatefulDecorationSet;
            decorations: DecorationSet;

            constructor(view: EditorView) {
                this.decoManager = new StatefulDecorationSet(view);
                // if (!livePreviewActive(plugin.app)) {
                    const state = view.state;
                    this.decorations = this.decoManager.updateAsyncDecorations({ view, state, newDoc: state.doc, plugin });
                // }
            }

            update(update: ViewUpdate) {
                console.log(update.docChanged, update.viewportChanged, !livePreviewActive(plugin.app))
                if ((update.docChanged || update.viewportChanged)) {
                    const state = update.view.state;
                    this.decorations =  this.decoManager.updateAsyncDecorations({ view: update.view, plugin, newDoc: state.doc });
                }
            }

            destroy() {}
        }, {
            decorations: v => v.decorations
        }
    );

    return imageViewPlugin;
};
