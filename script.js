// Require configuration for Monaco Editor via CDN
require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' }});

// Ensure cross-domain web workers load correctly for syntax highlighting
window.MonacoEnvironment = {
    getWorkerUrl: function(workerId, label) {
        return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
            self.MonacoEnvironment = {
                baseUrl: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/'
            };
            importScripts('https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs/base/worker/workerMain.js');`
        )}`;
    }
};

let diffEditor;
let modifiedDiffDecorations;
let pasteScrollLock;
let pasteScrollSnapshot;
let isDarkTheme = true;
let isSplitView = true;
let isMinimapVisible = false;

const THEME_DARK = 'diffy-dark';
const THEME_LIGHT = 'diffy-light';

function syncEditorPadding() {
    if (!diffEditor) return;

    const toolbar = document.getElementById('toolbar');
    const toolbarOffset = toolbar ? toolbar.offsetTop + toolbar.offsetHeight + 40 : 120;

    document.documentElement.style.setProperty('--editor-content-offset', `${toolbarOffset}px`);

    diffEditor.updateOptions({
        padding: { top: toolbarOffset }
    });
}

function defineDiffyThemes() {
    monaco.editor.defineTheme(THEME_DARK, {
        base: 'vs-dark',
        inherit: true,
        rules: [
            { token: 'comment', foreground: '6F7A8D' },
            { token: 'keyword', foreground: '7FB7FF' },
            { token: 'string', foreground: '98DFAF' },
            { token: 'number', foreground: 'E8C07D' },
            { token: 'type', foreground: '8BD5FF' }
        ],
        colors: {
            'editor.background': '#10131A',
            'editor.foreground': '#D8DEE9',
            'editor.lineHighlightBackground': '#FFFFFF06',
            'editor.selectionBackground': '#4F80FF38',
            'editor.inactiveSelectionBackground': '#4F80FF20',
            'editorCursor.foreground': '#79C0FF',
            'editorLineNumber.foreground': '#465061',
            'editorLineNumber.activeForeground': '#9AA7BA',
            'editorGutter.background': '#10131A',
            'editorWhitespace.foreground': '#FFFFFF14',
            'scrollbarSlider.background': '#8B96A833',
            'scrollbarSlider.hoverBackground': '#8B96A852',
            'scrollbarSlider.activeBackground': '#8B96A875',
            'minimap.background': '#00000000',
            'minimapSlider.background': '#8B96A81F',
            'minimapSlider.hoverBackground': '#8B96A83D',
            'minimapSlider.activeBackground': '#8B96A85C',
            'editorOverviewRuler.addedForeground': '#2FD27AFF',
            'editorOverviewRuler.deletedForeground': '#FF6B6BFF',
            'editorOverviewRuler.modifiedForeground': '#7FB7FFFF',
            'diffEditorOverview.insertedForeground': '#2FD27AFF',
            'diffEditorOverview.removedForeground': '#FF6B6BFF',
            'diffEditor.insertedTextBackground': '#2FD27A2F',
            'diffEditor.removedTextBackground': '#FF6B6B33',
            'diffEditor.insertedLineBackground': '#1E9F5A20',
            'diffEditor.removedLineBackground': '#D84E4E24',
            'diffEditor.border': '#FFFFFF10',
            'diffEditor.diagonalFill': '#FFFFFF0B'
        }
    });

    monaco.editor.defineTheme(THEME_LIGHT, {
        base: 'vs',
        inherit: true,
        rules: [
            { token: 'comment', foreground: '718096' },
            { token: 'keyword', foreground: '0066B8' },
            { token: 'string', foreground: '167A3F' },
            { token: 'number', foreground: 'A16207' },
            { token: 'type', foreground: '087EA4' }
        ],
        colors: {
            'editor.background': '#F7FAFD',
            'editor.foreground': '#1F2937',
            'editor.lineHighlightBackground': '#0F172A06',
            'editor.selectionBackground': '#006FC936',
            'editor.inactiveSelectionBackground': '#006FC91F',
            'editorCursor.foreground': '#0070C9',
            'editorLineNumber.foreground': '#A0AEC0',
            'editorLineNumber.activeForeground': '#526070',
            'editorGutter.background': '#F7FAFD',
            'editorWhitespace.foreground': '#0F172A14',
            'scrollbarSlider.background': '#52607025',
            'scrollbarSlider.hoverBackground': '#5260703D',
            'scrollbarSlider.activeBackground': '#52607059',
            'minimap.background': '#00000000',
            'minimapSlider.background': '#5260701A',
            'minimapSlider.hoverBackground': '#52607033',
            'minimapSlider.activeBackground': '#5260704D',
            'editorOverviewRuler.addedForeground': '#22A35AFF',
            'editorOverviewRuler.deletedForeground': '#D93232FF',
            'editorOverviewRuler.modifiedForeground': '#0070C9FF',
            'diffEditorOverview.insertedForeground': '#22A35AFF',
            'diffEditorOverview.removedForeground': '#D93232FF',
            'diffEditor.insertedTextBackground': '#22A35A26',
            'diffEditor.removedTextBackground': '#D932322B',
            'diffEditor.insertedLineBackground': '#22A35A16',
            'diffEditor.removedLineBackground': '#D932321B',
            'diffEditor.border': '#17203314',
            'diffEditor.diagonalFill': '#17203310'
        }
    });
}

