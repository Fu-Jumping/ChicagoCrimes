# -*- mode: python ; coding: utf-8 -*-
from pathlib import Path

backend_dir = Path(SPECPATH)   # SPECPATH = directory containing this .spec file

a = Analysis(
    [str(backend_dir / 'backend_entrypoint.py')],
    pathex=[str(backend_dir)],
    binaries=[],
    datas=[
        # sql/ directory is read at runtime by setup_service.py
        (str(backend_dir / 'sql'), 'sql'),
    ],
    hiddenimports=[
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.loops.asyncio',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.http.h11_impl',
        'uvicorn.protocols.http.httptools_impl',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.protocols.websockets.websockets_impl',
        'uvicorn.protocols.websockets.wsproto_impl',
        'uvicorn.lifespan',
        'uvicorn.lifespan.off',
        'uvicorn.lifespan.on',
        'pymysql.cursors',
        'pydantic_core',
        'anyio._backends._asyncio',
        'anyio._backends._trio',
        'app.routers.analytics',
        'app.routers.setup',
        'app.services.analytics',
        'app.services.setup_service',
        'app.models.crime',
        'app.schemas.crime',
        'app.config.env_file',
        'app.cache',
        'app.contracts',
        'app.database',
        'dotenv',
        'email.mime.text',
        'email.mime.multipart',
        'main',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'matplotlib', 'numpy', 'PIL', 'PyQt5', 'wx'],
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,   # no black cmd window
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='backend',
)
