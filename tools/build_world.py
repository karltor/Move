"""MOVE's original desktop art library. Run in Blender, then build_character(),
build_architecture(), build_nature(), export_library(). Uses a separate scene.
The old vehicle library remains separate. No downloaded models or textures.
"""
import bpy, math, os, random
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCENE = 'MOVE Atelier'
scene = bpy.data.scenes.get(SCENE) or bpy.data.scenes.new(SCENE)
bpy.context.window.scene = scene
rng = random.Random(732)
roots = [o for o in scene.objects if o.parent is None and o.type=='EMPTY']

def material(name, rgb, rough=.7, metal=0):
    existing=bpy.data.materials.get('MOVE / '+name)
    if existing:return existing
    m = bpy.data.materials.new('MOVE / ' + name)
    m.diffuse_color = (*rgb, 1)
    p = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value = (*rgb, 1)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    return m

ivory = material('cotton', (.83,.86,.80))
seam = material('cotton seams', (.57,.64,.58))
navy = material('ink twill', (.035,.075,.105))
teal = material('petrol knit', (.035,.31,.29))
skin = material('warm skin', (.64,.34,.20), .57)
skin_light = material('skin highlight', (.76,.45,.28), .58)
hair = material('espresso hair', (.065,.039,.025))
copper = material('burnt orange', (.76,.20,.065))
sole = material('shoe foam', (.84,.78,.63))
rubber = material('rubber', (.04,.043,.042))
glass = material('blue glass', (.075,.24,.29), .23, .28)
brass = material('brass', (.54,.34,.12), .32, .65)
plaster = [material('plaster '+str(i), c) for i,c in enumerate([
    (.75,.48,.31),(.78,.71,.52),(.43,.58,.55),(.70,.39,.32),(.72,.75,.71)])]
stone = material('limestone', (.64,.63,.53))
slate = material('slate', (.095,.145,.16))
tile = material('terracotta', (.40,.17,.095))
bark = material('bark', (.18,.115,.064))
birch = material('birch bark', (.72,.72,.61))
leaves = [material('leaf '+str(i),c) for i,c in enumerate([
    (.10,.23,.085),(.19,.34,.115),(.29,.43,.16),(.37,.48,.19)])]
needles = [material('needles '+str(i),c) for i,c in enumerate([
    (.045,.145,.11),(.08,.22,.15),(.14,.29,.18)])]

def group(name, parent=None, loc=(0,0,0)):
    o=bpy.data.objects.new(name,None);scene.collection.objects.link(o)
    o.parent=parent;o.location=loc
    if parent is None: roots.append(o)
    return o

def finish(o,name,mat,parent,smooth=False):
    o.name=name;o.parent=parent;o.data.materials.append(mat)
    if smooth:
        for p in o.data.polygons:p.use_smooth=True
    return o

def box(name,loc,size,mat,parent,bevel=.015):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    o=bpy.context.object;o.scale=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        m=o.modifiers.new('Rounded edges','BEVEL');m.width=bevel;m.segments=3
        bpy.ops.object.modifier_apply(modifier=m.name)
        m=o.modifiers.new('Corner normals','WEIGHTED_NORMAL')
        bpy.ops.object.modifier_apply(modifier=m.name)
    return finish(o,name,mat,parent)

def ellipsoid(name,loc,scale,mat,parent,segments=24,rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,radius=1,location=loc)
    o=bpy.context.object;o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish(o,name,mat,parent,True)

def tube(name,a,b,r,mat,parent,end=None,vertices=12):
    d=Vector(b)-Vector(a)
    bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=r,radius2=r if end is None else end,depth=d.length,location=(Vector(a)+Vector(b))/2)
    o=bpy.context.object;o.rotation_euler=d.to_track_quat('Z','Y').to_euler()
    return finish(o,name,mat,parent,True)

