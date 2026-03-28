
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
