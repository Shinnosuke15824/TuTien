from pathlib import Path
from playwright.sync_api import sync_playwright
import base64,re,json
r=Path(__file__).resolve().parent.parent
assets={}
for file in (r/'assets').rglob('*'):
    if file.suffix.lower() not in ('.png','.jpg','.jpeg','.webp'):continue
    rel=file.relative_to(r).as_posix()
    assets[rel]='data:image/'+('jpeg' if file.suffix.lower() in ('.jpg','.jpeg') else 'png')+';base64,'+base64.b64encode(file.read_bytes()).decode('ascii')
html=(r/'index.html').read_text(encoding='utf8')
html=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>', '',html)
html=html.replace('<link rel="stylesheet" href="style.css"/>','<style>'+(r/'style.css').read_text()+'</style>')
html=html.replace('<script src="game-core.js"></script>','<script>window.__assetURLs='+json.dumps(assets)+';</script><script>'+(r/'game-core.js').read_text()+'</script>')
html=html.replace('<script src="renderer.js"></script>','<script>'+(r/'renderer.js').read_text()+'</script>')
html=html.replace('<script src="live-output-stream.js"></script>','<script>'+(r/'live-output-stream.js').read_text()+'</script>')
html=html.replace('<script src="live-output-source.js"></script>','<script>'+(r/'live-output-source.js').read_text()+'</script>')
errs=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1680,'height':1050},device_scale_factor=1)
    page.on('pageerror',lambda e:errs.append(str(e)))
    page.set_content(html,wait_until='load',timeout=120000)
    page.wait_for_timeout(700)
    assert page.locator('#duelStatus').count()==1
    assert page.locator('#weeklyRanking').count()==1
    assert page.locator('#petEquip').count()==1
    assert page.locator('#realmProgress').count()==1
    assert page.locator('#backupStatus').count()==1
    print('initial',page.locator('#backupStatus').inner_text())
    page.click('#demoTien')
    page.click('#demoAscend')
    page.wait_for_timeout(300)
    assert page.evaluate("window.__NghichThienDebug.game.getPlayer('demo:minh an').realmLevel")==1, 'Nút Thiên Kiếp Demo không kích hoạt được'
    page.click('#demoDuel')
    assert page.evaluate('window.__NghichThienDebug.game.duel.active'), 'Nút Đại Chiến Demo không kích hoạt'
    page.evaluate('window.__NghichThienDebug.game.finishDuel()')
    state=page.evaluate('''() => { const g=window.__NghichThienDebug.game,p=g.getPlayer('demo:minh an');
      p.presenceMs=95*60000;p.xp=1250;p.realmLevel=8;
      g.equip(p.id,'robe','void');g.equip(p.id,'artifact','seal');g.equip(p.id,'pet','dragon');
      return {available:g.availableGear(p,'pet').length,gear:p.equipment,rank:p.realmLevel};}''')
    assert state['gear']['pet']=='dragon',state
    page.wait_for_timeout(400)
    page.select_option('#robeEquip','phoenix')
    page.select_option('#artifactEquip','jade')
    page.select_option('#petEquip','fox')
    page.click('#applyEquipment')
    assert page.evaluate("window.__NghichThienDebug.game.getPlayer('demo:minh an').equipment.pet")=='fox'
    print('gear',state,'weekly entries',page.locator('#weeklyRanking section').count())
    page.click('#demoCrowd');page.click('#demoCrowd')
    page.wait_for_timeout(800)
    assert int(page.locator('#statActive').inner_text())==60
    assert page.locator('#gearSelects').count()==0
    (r/'preview_v220_formation.png').write_bytes(base64.b64decode(page.evaluate("document.getElementById('templeCanvas').toDataURL('image/png')").split(',',1)[1]))
    # Simulate the 30-minute scheduled duel at an active waiting phase.
    duel=page.evaluate('''() => {const g=window.__NghichThienDebug.game;g.phase='prep';g.phaseEndsAt=Date.now()+300000;g.nextDuelAt=Date.now()-1;g.tick();const a=g.like({userId:'demo:minh an',name:'Minh An',count:40});return {dmg:a.damage,score:g.duel.scores.tien,active:g.duel.active};}''')
    assert duel['dmg']==0 and duel['score']==40,duel
    page.wait_for_timeout(400)
    (r/'preview_v220_duel.png').write_bytes(base64.b64decode(page.evaluate("document.getElementById('templeCanvas').toDataURL('image/png')").split(',',1)[1]))
    page.evaluate('''() => {const g=window.__NghichThienDebug.game;g.finishDuel();g.startBattle();g.like({userId:'demo:minh an',name:'Minh An',count:5000});}''')
    page.wait_for_timeout(400)
    assert page.evaluate('window.__NghichThienDebug.game.bossPhaseLevel')==1
    (r/'preview_v220_boss_50.png').write_bytes(base64.b64decode(page.evaluate("document.getElementById('templeCanvas').toDataURL('image/png')").split(',',1)[1]))
    page.evaluate('''() => {const g=window.__NghichThienDebug.game;g.like({userId:'demo:minh an',name:'Minh An',count:3000});}''')
    page.wait_for_timeout(380)
    (r/'preview_v220_boss_20.png').write_bytes(base64.b64decode(page.evaluate("document.getElementById('templeCanvas').toDataURL('image/png')").split(',',1)[1]))
    page.screenshot(path=str(r/'preview_v220_studio.png'),full_page=False)
    print('boss stage',page.evaluate('window.__NghichThienDebug.game.bossPhaseLevel'),'errors',errs)
    browser.close()
assert not errs,errs
