"""Rebuild the original low-poly MOVE asset library with Blender 5.2+.
Run: blender --background --python tools/build_assets.py
All geometry and materials are original, created procedurally for this project.
"""
import bpy, math, os, random
from mathutils import Vector
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
random.seed(12)
def mat(name,color,metal=0,rough=.65):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;return m
white=mat('Porcelain',(.86,.9,.82));dark=mat('Midnight',(.055,.115,.14));mint=mat('Mint enamel',(.31,.63,.50));lime=mat('Volt',(.65,.9,.22));orange=mat('Safety orange',(.98,.27,.08));sand=mat('Warm concrete',(.67,.71,.59));road=mat('Track asphalt',(.20,.30,.28));glass=mat('Smoked glass',(.09,.25,.28),.35,.2);skin=mat('Warm skin',(.68,.38,.21));rubber=mat('Rubber',(.05,.065,.064));silver=mat('Aluminium',(.55,.63,.6),.7,.35);leaf=mat('Sage leaves',(.20,.43,.32));wood=mat('Birch',(.44,.28,.13));blue=mat('Ion blue',(.26,.68,.94),.3,.25)
def group(name,parent=None,loc=(0,0,0)):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=loc;o.parent=parent;return o
def finish(o,name,material,parent):
 o.name=name;o.data.materials.append(material);o.parent=parent;return o
def box(name,loc,size,material,parent,bevel=.04):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.scale=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel: mod=o.modifiers.new('Soft manufactured edges','BEVEL');mod.width=bevel;mod.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 return finish(o,name,material,parent)
def sphere(name,loc,scale,material,parent):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=loc);o=bpy.context.object;o.scale=scale;return finish(o,name,material,parent)
def cyl(name,loc,r,depth,material,parent,rot=None):
 bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=r,depth=depth,location=loc);o=bpy.context.object
 if rot:o.rotation_euler=rot
 return finish(o,name,material,parent)
def beam(name,a,b,r,material,parent):
 mid=(Vector(a)+Vector(b))/2;o=cyl(name,mid,r,(Vector(b)-Vector(a)).length,material,parent);o.rotation_euler=(Vector(b)-Vector(a)).to_track_quat('Z','Y').to_euler();return o
camp=group('Campus')
box('Floating foundation',(0,0,-.65),(37,22,1.2),sand,camp,.6)
box('Grass field',(0,0,-.04),(36.8,21.8,.18),mint,camp,.45)
box('Test straight',(0,-3,.07),(34,6,.12),road,camp,.3)
for y in [-5.7,-3,-.3]:
 for x in range(-16,17,2):box('Lane marking',(x,y,.145),(1.15,.055,.018),white,camp,.01)
for x in [-13,13]:
 for iy in range(10):box('Timing stripe',(x,-5.6+iy*.55,.15),(.4,.28,.02),white if iy%2 else dark,camp,.005)
for x in [-14,14]:
 for y in [-6.4,.5]:
  box('Timing gate foot',(x,y,.25),(.7,.7,.35),dark,camp)
  box('Timing gate post',(x,y,1.5),(.22,.22,2.5),white,camp)
  box('Optical sensor',(x,y,2.75),(.38,.38,.3),orange,camp)
# The open research hangar and windows.
box('Lab foundation',(-5,5,.2),(11,6,.4),white,camp,.15)
box('Main lab',(-5,6,1.8),(10,4,3),white,camp,.15)
box('Glazing',(-5,3.97,1.85),(9.2,.06,1.9),glass,camp)
for x in [-9.4,-7.2,-5,-2.8,-.6]:box('Window mullion',(x,3.9,1.85),(.08,.13,2),mint,camp,.01)
box('Roof cap',(-5,6,3.5),(10.5,4.5,.3),dark,camp,.12)
box('Roof trim',(-5,3.75,3.5),(10.5,.12,.13),lime,camp)
box('Vent housing',(-6,6.6,3.95),(2,1.4,.7),silver,camp)
for x in [-6.6,-6.2,-5.8,-5.4]:box('Vent slit',(x,5.88,3.98),(.08,.04,.4),dark,camp,.01)
for x in [-2.8,-1.2]:
 panel=box('Solar panel',(x,6,3.94),(1.3,2,.1),glass,camp);panel.rotation_euler.x=.18
 for yy in [5.4,6,6.6]:box('Panel cells',(x,yy,4.02),(1.2,.03,.025),blue,camp,.005)