def loft(name,rings,mat,parent,n=24):
    # Each ring is (z, x radius, y radius, x offset). Sculpted cross sections.
    verts=[(cx+rx*math.cos(i*math.tau/n),ry*math.sin(i*math.tau/n),z)
           for z,rx,ry,cx in rings for i in range(n)]
    faces=[]
    for j in range(len(rings)-1):
        for i in range(n):
            a=j*n+i;b=j*n+(i+1)%n;faces.append((a,b,b+n,a+n))
    faces.extend([tuple(reversed(range(n))),tuple((len(rings)-1)*n+i for i in range(n))])
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o)
    return finish(o,name,mat,parent,True)

def mesh(name,verts,faces,mat,parent):
    m=bpy.data.meshes.new(name);m.from_pydata(verts,[],faces);m.update()
    o=bpy.data.objects.new(name,m);scene.collection.objects.link(o)
    return finish(o,name,mat,parent)

def text(name,body,loc,size,mat,parent,rotation=(math.pi/2,0,0)):
    bpy.ops.object.text_add(location=loc,rotation=rotation)
    o=bpy.context.object;o.data.body=body;o.data.size=size;o.data.align_x='CENTER';o.data.extrude=.003
    bpy.ops.object.convert(target='MESH');return finish(o,name,mat,parent)

