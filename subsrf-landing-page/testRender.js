import React from 'react';
import ReactDOMServer from 'react-dom/server';
import DocsPage from './src/DocsPage.jsx';

try {
  console.log(ReactDOMServer.renderToString(React.createElement(DocsPage, { tier: 'free' })));
} catch (e) {
  console.error("REACT RENDER ERROR:", e);
}
