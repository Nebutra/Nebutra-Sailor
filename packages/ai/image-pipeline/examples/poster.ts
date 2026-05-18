import { createDemoBrandContext } from "@nebutra/generation-context";
import { ImagePipeline } from "../src/index";

const asset = await new ImagePipeline().generate(
  { type: "poster", title: "Ship with context", subtitle: "A founder operating system" },
  createDemoBrandContext(),
);

process.stdout.write(`${asset.path}\n`);