function updateMinimapVisibility(enabled) {
    const disabledMinimap = { enabled: false };
    const modifiedMinimap = {
        enabled,
        side: 'right',
        renderCharacters: false,
        size: 'proportional',
        showSlider: 'mouseover',
        maxColumn: 120,
        scale: 2
    };

    diffEditor.updateOptions({ minimap: disabledMinimap });
    diffEditor.getOriginalEditor().updateOptions({
        minimap: disabledMinimap,
        renderOverviewRuler: false
    });
    diffEditor.getModifiedEditor().updateOptions({
        minimap: enabled ? modifiedMinimap : disabledMinimap,
        renderOverviewRuler: enabled,
        overviewRulerBorder: false
    });

    updateDiffMapDecorations();
}

function updateDiffMapDecorations() {
    if (!modifiedDiffDecorations || !diffEditor) return;

    const changes = diffEditor.getLineChanges() || [];
    const decorations = isMinimapVisible ? changes.map((change) => {
        const isDeletion = change.modifiedEndLineNumber === 0;
        const startLine = Math.max(1, change.modifiedStartLineNumber || change.modifiedEndLineNumber || 1);
        const endLine = Math.max(startLine, change.modifiedEndLineNumber || startLine);
        const color = isDeletion ? '#FF6B6BFF' : '#2FD27AFF';

        return {
            range: new monaco.Range(startLine, 1, endLine, 1),
            options: {
                isWholeLine: true,
                minimap: {
                    color,
                    position: monaco.editor.MinimapPosition.Inline
                },
                overviewRuler: {
                    color,
                    position: monaco.editor.OverviewRulerLane.Right
                }
            }
        };
    }) : [];

    modifiedDiffDecorations.set(decorations);
}

function getEditorScrollSnapshot() {
    return [diffEditor.getOriginalEditor(), diffEditor.getModifiedEditor()].map((editor) => ({
        editor,
        scrollTop: editor.getScrollTop(),
        scrollLeft: editor.getScrollLeft()
    }));
}

function restoreEditorScrollSnapshot(snapshot) {
    snapshot.forEach(({ editor, scrollTop, scrollLeft }) => {
        editor.setScrollPosition({ scrollTop, scrollLeft });
    });
}

function preserveScrollAroundPaste() {
    window.clearTimeout(pasteScrollLock);

    pasteScrollSnapshot = getEditorScrollSnapshot();
    const restore = () => restoreEditorScrollSnapshot(pasteScrollSnapshot);
    const restoreWhileLocked = () => {
        if (pasteScrollLock && pasteScrollSnapshot) restore();
    };

    pasteScrollLock = window.setTimeout(() => {
        restore();
        pasteScrollLock = null;
        pasteScrollSnapshot = null;
    }, 900);

    requestAnimationFrame(() => {
        restore();
        requestAnimationFrame(restore);
    });

    [0, 25, 50, 100, 180, 300, 500, 700].forEach((delay) => {
        window.setTimeout(restoreWhileLocked, delay);
    });
}

function setupPasteScrollPreservation() {
    [diffEditor.getOriginalEditor(), diffEditor.getModifiedEditor()].forEach((editor) => {
        const node = editor.getDomNode();

        if (node) {
            node.addEventListener('paste', preserveScrollAroundPaste, true);
        }

        editor.onDidScrollChange(() => {
            if (pasteScrollLock && pasteScrollSnapshot) {
                restoreEditorScrollSnapshot(pasteScrollSnapshot);
            }
        });
    });
}

