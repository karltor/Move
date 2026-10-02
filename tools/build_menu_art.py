"""Original MOVE menu props, rendered in Blender 5.2.

The illustrations share a small product-photography stage, original sculpted
meshes and procedural materials. No external assets, fonts or textures are
required. Existing scenes are preserved. Run in Blender and call render_all(),
or render_art('shoes') to render just one of the ten illustrations.
"""
import bpy
import math
import os
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'menu-art')
os.makedirs(OUT, exist_ok=True)
SCENE_NAME = 'MOVE Menu Atelier'
previous_scene = bpy.context.window.scene
scene = bpy.data.scenes.get(SCENE_NAME) or bpy.data.scenes.new(SCENE_NAME)
bpy.context.window.scene = scene
ART = {}


def material(name, colour, rough=.42, metal=0, fabric=False, emission=0):
    full = 'MOVE Menu / ' + name
    m = bpy.data.materials.get(full) or bpy.data.materials.new(full)
    m.use_nodes = True
    shader = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    shader.inputs['Base Color'].default_value = (*colour, 1)
    shader.inputs['Roughness'].default_value = rough
    shader.inputs['Metallic'].default_value = metal
    if emission:
        shader.inputs['Emission Color'].default_value = (*colour, 1)
        shader.inputs['Emission Strength'].default_value = emission
    if fabric and not any(n.type == 'TEX_NOISE' for n in m.node_tree.nodes):
        noise = m.node_tree.nodes.new('ShaderNodeTexNoise')
        noise.inputs['Scale'].default_value = 175
        noise.inputs['Detail'].default_value = 2
        bump = m.node_tree.nodes.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value = .18
        bump.inputs['Distance'].default_value = .015
        m.node_tree.links.new(noise.outputs['Fac'], bump.inputs['Height'])
        m.node_tree.links.new(bump.outputs['Normal'], shader.inputs['Normal'])
    m.diffuse_color = (*colour, 1)
    return m


cream = material('porcelain', (.91, .88, .75), .32)
ivory = material('foam', (.99, .95, .85), .66)
teal = material('petrol', (.028, .28, .26), .32)
mint = material('celadon', (.46, .67, .48), .45)
coral = material('copper orange', (.9, .285, .105), .4)
navy = material('ink', (.027, .06, .08), .45)
silver = material('brushed aluminium', (.48, .59, .61), .27, .78)
brass = material('warm brass', (.61, .38, .12), .25, .72)
rubber = material('rubber', (.043, .06, .057), .8)
wood = material('birch plywood', (.69, .46, .23), .48)
cloth = material('teal woven textile', (.045, .31, .29), .72, fabric=True)
cotton = material('cotton weave', (.84, .85, .69), .83, fabric=True)
glass = material('frosted blue', (.14, .39, .44), .19, .25)
leaf = material('leaf green', (.21, .42, .19), .75)
soil = material('sandstone base', (.73, .65, .49), .74)
signal = material('status light', (.35, .85, .72), .24, .2, emission=2)


def collection(name):
    c = bpy.data.collections.get('MOVE Art / ' + name)
    if c:
        for o in list(c.objects):
            bpy.data.objects.remove(o, do_unlink=True)
    else:
        c = bpy.data.collections.new('MOVE Art / ' + name)
        scene.collection.children.link(c)
    ART[name] = c
    return c


def put(o, name, mat, coll, smooth=False):
    o.name = name
    for c in list(o.users_collection):
        c.objects.unlink(o)
    coll.objects.link(o)
    if hasattr(o.data, 'materials'):
        o.data.materials.clear()
        o.data.materials.append(mat)
    if smooth and o.type == 'MESH':
        for p in o.data.polygons:
            p.use_smooth = True
    return o


def mesh(name, verts, faces, mat, coll, smooth=True, subdiv=0):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    o = bpy.data.objects.new(name, data)
    coll.objects.link(o)
    o.data.materials.append(mat)
    if smooth:
        for p in o.data.polygons:
            p.use_smooth = True
    if subdiv:
        mod = o.modifiers.new('Sculpted surface', 'SUBSURF')
        mod.levels = subdiv
    return o


def box(name, loc, size, mat, coll, bevel=.035):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        b = o.modifiers.new('Manufactured radius', 'BEVEL')
        b.width = bevel
        b.segments = 5
        bpy.ops.object.modifier_apply(modifier=b.name)
        n = o.modifiers.new('Surface normals', 'WEIGHTED_NORMAL')
        bpy.ops.object.modifier_apply(modifier=n.name)
    return put(o, name, mat, coll)


def ball(name, loc, scale, mat, coll):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=40, ring_count=24, radius=1, location=loc)
    o = bpy.context.object
    o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return put(o, name, mat, coll, True)


def cylinder(name, loc, radius, depth, mat, coll, rot=(0, 0, 0), bevel=.01):
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=radius, depth=depth, location=loc, rotation=rot)
    o = bpy.context.object
    if bevel:
        b = o.modifiers.new('Rounded rim', 'BEVEL')
        b.width = bevel
        b.segments = 3
        bpy.ops.object.modifier_apply(modifier=b.name)
        n = o.modifiers.new('Surface normals', 'WEIGHTED_NORMAL')
        bpy.ops.object.modifier_apply(modifier=n.name)
    return put(o, name, mat, coll, True)


def beam(name, a, b, radius, mat, coll):
    d = Vector(b) - Vector(a)
    o = cylinder(name, (Vector(a) + Vector(b)) / 2, radius, d.length, mat, coll, bevel=.009)
    o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    return o


