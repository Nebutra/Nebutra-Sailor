import { createDemoBrandContext } from "@nebutra/generation-context";
import { ImagePipeline } from "../src/index";

const asset = await new ImagePipeline().runWorkflow(
  "hero",
  { headline: "Debug the loop" },
  createDemoBrandContext(),
);

process.stdout.write(`${asset.path}\n`);
