import { createDemoBrandContext } from "@nebutra/generation-context";
import { MeshPipeline } from "../src/index";

const asset = await new MeshPipeline().fromText("a sleek robot mascot", createDemoBrandContext());

process.stdout.write(`${asset.gltfPath}\n`);
