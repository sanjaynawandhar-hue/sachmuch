// Explicit offline demo entry; normal production builds use index.js.
import React from 'react';
import { registerRootComponent } from 'expo';
import App from './App';
import { PreviewFactsContext } from './src/preview/context';
import { previewFacts } from './src/preview/facts';
function OfflinePreview() {
  return <PreviewFactsContext.Provider value={previewFacts}><App /></PreviewFactsContext.Provider>;
}
registerRootComponent(OfflinePreview);
