# Media test fixtures

All media-* fixtures in this directory are original synthetic test data created for BuiltBasis. They contain no real correspondence, people, photographs, or project data. The synthetic images and messages are dedicated to the public domain under CC0-1.0. No upstream sample image is copied.

media-synthetic.heic is a genuine HEVC-encoded HEIF, generated with pillow-heif 1.3.0 (libheif encoder) from a 96 by 64 image containing red, green, blue and yellow quadrants. media-synthetic.png is the same image without compression. media-oriented.jpg stores the same pixels with EXIF Orientation 6, DateTimeOriginal 2026:10:04 13:15:16 and OffsetTimeOriginal +11:00. Browser tests must decode the HEIC and verify the JPEG appears as 64 by 96, with capture time 2026-10-04T02:15:16.000Z, while retaining identical original bytes.

media-html.eml is an HTML-only MIME message with encoded UTF-8 subject, inert hostile markup and a nested original EML attachment. media-compound.msg is a real compound file generated with the pinned msgreader test Burner and synthetic Unicode streams. media-active.svg is an original hostile SVG test fixture. Any tracker.invalid reference is intentional test content and must produce zero network requests.

The fixture generator uses Pillow and pillow-heif only as authoring tools. Neither is an application dependency. Encoding does not establish browser support; the Playwright conversion test does.
