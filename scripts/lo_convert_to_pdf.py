#!/usr/bin/env python3
"""
Convert a DOCX (or any LibreOffice-supported format) to PDF using soffice.

Usage:
    python lo_convert_to_pdf.py <input_file> [--out_dir <directory>]

The converted PDF is written to out_dir (defaults to the same directory as
the input file) with the same base name and a .pdf extension.
"""

import argparse
import os
import shutil
import subprocess
import sys
import tempfile


def convert_to_pdf(input_path: str, out_dir: str) -> str:
    """Convert input_path to PDF using LibreOffice headless mode.

    Returns the path to the generated PDF file.
    Raises RuntimeError on failure.
    """
    input_path = os.path.abspath(input_path)
    out_dir = os.path.abspath(out_dir)

    if not os.path.isfile(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")

    os.makedirs(out_dir, exist_ok=True)

    # LibreOffice writes the PDF next to the input file when --outdir is used.
    # We use a temp dir first to avoid collisions with concurrent calls.
    with tempfile.TemporaryDirectory() as tmp:
        cmd = [
            "soffice",
            "--headless",
            "--convert-to", "pdf",
            "--outdir", tmp,
            input_path,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)

        if result.returncode != 0:
            raise RuntimeError(
                f"soffice exited with code {result.returncode}.\n"
                f"stdout: {result.stdout}\nstderr: {result.stderr}"
            )

        base = os.path.splitext(os.path.basename(input_path))[0]
        tmp_pdf = os.path.join(tmp, base + ".pdf")

        if not os.path.isfile(tmp_pdf):
            raise RuntimeError(
                f"soffice ran but output PDF not found at {tmp_pdf}.\n"
                f"stdout: {result.stdout}\nstderr: {result.stderr}"
            )

        dest_pdf = os.path.join(out_dir, base + ".pdf")
        shutil.move(tmp_pdf, dest_pdf)

    print(f"Converted: {input_path} → {dest_pdf}")
    return dest_pdf


def main():
    parser = argparse.ArgumentParser(description="Convert DOCX to PDF via LibreOffice.")
    parser.add_argument("input", help="Path to the input DOCX (or other LO-supported) file.")
    parser.add_argument("--out_dir", default=None,
                        help="Directory for the output PDF (default: same as input file).")
    args = parser.parse_args()

    out_dir = args.out_dir or os.path.dirname(os.path.abspath(args.input))

    try:
        pdf_path = convert_to_pdf(args.input, out_dir)
        print(f"PDF written to: {pdf_path}")
        sys.exit(0)
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