def build_character():
    if any(o.name=='Scientist' for o in roots):raise RuntimeError('Scientist already built')
    s=group('Scientist')
    loft('Trousers waist',[(.84,.13,.22,0),(.91,.18,.235,0),(1.03,.17,.22,0),(1.10,.14,.19,0)],navy,s)
    torso=group('Torso',s)
    loft('Tailored field coat',[(.97,.19,.255,0),(1.02,.20,.27,0),(1.16,.17,.245,0),
        (1.32,.17,.24,0),(1.49,.21,.28,-.015),(1.59,.19,.285,-.025),(1.65,.12,.19,-.015)],ivory,torso,32)
    # Front opening, lapels, pocket, badge and brass buttons face +X.
    box('Knit shirt',(.177,0,1.48),(.065,.22,.32),teal,torso,.035)
    for sign in [-1,1]:
        mesh('Folded lapel',[(.225,sign*.04,1.35),(.21,sign*.035,1.63),(.18,sign*.17,1.62),(.228,sign*.12,1.45)],[(0,1,2,3)],ivory,torso)
        box('Pocket',(.186,sign*.18,1.13),(.035,.12,.135),ivory,torso,.013)
        box('Pocket welt',(.206,sign*.18,1.195),(.017,.125,.012),seam,torso,.004)
    for z in [1.12,1.25,1.37]:ellipsoid('Button',(.21,.035,z),(.012,.013,.013),brass,torso,12,6)
    box('ID clip',(.222,-.16,1.51),(.019,.084,.12),navy,torso,.006)
    box('ID card',(.234,-.16,1.485),(.012,.073,.065),sole,torso,.004)
    box('ID stripe',(.241,-.16,1.48),(.008,.05,.012),copper,torso,.002)
    tube('Pen',(.232,-.24,1.34),(.232,-.24,1.44),.009,brass,torso,vertices=8)
    ellipsoid('Neck',(0,0,1.69),(.09,.105,.15),skin,torso)
    head=group('HeadRig',torso,(0,0,1.88))
    loft('Face', [(-.19,.085,.115,.025),(-.15,.13,.16,.025),(-.07,.175,.18,.015),
        (.03,.18,.185,0),(.14,.17,.175,-.015),(.21,.115,.13,-.03),(.23,.025,.035,-.03)],skin_light,head,32)
    for sign in [-1,1]:
        ellipsoid('Ear',(-.02,sign*.186,-.015),(.048,.026,.065),skin,head)
        ellipsoid('Cheek',(.13,sign*.11,-.065),(.045,.055,.053),skin_light,head)
        ellipsoid('Eyebrow',(.168,sign*.10,.105),(.024,.067,.018),hair,head)
        box('Glasses rim',(.18,sign*.10,.046),(.045,.155,.106),navy,head,.025)
        box('Glasses lens',(.205,sign*.10,.049),(.014,.127,.077),glass,head,.018)
        box('Lens glint',(.215,sign*.115,.073),(.006,.06,.009),ivory,head,.004)
        tube('Spectacle arm',(.18,sign*.178,.057),(-.08,sign*.183,.04),.009,navy,head,vertices=8)
    tube('Glasses bridge',(.197,-.025,.047),(.197,.025,.047),.012,brass,head,vertices=10)
    ellipsoid('Nose',(.209,0,-.028),(.072,.045,.046),skin_light,head)
    tube('Wry smile',(.161,-.065,-.122),(.18,.023,-.127),.006,hair,head,vertices=8)
    # Swept hair cap with discrete sculpted locks, not a helmet cube.
    ellipsoid('Hair cap',(-.055,0,.145),(.16,.184,.112),hair,head)
    for i in range(7):
        o=ellipsoid('Swept lock',(.05-i*.024,-.13+i*.042,.207+math.sin(i*.45)*.014),(.115,.055,.047),hair,head)
        o.rotation_euler.x=-.3;o.rotation_euler.y=-.2
    for sign in [-1,1]:box('Sideburn',(-.075,sign*.165,.035),(.055,.025,.12),hair,head,.014)
    for side,y in [('L',-.155),('R',.155)]:
        leg=group('Leg'+side,s,(0,y,.95))
        loft('Trouser thigh'+side,[(-.46,.091,.096,0),(-.39,.10,.11,0),(-.23,.124,.128,-.015),(-.08,.133,.13,-.01),(.045,.10,.11,0)],navy,leg)
        knee=group('Knee'+side,leg,(0,0,-.43))
        ellipsoid('Knee fabric'+side,(0,0,0),(.096,.098,.10),navy,knee)
        loft('Trouser calf'+side,[(-.41,.068,.079,0),(-.35,.079,.083,-.014),(-.18,.10,.105,-.025),(-.06,.091,.096,0),(.025,.087,.091,0)],navy,knee)
        foot=group('Foot'+side,knee,(0,0,-.43))
        box('Foam midsole'+side,(.075,0,-.059),(.365,.213,.058),sole,foot,.028)
        box('Rubber outsole'+side,(.075,0,-.085),(.37,.216,.022),rubber,foot,.01)
        ellipsoid('Running shoe'+side,(.065,0,.005),(.178,.10,.075),copper,foot)
        ellipsoid('Heel collar'+side,(-.053,0,.038),(.073,.089,.077),teal,foot)
        for x in [.02,.055,.09]:tube('Laces',(x,-.06,.06),(x+.012,.06,.06),.006,sole,foot,vertices=8)
        for sign in [-1,1]:tube('Shoe flash',(-.02,sign*.099,.015),(.10,sign*.085,.033),.012,ivory,foot,vertices=8)
        arm=group('Arm'+side,torso,(-.02,y*2,1.57))
        ellipsoid('Shoulder sleeve'+side,(0,0,-.025),(.126,.122,.14),ivory,arm)
        loft('Coat upper sleeve'+side,[(-.36,.083,.087,0),(-.29,.087,.09,0),(-.13,.112,.108,-.005),(.025,.11,.115,0)],ivory,arm)
        elbow=group('Elbow'+side,arm,(0,0,-.34))
        ellipsoid('Elbow sleeve'+side,(0,0,0),(.083,.087,.088),ivory,elbow)
        loft('Rolled sleeve'+side,[(-.22,.068,.075,0),(-.16,.075,.08,0),(-.07,.083,.085,0),(.02,.08,.083,0)],ivory,elbow)
        box('Cuff fold'+side,(0,0,-.215),(.146,.16,.047),seam,elbow,.018)
        ellipsoid('Hand'+side,(0,0,-.295),(.077,.07,.10),skin_light,elbow)
        ellipsoid('Thumb'+side,(.047,-.04 if side=='L' else .04,-.272),(.041,.037,.063),skin,elbow)
        if side=='L':
            box('Watch strap',(0,-.081,-.22),(.10,.016,.065),navy,elbow,.012)
            box('Watch face',(0,-.095,-.22),(.065,.019,.052),glass,elbow,.01)
    print('Character built',len(s.children_recursive),'parts')

