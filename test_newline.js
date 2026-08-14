
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><div><p>Question part 1</p><p>Question part 2</p></div>');
const doc = dom.window.document;

function processNode(node, isHighlighted = false) {
    if (node.nodeType === 3) return node.textContent || '';
    if (node.nodeType === 1) {
        let childText = '';
        node.childNodes.forEach(child => {
            childText += processNode(child, isHighlighted);
        });
        if (['p', 'div', 'tr', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'td', 'th', 'br'].includes(node.tagName.toLowerCase())) {
            return childText.trimEnd() + '\n';
        }
        return childText;
    }
    return '';
}

console.log("Result: '" + processNode(doc.body) + "'");
