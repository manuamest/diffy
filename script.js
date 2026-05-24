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

function syncEditorPadding() {
    if (!diffEditor) return;

    const toolbar = document.getElementById('toolbar');
    const toolbarOffset = toolbar ? toolbar.offsetTop + toolbar.offsetHeight + 18 : 96;

    diffEditor.updateOptions({
        padding: { top: toolbarOffset }
    });
}

require(['vs/editor/editor.main'], function() {
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
        theme: isDarkTheme ? 'vs-dark' : 'vs',
        originalEditable: true, // Allow user to paste into the left side
        automaticLayout: true,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
        fontSize: 14,
        minimap: { enabled: true },
        padding: { top: 96 }
    });

    syncEditorPadding();
    window.addEventListener('resize', syncEditorPadding);

    if ('ResizeObserver' in window) {
        new ResizeObserver(syncEditorPadding).observe(document.getElementById('toolbar'));
    }

    // 3. Create the models for left (original) and right (modified) sides
    const originalModel = monaco.editor.createModel(defaultOriginal, 'javascript');
    const modifiedModel = monaco.editor.createModel(defaultModified, 'javascript');
    
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
        const newTheme = isDarkTheme ? 'vs-dark' : 'vs';
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