def cord(name, points, radius, mat, coll, cyclic=False):
    data = bpy.data.curves.new(name, 'CURVE')
    data.dimensions = '3D'
    data.resolution_u = 16
    data.bevel_depth = radius
    data.bevel_resolution = 4
    spline = data.splines.new('BEZIER')
    spline.bezier_points.add(len(points) - 1)
    for p, xyz in zip(spline.bezier_points, points):
        p.co = xyz
        p.handle_left_type = 'AUTO'
        p.handle_right_type = 'AUTO'
    spline.use_cyclic_u = cyclic
    o = bpy.data.objects.new(name, data)
    coll.objects.link(o)
    data.materials.append(mat)
    return o


def torus(name, loc, radius, minor, mat, coll, rot=(0, 0, 0), scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_torus_add(major_segments=64, minor_segments=16, location=loc,
                                   major_radius=radius, minor_radius=minor, rotation=rot)
    o = bpy.context.object
    o.scale = scale
    return put(o, name, mat, coll, True)


def text(name, body, loc, size, mat, coll, rot=(math.pi / 2, 0, 0)):
    data = bpy.data.curves.new(name, 'FONT')
    data.body = body
    data.size = size
    data.align_x = 'CENTER'
    data.extrude = .002
    data.bevel_depth = .001
    o = bpy.data.objects.new(name, data)
    coll.objects.link(o)
    o.location = loc
    o.rotation_euler = rot
    data.materials.append(mat)
    return o


def plinth(coll, width=1.7, depth=1.35):
    box('Floating sandstone tile', (0, 0, -.04), (width, depth, .15), soil, coll, .10)
    box('Cream tile surface', (0, 0, .043), (width - .04, depth - .04, .038), ivory, coll, .07)


def shoe(coll, offset=(0, 0, 0), angle=0, scale=1, upper_mat=cloth, futuristic=False):
    before = set(coll.objects)
    # Rounded cross-sections sculpt the last, rather than stacking primitives.
    # y, lateral width, height centre, vertical radius.
    rings = [(-.59, .045, .19, .034), (-.54, .145, .195, .06),
             (-.39, .205, .205, .092), (-.20, .205, .245, .13),
             (-.03, .178, .295, .17), (.15, .151, .355, .21),
             (.30, .139, .36, .225), (.39, .128, .30, .18), (.435, .08, .27, .10)]
    n = 32
    verts = []
    for y, rx, z, rz in rings:
        for i in range(n):
            a = math.tau * i / n
            verts.append((rx * math.cos(a), y, z + rz * math.sin(a)))
    faces = []
    for r in range(len(rings) - 1):
        for i in range(n):
            q = r * n + i
            v = r * n + (i + 1) % n
            faces.append((q, v, v + n, q + n))
    faces += [tuple(reversed(range(n))), tuple((len(rings) - 1) * n + i for i in range(n))]
    mesh('Woven shaped upper', verts, faces, upper_mat, coll, subdiv=2)

    def sole(name, z0, height, mat, extra=0):
        vs = []
        for y, rx, z, rz in rings:
            for i in range(n):
                a = math.tau * i / n
                # Cross-sections follow the toe lift and soft convex sidewall.
                top = z0 + .025 * max(0, -y - .22)
                vs.append(((rx + extra) * math.cos(a), y, top + height * math.sin(a)))
        return mesh(name, vs, faces, mat, coll, subdiv=2)
    sole('Cream sculpted midsole', .112, .065, ivory, .022)
    sole('Copper energy layer', .075, .027, coral if not futuristic else signal, .029)
    sole('Grippy outsole', .051, .026, rubber, .023)
    # Open ankle collar is a dark inset and a padded elliptical rim.
    ball('Collar dark opening', (0, .23, .526), (.119, .14, .035), navy, coll)
    torus('Soft padded ankle collar', (0, .23, .532), .118, .027, upper_mat, coll, scale=(1, 1.25, 1))
    box('Heel pull loop', (0, .404, .465), (.066, .033, .16), coral, coll, .021)
    box('Tongue patch', (0, .005, .447), (.12, .14, .025), cream, coll, .025)
    for y in [-.29, -.21, -.13, -.05]:
        z = .36 + (y + .29) * .34
        for x in [-.118, .118]:
            ball('Lace eyelet', (x, y, z), (.014, .014, .014), brass, coll)
        cord('Crossed cotton lace', [(-.12, y, z), (0, y + .04, z + .021), (.12, y, z)], .009, ivory, coll)
    for sign in [-1, 1]:
        # Original double slash, with a stitched welt; no borrowed logos.
        for y in [-.12, .005]:
            cord('Side reinforcement', [(sign * .185, y - .05, .235),
                                       (sign * .174, y, .305), (sign * .147, y + .08, .40)], .025, cream, coll)
        cord('Upper seam', [(sign * .16, -.45, .23), (sign * .2, -.22, .29),
                            (sign * .145, .18, .4), (sign * .13, .37, .32)], .004, mint, coll)
        for y in [-.46, -.405, -.35]:
            ball('Toe perforation', (sign * .075, y, .277), (.007, .007, .004), navy, coll)
    for y in [-.45, -.32, -.18, -.02, .14, .29]:
        box('Outsole tread', (0, y, .016), (.24 if y < .1 else .20, .043, .018), rubber, coll, .008)
    if futuristic:
        for sign in [-1, 1]:
            cord('Carbon spring rail', [(sign * .17, -.5, .14), (sign * .22, -.17, .13),
                                       (sign * .15, .34, .17)], .016, silver, coll)
    ca, sa = math.cos(angle), math.sin(angle)
    for o in set(coll.objects) - before:
        p = o.location.copy()
        o.location = (offset[0] + scale * (p.x * ca - p.y * sa),
                      offset[1] + scale * (p.x * sa + p.y * ca), offset[2] + scale * p.z)
        o.rotation_euler.z += angle
        o.scale *= scale


def shoes():
    c = collection('shoes')
    plinth(c, 1.9, 1.65)
    shoe(c, (-.25, -.13, .065), -.32, 1.05)
    shoe(c, (.28, .25, .065), -.10, 1.05, cotton)
    return c


def bottle(coll, x, y, z, scale=1):
    cylinder('Enamel water flask', (x, y, z + .36 * scale), .13 * scale, .55 * scale, teal, coll, bevel=.035)
    cylinder('Flask shoulder', (x, y, z + .64 * scale), .10 * scale, .07 * scale, silver, coll, bevel=.023)
    cylinder('Flask cap', (x, y, z + .70 * scale), .085 * scale, .09 * scale, coral, coll, bevel=.016)
    torus('Cap carrying loop', (x, y, z + .80 * scale), .045 * scale, .01 * scale, navy, coll, rot=(math.pi / 2, 0, 0))
    text('Flask badge', '+', (x, y - .133 * scale, z + .28 * scale), .16 * scale, ivory, coll)


def training():
    c = collection('training')
    plinth(c, 1.75, 1.55)
    # A rolled mat with visible spiral ends, elastic ties and woven towel.
    cylinder('Rolled training mat', (-.30, .25, .28), .22, 1.0, mint, c, rot=(0, math.pi / 2, 0), bevel=.025)
    for x in [-.8, .2]:
        cylinder('Mat foam end', (x, .25, .28), .205, .011, cloth, c, rot=(0, math.pi / 2, 0))
        points = []
        for i in range(80):
            a = i / 79 * math.tau * 2.3
            r = .04 + .16 * i / 79
            points.append((x - .008, .25 + r * math.cos(a), .28 + r * math.sin(a)))
        cord('Visible rolled mat spiral', points, .009, mint, c)
    for x in [-.55, -.05]:
        torus('Mat retaining strap', (x, .25, .28), .225, .024, coral, c, rot=(0, math.pi / 2, 0))
    bottle(c, .46, .22, .055)
    box('Folded woven towel', (-.20, -.31, .16), (.73, .45, .16), cotton, c, .055)
    for yy in [-.5, -.48, -.46]:
        cord('Towel woven border', [(-.52, yy, .239), (-.20, yy, .24), (.12, yy, .239)], .006, teal, c)
    for x in [-.49, -.44, -.39, -.34, -.29, -.24, -.19, -.14, -.09, -.04, .01, .06]:
        cord('Towel fringe', [(x, -.51, .12), (x, -.56, .10), (x + .01, -.59, .09)], .006, cotton, c)
    # Red heart on a simple trainer's log makes endurance readable at a glance.
    notebook = box('Training notebook', (.41, -.30, .103), (.42, .53, .08), coral, c, .025)
    box('Notebook cream label', (.41, -.3, .15), (.34, .38, .016), ivory, c, .025)
    points = []
    for i in range(80):
        t = math.tau * i / 80
        xx = .0058 * 16 * math.sin(t) ** 3
        yy = .0058 * (13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t))
        points.append((.41 + xx, -.27 + yy, .164))
    cord('Training journal heart', points, .018, teal, c, True)
    for x in [.21, .26, .31, .36, .41, .46, .51, .56, .61]:
        torus('Notebook binding', (x, -.04, .14), .024, .006, brass, c, rot=(math.pi / 2, 0, 0))
    return c