# Sign lettering becomes real geometry.
bpy.ops.object.text_add(location=(-9,3.87,2.6),rotation=(math.pi/2,0,0));txt=bpy.context.object;txt.data.body='M O V E   /   FIELD LAB';txt.data.size=.42;txt.data.extrude=.007;txt.data.materials.append(white);txt.parent=camp;bpy.ops.object.convert(target='MESH')
for x in [4,6]:
 cyl('Storage tank',(x,7,1.45),.75,2.8,white,camp)
 cyl('Tank band',(x,7,1.55),.77,.25,orange,camp)
 beam('Pipe',(x,7,2.8),(x,5.5,2.8),.12,silver,camp)
box('Work bench',(6,2.6,.9),(3,1.2,.15),white,camp)
for x in [4.8,7.2]:box('Bench leg',(x,2.6,.45),(.14,.8,.8),dark,camp)
for x in [5,6,7]:box('Instrument',(x,2.6,1.2),(.6,.5,.5),mint,camp)
for x in [-11,10,13,16]:
 y=7+random.random()*2;cyl('Tree trunk',(x,y,.9),.19,1.8,wood,camp);sphere('Tree canopy',(x,y,2.45),(1.35,1.3,1.6),leaf,camp);sphere('Tree light',(x+.4,y-.4,2.8),(.8,.8,1.1),mint,camp)
for x in [-16,-10,-4,2,8,16]:
 box('Barrier',(x,-7.2,.42),(2.5,.45,.7),white,camp)
 box('Barrier signal',(x,-7.45,.45),(.75,.02,.48),orange,camp,.01)
for x,y in [(-15,3),(12,3),(16,-9),(-9,-9),(4,-9)]:
 for j in range(3):sphere('Rock',(x+j*.35,y,.13),(.35,.28,.23),sand,camp)
for x in [-11,11]:
 cyl('Floodlight pole',(x,2.5,2.6),.065,5,dark,camp)
 box('Floodlight',(x,2.5,5.1),(1,.35,.35),white,camp)
# Articulated scientist with separate thighs, shins, feet and elbows.
s=group('Scientist')
box('Pelvis',(0,0,.95),(.38,.48,.25),dark,s,.07)
box('Coat',(0,0,1.34),(.5,.62,.72),white,s,.09)
box('Shirt',(.265,0,1.45),(.03,.3,.42),mint,s,.015)
box('Badge',(.285,-.2,1.5),(.03,.12,.10),orange,s,.01)
sphere('Head',(0,0,1.94),(.28,.27,.32),skin,s)
box('Hair',(-.09,0,2.13),(.4,.50,.18),dark,s,.08)
box('Goggles',(.26,0,1.98),(.12,.52,.14),dark,s,.035)
for y in [-.14,.14]:box('Lens',(.33,y,2),(.02,.18,.1),blue,s,.02)
sphere('Nose',(.31,0,1.86),(.08,.07,.08),skin,s)
for side,y in [('L',-.18),('R',.18)]:
 leg=group('Leg'+side,s,(0,y,.95))
 sphere('HipJoint'+side,(0,0,0),(.14,.14,.14),dark,leg)
 box('Thigh'+side,(0,0,-.215),(.22,.23,.43),dark,leg,.065)
 knee=group('Knee'+side,leg,(0,0,-.43))
 sphere('Kneecap'+side,(.015,0,0),(.12,.12,.12),mint,knee)
 box('Shin'+side,(0,0,-.215),(.19,.19,.43),dark,knee,.055)
 foot=group('Foot'+side,knee,(0,0,-.43))
 box('Shoe'+side,(.11,0,0),(.40,.26,.18),orange,foot,.045)
 box('Sole'+side,(.11,0,-.078),(.41,.27,.032),white,foot,.012)
 arm=group('Arm'+side,s,(0,y*2.2,1.62))
 sphere('Shoulder'+side,(0,0,0),(.14,.13,.14),white,arm)
 box('UpperSleeve'+side,(0,0,-.18),(.22,.21,.36),white,arm,.065)
 elbow=group('Elbow'+side,arm,(0,0,-.36))
 sphere('ElbowJoint'+side,(0,0,0),(.105,.105,.105),mint,elbow)
 box('LowerSleeve'+side,(0,0,-.14),(.18,.18,.28),white,elbow,.05)
 sphere('Hand'+side,(0,0,-.34),(.12,.11,.14),skin,elbow)
