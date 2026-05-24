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
let isDarkTheme = true;
let isSplitView = true;

const THEME_DARK = 'diffy-dark';
const THEME_LIGHT = 'diffy-light';

function syncEditorPadding() {
    if (!diffEditor) return;

    const toolbar = document.getElementById('toolbar');
    const toolbarOffset = toolbar ? toolbar.offsetTop + toolbar.offsetHeight + 40 : 120;

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
            'diffEditor.insertedTextBackground': '#22A35A26',
            'diffEditor.removedTextBackground': '#D932322B',
            'diffEditor.insertedLineBackground': '#22A35A16',
            'diffEditor.removedLineBackground': '#D932321B',
            'diffEditor.border': '#17203314',
            'diffEditor.diagonalFill': '#17203310'
        }
    });
}

require(['vs/editor/editor.main'], function() {
    defineDiffyThemes();

    // 1. Initial default content to show the user how it works
    const defaultOriginal = `function calculateTotal(items) {
    let total = 0;
    for(let i = 0; i < items.length; i++) {
        total += items[i].price;
    }
    return total;
}`;

    const defaultModified = `function calculateTotal(items) {
    return items.reduce((total, item) => total + item.price, 0);
}`;

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
    
    const originalModel = monaco.editor.createModel(isDevMode ? defaultOriginal : '', 'javascript');
    const modifiedModel = monaco.editor.createModel(isDevMode ? defaultModified : '', 'javascript');
    
    diffEditor.setModel({
        original: originalModel,
        modified: modifiedModel
    });

    // 4. Connect UI Controls
    const toggleViewBtn = document.getElementById('toggle-view-btn');
    const toggleViewSpan = toggleViewBtn.querySelector('span');
    
    toggleViewBtn.addEventListener('click', () => {
        isSplitView = !isSplitView;
        diffEditor.updateOptions({ renderSideBySide: isSplitView });
        toggleViewSpan.textContent = isSplitView ? 'Inline View' : 'Split View';
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

    switchBtn.addEventListener('click', () => {
        const temp = originalModel.getValue();
        originalModel.setValue(modifiedModel.getValue());
        modifiedModel.setValue(temp);
    });

    clearLeftBtn.addEventListener('click', () => {
        originalModel.setValue('');
    });

    clearRightBtn.addEventListener('click', () => {
        modifiedModel.setValue('');
    });

    clearAllBtn.addEventListener('click', () => {
        originalModel.setValue('');
        modifiedModel.setValue('');
    });
});