require(['vs/editor/editor.main'], function() {
    defineDiffyThemes();

    // 1. Initial default content is loaded from window.DEMO_ORIGINAL / window.DEMO_MODIFIED (defined in demo.js)

    // 2. Initialize the Diff Editor
    diffEditor = monaco.editor.createDiffEditor(document.getElementById('editor-container'), {
        enableSplitViewResizing: true,
        renderSideBySide: isSplitView,
        theme: isDarkTheme ? THEME_DARK : THEME_LIGHT,
        originalEditable: true, // Allow user to paste into the left side
        automaticLayout: true,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
        fontSize: 14,
        lineHeight: 22,
        minimap: { enabled: false },
        renderOverviewRuler: false,
        overviewRulerBorder: false,
        hideUnchangedRegions: { enabled: false },
        renderLineHighlight: 'gutter',
        scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
            useShadows: false
        },
        padding: { top: 96 }
    });

    syncEditorPadding();
    
    let resizeFrame;
    const throttledSync = () => {
        if (resizeFrame) cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(syncEditorPadding);
    };

    window.addEventListener('resize', throttledSync);

    if ('ResizeObserver' in window) {
        new ResizeObserver(throttledSync).observe(document.getElementById('toolbar'));
    }

    // 3. Create the models for left (original) and right (modified) sides
    // Only load example code if DEV_MODE is true in the local env.js file
    const isDevMode = typeof window !== 'undefined' && window.ENV && window.ENV.DEV_MODE === true;
    const defaultOriginal = (typeof window !== 'undefined' && window.DEMO_ORIGINAL) || '';
    const defaultModified = (typeof window !== 'undefined' && window.DEMO_MODIFIED) || '';
    
    const originalModel = monaco.editor.createModel(isDevMode ? defaultOriginal : '', 'javascript');
    const modifiedModel = monaco.editor.createModel(isDevMode ? defaultModified : '', 'javascript');
    
    diffEditor.setModel({
        original: originalModel,
        modified: modifiedModel
    });

    modifiedDiffDecorations = diffEditor.getModifiedEditor().createDecorationsCollection();
    diffEditor.onDidUpdateDiff(updateDiffMapDecorations);
    setupPasteScrollPreservation();

    // 4. Connect UI Controls
    const toggleViewBtn = document.getElementById('toggle-view-btn');
    const toggleViewSpan = toggleViewBtn.querySelector('span');
    const toggleMinimapBtn = document.getElementById('toggle-minimap-btn');
    const toggleMinimapSpan = toggleMinimapBtn.querySelector('span');
    
    toggleViewBtn.addEventListener('click', () => {
        isSplitView = !isSplitView;
        diffEditor.updateOptions({ renderSideBySide: isSplitView });
        toggleViewSpan.textContent = isSplitView ? 'Inline View' : 'Split View';
    });

    toggleMinimapBtn.addEventListener('click', () => {
        isMinimapVisible = !isMinimapVisible;
        updateMinimapVisibility(isMinimapVisible);
        toggleMinimapBtn.setAttribute('aria-pressed', String(isMinimapVisible));
        toggleMinimapSpan.textContent = isMinimapVisible ? 'Minimap On' : 'Minimap Off';
    });

    const toggleThemeBtn = document.getElementById('toggle-theme-btn');
    const toggleThemeSpan = toggleThemeBtn.querySelector('span');
    const body = document.body;

    toggleThemeBtn.addEventListener('click', () => {
        isDarkTheme = !isDarkTheme;
        const newTheme = isDarkTheme ? THEME_DARK : THEME_LIGHT;
        monaco.editor.setTheme(newTheme);
        
        if (isDarkTheme) {
            body.classList.remove('light-mode');
            toggleThemeSpan.textContent = 'Light Mode';
        } else {
            body.classList.add('light-mode');
            toggleThemeSpan.textContent = 'Dark Mode';
        }
    });

    // 5. Connect new Actions (Clear and Switch)
    const switchBtn = document.getElementById('switch-btn');
    const clearLeftBtn = document.getElementById('clear-left-btn');
    const clearRightBtn = document.getElementById('clear-right-btn');
    const clearAllBtn = document.getElementById('clear-all-btn');

    // Helper function to apply edits while preserving the undo stack (Ctrl+Z)
    function applyUndoableEdit(model, newText) {
        model.pushEditOperations(
            [],
            [{
                range: model.getFullModelRange(),
                text: newText
            }],
            () => null
        );
    }

    switchBtn.addEventListener('click', () => {
        const temp = originalModel.getValue();
        applyUndoableEdit(originalModel, modifiedModel.getValue());
        applyUndoableEdit(modifiedModel, temp);
    });

    clearLeftBtn.addEventListener('click', () => {
        applyUndoableEdit(originalModel, '');
    });

    clearRightBtn.addEventListener('click', () => {
        applyUndoableEdit(modifiedModel, '');
    });

    clearAllBtn.addEventListener('click', () => {
        applyUndoableEdit(originalModel, '');
        applyUndoableEdit(modifiedModel, '');
    });
});
