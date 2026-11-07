"""Keep the original poster; offer recovery outside the cross-origin player."""
def apply_video_recovery(route):
    start = route.index('function Cr(){')
    end = route.index('function wr(){', start)
    original = route[start:end]
    assert 'referrerPolicy:`strict-origin-when-cross-origin`' in original
    patched = original.replace('[t,n]=(0,_.useState)(!1);return', '[t,n]=(0,_.useState)(!1),[v,setV]=(0,_.useState)(0);return', 1)
    patched = patched.replace('src:`https://www.youtube.com/embed/wtEw2U25AR4?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1`', 'key:v,src:`https://${v%2?`www.youtube.com`:`www.youtube-nocookie.com`}/embed/wtEw2U25AR4?autoplay=1&mute=1&playsinline=1&rel=0`', 1)
    assert patched != original
    # A Fragment does not add a DOM wrapper or disturb the initial SSR poster.
    body = patched[patched.index('return')+6:-1]
    prefix = patched[:patched.index('return')]
    recovery = '(0,W.jsxs)(`div`,{className:`mt-3 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground`,children:[(0,W.jsx)(`span`,{children:`O vídeo não abriu?`}),(0,W.jsx)(`button`,{type:`button`,onClick:()=>setV(v=>v+1),className:`rounded-lg border border-edge px-4 py-3 font-semibold text-foreground`,children:`Tentar novamente`})]})'
    result = prefix+'return(0,W.jsxs)(W.Fragment,{children:['+body+',t?'+recovery+':null]})}'
    return route[:start]+result+route[end:]

if __name__ == '__main__':
    from pathlib import Path
    file = Path(__file__).parent/'dist/assets/routes-BXh-53cI.js'
    file.write_text(apply_video_recovery(file.read_text(encoding='utf-8')),encoding='utf-8')