def stopwatch(coll, x=0, y=0, z=.58, size=1):
    rot = (math.pi / 2, 0, 0)
    r = .36 * size
    cylinder('Stopwatch machined body', (x, y, z), r, .12 * size, silver, coll, rot, bevel=.025 * size)
    cylinder('Dial cream face', (x, y - .069 * size, z), r * .91, .013 * size, ivory, coll, rot, bevel=.009)
    torus('Dial copper bezel', (x, y - .082 * size, z), r * .91, .018 * size, brass, coll, rot)
    for i in range(60):
        a = math.tau * i / 60
        rr = r * .8
        length = .032 * size if i % 5 == 0 else .013 * size
        cord('Dial tick', [(x + math.sin(a) * rr, y - .09 * size, z + math.cos(a) * rr),
                           (x + math.sin(a) * (rr - length), y - .09 * size, z + math.cos(a) * (rr - length))],
             .0055 * size if i % 5 == 0 else .0028 * size, teal, coll)
    text('Watch twelve', '12', (x, y - .102 * size, z + .18 * size), .065 * size, teal, coll)
    text('Watch six', '6', (x, y - .102 * size, z - .24 * size), .065 * size, teal, coll)
    beam('Minute hand', (x, y - .105 * size, z), (x - .15 * size, y - .105 * size, z + .13 * size), .012 * size, teal, coll)
    beam('Seconds hand', (x, y - .123 * size, z - .045 * size), (x + .135 * size, y - .123 * size, z + .215 * size), .006 * size, coral, coll)
    ball('Dial axle', (x, y - .133 * size, z), (.024 * size, .013 * size, .024 * size), brass, coll)
    cylinder('Stopwatch crown', (x, y, z + r + .055 * size), .048 * size, .09 * size, teal, coll, bevel=.012)
    torus('Stopwatch hanging loop', (x, y, z + r + .15 * size), .095 * size, .018 * size, silver, coll, rot)
    cylinder('Watch push button', (x + .255 * size, y, z + .265 * size), .042 * size, .07 * size, coral, coll, rot=(0, -.65, 0))


