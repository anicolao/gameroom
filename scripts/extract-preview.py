"""Extract website data only; never execute files from a preview artifact."""
import pathlib
import stat
import sys
import zipfile

archive, destination = sys.argv[1:]
root = pathlib.Path(destination).resolve()
with zipfile.ZipFile(archive) as bundle:
    entries = bundle.infolist()
    if len(entries) > 10000 or sum(item.file_size for item in entries) > 512 * 1024 * 1024:
        raise ValueError('Preview artifact is too large')
    for item in entries:
        path = pathlib.PurePosixPath(item.filename)
        mode = item.external_attr >> 16
        if (path.is_absolute() or '..' in path.parts or '\\' in item.filename
                or any(part.lower() in ('.git', '.github') for part in path.parts)
                or stat.S_ISLNK(mode)
                or (stat.S_IFMT(mode) and not (stat.S_ISREG(mode) or stat.S_ISDIR(mode)))):
            raise ValueError('Unsafe preview artifact entry')
    root.mkdir(parents=True, exist_ok=False)
    bundle.extractall(root)
