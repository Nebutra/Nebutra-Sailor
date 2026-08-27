/**
 * W3 · Template root — license chooser (brief: docs/plans/tools/license-chooser.md).
 *
 * Two pure operations, deliberately split the way the brief's §9.6 I/O contract
 * splits them, so an agent scaffolding a repo can call them in sequence:
 *
 *   template/license-recommend  scenario triage  → one license + why + alternates
 *   template/license-generate   spdxId + holder  → the ready-to-commit LICENSE file
 *
 * The brief's archetype (§8) is a single-step scenario triage fused into
 * configure-then-generate — no "question 3 of 5" — which is why `recommend`
 * takes one scenario plus a few refinements in ONE call rather than a session.
 *
 * Determinism: no clock, no randomness, no network, no fs. `year` is a required
 * input rather than a server-side "current year" default (see the brief's §9.6
 * note) precisely so the same input always yields the same bytes.
 *
 * Nothing here is legal advice, and both operations say so in their output.
 */
import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

/** SPDX License List release the vendored texts below were taken from. */
const SPDX_RELEASE = "e4c1f27";
const SPDX_RELEASE_DATE = "2026-07-16";

/**
 * Canonical license texts, from the SPDX License List (plain-text rendering,
 * `text/<id>.txt`, which is de-wrapped into paragraph-per-line form upstream —
 * that is the shape of the source file, not a reflow we applied). Byte-faithful
 * on purpose: this is a legal document, not copy we may improve (know-how #7).
 * The only thing the engine ever changes is the copyright line of the licenses
 * that ship one as a placeholder — see LICENSES[].copyright below.
 *
 * One documented exception: ISC. See the note on its entry — the SPDX text is
 * ISC's own corporate wording, which cannot be turned into a correct file for
 * anyone else by substituting the copyright line alone.
 *
 * GPL-3.0-only / GPL-3.0-or-later (and the AGPL / LGPL pairs) share one text —
 * verified identical in the upstream data — so one entry serves both ids; the
 * "-only" vs "-or-later" choice shows up in the SPDX id and the source-file
 * notice, which is exactly where it is legally load-bearing (know-how #4).
 */