def cone(coll, x, y, z, scale=1):
    box('Cone rubber base', (x, y, z + .023 * scale), (.27 * scale, .27 * scale, .046 * scale), navy, coll, .022)
    bpy.ops.mesh.primitive_cone_add(vertices=64, radius1=.105 * scale, radius2=.027 * scale,
                                  depth=.29 * scale, location=(x, y, z + .19 * scale))
    put(bpy.context.object, 'Training cone', coral, coll, True)
    bpy.ops.mesh.primitive_cone_add(vertices=64, radius1=.070 * scale, radius2=.06 * scale,
                                  depth=.045 * scale, location=(x, y, z + .245 * scale))
    put(bpy.context.object, 'Cone reflective band', ivory, coll, True)


def stride():
    c = collection('stride')
    plinth(c, 1.7, 1.6)
    # Curving track strips underneath a proud instrument create a compact scene.
    box('Track lane tile', (0, 0, .10), (1.54, 1.44, .04), coral, c, .09)
    for x in [-.53, -.25, .03, .31, .59]:
        cord('Curved track lane', [(x - .08, -.63, .128), (x, -.24, .128),
                                  (x + .01, .20, .128), (x - .03, .62, .128)], .009, ivory, c)
    stopwatch(c, -.1, .20, .59, 1.1)
    cone(c, -.58, -.36, .13, .88)
    cone(c, .55, .37, .13, .7)
    box('Sprint start pad', (.27, -.35, .16), (.42, .35, .06), silver, c, .018)
    for x in [.18, .39]:
        o = box('Start block footplate', (x, -.37, .245), (.14, .29, .035), teal, c, .013)
        o.rotation_euler.x = .50
    return c


def shrub(coll, x, y, size=.25):
    cylinder('Planter', (x, y, .16), size * .74, .23, cream, coll, bevel=.04)
    for dx, dy, zz, rr in [(0, 0, .34, 1), (-.09, 0, .4, .75), (.08, .03, .45, .8), (0, -.06, .52, .7)]:
        ball('Trimmed leaf canopy', (x + dx, y + dy, zz), (size * rr, size * rr, size * rr), leaf, coll)


def clinic():
    c = collection('clinic')
    plinth(c, 3.0, 2.55)
    box('Garden lawn', (0, .15, .08), (2.86, 2.23, .04), mint, c, .12)
    box('Curving red training apron', (0, -.59, .11), (2.86, .61, .06), coral, c, .18)
    for yy in [-.70, -.52]:
        cord('Apron training lanes', [(-1.32, yy, .148), (0, yy, .148), (1.32, yy, .148)], .009, ivory, c)
    box('Clinic footing', (-.17, .25, .16), (2.14, 1.28, .16), cream, c, .07)
    box('Clinic main building', (-.37, .36, .71), (1.66, 1.07, 1.00), cream, c, .055)
    box('Clinic glass front', (-.37, -.193, .68), (1.54, .035, .67), glass, c, .013)
    for x in [-1.05, -.63, -.22, .20]:
        box('Glass timber mullion', (x, -.221, .69), (.027, .05, .74), wood, c, .005)
    for x in [-1.07, -.85, -.63, -.41, -.19, .03, .25]:
        box('Upper warm timber slat', (x, -.216, 1.095), (.074, .05, .16), wood, c, .006)
    box('Deep petrol flat roof', (-.37, .32, 1.265), (1.92, 1.30, .13), teal, c, .06)
    box('Roof cream fascia', (-.37, -.34, 1.24), (1.90, .055, .045), cream, c, .012)
    box('Clinic side tower', (.65, .43, .80), (.47, .85, 1.17), cream, c, .035)
    box('Tower roof', (.65, .43, 1.414), (.55, .95, .10), teal, c, .04)
    box('Entrance doorway', (.64, -.004, .54), (.27, .035, .63), glass, c, .015)
    box('Door pull', (.735, -.035, .54), (.015, .035, .16), brass, c, .006)
    box('Clinic copper cross vertical', (.65, -.018, 1.12), (.067, .033, .25), coral, c, .012)
    box('Clinic copper cross horizontal', (.65, -.037, 1.12), (.23, .037, .063), coral, c, .012)
    box('Welcome canopy', (.68, -.175, .92), (.51, .42, .068), wood, c, .025)
    for x in [.45, .89]:
        beam('Canopy support', (x, -.35, .18), (x, -.35, .89), .019, teal, c)
    box('Welcome step', (.66, -.28, .205), (.47, .25, .08), cream, c, .025)
    box('Roof solar panel', (-.75, .45, 1.364), (.58, .71, .034), glass, c, .014)
    for y in [.16, .30, .44, .58, .72]:
        box('Solar cell fine grid', (-.75, y, 1.386), (.54, .008, .005), silver, c, .001)
    for x in [-.88, -.68]:
        box('Solar cell longitudinal line', (x, .45, 1.386), (.007, .67, .005), silver, c, .001)
    box('Heat pump rooftop unit', (-.08, .53, 1.46), (.32, .29, .28), silver, c, .025)
    for y in [.43, .48, .53, .58, .63]:
        box('Heat pump louvers', (.085, y, 1.46), (.014, .013, .17), navy, c, .002)
    text('Building MOVE sign', 'M O V E', (-.42, -.239, .92), .09, cream, c)
    # Indoor gear and benches are visible through the large studio frontage.
    for x in [-.88, -.34]:
        box('Indoor training bench', (x, -.238, .41), (.38, .023, .064), wood, c, .012)
        for dx in [-.13, .13]:
            box('Training bench legs', (x + dx, -.24, .32), (.028, .025, .13), teal, c, .005)
    shrub(c, 1.17, .54, .22)
    shrub(c, -1.27, .82, .19)
    shrub(c, -1.23, -.12, .18)
    # Bicycle parked next to the building; fine details survive the 768px render.
    for y in [.13, .61]:
        torus('Parked bicycle tyre', (1.12, y, .31), .195, .015, rubber, c, rot=(0, math.pi / 2, 0))
        torus('Bicycle alloy rim', (1.12, y, .31), .175, .005, silver, c, rot=(0, math.pi / 2, 0))
    for a, b in [((1.12,.13,.31),(1.12,.35,.5)), ((1.12,.35,.5),(1.12,.39,.31)),
                 ((1.12,.39,.31),(1.12,.13,.31)), ((1.12,.35,.5),(1.12,.58,.52)),
                 ((1.12,.58,.52),(1.12,.61,.31)), ((1.12,.61,.31),(1.12,.39,.31))]:
        beam('Bicycle frame tube', a, b, .012, coral, c)
    box('Bicycle saddle', (1.12,.34,.57), (.09,.12,.023), navy,c,.013)
    beam('Bicycle handlebar', (1.02,.58,.59),(1.23,.58,.59), .01, navy,c)
    return c


