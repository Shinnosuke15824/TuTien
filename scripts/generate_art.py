"""Render new, original vector art for Nghịch Thiên Tu Luyện.
No existing Chánh Điện assets are loaded or reused.
"""
from pathlib import Path
import cairosvg, math, random, io, wave, numpy as np
from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).resolve().parent.parent


def render(svg, path, width=None, height=None):
    path.parent.mkdir(parents=True, exist_ok=True)
    cairosvg.svg2png(bytestring=svg.encode('utf8'), write_to=str(path), output_width=width, output_height=height)


def svg_base(w, h, defs, content):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><defs>{defs}</defs>{content}</svg>'''

# New oriental fantasy landscape, no text/old images.
random.seed(22)
stars=''.join(f'<circle cx="{random.randrange(720)}" cy="{random.randrange(530)}" r="{random.uniform(.4,1.8):.1f}" fill="#e4e7ff" opacity="{random.uniform(.17,.65):.2f}"/>' for _ in range(165))
clouds=''.join(f'<ellipse cx="{random.randrange(-100,820)}" cy="{random.randrange(300,1150)}" rx="{random.randrange(60,250)}" ry="{random.randrange(12,45)}" fill="{random.choice(["#7182cc","#cca3d9","#487eaa"])}" opacity=".13"/>' for _ in range(45))
peaks=''
for i in range(3):
    y=600+i*128; opacity=.46+i*.1
    points=['0,1280']+[f'{x},{int(y - (math.sin(x/55+i*1.7)+1)*76 - math.sin(x/19+i)*21)}' for x in range(0,721,16)]+['720,1280']
    peaks+=f'<polygon points="{" ".join(points)}" fill="{["#385b86","#263b6e","#1d2d55"][i]}" opacity="{opacity}"/>'
flowers=''.join(f'<circle cx="{random.randrange(720)}" cy="{random.randrange(600,1190)}" r="{random.randrange(2,7)}" fill="{random.choice(["#d38dce","#e7b0f5","#86d3e1"])}" opacity=".2"/>' for _ in range(120))
# ornate celestial gates around boss arena, clouds and mirrored light
pagodas=''
for x,scale in [(76,.8),(644,.8),(158,.5),(560,.5)]:
    pagodas+=f'''<g transform="translate({x} 454) scale({scale})" opacity=".73">
       <rect x="-31" y="-70" width="62" height="140" fill="#28344f" stroke="#cda97a" stroke-width="3"/>
       <rect x="-17" y="-52" width="34" height="54" fill="#c6984d" opacity=".58"/>
       <path d="M -70 -77 L 0 -126 L 70 -77 L 40 -70 L 0 -93 L -40 -70 Z" fill="#29305d" stroke="#c9a777" stroke-width="5"/>
       <path d="M -55 -18 L 0 -58 L 55 -18 L 0 -32 Z" fill="#374073" stroke="#9fa6cc" stroke-width="3"/>
       <path d="M -64 56 L 0 18 L 64 56 L 0 47 Z" fill="#374073" stroke="#e1b26b" stroke-width="3"/>
       </g>'''
scene_defs='''
<linearGradient id="sky" x2=".1" y2="1"><stop stop-color="#060d29"/><stop offset=".37" stop-color="#1e356d"/><stop offset=".70" stop-color="#2f315f"/><stop offset="1" stop-color="#0d1533"/></linearGradient>
<radialGradient id="moon"><stop stop-color="#f6fbff"/><stop offset=".65" stop-color="#c5e8fb"/><stop offset="1" stop-color="#6f99f2"/></radialGradient>
<radialGradient id="moonhalo"><stop stop-color="#bbd9ff" stop-opacity=".36"/><stop offset="1" stop-color="#a6b3fb" stop-opacity="0"/></radialGradient>
<linearGradient id="floor" x2="0" y2="1"><stop stop-color="#263b65"/><stop offset="1" stop-color="#091329"/></linearGradient>
<linearGradient id="river" x2="1" y2=".5"><stop stop-color="#285589"/><stop offset=".5" stop-color="#72e5e8"/><stop offset="1" stop-color="#803b9d"/></linearGradient>
'''
scene_content=f'''
<rect width="720" height="1280" fill="url(#sky)"/>
{stars}
<circle cx="112" cy="185" r="170" fill="url(#moonhalo)"/><circle cx="112" cy="185" r="91" fill="url(#moon)"/>
<ellipse cx="88" cy="158" rx="24" ry="13" fill="#8aaacb" opacity=".23"/><circle cx="147" cy="193" r="17" fill="#7c9ab6" opacity=".22"/>
{peaks}{pagodas}{clouds}
<path d="M 0 810 C 190 763 223 808 330 755 Q 410 696 720 760 L 720 1280 H 0 Z" fill="#1c2b4e" opacity=".58"/>
<ellipse cx="360" cy="686" rx="250" ry="82" fill="#71a9de" opacity=".13"/>
<ellipse cx="360" cy="702" rx="195" ry="48" fill="none" stroke="#f2c780" stroke-width="5" opacity=".5"/>
<ellipse cx="360" cy="702" rx="145" ry="36" fill="none" stroke="#8af3fd" stroke-width="3" opacity=".4"/>
<path d="M 342 702 L 225 1279 L 493 1279 L 378 702Z" fill="url(#floor)" stroke="#b29d83" stroke-width="4" opacity=".8"/>
<path d="M 359 715 L 359 1280" stroke="url(#river)" stroke-width="4" opacity=".35" stroke-dasharray="17 28"/>
{flowers}
'''
render(svg_base(720,1280,scene_defs,scene_content),ROOT/'assets/backgrounds/tien-ma-canh.png')

# 9 completely distinct robes, each in two faction skins. All full-body meditating sprites on transparent ground.
robe_colors=['#6f6875','#5da6d4','#37bad7','#7864bd','#b08ff0','#bc8e58','#e0a25f','#efe0a8','#f5f5ed']
trims=['#979baa','#b9f0ff','#d8eaff','#d1beff','#efe0ff','#f7d597','#fff0ac','#ffea95','#ffffff']

def make_char(level,side):
    clr=robe_colors[level]; trim=trims[level];
    main=clr if side=='tien' else ['#6d606f','#9865ab','#9962c1','#7b4db1','#9b5bb9','#aa517e','#cb6688','#d071aa','#e8c4eb'][level]
    deep='#103f64' if side=='tien' else '#4e164f'
    accent='#77eaff' if side=='tien' else '#ff87ea'
    ornate=level>=3
    w,h=340,490
    details=''
    # sleeves and split bottom fabric with level-based geometry
    for i in range(max(0,level-1)):
        yy=335+i*10;details+=f'<path d="M {55+i*8} {yy} Q 170 {yy+70-i*6} {285-i*8} {yy}" stroke="{trim}" stroke-width="{1+(level//3)}" opacity=".75" fill="none"/>'
    for side_x in (-1,1):
        x=170+side_x*100
        details+=f'<path d="M {x} {330} L {x+side_x*11} {405}" stroke="{trim}" stroke-width="{1+level*.24:.1f}" opacity=".85"/>'
    crown=''
    if level>0:
        crown=f'<path d="M 146 116 L 148 {105-level*2} L 161 {92-level*3} L 171 {102-level*2} L 190 {84-level*2} L 195 117Z" fill="{trim}" stroke="{accent}" stroke-width="3"/>'
    if level>=5:
        crown+=f'<path d="M 171 103 L 171 55 M 160 78 L 171 51 L 184 78" fill="none" stroke="{trim}" stroke-width="5"/>'
    shoulders=f'<path d="M 127 171 L 72 {162-level*5} L {55-level*2} {222-level*5} L 116 229 Z M 215 171 L 268 {162-level*5} L {284+level*2} {222-level*5} L 229 229 Z" fill="{trim}" opacity="{.22+level*.07}" stroke="{accent}" stroke-width="3"/>' if level>=2 else ''
    symbols=''
    if level>=4:
        for j in range(level-2):
            angle=2*math.pi*j/(level-2);x=170+122*math.cos(angle);y=245+118*math.sin(angle)
            symbols+=f'<path d="M{x:.0f} {y-8:.0f} L{x+6:.0f} {y:.0f} L{x:.0f} {y+8:.0f} L{x-6:.0f} {y:.0f} Z" fill="{accent}" opacity=".5"/>'
    defs=f'''<linearGradient id="robe" x2="1" y2="1"><stop stop-color="{main}"/><stop offset=".45" stop-color="{deep}"/><stop offset="1" stop-color="{main}"/></linearGradient>
    <linearGradient id="skin" x2="0" y2="1"><stop stop-color="#ffdeb3"/><stop offset="1" stop-color="#b48265"/></linearGradient>
    <linearGradient id="hair" x2="1" y2="1"><stop stop-color="#0a132e"/><stop offset=".65" stop-color="#151025"/><stop offset="1" stop-color="#5a4562"/></linearGradient>'''
    content=f'''
    <ellipse cx="170" cy="454" rx="128" ry="22" fill="#15102c" opacity=".45"/>
    {symbols}
    <path d="M 135 135 Q 115 185 90 303 Q 100 347 129 360 L 210 356 Q 240 250 210 137Z" fill="url(#hair)"/>
    <path d="M 105 190 Q 86 270 29 380 Q 4 411 50 431 L 113 410 L 170 386 L 230 413 L 290 426 Q 338 406 304 367 Q 258 275 237 192 Z" fill="url(#robe)" stroke="{trim}" stroke-width="6"/>
    <path d="M 99 327 Q 59 354 23 410 Q 50 444 168 450 Q 277 444 316 410 Q 282 352 242 328 Q 228 382 170 387 Q 122 391 99 327Z" fill="{main}" stroke="{trim}" stroke-width="6"/>
    {shoulders}
    <path d="M 113 205 Q 140 189 170 210 Q 201 187 228 205 L 208 352 L 131 352Z" fill="{deep}" stroke="{trim}" stroke-width="4"/>
    <path d="M 127 209 L 170 291 L 215 209 M 170 291 L 170 385" stroke="{trim}" stroke-width="{3+level/3}" fill="none" opacity=".8"/>
    <path d="M 128 208 Q 99 229 64 350 Q 65 374 112 365 L 155 312 Q 145 288 125 307Z" fill="url(#robe)" stroke="{trim}" stroke-width="5"/>
    <path d="M 213 208 Q 245 232 272 350 Q 271 377 229 365 L 188 312 Q 196 283 216 307Z" fill="url(#robe)" stroke="{trim}" stroke-width="5"/>
    <ellipse cx="151" cy="320" rx="24" ry="13" fill="url(#skin)" transform="rotate(18 151 320)"/>
    <ellipse cx="189" cy="320" rx="24" ry="13" fill="url(#skin)" transform="rotate(-18 189 320)"/>
    <path d="M 138 140 Q 137 184 149 200 L 191 200 Q 210 178 202 140Z" fill="url(#skin)"/>
    <ellipse cx="170" cy="126" rx="51" ry="66" fill="url(#skin)"/>
    <path d="M 118 129 Q 107 61 149 52 Q 165 21 198 51 Q 221 66 219 126 L 207 96 L 186 78 Q 156 112 121 101Z" fill="url(#hair)"/>
    <path d="M 134 132 L 153 135 M 186 135 L 207 132" stroke="#352838" stroke-width="3" stroke-linecap="round"/>
    <path d="M 163 155 Q 169 160 177 155" stroke="#98574b" stroke-width="2" fill="none"/>
    {crown}
    {details}
    <path d="M 129 374 Q 170 401 211 374" stroke="{accent}" stroke-width="3" fill="none" opacity=".9"/>
    '''
    render(svg_base(w,h,defs,content),ROOT/f'assets/characters/{side}_{level}.png', width=340,height=490)
for i in range(9):
    for f in ('tien','ma'):make_char(i,f)

# 9 separate boss silhouettes, each has a unique outline, colors and elemental motif.
boss_colors=[('#ffb352','#ad2035'),('#e96c9c','#602451'),('#a9d0ff','#3046b8'),('#83edbd','#206b62'),('#fd85a6','#582147'),('#b9ecff','#3d78ae'),('#c0a9ff','#4e2a85'),('#77eaff','#176899'),('#ffe6a1','#8d5071')]

def flame(x,y,scale=1,fill='#ffb443'):
    return f'<path d="M{x} {y} Q{x-32*scale} {y-65*scale} {x+4*scale} {y-100*scale} Q{x-4*scale} {y-47*scale} {x+20*scale} {y-64*scale} Q{x+45*scale} {y-24*scale} {x} {y}Z" fill="{fill}" opacity=".75"/>'
def wing(left=True,clr='#9cc5ee'):
    sx='1' if left else '-1'
    return f'<g transform="translate(250 0) scale({sx} 1) translate(-250 0)"><path d="M 223 275 Q 102 70 12 169 L 116 213 L 34 238 L 130 261 L 52 322 L 204 300Z" fill="{clr}" stroke="#fae2f8" stroke-width="7" opacity=".86"/></g>'

def creature(i):
    light,dark=boss_colors[i]
    defs=f'''<radialGradient id="core"><stop stop-color="{light}"/><stop offset="1" stop-color="{dark}"/></radialGradient>
    <linearGradient id="armor" x2="1" y2="1"><stop stop-color="{light}"/><stop offset=".5" stop-color="{dark}"/><stop offset="1" stop-color="{light}"/></linearGradient>'''
    back=f'<circle cx="250" cy="253" r="209" fill="none" stroke="{light}" stroke-width="5" opacity=".26"/>'
    for a in range(8):
        x=250+188*math.cos(a*math.pi/4);y=250+188*math.sin(a*math.pi/4)
        back+=f'<circle cx="{x:.1f}" cy="{y:.1f}" r="6" fill="{light}" opacity=".63"/>'
    body=''
    if i==0: # fiery qilin lion dragon
        body=''.join(flame(145+j*47,410-j%2*48,1.15,light) for j in range(5))
        body+='''<path d="M 85 339 Q 57 239 155 207 Q 260 156 342 265 L 391 375 L 352 443 L 300 400 Q 240 430 151 405Z" fill="url(#armor)" stroke="#ffdc86" stroke-width="10"/>
        <path d="M 168 218 Q 184 116 240 76 L 252 158 Q 298 99 349 105 L 316 207" fill="url(#armor)" stroke="#ffdd86" stroke-width="9"/>
        <path d="M 155 244 Q 179 157 257 171 Q 341 171 346 250 Q 333 332 267 341 Q 204 330 170 291Z" fill="#6b2b3a" stroke="#ffe1a0" stroke-width="9"/>
        <path d="M 195 287 L 267 320 L 317 279 L 299 347 L 230 355Z" fill="#f6e2b0"/>
        <circle cx="213" cy="256" r="12" fill="#fff5b1"/><circle cx="293" cy="256" r="12" fill="#fff5b1"/>'''
    elif i==1: # wolf
        body=f'''<path d="M 97 369 L 70 223 L 146 271 L 142 104 L 219 190 L 278 187 L 357 99 L 353 266 L 432 205 L 396 366 L 315 433 L 176 439Z" fill="url(#armor)" stroke="{light}" stroke-width="10"/>
        <path d="M 156 277 L 248 241 L 352 278 L 316 367 L 262 410 L 190 366Z" fill="#221c3c" stroke="#f6bad5" stroke-width="9"/>
        <path d="M 220 346 L 259 376 L 300 346 L 278 405 L 238 405Z" fill="#f3dfde"/>
        <path d="M 180 292 L 227 305 L 198 320Z M 286 305 L 329 292 L 307 320Z" fill="#fff0ad"/>'''
    elif i==2: # gorilla
        body=f'''<path d="M 131 181 Q 238 99 371 191 L 417 392 Q 380 439 326 407 L 175 406 Q 93 459 70 395Z" fill="url(#armor)" stroke="{light}" stroke-width="10"/>
        <path d="M 171 232 Q 168 116 262 119 Q 356 127 345 246 L 322 347 Q 252 382 183 323Z" fill="#2d355d" stroke="#d6eaff" stroke-width="8"/>
        <ellipse cx="154" cy="373" rx="70" ry="75" fill="#283563" stroke="#a7d6ff" stroke-width="9"/>
        <ellipse cx="363" cy="373" rx="70" ry="75" fill="#283563" stroke="#a7d6ff" stroke-width="9"/>
        <path d="M 217 298 Q 265 280 302 302 L 280 340 L 244 340Z" fill="#bfd4e8"/>
        <path d="M 201 259 L 241 253 L 219 273Z M 275 251 L 322 259 L 297 272Z" fill="#8cffff"/>'''
    elif i==3: # serpent
        body=f'''<path d="M 126 415 Q 22 332 111 259 Q 208 195 325 301 Q 412 356 327 414 Q 255 464 229 399 Q 242 366 314 367 Q 315 319 248 312 Q 148 295 190 228 Q 216 165 250 119" fill="none" stroke="{dark}" stroke-width="94" stroke-linecap="round"/>
        <path d="M 126 415 Q 22 332 111 259 Q 208 195 325 301 Q 412 356 327 414 Q 255 464 229 399 Q 242 366 314 367 Q 315 319 248 312 Q 148 295 190 228 Q 216 165 250 119" fill="none" stroke="{light}" stroke-width="13" stroke-linecap="round"/>
        <path d="M 246 87 Q 141 90 111 197 Q 157 169 210 206 L 250 154 L 293 204 Q 368 180 395 201 Q 362 103 246 87Z" fill="url(#armor)" stroke="#dcfff3" stroke-width="7"/>
        <ellipse cx="216" cy="146" rx="12" ry="5" fill="#ff496f"/><ellipse cx="277" cy="146" rx="12" ry="5" fill="#ff496f"/>'''
    elif i==4: # sword demon human
        body=f'''<path d="M 155 160 L 106 191 L 76 379 L 147 434 L 248 412 L 355 434 L 419 382 L 396 191 L 341 160Z" fill="url(#armor)" stroke="{light}" stroke-width="9"/>
        <path d="M 206 134 Q 250 72 302 134 L 306 242 L 195 242Z" fill="#21172b" stroke="#fed3d9" stroke-width="8"/>
        <path d="M 177 137 L 165 79 L 223 106 L 251 51 L 279 106 L 337 79 L 324 140Z" fill="url(#armor)" stroke="#ffddaa" stroke-width="8"/>
        <path d="M 236 169 L 249 184 L 263 169" stroke="#ff7fa8" stroke-width="8" fill="none"/>
        <path d="M 360 424 L 410 80 L 438 45 L 458 81 L 404 430 Z" fill="#e4e6fd" stroke="#ffb6c7" stroke-width="8"/>
        <path d="M 360 249 L 467 263" stroke="#d4a978" stroke-width="18"/>'''
    elif i==5: # fox
        tails=''.join(f'<path d="M 244 353 Q {250+(j-4)*70} 80 {90+j*42} {95+j*15} Q {140+j*28} 239 247 348Z" fill="{light}" opacity="{.48+j*.04}" stroke="#f3fbff" stroke-width="4"/>' for j in range(9))
        body=tails+f'''<path d="M 152 232 Q 111 90 218 142 L 258 83 L 305 143 Q 409 93 361 237 L 346 329 Q 274 417 171 326Z" fill="url(#armor)" stroke="#e6fbff" stroke-width="9"/>
        <path d="M 180 271 L 240 291 L 209 315Z M 287 292 L 345 271 L 322 315Z" fill="#263a6f"/>
        <path d="M 229 344 L 258 368 L 282 344" fill="#f0fdff"/>
        '''
    elif i==6: # ghost general
        body=f'''<path d="M 140 181 L 76 212 L 73 403 L 209 430 L 292 421 L 413 406 L 416 208 L 353 177Z" fill="url(#armor)" stroke="#dbceff" stroke-width="8"/>
        <path d="M 158 181 L 178 89 L 250 43 L 324 95 L 341 181 L 301 285 L 193 285Z" fill="#261c45" stroke="#bd9fff" stroke-width="10"/>
        <path d="M 191 169 L 232 180 L 213 203 L 187 192Z M 265 181 L 308 168 L 307 191 L 285 202Z" fill="#bca2ff"/>
        <path d="M 232 228 L 246 245 L 258 228 M 211 249 L 290 249" stroke="#cfd2ee" stroke-width="6"/>
        <path d="M 437 456 L 440 54 L 467 18 L 490 54 L 464 91 L 464 456" stroke="#dcceff" stroke-width="9" fill="none"/>
        '''
    elif i==7: # huge bird
        body=wing(True,light)+wing(False,light)+f'''<path d="M 164 204 L 252 93 L 336 204 L 309 407 L 239 456 L 174 387Z" fill="url(#armor)" stroke="#cdfaff" stroke-width="9"/>
        <path d="M 177 235 L 263 287 L 341 228 L 274 328Z" fill="#ffe49d"/>
        <path d="M 207 170 L 239 189 L 220 211Z M 276 191 L 317 169 L 307 208Z" fill="#cffdff"/>
        <path d="M 190 393 L 104 458 M 313 395 L 411 458" stroke="#86dcea" stroke-width="16"/>'''
    else: # ancient emperor / many arms
        arms=''.join(f'<path d="M 223 235 Q {60 if j%2 else 440} {135+j*45} {50 if j%2 else 450} {125+j*38}" fill="none" stroke="{dark}" stroke-width="26" stroke-linecap="round"/>' for j in range(6))
        body=arms+f'''<path d="M 135 165 L 87 265 L 135 443 L 363 443 L 408 259 L 354 160Z" fill="url(#armor)" stroke="#fff3c2" stroke-width="10"/>
        <path d="M 191 183 L 178 94 L 226 135 L 249 53 L 275 135 L 322 94 L 306 182Z" fill="url(#armor)" stroke="#fff1b1" stroke-width="9"/>
        <ellipse cx="250" cy="231" rx="67" ry="77" fill="#29283d" stroke="#ffefb1" stroke-width="8"/>
        <circle cx="220" cy="222" r="8" fill="#ffe99d"/><circle cx="282" cy="222" r="8" fill="#ffe99d"/>
        <path d="M 231 274 L 268 274" stroke="#f6d69e" stroke-width="6"/>
        <circle cx="248" cy="336" r="35" fill="#fbe2aa" stroke="#fff6cd" stroke-width="7"/>
        '''
    for a in range(12):
        x=250+215*math.cos(a*math.pi/6);y=253+213*math.sin(a*math.pi/6)
        back+=f'<path d="M{x-8:.0f} {y:.0f} L{x:.0f} {y-12:.0f} L{x+8:.0f} {y:.0f} L{x:.0f} {y+12:.0f}Z" fill="{light}" opacity=".27"/>'
    content=back+body
    render(svg_base(500,500,defs,content),ROOT/f'assets/bosses/{["qilin","wolf","ape","snake","sword","fox","ghost","bird","emperor"][i]}.png',500,500)
for i in range(9):creature(i)

# App icon: xianxia moon / sword / dual-element arc; not reused from previous app.
icon=Image.new('RGBA',(512,512),(10,12,37,255));d=ImageDraw.Draw(icon)
for r in range(215,70,-2):
    a=round(25+20*(215-r)/145);d.ellipse((256-r,256-r,256+r,256+r),outline=(150,110,225,a),width=3)
d.ellipse((143,96,369,324),fill=(238,226,183,255))
d.ellipse((176,85,404,306),fill=(10,12,37,255))
d.polygon([(125,362),(242,224),(267,238),(161,396)],fill=(102,207,244,255))
d.polygon([(387,362),(270,224),(246,239),(350,396)],fill=(239,115,176,255))
d.ellipse((209,219,303,314),fill=(223,185,105,255))
d.ellipse((232,241,280,289),fill=(26,18,53,255))
icon.save(ROOT/'build/icon.png');icon.save(ROOT/'build/icon.ico',sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])

# Original 48s ambient soundtrack with gentle pads, bells; no third party recording.
sr=22050;duration=48;N=sr*duration;t=np.arange(N,dtype=np.float64)/sr
sound=np.zeros(N,dtype=np.float64)
chords=[[220,277.18,329.63],[196,246.94,293.66],[174.61,220,261.63],[196,246.94,329.63]]
for sec in range(duration):
    s=int(sec*sr);e=int((sec+1)*sr);tt=t[s:e];notes=chords[(sec//12)%4]
    fade=np.sin(np.linspace(0,math.pi,len(tt)))**.2
    sound[s:e]+=fade*.09*sum(np.sin(2*math.pi*(f/2)*tt+np.sin(2*math.pi*.15*tt)*.08) for f in notes)/3
for sec in range(0,duration,6):
    s=sec*sr;e=min(N,s+int(3.7*sr));u=t[s:e]-sec
    bell=(np.sin(2*math.pi*523.25*u)+.38*np.sin(2*math.pi*1048*u))*np.exp(-u*1.5)
    sound[s:e]+=.05*bell
sound*=np.minimum(1,t/2)*np.minimum(1,(duration-t)/2)
sound=np.clip(sound,-.8,.8)
with wave.open(str(ROOT/'assets/audio/linh-khi-nguyen-ban.wav'),'wb') as f:
    f.setnchannels(1);f.setsampwidth(2);f.setframerate(sr);f.writeframes((sound*32767).astype('<i2').tobytes())
print('Created:',len(list((ROOT/'assets/characters').glob('*.png'))),'outfits,',len(list((ROOT/'assets/bosses').glob('*.png'))),'bosses; original background, icon and sound.')
