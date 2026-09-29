import { presetJsonSchema } from "@nebutra/tokens/preset";

/**
 * The Sailor Studio preset contract, for agents and editors: the same schema
 * `nebutra studio schema` prints and the MCP tool returns, generated from the
 * knob lists, so it cannot drift from what Studio and the CLI accept.
 */

export function GET() {
  return Response.json(presetJsonSchema(), {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