def vest():
    c = collection('vest')
    plinth(c, 1.62, 1.42)
    # A sculpted sleeveless jacket on a small display stand, with a real hollow
    # neck and arm openings implied by dark lining, seams and cut shoulder strips.
    body_rings = [(.17,.32,.14), (.25,.34,.15), (.52,.30,.155), (.75,.36,.18), (.88,.34,.16), (.94,.22,.13)]
    n = 48
    vs = [(rx * math.cos(math.tau * i/n), ry * math.sin(math.tau * i/n), z)
          for z,rx,ry in body_rings for i in range(n)]
    fs = []
    for j in range(len(body_rings)-1):
        for i in range(n):
            a=j*n+i; b=j*n+(i+1)%n
            fs.append((a,b,b+n,a+n))
    mesh('Contoured textile training vest', vs, fs, cloth, c, subdiv=2)
    # Front opening, ivory zipper and stitched hem.
    cord('Vest zipper', [(0,-.145,.20),(0,-.163,.55),(0,-.153,.86)], .008, ivory, c)
    box('Zipper copper pull', (0,-.168,.84), (.033,.02,.054), coral,c,.01)
    for sign in [-1,1]:
        cord('Vest shaping seam', [(sign*.23,-.115,.22),(sign*.23,-.151,.5),(sign*.27,-.12,.75)], .006, mint,c)
        box('Angled pocket', (sign*.20,-.155,.39), (.20,.032,.19), cotton,c,.025)
        cord('Reflective shoulder strip', [(sign*.18,-.13,.76),(sign*.22,-.07,.91),(sign*.18,.04,.94)], .027, coral,c)
    torus('Vest waist seam', (0,0,.19), .31,.012, mint,c,scale=(1,.47,1))
    ball('Neck shadow inset', (0,0,.945), (.16,.10,.022), navy,c)
    torus('Folded padded neckline', (0,0,.945), .15,.018, cotton,c,scale=(1,.67,1))
    box('Breast mark horizontal', (.15,-.173,.69), (.07,.015,.017), ivory,c,.003)
    box('Breast mark vertical', (.15,-.18,.69), (.017,.015,.07), ivory,c,.003)
    cylinder('Display foot', (0,0,.085), .22,.03,brass,c)
    beam('Display stem',(0,.035,.12),(0,.035,.86),.02,brass,c)
    return c


def workbench():
    c = collection('workbench')
    plinth(c, 2.3, 1.8)
    box('Birch worktop', (0,0,.74), (1.92,.92,.14), wood,c,.06)
    box('Worktop cream trim', (0,-.46,.74), (1.82,.038,.035), cream,c,.013)
    for x in [-.78,.78]:
        for y in [-.30,.30]:
            box('Workbench enamel leg', (x,y,.39), (.09,.10,.59), teal,c,.02)
    box('Under-bench shelf', (0,.02,.24), (1.63,.62,.07), wood,c,.022)
    box('Parts drawer', (-.36,-.05,.57), (.76,.79,.20), cream,c,.025)
    beam('Brass drawer pull', (-.55,-.46,.57),(-.2,-.46,.57),.018,brass,c)
    box('Small pegboard', (0,.43,1.14), (1.73,.08,.69), cream,c,.03)
    for x in [-.72,-.56,-.40,-.24,-.08,.08,.24,.4,.56,.72]:
        for z in [.90,1.04,1.18,1.32]:
            ball('Pegboard perforation', (x,.383,z),(.010,.005,.010),wood,c)
    # Tools include calipers, screwdriver, a tape spool and a spring heel prototype.
    for x in [-.64,-.33]:
        beam('Tool hook',(x,.345,1.31),(x,.29,1.29),.012,brass,c)
    box('Caliper long rail', (-.59,.28,1.12), (.026,.031,.38),silver,c,.008)
    for z in [1.25,1.07]:
        box('Caliper measuring jaw', (-.53,.27,z), (.14,.027,.026),silver,c,.005)
    box('Caliper scale screen', (-.57,.25,1.13),(.10,.034,.075),teal,c,.012)
    beam('Screwdriver shaft',(-.27,.29,.96),(-.27,.29,1.23),.012,silver,c)
    cylinder('Screwdriver soft grip',(-.27,.29,1.25),.035,.15,coral,c,bevel=.02)
    shoe(c,(-.28,-.08,.79),-.30,.73)
    box('Bench vice body',(.68,-.2,.9),(.27,.26,.20),teal,c,.022)
    for y in [-.31,-.10]:
        box('Vice aluminium jaw',(.68,y,1.03),(.29,.06,.075),silver,c,.014)
    beam('Vice screw',(.49,-.2,.9),(.89,-.2,.9),.018,silver,c)
    beam('Vice handle',(.92,-.2,.81),(.92,-.2,1.01),.012,brass,c)
    cylinder('Tape spool',(.32,.09,.86),.105,.083,cream,c)
    torus('Spool winding',(.32,.09,.90),.079,.023,coral,c)
    box('Parts box on shelf',(.51,.03,.355),(.43,.36,.17),coral,c,.023)
    text('Parts box label','M',(.51,-.156,.345),.09,cream,c)
    return c


