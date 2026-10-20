/* Synthetic QA only; capture the same manifests the production SDK registers. */
const FolioWidgetSDKOriginal=FolioWidgetSDK;window.MenuQAManifests=new Map();window.FolioWidgetSDK=Object.freeze({...FolioWidgetSDK,register(m){MenuQAManifests.set(m.id,m);FolioWidgetSDKOriginal.register(m);}});
