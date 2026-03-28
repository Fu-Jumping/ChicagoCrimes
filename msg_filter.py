
import sys
import re

mapping = {'add chicago districts geojson': '添加芝加哥地区的 geojson', 'add system-level ui upgrade design and plan': '添加系统级 UI 升级设计与计划', 'add geo districts endpoint': '添加地理区域端点', 'add geo heatmap endpoint': '添加地理热力图端点', 'add route presentation metadata': '添加路由展示元数据', 'add shared analysis module card': '添加共享分析模块卡片', 'complete system-level UI upgrade': '完成系统级 UI 升级', 'create CrimeHeatMap component': '创建犯罪热力图组件', 'create TimelinePlayer component': '创建时间轴播放组件', 'create TypeFilterSelect component': '创建类型过滤选择组件', 'define route presentation metadata': '定义路由展示元数据', 'install leaflet and add geo apis': '安装 leaflet 并添加地理 API', 'integrate MapView and routing': '集成地图视图与路由', 'rebuild app chrome with route backgrounds': '使用路由背景重建应用框架', 'fix typecheck errors in map components': '修复地图组件中的类型检查错误', 'restore scrolling ability and copy background images': '恢复滚动功能并复制背景图片', 'remove redundant filters from page shells': '从页面外壳移除冗余过滤器', 'upgrade sidebar to global control center and add real metrics': '将侧边栏升级为全局控制中心并添加真实指标', 'add print styles and update snapshots': '添加打印样式并更新快照'}

def translate_message(msg):
    lines = msg.splitlines()
    if not lines:
        return msg
    
    first_line = lines[0]
    match = re.match(r'^([^:]+):\s*(.*)$', first_line)
    if match:
        prefix = match.group(1)
        description = match.group(2).strip()
        if description in mapping:
            lines[0] = f"{prefix}: {mapping[description]}"
    
    return '\n'.join(lines)

if __name__ == '__main__':
    # Use binary stdin and decode as utf-8 to avoid issues on Windows
    msg = sys.stdin.buffer.read().decode('utf-8')
    # Write to stdout using binary to avoid encoding issues on Windows
    sys.stdout.buffer.write(translate_message(msg).encode('utf-8'))