def bionics():
    c = collection('bionics')
    plinth(c, 1.62, 1.45)
    shoe(c,(0,-.12,.065),.08,.93,cream,True)
    # A bionic lower leg on an attractive exhibition fixture. The shells are
    # lofted rather than block limbs; joint hardware is physically readable.
    def limb_shell(name, rings, mat):
        n=48
        vs=[(rx*math.cos(math.tau*i/n)+xx, ry*math.sin(math.tau*i/n)+yy,z)
            for z,rx,ry,xx,yy in rings for i in range(n)]
        fs=[]
        for j in range(len(rings)-1):
            for i in range(n):
                a=j*n+i;b=j*n+(i+1)%n;fs.append((a,b,b+n,a+n))
        fs.extend([tuple(reversed(range(n))),tuple((len(rings)-1)*n+i for i in range(n))])
        mesh(name,vs,fs,mat,c,subdiv=2)
    limb_shell('Porcelain bionic shin',[(.47,.09,.11,0,.14),(.58,.12,.14,0,.13),
                                      (.84,.15,.16,.012,.15),(1.07,.135,.15,.025,.19)],cream)
    limb_shell('Bionic thigh shell',[(1.21,.16,.17,.025,.20),(1.31,.19,.18,.018,.25),
                                     (1.49,.17,.165,0,.27),(1.59,.14,.145,0,.27)],teal)
    for x in [-.16,.16]:
        cylinder('Bionic knee side bearing',(x,.20,1.14),.135,.045,silver,c,rot=(0,math.pi/2,0),bevel=.015)
        cylinder('Copper joint cap',(x*1.18,.20,1.14),.073,.04,coral,c,rot=(0,math.pi/2,0))
    torus('Calf service ring',(0,.155,.80),.145,.026,silver,c,scale=(1,1.15,1))
    for sign in [-1,1]:
        beam('Exposed calf actuator',(sign*.10,.29,.53),(sign*.15,.36,1.05),.022,silver,c)
        beam('Actuator piston sleeve',(sign*.115,.32,.65),(sign*.142,.35,.91),.04,navy,c)
    cord('Bionic green status channel',[(-.08,.014,.54),(-.1,-.005,.8),(-.075,.027,1.00)],.014,signal,c)
    cord('Sensor wiring',[(.13,.27,.50),(.20,.32,.82),(.18,.28,1.08)],.013,coral,c)
    cylinder('Exhibition support foot',(.37,.4,.10),.14,.045,brass,c)
    beam('Exhibition support stem',(.37,.4,.12),(.37,.4,1.43),.018,brass,c)
    beam('Support cross arm',(.37,.4,1.43),(.11,.36,1.43),.016,brass,c)
    return c


def launcher():
    c = collection('launcher')
    plinth(c, 2.3, 1.78)
    # A compact test launcher: hollow barrel, adjustable brass trunnions,
    # pressure dial and a rock frozen along a dotted ballistic arc.
    box('Launcher test bench', (-.38,.20,.29), (.95,.72,.32),wood,c,.055)
    box('Launcher mounting plate',(-.38,.20,.47),(1.02,.77,.06),teal,c,.035)
    for x in [-.62,-.18]:
        box('Barrel support fork',(x,.21,.60),(.055,.31,.25),silver,c,.025)
    a=Vector((-.70,.25,.62)); b=Vector((-.19,-.16,.89))
    direction=(b-a).normalized()
    barrel=beam('Porcelain launcher barrel',a,b,.125,cream,c)
    cap=cylinder('Barrel dark bore',b+direction*.002,.097,.009,navy,c,bevel=.001)
    cap.rotation_euler=direction.to_track_quat('Z','Y').to_euler()
    rim=torus('Copper muzzle ring',b+direction*.006,.112,.025,coral,c)
    rim.rotation_euler=direction.to_track_quat('Z','Y').to_euler()
    band=cylinder('Rear barrel clamp',a+direction*.13,.133,.06,teal,c)
    band.rotation_euler=direction.to_track_quat('Z','Y').to_euler()
    for x in [-.61,-.20]:
        cylinder('Brass adjustable trunnion',(x,.21,.66),.067,.041,brass,c,rot=(0,math.pi/2,0))
    torus('Elevation adjusting handwheel',(-.16,.35,.38),.078,.012,teal,c,rot=(0,math.pi/2,0))
    beam('Handwheel axle',(-.23,.35,.38),(-.10,.35,.38),.014,silver,c)
    # Instrument on the bench, with a real needle rather than text garnish.
    cylinder('Pressure dial',(-.63,-.18,.46),.077,.037,cream,c,rot=(math.pi/2,0,0))
    beam('Pressure dial needle',(-.63,-.205,.46),(-.60,-.205,.50),.004,coral,c)
    rock=ball('Thrown test stone',(.27,-.42,1.13),(.105,.084,.089),soil,c)
    noise=rock.modifiers.new('Natural stone silhouette','DISPLACE')
    tex=bpy.data.textures.new('Stone surface irregularity','CLOUDS');tex.noise_scale=.19
    noise.texture=tex;noise.strength=.025
    for i in range(29):
        t=i/28
        x=-.15+1.14*t;y=-.19-.52*t;z=.94+1.1*t-1.53*t*t
        if .25<t<.50: continue
        ball('Ballistic trajectory marker',(x,y,z),(.012,.012,.012),coral,c)
    torus('Landing bullseye',(.98,-.7,.075),.125,.008,teal,c)
    torus('Landing centre',(.98,-.7,.075),.048,.008,coral,c)
    box('Observation notebook',(.59,.4,.135),(.51,.42,.10),coral,c,.028)
    box('Observation notebook label',(.59,.4,.191),(.39,.29,.015),ivory,c,.018)
    cord('Observed arc ink',[(.43,.43,.205),(.52,.35,.205),(.67,.34,.205),(.76,.45,.205)],.007,teal,c)
    return c