def window(parent,x,z,width=.7,height=1,shutters=False):
    box('Window recess',(x,-1.823,z),(width+.15,.12,height+.16),stone,parent)
    box('Window glass',(x,-1.9,z),(width,.025,height),glass,parent,.008)
    box('Window sill',(x,-1.94,z-height/2-.035),(width+.25,.28,.075),ivory,parent)
    box('Window cross',(x,-1.924,z),(.035,.035,height),ivory,parent,.004)
    box('Window cross',(x,-1.925,z),(width,.035,.035),ivory,parent,.004)
    if shutters:
        for side in [-1,1]:
            box('Shutter',(x+side*(width*.5+.20),-1.85,z),(.29,.065,height),teal,parent)
            for dz in [-.3,-.15,0,.15,.3]:box('Shutter slat',(x+side*(width*.5+.20),-1.89,z+dz),(.23,.025,.024),navy,parent,.003)

def gable(parent,w,h,mat):
    for side in [-1,1]:
        roof=box('Pitched roof',(side*w*.255,0,h+.52),(w*.56,4.12,.12),mat,parent,.02)
        roof.rotation_euler.y=side*.43
    mesh('Gable', [(-w/2,-1.8,h),(w/2,-1.8,h),(0,-1.8,h+1)],[(0,1,2)],plaster[1],parent)
    tube('Ridge cap',(0,-2.1,h+1),(0,2.1,h+1),.09,mat,parent,vertices=12)
    box('Chimney',(.9,.5,h+.8),(.47,.55,1.3),plaster[3],parent)
    box('Chimney cap',(.9,.5,h+1.49),(.6,.67,.12),stone,parent)

def build_architecture():
    for k,(name,w,h) in enumerate([('Townhouse',3.5,5.6),('Bakery',4.7,4.1),('Workshop',5.6,3.2),('Apartments',4.3,7.3),('Greenhouse',4.5,3.7)]):
        p=group(name)
        box('Masonry',(0,0,h/2),(w,3.6,h),plaster[k],p,.035)
        box('Stone plinth',(0,-.015,.22),(w+.08,3.68,.44),stone,p,.02)
        box('Cornice',(0,0,h-.05),(w+.18,3.78,.16),ivory,p)
        for x in [-w/2+.12,w/2-.12]:
            box('Corner pilaster',(x,-1.825,h/2),(.18,.12,h),stone,p)
        if k in [0,1,3]:
            gable(p,w,h,tile if k!=3 else slate)
            floors=2 if k==0 else 1 if k==1 else 3
            for f in range(floors):
                z=2.65+f*1.7
                for x in [-w*.28,w*.28]:window(p,x,z,.7,.98,k==0)
                box('Floor string course',(0,-1.85,z-.65),(w,.14,.09),stone,p)
        else:
            box('Flat roof',(0,0,h+.1),(w+.25,3.9,.22),slate,p)
            for x in [-w*.3,0,w*.3]:window(p,x,2.3,.95,1.05)
            for x in [-1,0,1]:
                panel=box('Roof solar',(x,.25,h+.38),(.8,1.8,.055),glass,p);panel.rotation_euler.x=.15
                for y in [-.3,.1,.5]:box('Solar grid',(x,y,h+.42+y*.15),(.76,.022,.015),ivory,p,.002)
        # Unique ground floors, signage and entrances.
        doorx=w*.25
        box('Door surround',(doorx,-1.86,.94),(1.05,.18,1.89),stone,p)
        box('Door',(doorx,-1.965,.93),(.84,.055,1.75),teal,p,.02)
        box('Door glazing',(doorx,-2,.99),(.61,.035,1.16),glass,p,.009)
        tube('Door handle',(doorx-.25,-2.035,.8),(doorx-.25,-2.035,1.05),.015,brass,p,vertices=8)
        box('Doorstep',(doorx,-2,.065),(1.17,.52,.13),stone,p)
        if k in [1,2,4]:
            window(p,-w*.23,1.03,w*.39,1.37)
            box('Shop sign',(0,-1.98,1.96),(w-.4,.14,.39),teal if k!=2 else navy,p)
            text('Shop lettering',['','DAILY BREAD','VELOCITY WORKS','','BOTANICA'][k],(0,-2.062,1.86),.20,ivory,p)
            if k==1:
                for j in range(12):
                    a=box('Striped canvas',(-w/2+.2+j*(w-.4)/12,-2.23,1.70),((w-.4)/12,.83,.07),ivory if j%2 else copper,p,.005);a.rotation_euler.x=.12
        else:window(p,-w*.25,1.1,.78,1.35)
        for x in [-w*.5-.025,w*.5+.025]:tube('Rain pipe',(x,-1.83,.12),(x,-1.83,h),.03,slate,p,vertices=8)
        if k==3:
            for z in [2.3,4,5.7]:
                box('Balcony',(0,-2.07,z-.35),(3,.62,.11),stone,p)
                tube('Balcony rail',(-1.5,-2.36,z+.3),(1.5,-2.36,z+.3),.025,navy,p)
                for x in [-1.4,-1,-.6,-.2,.2,.6,1,1.4]:tube('Baluster',(x,-2.36,z-.3),(x,-2.36,z+.3),.013,navy,p,vertices=6)
        for x in [-w*.38]:
            box('Planter',(x,-2.05,.28),(.65,.42,.4),tile,p,.025)
            for j in range(5):ellipsoid('Planter leaves',(x+rng.uniform(-.24,.24),-2.05+rng.uniform(-.12,.12),.54),(.15,.14,.17),leaves[2],p,12,6)
    p=group('StreetLamp')
    tube('Iron post',(0,0,0),(0,0,3.3),.055,navy,p,vertices=12)
    tube('Lamp arm',(0,0,3.3),(.45,0,3.3),.045,navy,p)
    box('Lantern',(.45,0,3.14),(.28,.28,.32),sole,p,.025)
    box('Lantern roof',(.45,0,3.34),(.4,.4,.08),navy,p)
    p=group('ParkBench')
    for y in [-.22,0,.22]:box('Seat slat',(0,y,.48),(1.65,.16,.065),bark,p)
    for z in [.72,.92]:box('Back slat',(0,.29,z),(1.65,.065,.16),bark,p)
    for x in [-.58,.58]:
        tube('Bench leg',(x,-.2,0),(x,-.2,.47),.035,navy,p)
        tube('Bench back',(x,.27,0),(x,.27,1),.035,navy,p)
    print('Architecture built')

