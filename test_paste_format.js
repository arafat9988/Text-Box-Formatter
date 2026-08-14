const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><div><p>Paragraph 1</p><p>Paragraph 2</p></div>');
const doc = dom.window.document;

function processNode(node) {
    if (node.nodeType === 3) return node.textContent || '';
    if (node.nodeType === 1) {
        let childText = '';
        node.childNodes.forEach(child => {
            childText += processNode(child);
        });
        if (['p', 'div', 'tr', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'td', 'th', 'br'].includes(node.tagName.toLowerCase())) {
            return childText + '\n';
        }
        return childText;
    }
    return '';
}

console.log("Result: '" + processNode(doc.body) + "'");