def wheels():
    c = collection('wheels')
    plinth(c, 2.35, 1.50)
    # Complete original touring bicycle, facing right on a small service stand.
    hubs=[(-.64,0,.43),(.66,0,.43)]
    for x,y,z in hubs:
        torus('Bicycle rubber tyre',(x,y,z),.34,.040,rubber,c,rot=(math.pi/2,0,0))
        torus('Bicycle bright alloy rim',(x,y,z),.306,.015,silver,c,rot=(math.pi/2,0,0))
        cylinder('Wheel hub',(x,y,z),.041,.13,brass,c,rot=(math.pi/2,0,0))
        for i in range(24):
            a=math.tau*i/24
            beam('Wheel tension spoke',(x,y-.02 if i%2 else y+.02,z),
                 (x+.294*math.cos(a),y,z+.294*math.sin(a)),.0035,silver,c)
    crank=(0,0,.41);seat=(-.24,0,.90);front=(.46,0,.92)
    for a,b in [(hubs[0],seat),(seat,crank),(crank,hubs[0]),(seat,front),(front,crank)]:
        beam('Bicycle enamel frame',a,b,.032,teal,c)
    for y in [-.07,.07]:
        beam('Front fork',(.47,y,.93),(.66,y,.43),.017,silver,c)
        beam('Rear chain stay',(-.64,y,.43),(-.06,y,.41),.013,teal,c)
    beam('Seat post',seat,(-.27,0,1.04),.024,silver,c)
    seat_obj=ball('Leather bicycle saddle',(-.29,0,1.057),(.18,.095,.036),coral,c)
    beam('Handlebar stem',(.46,0,.91),(.42,0,1.10),.019,silver,c)
    cord('Swept touring handlebar',[(.33,-.25,1.09),(.42,-.16,1.10),(.42,0,1.10),
                                  (.42,.16,1.10),(.33,.25,1.09)],.017,silver,c)
    for y in [-.23,.23]:
        beam('Rubber handlebar grip',(.33,y-.045,1.09),(.33,y+.045,1.09),.026,navy,c)
    cord('Brake cable',[(.35,-.22,1.10),(.47,-.09,.88),(.65,-.05,.52)],.004,rubber,c)
    cylinder('Crank gear',(0,-.07,.41),.104,.02,silver,c,rot=(math.pi/2,0,0))
    torus('Crank gear ring',(0,-.087,.41),.078,.007,navy,c,rot=(math.pi/2,0,0))
    beam('Crank arm',(0,-.10,.41),(.12,-.10,.33),.016,silver,c)
    box('Platform pedal',(.14,-.10,.33),(.12,.12,.025),navy,c,.006)
    cord('Bicycle drive chain',[(-.64,-.081,.465),(-.02,-.081,.52),(.103,-.081,.41),
                               (-.02,-.081,.302),(-.65,-.081,.393)],.009,navy,c,True)
    bottle(c,-.14,.014,.37,.46)
    beam('Rear luggage rack',(-.91,.11,.85),(-.32,.11,.85),.012,silver,c)
    for x in [-.83,-.70,-.57,-.44]:
        beam('Rack cross rail',(x,-.10,.85),(x,.13,.85),.007,silver,c)
    beam('Rack support',(-.81,.1,.82),(-.64,.1,.45),.01,silver,c)
    box('Bicycle inspection stand',(0,.30,.12),(.55,.28,.10),wood,c,.03)
    beam('Stand mast',(0,.30,.17),(0,.30,.56),.027,teal,c)
    beam('Stand holding arm',(0,.30,.55),(0,.04,.57),.025,teal,c)
    return c


