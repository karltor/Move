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

def soft_loft(name, rings, mat, parent, n=32):
    o=loft(name,rings,mat,parent,n)
    modifier=o.modifiers.new('Soft tailored surface','SUBSURF');modifier.levels=1
    bpy.context.view_layer.objects.active=o
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    return o

def path(name,points,radius,mat,parent):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D'
    curve.bevel_depth=radius;curve.bevel_resolution=3;curve.resolution_u=1
    spline=curve.splines.new('POLY');spline.points.add(len(points)-1)
    for p,co in zip(spline.points,points):p.co=(*co,1)
    obj=bpy.data.objects.new(name,curve);scene.collection.objects.link(obj)
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True)
    bpy.context.view_layer.objects.active=obj;bpy.ops.object.convert(target='MESH')
    return finish(bpy.context.object,name,mat,parent,True)

def build_character():
    if any(o.name=='Scientist' for o in roots):raise RuntimeError('Scientist already built')
    # Designed as a single friendly character, with articulation hidden in folds.
    # All silhouette pieces remain parented to the game's existing joint names.
    skin_face=material('warm face',(.66,.40,.255),.79)
    lip=material('quiet smile',(.23,.095,.065),.95)
    eye_white=material('eye ivory',(.91,.88,.77),.43)
    iris=material('hazel iris',(.085,.12,.075),.48)
    shoe_canvas=material('everyday canvas',(.27,.34,.36),.95)
    gear_blue=material('equipment blue',(.055,.24,.44),.65)
    gear_gold=material('equipment ochre',(.65,.36,.065),.65)
    s=group('Scientist')
    soft_loft('Trouser waist',[(.85,.08,.15,0),(.88,.15,.205,0),(.99,.157,.205,0),(1.085,.12,.17,0)],navy,s)
    torso=group('Torso',s)
    soft_loft('Field coat',[(.965,.18,.22,0),(.98,.19,.235,0),(1.02,.18,.23,0),(1.16,.143,.212,0),
        (1.36,.16,.225,-.014),(1.48,.177,.25,-.019),(1.57,.16,.245,-.023),(1.625,.112,.17,-.017),(1.63,.085,.10,0)],ivory,torso)
    # The split tails give the white laboratory coat its own silhouette while
    # leaving the knees and the running stride visible.  The front remains open.
    for sign in [-1,1]:
        verts=[];faces=[];steps=20
        for z,rx,ry,cx in [(.735,.244,.262,-.042),(.82,.225,.25,-.032),(.985,.186,.225,-.008),(1.065,.177,.214,0)]:
            for j in range(steps+1):
                a=sign*(.34+(math.pi-.38)*j/steps)
                verts.append((cx+rx*math.cos(a),ry*math.sin(a),z+.012*math.sin(a*2)))
        for k in range(3):
            for j in range(steps):
                a=k*(steps+1)+j;b=a+steps+1
                faces.append((a,a+1,b+1,b) if sign>0 else (a,b,b+1,a+1))
        tail=mesh('Split coat tail',verts,faces,ivory,torso)
        for f in tail.data.polygons:f.use_smooth=True
        path('Tail front piping',[(cx+rx*math.cos(sign*.34),ry*math.sin(sign*.34),z)
             for z,rx,ry,cx in [(.735,.244,.262,-.042),(.82,.225,.25,-.032),(.985,.186,.225,-.008),(1.065,.177,.214,0)]],.004,seam,torso)
    # A proper shirt opening with lapels lying against the chest, not a bib.
    soft_loft('Shirt collar',[(1.48,.132,.13,.025),(1.58,.132,.135,.02),(1.66,.097,.108,0)],teal,torso,24)
    for sign in [-1,1]:
        mesh('Lapel',[(.168,sign*.015,1.39),(.187,sign*.04,1.54),(.133,sign*.082,1.63),(.166,sign*.143,1.575)],[(0,1,2,3)],ivory,torso)
        box('Lower patch pocket',(.165,sign*.16,1.115),(.024,.095,.105),ivory,torso,.015)
        tube('Pocket stitch',(.179,sign*.113,1.16),(.179,sign*.205,1.16),.003,seam,torso,vertices=8)
    for z in [1.075,1.205,1.335]:ellipsoid('Coat button',(.183,.019,z),(.007,.009,.009),seam,torso,12,8)
    box('Chest pocket',(.167,-.145,1.405),(.021,.083,.092),ivory,torso,.008)
    tube('Pocket pen',(.18,-.13,1.435),(.18,-.13,1.50),.006,teal,torso,vertices=8)
    box('Name badge',(.184,.14,1.46),(.015,.084,.045),navy,torso,.006)
    box('Badge paper',(.193,.14,1.46),(.005,.066,.031),sole,torso,.003)
    tube('Badge line',(.199,.12,1.46),(.199,.16,1.46),.003,teal,torso,vertices=8)
    soft_loft('Neck',[(1.59,.065,.075,0),(1.65,.079,.086,0),(1.745,.075,.083,-.005)],skin_face,torso,24)
    head=group('HeadRig',torso,(0,0,1.862))
    # Continuous cheekbones, brow and jaw are sculpted into one smooth surface.
    face=soft_loft('Sculpted face',[(-.178,.047,.076,.041),(-.165,.105,.113,.023),(-.118,.145,.148,.004),
        (-.065,.169,.164,-.012),(.015,.181,.176,-.019),(.095,.18,.175,-.023),
        (.175,.166,.162,-.03),(.221,.12,.125,-.035),(.244,.025,.035,-.038)],skin_face,head,40)
    # A small integrated nose bridge, with a soft tip instead of a protruding ball.
    soft_loft('Nose bridge',[(-.053,.012,.025,.169),(-.038,.025,.030,.18),(-.011,.032,.025,.185),(.029,.018,.018,.177),(.067,.007,.013,.17)],skin_face,head,24)
    for sign in [-1,1]:
        ellipsoid('Ear',(-.022,sign*.172,-.027),(.043,.025,.057),skin_face,head)
        ellipsoid('Ear fold',(-.006,sign*.19,-.025),(.018,.007,.029),skin,head,16,10)
        # White eyes and iris remain visible. Thin open spectacle frames never
        # replace the expression with the old opaque sunglasses rectangles.
        ellipsoid('Eye white',(.159,sign*.081,.036),(.022,.049,.036),eye_white,head)
        ellipsoid('Iris',(.180,sign*.079,.034),(.007,.018,.023),iris,head,20,12)
        ellipsoid('Pupil',(.186,sign*.078,.034),(.004,.009,.014),hair,head,16,10)
        ellipsoid('Eye light',(.190,sign*.073,.043),(.003,.004,.006),eye_white,head,12,8)
        path('Eyebrow',[(.15,sign*.044,.102),(.16,sign*.077,.114),(.145,sign*.119,.105)],.008,hair,head)
        points=[]
        for j in range(33):
            a=j*math.tau/32
            points.append((.188,sign*.082+math.cos(a)*.061,.035+math.sin(a)*.049))
        path('Fine spectacle rim',points,.006,navy,head)
        path('Spectacle arm',[(.188,sign*.142,.045),(.08,sign*.181,.046),(-.065,sign*.18,.036)],.005,navy,head)
    path('Spectacle bridge',[(.19,-.023,.043),(.20,0,.055),(.19,.023,.043)],.005,brass,head)
    path('Half smile',[(.158,-.061,-.102),(.175,-.035,-.111),(.183,0,-.114),(.175,.032,-.108),(.162,.051,-.096)],.0035,lip,head)
    # One swept hair silhouette, with a sculpted hairline rather than bead locks.
    verts=[];faces=[];n=48;rows=10
    for k in range(rows):
        f=k/(rows-1)
        for j in range(n):
            a=j*math.tau/n
            hairline=.078+.065*max(0,math.cos(a))+.024*math.sin(a)
            phi=(1-f)*math.acos((hairline-.12)/.153)
            # Slightly outside the scalp, with the quiff sculpted into the cap.
            lift=.026*max(0,math.cos(a+.35))*math.sin(phi)**2
            verts.append((-.030+.192*math.sin(phi)*math.cos(a),.192*math.sin(phi)*math.sin(a),.12+.157*math.cos(phi)+lift))
    for k in range(rows-1):
        for j in range(n):
            a=k*n+j;b=k*n+(j+1)%n;faces.append((a,b,b+n,a+n))
    cap=mesh('Swept hair',verts,faces,hair,head)
    for f in cap.data.polygons:f.use_smooth=True
    # A single lifted quiff breaks the old helmet outline.  Its broad root
    # grows out of the cap, twists across the forehead, then narrows to a tip.
    quiff=[];quiff_faces=[];slices=12;ring=14
    for i in range(slices):
        t=i/(slices-1)
        x=-.13+.35*t
        y=-.09+.10*t
        z=.247+.04*math.sin(math.pi*t)-.024*t
        width=(.11*(1-t)**1.2+.004)
        height=(.016*(1-t)+.002)
        for j in range(ring):
            a=j*math.tau/ring
            quiff.append((x,y+width*math.cos(a),z+height*math.sin(a)))
    for i in range(slices-1):
        for j in range(ring):
            a=i*ring+j;b=i*ring+(j+1)%ring
            quiff_faces.append((a,b,b+ring,a+ring))
    quiff_faces.extend([tuple(reversed(range(ring))),tuple((slices-1)*ring+j for j in range(ring))])
    quiff_obj=mesh('Swept quiff',quiff,quiff_faces,hair,head)
    for f in quiff_obj.data.polygons:f.use_smooth=True
    for sign in [-1,1]:
        box('Short sideburn',(-.037,sign*.161,.026),(.032,.013,.072),hair,head,.006)
    for side,y in [('L',-.135),('R',.135)]:
        leg=group('Leg'+side,s,(0,y,.95))
        soft_loft('Trouser thigh'+side,[(-.47,.06,.065,0),(-.435,.081,.082,0),(-.34,.092,.095,-.01),(-.17,.107,.11,-.017),(-.025,.102,.11,0),(.035,.07,.08,0)],navy,leg)
        knee=group('Knee'+side,leg,(0,0,-.43))
        soft_loft('Trouser calf'+side,[(-.42,.055,.059,0),(-.385,.065,.073,0),(-.29,.074,.077,-.018),(-.16,.079,.083,-.021),(-.025,.078,.082,0),(.044,.060,.066,0)],navy,knee)
        foot=group('Foot'+side,knee,(0,0,-.43))
        plain=group('EverydayShoe'+side,foot)
        equipped=group('GearShoe'+side,foot)
        for shoe,mat in [(plain,shoe_canvas),(equipped,gear_blue)]:
            box('Flexible sole',(.068,0,-.058),(.317,.178,.055),sole,shoe,.025)
            box('Tread',(.068,0,-.081),(.322,.181,.020),rubber,shoe,.009)
            ellipsoid('Canvas upper',(.058,0,.002),(.153,.086,.066),mat,shoe,24,12)
            ellipsoid('Ankle collar',(-.04,0,.030),(.068,.075,.062),mat,shoe)
            for x in [.015,.043,.069]:tube('Laces',(x,-.046,.051),(x+.009,.046,.051),.0035,ivory,shoe,vertices=8)
        for sign in [-1,1]:
            path('Shoe side stripe',[(-.035,sign*.087,.006),(.055,sign*.087,.023),(.12,sign*.075,.007)],.009,ivory,equipped)
        box('Heel support',(-.087,0,.024),(.023,.145,.073),gear_gold,equipped,.009)
        arm=group('Arm'+side,torso,(-.025,y*1.99,1.545))
        soft_loft('Coat sleeve'+side,[(-.375,.055,.062,0),(-.327,.071,.075,0),(-.22,.079,.081,0),(-.11,.093,.093,-.006),(-.025,.104,.101,-.007),(.041,.067,.07,0)],ivory,arm)
        elbow=group('Elbow'+side,arm,(0,0,-.34))
        soft_loft('Sleeve forearm'+side,[(-.235,.057,.062,0),(-.21,.063,.069,0),(-.17,.066,.071,0),(-.06,.072,.075,0),(.035,.066,.07,0)],ivory,elbow)
        soft_loft('Rolled cuff'+side,[(-.238,.059,.064,0),(-.231,.070,.073,0),(-.193,.070,.073,0),(-.188,.061,.066,0)],seam,elbow,24)
        ellipsoid('Hand'+side,(.005,0,-.291),(.060,.05,.080),skin_face,elbow)
        ellipsoid('Thumb'+side,(.044,-.027 if side=='L' else .027,-.279),(.024,.026,.048),skin_face,elbow,20,12)
        # No instrument appears until this slot is actually equipped.
        if side=='L':
            watch=group('GearInstrument',elbow)
            box('Wrist strap',(0,-.073,-.205),(.084,.016,.06),navy,watch,.013)
            box('Wrist instrument',(0,-.084,-.205),(.065,.025,.055),gear_blue,watch,.012)
            box('Instrument display',(.001,-.1,-.204),(.043,.009,.033),eye_white,watch,.005)
            path('Display tick',[(-.013,-.106,-.210),(0,-.106,-.210),(0,-.106,-.194)],.002,teal,watch)
            antenna=group('GearAntenna',watch)
            tube('Sensor aerial',(.021,-.081,-.184),(.021,-.081,-.12),.004,brass,antenna,vertices=8)
    vest=group('GearOutfit',torso)
    # Light waistcoat worn over the laboratory coat; adds actual silhouette.
    for sign in [-1,1]:
        mesh('Field vest front',[(.21,sign*.025,1.22),(.185,sign*.19,1.23),(.19,sign*.2,1.50),(.12,sign*.125,1.60),(.197,sign*.043,1.46)],[(0,1,2,3,4)],gear_blue,vest)
        tube('Vest shoulder',(.12,sign*.125,1.60),(-.145,sign*.15,1.57),.039,gear_blue,vest,vertices=12)
        box('Vest pocket',(.211,sign*.137,1.32),(.021,.085,.075),gear_blue,vest,.01)
        tube('Pocket trim',(.225,sign*.096,1.35),(.225,sign*.176,1.35),.005,gear_gold,vest,vertices=8)
    pack=group('GearPack',vest)
    box('Telemetry pack',(-.21,0,1.38),(.14,.24,.26),gear_blue,pack,.04)
    box('Pack plate',(-.288,0,1.4),(.022,.16,.12),navy,pack,.02)
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
