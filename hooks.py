"""MkDocs build hooks.

Personal files (25–27) are kept locally and excluded from the published site.
They can be uploaded to the owner-only Private notes page (docs/private.md, stored in Firestore);
links to them in public pages point there, so the site has no broken links.
"""
import re

_PRIVATE_LINK = re.compile(
    r"\[([^\]]+)\]\((?:\./)?(25_My_Dell_Experience|26_My_AI_Projects|27_Behavioral_HR)\.md(#[^)]*)?\)"
)


def on_page_markdown(markdown, page, **kwargs):
    # point to the owner-only Private notes page instead (it shows the note only to the signed-in owner)
    prefix = "" if page.file.src_uri == "index.md" else "../"

    def link(m):
        return '<a href="%sprivate/?note=%s%s">%s</a> 🔒' % (prefix, m.group(2), m.group(3) or "", m.group(1))

    return _PRIVATE_LINK.sub(link, markdown)
