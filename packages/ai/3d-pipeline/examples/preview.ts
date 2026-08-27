import { createDemoBrandContext } from "@nebutra/generation-context";
import { MeshPipeline } from "../src/index";

const pipeline = new MeshPipeline();
const asset = await pipeline.fromText("product mockup", createDemoBrandContext());

process.stdout.write(`${JSON.stringify(await pipeline.preview(asset), null, 2)}\n`);
