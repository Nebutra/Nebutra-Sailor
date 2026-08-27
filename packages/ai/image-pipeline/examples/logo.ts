import { createDemoBrandContext } from "@nebutra/generation-context";
import { ImagePipeline } from "../src/index";

const asset = await new ImagePipeline().generate(
  { type: "logo", company: "Loop", oneLiner: "AI debugging for indie devs" },
  createDemoBrandContext(),
);

process.stdout.write(`${asset.path}\n`);
