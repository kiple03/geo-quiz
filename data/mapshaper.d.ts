// mapshaper ships no type definitions; this covers the one function build.ts uses.
declare module "mapshaper" {
  const mapshaper: {
    applyCommands(
      commands: string,
      input?: Record<string, unknown>,
    ): Promise<Record<string, string | Uint8Array>>;
  };
  export default mapshaper;
}