const LICENSE_TEXTS: Readonly<Record<string, string>> = {
  MIT: 'MIT License\n\nCopyright (c) <year> <copyright holders>\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and\nassociated documentation files (the "Software"), to deal in the Software without restriction, including\nwithout limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the\nfollowing conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial\nportions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT\nLIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO\nEVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER\nIN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE\nUSE OR OTHER DEALINGS IN THE SOFTWARE.\n',
  "Apache-2.0":
    'Apache License\nVersion 2.0, January 2004\nhttp://www.apache.org/licenses/\n\nTERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION\n\n1. Definitions.\n\n"License" shall mean the terms and conditions for use, reproduction, and distribution as defined by Sections 1 through 9 of this document.\n\n"Licensor" shall mean the copyright owner or entity authorized by the copyright owner that is granting the License.\n\n"Legal Entity" shall mean the union of the acting entity and all other entities that control, are controlled by, or are under common control with that entity. For the purposes of this definition, "control" means (i) the power, direct or indirect, to cause the direction or management of such entity, whether by contract or otherwise, or (ii) ownership of fifty percent (50%) or more of the outstanding shares, or (iii) beneficial ownership of such entity.\n\n"You" (or "Your") shall mean an individual or Legal Entity exercising permissions granted by this License.\n\n"Source" form shall mean the preferred form for making modifications, including but not limited to software source code, documentation source, and configuration files.\n\n"Object" form shall mean any form resulting from mechanical transformation or translation of a Source form, including but not limited to compiled object code, generated documentation, and conversions to other media types.\n\n"Work" shall mean the work of authorship, whether in Source or Object form, made available under the License, as indicated by a copyright notice that is included in or attached to the work (an example is provided in the Appendix below).\n\n"Derivative Works" shall mean any work, whether in Source or Object form, that is based on (or derived from) the Work and for which the editorial revisions, annotations, elaborations, or other modifications represent, as a whole, an original work of authorship. For the purposes of this License, Derivative Works shall not include works that remain separable from, or merely link (or bind by name) to the interfaces of, the Work and Derivative Works thereof.\n\n"Contribution" shall mean any work of authorship, including the original version of the Work and any modifications or additions to that Work or Derivative Works thereof, that is intentionally submitted to Licensor for inclusion in the Work by the copyright owner or by an individual or Legal Entity authorized to submit on behalf of the copyright owner. For the purposes of this definition, "submitted" means any form of electronic, verbal, or written communication sent to the Licensor or its representatives, including but not limited to communication on electronic mailing lists, source code control systems, and issue tracking systems that are managed by, or on behalf of, the Licensor for the purpose of discussing and improving the Work, but excluding communication that is conspicuously marked or otherwise designated in writing by the copyright owner as "Not a Contribution."\n\n"Contributor" shall mean Licensor and any individual or Legal Entity on behalf of whom a Contribution has been received by Licensor and subsequently incorporated within the Work.\n\n2. Grant of Copyright License. Subject to the terms and conditions of this License, each Contributor hereby grants to You a perpetual, worldwide, non-exclusive, no-charge, royalty-free, irrevocable copyright license to reproduce, prepare Derivative Works of, publicly display, publicly perform, sublicense, and distribute the Work and such Derivative Works in Source or Object form.\n\n3. Grant of Patent License. Subject to the terms and conditions of this License, each Contributor hereby grants to You a perpetual, worldwide, non-exclusive, no-charge, royalty-free, irrevocable (except as stated in this section) patent license to make, have made, use, offer to sell, sell, import, and otherwise transfer the Work, where such license applies only to those patent claims licensable by such Contributor that are necessarily infringed by their Contribution(s) alone or by combination of their Contribution(s) with the Work to which such Contribution(s) was submitted. If You institute patent litigation against any entity (including a cross-claim or counterclaim in a lawsuit) alleging that the Work or a Contribution incorporated within the Work constitutes direct or contributory patent infringement, then any patent licenses granted to You under this License for that Work shall terminate as of the date such litigation is filed.\n\n4. Redistribution. You may reproduce and distribute copies of the Work or Derivative Works thereof in any medium, with or without modifications, and in Source or Object form, provided that You meet the following conditions:\n\n     (a) You must give any other recipients of the Work or Derivative Works a copy of this License; and\n\n     (b) You must cause any modified files to carry prominent notices stating that You changed the files; and\n\n     (c) You must retain, in the Source form of any Derivative Works that You distribute, all copyright, patent, trademark, and attribution notices from the Source form of the Work, excluding those notices that do not pertain to any part of the Derivative Works; and\n\n     (d) If the Work includes a "NOTICE" text file as part of its distribution, then any Derivative Works that You distribute must include a readable copy of the attribution notices contained within such NOTICE file, excluding those notices that do not pertain to any part of the Derivative Works, in at least one of the following places: within a NOTICE text file distributed as part of the Derivative Works; within the Source form or documentation, if provided along with the Derivative Works; or, within a display generated by the Derivative Works, if and wherever such third-party notices normally appear. The contents of the NOTICE file are for informational purposes only and do not modify the License. You may add Your own attribution notices within Derivative Works that You distribute, alongside or as an addendum to the NOTICE text from the Work, provided that such additional attribution notices cannot be construed as modifying the License.\n\n     You may add Your own copyright statement to Your modifications and may provide additional or different license terms and conditions for use, reproduction, or distribution of Your modifications, or for any such Derivative Works as a whole, provided Your use, reproduction, and distribution of the Work otherwise complies with the conditions stated in this License.\n\n5. Submission of Contributions. Unless You explicitly state otherwise, any Contribution intentionally submitted for inclusion in the Work by You to the Licensor shall be under the terms and conditions of this License, without any additional terms or conditions. Notwithstanding the above, nothing herein shall supersede or modify the terms of any separate license agreement you may have executed with Licensor regarding such Contributions.\n\n6. Trademarks. This License does not grant permission to use the trade names, trademarks, service marks, or product names of the Licensor, except as required for reasonable and customary use in describing the origin of the Work and reproducing the content of the NOTICE file.\n\n7. Disclaimer of Warranty. Unless required by applicable law or agreed to in writing, Licensor provides the Work (and each Contributor provides its Contributions) on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied, including, without limitation, any warranties or conditions of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A PARTICULAR PURPOSE. You are solely responsible for determining the appropriateness of using or redistributing the Work and assume any risks associated with Your exercise of permissions under this License.\n\n8. Limitation of Liability. In no event and under no legal theory, whether in tort (including negligence), contract, or otherwise, unless required by applicable law (such as deliberate and grossly negligent acts) or agreed to in writing, shall any Contributor be liable to You for damages, including any direct, indirect, special, incidental, or consequential damages of any character arising as a result of this License or out of the use or inability to use the Work (including but not limited to damages for loss of goodwill, work stoppage, computer failure or malfunction, or any and all other commercial damages or losses), even if such Contributor has been advised of the possibility of such damages.\n\n9. Accepting Warranty or Additional Liability. While redistributing the Work or Derivative Works thereof, You may choose to offer, and charge a fee for, acceptance of support, warranty, indemnity, or other liability obligations and/or rights consistent with this License. However, in accepting such obligations, You may act only on Your own behalf and on Your sole responsibility, not on behalf of any other Contributor, and only if You agree to indemnify, defend, and hold each Contributor harmless for any liability incurred by, or claims asserted against, such Contributor by reason of your accepting any such warranty or additional liability.\n\nEND OF TERMS AND CONDITIONS\n\nAPPENDIX: How to apply the Apache License to your work.\n\nTo apply the Apache License to your work, attach the following boilerplate notice, with the fields enclosed by brackets "[]" replaced with your own identifying information. (Don\'t include the brackets!)  The text should be enclosed in the appropriate comment syntax for the file format. We also recommend that a file or class name and description of purpose be included on the same "printed page" as the copyright notice for easier identification within third-party archives.\n\nCopyright [yyyy] [name of copyright owner]\n\nLicensed under the Apache License, Version 2.0 (the "License");\nyou may not use this file except in compliance with the License.\nYou may obtain a copy of the License at\n\nhttp://www.apache.org/licenses/LICENSE-2.0\n\nUnless required by applicable law or agreed to in writing, software\ndistributed under the License is distributed on an "AS IS" BASIS,\nWITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\nSee the License for the specific language governing permissions and\nlimitations under the License.\n',
  "BSD-3-Clause":
    'Copyright (c) <year> <owner>. \n\nRedistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:\n\n1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.\n\n2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.\n\n3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.\n\nTHIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n',
  "BSD-2-Clause":
    'Copyright (c) <year> <owner> \n\nRedistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:\n\n1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.\n\n2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.\n\nTHIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n',
  // The only text here that is NOT the SPDX plain-text rendering verbatim.
  // SPDX ships ISC's *original* wording, which names the Internet Systems
  // Consortium in both the copyright lines and the disclaimer ("ISC DISCLAIMS
  // ALL WARRANTIES", "IN NO EVENT SHALL ISC BE LIABLE"). Substituting only the
  // copyright line leaves a file that disclaims warranties on ISC's behalf and
  // not on the holder's — wrong for every repository except ISC's own. This is
  // the "THE AUTHOR" variant that OpenBSD and npm actually ship (verify against
  // any ISC-licensed package's LICENSE file); SPDX's matching guidelines treat
  // the two as the same license, and the substitutable placeholder is what a
  // generator needs.
  ISC: 'ISC License\n\nCopyright (c) <year> <copyright holders>\n\nPermission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.\n\nTHE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.\n',
  "MPL-2.0":
    'Mozilla Public License Version 2.0\n==================================\n\n1. Definitions\n--------------\n\n1.1. "Contributor"\n    means each individual or legal entity that creates, contributes to\n    the creation of, or owns Covered Software.\n\n1.2. "Contributor Version"\n    means the combination of the Contributions of others (if any) used\n    by a Contributor and that particular Contributor\'s Contribution.\n\n1.3. "Contribution"\n    means Covered Software of a particular Contributor.\n\n1.4. "Covered Software"\n    means Source Code Form to which the initial Contributor has attached\n    the notice in Exhibit A, the Executable Form of such Source Code\n    Form, and Modifications of such Source Code Form, in each case\n    including portions thereof.\n\n1.5. "Incompatible With Secondary Licenses"\n    means\n\n    (a) that the initial Contributor has attached the notice described\n        in Exhibit B to the Covered Software; or\n\n    (b) that the Covered Software was made available under the terms of\n        version 1.1 or earlier of the License, but not also under the\n        terms of a Secondary License.\n\n1.6. "Executable Form"\n    means any form of the work other than Source Code Form.\n\n1.7. "Larger Work"\n    means a work that combines Covered Software with other material, in \n    a separate file or files, that is not Covered Software.\n\n1.8. "License"\n    means this document.\n\n1.9. "Licensable"\n    means having the right to grant, to the maximum extent possible,\n    whether at the time of the initial grant or subsequently, any and\n    all of the rights conveyed by this License.\n\n1.10. "Modifications"\n    means any of the following:\n\n    (a) any file in Source Code Form that results from an addition to,\n        deletion from, or modification of the contents of Covered\n        Software; or\n\n    (b) any new file in Source Code Form that contains any Covered\n        Software.\n\n1.11. "Patent Claims" of a Contributor\n    means any patent claim(s), including without limitation, method,\n    process, and apparatus claims, in any patent Licensable by such\n    Contributor that would be infringed, but for the grant of the\n    License, by the making, using, selling, offering for sale, having\n    made, import, or transfer of either its Contributions or its\n    Contributor Version.\n\n1.12. "Secondary License"\n    means either the GNU General Public License, Version 2.0, the GNU\n    Lesser General Public License, Version 2.1, the GNU Affero General\n    Public License, Version 3.0, or any later versions of those\n    licenses.\n\n1.13. "Source Code Form"\n    means the form of the work preferred for making modifications.\n\n1.14. "You" (or "Your")\n    means an individual or a legal entity exercising rights under this\n    License. For legal entities, "You" includes any entity that\n    controls, is controlled by, or is under common control with You. For\n    purposes of this definition, "control" means (a) the power, direct\n    or indirect, to cause the direction or management of such entity,\n    whether by contract or otherwise, or (b) ownership of more than\n    fifty percent (50%) of the outstanding shares or beneficial\n    ownership of such entity.\n\n2. License Grants and Conditions\n--------------------------------\n\n2.1. Grants\n\nEach Contributor hereby grants You a world-wide, royalty-free,\nnon-exclusive license:\n\n(a) under intellectual property rights (other than patent or trademark)\n    Licensable by such Contributor to use, reproduce, make available,\n    modify, display, perform, distribute, and otherwise exploit its\n    Contributions, either on an unmodified basis, with Modifications, or\n    as part of a Larger Work; and\n\n(b) under Patent Claims of such Contributor to make, use, sell, offer\n    for sale, have made, import, and otherwise transfer either its\n    Contributions or its Contributor Version.\n\n2.2. Effective Date\n\nThe licenses granted in Section 2.1 with respect to any Contribution\nbecome effective for each Contribution on the date the Contributor first\ndistributes such Contribution.\n\n2.3. Limitations on Grant Scope\n\nThe licenses granted in this Section 2 are the only rights granted under\nthis License. No additional rights or licenses will be implied from the\ndistribution or licensing of Covered Software under this License.\nNotwithstanding Section 2.1(b) above, no patent license is granted by a\nContributor:\n\n(a) for any code that a Contributor has removed from Covered Software;\n    or\n\n(b) for infringements caused by: (i) Your and any other third party\'s\n    modifications of Covered Software, or (ii) the combination of its\n    Contributions with other software (except as part of its Contributor\n    Version); or\n\n(c) under Patent Claims infringed by Covered Software in the absence of\n    its Contributions.\n\nThis License does not grant any rights in the trademarks, service marks,\nor logos of any Contributor (except as may be necessary to comply with\nthe notice requirements in Section 3.4).\n\n2.4. Subsequent Licenses\n\nNo Contributor makes additional grants as a result of Your choice to\ndistribute the Covered Software under a subsequent version of this\nLicense (see Section 10.2) or under the terms of a Secondary License (if\npermitted under the terms of Section 3.3).\n\n2.5. Representation\n\nEach Contributor represents that the Contributor believes its\nContributions are its original creation(s) or it has sufficient rights\nto grant the rights to its Contributions conveyed by this License.\n\n2.6. Fair Use\n\nThis License is not intended to limit any rights You have under\napplicable copyright doctrines of fair use, fair dealing, or other\nequivalents.\n\n2.7. Conditions\n\nSections 3.1, 3.2, 3.3, and 3.4 are conditions of the licenses granted\nin Section 2.1.\n\n3. Responsibilities\n-------------------\n\n3.1. Distribution of Source Form\n\nAll distribution of Covered Software in Source Code Form, including any\nModifications that You create or to which You contribute, must be under\nthe terms of this License. You must inform recipients that the Source\nCode Form of the Covered Software is governed by the terms of this\nLicense, and how they can obtain a copy of this License. You may not\nattempt to alter or restrict the recipients\' rights in the Source Code\nForm.\n\n3.2. Distribution of Executable Form\n\nIf You distribute Covered Software in Executable Form then:\n\n(a) such Covered Software must also be made available in Source Code\n    Form, as described in Section 3.1, and You must inform recipients of\n    the Executable Form how they can obtain a copy of such Source Code\n    Form by reasonable means in a timely manner, at a charge no more\n    than the cost of distribution to the recipient; and\n\n(b) You may distribute such Executable Form under the terms of this\n    License, or sublicense it under different terms, provided that the\n    license for the Executable Form does not attempt to limit or alter\n    the recipients\' rights in the Source Code Form under this License.\n\n3.3. Distribution of a Larger Work\n\nYou may create and distribute a Larger Work under terms of Your choice,\nprovided that You also comply with the requirements of this License for\nthe Covered Software. If the Larger Work is a combination of Covered\nSoftware with a work governed by one or more Secondary Licenses, and the\nCovered Software is not Incompatible With Secondary Licenses, this\nLicense permits You to additionally distribute such Covered Software\nunder the terms of such Secondary License(s), so that the recipient of\nthe Larger Work may, at their option, further distribute the Covered\nSoftware under the terms of either this License or such Secondary\nLicense(s).\n\n3.4. Notices\n\nYou may not remove or alter the substance of any license notices\n(including copyright notices, patent notices, disclaimers of warranty,\nor limitations of liability) contained within the Source Code Form of\nthe Covered Software, except that You may alter any license notices to\nthe extent required to remedy known factual inaccuracies.\n\n3.5. Application of Additional Terms\n\nYou may choose to offer, and to charge a fee for, warranty, support,\nindemnity or liability obligations to one or more recipients of Covered\nSoftware. However, You may do so only on Your own behalf, and not on\nbehalf of any Contributor. You must make it absolutely clear that any\nsuch warranty, support, indemnity, or liability obligation is offered by\nYou alone, and You hereby agree to indemnify every Contributor for any\nliability incurred by such Contributor as a result of warranty, support,\nindemnity or liability terms You offer. You may include additional\ndisclaimers of warranty and limitations of liability specific to any\njurisdiction.\n\n4. Inability to Comply Due to Statute or Regulation\n---------------------------------------------------\n\nIf it is impossible for You to comply with any of the terms of this\nLicense with respect to some or all of the Covered Software due to\nstatute, judicial order, or regulation then You must: (a) comply with\nthe terms of this License to the maximum extent possible; and (b)\ndescribe the limitations and the code they affect. Such description must\nbe placed in a text file included with all distributions of the Covered\nSoftware under this License. Except to the extent prohibited by statute\nor regulation, such description must be sufficiently detailed for a\nrecipient of ordinary skill to be able to understand it.\n\n5. Termination\n--------------\n\n5.1. The rights granted under this License will terminate automatically\nif You fail to comply with any of its terms. However, if You become\ncompliant, then the rights granted under this License from a particular\nContributor are reinstated (a) provisionally, unless and until such\nContributor explicitly and finally terminates Your grants, and (b) on an\nongoing basis, if such Contributor fails to notify You of the\nnon-compliance by some reasonable means prior to 60 days after You have\ncome back into compliance. Moreover, Your grants from a particular\nContributor are reinstated on an ongoing basis if such Contributor\nnotifies You of the non-compliance by some reasonable means, this is the\nfirst time You have received notice of non-compliance with this License\nfrom such Contributor, and You become compliant prior to 30 days after\nYour receipt of the notice.\n\n5.2. If You initiate litigation against any entity by asserting a patent\ninfringement claim (excluding declaratory judgment actions,\ncounter-claims, and cross-claims) alleging that a Contributor Version\ndirectly or indirectly infringes any patent, then the rights granted to\nYou by any and all Contributors for the Covered Software under Section\n2.1 of this License shall terminate.\n\n5.3. In the event of termination under Sections 5.1 or 5.2 above, all\nend user license agreements (excluding distributors and resellers) which\nhave been validly granted by You or Your distributors under this License\nprior to termination shall survive termination.\n\n************************************************************************\n*                                                                      *\n*  6. Disclaimer of Warranty                                           *\n*  -------------------------                                           *\n*                                                                      *\n*  Covered Software is provided under this License on an "as is"       *\n*  basis, without warranty of any kind, either expressed, implied, or  *\n*  statutory, including, without limitation, warranties that the       *\n*  Covered Software is free of defects, merchantable, fit for a        *\n*  particular purpose or non-infringing. The entire risk as to the     *\n*  quality and performance of the Covered Software is with You.        *\n*  Should any Covered Software prove defective in any respect, You     *\n*  (not any Contributor) assume the cost of any necessary servicing,   *\n*  repair, or correction. This disclaimer of warranty constitutes an   *\n*  essential part of this License. No use of any Covered Software is   *\n*  authorized under this License except under this disclaimer.         *\n*                                                                      *\n************************************************************************\n\n************************************************************************\n*                                                                      *\n*  7. Limitation of Liability                                          *\n*  --------------------------                                          *\n*                                                                      *\n*  Under no circumstances and under no legal theory, whether tort      *\n*  (including negligence), contract, or otherwise, shall any           *\n*  Contributor, or anyone who distributes Covered Software as          *\n*  permitted above, be liable to You for any direct, indirect,         *\n*  special, incidental, or consequential damages of any character      *\n*  including, without limitation, damages for lost profits, loss of    *\n*  goodwill, work stoppage, computer failure or malfunction, or any    *\n*  and all other commercial damages or losses, even if such party      *\n*  shall have been informed of the possibility of such damages. This   *\n*  limitation of liability shall not apply to liability for death or   *\n*  personal injury resulting from such party\'s negligence to the       *\n*  extent applicable law prohibits such limitation. Some               *\n*  jurisdictions do not allow the exclusion or limitation of           *\n*  incidental or consequential damages, so this exclusion and          *\n*  limitation may not apply to You.                                    *\n*                                                                      *\n************************************************************************\n\n8. Litigation\n-------------\n\nAny litigation relating to this License may be brought only in the\ncourts of a jurisdiction where the defendant maintains its principal\nplace of business and such litigation shall be governed by laws of that\njurisdiction, without reference to its conflict-of-law provisions.\nNothing in this Section shall prevent a party\'s ability to bring\ncross-claims or counter-claims.\n\n9. Miscellaneous\n----------------\n\nThis License represents the complete agreement concerning the subject\nmatter hereof. If any provision of this License is held to be\nunenforceable, such provision shall be reformed only to the extent\nnecessary to make it enforceable. Any law or regulation which provides\nthat the language of a contract shall be construed against the drafter\nshall not be used to construe this License against a Contributor.\n\n10. Versions of the License\n---------------------------\n\n10.1. New Versions\n\nMozilla Foundation is the license steward. Except as provided in Section\n10.3, no one other than the license steward has the right to modify or\npublish new versions of this License. Each version will be given a\ndistinguishing version number.\n\n10.2. Effect of New Versions\n\nYou may distribute the Covered Software under the terms of the version\nof the License under which You originally received the Covered Software,\nor under the terms of any subsequent version published by the license\nsteward.\n\n10.3. Modified Versions\n\nIf you create software not governed by this License, and you want to\ncreate a new license for such software, you may create and use a\nmodified version of this License if you rename the license and remove\nany references to the name of the license steward (except to note that\nsuch modified license differs from this License).\n\n10.4. Distributing Source Code Form that is Incompatible With Secondary\nLicenses\n\nIf You choose to distribute Source Code Form that is Incompatible With\nSecondary Licenses under the terms of this version of the License, the\nnotice described in Exhibit B of this License must be attached.\n\nExhibit A - Source Code Form License Notice\n-------------------------------------------\n\n  This Source Code Form is subject to the terms of the Mozilla Public\n  License, v. 2.0. If a copy of the MPL was not distributed with this\n  file, You can obtain one at https://mozilla.org/MPL/2.0/.\n\nIf it is not possible or desirable to put the notice in a particular\nfile, then You may include the notice in a location (such as a LICENSE\nfile in a relevant directory) where a recipient would be likely to look\nfor such a notice.\n\nYou may add additional accurate notices of copyright ownership.\n\nExhibit B - "Incompatible With Secondary Licenses" Notice\n---------------------------------------------------------\n\n  This Source Code Form is "Incompatible With Secondary Licenses", as\n  defined by the Mozilla Public License, v. 2.0.\n',
  "LGPL-3.0":
    "GNU LESSER GENERAL PUBLIC LICENSE\nVersion 3, 29 June 2007\n\nCopyright (C) 2007 Free Software Foundation, Inc. <http://fsf.org/>\n\nEveryone is permitted to copy and distribute verbatim copies of this license document, but changing it is not allowed.\n\nThis version of the GNU Lesser General Public License incorporates the terms and conditions of version 3 of the GNU General Public License, supplemented by the additional permissions listed below.\n\n0. Additional Definitions.\n\nAs used herein, \"this License\" refers to version 3 of the GNU Lesser General Public License, and the \"GNU GPL\" refers to version 3 of the GNU General Public License.\n\n\"The Library\" refers to a covered work governed by this License, other than an Application or a Combined Work as defined below.\n\nAn \"Application\" is any work that makes use of an interface provided by the Library, but which is not otherwise based on the Library. Defining a subclass of a class defined by the Library is deemed a mode of using an interface provided by the Library.\n\nA \"Combined Work\" is a work produced by combining or linking an Application with the Library.  The particular version of the Library with which the Combined Work was made is also called the \"Linked Version\".\n\nThe \"Minimal Corresponding Source\" for a Combined Work means the Corresponding Source for the Combined Work, excluding any source code for portions of the Combined Work that, considered in isolation, are based on the Application, and not on the Linked Version.\n\nThe \"Corresponding Application Code\" for a Combined Work means the object code and/or source code for the Application, including any data and utility programs needed for reproducing the Combined Work from the Application, but excluding the System Libraries of the Combined Work.\n\n1. Exception to Section 3 of the GNU GPL.\nYou may convey a covered work under sections 3 and 4 of this License without being bound by section 3 of the GNU GPL.\n\n2. Conveying Modified Versions.\nIf you modify a copy of the Library, and, in your modifications, a facility refers to a function or data to be supplied by an Application that uses the facility (other than as an argument passed when the facility is invoked), then you may convey a copy of the modified version:\n\n     a) under this License, provided that you make a good faith effort to ensure that, in the event an Application does not supply the function or data, the facility still operates, and performs whatever part of its purpose remains meaningful, or\n\n     b) under the GNU GPL, with none of the additional permissions of this License applicable to that copy.\n\n3. Object Code Incorporating Material from Library Header Files.\nThe object code form of an Application may incorporate material from a header file that is part of the Library.  You may convey such object code under terms of your choice, provided that, if the incorporated material is not limited to numerical parameters, data structure layouts and accessors, or small macros, inline functions and templates (ten or fewer lines in length), you do both of the following:\n\n     a) Give prominent notice with each copy of the object code that the Library is used in it and that the Library and its use are covered by this License.\n\n     b) Accompany the object code with a copy of the GNU GPL and this license document.\n\n4. Combined Works.\nYou may convey a Combined Work under terms of your choice that, taken together, effectively do not restrict modification of the portions of the Library contained in the Combined Work and reverse engineering for debugging such modifications, if you also do each of the following:\n\n     a) Give prominent notice with each copy of the Combined Work that the Library is used in it and that the Library and its use are covered by this License.\n\n     b) Accompany the Combined Work with a copy of the GNU GPL and this license document.\n\n     c) For a Combined Work that displays copyright notices during execution, include the copyright notice for the Library among these notices, as well as a reference directing the user to the copies of the GNU GPL and this license document.\n\n     d) Do one of the following:\n\n           0) Convey the Minimal Corresponding Source under the terms of this License, and the Corresponding Application Code in a form suitable for, and under terms that permit, the user to recombine or relink the Application with a modified version of the Linked Version to produce a modified Combined Work, in the manner specified by section 6 of the GNU GPL for conveying Corresponding Source.\n\n          1) Use a suitable shared library mechanism for linking with the Library.  A suitable mechanism is one that (a) uses at run time a copy of the Library already present on the user's computer system, and (b) will operate properly with a modified version of the Library that is interface-compatible with the Linked Version.\n\n     e) Provide Installation Information, but only if you would otherwise be required to provide such information under section 6 of the GNU GPL, and only to the extent that such information is necessary to install and execute a modified version of the Combined Work produced by recombining or relinking the Application with a modified version of the Linked Version. (If you use option 4d0, the Installation Information must accompany the Minimal Corresponding Source and Corresponding Application Code. If you use option 4d1, you must provide the Installation Information in the manner specified by section 6 of the GNU GPL for conveying Corresponding Source.)\n\n5. Combined Libraries.\nYou may place library facilities that are a work based on the Library side by side in a single library together with other library facilities that are not Applications and are not covered by this License, and convey such a combined library under terms of your choice, if you do both of the following:\n\n     a) Accompany the combined library with a copy of the same work based on the Library, uncombined with any other library facilities, conveyed under the terms of this License.\n\n     b) Give prominent notice with the combined library that part of it is a work based on the Library, and explaining where to find the accompanying uncombined form of the same work.\n\n6. Revised Versions of the GNU Lesser General Public License.\nThe Free Software Foundation may publish revised and/or new versions of the GNU Lesser General Public License from time to time. Such new versions will be similar in spirit to the present version, but may differ in detail to address new problems or concerns.\n\nEach version is given a distinguishing version number. If the Library as you received it specifies that a certain numbered version of the GNU Lesser General Public License \"or any later version\" applies to it, you have the option of following the terms and conditions either of that published version or of any later version published by the Free Software Foundation. If the Library as you received it does not specify a version number of the GNU Lesser General Public License, you may choose any version of the GNU Lesser General Public License ever published by the Free Software Foundation.\n\nIf the Library as you received it specifies that a proxy can decide whether future versions of the GNU Lesser General Public License shall\napply, that proxy's public statement of acceptance of any version is permanent authorization for you to choose that version for the Library.\n\nGNU GENERAL PUBLIC LICENSE\nVersion 3, 29 June 2007\n\nCopyright © 2007 Free Software Foundation, Inc. <http://fsf.org/>\n\nEveryone is permitted to copy and distribute verbatim copies of this license document, but changing it is not allowed.\n\nPreamble\n\nThe GNU General Public License is a free, copyleft license for software and other kinds of works.\n\nThe licenses for most software and other practical works are designed to take away your freedom to share and change the works. By contrast, the GNU General Public License is intended to guarantee your freedom to share and change all versions of a program--to make sure it remains free software for all its users. We, the Free Software Foundation, use the GNU General Public License for most of our software; it applies also to any other work released this way by its authors. You can apply it to your programs, too.\n\nWhen we speak of free software, we are referring to freedom, not price. Our General Public Licenses are designed to make sure that you have the freedom to distribute copies of free software (and charge for them if you wish), that you receive source code or can get it if you want it, that you can change the software or use pieces of it in new free programs, and that you know you can do these things.\n\nTo protect your rights, we need to prevent others from denying you these rights or asking you to surrender the rights. Therefore, you have certain responsibilities if you distribute copies of the software, or if you modify it: responsibilities to respect the freedom of others.\n\nFor example, if you distribute copies of such a program, whether gratis or for a fee, you must pass on to the recipients the same freedoms that you received. You must make sure that they, too, receive or can get the source code. And you must show them these terms so they know their rights.\n\nDevelopers that use the GNU GPL protect your rights with two steps: (1) assert copyright on the software, and (2) offer you this License giving you legal permission to copy, distribute and/or modify it.\n\nFor the developers' and authors' protection, the GPL clearly explains that there is no warranty for this free software. For both users' and authors' sake, the GPL requires that modified versions be marked as changed, so that their problems will not be attributed erroneously to authors of previous versions.\n\nSome devices are designed to deny users access to install or run modified versions of the software inside them, although the manufacturer can do so. This is fundamentally incompatible with the aim of protecting users' freedom to change the software. The systematic pattern of such abuse occurs in the area of products for individuals to use, which is precisely where it is most unacceptable. Therefore, we have designed this version of the GPL to prohibit the practice for those products. If such problems arise substantially in other domains, we stand ready to extend this provision to those domains in future versions of the GPL, as needed to protect the freedom of users.\n\nFinally, every program is threatened constantly by software patents. States should not allow patents to restrict development and use of software on general-purpose computers, but in those that do, we wish to avoid the special danger that patents applied to a free program could make it effectively proprietary. To prevent this, the GPL assures that patents cannot be used to render the program non-free.\n\nThe precise terms and conditions for copying, distribution and modification follow.\n\nTERMS AND CONDITIONS\n\n0. Definitions.\n\n“This License” refers to version 3 of the GNU General Public License.\n\n“Copyright” also means copyright-like laws that apply to other kinds of works, such as semiconductor masks.\n\n“The Program” refers to any copyrightable work licensed under this License. Each licensee is addressed as “you”. “Licensees” and “recipients” may be individuals or organizations.\n\nTo “modify” a work means to copy from or adapt all or part of the work in a fashion requiring copyright permission, other than the making of an exact copy. The resulting work is called a “modified version” of the earlier work or a work “based on” the earlier work.\n\nA “covered work” means either the unmodified Program or a work based on the Program.\n\nTo “propagate” a work means to do anything with it that, without permission, would make you directly or secondarily liable for infringement under applicable copyright law, except executing it on a computer or modifying a private copy. Propagation includes copying, distribution (with or without modification), making available to the public, and in some countries other activities as well.\n\nTo “convey” a work means any kind of propagation that enables other parties to make or receive copies. Mere interaction with a user through a computer network, with no transfer of a copy, is not conveying.\n\nAn interactive user interface displays “Appropriate Legal Notices” to the extent that it includes a convenient and prominently visible feature that (1) displays an appropriate copyright notice, and (2) tells the user that there is no warranty for the work (except to the extent that warranties are provided), that licensees may convey the work under this License, and how to view a copy of this License. If the interface presents a list of user commands or options, such as a menu, a prominent item in the list meets this criterion.\n\n1. Source Code.\nThe “source code” for a work means the preferred form of the work for making modifications to it. “Object code” means any non-source form of a work.\n\nA “Standard Interface” means an interface that either is an official standard defined by a recognized standards body, or, in the case of interfaces specified for a particular programming language, one that is widely used among developers working in that language.\n\nThe “System Libraries” of an executable work include anything, other than the work as a whole, that (a) is included in the normal form of packaging a Major Component, but which is not part of that Major Component, and (b) serves only to enable use of the work with that Major Component, or to implement a Standard Interface for which an implementation is available to the public in source code form. A “Major Component”, in this context, means a major essential component (kernel, window system, and so on) of the specific operating system (if any) on which the executable work runs, or a compiler used to produce the work, or an object code interpreter used to run it.\n\nThe “Corresponding Source” for a work in object code form means all the source code needed to generate, install, and (for an executable work) run the object code and to modify the work, including scripts to control those activities. However, it does not include the work's System Libraries, or general-purpose tools or generally available free programs which are used unmodified in performing those activities but which are not part of the work. For example, Corresponding Source includes interface definition files associated with source files for the work, and the source code for shared libraries and dynamically linked subprograms that the work is specifically designed to require, such as by intimate data communication or control flow between those subprograms and other parts of the work.\n\nThe Corresponding Source need not include anything that users can regenerate automatically from other parts of the Corresponding Source.\n\nThe Corresponding Source for a work in source code form is that same work.\n\n2. Basic Permissions.\nAll rights granted under this License are granted for the term of copyright on the Program, and are irrevocable provided the stated conditions are met. This License explicitly affirms your unlimited permission to run the unmodified Program. The output from running a covered work is covered by this License only if the output, given its content, constitutes a covered work. This License acknowledges your rights of fair use or other equivalent, as provided by copyright law.\n\nYou may make, run and propagate covered works that you do not convey, without conditions so long as your license otherwise remains in force. You may convey covered works to others for the sole purpose of having them make modifications exclusively for you, or provide you with facilities for running those works, provided that you comply with the terms of this License in conveying all material for which you do not control copyright. Those thus making or running the covered works for you must do so exclusively on your behalf, under your direction and control, on terms that prohibit them from making any copies of your copyrighted material outside their relationship with you.\n\nConveying under any other circumstances is permitted solely under the conditions stated below. Sublicensing is not allowed; section 10 makes it unnecessary.\n\n3. Protecting Users' Legal Rights From Anti-Circumvention Law.\nNo covered work shall be deemed part of an effective technological measure under any applicable law fulfilling obligations under article 11 of the WIPO copyright treaty adopted on 20 December 1996, or similar laws prohibiting or restricting circumvention of such measures.\n\nWhen you convey a covered work, you waive any legal power to forbid circumvention of technological measures to the extent such circumvention is effected by exercising rights under this License with respect to the covered work, and you disclaim any intention to limit operation or modification of the work as a means of enforcing, against the work's users, your or third parties' legal rights to forbid circumvention of technological measures.\n\n4. Conveying Verbatim Copies.\nYou may convey verbatim copies of the Program's source code as you receive it, in any medium, provided that you conspicuously and appropriately publish on each copy an appropriate copyright notice; keep intact all notices stating that this License and any non-permissive terms added in accord with section 7 apply to the code; keep intact all notices of the absence of any warranty; and give all recipients a copy of this License along with the Program.\n\nYou may charge any price or no price for each copy that you convey, and you may offer support or warranty protection for a fee.\n\n5. Conveying Modified Source Versions.\nYou may convey a work based on the Program, or the modifications to produce it from the Program, in the form of source code under the terms of section 4, provided that you also meet all of these conditions:\n\n     a) The work must carry prominent notices stating that you modified it, and giving a relevant date.\n\n     b) The work must carry prominent notices stating that it is released under this License and any conditions added under section 7. This requirement modifies the requirement in section 4 to “keep intact all notices”.\n\n     c) You must license the entire work, as a whole, under this License to anyone who comes into possession of a copy. This License will therefore apply, along with any applicable section 7 additional terms, to the whole of the work, and all its parts, regardless of how they are packaged. This License gives no permission to license the work in any other way, but it does not invalidate such permission if you have separately received it.\n\n     d) If the work has interactive user interfaces, each must display Appropriate Legal Notices; however, if the Program has interactive interfaces that do not display Appropriate Legal Notices, your work need not make them do so.\n\nA compilation of a covered work with other separate and independent works, which are not by their nature extensions of the covered work, and which are not combined with it such as to form a larger program, in or on a volume of a storage or distribution medium, is called an “aggregate” if the compilation and its resulting copyright are not used to limit the access or legal rights of the compilation's users beyond what the individual works permit. Inclusion of a covered work in an aggregate does not cause this License to apply to the other parts of the aggregate.\n\n6. Conveying Non-Source Forms.\nYou may convey a covered work in object code form under the terms of sections 4 and 5, provided that you also convey the machine-readable Corresponding Source under the terms of this License, in one of these ways:\n\n     a) Convey the object code in, or embodied in, a physical product (including a physical distribution medium), accompanied by the Corresponding Source fixed on a durable physical medium customarily used for software interchange.\n\n     b) Convey the object code in, or embodied in, a physical product (including a physical distribution medium), accompanied by a written offer, valid for at least three years and valid for as long as you offer spare parts or customer support for that product model, to give anyone who possesses the object code either (1) a copy of the Corresponding Source for all the software in the product that is covered by this License, on a durable physical medium customarily used for software interchange, for a price no more than your reasonable cost of physically performing this conveying of source, or (2) access to copy the Corresponding Source from a network server at no charge.\n\n     c) Convey individual copies of the object code with a copy of the written offer to provide the Corresponding Source. This alternative is allowed only occasionally and noncommercially, and only if you received the object code with such an offer, in accord with subsection 6b.\n\n     d) Convey the object code by offering access from a designated place (gratis or for a charge), and offer equivalent access to the Corresponding Source in the same way through the same place at no further charge. You need not require recipients to copy the Corresponding Source along with the object code. If the place to copy the object code is a network server, the Corresponding Source may be on a different server (operated by you or a third party) that supports equivalent copying facilities, provided you maintain clear directions next to the object code saying where to find the Corresponding Source. Regardless of what server hosts the Corresponding Source, you remain obligated to ensure that it is available for as long as needed to satisfy these requirements.\n\n     e) Convey the object code using peer-to-peer transmission, provided you inform other peers where the object code and Corresponding Source of the work are being offered to the general public at no charge under subsection 6d.\n\nA separable portion of the object code, whose source code is excluded from the Corresponding Source as a System Library, need not be included in conveying the object code work.\n\nA “User Product” is either (1) a “consumer product”, which means any tangible personal property which is normally used for personal, family, or household purposes, or (2) anything designed or sold for incorporation into a dwelling. In determining whether a product is a consumer product, doubtful cases shall be resolved in favor of coverage. For a particular product received by a particular user, “normally used” refers to a typical or common use of that class of product, regardless of the status of the particular user or of the way in which the particular user actually uses, or expects or is expected to use, the product. A product is a consumer product regardless of whether the product has substantial commercial, industrial or non-consumer uses, unless such uses represent the only significant mode of use of the product.\n\n“Installation Information” for a User Product means any methods, procedures, authorization keys, or other information required to install and execute modified versions of a covered work in that User Product from a modified version of its Corresponding Source. The information must suffice to ensure that the continued functioning of the modified object code is in no case prevented or interfered with solely because modification has been made.\n\nIf you convey an object code work under this section in, or with, or specifically for use in, a User Product, and the conveying occurs as part of a transaction in which the right of possession and use of the User Product is transferred to the recipient in perpetuity or for a fixed term (regardless of how the transaction is characterized), the Corresponding Source conveyed under this section must be accompanied by the Installation Information. But this requirement does not apply if neither you nor any third party retains the ability to install modified object code on the User Product (for example, the work has been installed in ROM).\n\nThe requirement to provide Installation Information does not include a requirement to continue to provide support service, warranty, or updates for a work that has been modified or installed by the recipient, or for the User Product in which it has been modified or installed. Access to a network may be denied when the modification itself materially and adversely affects the operation of the network or violates the rules and protocols for communication across the network.\n\nCorresponding Source conveyed, and Installation Information provided, in accord with this section must be in a format that is publicly documented (and with an implementation available to the public in source code form), and must require no special password or key for unpacking, reading or copying.\n\n7. Additional Terms.\n“Additional permissions” are terms that supplement the terms of this License by making exceptions from one or more of its conditions. Additional permissions that are applicable to the entire Program shall be treated as though they were included in this License, to the extent that they are valid under applicable law. If additional permissions apply only to part of the Program, that part may be used separately under those permissions, but the entire Program remains governed by this License without regard to the additional permissions.\n\nWhen you convey a copy of a covered work, you may at your option remove any additional permissions from that copy, or from any part of it. (Additional permissions may be written to require their own removal in certain cases when you modify the work.) You may place additional permissions on material, added by you to a covered work, for which you have or can give appropriate copyright permission.\n\nNotwithstanding any other provision of this License, for material you add to a covered work, you may (if authorized by the copyright holders of that material) supplement the terms of this License with terms:\n\n     a) Disclaiming warranty or limiting liability differently from the terms of sections 15 and 16 of this License; or\n\n     b) Requiring preservation of specified reasonable legal notices or author attributions in that material or in the Appropriate Legal Notices displayed by works containing it; or\n\n     c) Prohibiting misrepresentation of the origin of that material, or requiring that modified versions of such material be marked in reasonable ways as different from the original version; or\n\n     d) Limiting the use for publicity purposes of names of licensors or authors of the material; or\n\n     e) Declining to grant rights under trademark law for use of some trade names, trademarks, or service marks; or\n\n     f) Requiring indemnification of licensors and authors of that material by anyone who conveys the material (or modified versions of it) with contractual assumptions of liability to the recipient, for any liability that these contractual assumptions directly impose on those licensors and authors.\n\nAll other non-permissive additional terms are considered “further restrictions” within the meaning of section 10. If the Program as you received it, or any part of it, contains a notice stating that it is governed by this License along with a term that is a further restriction, you may remove that term. If a license document contains a further restriction but permits relicensing or conveying under this License, you may add to a covered work material governed by the terms of that license document, provided that the further restriction does not survive such relicensing or conveying.\n\nIf you add terms to a covered work in accord with this section, you must place, in the relevant source files, a statement of the additional terms that apply to those files, or a notice indicating where to find the applicable terms.\n\nAdditional terms, permissive or non-permissive, may be stated in the form of a separately written license, or stated as exceptions; the above requirements apply either way.\n\n8. Termination.\nYou may not propagate or modify a covered work except as expressly provided under this License. Any attempt otherwise to propagate or modify it is void, and will automatically terminate your rights under this License (including any patent licenses granted under the third paragraph of section 11).\n\nHowever, if you cease all violation of this License, then your license from a particular copyright holder is reinstated (a) provisionally, unless and until the copyright holder explicitly and finally terminates your license, and (b) permanently, if the copyright holder fails to notify you of the violation by some reasonable means prior to 60 days after the cessation.\n\nMoreover, your license from a particular copyright holder is reinstated permanently if the copyright holder notifies you of the violation by some reasonable means, this is the first time you have received notice of violation of this License (for any work) from that copyright holder, and you cure the violation prior to 30 days after your receipt of the notice.\n\nTermination of your rights under this section does not terminate the licenses of parties who have received copies or rights from you under this License. If your rights have been terminated and not permanently reinstated, you do not qualify to receive new licenses for the same material under section 10.\n\n9. Acceptance Not Required for Having Copies.\nYou are not required to accept this License in order to receive or run a copy of the Program. Ancillary propagation of a covered work occurring solely as a consequence of using peer-to-peer transmission to receive a copy likewise does not require acceptance. However, nothing other than this License grants you permission to propagate or modify any covered work. These actions infringe copyright if you do not accept this License. Therefore, by modifying or propagating a covered work, you indicate your acceptance of this License to do so.\n\n10. Automatic Licensing of Downstream Recipients.\nEach time you convey a covered work, the recipient automatically receives a license from the original licensors, to run, modify and propagate that work, subject to this License. You are not responsible for enforcing compliance by third parties with this License.\n\nAn “entity transaction” is a transaction transferring control of an organization, or substantially all assets of one, or subdividing an organization, or merging organizations. If propagation of a covered work results from an entity transaction, each party to that transaction who receives a copy of the work also receives whatever licenses to the work the party's predecessor in interest had or could give under the previous paragraph, plus a right to possession of the Corresponding Source of the work from the predecessor in interest, if the predecessor has it or can get it with reasonable efforts.\n\nYou may not impose any further restrictions on the exercise of the rights granted or affirmed under this License. For example, you may not impose a license fee, royalty, or other charge for exercise of rights granted under this License, and you may not initiate litigation (including a cross-claim or counterclaim in a lawsuit) alleging that any patent claim is infringed by making, using, selling, offering for sale, or importing the Program or any portion of it.\n\n11. Patents.\nA “contributor” is a copyright holder who authorizes use under this License of the Program or a work on which the Program is based. The work thus licensed is called the contributor's “contributor version”.\n\nA contributor's “essential patent claims” are all patent claims owned or controlled by the contributor, whether already acquired or hereafter acquired, that would be infringed by some manner, permitted by this License, of making, using, or selling its contributor version, but do not include claims that would be infringed only as a consequence of further modification of the contributor version. For purposes of this definition, “control” includes the right to grant patent sublicenses in a manner consistent with the requirements of this License.\n\nEach contributor grants you a non-exclusive, worldwide, royalty-free patent license under the contributor's essential patent claims, to make, use, sell, offer for sale, import and otherwise run, modify and propagate the contents of its contributor version.\n\nIn the following three paragraphs, a “patent license” is any express agreement or commitment, however denominated, not to enforce a patent (such as an express permission to practice a patent or covenant not to sue for patent infringement). To “grant” such a patent license to a party means to make such an agreement or commitment not to enforce a patent against the party.\n\nIf you convey a covered work, knowingly relying on a patent license, and the Corresponding Source of the work is not available for anyone to copy, free of charge and under the terms of this License, through a publicly available network server or other readily accessible means, then you must either (1) cause the Corresponding Source to be so available, or (2) arrange to deprive yourself of the benefit of the patent license for this particular work, or (3) arrange, in a manner consistent with the requirements of this License, to extend the patent license to downstream recipients. “Knowingly relying” means you have actual knowledge that, but for the patent license, your conveying the covered work in a country, or your recipient's use of the covered work in a country, would infringe one or more identifiable patents in that country that you have reason to believe are valid.\n\nIf, pursuant to or in connection with a single transaction or arrangement, you convey, or propagate by procuring conveyance of, a covered work, and grant a patent license to some of the parties receiving the covered work authorizing them to use, propagate, modify or convey a specific copy of the covered work, then the patent license you grant is automatically extended to all recipients of the covered work and works based on it.\n\nA patent license is “discriminatory” if it does not include within the scope of its coverage, prohibits the exercise of, or is conditioned on the non-exercise of one or more of the rights that are specifically granted under this License. You may not convey a covered work if you are a party to an arrangement with a third party that is in the business of distributing software, under which you make payment to the third party based on the extent of your activity of conveying the work, and under which the third party grants, to any of the parties who would receive the covered work from you, a discriminatory patent license (a) in connection with copies of the covered work conveyed by you (or copies made from those copies), or (b) primarily for and in connection with specific products or compilations that contain the covered work, unless you entered into that arrangement, or that patent license was granted, prior to 28 March 2007.\n\nNothing in this License shall be construed as excluding or limiting any implied license or other defenses to infringement that may otherwise be available to you under applicable patent law.\n\n12. No Surrender of Others' Freedom.\nIf conditions are imposed on you (whether by court order, agreement or otherwise) that contradict the conditions of this License, they do not excuse you from the conditions of this License. If you cannot convey a covered work so as to satisfy simultaneously your obligations under this License and any other pertinent obligations, then as a consequence you may not convey it at all. For example, if you agree to terms that obligate you to collect a royalty for further conveying from those to whom you convey the Program, the only way you could satisfy both those terms and this License would be to refrain entirely from conveying the Program.\n\n13. Use with the GNU Affero General Public License.\nNotwithstanding any other provision of this License, you have permission to link or combine any covered work with a work licensed under version 3 of the GNU Affero General Public License into a single combined work, and to convey the resulting work. The terms of this License will continue to apply to the part which is the covered work, but the special requirements of the GNU Affero General Public License, section 13, concerning interaction through a network will apply to the combination as such.\n\n14. Revised Versions of this License.\nThe Free Software Foundation may publish revised and/or new versions of the GNU General Public License from time to time. Such new versions will be similar in spirit to the present version, but may differ in detail to address new problems or concerns.\n\nEach version is given a distinguishing version number. If the Program specifies that a certain numbered version of the GNU General Public License “or any later version” applies to it, you have the option of following the terms and conditions either of that numbered version or of any later version published by the Free Software Foundation. If the Program does not specify a version number of the GNU General Public License, you may choose any version ever published by the Free Software Foundation.\n\nIf the Program specifies that a proxy can decide which future versions of the GNU General Public License can be used, that proxy's public statement of acceptance of a version permanently authorizes you to choose that version for the Program.\n\nLater license versions may give you additional or different permissions. However, no additional obligations are imposed on any author or copyright holder as a result of your choosing to follow a later version.\n\n15. Disclaimer of Warranty.\nTHERE IS NO WARRANTY FOR THE PROGRAM, TO THE EXTENT PERMITTED BY APPLICABLE LAW. EXCEPT WHEN OTHERWISE STATED IN WRITING THE COPYRIGHT HOLDERS AND/OR OTHER PARTIES PROVIDE THE PROGRAM “AS IS” WITHOUT WARRANTY OF ANY KIND, EITHER EXPRESSED OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE. THE ENTIRE RISK AS TO THE QUALITY AND PERFORMANCE OF THE PROGRAM IS WITH YOU. SHOULD THE PROGRAM PROVE DEFECTIVE, YOU ASSUME THE COST OF ALL NECESSARY SERVICING, REPAIR OR CORRECTION.\n\n16. Limitation of Liability.\nIN NO EVENT UNLESS REQUIRED BY APPLICABLE LAW OR AGREED TO IN WRITING WILL ANY COPYRIGHT HOLDER, OR ANY OTHER PARTY WHO MODIFIES AND/OR CONVEYS THE PROGRAM AS PERMITTED ABOVE, BE LIABLE TO YOU FOR DAMAGES, INCLUDING ANY GENERAL, SPECIAL, INCIDENTAL OR CONSEQUENTIAL DAMAGES ARISING OUT OF THE USE OR INABILITY TO USE THE PROGRAM (INCLUDING BUT NOT LIMITED TO LOSS OF DATA OR DATA BEING RENDERED INACCURATE OR LOSSES SUSTAINED BY YOU OR THIRD PARTIES OR A FAILURE OF THE PROGRAM TO OPERATE WITH ANY OTHER PROGRAMS), EVEN IF SUCH HOLDER OR OTHER PARTY HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.\n\n17. Interpretation of Sections 15 and 16.\nIf the disclaimer of warranty and limitation of liability provided above cannot be given local legal effect according to their terms, reviewing courts shall apply local law that most closely approximates an absolute waiver of all civil liability in connection with the Program, unless a warranty or assumption of liability accompanies a copy of the Program in return for a fee.\n\nEND OF TERMS AND CONDITIONS\n\nHow to Apply These Terms to Your New Programs\n\nIf you develop a new program, and you want it to be of the greatest possible use to the public, the best way to achieve this is to make it free software which everyone can redistribute and change under these terms.\n\nTo do so, attach the following notices to the program. It is safest to attach them to the start of each source file to most effectively state the exclusion of warranty; and each file should have at least the “copyright” line and a pointer to where the full notice is found.\n\n     <one line to give the program's name and a brief idea of what it does.>\n     Copyright (C) <year>  <name of author>\n\n     This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.\n\n     This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.\n\n     You should have received a copy of the GNU General Public License along with this program.  If not, see <http://www.gnu.org/licenses/>.\n\nAlso add information on how to contact you by electronic and paper mail.\n\nIf the program does terminal interaction, make it output a short notice like this when it starts in an interactive mode:\n\n     <program>  Copyright (C) <year>  <name of author>\n     This program comes with ABSOLUTELY NO WARRANTY; for details type `show w'.\n     This is free software, and you are welcome to redistribute it under certain conditions; type `show c' for details.\n\nThe hypothetical commands `show w' and `show c' should show the appropriate parts of the General Public License. Of course, your program's commands might be different; for a GUI interface, you would use an “about box”.\n\nYou should also get your employer (if you work as a programmer) or school, if any, to sign a “copyright disclaimer” for the program, if necessary. For more information on this, and how to apply and follow the GNU GPL, see <http://www.gnu.org/licenses/>.\n\nThe GNU General Public License does not permit incorporating your program into proprietary programs. If your program is a subroutine library, you may consider it more useful to permit linking proprietary applications with the library. If this is what you want to do, use the GNU Lesser General Public License instead of this License. But first, please read <http://www.gnu.org/philosophy/why-not-lgpl.html>.\n",
  "GPL-3.0":
    "GNU GENERAL PUBLIC LICENSE\nVersion 3, 29 June 2007\n\nCopyright © 2007 Free Software Foundation, Inc. <https://fsf.org/>\n\nEveryone is permitted to copy and distribute verbatim copies of this license document, but changing it is not allowed.\n\nPreamble\n\nThe GNU General Public License is a free, copyleft license for software and other kinds of works.\n\nThe licenses for most software and other practical works are designed to take away your freedom to share and change the works. By contrast, the GNU General Public License is intended to guarantee your freedom to share and change all versions of a program--to make sure it remains free software for all its users. We, the Free Software Foundation, use the GNU General Public License for most of our software; it applies also to any other work released this way by its authors. You can apply it to your programs, too.\n\nWhen we speak of free software, we are referring to freedom, not price. Our General Public Licenses are designed to make sure that you have the freedom to distribute copies of free software (and charge for them if you wish), that you receive source code or can get it if you want it, that you can change the software or use pieces of it in new free programs, and that you know you can do these things.\n\nTo protect your rights, we need to prevent others from denying you these rights or asking you to surrender the rights. Therefore, you have certain responsibilities if you distribute copies of the software, or if you modify it: responsibilities to respect the freedom of others.\n\nFor example, if you distribute copies of such a program, whether gratis or for a fee, you must pass on to the recipients the same freedoms that you received. You must make sure that they, too, receive or can get the source code. And you must show them these terms so they know their rights.\n\nDevelopers that use the GNU GPL protect your rights with two steps: (1) assert copyright on the software, and (2) offer you this License giving you legal permission to copy, distribute and/or modify it.\n\nFor the developers' and authors' protection, the GPL clearly explains that there is no warranty for this free software. For both users' and authors' sake, the GPL requires that modified versions be marked as changed, so that their problems will not be attributed erroneously to authors of previous versions.\n\nSome devices are designed to deny users access to install or run modified versions of the software inside them, although the manufacturer can do so. This is fundamentally incompatible with the aim of protecting users' freedom to change the software. The systematic pattern of such abuse occurs in the area of products for individuals to use, which is precisely where it is most unacceptable. Therefore, we have designed this version of the GPL to prohibit the practice for those products. If such problems arise substantially in other domains, we stand ready to extend this provision to those domains in future versions of the GPL, as needed to protect the freedom of users.\n\nFinally, every program is threatened constantly by software patents. States should not allow patents to restrict development and use of software on general-purpose computers, but in those that do, we wish to avoid the special danger that patents applied to a free program could make it effectively proprietary. To prevent this, the GPL assures that patents cannot be used to render the program non-free.\n\nThe precise terms and conditions for copying, distribution and modification follow.\n\nTERMS AND CONDITIONS\n\n0. Definitions.\n\n“This License” refers to version 3 of the GNU General Public License.\n\n“Copyright” also means copyright-like laws that apply to other kinds of works, such as semiconductor masks.\n\n“The Program” refers to any copyrightable work licensed under this License. Each licensee is addressed as “you”. “Licensees” and “recipients” may be individuals or organizations.\n\nTo “modify” a work means to copy from or adapt all or part of the work in a fashion requiring copyright permission, other than the making of an exact copy. The resulting work is called a “modified version” of the earlier work or a work “based on” the earlier work.\n\nA “covered work” means either the unmodified Program or a work based on the Program.\n\nTo “propagate” a work means to do anything with it that, without permission, would make you directly or secondarily liable for infringement under applicable copyright law, except executing it on a computer or modifying a private copy. Propagation includes copying, distribution (with or without modification), making available to the public, and in some countries other activities as well.\n\nTo “convey” a work means any kind of propagation that enables other parties to make or receive copies. Mere interaction with a user through a computer network, with no transfer of a copy, is not conveying.\n\nAn interactive user interface displays “Appropriate Legal Notices” to the extent that it includes a convenient and prominently visible feature that (1) displays an appropriate copyright notice, and (2) tells the user that there is no warranty for the work (except to the extent that warranties are provided), that licensees may convey the work under this License, and how to view a copy of this License. If the interface presents a list of user commands or options, such as a menu, a prominent item in the list meets this criterion.\n\n1. Source Code.\nThe “source code” for a work means the preferred form of the work for making modifications to it. “Object code” means any non-source form of a work.\n\nA “Standard Interface” means an interface that either is an official standard defined by a recognized standards body, or, in the case of interfaces specified for a particular programming language, one that is widely used among developers working in that language.\n\nThe “System Libraries” of an executable work include anything, other than the work as a whole, that (a) is included in the normal form of packaging a Major Component, but which is not part of that Major Component, and (b) serves only to enable use of the work with that Major Component, or to implement a Standard Interface for which an implementation is available to the public in source code form. A “Major Component”, in this context, means a major essential component (kernel, window system, and so on) of the specific operating system (if any) on which the executable work runs, or a compiler used to produce the work, or an object code interpreter used to run it.\n\nThe “Corresponding Source” for a work in object code form means all the source code needed to generate, install, and (for an executable work) run the object code and to modify the work, including scripts to control those activities. However, it does not include the work's System Libraries, or general-purpose tools or generally available free programs which are used unmodified in performing those activities but which are not part of the work. For example, Corresponding Source includes interface definition files associated with source files for the work, and the source code for shared libraries and dynamically linked subprograms that the work is specifically designed to require, such as by intimate data communication or control flow between those subprograms and other parts of the work.\n\nThe Corresponding Source need not include anything that users can regenerate automatically from other parts of the Corresponding Source.\n\nThe Corresponding Source for a work in source code form is that same work.\n\n2. Basic Permissions.\nAll rights granted under this License are granted for the term of copyright on the Program, and are irrevocable provided the stated conditions are met. This License explicitly affirms your unlimited permission to run the unmodified Program. The output from running a covered work is covered by this License only if the output, given its content, constitutes a covered work. This License acknowledges your rights of fair use or other equivalent, as provided by copyright law.\n\nYou may make, run and propagate covered works that you do not convey, without conditions so long as your license otherwise remains in force. You may convey covered works to others for the sole purpose of having them make modifications exclusively for you, or provide you with facilities for running those works, provided that you comply with the terms of this License in conveying all material for which you do not control copyright. Those thus making or running the covered works for you must do so exclusively on your behalf, under your direction and control, on terms that prohibit them from making any copies of your copyrighted material outside their relationship with you.\n\nConveying under any other circumstances is permitted solely under the conditions stated below. Sublicensing is not allowed; section 10 makes it unnecessary.\n\n3. Protecting Users' Legal Rights From Anti-Circumvention Law.\nNo covered work shall be deemed part of an effective technological measure under any applicable law fulfilling obligations under article 11 of the WIPO copyright treaty adopted on 20 December 1996, or similar laws prohibiting or restricting circumvention of such measures.\n\nWhen you convey a covered work, you waive any legal power to forbid circumvention of technological measures to the extent such circumvention is effected by exercising rights under this License with respect to the covered work, and you disclaim any intention to limit operation or modification of the work as a means of enforcing, against the work's users, your or third parties' legal rights to forbid circumvention of technological measures.\n\n4. Conveying Verbatim Copies.\nYou may convey verbatim copies of the Program's source code as you receive it, in any medium, provided that you conspicuously and appropriately publish on each copy an appropriate copyright notice; keep intact all notices stating that this License and any non-permissive terms added in accord with section 7 apply to the code; keep intact all notices of the absence of any warranty; and give all recipients a copy of this License along with the Program.\n\nYou may charge any price or no price for each copy that you convey, and you may offer support or warranty protection for a fee.\n\n5. Conveying Modified Source Versions.\nYou may convey a work based on the Program, or the modifications to produce it from the Program, in the form of source code under the terms of section 4, provided that you also meet all of these conditions:\n\n     a) The work must carry prominent notices stating that you modified it, and giving a relevant date.\n\n     b) The work must carry prominent notices stating that it is released under this License and any conditions added under section 7. This requirement modifies the requirement in section 4 to “keep intact all notices”.\n\n     c) You must license the entire work, as a whole, under this License to anyone who comes into possession of a copy. This License will therefore apply, along with any applicable section 7 additional terms, to the whole of the work, and all its parts, regardless of how they are packaged. This License gives no permission to license the work in any other way, but it does not invalidate such permission if you have separately received it.\n\n     d) If the work has interactive user interfaces, each must display Appropriate Legal Notices; however, if the Program has interactive interfaces that do not display Appropriate Legal Notices, your work need not make them do so.\n\nA compilation of a covered work with other separate and independent works, which are not by their nature extensions of the covered work, and which are not combined with it such as to form a larger program, in or on a volume of a storage or distribution medium, is called an “aggregate” if the compilation and its resulting copyright are not used to limit the access or legal rights of the compilation's users beyond what the individual works permit. Inclusion of a covered work in an aggregate does not cause this License to apply to the other parts of the aggregate.\n\n6. Conveying Non-Source Forms.\nYou may convey a covered work in object code form under the terms of sections 4 and 5, provided that you also convey the machine-readable Corresponding Source under the terms of this License, in one of these ways:\n\n     a) Convey the object code in, or embodied in, a physical product (including a physical distribution medium), accompanied by the Corresponding Source fixed on a durable physical medium customarily used for software interchange.\n\n     b) Convey the object code in, or embodied in, a physical product (including a physical distribution medium), accompanied by a written offer, valid for at least three years and valid for as long as you offer spare parts or customer support for that product model, to give anyone who possesses the object code either (1) a copy of the Corresponding Source for all the software in the product that is covered by this License, on a durable physical medium customarily used for software interchange, for a price no more than your reasonable cost of physically performing this conveying of source, or (2) access to copy the Corresponding Source from a network server at no charge.\n\n     c) Convey individual copies of the object code with a copy of the written offer to provide the Corresponding Source. This alternative is allowed only occasionally and noncommercially, and only if you received the object code with such an offer, in accord with subsection 6b.\n\n     d) Convey the object code by offering access from a designated place (gratis or for a charge), and offer equivalent access to the Corresponding Source in the same way through the same place at no further charge. You need not require recipients to copy the Corresponding Source along with the object code. If the place to copy the object code is a network server, the Corresponding Source may be on a different server (operated by you or a third party) that supports equivalent copying facilities, provided you maintain clear directions next to the object code saying where to find the Corresponding Source. Regardless of what server hosts the Corresponding Source, you remain obligated to ensure that it is available for as long as needed to satisfy these requirements.\n\n     e) Convey the object code using peer-to-peer transmission, provided you inform other peers where the object code and Corresponding Source of the work are being offered to the general public at no charge under subsection 6d.\n\nA separable portion of the object code, whose source code is excluded from the Corresponding Source as a System Library, need not be included in conveying the object code work.\n\nA “User Product” is either (1) a “consumer product”, which means any tangible personal property which is normally used for personal, family, or household purposes, or (2) anything designed or sold for incorporation into a dwelling. In determining whether a product is a consumer product, doubtful cases shall be resolved in favor of coverage. For a particular product received by a particular user, “normally used” refers to a typical or common use of that class of product, regardless of the status of the particular user or of the way in which the particular user actually uses, or expects or is expected to use, the product. A product is a consumer product regardless of whether the product has substantial commercial, industrial or non-consumer uses, unless such uses represent the only significant mode of use of the product.\n\n“Installation Information” for a User Product means any methods, procedures, authorization keys, or other information required to install and execute modified versions of a covered work in that User Product from a modified version of its Corresponding Source. The information must suffice to ensure that the continued functioning of the modified object code is in no case prevented or interfered with solely because modification has been made.\n\nIf you convey an object code work under this section in, or with, or specifically for use in, a User Product, and the conveying occurs as part of a transaction in which the right of possession and use of the User Product is transferred to the recipient in perpetuity or for a fixed term (regardless of how the transaction is characterized), the Corresponding Source conveyed under this section must be accompanied by the Installation Information. But this requirement does not apply if neither you nor any third party retains the ability to install modified object code on the User Product (for example, the work has been installed in ROM).\n\nThe requirement to provide Installation Information does not include a requirement to continue to provide support service, warranty, or updates for a work that has been modified or installed by the recipient, or for the User Product in which it has been modified or installed. Access to a network may be denied when the modification itself materially and adversely affects the operation of the network or violates the rules and protocols for communication across the network.\n\nCorresponding Source conveyed, and Installation Information provided, in accord with this section must be in a format that is publicly documented (and with an implementation available to the public in source code form), and must require no special password or key for unpacking, reading or copying.\n\n7. Additional Terms.\n“Additional permissions” are terms that supplement the terms of this License by making exceptions from one or more of its conditions. Additional permissions that are applicable to the entire Program shall be treated as though they were included in this License, to the extent that they are valid under applicable law. If additional permissions apply only to part of the Program, that part may be used separately under those permissions, but the entire Program remains governed by this License without regard to the additional permissions.\n\nWhen you convey a copy of a covered work, you may at your option remove any additional permissions from that copy, or from any part of it. (Additional permissions may be written to require their own removal in certain cases when you modify the work.) You may place additional permissions on material, added by you to a covered work, for which you have or can give appropriate copyright permission.\n\nNotwithstanding any other provision of this License, for material you add to a covered work, you may (if authorized by the copyright holders of that material) supplement the terms of this License with terms:\n\n     a) Disclaiming warranty or limiting liability differently from the terms of sections 15 and 16 of this License; or\n\n     b) Requiring preservation of specified reasonable legal notices or author attributions in that material or in the Appropriate Legal Notices displayed by works containing it; or\n\n     c) Prohibiting misrepresentation of the origin of that material, or requiring that modified versions of such material be marked in reasonable ways as different from the original version; or\n\n     d) Limiting the use for publicity purposes of names of licensors or authors of the material; or\n\n     e) Declining to grant rights under trademark law for use of some trade names, trademarks, or service marks; or\n\n     f) Requiring indemnification of licensors and authors of that material by anyone who conveys the material (or modified versions of it) with contractual assumptions of liability to the recipient, for any liability that these contractual assumptions directly impose on those licensors and authors.\n\nAll other non-permissive additional terms are considered “further restrictions” within the meaning of section 10. If the Program as you received it, or any part of it, contains a notice stating that it is governed by this License along with a term that is a further restriction, you may remove that term. If a license document contains a further restriction but permits relicensing or conveying under this License, you may add to a covered work material governed by the terms of that license document, provided that the further restriction does not survive such relicensing or conveying.\n\nIf you add terms to a covered work in accord with this section, you must place, in the relevant source files, a statement of the additional terms that apply to those files, or a notice indicating where to find the applicable terms.\n\nAdditional terms, permissive or non-permissive, may be stated in the form of a separately written license, or stated as exceptions; the above requirements apply either way.\n\n8. Termination.\nYou may not propagate or modify a covered work except as expressly provided under this License. Any attempt otherwise to propagate or modify it is void, and will automatically terminate your rights under this License (including any patent licenses granted under the third paragraph of section 11).\n\nHowever, if you cease all violation of this License, then your license from a particular copyright holder is reinstated (a) provisionally, unless and until the copyright holder explicitly and finally terminates your license, and (b) permanently, if the copyright holder fails to notify you of the violation by some reasonable means prior to 60 days after the cessation.\n\nMoreover, your license from a particular copyright holder is reinstated permanently if the copyright holder notifies you of the violation by some reasonable means, this is the first time you have received notice of violation of this License (for any work) from that copyright holder, and you cure the violation prior to 30 days after your receipt of the notice.\n\nTermination of your rights under this section does not terminate the licenses of parties who have received copies or rights from you under this License. If your rights have been terminated and not permanently reinstated, you do not qualify to receive new licenses for the same material under section 10.\n\n9. Acceptance Not Required for Having Copies.\nYou are not required to accept this License in order to receive or run a copy of the Program. Ancillary propagation of a covered work occurring solely as a consequence of using peer-to-peer transmission to receive a copy likewise does not require acceptance. However, nothing other than this License grants you permission to propagate or modify any covered work. These actions infringe copyright if you do not accept this License. Therefore, by modifying or propagating a covered work, you indicate your acceptance of this License to do so.\n\n10. Automatic Licensing of Downstream Recipients.\nEach time you convey a covered work, the recipient automatically receives a license from the original licensors, to run, modify and propagate that work, subject to this License. You are not responsible for enforcing compliance by third parties with this License.\n\nAn “entity transaction” is a transaction transferring control of an organization, or substantially all assets of one, or subdividing an organization, or merging organizations. If propagation of a covered work results from an entity transaction, each party to that transaction who receives a copy of the work also receives whatever licenses to the work the party's predecessor in interest had or could give under the previous paragraph, plus a right to possession of the Corresponding Source of the work from the predecessor in interest, if the predecessor has it or can get it with reasonable efforts.\n\nYou may not impose any further restrictions on the exercise of the rights granted or affirmed under this License. For example, you may not impose a license fee, royalty, or other charge for exercise of rights granted under this License, and you may not initiate litigation (including a cross-claim or counterclaim in a lawsuit) alleging that any patent claim is infringed by making, using, selling, offering for sale, or importing the Program or any portion of it.\n\n11. Patents.\nA “contributor” is a copyright holder who authorizes use under this License of the Program or a work on which the Program is based. The work thus licensed is called the contributor's “contributor version”.\n\nA contributor's “essential patent claims” are all patent claims owned or controlled by the contributor, whether already acquired or hereafter acquired, that would be infringed by some manner, permitted by this License, of making, using, or selling its contributor version, but do not include claims that would be infringed only as a consequence of further modification of the contributor version. For purposes of this definition, “control” includes the right to grant patent sublicenses in a manner consistent with the requirements of this License.\n\nEach contributor grants you a non-exclusive, worldwide, royalty-free patent license under the contributor's essential patent claims, to make, use, sell, offer for sale, import and otherwise run, modify and propagate the contents of its contributor version.\n\nIn the following three paragraphs, a “patent license” is any express agreement or commitment, however denominated, not to enforce a patent (such as an express permission to practice a patent or covenant not to sue for patent infringement). To “grant” such a patent license to a party means to make such an agreement or commitment not to enforce a patent against the party.\n\nIf you convey a covered work, knowingly relying on a patent license, and the Corresponding Source of the work is not available for anyone to copy, free of charge and under the terms of this License, through a publicly available network server or other readily accessible means, then you must either (1) cause the Corresponding Source to be so available, or (2) arrange to deprive yourself of the benefit of the patent license for this particular work, or (3) arrange, in a manner consistent with the requirements of this License, to extend the patent license to downstream recipients. “Knowingly relying” means you have actual knowledge that, but for the patent license, your conveying the covered work in a country, or your recipient's use of the covered work in a country, would infringe one or more identifiable patents in that country that you have reason to believe are valid.\n\nIf, pursuant to or in connection with a single transaction or arrangement, you convey, or propagate by procuring conveyance of, a covered work, and grant a patent license to some of the parties receiving the covered work authorizing them to use, propagate, modify or convey a specific copy of the covered work, then the patent license you grant is automatically extended to all recipients of the covered work and works based on it.\n\nA patent license is “discriminatory” if it does not include within the scope of its coverage, prohibits the exercise of, or is conditioned on the non-exercise of one or more of the rights that are specifically granted under this License. You may not convey a covered work if you are a party to an arrangement with a third party that is in the business of distributing software, under which you make payment to the third party based on the extent of your activity of conveying the work, and under which the third party grants, to any of the parties who would receive the covered work from you, a discriminatory patent license (a) in connection with copies of the covered work conveyed by you (or copies made from those copies), or (b) primarily for and in connection with specific products or compilations that contain the covered work, unless you entered into that arrangement, or that patent license was granted, prior to 28 March 2007.\n\nNothing in this License shall be construed as excluding or limiting any implied license or other defenses to infringement that may otherwise be available to you under applicable patent law.\n\n12. No Surrender of Others' Freedom.\nIf conditions are imposed on you (whether by court order, agreement or otherwise) that contradict the conditions of this License, they do not excuse you from the conditions of this License. If you cannot convey a covered work so as to satisfy simultaneously your obligations under this License and any other pertinent obligations, then as a consequence you may not convey it at all. For example, if you agree to terms that obligate you to collect a royalty for further conveying from those to whom you convey the Program, the only way you could satisfy both those terms and this License would be to refrain entirely from conveying the Program.\n\n13. Use with the GNU Affero General Public License.\nNotwithstanding any other provision of this License, you have permission to link or combine any covered work with a work licensed under version 3 of the GNU Affero General Public License into a single combined work, and to convey the resulting work. The terms of this License will continue to apply to the part which is the covered work, but the special requirements of the GNU Affero General Public License, section 13, concerning interaction through a network will apply to the combination as such.\n\n14. Revised Versions of this License.\nThe Free Software Foundation may publish revised and/or new versions of the GNU General Public License from time to time. Such new versions will be similar in spirit to the present version, but may differ in detail to address new problems or concerns.\n\nEach version is given a distinguishing version number. If the Program specifies that a certain numbered version of the GNU General Public License “or any later version” applies to it, you have the option of following the terms and conditions either of that numbered version or of any later version published by the Free Software Foundation. If the Program does not specify a version number of the GNU General Public License, you may choose any version ever published by the Free Software Foundation.\n\nIf the Program specifies that a proxy can decide which future versions of the GNU General Public License can be used, that proxy's public statement of acceptance of a version permanently authorizes you to choose that version for the Program.\n\nLater license versions may give you additional or different permissions. However, no additional obligations are imposed on any author or copyright holder as a result of your choosing to follow a later version.\n\n15. Disclaimer of Warranty.\nTHERE IS NO WARRANTY FOR THE PROGRAM, TO THE EXTENT PERMITTED BY APPLICABLE LAW. EXCEPT WHEN OTHERWISE STATED IN WRITING THE COPYRIGHT HOLDERS AND/OR OTHER PARTIES PROVIDE THE PROGRAM “AS IS” WITHOUT WARRANTY OF ANY KIND, EITHER EXPRESSED OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE. THE ENTIRE RISK AS TO THE QUALITY AND PERFORMANCE OF THE PROGRAM IS WITH YOU. SHOULD THE PROGRAM PROVE DEFECTIVE, YOU ASSUME THE COST OF ALL NECESSARY SERVICING, REPAIR OR CORRECTION.\n\n16. Limitation of Liability.\nIN NO EVENT UNLESS REQUIRED BY APPLICABLE LAW OR AGREED TO IN WRITING WILL ANY COPYRIGHT HOLDER, OR ANY OTHER PARTY WHO MODIFIES AND/OR CONVEYS THE PROGRAM AS PERMITTED ABOVE, BE LIABLE TO YOU FOR DAMAGES, INCLUDING ANY GENERAL, SPECIAL, INCIDENTAL OR CONSEQUENTIAL DAMAGES ARISING OUT OF THE USE OR INABILITY TO USE THE PROGRAM (INCLUDING BUT NOT LIMITED TO LOSS OF DATA OR DATA BEING RENDERED INACCURATE OR LOSSES SUSTAINED BY YOU OR THIRD PARTIES OR A FAILURE OF THE PROGRAM TO OPERATE WITH ANY OTHER PROGRAMS), EVEN IF SUCH HOLDER OR OTHER PARTY HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.\n\n17. Interpretation of Sections 15 and 16.\nIf the disclaimer of warranty and limitation of liability provided above cannot be given local legal effect according to their terms, reviewing courts shall apply local law that most closely approximates an absolute waiver of all civil liability in connection with the Program, unless a warranty or assumption of liability accompanies a copy of the Program in return for a fee.\n\nEND OF TERMS AND CONDITIONS\n\nHow to Apply These Terms to Your New Programs\n\nIf you develop a new program, and you want it to be of the greatest possible use to the public, the best way to achieve this is to make it free software which everyone can redistribute and change under these terms.\n\nTo do so, attach the following notices to the program. It is safest to attach them to the start of each source file to most effectively state the exclusion of warranty; and each file should have at least the “copyright” line and a pointer to where the full notice is found.\n\n     <one line to give the program's name and a brief idea of what it does.>\n     Copyright (C) <year>  <name of author>\n\n     This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.\n\n     This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.\n\n     You should have received a copy of the GNU General Public License along with this program.  If not, see <https://www.gnu.org/licenses/>.\n\nAlso add information on how to contact you by electronic and paper mail.\n\nIf the program does terminal interaction, make it output a short notice like this when it starts in an interactive mode:\n\n     <program>  Copyright (C) <year>  <name of author>\n     This program comes with ABSOLUTELY NO WARRANTY; for details type `show w'.\n     This is free software, and you are welcome to redistribute it under certain conditions; type `show c' for details.\n\nThe hypothetical commands `show w' and `show c' should show the appropriate parts of the General Public License. Of course, your program's commands might be different; for a GUI interface, you would use an “about box”.\n\nYou should also get your employer (if you work as a programmer) or school, if any, to sign a “copyright disclaimer” for the program, if necessary. For more information on this, and how to apply and follow the GNU GPL, see <https://www.gnu.org/licenses/>.\n\nThe GNU General Public License does not permit incorporating your program into proprietary programs. If your program is a subroutine library, you may consider it more useful to permit linking proprietary applications with the library. If this is what you want to do, use the GNU Lesser General Public License instead of this License. But first, please read <https://www.gnu.org/philosophy/why-not-lgpl.html>.\n",
  "AGPL-3.0":
    'GNU AFFERO GENERAL PUBLIC LICENSE\nVersion 3, 19 November 2007\n\nCopyright (C) 2007 Free Software Foundation, Inc. <http://fsf.org/>\n\nEveryone is permitted to copy and distribute verbatim copies of this license document, but changing it is not allowed.\n\n                            Preamble\n\nThe GNU Affero General Public License is a free, copyleft license for software and other kinds of works, specifically designed to ensure cooperation with the community in the case of network server software.\n\nThe licenses for most software and other practical works are designed to take away your freedom to share and change the works.  By contrast, our General Public Licenses are intended to guarantee your freedom to share and change all versions of a program--to make sure it remains free software for all its users.\n\nWhen we speak of free software, we are referring to freedom, not price.  Our General Public Licenses are designed to make sure that you have the freedom to distribute copies of free software (and charge for them if you wish), that you receive source code or can get it if you want it, that you can change the software or use pieces of it in new free programs, and that you know you can do these things.\n\nDevelopers that use our General Public Licenses protect your rights with two steps: (1) assert copyright on the software, and (2) offer you this License which gives you legal permission to copy, distribute and/or modify the software.\n\nA secondary benefit of defending all users\' freedom is that improvements made in alternate versions of the program, if they receive widespread use, become available for other developers to incorporate.  Many developers of free software are heartened and encouraged by the resulting cooperation.  However, in the case of software used on network servers, this result may fail to come about. The GNU General Public License permits making a modified version and letting the public access it on a server without ever releasing its source code to the public.\n\nThe GNU Affero General Public License is designed specifically to ensure that, in such cases, the modified source code becomes available to the community.  It requires the operator of a network server to provide the source code of the modified version running there to the users of that server.  Therefore, public use of a modified version, on a publicly accessible server, gives the public access to the source code of the modified version.\n\nAn older license, called the Affero General Public License and published by Affero, was designed to accomplish similar goals.  This is a different license, not a version of the Affero GPL, but Affero has released a new version of the Affero GPL which permits relicensing under this license.\n\nThe precise terms and conditions for copying, distribution and modification follow.\n\n                       TERMS AND CONDITIONS\n\n0. Definitions.\n\n"This License" refers to version 3 of the GNU Affero General Public License.\n\n"Copyright" also means copyright-like laws that apply to other kinds of works, such as semiconductor masks.\n\n"The Program" refers to any copyrightable work licensed under this License.  Each licensee is addressed as "you".  "Licensees" and "recipients" may be individuals or organizations.\n\nTo "modify" a work means to copy from or adapt all or part of the work in a fashion requiring copyright permission, other than the making of an exact copy.  The resulting work is called a "modified version" of the earlier work or a work "based on" the earlier work.\n\nA "covered work" means either the unmodified Program or a work based on the Program.\n\nTo "propagate" a work means to do anything with it that, without permission, would make you directly or secondarily liable for infringement under applicable copyright law, except executing it on a computer or modifying a private copy.  Propagation includes copying, distribution (with or without modification), making available to the public, and in some countries other activities as well.\n\nTo "convey" a work means any kind of propagation that enables other parties to make or receive copies.  Mere interaction with a user through a computer network, with no transfer of a copy, is not conveying.\n\nAn interactive user interface displays "Appropriate Legal Notices" to the extent that it includes a convenient and prominently visible feature that (1) displays an appropriate copyright notice, and (2) tells the user that there is no warranty for the work (except to the extent that warranties are provided), that licensees may convey the work under this License, and how to view a copy of this License.  If the interface presents a list of user commands or options, such as a menu, a prominent item in the list meets this criterion.\n\n1. Source Code.\nThe "source code" for a work means the preferred form of the work for making modifications to it.  "Object code" means any non-source form of a work.\n\nA "Standard Interface" means an interface that either is an official standard defined by a recognized standards body, or, in the case of interfaces specified for a particular programming language, one that is widely used among developers working in that language.\n\nThe "System Libraries" of an executable work include anything, other than the work as a whole, that (a) is included in the normal form of packaging a Major Component, but which is not part of that Major Component, and (b) serves only to enable use of the work with that Major Component, or to implement a Standard Interface for which an implementation is available to the public in source code form.  A "Major Component", in this context, means a major essential component (kernel, window system, and so on) of the specific operating system (if any) on which the executable work runs, or a compiler used to produce the work, or an object code interpreter used to run it.\n\nThe "Corresponding Source" for a work in object code form means all the source code needed to generate, install, and (for an executable work) run the object code and to modify the work, including scripts to control those activities.  However, it does not include the work\'s System Libraries, or general-purpose tools or generally available free programs which are used unmodified in performing those activities but which are not part of the work.  For example, Corresponding Source includes interface definition files associated with source files for the work, and the source code for shared libraries and dynamically linked subprograms that the work is specifically designed to require, such as by intimate data communication or control flow between those\nsubprograms and other parts of the work.\n\nThe Corresponding Source need not include anything that users can regenerate automatically from other parts of the Corresponding Source.\n\nThe Corresponding Source for a work in source code form is that same work.\n\n2. Basic Permissions.\nAll rights granted under this License are granted for the term of copyright on the Program, and are irrevocable provided the stated conditions are met.  This License explicitly affirms your unlimited permission to run the unmodified Program.  The output from running a covered work is covered by this License only if the output, given its content, constitutes a covered work.  This License acknowledges your rights of fair use or other equivalent, as provided by copyright law.\n\nYou may make, run and propagate covered works that you do not convey, without conditions so long as your license otherwise remains in force.  You may convey covered works to others for the sole purpose of having them make modifications exclusively for you, or provide you with facilities for running those works, provided that you comply with the terms of this License in conveying all material for which you do not control copyright.  Those thus making or running the covered works for you must do so exclusively on your behalf, under your direction and control, on terms that prohibit them from making any copies of your copyrighted material outside their relationship with you.\n\nConveying under any other circumstances is permitted solely under the conditions stated below.  Sublicensing is not allowed; section 10 makes it unnecessary.\n\n3. Protecting Users\' Legal Rights From Anti-Circumvention Law.\nNo covered work shall be deemed part of an effective technological measure under any applicable law fulfilling obligations under article 11 of the WIPO copyright treaty adopted on 20 December 1996, or similar laws prohibiting or restricting circumvention of such measures.\n\nWhen you convey a covered work, you waive any legal power to forbid circumvention of technological measures to the extent such circumvention is effected by exercising rights under this License with respect to the covered work, and you disclaim any intention to limit operation or modification of the work as a means of enforcing, against the work\'s users, your or third parties\' legal rights to forbid circumvention of technological measures.\n\n4. Conveying Verbatim Copies.\nYou may convey verbatim copies of the Program\'s source code as you receive it, in any medium, provided that you conspicuously and appropriately publish on each copy an appropriate copyright notice; keep intact all notices stating that this License and any non-permissive terms added in accord with section 7 apply to the code; keep intact all notices of the absence of any warranty; and give all recipients a copy of this License along with the Program.\n\nYou may charge any price or no price for each copy that you convey, and you may offer support or warranty protection for a fee.\n\n5. Conveying Modified Source Versions.\nYou may convey a work based on the Program, or the modifications to produce it from the Program, in the form of source code under the terms of section 4, provided that you also meet all of these conditions:\n\n    a) The work must carry prominent notices stating that you modified it, and giving a relevant date.\n\n    b) The work must carry prominent notices stating that it is released under this License and any conditions added under section 7.  This requirement modifies the requirement in section 4 to "keep intact all notices".\n\n    c) You must license the entire work, as a whole, under this License to anyone who comes into possession of a copy.  This License will therefore apply, along with any applicable section 7 additional terms, to the whole of the work, and all its parts, regardless of how they are packaged.  This License gives no permission to license the work in any other way, but it does not invalidate such permission if you have separately received it.\n\n    d) If the work has interactive user interfaces, each must display Appropriate Legal Notices; however, if the Program has interactive interfaces that do not display Appropriate Legal Notices, your work need not make them do so.\n\nA compilation of a covered work with other separate and independent works, which are not by their nature extensions of the covered work, and which are not combined with it such as to form a larger program, in or on a volume of a storage or distribution medium, is called an "aggregate" if the compilation and its resulting copyright are not used to limit the access or legal rights of the compilation\'s users beyond what the individual works permit.  Inclusion of a covered work in an aggregate does not cause this License to apply to the other parts of the aggregate.\n\n6. Conveying Non-Source Forms.\nYou may convey a covered work in object code form under the terms of sections 4 and 5, provided that you also convey the machine-readable Corresponding Source under the terms of this License, in one of these ways:\n\n    a) Convey the object code in, or embodied in, a physical product (including a physical distribution medium), accompanied by the Corresponding Source fixed on a durable physical medium customarily used for software interchange.\n\n    b) Convey the object code in, or embodied in, a physical product (including a physical distribution medium), accompanied by a written offer, valid for at least three years and valid for as long as you offer spare parts or customer support for that product model, to give anyone who possesses the object code either (1) a copy of the Corresponding Source for all the software in the product that is covered by this License, on a durable physical medium customarily used for software interchange, for a price no more than your reasonable cost of physically performing this conveying of source, or (2) access to copy the Corresponding Source from a network server at no charge.\n\n    c) Convey individual copies of the object code with a copy of the written offer to provide the Corresponding Source.  This alternative is allowed only occasionally and noncommercially, and only if you received the object code with such an offer, in accord with subsection 6b.\n\n    d) Convey the object code by offering access from a designated place (gratis or for a charge), and offer equivalent access to the Corresponding Source in the same way through the same place at no further charge.  You need not require recipients to copy the Corresponding Source along with the object code.  If the place to copy the object code is a network server, the Corresponding Source may be on a different server (operated by you or a third party) that supports equivalent copying facilities, provided you maintain clear directions next to the object code saying where to find the Corresponding Source.  Regardless of what server hosts the Corresponding Source, you remain obligated to ensure that it is available for as long as needed to satisfy these requirements.\n\n    e) Convey the object code using peer-to-peer transmission, provided you inform other peers where the object code and Corresponding Source of the work are being offered to the general public at no charge under subsection 6d.\n\nA separable portion of the object code, whose source code is excluded from the Corresponding Source as a System Library, need not be included in conveying the object code work.\n\nA "User Product" is either (1) a "consumer product", which means any tangible personal property which is normally used for personal, family, or household purposes, or (2) anything designed or sold for incorporation into a dwelling.  In determining whether a product is a consumer product, doubtful cases shall be resolved in favor of coverage.  For a particular product received by a particular user, "normally used" refers to a typical or common use of that class of product, regardless of the status of the particular user or of the way in which the particular user actually uses, or expects or is expected to use, the product.  A product is a consumer product regardless of whether the product has substantial commercial, industrial or non-consumer uses, unless such uses represent the only significant mode of use of the product.\n\n"Installation Information" for a User Product means any methods, procedures, authorization keys, or other information required to install and execute modified versions of a covered work in that User Product from a modified version of its Corresponding Source.  The information must suffice to ensure that the continued functioning of the modified object code is in no case prevented or interfered with solely because modification has been made.\n\nIf you convey an object code work under this section in, or with, or specifically for use in, a User Product, and the conveying occurs as part of a transaction in which the right of possession and use of the User Product is transferred to the recipient in perpetuity or for a fixed term (regardless of how the transaction is characterized), the Corresponding Source conveyed under this section must be accompanied by the Installation Information.  But this requirement does not apply if neither you nor any third party retains the ability to install modified object code on the User Product (for example, the work has been installed in ROM).\n\nThe requirement to provide Installation Information does not include a requirement to continue to provide support service, warranty, or updates for a work that has been modified or installed by the recipient, or for the User Product in which it has been modified or installed.  Access to a network may be denied when the modification itself materially and adversely affects the operation of the network or violates the rules and protocols for communication across the network.\n\nCorresponding Source conveyed, and Installation Information provided, in accord with this section must be in a format that is publicly documented (and with an implementation available to the public in source code form), and must require no special password or key for unpacking, reading or copying.\n\n7. Additional Terms.\n"Additional permissions" are terms that supplement the terms of this License by making exceptions from one or more of its conditions. Additional permissions that are applicable to the entire Program shall be treated as though they were included in this License, to the extent that they are valid under applicable law.  If additional permissions apply only to part of the Program, that part may be used separately under those permissions, but the entire Program remains governed by this License without regard to the additional permissions.\n\nWhen you convey a copy of a covered work, you may at your option remove any additional permissions from that copy, or from any part of it.  (Additional permissions may be written to require their own removal in certain cases when you modify the work.)  You may place additional permissions on material, added by you to a covered work, for which you have or can give appropriate copyright permission.\n\nNotwithstanding any other provision of this License, for material you add to a covered work, you may (if authorized by the copyright holders of that material) supplement the terms of this License with terms:\n\n    a) Disclaiming warranty or limiting liability differently from the terms of sections 15 and 16 of this License; or\n\n    b) Requiring preservation of specified reasonable legal notices or author attributions in that material or in the Appropriate Legal Notices displayed by works containing it; or\n\n    c) Prohibiting misrepresentation of the origin of that material, or requiring that modified versions of such material be marked in reasonable ways as different from the original version; or\n\n    d) Limiting the use for publicity purposes of names of licensors or authors of the material; or\n\n    e) Declining to grant rights under trademark law for use of some trade names, trademarks, or service marks; or\n\n    f) Requiring indemnification of licensors and authors of that material by anyone who conveys the material (or modified versions of it) with contractual assumptions of liability to the recipient, for any liability that these contractual assumptions directly impose on those licensors and authors.\n\nAll other non-permissive additional terms are considered "further restrictions" within the meaning of section 10.  If the Program as you received it, or any part of it, contains a notice stating that it is governed by this License along with a term that is a further restriction, you may remove that term.  If a license document contains a further restriction but permits relicensing or conveying under this License, you may add to a covered work material governed by the terms of that license document, provided that the further restriction does not survive such relicensing or conveying.\n\nIf you add terms to a covered work in accord with this section, you must place, in the relevant source files, a statement of the additional terms that apply to those files, or a notice indicating where to find the applicable terms.\n\nAdditional terms, permissive or non-permissive, may be stated in the form of a separately written license, or stated as exceptions; the above requirements apply either way.\n\n8. Termination.\n\nYou may not propagate or modify a covered work except as expressly provided under this License.  Any attempt otherwise to propagate or modify it is void, and will automatically terminate your rights under this License (including any patent licenses granted under the third paragraph of section 11).\n\nHowever, if you cease all violation of this License, then your license from a particular copyright holder is reinstated (a) provisionally, unless and until the copyright holder explicitly and finally terminates your license, and (b) permanently, if the copyright holder fails to notify you of the violation by some reasonable means prior to 60 days after the cessation.\n\nMoreover, your license from a particular copyright holder is reinstated permanently if the copyright holder notifies you of the violation by some reasonable means, this is the first time you have received notice of violation of this License (for any work) from that copyright holder, and you cure the violation prior to 30 days after your receipt of the notice.\n\nTermination of your rights under this section does not terminate the licenses of parties who have received copies or rights from you under this License.  If your rights have been terminated and not permanently reinstated, you do not qualify to receive new licenses for the same material under section 10.\n\n9. Acceptance Not Required for Having Copies.\n\nYou are not required to accept this License in order to receive or run a copy of the Program.  Ancillary propagation of a covered work occurring solely as a consequence of using peer-to-peer transmission to receive a copy likewise does not require acceptance.  However, nothing other than this License grants you permission to propagate or modify any covered work.  These actions infringe copyright if you do not accept this License.  Therefore, by modifying or propagating a covered work, you indicate your acceptance of this License to do so.\n\n10. Automatic Licensing of Downstream Recipients.\n\nEach time you convey a covered work, the recipient automatically receives a license from the original licensors, to run, modify and propagate that work, subject to this License.  You are not responsible for enforcing compliance by third parties with this License.\n\nAn "entity transaction" is a transaction transferring control of an organization, or substantially all assets of one, or subdividing an organization, or merging organizations.  If propagation of a covered work results from an entity transaction, each party to that transaction who receives a copy of the work also receives whatever licenses to the work the party\'s predecessor in interest had or could give under the previous paragraph, plus a right to possession of the Corresponding Source of the work from the predecessor in interest, if the predecessor has it or can get it with reasonable efforts.\n\nYou may not impose any further restrictions on the exercise of the rights granted or affirmed under this License.  For example, you may not impose a license fee, royalty, or other charge for exercise of rights granted under this License, and you may not initiate litigation (including a cross-claim or counterclaim in a lawsuit) alleging that any patent claim is infringed by making, using, selling, offering for sale, or importing the Program or any portion of it.\n\n11. Patents.\n\nA "contributor" is a copyright holder who authorizes use under this License of the Program or a work on which the Program is based.  The work thus licensed is called the contributor\'s "contributor version".\n\nA contributor\'s "essential patent claims" are all patent claims owned or controlled by the contributor, whether already acquired or hereafter acquired, that would be infringed by some manner, permitted by this License, of making, using, or selling its contributor version, but do not include claims that would be infringed only as a consequence of further modification of the contributor version.  For purposes of this definition, "control" includes the right to grant patent sublicenses in a manner consistent with the requirements of this License.\n\nEach contributor grants you a non-exclusive, worldwide, royalty-free patent license under the contributor\'s essential patent claims, to make, use, sell, offer for sale, import and otherwise run, modify and propagate the contents of its contributor version.\n\nIn the following three paragraphs, a "patent license" is any express agreement or commitment, however denominated, not to enforce a patent (such as an express permission to practice a patent or covenant not to sue for patent infringement).  To "grant" such a patent license to a party means to make such an agreement or commitment not to enforce a patent against the party.\n\nIf you convey a covered work, knowingly relying on a patent license, and the Corresponding Source of the work is not available for anyone to copy, free of charge and under the terms of this License, through a publicly available network server or other readily accessible means, then you must either (1) cause the Corresponding Source to be so available, or (2) arrange to deprive yourself of the benefit of the patent license for this particular work, or (3) arrange, in a manner consistent with the requirements of this License, to extend the patent\nlicense to downstream recipients.  "Knowingly relying" means you have actual knowledge that, but for the patent license, your conveying the covered work in a country, or your recipient\'s use of the covered work in a country, would infringe one or more identifiable patents in that country that you have reason to believe are valid.\n\nIf, pursuant to or in connection with a single transaction or arrangement, you convey, or propagate by procuring conveyance of, a covered work, and grant a patent license to some of the parties receiving the covered work authorizing them to use, propagate, modify or convey a specific copy of the covered work, then the patent license you grant is automatically extended to all recipients of the covered work and works based on it.\n\nA patent license is "discriminatory" if it does not include within the scope of its coverage, prohibits the exercise of, or is conditioned on the non-exercise of one or more of the rights that are specifically granted under this License.  You may not convey a covered work if you are a party to an arrangement with a third party that is in the business of distributing software, under which you make payment to the third party based on the extent of your activity of conveying the work, and under which the third party grants, to any of the parties who would receive the covered work from you, a discriminatory patent license (a) in connection with copies of the covered work conveyed by you (or copies made from those copies), or (b) primarily for and in connection with specific products or compilations that contain the covered work, unless you entered into that arrangement, or that patent license was granted, prior to 28 March 2007.\n\nNothing in this License shall be construed as excluding or limiting any implied license or other defenses to infringement that may otherwise be available to you under applicable patent law.\n\n12. No Surrender of Others\' Freedom.\n\nIf conditions are imposed on you (whether by court order, agreement or otherwise) that contradict the conditions of this License, they do not excuse you from the conditions of this License.  If you cannot convey a covered work so as to satisfy simultaneously your obligations under this License and any other pertinent obligations, then as a consequence you may\nnot convey it at all.  For example, if you agree to terms that obligate you to collect a royalty for further conveying from those to whom you convey the Program, the only way you could satisfy both those terms and this License would be to refrain entirely from conveying the Program.\n\n13. Remote Network Interaction; Use with the GNU General Public License.\n\nNotwithstanding any other provision of this License, if you modify the Program, your modified version must prominently offer all users interacting with it remotely through a computer network (if your version supports such interaction) an opportunity to receive the Corresponding Source of your version by providing access to the Corresponding Source from a network server at no charge, through some standard or customary means of facilitating copying of software.  This Corresponding Source shall include the Corresponding Source for any work covered by version 3 of the GNU General Public License that is incorporated pursuant to the following paragraph.\n\nNotwithstanding any other provision of this License, you have permission to link or combine any covered work with a work licensed under version 3 of the GNU General Public License into a single combined work, and to convey the resulting work.  The terms of this License will continue to apply to the part which is the covered work, but the work with which it is combined will remain governed by version 3 of the GNU General Public License.\n\n14. Revised Versions of this License.\n\nThe Free Software Foundation may publish revised and/or new versions of the GNU Affero General Public License from time to time.  Such new versions will be similar in spirit to the present version, but may differ in detail to address new problems or concerns.\n\nEach version is given a distinguishing version number.  If the Program specifies that a certain numbered version of the GNU Affero General Public License "or any later version" applies to it, you have the option of following the terms and conditions either of that numbered version or of any later version published by the Free Software Foundation.  If the Program does not specify a version number of the GNU Affero General Public License, you may choose any version ever published by the Free Software Foundation.\n\nIf the Program specifies that a proxy can decide which future versions of the GNU Affero General Public License can be used, that proxy\'s public statement of acceptance of a version permanently authorizes you to choose that version for the Program.\n\nLater license versions may give you additional or different permissions.  However, no additional obligations are imposed on any author or copyright holder as a result of your choosing to follow a later version.\n\n15. Disclaimer of Warranty.\n\nTHERE IS NO WARRANTY FOR THE PROGRAM, TO THE EXTENT PERMITTED BY APPLICABLE LAW.  EXCEPT WHEN OTHERWISE STATED IN WRITING THE COPYRIGHT HOLDERS AND/OR OTHER PARTIES PROVIDE THE PROGRAM "AS IS" WITHOUT WARRANTY OF ANY KIND, EITHER EXPRESSED OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.  THE ENTIRE RISK AS TO THE QUALITY AND PERFORMANCE OF THE PROGRAM IS WITH YOU.  SHOULD THE PROGRAM PROVE DEFECTIVE, YOU ASSUME THE COST OF ALL NECESSARY SERVICING, REPAIR OR CORRECTION.\n\n16. Limitation of Liability.\n\nIN NO EVENT UNLESS REQUIRED BY APPLICABLE LAW OR AGREED TO IN WRITING WILL ANY COPYRIGHT HOLDER, OR ANY OTHER PARTY WHO MODIFIES AND/OR CONVEYS THE PROGRAM AS PERMITTED ABOVE, BE LIABLE TO YOU FOR DAMAGES, INCLUDING ANY GENERAL, SPECIAL, INCIDENTAL OR CONSEQUENTIAL DAMAGES ARISING OUT OF THE USE OR INABILITY TO USE THE PROGRAM (INCLUDING BUT NOT LIMITED TO LOSS OF DATA OR DATA BEING RENDERED INACCURATE OR LOSSES SUSTAINED BY YOU OR THIRD PARTIES OR A FAILURE OF THE PROGRAM TO OPERATE WITH ANY OTHER PROGRAMS), EVEN IF SUCH HOLDER OR OTHER PARTY HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.\n\n17. Interpretation of Sections 15 and 16.\n\nIf the disclaimer of warranty and limitation of liability provided above cannot be given local legal effect according to their terms, reviewing courts shall apply local law that most closely approximates an absolute waiver of all civil liability in connection with the Program, unless a warranty or assumption of liability accompanies a copy of the Program in return for a fee.\n\nEND OF TERMS AND CONDITIONS\n\n            How to Apply These Terms to Your New Programs\n\nIf you develop a new program, and you want it to be of the greatest possible use to the public, the best way to achieve this is to make it free software which everyone can redistribute and change under these terms.\n\nTo do so, attach the following notices to the program.  It is safest to attach them to the start of each source file to most effectively state the exclusion of warranty; and each file should have at least the "copyright" line and a pointer to where the full notice is found.\n\n     <one line to give the program\'s name and a brief idea of what it does.>\n     Copyright (C) <year>  <name of author>\n\n     This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.\n\n     This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details.\n\n     You should have received a copy of the GNU Affero General Public License along with this program.  If not, see <http://www.gnu.org/licenses/>.\n\nAlso add information on how to contact you by electronic and paper mail.\n\nIf your software can interact with users remotely through a computer network, you should also make sure that it provides a way for users to get its source.  For example, if your program is a web application, its interface could display a "Source" link that leads users to an archive of the code.  There are many ways you could offer source, and different solutions will be better for different programs; see section 13 for the specific requirements.\n\nYou should also get your employer (if you work as a programmer) or school, if any, to sign a "copyright disclaimer" for the program, if necessary. For more information on this, and how to apply and follow the GNU AGPL, see <http://www.gnu.org/licenses/>.\n',
  Unlicense:
    'This is free and unencumbered software released into the public domain.\n\nAnyone is free to copy, modify, publish, use, compile, sell, or distribute this software, either in source code form or as a compiled binary, for any purpose, commercial or non-commercial, and by any means.\n\nIn jurisdictions that recognize copyright laws, the author or authors of this software dedicate any and all copyright interest in the software to the public domain. We make this dedication for the benefit of the public at large and to the detriment of our heirs and\nsuccessors. We intend this dedication to be an overt act of relinquishment in perpetuity of all present and future rights to this software under copyright law.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.\n\nFor more information, please refer to <http://unlicense.org/>\n',
};