rock=group('Rock');sphere('Stone',(0,0,.2),(.28,.21,.2),sand,rock)
plane=group('Plane')
verts=[(1.2,0,0),(-.75,-.95,0),(-.4,0,.2),(-.75,.95,0),(-.65,0,-.14)]
mesh=bpy.data.meshes.new('Paper folds');mesh.from_pydata(verts,[],[(0,1,2),(0,2,3),(0,4,1),(0,3,4)]);mesh.materials.append(white);o=bpy.data.objects.new('Folded paper',mesh);bpy.context.collection.objects.link(o);o.parent=plane
sling=group('Slingshot');beam('Grip',(0,0,0),(0,0,.8),.11,wood,sling)
for y in [-.38,.38]:beam('Fork',(0,0,.65),(0,y,1.3),.08,wood,sling);beam('Elastic',(0,y,1.3),(-.45,0,1.1),.025,orange,sling)
def wheels(root,xs,ys,r=.28):
 for x in xs:
  for y in ys:cyl('Wheel',(x,y,r),r,.16,rubber,root,(math.pi/2,0,0));cyl('Wheel hub',(x,y*1.02,r),r*.4,.18,orange,root,(math.pi/2,0,0))
board=group('Board');box('Deck',(0,0,.38),(1.75,.62,.13),lime,board,.08);wheels(board,[-.58,.58],[-.33,.33],.19)
cart=group('Cart');box('Cart body',(0,0,.55),(1.8,1,.6),orange,cart,.12);box('Seat',(-.25,0,.95),(.65,.7,.18),dark,cart);wheels(cart,[-.65,.65],[-.59,.59]);beam('Handle',(.7,0,.6),(.65,0,1.4),.06,silver,cart);beam('Handlebar',(.65,-.35,1.4),(.65,.35,1.4),.06,dark,cart)
bike=group('Bike');wheels(bike,[-.8,.8],[0],.46)
for a,b in [((-.8,0,.46),(-.2,0,1.25)),((-.2,0,1.25),(.1,0,.46)),((.1,0,.46),(-.8,0,.46)),((-.2,0,1.25),(.6,0,1.25)),((.6,0,1.25),(.1,0,.46)),((.6,0,1.25),(.8,0,.46))]:beam('Bicycle frame',a,b,.055,mint,bike)
box('Saddle',(-.2,0,1.35),(.45,.25,.1),dark,bike);beam('Bike handle',(.65,-.3,1.45),(.65,.3,1.45),.05,silver,bike)
car=group('Car');box('Chassis',(0,0,.55),(2.7,1.2,.55),mint,car,.22);box('Cockpit',(-.35,0,1.03),(1,.85,.5),glass,car,.18);box('Nose',(1.3,0,.48),(.7,1,.3),orange,car,.15);wheels(car,[-.9,.9],[-.67,.67],.34)
rocket=group('Rocket');cyl('Rocket body',(0,0,.65),.4,2.8,white,rocket,(0,math.pi/2,0));sphere('Nose cone',(1.45,0,.65),(.7,.4,.4),orange,rocket);wheels(rocket,[-.9,.85],[-.52,.52],.23);box('Rocket fin',(-1,0,1.15),(.8,.08,.7),mint,rocket)
cannon=group('Cannon');wheels(cannon,[0],[-.65,.65],.48);box('Gun carriage',(-.25,0,.5),(1.6,.75,.3),mint,cannon);beam('Barrel',(-.4,0,.8),(1.2,0,1.45),.28,dark,cannon);beam('Barrel band',(.85,0,1.3),(1,0,1.37),.32,orange,cannon)
acc=group('Accelerator');box('Accelerator base',(0,0,.2),(3,1.6,.4),dark,acc)
for x in [-.9,0,.9]:
 bpy.ops.mesh.primitive_torus_add(major_radius=.65,minor_radius=.16,major_segments=24,minor_segments=8,location=(x,0,1),rotation=(0,math.pi/2,0));finish(bpy.context.object,'Magnetic ring',mint,acc)
