from __future__ import annotations

import os
import subprocess
import sys
import time
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent
BACKEND_DIR = REPO_ROOT / "backend"
FRONTEND_DIR = REPO_ROOT / "frontend"
ENV_FILE = REPO_ROOT / ".env"
REQUIRED_ENV_VARS = ["MYSQL_USER", "MYSQL_HOST", "MYSQL_PORT", "MYSQL_DATABASE"]


def read_env_file(file_path: Path) -> dict[str, str]:
    env_map: dict[str, str] = {}
    if not file_path.exists():
        return env_map
    for raw in file_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env_map[key.strip()] = value.strip().strip("'").strip('"')
    return env_map


def ensure_root_directory() -> None:
    current = Path.cwd().resolve()
    if current == REPO_ROOT:
        return
    print("启动失败：当前目录不是仓库根目录。")
    print(f"当前目录：{current}")
    print(f"仓库根目录：{REPO_ROOT}")
    print("修复建议：")
    print(f'  cd "{REPO_ROOT}"')
    print("  python start.py dev")
    raise SystemExit(1)


def ensure_project_layout() -> None:
    required_paths = [
        BACKEND_DIR / "main.py",
        FRONTEND_DIR / "package.json",
    ]
    missing = [str(p) for p in required_paths if not p.exists()]
    if missing:
        print("启动失败：项目目录结构不完整。")
        for item in missing:
            print(f"- 缺失文件：{item}")
        raise SystemExit(1)


def collect_runtime_env() -> dict[str, str]:
    runtime_env = os.environ.copy()
    file_env = read_env_file(ENV_FILE)
    runtime_env.update(file_env)
    return runtime_env


def ensure_required_env(runtime_env: dict[str, str]) -> None:
    missing_vars = [key for key in REQUIRED_ENV_VARS if not runtime_env.get(key)]
    if not missing_vars:
        return
    print("提示：尚未配置数据库环境变量，将以首次设置向导模式启动。")
    print("缺少以下键（可稍后通过向导自动配置）：")
    for key in missing_vars:
        print(f"  - {key}")
    print(f'如需手动配置，可参考："{REPO_ROOT / ".env.example"}"')


def resolve_backend_python() -> str:
    venv_python = BACKEND_DIR / "venv" / "Scripts" / "python.exe"
    if venv_python.exists():
        return str(venv_python)
    return sys.executable


def normalize_command(command: list[str]) -> list[str]:
    if os.name == "nt" and command and command[0].lower() == "npm":
        normalized = [*command]
        normalized[0] = "npm.cmd"
        return normalized
    return command


def run_check() -> None:
    ensure_root_directory()
    ensure_project_layout()
    runtime_env = collect_runtime_env()
    ensure_required_env(runtime_env)
    print("环境检查通过：可执行统一联启。")


def run_command_step(title: str, command: list[str], cwd: Path, env: dict[str, str]) -> None:
    normalized_command = normalize_command(command)
    print(f"[验证步骤] {title}")
    print(f"[执行命令] {' '.join(normalized_command)}")
    completed = subprocess.run(normalized_command, cwd=str(cwd), env=env, check=False)
    if completed.returncode != 0:
        print(f"[失败] {title}，退出码：{completed.returncode}")
        raise SystemExit(completed.returncode)
    print(f"[通过] {title}")


def run_verify() -> None:
    ensure_root_directory()
    ensure_project_layout()
    runtime_env = collect_runtime_env()
    ensure_required_env(runtime_env)
    backend_python = resolve_backend_python()
    run_command_step("根级启动前置检查", [sys.executable, "start.py", "check"], REPO_ROOT, runtime_env)
    run_command_step(
        "后端回归可用性验证",
        [backend_python, "-m", "unittest", "discover", "-s", "tests", "-p", "test_task*.py"],
        BACKEND_DIR,
        runtime_env,
    )
    run_command_step("前端 typecheck + 性能门禁（扩展版）", ["npm", "run", "gate:release"], FRONTEND_DIR, runtime_env)
    print("根级联启验证通过：前后端可用性与回归门禁均通过。")


def run_dev() -> None:
    ensure_root_directory()
    ensure_project_layout()
    runtime_env = collect_runtime_env()
    ensure_required_env(runtime_env)

    backend_python = resolve_backend_python()
    backend_host = runtime_env.get("BACKEND_HOST", "0.0.0.0")
    backend_port = runtime_env.get("BACKEND_PORT", "8000")
    frontend_port = runtime_env.get("FRONTEND_DEV_PORT", "5173")

    backend_cmd = [
        backend_python,
        "-m",
        "uvicorn",
        "main:app",
        "--host",
        backend_host,
        "--port",
        backend_port,
        "--reload",
    ]
    frontend_cmd = normalize_command(["npm", "run", "dev"])

    print("统一联启开始：")
    print(f"- 后端地址：http://{backend_host}:{backend_port}")
    print(f"- 前端 DevTools 端口预期：{frontend_port}")
    print("按 Ctrl+C 可停止全部进程。")

    try:
        backend_proc = subprocess.Popen(backend_cmd, cwd=str(BACKEND_DIR), env=runtime_env)
        frontend_proc = subprocess.Popen(frontend_cmd, cwd=str(FRONTEND_DIR), env=runtime_env)
    except FileNotFoundError as exc:
        print(f"启动失败：{exc}")
        print("请确认 Python 运行时与 npm 已正确安装并可在命令行使用。")
        raise SystemExit(1)

    processes = {"backend": backend_proc, "frontend": frontend_proc}
    try:
        while True:
            for name, proc in processes.items():
                code = proc.poll()
                if code is not None:
                    print(f"{name} 进程已退出，退出码：{code}")
                    for other_name, other_proc in processes.items():
                        if other_name != name and other_proc.poll() is None:
                            other_proc.terminate()
                            try:
                                other_proc.wait(timeout=5)
                            except subprocess.TimeoutExpired:
                                other_proc.kill()
                    raise SystemExit(code if code != 0 else 0)
            time.sleep(0.5)
    except KeyboardInterrupt:
        print("收到停止信号，正在关闭所有进程...")
        for proc in processes.values():
            if proc.poll() is None:
                proc.terminate()
        for proc in processes.values():
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
        raise SystemExit(0)


def main() -> None:
    mode = sys.argv[1].strip().lower() if len(sys.argv) > 1 else "dev"
    if mode == "check":
        run_check()
        return
    if mode == "verify":
        run_verify()
        return
    if mode == "dev":
        run_dev()
        return
    print("用法：")
    print("  python start.py dev")
    print("  python start.py check")
    print("  python start.py verify")
    raise SystemExit(1)


if __name__ == "__main__":
    main()