/* ── vocabulary ────────────────────────────────────────────────────────────
 * Flags are machine tokens, not sentences: the human page maps them through
 * its own message catalog, an agent can branch on them. They are read off the
 * license texts vendored above (Apache §3 patent grant, §4(b) state changes,
 * §6 trademarks; AGPL §13 network use; MPL §3.1 file-scope source disclosure),
 * not copied from a competitor's comparison table.
 */
export type LicenseFamily =
  | "permissive"
  | "weak-copyleft"
  | "strong-copyleft"
  | "public-domain"
  | "content";

export type LicensePermission =
  | "commercial-use"
  | "modifications"
  | "distribution"
  | "private-use"
  | "patent-use";

export type LicenseCondition =
  | "include-copyright"
  | "document-changes"
  | "disclose-source"
  | "same-license"
  | "same-license-file"
  | "same-license-library"
  | "network-use-disclose";

export type LicenseLimitation = "liability" | "warranty" | "trademark-use";

interface NoticeArgs {
  readonly year: number;
  readonly holder: string;
  readonly program?: string | undefined;
}

export interface LicenseMeta {
  readonly licenseId: string;
  readonly spdxId: string;
  readonly name: string;
  readonly family: LicenseFamily;
  /** Key into LICENSE_TEXTS. `null` = we do not vendor this text; link out only. */
  readonly textKey: string | null;
  readonly url: string;
  readonly permissions: readonly LicensePermission[];
  readonly conditions: readonly LicenseCondition[];
  readonly limitations: readonly LicenseLimitation[];
  /**
   * Some licenses ship a copyright placeholder in the file itself (MIT, BSD,
   * ISC); the GNU family, MPL and Apache do not — their file is verbatim and
   * the holder goes in the per-source-file notice instead. Getting this
   * backwards is the classic naive-generator bug: it edits a legal text that
   * is meant to be byte-identical everywhere.
   */
  readonly copyright: { readonly find: string; readonly build: (a: NoticeArgs) => string } | null;
  /** Per-source-file notice with holder/year filled, where the license defines one. */
  readonly notice: ((a: NoticeArgs) => string) | null;
}

