#!/usr/bin/env python3
"""
convert_docx_to_pdf.py — Convert DOCX files to PDF using LibreOffice.

Usage:
    python scripts/convert_docx_to_pdf.py INPUT.docx [--out_dir DIR]

Requires LibreOffice installed (apt install libreoffice-writer).
"""

import argparse
import json
import os
import subprocess
import sys


def convert_docx_to_pdf(docx_path: str, out_dir: str | None = None) -> str:
    """Convert a DOCX file to PDF via LibreOffice headless mode.

    Returns the path to the generated PDF.
    Raises RuntimeError on failure.
    """
    docx_path = os.path.abspath(docx_path)
    if not os.path.isfile(docx_path):
        raise FileNotFoundError(f"Input file not found: {docx_path}")

    if out_dir is None:
        out_dir = os.path.dirname(docx_path)
    out_dir = os.path.abspath(out_dir)
    os.makedirs(out_dir, exist_ok=True)

    result = subprocess.run(
        [
            "libreoffice",
            "--headless",
            "--convert-to", "pdf",
            "--outdir", out_dir,
            docx_path,
        ],
        capture_output=True,
        text=True,
        timeout=120,
    )

    if result.returncode != 0:
        raise RuntimeError(
            f"LibreOffice conversion failed (exit {result.returncode}):\n"
            f"stdout: {result.stdout}\nstderr: {result.stderr}"
        )

    base = os.path.splitext(os.path.basename(docx_path))[0]
    pdf_path = os.path.join(out_dir, f"{base}.pdf")

    if not os.path.isfile(pdf_path):
        raise RuntimeError(
            f"Conversion reported success but PDF not found at {pdf_path}\n"
            f"stdout: {result.stdout}"
        )

    return pdf_path


def main():
    parser = argparse.ArgumentParser(
        description="Convert DOCX to PDF using LibreOffice"
    )
    parser.add_argument("input", help="Path to the .docx file")
    parser.add_argument(
        "--out_dir",
        default=None,
        help="Output directory (defaults to same directory as input)",
    )
    args = parser.parse_args()

    try:
        pdf_path = convert_docx_to_pdf(args.input, args.out_dir)
        print(json.dumps({
            "success": True,
            "pdf_exists": True,
            "pdf": pdf_path,
            "size_bytes": os.path.getsize(pdf_path),
        }, ensure_ascii=False))
    except (FileNotFoundError, RuntimeError) as exc:
        print(json.dumps({
            "success": False,
            "pdf_exists": False,
            "pdf": None,
            "error": str(exc),
        }, ensure_ascii=False))
        sys.exit(1)


if __name__ == "__main__":
    main()