def leaf_cloud(parent,center,size,mats,seed):
    # Irregular sprays of small, folded leaf blades expose the branch silhouette.
    rr=random.Random(seed);verts=[];faces=[]
    for i in range(190):
        direction=Vector((rr.uniform(-1,1),rr.uniform(-1,1),rr.uniform(-1,1)))
        if direction.length>1:direction.normalize()
        p=Vector(center)+Vector((direction.x*size[0],direction.y*size[1],direction.z*size[2]))
        angle=rr.random()*math.tau;l=rr.uniform(.11,.23);w=l*.5
        u=Vector((math.cos(angle)*l,math.sin(angle)*l,rr.uniform(-.10,.10)))
        v=Vector((-math.sin(angle)*w,math.cos(angle)*w,.04))
        n=len(verts);verts.extend([p-u,p-v,p+Vector((0,0,.035)),p+u,p+v])
        faces.extend([(n,n+1,n+2),(n+1,n+3,n+2),(n+3,n+4,n+2),(n+4,n,n+2)])
    m=bpy.data.meshes.new('Leaf sprays');m.from_pydata(verts,[],faces);m.update()
    o=bpy.data.objects.new('Leaf sprays',m);scene.collection.objects.link(o);o.parent=parent
    for mat in mats:m.materials.append(mat)
    for poly in m.polygons:poly.material_index=rr.randrange(len(mats));poly.use_smooth=True
    # Backfaces are deliberately kept for the fine leaf silhouettes.
    return o