const COPY_LINE = (a: NoticeArgs) => `Copyright (c) ${a.year} ${a.holder}`;

/* ── GNU-family notices ────────────────────────────────────────────────────
 * Reproduced from the "How to Apply These Terms to Your New Programs" appendix
 * of the vendored texts. The `-only` variant is our own minimal derivation of
 * that appendix: the appendix is written for `-or-later`, so the
 * "or (at your option) any later version" clause is dropped rather than
 * reworded. That distinction is the whole point of `-only` vs `-or-later`
 * (know-how #4) and it also changes the SPDX id the notice carries.
 */
function gnuNotice(licenseName: string, orLater: boolean): (a: NoticeArgs) => string {
  const version = orLater
    ? "either version 3 of the License, or (at your option) any later version."
    : "version 3 of the License.";
  return (a) =>
    [
      a.program ?? "<one line to give the program's name and a brief idea of what it does.>",
      `Copyright (C) ${a.year}  ${a.holder}`,
      "",
      `This program is free software: you can redistribute it and/or modify it under the terms of the ${licenseName} as published by the Free Software Foundation, ${version}`,
      "",
      `This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the ${licenseName} for more details.`,
      "",
      `You should have received a copy of the ${licenseName} along with this program.  If not, see <https://www.gnu.org/licenses/>.`,
    ].join("\n");
}

