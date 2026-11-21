"""MkDocs build hooks.

Personal files (25–27) are kept locally and excluded from the published site.
Links to them in public pages are turned into plain text so the site has no broken links.
"""
import re

_PRIVATE_LINK = re.compile(
    r"\[([^\]]+)\]\((?:\./)?(?:25_My_Dell_Experience|26_My_AI_Projects|27_Behavioral_HR)\.md(?:#[^)]*)?\)"
)


def on_page_markdown(markdown, **kwargs):
    return _PRIVATE_LINK.sub(r"\1 *(private notes)*", markdown)
