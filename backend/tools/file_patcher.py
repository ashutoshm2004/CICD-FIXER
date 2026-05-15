"""
File Patcher Tool
=================
Applies patches and modifications to files in the workspace.
Creates unified diffs for PR review.
"""

import os
import difflib
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class FilePatcher:
    def __init__(self, workspace: str):
        self.workspace = workspace

    def apply_patch(self, file_path: str, original: str, replacement: str) -> dict:
        """
        Replace a string in a file and return the diff.
        Returns: {success, diff, error}
        """
        full_path = os.path.join(self.workspace, file_path)

        try:
            if os.path.exists(full_path):
                with open(full_path, "r") as f:
                    content = f.read()
            else:
                content = ""

            if original and original not in content:
                return {
                    "success": False,
                    "diff": "",
                    "error": f"Original text not found in {file_path}",
                }

            new_content = content.replace(original, replacement) if original else replacement
            diff = self._generate_diff(content, new_content, file_path)

            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, "w") as f:
                f.write(new_content)

            logger.info(f"[FilePatcher] Patched {file_path}")
            return {"success": True, "diff": diff, "error": None}

        except Exception as e:
            logger.error(f"[FilePatcher] Error patching {file_path}: {e}")
            return {"success": False, "diff": "", "error": str(e)}

    def append_to_file(self, file_path: str, content: str) -> dict:
        """Append content to a file, creating it if needed."""
        full_path = os.path.join(self.workspace, file_path)

        try:
            os.makedirs(os.path.dirname(full_path), exist_ok=True)

            original = ""
            if os.path.exists(full_path):
                with open(full_path, "r") as f:
                    original = f.read()

            new_content = original + content
            diff = self._generate_diff(original, new_content, file_path)

            with open(full_path, "a") as f:
                f.write(content)

            logger.info(f"[FilePatcher] Appended to {file_path}")
            return {"success": True, "diff": diff, "error": None}

        except Exception as e:
            logger.error(f"[FilePatcher] Error appending to {file_path}: {e}")
            return {"success": False, "diff": "", "error": str(e)}

    def read_file(self, file_path: str) -> Optional[str]:
        """Read a file from the workspace."""
        full_path = os.path.join(self.workspace, file_path)
        try:
            if os.path.exists(full_path):
                with open(full_path, "r") as f:
                    return f.read()
            return None
        except Exception:
            return None

    def _generate_diff(self, original: str, modified: str, file_path: str) -> str:
        """Generate a unified diff between two versions of a file."""
        diff = difflib.unified_diff(
            original.splitlines(keepends=True),
            modified.splitlines(keepends=True),
            fromfile=f"a/{file_path}",
            tofile=f"b/{file_path}",
            n=3,
        )
        return "".join(diff)

    def get_all_diffs(self) -> dict:
        """Get diffs for all modified files in the workspace."""
        # This would compare against git HEAD in a real implementation
        return {}