/** Apache-2.0 APPENDIX boilerplate, fields filled. The LICENSE file stays verbatim. */
function apacheNotice(a: NoticeArgs): string {
  return [
    `Copyright ${a.year} ${a.holder}`,
    "",
    'Licensed under the Apache License, Version 2.0 (the "License");',
    "you may not use this file except in compliance with the License.",
    "You may obtain a copy of the License at",
    "",
    "    http://www.apache.org/licenses/LICENSE-2.0",
    "",
    "Unless required by applicable law or agreed to in writing, software",
    'distributed under the License is distributed on an "AS IS" BASIS,',
    "WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.",
    "See the License for the specific language governing permissions and",
    "limitations under the License.",
  ].join("\n");
}

/** MPL-2.0 Exhibit A. Carries no holder — the notice is the same for everyone. */
const MPL_NOTICE = [
  "This Source Code Form is subject to the terms of the Mozilla Public",
  "License, v. 2.0. If a copy of the MPL was not distributed with this",
  "file, You can obtain one at https://mozilla.org/MPL/2.0/.",
].join("\n");

const PERMISSIVE_CORE: readonly LicensePermission[] = [
  "commercial-use",
  "modifications",
  "distribution",
  "private-use",
];
const GNU_PERMS: readonly LicensePermission[] = [...PERMISSIVE_CORE, "patent-use"];
const NO_WARRANTY: readonly LicenseLimitation[] = ["liability", "warranty"];