def build_nature():
    for species,height in [('Oak',5.5),('Birch',6.8),('Rowan',3.8)]:
        p=group(species);bm=birch if species=='Birch' else bark
        tube('Tapered trunk',(0,0,0),(.12,.04,height*.78),.18 if species=='Oak' else .10,bm,p,end=.035)
        for j in range(9 if species=='Oak' else 7):
            a=j*2.399;z=height*(.34+j*.052);reach=(1.35 if species=='Oak' else .85)*(1-j*.043)
            end=(math.cos(a)*reach,math.sin(a)*reach,z+height*.22)
            tube('Branch',(.05,0,z),end,.05,bm,p,end=.009,vertices=8)
            leaf_cloud(p,(end[0],end[1],end[2]+.15),(reach*.72,reach*.72,.65),leaves,100+j+int(height*10))
        if species=='Birch':
            for j in range(12):box('Bark scar',(.07,-.075,.25+j*.28),(.085,.024,.033),bark,p,.005)
    build_spruce()
    p=group('FernPatch')
    for j in range(9):
        a=j*2.399;end=(math.cos(a)*.7,math.sin(a)*.7,.2)
        tube('Fern stem',(0,0,0),end,.008,leaves[1],p,vertices=5)
        for k in range(1,7):
            t=k/7;v=Vector(end)*t+Vector((0,0,math.sin(t*math.pi)*.22))
            for sign in [-1,1]:
                tip=v+Vector((-math.sin(a)*.18*sign,math.cos(a)*.18*sign,.02))
                mesh('Fern leaflet',[v,tip,v+Vector((.09*math.cos(a),.09*math.sin(a),0))],[(0,1,2)],leaves[j%3],p)
    p=group('FieldRock')
    for j in range(3):
        o=ellipsoid('Weathered rock',(j*.28,0,.14+j*.07),(.39,.29,.24),stone,p,12,8)
        for v in o.data.vertices:v.co*=1+rng.uniform(-.13,.13)
    print('Nature built')

def build_spruce():
    p=group('Spruce');rr=random.Random(941)
    tube('Spruce trunk',(0,0,0),(.06,0,6.2),.16,bark,p,end=.012)
    batches=[([],[]) for _ in needles]
    for j in range(12):
        z=.75+j*.43;r=(1-j/13)*1.7
        for k in range(7):
            a=k*math.tau/7+j*1.713;end=Vector((math.cos(a)*r,math.sin(a)*r,z-.05))
            start=Vector((0,0,z+.30))
            tube('Spruce branch',start,end,.021,bark,p,end=.003,vertices=6)
            verts,faces=batches[(j+k)%3]
            for q in range(100):
                t=rr.uniform(.08,1)
                center=start.lerp(end,t)
                width=.34*(1-t)+.06
                center+=Vector((rr.uniform(-width,width),rr.uniform(-width,width),rr.uniform(-.12,.14)))
                direction=Vector((rr.uniform(-1,1),rr.uniform(-1,1),rr.uniform(-.4,.8))).normalized()
                length=rr.uniform(.12,.25)
                cross=direction.cross(Vector((0,0,1))).normalized()*.025
                n=len(verts)
                verts.extend([center-cross,center+direction*length,center+cross,center+Vector((0,0,.026))])
                faces.extend([(n,n+1,n+3),(n+3,n+1,n+2)])
    for i,(verts,faces) in enumerate(batches):mesh('Spruce needles',verts,faces,needles[i],p)
    return p

