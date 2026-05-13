import { Folder, Globe, ImageIcon, Layout, LayoutGrid, Terminal, Users } from "lucide-react";
import {
  DesignMockup,
  EDAMMockup,
  EnterpriseMockup,
  ExportMockup,
  IPMockup,
  MultimodalMockup,
  OPCMockup,
} from "./mockups";

export const USE_CASES_DATA = [
  { key: "opc", icon: Users, mockup: OPCMockup },
  { key: "ip", icon: Terminal, mockup: IPMockup },
  { key: "multimodal", icon: ImageIcon, mockup: MultimodalMockup },
  { key: "enterprise", icon: Globe, mockup: EnterpriseMockup },
  { key: "export", icon: LayoutGrid, mockup: ExportMockup },
  { key: "design", icon: Layout, mockup: DesignMockup },
  { key: "edam", icon: Folder, mockup: EDAMMockup },
] as const;