function spdxUrl(id: string): string {
  return `https://spdx.org/licenses/${id}.html`;
}

function gnu(
  spdxId: string,
  name: string,
  textKey: string,
  licenseName: string,
  family: LicenseFamily,
  conditions: readonly LicenseCondition[],
): LicenseMeta {
  return {
    licenseId: spdxId.toLowerCase(),
    spdxId,
    name,
    family,
    textKey,
    url: spdxUrl(spdxId),
    permissions: GNU_PERMS,
    conditions,
    limitations: NO_WARRANTY,
    copyright: null,
    notice: gnuNotice(licenseName, spdxId.endsWith("-or-later")),
  };
}

const GPL_CONDITIONS: readonly LicenseCondition[] = [
  "disclose-source",
  "include-copyright",
  "document-changes",
  "same-license",
];

export const LICENSES: readonly LicenseMeta[] = [
  {
    licenseId: "mit",
    spdxId: "MIT",
    name: "MIT License",
    family: "permissive",
    textKey: "MIT",
    url: spdxUrl("MIT"),
    permissions: PERMISSIVE_CORE,
    conditions: ["include-copyright"],
    limitations: NO_WARRANTY,
    copyright: { find: "Copyright (c) <year> <copyright holders>", build: COPY_LINE },
    notice: null,
  },
  {
    licenseId: "apache-2.0",
    spdxId: "Apache-2.0",
    name: "Apache License 2.0",
    family: "permissive",
    textKey: "Apache-2.0",
    url: spdxUrl("Apache-2.0"),
    permissions: [...PERMISSIVE_CORE, "patent-use"],
    conditions: ["include-copyright", "document-changes"],
    limitations: ["liability", "warranty", "trademark-use"],
    // The bracketed fields live in the APPENDIX, which is instructions, not
    // terms — a correct Apache LICENSE file keeps them as written.
    copyright: null,
    notice: apacheNotice,
  },
  {
    licenseId: "bsd-3-clause",
    spdxId: "BSD-3-Clause",
    name: 'BSD 3-Clause "New" License',
    family: "permissive",
    textKey: "BSD-3-Clause",
    url: spdxUrl("BSD-3-Clause"),
    permissions: PERMISSIVE_CORE,
    conditions: ["include-copyright"],
    // Clause 3 forbids using the holder's name to endorse derived products.
    limitations: ["liability", "warranty", "trademark-use"],
    copyright: {
      // Trailing space is part of the upstream line; dropping it keeps the
      // generated file free of trailing whitespace.
      find: "Copyright (c) <year> <owner>. ",
      build: (a) => `${COPY_LINE(a)}.`,
    },
    notice: null,
  },
  {
    licenseId: "bsd-2-clause",
    spdxId: "BSD-2-Clause",
    name: 'BSD 2-Clause "Simplified" License',
    family: "permissive",
    textKey: "BSD-2-Clause",
    url: spdxUrl("BSD-2-Clause"),
    permissions: PERMISSIVE_CORE,
    conditions: ["include-copyright"],
    limitations: NO_WARRANTY,
    copyright: { find: "Copyright (c) <year> <owner> ", build: COPY_LINE },
    notice: null,
  },
  {
    licenseId: "isc",
    spdxId: "ISC",
    name: "ISC License",
    family: "permissive",
    textKey: "ISC",
    url: spdxUrl("ISC"),
    permissions: PERMISSIVE_CORE,
    conditions: ["include-copyright"],
    limitations: NO_WARRANTY,
    copyright: { find: "Copyright (c) <year> <copyright holders>", build: COPY_LINE },
    notice: null,
  },
  {
    licenseId: "mpl-2.0",
    spdxId: "MPL-2.0",
    name: "Mozilla Public License 2.0",
    family: "weak-copyleft",
    textKey: "MPL-2.0",
    url: spdxUrl("MPL-2.0"),
    permissions: [...PERMISSIVE_CORE, "patent-use"],
    conditions: ["disclose-source", "include-copyright", "same-license-file"],
    limitations: ["liability", "warranty", "trademark-use"],
    copyright: null,
    notice: () => MPL_NOTICE,
  },
  gnu(
    "LGPL-3.0-or-later",
    "GNU Lesser General Public License v3.0 or later",
    "LGPL-3.0",
    "GNU Lesser General Public License",
    "weak-copyleft",
    ["disclose-source", "include-copyright", "document-changes", "same-license-library"],
  ),
  gnu(
    "LGPL-3.0-only",
    "GNU Lesser General Public License v3.0 only",
    "LGPL-3.0",
    "GNU Lesser General Public License",
    "weak-copyleft",
    ["disclose-source", "include-copyright", "document-changes", "same-license-library"],
  ),
  gnu(
    "GPL-3.0-or-later",
    "GNU General Public License v3.0 or later",
    "GPL-3.0",
    "GNU General Public License",
    "strong-copyleft",
    GPL_CONDITIONS,
  ),
  gnu(
    "GPL-3.0-only",
    "GNU General Public License v3.0 only",
    "GPL-3.0",
    "GNU General Public License",
    "strong-copyleft",
    GPL_CONDITIONS,
  ),
  gnu(
    "AGPL-3.0-or-later",
    "GNU Affero General Public License v3.0 or later",
    "AGPL-3.0",
    "GNU Affero General Public License",
    "strong-copyleft",
    [...GPL_CONDITIONS, "network-use-disclose"],
  ),
  gnu(
    "AGPL-3.0-only",
    "GNU Affero General Public License v3.0 only",
    "AGPL-3.0",
    "GNU Affero General Public License",
    "strong-copyleft",
    [...GPL_CONDITIONS, "network-use-disclose"],
  ),
  {
    licenseId: "unlicense",
    spdxId: "Unlicense",
    name: "The Unlicense",
    family: "public-domain",
    textKey: "Unlicense",
    url: spdxUrl("Unlicense"),
    permissions: PERMISSIVE_CORE,
    conditions: [],
    limitations: NO_WARRANTY,
    copyright: null,
    notice: null,
  },
  // Non-software content (know-how #9). Recommendable, deliberately NOT
  // generatable: the brief routes this out of the generator, and a CC license
  // deserves its own chooser rather than a link-shaped afterthought.
  {
    licenseId: "cc-by-4.0",
    spdxId: "CC-BY-4.0",
    name: "Creative Commons Attribution 4.0 International",
    family: "content",
    textKey: null,
    url: spdxUrl("CC-BY-4.0"),
    permissions: ["commercial-use", "modifications", "distribution", "private-use"],
    conditions: ["include-copyright"],
    limitations: NO_WARRANTY,
    copyright: null,
    notice: null,
  },
  {
    licenseId: "cc-by-sa-4.0",
    spdxId: "CC-BY-SA-4.0",
    name: "Creative Commons Attribution Share Alike 4.0 International",
    family: "content",
    textKey: null,
    url: spdxUrl("CC-BY-SA-4.0"),
    permissions: ["commercial-use", "modifications", "distribution", "private-use"],
    conditions: ["include-copyright", "same-license"],
    limitations: NO_WARRANTY,
    copyright: null,
    notice: null,
  },
  {
    licenseId: "cc0-1.0",
    spdxId: "CC0-1.0",
    name: "Creative Commons Zero v1.0 Universal",
    family: "content",
    textKey: null,
    url: spdxUrl("CC0-1.0"),
    permissions: ["commercial-use", "modifications", "distribution", "private-use"],
    conditions: [],
    limitations: NO_WARRANTY,
    copyright: null,
    notice: null,
  },
];

