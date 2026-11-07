import json
from pathlib import Path

def apply_tracking(html, main):
    script = (Path(__file__).parent/'tracking/browser.js').read_text(encoding='utf-8').strip()
    assert '</script' not in script
    assert main.count('Ku=``;function qu') == 1
    assert html.count('<script></script>') == 1
    main = main.replace('Ku=``;function qu', 'Ku='+json.dumps(script,ensure_ascii=False)+';function qu')
    old = 'function Zu(e,t,n){typeof window>`u`||typeof window.fbq!=`function`||window.fbq(`track`,e,t??{},n?{eventID:n}:void 0)}'
    assert main.count(old) == 1
    main = main.replace(old, 'function Zu(e,t,n){typeof window>`u`||window.edaMeta?.track(e,t,n)}')
    return html.replace('<script></script>', '<script>'+script+'</script>'), main

if __name__ == '__main__':
    root = Path(__file__).parent
    page = root/'dist/index.html'
    bundle = root/'dist/assets/index-COZobF80.js'
    html, main = apply_tracking(page.read_text(encoding='utf-8'),bundle.read_text(encoding='utf-8'))
    page.write_text(html,encoding='utf-8')
    bundle.write_text(main,encoding='utf-8')
