# Attachment formats and viewer feasibility — 2026-10-03

> **Document type:** Research (non-authoritative).
> **Status:** Completed evidence for the revised Plan 4; browser UI remains Plan 5 work.
> **Retention:** Keep as provenance for the accepted format list and viewer choices.

The practical recommendation is a finite, explicitly documented upload policy plus browser-side viewers. Keep email parsing off the 384 MB server. The final policy contains 145 extensions. That comprises 141 explicitly named unconditional formats, conditional Autodesk .mat, and retained BuiltBasis .heif/.rtf/.odp. This is an enumerated-positive union plus retained formats, not an exhaustive union of vendor upload acceptance.

Research only. Pinned dependencies were installed in isolated research fixtures with install scripts disabled, followed by the explicit esbuild rebuild. They are not application dependencies. A browser-target bundle passed synthetic parsing checks in an isolated JavaScript VM without Node globals, a DOM, or network access. No production files or data were touched. A real browser UI and large-file behavior remain untested.

## Provenance and exact extension policy

PlanRadar permits arbitrary document uploads, so its upload policy alone would make a literal union unbounded. Its ticket attachment list explicitly adds .heic, .ods, .odt and .rar to the other sources below. [PlanRadar Documents](https://help.planradar.com/en/document-management/), [PlanRadar ticket attachments](https://help.planradar.com/en/add-attachments-to-tickets/)

Fieldwire’s linked upload PDF names these 51 extensions:
```text
.avi .flv .dwg .dxf .gc3 .ifc .rvt .nwd .kmz .eml .ln3 .msg .mpp .pan .rd3 .xer .tiff .tif .tn3 .tp3 .zdd .txt .doc .pages .docx .png .jpg .gif .jpeg .bmp .wav .mp3 .pdf .key .ppt .pptx .pps .numbers .xls .xlsx .xltx .xlt .csv .xlsm .mkv .mov .mp4 .webm .m4a .zip .zipx
```
The Files article separately names .kml. The PDF accepts .avi and .flv, while the article says those videos are unsupported. Treat them as accepted storage formats, without promising playback. [Official upload PDF](https://help.fieldwire.com/hc/article_attachments/46217337117201), [Files article](https://help.fieldwire.com/hc/en-us/articles/206199120-Introduction-to-the-Files-Tab)

Autodesk’s positive viewer table supplies these formats:
```text
.3dm .3ds .3dxml .a .asm .axm .bmp .brd .bpm .cam360 .catpart .catproduct .cgr .dae .ddx .ddz .dgk .dgn .dlv3 .dmt .doc .dwf .dwfx .dwg .dwt .dxf .emodel .exp .f3d .fbx .g .gbxml .glb .gltf .iam .idw .ifc .ige .iges .igs .ipt .iwm .jpg .jpeg .jt .max .model .mp4 .neu .nwc .nwd .obj .osb .par .pdf .pmlprj .pmlprjz .png .ppt .prt .psm .psmodel .rcp .rvm .rvt .sab .sat .skp .sldasm .sldprt .smb .step .stl .stp .stpz .tif .tiff .usd .usda .usdc .usdz .vpb .vue .wire .x_b .x_t .xas .xpr
```
The page explicitly separates upload-only formats, viewable formats and forbidden formats. Its viewer list is not exhaustive upload acceptance. Its negative table has a conditional exception for .mat from 3ds Max. A suffix cannot establish that provenance. .a is explicitly a Unix static object library, not CAD. [Autodesk Supported Files](https://help.autodesk.com/cloudhelp/ENU/Docs-Files/files/files-upload/Supported_Files_Docs.html)

Procore’s attachment viewer positively names:
```text
.doc .docx .pdf .csv .xlsx .bmp .gif .ico .jpe .jpeg .jpg .jfif .png .svg .tif .tiff .webp .mov .mp4 .mp3 .mpeg .ogg .m4a .wav
```
This is viewer coverage, not an exhaustive upload list. [Procore attachment viewer](https://support.procore.com/faq/what-file-types-and-formats-are-supported-in-the-attachment-viewer)

Procore Document Management explicitly permits these additional construction files without viewing:
```text
.dxf .step .stp .obj .glb .gltf .rvm .pts .las .laz .e57 .kof
```
[Procore upload documents](https://support.procore.com/products/online/user-guide/project-level/document-management/tutorials/upload-documents-to-the-document-management-tool)

### Base combined list, 138 extensions, with final additions below

```text
.3dm .3ds .3dxml .a .asm .avi .axm .bmp .bpm .brd .cam360 .catpart .catproduct .cgr .csv .dae .ddx .ddz .dgk .dgn .dlv3 .dmt .doc .docx .dwf .dwfx .dwg .dwt .dxf .e57 .eml .emodel .exp .f3d .fbx .flv .g .gbxml .gc3 .gif .glb .gltf .heic .iam .ico .idw .ifc .ige .iges .igs .ipt .iwm .jfif .jpe .jpeg .jpg .jt .key .kml .kmz .kof .las .laz .ln3 .m4a .max .mkv .model .mov .mp3 .mp4 .mpeg .mpp .msg .neu .numbers .nwc .nwd .obj .ogg .osb .pages .pan .par .pdf .pmlprj .pmlprjz .png .pps .ppt .pptx .prt .psm .psmodel .pts .rcp .rd3 .rvm .rvt .sab .sat .skp .sldasm .sldprt .smb .step .stl .stp .stpz .svg .tif .tiff .tn3 .tp3 .txt .usd .usda .usdc .usdz .vpb .vue .wav .webm .webp .wire .x_b .x_t .xas .xer .xls .xlsm .xlsx .xlt .xltx .xpr .zdd .zip .zipx
```

Append .ods, .odt and .rar from PlanRadar, .mat under the controller's broad-union decision, and retained .heif, .rtf and .odp. The resulting policy has 145 extensions. BuiltBasis accepts .mat for storage regardless of authoring application. Do not claim Autodesk universally accepts it. Retaining .a likewise means accepting an object archive for download. The controller explicitly approved both .a and .mat as download-only. Neither implies content validation.

SVG is Procore-positive but Autodesk-negative. XLSM is Fieldwire-positive. A union therefore includes both. Keep SVG out of document embedding and keep spreadsheets download-only. Do not silently carry forward a narrower previous prohibition. Do not add .exe, .js, .html or every non-blacklisted suffix on the theory that a competitor accepts arbitrary uploads. .7z, .tar and .gz were not enumerated by these positive sources; adding them would be a separate policy choice, although unrestricted PlanRadar storage covers them in principle.

Compare suffixes case-insensitively against the final filename component. Preserve the original filename as metadata. This is an acceptance policy, not malware detection or proof that bytes match the extension.

## Capability mapping

| Capability | Extensions |
| --- | --- |
| Image viewer attempt | .bmp .gif .heic .heif .ico .jfif .jpe .jpeg .jpg .png .svg .tif .tiff .webp |
| PDF viewer | .pdf |
| Email viewer | .eml .msg |
| Audio/video player attempt | .avi .flv .m4a .mkv .mov .mp3 .mp4 .mpeg .ogg .wav .webm |
| Upload/download only | Every remaining accepted extension, including Office, CAD/BIM, archives and specialist construction data |

“View” means an available viewer with a clear download fallback when decoding fails. It must not mean every variant of every format renders. Native browser support cannot guarantee HEIC/TIFF, all video codecs, encrypted email or damaged files. If the approved image requirement instead means guaranteed cross-browser rendering, Plan 5 needs explicit image-decoder/derived-preview work. This research does not claim native image tags meet that stronger requirement.

SVG must be displayed only in an image context such as an img element pointing to a Blob URL. Never inject its source into the DOM or embed it as an iframe/object/document. Browsers restrict scripts and external resources in SVG image contexts; those restrictions do not apply to direct document viewing. Force ordinary downloads and preserve defensive response headers. [MDN SVG image restrictions](https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/SVG_as_an_image)

TIFF browser support is limited. HEIC must be detected at runtime. Existing immutable-original plus display-copy conventions could support later normalization without changing originals. No new image-conversion service is justified by this task. [MDN image formats](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types)

## Browser email parsing

Recommended exact candidate pins:

| Package | Candidate pin | License | Role |
| --- | --- | --- | --- |
| postal-mime | 4.0.2 | MIT-0 | EML parsing in a browser Worker |
| @kenjiuno/msgreader | 1.28.0 | Apache-2.0 | MSG parsing in a browser Worker |
| htmlparser2 | 12.0.0 | MIT | Optional inert HTML-to-text tokenization for HTML-only bodies |

PostalMime explicitly supports browsers and Workers with zero dependencies. It accepts ArrayBuffer/Blob/ReadableStream, but stream input is buffered before parsing. Use arraybuffer attachment output, not base64. Recommended settings are maxNestingDepth 32, maxHeadersSize 262144 and maxRfc822NestingDepth 0, with forceRfc822Attachments true. These settings are proposed application limits. Its limits do not bound multipart breadth. Parsed text and HTML are separate; do not assume it synthesizes plaintext from HTML. [Published package](https://www.npmjs.com/package/postal-mime?activeTab=dependencies), [maintainer API and license](https://raw.githubusercontent.com/postalsys/postal-mime/master/README.md)

MSGReader accepts ArrayBuffer/DataView. getFileData provides message fields and attachment metadata; getAttachment returns bytes for one selected attachment. It exposes body, bodyHtml, binary html and compressedRtf as distinct properties. Prefer body; convert HTML to text if needed. Compressed RTF alone requires additional RTF conversion, which this minimal recommendation does not include. Show an explicit unavailable-body message and offer the original download for that case, encrypted messages, malformed files or parser errors. Do not silently display an empty body as success. Its transitive dependencies include iconv-lite and @kenjiuno/decompressrtf; decompression is not a complete RTF renderer. [Published version/license](https://www.npmjs.com/package/%40kenjiuno/msgreader?activeTab=versions), [maintainer example](https://raw.githubusercontent.com/HiraokaHyperTools/msgreader/master/README.md), [body field API](https://hiraokahypertools.github.io/msgreader/typedoc/interfaces/MsgReader.SomeOxProps.html)

htmlparser2 is a pure parser, not a sanitizer or renderer. Its event API can collect decoded text while discarding script/style content and adding line breaks for block boundaries. This avoids a live DOM and network fetching. Use it in the Worker only for HTML-only messages. Do not use regex tag stripping or attach parsed nodes to the page. [Published version/license](https://www.npmjs.com/package/htmlparser2), [maintainer repository](https://github.com/fb55/htmlparser2)

Fetch the original through the existing authorized occurrence route after the viewer opens. Parse in one cancellable Worker. Transfer the ArrayBuffer rather than cloning it. Return an explicit whitelist of subject, sender, recipients, date, plaintext and attachment metadata. Render every field with escaped text/textContent. No raw HTML, remote images, CSS, scripts, automatic link loading or CID image rendering. No external network access is needed by these parsers.

Keep attachment bytes in the Worker until the user explicitly requests one. Offer an ordinary local Blob download with a cleaned filename and application/octet-stream. Do not automatically preview embedded executables or recursively parse attached emails. Do not write these attachments back to server storage. Revoke Blob URLs and terminate the Worker when the viewer closes or the share session ends.

A Worker prevents UI blocking but does not impose a browser memory quota. PostalMime and MSGReader may amplify a 100 MB input several-fold. Use a visible cancel action and deadline, and handle Worker failure with original download. Do not claim guaranteed preview of the largest permitted upload on low-memory phones. Suggested display limits are 100,000 body characters and 200 attachment rows with explicit truncation. Those output limits do not bound parsing memory.

Remaining Plan 5 validation: malformed/deep/broad MIME; ANSI MSG; MSG with bodyHtml/binary html; RTF-only and encrypted fallback; actual embedded attachment download UI; Worker cancel; large input failure; supported-browser UI builds. The focused proof below covers only the listed synthetic cases.

## Minimal Plan 4 API recommendation

Add viewer capability metadata such as viewerKind = image | pdf | email | media | null using the approved suffix policy. Retain existing authorized original-byte owner/share routes and occurrence checks. A small capability-descriptor endpoint is sufficient if needed by the UI; no server email parsing/extraction, Office conversion or CAD viewer is needed. Capability metadata must say which viewer to attempt, not assert successful decoding.

The future browser viewer can fetch bytes with the existing bearer/header authorization, then use Blob URLs. This avoids putting share tokens in player URLs. It entails downloading the entire object before a simple local player can use it. The revised Plan 4 adds authenticated single-range responses. The browser still needs a bearer-safe fetch strategy; native video range support alone does not solve that integration.

## Media behavior

A filename identifies a container at best. Codec, profile, operating system and browser decide playback. MP4/H.264/AAC and WebM/VP8-or-VP9/Opus are reasonable test fixtures, not universal guarantees. Use canPlayType as a hint, then handle the actual media error. AVI/FLV/MKV frequently need download fallback. Do not install ffmpeg or add transcoding infrastructure merely to make every accepted file playable. [MDN containers](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Containers), [MDN format support](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats)

## Honest 100 MB limit

Cloudflare Free/Pro documentation states a 100 MB maximum upload request, and the zone setting can be lower. It does not establish a byte-precise binary-vs-decimal promise. Use a conservative application request-body ceiling of 100,000,000 bytes and verify deployment settings. Multipart metadata, boundaries and any display copy occupy part of that request. [Cloudflare 413 documentation](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/4xx-client-error/error-413/)

Recommended existing-multipart contract: total body <=100,000,000 bytes. The UI computes or bounds the actual metadata and multipart overhead for its request. All binary parts, including an optional display copy, share the remaining body budget. Bound filename/header/field sizes and count actual request bytes, including rejected parts. There is no arbitrary fixed overhead reservation. The independent Plan 4 Markdown replay passed the request ceiling, exact-100-MB-body and delayed-epilogue regression tests.

Display “100 MB per request, including metadata and preview copies” or equivalent precise help. Do not advertise a full 100,000,000-byte multipart file under a 100,000,000-byte request ceiling. A raw-body upload could remove multipart overhead but changes the existing protocol. No chunking or new service is needed. A 100 MiB payload (104,857,600 bytes) does not meet this conservative policy.

## Final exact policy list (145)

```text
.3dm .3ds .3dxml .a .asm .avi .axm .bmp .bpm .brd .cam360 .catpart .catproduct .cgr .csv .dae .ddx .ddz .dgk .dgn .dlv3 .dmt .doc .docx .dwf .dwfx .dwg .dwt .dxf .e57 .eml .emodel .exp .f3d .fbx .flv .g .gbxml .gc3 .gif .glb .gltf .heic .heif .iam .ico .idw .ifc .ige .iges .igs .ipt .iwm .jfif .jpe .jpeg .jpg .jt .key .kml .kmz .kof .las .laz .ln3 .m4a .mat .max .mkv .model .mov .mp3 .mp4 .mpeg .mpp .msg .neu .numbers .nwc .nwd .obj .odp .ods .odt .ogg .osb .pages .pan .par .pdf .pmlprj .pmlprjz .png .pps .ppt .pptx .prt .psm .psmodel .pts .rar .rcp .rd3 .rtf .rvm .rvt .sab .sat .skp .sldasm .sldprt .smb .step .stl .stp .stpz .svg .tif .tiff .tn3 .tp3 .txt .usd .usda .usdc .usdz .vpb .vue .wav .webm .webp .wire .x_b .x_t .xas .xer .xls .xlsm .xlsx .xlt .xltx .xpr .zdd .zip .zipx
```

## Focused parser proof

Reproducible source: [email viewer probe](fixtures/2026-10-03-email-viewer-probe/README.md). The original run used an isolated scratch directory. Exact installed direct versions are postal-mime 4.0.2, @kenjiuno/msgreader 1.28.0, htmlparser2 12.0.0 and esbuild 0.25.12 (build tool only). package-lock.json preserves transitive resolution. Installation used --ignore-scripts. Root dependencies were unchanged.

probe.mjs constructs a synthetic multipart EML and a synthetic 2,560-byte MSG compound file. The MSG fixture is generated with the installed package's own Burner helper. It contains Unicode subject, sender and plain body streams. This tests reader mechanics, not independent conformance against Outlook exports. No real message or private fixture was downloaded.

Commands executed successfully:

```text
esbuild probe.mjs --bundle --platform=browser --format=esm --outfile=browser-probe.mjs
node --experimental-vm-modules run.mjs
```

The browser-target bundle was 938.5 KB unminified including the fixture generator. It had no unresolved Node imports. run.mjs executes it in a VM with browser-style globals but no process, Buffer, require or DOM. A fetch trap throws on any attempted request. All assertions passed: decoded EML subject “Synthetic ✓”; HTML-only text “Hello & safe”; script content omitted; tracking-image URL never fetched; nested.eml remained a downloadable byte attachment; MSG Unicode subject “Synthetic MSG ✓”, sender and plaintext body matched. Actual fetch count was zero.

The HTML tokenizer recipe is in probe.mjs. It collects text events, decodes entities, skips script/style/template contents and adds block separators. The fixture is a feasibility proof, not an exhaustive malformed-HTML test or production sanitizer. Nothing ever renders the original HTML. A production bounded collector must stop output growth before truncation, handle malformed nesting defensively, and keep parser work cancellable in its Worker.

This proves bundled browser-compatible execution for those fixtures. It does not prove a real browser Worker UI, arbitrary MSG/EML variants, RTF conversion, low-memory-device behavior, or that dependencies are vulnerability-free. Browser parsing remains a Plan 5 feature; Plan 4 needs only capability metadata and existing authorized byte access.
