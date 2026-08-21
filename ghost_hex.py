#!/usr/bin/env python3
import argparse
import sys

VS_START = 0xE0100
VS_END = 0xE017F
ASCII_MAX = 0x7F


def encode_payload(payload: str) -> str:
    encoded = []
    for ch in payload:
        code = ord(ch)
        if code > ASCII_MAX:
            raise ValueError(
                f"non-ASCII payload character {ch!r} (U+{code:04X}); "
                "only 0x00-0x7F are supported"
            )
        encoded.append(chr(VS_START + code))
    return "".join(encoded)


def place_payload(carrier: str, encoded_payload: str, placement: str) -> str:
    if placement not in {"before", "after"}:
        raise ValueError("placement must be one of: before, after")
    if not encoded_payload:
        return carrier
    if placement == "after":
        return carrier + encoded_payload
    if not carrier:
        return encoded_payload
    return carrier[:-1] + encoded_payload + carrier[-1]


def encode(
    carrier: str,
    payload: str,
    allow_empty_carrier: bool = False,
    placement: str = "before",
) -> str:
    if not carrier and not allow_empty_carrier:
        raise ValueError("carrier text is required")
    return place_payload(carrier, encode_payload(payload), placement)


def split_encoded(text: str) -> tuple[str, str]:
    carrier_chars = []
    payload_chars = []
    for ch in text:
        code = ord(ch)
        if VS_START <= code <= VS_END:
            payload_chars.append(chr(code - VS_START))
            continue
        carrier_chars.append(ch)
    carrier = "".join(carrier_chars)
    payload = "".join(payload_chars)
    return carrier, payload


def decode(text: str) -> tuple[str, str]:
    return split_encoded(text)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="ghost-hex: ASCII <-> VS17-VS144 variation selectors"
    )
    sub = parser.add_subparsers(dest="command", required=True)

    enc = sub.add_parser("encode", help="encode payload into VS17-VS144 variation selectors")
    enc.add_argument("--carrier", required=True, help="visible carrier text")
    enc.add_argument("--payload", required=True, help="ASCII payload to hide")
    enc.add_argument(
        "--placement",
        choices=("before", "after"),
        default="before",
        help="insert payload before or after the final carrier character (default: before)",
    )
    enc.add_argument(
        "--allow-empty-carrier",
        action="store_true",
        help="allow encoding with an empty carrier",
    )

    dec = sub.add_parser("decode", help="decode VS17-VS144 variation selectors from any position")
    dec.add_argument("--text", required=True, help="text containing VS17-VS144 payload data")
    dec.add_argument(
        "--only-payload",
        action="store_true",
        help="output only the decoded payload",
    )
    dec.add_argument(
        "--only-carrier",
        action="store_true",
        help="output only the carrier text",
    )

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    try:
        if args.command == "encode":
            output = encode(
                args.carrier,
                args.payload,
                allow_empty_carrier=args.allow_empty_carrier,
                placement=args.placement,
            )
            sys.stdout.write(output)
            return 0

        if args.only_payload and args.only_carrier:
            raise ValueError("choose only one of --only-payload or --only-carrier")

        carrier, payload = decode(args.text)
        if args.only_payload:
            sys.stdout.write(payload)
            return 0
        if args.only_carrier:
            sys.stdout.write(carrier)
            return 0

        sys.stdout.write("carrier:\n")
        sys.stdout.write(carrier)
        sys.stdout.write("\n\n")
        sys.stdout.write("payload:\n")
        sys.stdout.write(payload)
        return 0
    except ValueError as exc:
        sys.stderr.write(f"error: {exc}\n")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