const BY_SPDX: ReadonlyMap<string, LicenseMeta> = new Map(LICENSES.map((l) => [l.spdxId, l]));

export function findLicense(spdxId: string): LicenseMeta | undefined {
  return BY_SPDX.get(spdxId);
}

/** SPDX ids this tool can emit a LICENSE file for (i.e. the text is vendored). */
export const GENERATABLE_SPDX_IDS: readonly string[] = LICENSES.filter(
  (l) => l.textKey !== null,
).map((l) => l.spdxId);

/* ── shared statements ─────────────────────────────────────────────────────
 * Bilingual because both operations answer humans and agents; the human page
 * renders its own labels from the message catalog and uses these for the
 * license-specific prose only.
 */
const NO_LICENSE_WARNING = {
  en: "No license is not the same as public domain. Without one, default copyright applies and nobody may copy, modify or redistribute your code — a public repository is visibility, not permission.",
  zh: "不放许可证不等于公共领域。没有许可证时默认著作权全部保留，任何人都不得复制、修改或再分发你的代码——仓库公开只是可见，不是授权。",
};

const DISCLAIMER = {
  en: "Deterministic template output, not legal advice. If the licensing decision carries real risk, have a lawyer look at it.",
  zh: "本工具输出为确定性模板结果，不构成法律意见。若该授权决定涉及实际风险，请咨询律师。",
};

const PLACEMENT = {
  en: "Commit it as a file named LICENSE (no extension) at the repository root, and put the SPDX id in your package.json / Cargo.toml / pyproject.toml license field so tooling agrees with the file.",
  zh: "以无扩展名的 LICENSE 文件提交在仓库根目录，并把 SPDX id 写进 package.json / Cargo.toml / pyproject.toml 的 license 字段，让工具链与文件保持一致。",
};

/* ── recommendation ────────────────────────────────────────────────────────
 * A static decision table, not a wizard. One scenario plus three refinements
 * resolve in a single call (brief §8): there is no state to carry between
 * steps, because there are no steps.
 */
export type Scenario = "permissive" | "copyleft" | "community" | "unsure" | "non-software";

interface Alternate {
  readonly spdxId: string;
  readonly name: string;
  readonly why: string;
  readonly whyZh: string;
}

function alternate(spdxId: string, why: string, whyZh: string): Alternate {
  const meta = findLicense(spdxId);
  if (!meta) throw new Error(`Unknown SPDX id in decision table: ${spdxId}`);
  return { spdxId: meta.spdxId, name: meta.name, why, whyZh };
}

interface RecommendInput {
  scenario: Scenario;
  patentConcern?: boolean;
  networkService?: boolean;
  projectKind?: "application" | "library";
  futureVersions?: "or-later" | "only";
}

interface Decision {
  readonly spdxId: string | null;
  readonly rationale: string;
  readonly rationaleZh: string;
  readonly alternates: readonly Alternate[];
  /** What to do when we deliberately do not name a license. */
  readonly nextStep?: string;
  readonly nextStepZh?: string;
}

function gnuId(base: "GPL-3.0" | "AGPL-3.0" | "LGPL-3.0", futureVersions: "or-later" | "only") {
  return `${base}-${futureVersions}`;
}

