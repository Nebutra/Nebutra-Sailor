import { createDemoBrandContext } from "@nebutra/generation-context";
import { MeshPipeline } from "../src/index";

const pipeline = new MeshPipeline();
const asset = await pipeline.fromText("a 3D debugging loop logo", createDemoBrandContext());

process.stdout.write(`${JSON.stringify(await pipeline.export(asset, "gltf"), null, 2)}\n`);
