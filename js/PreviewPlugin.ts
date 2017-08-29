import {Renderer} from './Renderer';
import {UnderscoreStatic} from "underscore";
import {PasteImage} from './PasteImage';
import Thenable = JQuery.Thenable;

declare const _: UnderscoreStatic;

declare const aceEditor: AceAjax.Editor;

type onPopstate = (this: Window, ev: PopStateEvent) => any;

export class PreviewPlugin {
    private renderer: Renderer;
    private Range: new (startRow: number, startColumn: number, endRow: number, endColumn: number) => AceAjax.Range;

    private initPromise: JQueryPromise<void> | null = null;
    private textEditorOnHashChange: onPopstate | null;
    private offsetMap: number[] = [];
    private session: AceAjax.IEditSession;
    private previewElement: JQuery;
    private scrollMode: 'editor' | 'preview' | null = null;

    init() {
        if (!this.initPromise) {
            const deferred = $.Deferred();
            require.ensure(['./Renderer'], () => {
                const {Renderer} = require('./Renderer');
                this.renderer = new Renderer();
                deferred.resolve();
            });
            this.initPromise = deferred.promise();
            if (!this.textEditorOnHashChange) {
                this.textEditorOnHashChange = window.onpopstate;
            }

            this.Range = window['ace'].require("ace/range").Range;

            aceEditor.$blockScrolling = Infinity;

            new PasteImage().listen(this.handleImage);
        }

        return this.initPromise;
    }

    initAceHooks() {
        if (this.session !== aceEditor.getSession()) {
            this.session = aceEditor.getSession();
            this.session.on("changeScrollTop", this.onScrollEditor);
        }
    }

    initPreviewHooks(element) {
        if (this.previewElement !== element) {
            this.previewElement = element;
            this.previewElement.scroll(this.onScrollPreview);
        }
    }

    onHashChange(e: PopStateEvent) {
        const hash = window.location.hash.substr(1);
        if (hash.substr(0, 6) !== 'editor' && this.textEditorOnHashChange) {
            this.textEditorOnHashChange.call(window, e)
        }
    }

    preview = _.throttle((text: string, element) => {
        this.initAceHooks();
        this.initPreviewHooks(element);
        window.onpopstate = this.onHashChange;
        const Range = this.Range;
        this.renderer.renderText(text, element).then(() => {
            element.find('input[type=checkbox]').change(function () {
                const checked = this.checked;
                const row = this.dataset.line;
                const session = aceEditor.getSession();
                const oldText = session.getLine(row);
                const newText = checked ?
                    oldText.replace('[ ]', '[x]') :
                    oldText.replace(/\[(x|X)\]/, '[ ]');
                session.replace(new Range(row, 0, row, Number.MAX_VALUE), newText);
            });
            setTimeout(() => {
                this.buildOffsetMap(element)
            }, 500);
        });
    }, 500);

    buildOffsetMap = _.throttle((element) => {
        const previewOffset = (element.offset() as { top: number }).top;
        const offsetMap: number[] = [];
        element.find('[data-line]').each(function () {
            offsetMap[parseInt(this.dataset.line, 10)] = ($(this).offset() as { top: number }).top - previewOffset;
        });
        this.offsetMap = offsetMap;
    }, 1000);

    onScrollEditor = _.throttle((top: number) => {
        if (this.scrollMode === 'preview') {
            return;
        }
        this.scrollMode = 'editor';
        const line = Math.floor(top / 15);
        const previewOffset = this.offsetMap.find((offset, index) => (typeof offset !== 'undefined') && index >= line);
        if (typeof previewOffset !== 'undefined') {
            $('#preview').scrollTop(previewOffset);
        }
        setTimeout(() => {
            this.scrollMode = null;
        }, 100);
    }, 100);

    onScrollPreview = _.throttle(() => {
        if (this.scrollMode === 'editor') {
            return;
        }
        this.scrollMode = 'preview';
        const top = this.previewElement.scrollTop() as number;
        const previewLine = this.offsetMap.findIndex(offset => offset >= (top - 1));
        aceEditor.scrollToLine(previewLine, false, true, () => {
        });
        setTimeout(() => {
            this.scrollMode = null;
        }, 100);
    }, 100);

    handleImage = (image: HTMLImageElement, file) => {
        console.log(file);
        OC.dialogs.prompt('Enter the name for the image', 'Upload image', (ok, name) => {
            if (!ok) {
                return;
            }
            const blob = image.src;
            const cursorPos = aceEditor.getCursorPosition();
            const uploadText = `![uploading...](${blob})`;
            const finalText = `![${name}](${name})`;
            this.session.insert(cursorPos, uploadText);
            this.uploadImage(name, file).then(() => {
                this.session.replace(
                    new this.Range(cursorPos.row, cursorPos.column, cursorPos.row, cursorPos.column + uploadText.length),
                    finalText
                );
            });

        }, true, 'image name');
    };

    uploadImage(name: string, file: File): Thenable<void> {
        const path = `${this.getCurrentPath()}/${name}`.replace(/\/\/+/g, '/');
        const url = OC.linkToRemote('files' + path);
        const reader = new FileReader();
        const deferred = $.Deferred();
        reader.onloadend = (e) => {
            $.ajax({
                url: url,
                processData: false,
                data: reader.result,
                type: 'PUT',
                success: deferred.resolve.bind(deferred),
                error: deferred.reject.bind(deferred)
            });
        };
        reader.readAsArrayBuffer(file);
        return deferred.promise();
    }

    getCurrentPath() {
        if (OCA.Files_Texteditor.file && OCA.Files_Texteditor.file.dir) {
            return OCA.Files_Texteditor.file.dir;
        } else if (OCA.Files.App && OCA.Files.App.fileList._currentDirectory) {
            return OCA.Files.App.fileList._currentDirectory;
        }
    }
}