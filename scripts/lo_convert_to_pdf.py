"""
Convert a DOCX (or any LibreOffice-supported format) to PDF using LibreOffice headless.
Usage: python lo_convert_to_pdf.py <input_file> [--out_dir <output_dir>]
"""
import argparse
import os
import subprocess
import sys


def convert_to_pdf(input_path: str, out_dir: str) -> str:
    input_path = os.path.abspath(input_path)
    out_dir = os.path.abspath(out_dir)

    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")

    os.makedirs(out_dir, exist_ok=True)

    cmd = [
        "libreoffice",
        "--headless",
        "--norestore",
        "--convert-to", "pdf",
        "--outdir", out_dir,
        input_path,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)

    if result.returncode != 0:
        raise RuntimeError(
            f"LibreOffice conversion failed (code {result.returncode}):\n"
            f"stdout: {result.stdout}\nstderr: {result.stderr}"
        )

    base = os.path.splitext(os.path.basename(input_path))[0]
    pdf_path = os.path.join(out_dir, base + ".pdf")

    if not os.path.exists(pdf_path):
        raise FileNotFoundError(
            f"Conversion ran but output PDF not found at: {pdf_path}\n"
            f"stdout: {result.stdout}\nstderr: {result.stderr}"
        )

    return pdf_path


def main():
    parser = argparse.ArgumentParser(description="Convert DOCX to PDF via LibreOffice")
    parser.add_argument("input", help="Path to the input DOCX file")
    parser.add_argument("--out_dir", default=".", help="Output directory for the PDF")
    args = parser.parse_args()

    pdf_path = convert_to_pdf(args.input, args.out_dir)
    print(f"PDF created: {pdf_path}")


if __name__ == "__main__":
    main()
