from pathlib import Path
from playwright.sync_api import sync_playwright
import base64, json, re
r=Path(__file__).resolve().parent.parent
assets={}
for file in (r/'assets').rglob('*'):
    if file.suffix.lower() not in ('.png','.jpg','.jpeg','.webp'):continue
    rel=file.relative_to(r).as_posix()
    assets[rel]='data:image/'+('jpeg' if file.suffix.lower() in ('.jpg','.jpeg') else 'png')+';base64,'+base64.b64encode(file.read_bytes()).decode('ascii')
html=(r/'index.html').read_text(encoding='utf8')
html=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>', '',html)
html=html.replace('<link rel="stylesheet" href="style.css"/>','<style>'+(r/'style.css').read_text()+'</style>')
html=html.replace('<script src="game-core.js"></script>', '<script>window.__assetURLs='+json.dumps(assets)+';</script><script>'+(r/'game-core.js').read_text()+'</script>')
html=html.replace('<script src="renderer.js"></script>', '<script>'+(r/'renderer.js').read_text()+'</script>')
html=html.replace('<script src="live-output-stream.js"></script>','<script>'+(r/'live-output-stream.js').read_text()+'</script>')
html=html.replace('<script src="live-output-source.js"></script>','<script>'+(r/'live-output-source.js').read_text()+'</script>')
errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1600,'height':990},device_scale_factor=1)
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(html,wait_until='load',timeout=120000)
    page.wait_for_timeout(900)
    loaded=page.evaluate("Object.fromEntries(Object.entries(window.__NghichThienDebug.images).map(([k,im])=>[k,!!im.naturalWidth]))")
    print('loaded images:',sum(loaded.values()),'/',len(loaded))
    for _ in range(2):page.click('#demoCrowd')
    page.wait_for_timeout(400)
    print('active:',page.locator('#statActive').inner_text(),'pageErrors:',errors)
    geometry=page.evaluate('''() => {
      const fn=window.__NghichThienDebug.getSeatPos;
      const seats=Array.from({length:60},(_,i)=>fn(i));
      return {minTop:Math.min(...seats.map(s=>s.y-s.h)),maxFoot:Math.max(...seats.map(s=>s.y)),mode:window.__NghichThienDebug.artMode()};
    }''')
    print('layout:',geometry)
    assert geometry['minTop'] >= 835, 'Một nhân vật bị đẩy vào vùng bảng thông tin'
    assert geometry['maxFoot'] < 1228, 'Hàng tu sĩ bị chèn vào thanh sự kiện'
    assert geometry['mode']=='cinematic', 'Bản V2.1.2 cần mặc định là kiểu bán tả thực'
    (r/'preview_60.png').write_bytes(base64.b64decode(page.evaluate("document.getElementById('templeCanvas').toDataURL('image/png')").split(',',1)[1]))
    page.select_option('#visualStyle','classic')
    page.wait_for_timeout(400)
    assert page.evaluate('window.__NghichThienDebug.artMode()')=='classic'
    assert page.evaluate('Object.values(window.__NghichThienDebug.images).every(im=>im.complete&&im.naturalWidth>0)')
    page.select_option('#visualStyle','cinematic')
    page.wait_for_timeout(400)
    assert page.evaluate('window.__NghichThienDebug.artMode()')=='cinematic'
    page.fill('#demoName','Minh An')
    page.click('#demoTien');page.click('#demoBreakthrough');page.wait_for_timeout(2100)
    print('new level:',page.evaluate("window.__NghichThienDebug.game.getPlayer('demo:minh an')?.xp"),'errors:',errors)
    (r/'preview_breakthrough.png').write_bytes(base64.b64decode(page.evaluate("document.getElementById('templeCanvas').toDataURL('image/png')").split(',',1)[1]))
    page.wait_for_timeout(3600);page.click('#startBoss');page.wait_for_timeout(180)
    attack=page.evaluate('''() => { const g=window.__NghichThienDebug.game; const p=g.activePlayers()[0]; const result=g.like({userId:p.id,name:p.name,count:10});return {dmg:result.damage,fx:window.__NghichThienDebug.combatFx.length}; }''')
    print('player attack:',attack);assert attack['dmg']>0 and attack['fx']>0
    page.wait_for_timeout(280)
    (r/'preview_battle.png').write_bytes(base64.b64decode(page.evaluate("document.getElementById('templeCanvas').toDataURL('image/png')").split(',',1)[1]))
    page.screenshot(path=str(r/'preview_studio.png'),full_page=False)
    page.evaluate('''() => { const g=window.__NghichThienDebug.game; g.nextBossStrikeAt=Date.now()-1;g.tick();}''')
    assert page.evaluate("window.__NghichThienDebug.combatFx.some(e=>e.type==='boss')")
    page.wait_for_timeout(310)
    (r/'preview_boss_attack.png').write_bytes(base64.b64decode(page.evaluate("document.getElementById('templeCanvas').toDataURL('image/png')").split(',',1)[1]))
    print('fx:',page.evaluate('window.__NghichThienDebug.combatFx.length'),'errors:',errors)
    browser.close()
if errors:raise Exception('Pageerrors '+str(errors))