beam('Beam',(-1.4,0,1),(1.4,0,1),.08,blue,acc)
# Reusable roadside assets. Their parts are merged by material at load time.
city=group('CityBlock')
box('Brick building',(0,0,3),(4,4,6),white,city,.06)
box('Roof',(0,0,6.12),(4.3,4.3,.24),dark,city,.03)
box('Shop front',(0,-2.03,1),(3.5,.08,1.5),glass,city,.01)
for x in [-1.15,0,1.15]:
 for z in [2.7,4.1,5.3]:box('Window',(x,-2.03,z),(.68,.08,.8),glass,city,.01)
box('Awning',(0,-2.4,1.92),(4,1,.13),orange,city,.04)
pine=group('Pine')
cyl('Trunk',(0,0,1.3),.15,2.6,wood,pine)
for z,r in [(1.8,1.25),(2.6,.95),(3.3,.65)]:
 bpy.ops.mesh.primitive_cone_add(vertices=9,radius1=r,radius2=0,depth=1.9,location=(0,0,z))
 finish(bpy.context.object,'Pine crown',leaf,pine)
lamp=group('TrailLamp')
cyl('Post',(0,0,1.8),.05,3.6,dark,lamp)
box('Lamp',(0,0,3.65),(.35,.35,.28),white,lamp,.02)
farm=group('Barn')
box('Barn wall',(0,0,1.3),(4,3,2.6),orange,farm,.02)
for sign in [-1,1]:
 roof=box('Barn roof',(0,sign*.85,3),(4.5,2,.1),dark,farm,.01);roof.rotation_euler.x=sign*.55
box('Door',(0,-1.53,.9),(1.3,.05,1.8),wood,farm,.01)
boulder=group('Boulder')
sphere('Stone formation',(0,0,1),(.9,.8,1.3),sand,boulder)
cactus=group('Cactus')
cyl('Stem',(0,0,1.2),.22,2.4,leaf,cactus)
beam('Branch',(-.5,0,1),(.5,0,1),.14,leaf,cactus)
beam('Cactus arm',(-.5,0,1),(-.5,0,1.7),.14,leaf,cactus)
snow=group('SnowPeak')
bpy.ops.mesh.primitive_cone_add(vertices=7,radius1=2.3,radius2=.25,depth=5,location=(0,0,2.5));finish(bpy.context.object,'Mountain',silver,snow)
bpy.ops.mesh.primitive_cone_add(vertices=7,radius1=1,radius2=0,depth=2,location=(0,0,4.25));finish(bpy.context.object,'Snow cap',white,snow)
# The new expedition camera does not need the old campus diorama.
for obj in list(camp.children_recursive):bpy.data.objects.remove(obj,do_unlink=True)
bpy.data.objects.remove(camp,do_unlink=True)
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));out=os.path.join(root,'public','models','move-lab.glb');os.makedirs(os.path.dirname(out),exist_ok=True)
bpy.ops.export_scene.gltf(filepath=out,export_format='GLB',export_animations=False,export_yup=True)
print('MOVE_ASSETS_EXPORTED',out,os.path.getsize(out))


# Render the same original 3D character for the subject cards.
for obj in bpy.context.scene.objects:
 obj.hide_render = obj != s and obj not in s.children_recursive
bpy.context.scene.render.engine='CYCLES'
bpy.context.scene.cycles.samples=24
bpy.context.scene.render.resolution_x=640
bpy.context.scene.render.resolution_y=360
bpy.context.scene.render.resolution_percentage=100
bpy.context.scene.render.film_transparent=True
bpy.context.scene.world.color=(.22,.22,.22)
bpy.ops.object.camera_add(location=(4,-5,3.1))
camera=bpy.context.object
camera.rotation_euler=(Vector((0,0,1.25))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO';camera.data.ortho_scale=2.7
bpy.context.scene.camera=camera
for loc,power,size in [((3,-4,6),350,5),((-3,2,4),450,4)]:
 bpy.ops.object.light_add(type='AREA',location=loc)
 light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=size
 light.rotation_euler=(Vector((0,0,1))-light.location).to_track_quat('-Z','Y').to_euler()
for ident,color in [('runner',(.31,.63,.50)),('projectile',(.95,.45,.16)),('wheels',(.27,.52,.8))]:
 mint.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(*color,1)
 bpy.context.scene.render.image_settings.file_format='PNG'
 bpy.context.scene.render.filepath=os.path.join(root,'public','models','portrait-'+ident+'.png')
 bpy.ops.render.render(write_still=True)