def fan():
    c=collection('fan')
    plinth(c,1.65,1.48)
    # A backpack air-assist prototype, with a sculpted turbine, shoulder straps
    # and a waist battery. Its silhouette communicates wind rather than shoes.
    box('Air assist battery',(0,.10,.30),(.64,.24,.32),teal,c,.065)
    box('Battery service cover',(0,-.031,.30),(.50,.02,.20),cream,c,.028)
    for x in [-.15,-.05,.05,.15]:
        box('Battery vent',(x,-.049,.31),(.018,.013,.10),navy,c,.006)
    cylinder('Backpack turbine housing',(0,.08,.83),.40,.17,cream,c,rot=(math.pi/2,0,0),bevel=.033)
    cylinder('Turbine dark cavity',(0,-.014,.83),.345,.018,navy,c,rot=(math.pi/2,0,0),bevel=.004)
    torus('Copper fan inlet rim',(0,-.041,.83),.351,.034,coral,c,rot=(math.pi/2,0,0))
    cylinder('Turbine hub',(0,-.09,.83),.077,.12,silver,c,rot=(math.pi/2,0,0),bevel=.014)
    # Six original twisted, swept aerodynamic blades.
    for i in range(6):
        angle=i*math.tau/6
        verts=[]
        for j in range(9):
            r=.075+j*.028
            a=angle+j*.055
            for side in [-1,1]:
                aa=a+side*(.14+.06*j/8)
                verts.append((math.sin(aa)*r,-.07+.044*j/8+side*.020,.83+math.cos(aa)*r))
        faces=[(j*2,j*2+1,j*2+3,j*2+2) for j in range(8)]
        o=mesh('Curved turbine blade',verts,faces,mint,c,subdiv=2)
        solid=o.modifiers.new('Blade thickness','SOLIDIFY');solid.thickness=.012
    for a in [0,math.pi/3,2*math.pi/3]:
        beam('Turbine safety grille',(-math.sin(a)*.32,-.122,.83-math.cos(a)*.32),
             (math.sin(a)*.32,-.122,.83+math.cos(a)*.32),.007,silver,c)
    for x in [-.29,.29]:
        cord('Backpack shoulder strap',[(x,.14,.31),(x*.95,.20,.76),(x*.83,.22,1.17),
                                       (x*.68,.01,1.13),(x*.88,-.02,.52)],.035,cloth,c)
        box('Strap adjustment buckle',(x,-.03,.49),(.084,.043,.062),silver,c,.015)
    cord('Battery power cable',[(-.24,.23,.39),(-.35,.25,.59),(-.28,.21,.93)],.016,coral,c)
    for i in range(3):
        ball('Battery charge indicator',(.21,-.052,.29+i*.037),(.012,.006,.012),signal,c)
    cylinder('Prototype display foot',(0,.27,.095),.15,.06,brass,c)
    beam('Prototype display support',(0,.27,.12),(0,.27,.85),.022,brass,c)
    return c


BUILDERS={'shoes':shoes,'training':training,'stride':stride,'clinic':clinic,
          'vest':vest,'workbench':workbench,'bionics':bionics,
          'launcher':launcher,'wheels':wheels,'fan':fan}


def setup_render():
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 48
    scene.cycles.use_denoising = True
    scene.view_settings.exposure = -.55
    scene.render.resolution_x = 768
    scene.render.resolution_y = 768
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    formats=[i.identifier for i in scene.render.image_settings.bl_rna.properties['file_format'].enum_items]
    scene.render.image_settings.file_format = next(x for x in formats if x == 'WEBP')
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.image_settings.quality = 90
    if not scene.world:
        scene.world = bpy.data.worlds.new('MOVE Menu Studio World')
    scene.world.use_nodes=True
    bg=next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND')
    bg.inputs['Color'].default_value=(.77,.83,.85,1)
    bg.inputs['Strength'].default_value=.32
    rig=bpy.data.collections.get('MOVE Menu Studio')
    if rig:
        for o in list(rig.objects): bpy.data.objects.remove(o,do_unlink=True)
    else:
        rig=bpy.data.collections.new('MOVE Menu Studio');scene.collection.children.link(rig)
    for name,loc,power,size,col in [
        ('Large warm key',(-3,-4,6),650,4.0,(1,.91,.77)),
        ('Cool fill',(4,-1,3),440,3.0,(.75,.89,1)),
        ('Top rim',(-1,4,5),850,3.0,(1,.94,.79))]:
        data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=col
        o=bpy.data.objects.new(name,data);rig.objects.link(o);o.location=loc
        o.rotation_euler=(Vector((0,0,.6))-o.location).to_track_quat('-Z','Y').to_euler()
    data=bpy.data.cameras.new('MOVE Menu Camera')
    cam=bpy.data.objects.new('MOVE Menu Camera',data);rig.objects.link(cam)
    cam.location=(4,-6,4.8)
    data.type='ORTHO'
    scene.camera=cam


def render_art(name):
    bpy.context.window.scene=scene
    if not scene.camera: setup_render()
    c=BUILDERS[name]()
    for other in scene.collection.children:
        if other.name.startswith('MOVE Art / '):
            other.hide_render = other != c
            other.hide_viewport = other != c
    target = {'clinic':(.0,.02,.30),'bionics':(0,.0,.57),'workbench':(0,.0,.35),
              'vest':(0,0,.26),'launcher':(0,0,.30),'wheels':(0,0,.26),
              'fan':(0,0,.37)}.get(name,(0,0,.05))
    scale = {'clinic':4.30,'bionics':2.65,'workbench':3.20,'vest':2.40,
             'shoes':2.82,'stride':2.52,'training':2.42,'launcher':3.1,
             'wheels':3.0,'fan':2.5}[name]
    cam=scene.camera
    cam.data.ortho_scale=scale
    cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=os.path.join(OUT,name+'.webp')
    bpy.ops.render.render(write_still=True,scene=scene.name)
    print(name,os.path.getsize(scene.render.filepath),'bytes')
    return scene.render.filepath


def render_all():
    setup_render()
    for name in BUILDERS: render_art(name)
    if previous_scene.name in bpy.data.scenes: bpy.context.window.scene=previous_scene


if __name__=='__main__':
    render_all()
