/**
 * Custom webpack loader that adds data-lov-id attributes to JSX elements.
 * Adds data-lov-id="filePath:line:col" to every JSX opening element.
 */
const { parse } = require('@babel/parser');
const MagicString = require('magic-string');

module.exports = function componentTaggerLoader(source) {
  const resourcePath = this.resourcePath;

  if (resourcePath.includes('node_modules')) {
    return source;
  }

  try {
    const ast = parse(source, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
      errorRecovery: true,
    });

    const ms = new MagicString(source);
    const jsxElements = [];

    function walk(node) {
      if (!node || typeof node !== 'object') return;

      if (node.type === 'JSXOpeningElement') {
        jsxElements.push(node);
      }

      for (const key of Object.keys(node)) {
        if (key === 'leadingComments' || key === 'trailingComments' || key === 'innerComments') continue;
        const child = node[key];
        if (Array.isArray(child)) {
          child.forEach(walk);
        } else if (child && typeof child === 'object' && child.type) {
          walk(child);
        }
      }
    }

    walk(ast.program);

    for (let i = jsxElements.length - 1; i >= 0; i--) {
      const el = jsxElements[i];
      const line = el.loc.start.line;
      const col = el.loc.start.column;
      const attrValue = `${resourcePath}:${line}:${col}`;

      const hasAttr = el.attributes && el.attributes.some(
        attr => attr.type === 'JSXAttribute' && attr.name && attr.name.name === 'data-lov-id'
      );

      if (hasAttr) continue;

      // Skip React.Fragment / Fragment — they don't accept arbitrary props
      const elName = el.name;
      const isFragment =
        (elName.type === 'JSXIdentifier' && elName.name === 'Fragment') ||
        (elName.type === 'JSXMemberExpression' &&
          elName.object && elName.object.name === 'React' &&
          elName.property && elName.property.name === 'Fragment') ||
        elName.type === 'JSXEmptyExpression'; // shorthand <>
      if (isFragment) continue;

      const nameEnd = el.name.end;
      const attr = ` data-lov-id="${attrValue}"`;
      ms.appendLeft(nameEnd, attr);
    }

    return ms.toString();
  } catch (e) {
    return source;
  }
};
