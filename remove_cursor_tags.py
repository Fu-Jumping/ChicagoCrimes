import os
import subprocess

def rewrite_history_remove_cursor():
    # Create a temporary filter script to remove "Made-with: Cursor"
    filter_script_path = os.path.abspath('remove_cursor_filter.py').replace('\\', '/')
    
    with open('remove_cursor_filter.py', 'w', encoding='utf-8') as f:
        f.write("""
import sys

if __name__ == '__main__':
    # Use binary stdin and decode as utf-8 to avoid issues on Windows
    msg = sys.stdin.buffer.read().decode('utf-8')
    
    # Remove "Made-with: Cursor" and any surrounding whitespace/newlines
    # We'll use a simple string replacement for the exact tag
    target = "Made-with: Cursor"
    if target in msg:
        # Replace target and strip trailing whitespace that might be left behind
        new_msg = msg.replace(target, "").strip()
        sys.stdout.buffer.write(new_msg.encode('utf-8'))
    else:
        sys.stdout.buffer.write(msg.encode('utf-8'))
""")

    # Run git filter-branch
    cmd = [
        'git', 'filter-branch', '--force', '--msg-filter',
        f'python "{filter_script_path}"',
        '--', '--all'
    ]
    
    print("正在移除历史记录中的 'Made-with: Cursor'...")
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode == 0:
        print("成功移除。")
    else:
        print("移除失败：")
        print(result.stderr)

if __name__ == '__main__':
    rewrite_history_remove_cursor()
