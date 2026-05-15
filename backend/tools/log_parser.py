"""
Log Parser Tool
===============
Deterministic log analysis without LLM.
Extracts:
- File paths mentioned in logs
- Error message snippets
- Line numbers
- Key signal counts
"""

import re
from typing import List


class LogParser:
    # Patterns to extract Python file paths from tracebacks
    FILE_PATH_PATTERNS = [
        r'File "([^"]+\.py)"',
        r"FAILED ([\w/.-]+\.py)::",
        r"ERROR in ([\w/.-]+\.[a-z]+)",
        r"([a-zA-Z0-9_/.-]+\.(py|ts|tsx|js|jsx|json|yaml|yml|txt|toml|cfg|ini|dockerfile))",
    ]

    # Common error message patterns to extract
    ERROR_PATTERNS = [
        r"(Error: .{10,100})",
        r"(ERROR: .{10,100})",
        r"(FAILED .{5,80})",
        r"(Exception: .{10,100})",
        r"(ModuleNotFoundError: .{10,100})",
        r"(ImportError: .{10,100})",
        r"(SyntaxError: .{10,100})",
        r"(TypeError: .{10,100})",
        r"(KeyError: .{5,50})",
        r"(ValueError: .{10,100})",
        r"(error TS\d+: .{10,100})",
        r"(npm ERR! .{5,80})",
    ]

    def extract_signals(self, logs: str) -> dict:
        """Extract all signals from raw log text."""
        return {
            "file_paths": self.extract_file_paths(logs),
            "error_messages": self.extract_errors(logs),
            "line_count": len(logs.split("\n")),
            "char_count": len(logs),
            "signal_count": self._count_signals(logs),
        }

    def extract_file_paths(self, logs: str) -> List[str]:
        """Extract unique file paths mentioned in logs."""
        paths = set()
        for pattern in self.FILE_PATH_PATTERNS:
            matches = re.findall(pattern, logs, re.IGNORECASE)
            for match in matches:
                if isinstance(match, tuple):
                    match = match[0]
                # Filter out noise
                if len(match) > 3 and "/" in match or match.endswith((".py", ".ts", ".js", ".json")):
                    paths.add(match.strip())
        return list(paths)[:20]

    def extract_errors(self, logs: str) -> List[str]:
        """Extract key error message lines."""
        errors = []
        seen = set()
        for pattern in self.ERROR_PATTERNS:
            matches = re.findall(pattern, logs, re.IGNORECASE | re.MULTILINE)
            for match in matches[:3]:
                if match not in seen:
                    errors.append(match.strip()[:200])
                    seen.add(match)
        return errors[:15]

    def _count_signals(self, logs: str) -> int:
        """Count total error/failure signals in logs."""
        count = 0
        keywords = ["error", "failed", "failure", "exception", "traceback", "err!"]
        for kw in keywords:
            count += logs.lower().count(kw)
        return count

    def extract_step_name(self, logs: str) -> str:
        """Try to extract which CI step failed."""
        # GitHub Actions step pattern
        match = re.search(r"##\[error\](.{5,100})", logs)
        if match:
            return match.group(1).strip()

        match = re.search(r"Run (.{5,60})\n.*(?:error|failed)", logs, re.IGNORECASE)
        if match:
            return match.group(1).strip()

        return "Unknown step"

    def truncate_for_llm(self, logs: str, max_chars: int = 4000) -> str:
        """
        Smart truncation for LLM context:
        - Keep first 500 chars (job setup)
        - Keep last 3000 chars (actual error)
        """
        if len(logs) <= max_chars:
            return logs

        head = logs[:500]
        tail = logs[-(max_chars - 500):]
        return f"{head}\n\n[... {len(logs) - max_chars} chars omitted ...]\n\n{tail}"