function decide(
  input: Required<Omit<RecommendInput, "scenario">> & { scenario: Scenario },
): Decision {
  const { scenario, patentConcern, networkService, projectKind, futureVersions } = input;

  if (scenario === "community") {
    // choosealicense.com's honest answer, kept honest: when you are adding to
    // someone else's project the right license is already decided, and
    // inventing a recommendation here would be worse than saying so.
    return {
      spdxId: null,
      rationale:
        "You are contributing to an existing project, so the license is already chosen: match the project's LICENSE file exactly. Adding a different license to a contribution creates a compatibility problem for the maintainer, not a choice for you.",
      rationaleZh:
        "你是在给已有项目贡献代码，许可证其实已经定了：与该项目的 LICENSE 文件保持一致。给贡献加上另一种许可证，只会给维护者制造兼容性问题。",
      alternates: [],
      nextStep:
        "Open the project's LICENSE file, copy its SPDX id, and use that id in your contribution's metadata.",
      nextStepZh: "打开该项目的 LICENSE 文件，取其 SPDX id，并在你的贡献元数据中沿用它。",
    };
  }

  if (scenario === "non-software") {
    // Know-how #9: an OSI software license is the wrong family for prose,
    // design, data or media, and recommending MIT for a docs repo is a real
    // mis-recommendation, not a harmless one.
    return {
      spdxId: "CC-BY-4.0",
      rationale:
        "Prose, design, data and media are not software, and OSI software licenses are written for source code. Creative Commons Attribution 4.0 is the usual default: reuse allowed, credit required.",
      rationaleZh:
        "文档、设计、数据与媒体不是软件，OSI 软件许可证是针对源代码写的。CC BY 4.0 是常见默认：允许复用，但须署名。",
      alternates: [
        alternate(
          "CC0-1.0",
          "Waives copyright as far as the law allows — pick it for datasets and reference material where even attribution is friction.",
          "在法律允许范围内放弃著作权——数据集与参考资料若连署名都算负担，选它。",
        ),
        alternate(
          "CC-BY-SA-4.0",
          "Attribution plus share-alike: derivative works must carry the same license.",
          "署名加相同方式共享：衍生作品必须沿用同一许可证。",
        ),
      ],
      nextStep:
        "This tool does not generate Creative Commons files — the canonical text is at the SPDX link, and a CC license needs its own chooser rather than a bolt-on.",
      nextStepZh:
        "本工具不生成 Creative Commons 文件——规范文本见 SPDX 链接；CC 许可证应有独立的选择工具，而非在此附加。",
    };
  }

  if (scenario === "copyleft") {
    // Know-how #3: AGPL is not a GPL footnote. Its §13 network clause is a
    // distinct trigger, and it is the one that actually decides the answer
    // for anyone shipping a service rather than a binary.
    if (networkService) {
      const id = gnuId("AGPL-3.0", futureVersions);
      return {
        spdxId: id,
        rationale:
          "You run it as a network service, and that is exactly the gap plain GPL leaves open: under GPL, users of a hosted instance never receive the software, so no source obligation is triggered. AGPL-3.0 §13 treats network interaction as distribution and requires you to offer users the corresponding source.",
        rationaleZh:
          "你会把它作为网络服务运行，而这正是普通 GPL 留下的缺口：GPL 下托管实例的用户并未取得软件副本，因此不触发源码义务。AGPL-3.0 第 13 条把网络交互视同分发，要求你向用户提供对应源码。",
        alternates: [
          alternate(
            gnuId("GPL-3.0", futureVersions),
            "Same strong copyleft without the network clause — choose it if running a modified copy as a service should not oblige anyone to publish.",
            "同样是强 copyleft，但没有网络条款——若你认为以服务形式运行修改版不应强制公开源码，选它。",
          ),
          alternate(
            "MPL-2.0",
            "File-scoped weak copyleft: only the files you modify stay open, and a proprietary service may build on top.",
            "文件级弱 copyleft：只有被你修改的文件需要保持开放，专有服务可以在其之上构建。",
          ),
        ],
      };
    }
    if (projectKind === "library") {
      const id = "MPL-2.0";
      return {
        spdxId: id,
        rationale:
          "For a library, whole-work copyleft is usually the reason people walk away. MPL-2.0 keeps the obligation file-scoped: changes to your files must stay open, but an application may link it without becoming MPL itself.",
        rationaleZh:
          "对库而言，整体作品级 copyleft 往往正是使用者退避的原因。MPL-2.0 把义务限定在文件级：对本库文件的修改必须保持开放，但应用可以链接它而无需整体转为 MPL。",
        alternates: [
          alternate(
            gnuId("LGPL-3.0", futureVersions),
            "The classic library copyleft: linking is allowed, but users must be able to relink against a modified version of your library.",
            "经典的库 copyleft：允许链接，但用户必须能够用修改后的库版本重新链接。",
          ),
          alternate(
            gnuId("GPL-3.0", futureVersions),
            "Full strong copyleft — pick it only if you want anything that links the library to be free software too.",
            "完整的强 copyleft——只有当你希望链接本库的一切也必须是自由软件时才选它。",
          ),
        ],
      };
    }
    const id = gnuId("GPL-3.0", futureVersions);
    return {
      spdxId: id,
      rationale:
        "Strong copyleft: anyone who distributes the program or a derived work has to ship the corresponding source under the same terms, so improvements come back instead of disappearing into a closed fork.",
      rationaleZh:
        "强 copyleft：任何分发本程序或衍生作品的人都必须以相同条款提供对应源码，改进因此会回流，而不是消失在闭源分支里。",
      alternates: [
        alternate(
          gnuId("AGPL-3.0", futureVersions),
          "Adds the network-use clause — required if a hosted, modified copy should also owe users its source.",
          "增加网络使用条款——若托管的修改版也应向用户提供源码，则必须用它。",
        ),
        alternate(
          "MPL-2.0",
          "Weak copyleft at file scope — a middle ground when whole-work copyleft would block adoption.",
          "文件级弱 copyleft——当整体 copyleft 会阻碍采用时的折中方案。",
        ),
      ],
    };
  }

  // permissive + unsure share one branch: "unsure" is the same answer with a
  // different reason, which is why the brief refuses to make it question 2.
  if (patentConcern) {
    // Know-how #5: the patent grant is the actual reason a company legal team
    // prefers Apache over MIT — not "MIT with more paperwork".
    return {
      spdxId: "Apache-2.0",
      rationale:
        "Apache-2.0 is MIT-like in what it permits, but it adds an express patent licence from every contributor (§3) and terminates that licence for anyone who sues over patents. MIT and BSD are silent on patents, which is the gap a company legal review usually asks about.",
      rationaleZh:
        "Apache-2.0 在授权范围上与 MIT 相近，但额外提供每位贡献者的明示专利许可（第 3 条），并对发起专利诉讼者终止该许可。MIT 与 BSD 对专利只字未提，而这正是企业法务通常关注的缺口。",
      alternates: [
        alternate(
          "MIT",
          "Shorter and the most widely used, but silent on patents — fine when no patent exposure is in play.",
          "更短、使用最广，但未涉及专利——在不存在专利风险时足够。",
        ),
        alternate(
          "BSD-3-Clause",
          "Permissive with an added no-endorsement clause; also silent on patents.",
          "宽松许可并附加不得背书条款；同样未涉及专利。",
        ),
      ],
    };
  }

  const unsure = scenario === "unsure";
  return {
    spdxId: "MIT",
    rationale: unsure
      ? "When the answer is genuinely open, MIT is the low-regret default: it is short, permissive, universally recognised, and compatible with almost everything, so it rarely becomes the reason someone cannot use your code."
      : "MIT lets anyone use, modify, sell and redistribute the code as long as your copyright notice stays attached. It is the shortest license that still does the job, which is why it is the most common one on public repositories.",
    rationaleZh: unsure
      ? "在确实拿不准时，MIT 是后悔成本最低的默认：短、宽松、广泛认可、几乎与一切兼容，很少成为别人无法使用你代码的理由。"
      : "MIT 允许任何人使用、修改、销售与再分发代码，前提是保留你的著作权声明。它是仍能完成任务的最短许可证，因此在公开仓库中最常见。",
    alternates: [
      alternate(
        "Apache-2.0",
        "Same permissions plus an express patent grant and patent-retaliation clause — the version companies ask for.",
        "权限相同，但增加明示专利授权与专利反制条款——企业通常要求的版本。",
      ),
      alternate(
        "ISC",
        "The same effect as MIT in fewer words; used by default across the OpenBSD and npm ecosystems.",
        "与 MIT 效果相同但更简短；OpenBSD 与 npm 生态中常见的默认选择。",
      ),
      alternate(
        unsure ? "GPL-3.0-or-later" : "BSD-3-Clause",
        unsure
          ? "Pick this instead if you would rather improvements came back than have the code used in closed products."
          : "Adds a clause forbidding use of your name to endorse derived products.",
        unsure
          ? "若你更希望改进回流、而非代码被用于闭源产品，改选它。"
          : "增加了禁止以你的名义为衍生产品背书的条款。",
      ),
    ],
  };
}

/* ── generation ────────────────────────────────────────────────────────────
 * String substitution against a vendored canonical text. The only edit is the
 * copyright line, and only for the licenses that ship one as a placeholder.
 */

function assertPlainLine(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${field} must not be blank`);
  // A LICENSE file is a legal document: a newline or control character in the
  // holder would silently restructure it.
  if (/\p{Cc}/u.test(trimmed)) {
    throw new Error(`${field} must be a single line without control characters`);
  }
  return trimmed;
}

export function renderLicenseText(meta: LicenseMeta, args: NoticeArgs): string {
  if (!meta.textKey) {
    throw new Error(
      `No license text is vendored for ${meta.spdxId}. Read the canonical text at ${meta.url}.`,
    );
  }
  const canonical = LICENSE_TEXTS[meta.textKey];
  if (canonical === undefined) {
    throw new Error(`Missing vendored text for key ${meta.textKey}`);
  }
  if (!meta.copyright) return canonical;
  if (!canonical.includes(meta.copyright.find)) {
    // Guards against a silent upstream reflow turning substitution into a
    // no-op, which would ship someone else's copyright line.
    throw new Error(`Copyright placeholder not found in vendored ${meta.spdxId} text`);
  }
  const line = meta.copyright.build(args);
  // Function replacement on purpose: a holder containing `$&` or `$1` must land
  // in the file literally, not be re-expanded as a replacement pattern.
  return canonical.replace(meta.copyright.find, () => line);
}

export type CommentStyle = "slash" | "hash" | "block" | "html";

/** REUSE-style SPDX file tags — the machine-facing half of know-how #6. */
export function spdxHeader(spdxId: string, args: NoticeArgs, style: CommentStyle): string {
  const lines = [
    `SPDX-FileCopyrightText: ${args.year} ${args.holder}`,
    `SPDX-License-Identifier: ${spdxId}`,
  ];
  if (style === "hash") return lines.map((l) => `# ${l}`).join("\n");
  if (style === "html") return lines.map((l) => `<!-- ${l} -->`).join("\n");
  if (style === "block") return ["/*", ...lines.map((l) => ` * ${l}`), " */"].join("\n");
  return lines.map((l) => `// ${l}`).join("\n");
}

function manifestFields(spdxId: string) {
  return {
    "package.json": `"license": ${JSON.stringify(spdxId)}`,
    "Cargo.toml": `license = ${JSON.stringify(spdxId)}`,
    "pyproject.toml": `license = ${JSON.stringify(spdxId)}`,
  };
}

/* ── tools ─────────────────────────────────────────────────────────────── */

const recommendInputSchema = z.object({
  scenario: z
    .enum(["permissive", "copyleft", "community", "unsure", "non-software"])
    .describe(
      "What the project needs, in plain language. permissive = anyone may use it freely; copyleft = improvements must be shared back; community = you are contributing to an existing project; non-software = docs, data, design or media; unsure = you do not know yet.",
    ),
  patentConcern: z
    .boolean()
    .default(false)
    .describe("Permissive branch only: an express patent grant is wanted (selects Apache-2.0)."),
  networkService: z
    .boolean()
    .default(false)
    .describe(
      "Copyleft branch only: the software will be offered as a hosted service (selects AGPL-3.0, whose §13 treats network use as distribution).",
    ),
  projectKind: z
    .enum(["application", "library"])
    .default("application")
    .describe(
      "Copyleft branch only: a library is steered to file-scoped weak copyleft so that linking does not force the whole application open.",
    ),
  futureVersions: z
    .enum(["or-later", "only"])
    .default("or-later")
    .describe(
      "GNU-family suffix. 'or-later' (GPL-3.0-or-later) keeps compatibility with Apache-2.0 code; 'only' pins to version 3 exactly. This is a real choice, not a version typo.",
    ),
});

export const licenseRecommendTool = tool({
  id: "template/license-recommend",
  slug: "license-recommend",
  category: "template",
  title: { zh: "开源许可证推荐", en: "Open Source License Chooser" },
  description: {
    zh: "一步场景三分诊：按用途给出推荐许可证、理由、权限/条件/限制与备选方案（SPDX id）",
    en: "One-step scenario triage: a recommended license with its rationale, permissions/conditions/limitations and alternates, by SPDX id",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.template.license_recommend",
  roots: ["template", "generator"],
  engine: {
    name: "SPDX License List",
    upstream:
      "spdx/license-list-data (texts + identifiers); decision table per docs/plans/tools/license-chooser.md §9.1",
    version: `${SPDX_RELEASE} (${SPDX_RELEASE_DATE})`,
  },
  seoKeywords: {
    zh: "开源许可证选择,该用哪个开源协议,MIT还是GPL,license怎么选",
    en: "open source license chooser, choose a license, mit vs gpl, which license should i use",
  },
  inputSchema: recommendInputSchema,
  execute: (input: RecommendInput) => {
    const scenario = input.scenario;
    const decision = decide({
      scenario,
      patentConcern: input.patentConcern ?? false,
      networkService: input.networkService ?? false,
      projectKind: input.projectKind ?? "application",
      futureVersions: input.futureVersions ?? "or-later",
    });
    const meta = decision.spdxId ? findLicense(decision.spdxId) : undefined;
    if (decision.spdxId && !meta) {
      throw new Error(`Decision table produced an unknown SPDX id: ${decision.spdxId}`);
    }
    return {
      scenario,
      licenseId: meta?.licenseId ?? null,
      spdxId: meta?.spdxId ?? null,
      name: meta?.name ?? null,
      family: meta?.family ?? null,
      url: meta?.url ?? null,
      rationale: decision.rationale,
      rationaleZh: decision.rationaleZh,
      permissions: meta?.permissions ?? [],
      conditions: meta?.conditions ?? [],
      limitations: meta?.limitations ?? [],
      alternates: decision.alternates,
      /** False when the honest answer is not a file we should write for you. */
      generatable: meta ? meta.textKey !== null : false,
      nextStep: decision.nextStep ?? null,
      nextStepZh: decision.nextStepZh ?? null,
      noLicenseWarning: NO_LICENSE_WARNING.en,
      noLicenseWarningZh: NO_LICENSE_WARNING.zh,
      disclaimer: DISCLAIMER.en,
      disclaimerZh: DISCLAIMER.zh,
    };
  },
});

const generateInputSchema = z.object({
  spdxId: z
    .string()
    .min(1)
    .max(64)
    .describe(`Exact SPDX identifier. Texts are vendored for: ${GENERATABLE_SPDX_IDS.join(", ")}.`),
  holder: z
    .string()
    .min(1)
    .max(200)
    .describe("Copyright holder — a person or an organisation. One line, no control characters."),
  year: z.coerce
    .number()
    .int()
    .min(1970)
    .max(2200)
    .describe(
      "Copyright year. Required rather than defaulted to 'now' so the operation stays deterministic and cacheable; the human page fills in the current year for you.",
    ),
  commentStyle: z
    .enum(["slash", "hash", "block", "html"])
    .default("slash")
    .describe("Comment syntax for the SPDX source-file header snippet."),
  program: z
    .string()
    .max(120)
    .optional()
    .describe(
      "Optional program name, used in the first line of the GNU-family source-file notice.",
    ),
});

export const licenseGenerateTool = tool({
  id: "template/license-generate",
  slug: "license-generate",
  category: "template",
  title: { zh: "LICENSE 文件生成", en: "LICENSE File Generator" },
  description: {
    zh: "按 SPDX id 生成可直接提交的 LICENSE：规范原文逐字，仅替换著作权行，并附 SPDX 头注释",
    en: "Ready-to-commit LICENSE by SPDX id: canonical text verbatim, copyright line filled, plus the SPDX source-file header",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.template.license_generate",
  roots: ["template", "generator"],
  engine: {
    name: "SPDX License List",
    upstream: "spdx/license-list-data — text/<id>.txt, vendored verbatim",
    version: `${SPDX_RELEASE} (${SPDX_RELEASE_DATE})`,
  },
  seoKeywords: {
    zh: "LICENSE文件生成,MIT许可证生成,开源协议文件,apache license 2.0文本",
    en: "license file generator, generate mit license, license txt generator, apache 2.0 license text",
  },
  inputSchema: generateInputSchema,
  execute: (input: {
    spdxId: string;
    holder: string;
    year: number;
    commentStyle?: CommentStyle;
    program?: string;
  }) => {
    const meta = findLicense(input.spdxId);
    if (!meta) {
      throw new Error(
        `Unknown SPDX id: ${input.spdxId}. Supported: ${GENERATABLE_SPDX_IDS.join(", ")}`,
      );
    }
    if (!meta.textKey) {
      throw new Error(
        `${meta.spdxId} is a content license and is not generated here. Canonical text: ${meta.url}`,
      );
    }
    const holder = assertPlainLine(input.holder, "holder");
    const program = input.program?.trim() ? assertPlainLine(input.program, "program") : undefined;
    const args: NoticeArgs = { year: input.year, holder, program };
    const text = renderLicenseText(meta, args);
    const style = input.commentStyle ?? "slash";
    return {
      spdxId: meta.spdxId,
      name: meta.name,
      family: meta.family,
      filename: "LICENSE" as const,
      text,
      bytes: new TextEncoder().encode(text).length,
      lines: text.split("\n").length,
      holder,
      year: input.year,
      /**
       * False for Apache/MPL/GNU: their canonical file carries no holder field,
       * so it ships byte-identical and the holder goes in the notice instead.
       */
      holderSubstituted: meta.copyright !== null,
      spdxHeaderSnippet: spdxHeader(meta.spdxId, args, style),
      noticeSnippet: meta.notice ? meta.notice(args) : null,
      manifest: manifestFields(meta.spdxId),
      placement: PLACEMENT.en,
      placementZh: PLACEMENT.zh,
      disclaimer: DISCLAIMER.en,
      disclaimerZh: DISCLAIMER.zh,
      source: {
        name: "SPDX License List",
        version: SPDX_RELEASE,
        releaseDate: SPDX_RELEASE_DATE,
        url: meta.url,
      },
    };
  },
});

export const w3LicenseChooserTools: readonly AnyForgeToolDefinition[] = [
  licenseRecommendTool,
  licenseGenerateTool,
];