def build_outlands():
    p=group('Barn')
    box('Farmhouse walls',(0,0,1.4),(4.8,3.6,2.8),plaster[3],p)
    for x in [i*.23-2.3 for i in range(21)]:
        box('Timber battens',(x,-1.83,1.4),(.035,.06,2.7),copper,p,.004)
    gable(p,4.8,2.8,slate)
    box('Sliding barn door',(0,-1.91,1.05),(1.8,.08,2.1),bark,p)
    for sign in [-1,1]:
        tube('Door diagonal',(-.83,-1.97,.15 if sign==1 else 1.95),(.83,-1.97,1.95 if sign==1 else .15),.035,ivory,p,vertices=6)
        box('Barn corner',(sign*2.33,-1.85,1.4),(.11,.12,2.8),ivory,p)
        window(p,sign*1.62,1.5,.52,.72)
    for x in [-3.2,3.2]:
        tube('Fence post',(x,-.1,0),(x,-.1,1.15),.07,bark,p,vertices=8)
        for z in [.45,.85]:box('Fence rail',(x+(.65 if x>0 else -.65),-.1,z),(1.5,.065,.1),bark,p)
    p=group('Boulder')
    for j in range(4):
        o=ellipsoid('Eroded sandstone',(j*.38-.6,math.sin(j)*.3,.55+j*.12),(.73,.65,.8),plaster[0],p,16,10)
        for v in o.data.vertices:
            v.co.x+=.07*math.sin(v.co.z*19+j);v.co.y+=.05*math.cos(v.co.z*13+j)
    p=group('Cactus')
    def cactus_segment(a,b,r):
        o=tube('Ribbed cactus',a,b,r,leaves[1],p,vertices=32)
        for v in o.data.vertices:
            angle=math.atan2(v.co.y,v.co.x);scale=1+.10*math.cos(angle*8)
            v.co.x*=scale;v.co.y*=scale
        ellipsoid('Rounded cactus tip',b,(r,r,r),leaves[1],p,16,8)
    cactus_segment((0,0,.2),(0,0,2.6),.23)
    for sign in [-1,1]:
        z=1.1 if sign<0 else 1.6
        cactus_segment((0,0,z),(sign*.55,0,z),.12)
        cactus_segment((sign*.55,0,z),(sign*.55,0,z+.65),.12)
    for j in range(35):
        a=j*2.399;z=.2+j*.069
        tube('Cactus spine',(math.cos(a)*.23,math.sin(a)*.23,z),(math.cos(a)*.285,math.sin(a)*.285,z+.025),.005,sole,p,vertices=4)
    p=group('SnowPeak')
    rr=random.Random(12);verts=[];faces=[];n=17
    for level,(z,r) in enumerate([(0,3.8),(1.4,2.9),(3.1,1.8),(4.5,.85),(5.5,.08)]):
        for j in range(n):
            a=j*math.tau/n;rj=r*rr.uniform(.75,1.2)
            verts.append((rj*math.cos(a)+level*.12,rj*math.sin(a),z+rr.uniform(-.22,.22)))
    for level in range(4):
        for j in range(n):
            a=level*n+j;b=level*n+(j+1)%n
            faces.extend([(a,b,a+n),(b,b+n,a+n)])
    o=mesh('Mountain ridges',verts,faces,stone,p);o.data.materials.append(ivory)
    for f in o.data.polygons:
        f.material_index=1 if sum(o.data.vertices[i].co.z for i in f.vertices)/3>3.35+rr.uniform(-.45,.35) else 0
    print('Later biomes built')

def export_library():
    # Always export in local origin space, even after arranging the atelier.
    locations={o:o.location.copy() for o in roots}
    for o in roots:o.location=(0,0,0)
    # Batch static parts by material; preserve the scientist's articulation pivots.
    for root in roots:
        parents=[root]+[o for o in root.children_recursive if o.type=='EMPTY']
        for parent in parents:
            batches={}
            for o in list(parent.children):
                if o.type=='MESH':batches.setdefault(tuple(o.data.materials),[]).append(o)
            for objects in batches.values():
                if len(objects)<2:continue
                bpy.ops.object.select_all(action='DESELECT')
                for o in objects:o.select_set(True)
                bpy.context.view_layer.objects.active=objects[0]
                bpy.ops.object.join()
    bpy.ops.object.select_all(action='DESELECT')
    for root in roots:
        root.select_set(True)
        for o in root.children_recursive:o.select_set(True)
    path=os.path.join(ROOT,'public','models','move-world.glb')
    bpy.ops.export_scene.gltf(filepath=path,use_selection=True,export_animations=False,export_yup=True)
    for o,loc in locations.items():o.location=loc
    print('Exported',path,os.path.getsize(path))

if __name__=='__main__':
    build_character();build_architecture();build_nature();build_outlands();export_library()
