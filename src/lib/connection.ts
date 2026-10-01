/** Demo is an explicit test fixture, never the fallback for a missing backend. */
export function connectionSettings(
  url: string | undefined,
  key: string | undefined,
  demo: string | undefined,
) {
  const connected = Boolean(url && key);
  const isDemo = demo === 'true' && !url && !key;
  return { connected, isDemo, configError: !connected && !isDemo };
}
