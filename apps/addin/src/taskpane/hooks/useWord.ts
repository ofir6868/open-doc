export async function insertContentControl(fieldPath: string): Promise<void> {
  await Word.run(async (ctx) => {
    const cc = ctx.document.getSelection().insertContentControl();
    cc.tag = fieldPath;
    cc.title = fieldPath;
    cc.appearance = Word.ContentControlAppearance.boundingBox;
    cc.insertText(`{{${fieldPath}}}`, Word.InsertLocation.replace);
    await ctx.sync();
  });
}

export async function getConnectedStatus(serverUrl: string): Promise<boolean> {
  try {
    const r = await fetch(`${serverUrl}/api/health`, { signal: AbortSignal.timeout(3000) });
    return r.ok;
  } catch {
    return false;
  }
}
