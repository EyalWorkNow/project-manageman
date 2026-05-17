import React from 'react';
import { renderToString } from 'react-dom/server';
import { ArrowLeft2 } from 'iconsax-react';

try {
  const html = renderToString(React.createElement(ArrowLeft2, { size: 16, color: 'black' }));
  console.log("RENDERED HTML:");
  console.log(html);
} catch (e) {
  console.error("ERROR RENDERING:");
  console.error(e);
}
