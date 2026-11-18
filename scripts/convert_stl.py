"""Convert the template STLs into web assets.

Writes, per part: public/models/<id>.glb (welded, centred, millimetres, Z = depth)
and for frames public/masks/<id>.png (white = photo area under the frame opening).
Usage: python convert_stl.py <stl_dir> <out_dir>
"""
import json, struct, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

PARTS = {
    # id: (file prefix, kind)
    "petite":  ("obj_18_", "frame"),
    "oval":    ("obj_19_", "frame"),
    "grand":   ("obj_21_", "frame"),
    "heart":   ("obj_22_", "frame"),
    "classic": ("obj_23_", "frame"),
    "wide":    ("obj_24_", "frame"),
    "box":     ("obj_17_", "box"),
}
MASK_RES = 0.2  # mm per pixel


def load_stl(path):
    with open(path, "rb") as f:
        f.read(80)
        n = struct.unpack("<I", f.read(4))[0]
        rec = np.dtype([("n", "<3f4"), ("v", "<9f4"), ("a", "<u2")])
        d = np.frombuffer(f.read(n * 50), dtype=rec)
    return d["v"].reshape(-1, 3, 3).astype(np.float64)


def weld(tris):
    flat = tris.reshape(-1, 3)
    keys = np.round(flat * 1e4).astype(np.int64)
    uniq, inverse = np.unique(keys, axis=0, return_inverse=True)
    pos = np.zeros((len(uniq), 3))
    np.add.at(pos, inverse.ravel(), flat)
    pos /= np.bincount(inverse.ravel())[:, None]
    idx = inverse.reshape(-1, 3)
    idx = idx[(idx[:, 0] != idx[:, 1]) & (idx[:, 1] != idx[:, 2]) & (idx[:, 0] != idx[:, 2])]
    return pos.astype(np.float32), idx.astype(np.uint32)


def write_glb(path, pos, idx):
    pb, ib = pos.tobytes(), idx.ravel().tobytes()
    pad = lambda b: b + b"\0" * (-len(b) % 4)
    pb, ib = pad(pb), pad(ib)
    gltf = {
        "asset": {"version": "2.0"},
        "scene": 0, "scenes": [{"nodes": [0]}], "nodes": [{"mesh": 0}],
        "meshes": [{"primitives": [{"attributes": {"POSITION": 0}, "indices": 1}]}],
        "buffers": [{"byteLength": len(pb) + len(ib)}],
        "bufferViews": [
            {"buffer": 0, "byteOffset": 0, "byteLength": pos.nbytes, "target": 34962},
            {"buffer": 0, "byteOffset": len(pb), "byteLength": idx.nbytes, "target": 34963},
        ],
        "accessors": [
            {"bufferView": 0, "componentType": 5126, "count": len(pos), "type": "VEC3",
             "min": pos.min(0).tolist(), "max": pos.max(0).tolist()},
            {"bufferView": 1, "componentType": 5125, "count": idx.size, "type": "SCALAR"},
        ],
    }
    js = json.dumps(gltf).encode()
    js += b" " * (-len(js) % 4)
    body = pb + ib
    out = struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(body))
    out += struct.pack("<II", len(js), 0x4E4F534A) + js
    out += struct.pack("<II", len(body), 0x004E4942) + body
    Path(path).write_bytes(out)


def opening_mask(tris, w, h):
    # Occupancy seen from the front, then flood-fill the opening from the centre.
    sub = 6
    wts = np.array([[a / sub, b / sub, 1 - (a + b) / sub]
                    for a in range(sub + 1) for b in range(sub + 1 - a)])
    pts = np.einsum("kj,tjc->tkc", wts, tris).reshape(-1, 3)
    W, H = int(np.ceil(w / MASK_RES)), int(np.ceil(h / MASK_RES))
    xi = np.clip(((pts[:, 0] + w / 2) / MASK_RES).astype(int), 0, W - 1)
    yi = np.clip(((h / 2 - pts[:, 1]) / MASK_RES).astype(int), 0, H - 1)
    occ = np.zeros((H, W), np.uint8)
    occ[yi, xi] = 255
    img = Image.fromarray(occ).filter(ImageFilter.MaxFilter(5))
    ImageDraw.floodfill(img, (W // 2, H // 2), 128)
    hole = (np.array(img) == 128).astype(np.uint8) * 255
    # Let the photo run ~1.6 mm under the frame lip so no wall shows at the edge.
    under = Image.fromarray(hole).filter(ImageFilter.MaxFilter(17))
    ys, xs = np.nonzero(hole)
    return under, {
        "x0": float(xs.min() * MASK_RES - w / 2), "x1": float(xs.max() * MASK_RES - w / 2),
        "y0": float(h / 2 - ys.max() * MASK_RES), "y1": float(h / 2 - ys.min() * MASK_RES),
    }


def main(src, out):
    src, out = Path(src), Path(out)
    meta = {}
    for pid, (prefix, kind) in PARTS.items():
        f = next(src.glob(prefix + "*.stl"))
        tris = load_stl(f)
        mn, mx = tris.reshape(-1, 3).min(0), tris.reshape(-1, 3).max(0)
        tris -= [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, mn[2]]
        size = (mx - mn).tolist()
        pos, idx = weld(tris)
        write_glb(out / "models" / f"{pid}.glb", pos, idx)
        entry = {"kind": kind, "width": size[0], "height": size[1], "depth": size[2], "tris": len(idx)}
        if kind == "frame":
            mask, opening = opening_mask(tris, size[0], size[1])
            mask.save(out / "masks" / f"{pid}.png", optimize=True)
            entry["opening"] = opening
        meta[pid] = entry
        print(pid, f.name, entry)
    (out / "parts.json").write_text(json.dumps(meta, indent=2))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
