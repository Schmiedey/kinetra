#!/usr/bin/env python3
"""Extract/merge BodyParts3D anatomical meshes from the pinned BodyExplorer GLBs.
No external Python packages. Re-run with the three upstream files in the input directory.
Component licenses are retained. See public/models/ATTRIBUTION.md.
"""
import json, struct, pathlib, math, sys, hashlib
from collections import defaultdict
ROOT=pathlib.Path(__file__).resolve().parents[1]
INPUT=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/liftlab-anatomy')
EXPECTED={'skeleton':'46e5ccc6f02e26727246aa78106dedb6f6d65da3','anatomy':'a112885444785a9dd93c5753b46ac790e6e036b3'}
SCALE=(.21/160,.001,.52/480)
def transform(p):return [p[0]*SCALE[0],-(p[1]+75)*SCALE[1]+.145,-(p[2]-1310)*SCALE[2]-.52]
def normal(p):
 v=[p[0]/SCALE[0],-p[1]/SCALE[1],-p[2]/SCALE[2]];n=math.sqrt(sum(x*x for x in v)) or 1
 return [x/n for x in v]
def read_glb(name):
 b=(INPUT/(name+'.glb')).read_bytes()
 assert hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()==EXPECTED[name], 'Upstream asset changed: review before updating pinned provenance.'
 n=struct.unpack_from('<I',b,12)[0];d=json.loads(b[20:20+n]);return d,b[28+n:]
def accessor(d,b,i):
 a=d['accessors'][i];v=d['bufferViews'][a['bufferView']];off=v.get('byteOffset',0)+a.get('byteOffset',0);fmt={5123:'H',5125:'I',5126:'f'}[a['componentType']];size={'SCALAR':1,'VEC3':3}[a['type']]
 stride=v.get('byteStride',struct.calcsize(fmt)*size)
 if stride!=struct.calcsize(fmt)*size:
  rows=[list(struct.unpack_from('<'+fmt*size,b,off+i*stride)) for i in range(a['count'])]
  return rows if size>1 else [r[0] for r in rows]
 values=struct.unpack_from('<'+fmt*a['count']*size,b,off)
 return [list(values[i:i+size]) for i in range(0,len(values),size)] if size>1 else list(values)
def bone_group(name):
 side='left' if 'left' in name else 'right' if 'right' in name else None
 if not side:return 'torso'
 if 'humerus' in name:return side+'UpperArm'
 if 'radius' in name or 'ulna' in name:return side+'Forearm'
 if any(x in name for x in ['finger','thumb','metacarpal','capitate','hamate','lunate','pisiform','scaphoid','trapezium','trapezoid']):return side+'Hand'
 if 'femur' in name or 'patella' in name:return side+'Thigh'
 if 'tibia' in name or 'fibula' in name:return side+'Shin'
 if any(x in name for x in ['foot','toe','metatarsal','calcaneus','cuboid','cuneiform','talus']):return side+'Foot'
 return 'torso'
def muscle_id(name):
 if 'pectoralis major' in name:return 'pecClavicular' if 'clavicular' in name else 'pecSternal'
 if 'clavicular part' in name and 'deltoid' in name:return 'anteriorDelt'
 if 'triceps brachii' in name:return 'triceps'
 return None
def skip_anatomy(name):
 if any(x in name for x in ['sphincter','diaphragm','interosseous membrane','retinaculum','cartilage','crico','thyro-arytenoid','arytenoid','tendinous arch','long plantar ligament','median cricothyroid']):
  return True
 if any(x in name for x in ['inferior rectus','lateral rectus','medial rectus','superior rectus','inferior oblique','superior oblique','levator palpebrae','levator veli','tensor veli']):
  return True
 if any(x in name for x in ['lumbrical','plantar interosseous','dorsal interossei','palmar interossei','levatores costarum','intertransversarii','interspinales','interspinalis']):
  return True
 if 'fascia' in name or name.endswith('tendon') or 'calcaneal tendon' in name:
  return True
 return False
def movement_id(name):
 if skip_anatomy(name):return None
 mid=muscle_id(name)
 if mid:return {'pecClavicular':'chest','pecSternal':'chest','anteriorDelt':'frontDelts','triceps':'triceps'}[mid]
 for text,group in [
  ('acromial part','sideDelts'),('spinal part','rearDelts'),('trapezius','upperBack'),('latissimus','lats'),
  ('biceps brachii','biceps'),('gluteus','glutes'),('vastus','quads'),('rectus femoris','quads'),
  ('biceps femoris','hamstrings'),('semitendinosus','hamstrings'),('semimembranosus','hamstrings'),
  ('gastrocnemius','calves'),('soleus','calves'),('rectus abdominis','core'),('external oblique','core'),
  ('internal oblique','core'),('transversus abdominis','core'),('quadratus lumborum','core'),
  ('serratus anterior','chest'),('pectoralis minor','chest'),
  ('rhomboid','upperBack'),('infraspinatus','rearDelts'),('teres minor','rearDelts'),
  ('teres major','lats'),('supraspinatus','sideDelts'),('subscapularis','chest'),
  ('sternocleidomastoid','neck'),('platysma','neck'),('scalenus','neck'),('splenius','neck'),
  ('longus capitis','neck'),('longus colli','neck'),('levator scapulae','neck'),
  ('semispinalis capitis','neck'),('longissimus capitis','neck'),
  ('brachioradialis','forearms'),('flexor carpi','forearms'),('extensor carpi','forearms'),
  ('extensor digitorum','forearms'),('flexor digitorum profundus','forearms'),
  ('flexor digitorum superficialis','forearms'),('pronator','forearms'),('supinator','forearms'),
  ('palmaris','forearms'),('flexor pollicis longus','forearms'),('extensor pollicis','forearms'),
  ('abductor pollicis longus','forearms'),('extensor indicis','forearms'),('extensor digiti minimi','forearms'),
  ('anconeus','triceps'),('brachialis','biceps'),('coracobrachialis','frontDelts'),
  ('adductor brevis','adductors'),('adductor longus','adductors'),('adductor magnus','adductors'),
  ('adductor minimus','adductors'),('gracilis','adductors'),('pectineus','adductors'),
  ('tibialis','calves'),('fibularis','calves'),('popliteus','hamstrings'),
  ('sartorius','quads'),('tensor fasciae','quads'),('iliotibial','quads'),
  ('iliacus','glutes'),('psoas','core'),
  ('masseter','face'),('temporalis','face'),('pterygoid','face'),('frontalis','face'),
  ('orbicularis','face'),('zygomaticus','face'),('levator labii','face'),('depressor','face'),
  ('mentalis','face'),('risorius','face'),('nasalis','face'),('procerus','face'),('corrugator','face'),
  ('abductor pollicis brevis','hands'),('opponens pollicis','hands'),('flexor pollicis brevis','hands'),
  ('adductor pollicis','hands'),('abductor digiti minimi of left hand','hands'),
  ('abductor digiti minimi of right hand','hands'),('flexor digiti minimi brevis of left hand','hands'),
  ('flexor digiti minimi brevis of right hand','hands'),('opponens digiti minimi of left hand','hands'),
  ('opponens digiti minimi of right hand','hands'),
  ('abductor hallucis','feet'),('flexor digitorum brevis','feet'),('abductor digiti minimi of left foot','feet'),
  ('abductor digiti minimi of right foot','feet'),
  ('multifidus','core'),('iliocostalis','core'),('longissimus thoracis','core'),('spinalis','core')
 ]:
  if text in name:return group
 return None
def add(a,b):return [a[i]+b[i] for i in range(3)]
def sub(a,b):return [a[i]-b[i] for i in range(3)]
def mul(a,k):return [x*k for x in a]
def dot(a,b):return sum(a[i]*b[i] for i in range(3))
def cross(a,b):return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
def unit(a):return mul(a,1/(math.sqrt(dot(a,a)) or 1))
def mean(rows):return [sum(p[i] for p in rows)/len(rows) for i in range(3)]
def hand_local(p,side):return [-(p[0]-side*253)*.001,(805-p[2])*.001,-(p[1]+118)*.001]
def endpoints(pos):
 low=min(p[1] for p in pos);high=max(p[1] for p in pos);band=(high-low)*.16
 return mean([p for p in pos if p[1]<=low+band]),mean([p for p in pos if p[1]>=high-band])
def rigid_bone(pos,start,end,target,direction):
 # Rodrigues rotation preserves the surface and all distances within a phalanx.
 a=unit(sub(end,start));b=unit(direction);v=cross(a,b);c=dot(a,b)
 def rotate(p):
  q=sub(p,start);return add(target,add(add(mul(q,c),cross(v,q)),mul(v,dot(v,q)/(1+c))))
 return [rotate(p) for p in pos]
def make_grips(d,b):
 result={};landmarks=[]
 for side,label in [(1,'left'),(-1,'right')]:
  wrist=transform([side*253,-118,805])
  for finger in ['index finger','middle finger','ring finger','little finger','thumb']:
   target=None
   for j,part in enumerate(['proximal','middle','distal'] if finger!='thumb' else ['proximal','distal']):
    name=f'{part} phalanx of {label} {finger}'
    mesh=next(m for m in d['meshes'] if m['name']==name)
    local=[hand_local(p,side) for p in accessor(d,b,mesh['primitives'][0]['attributes']['POSITION'])]
    start,end=endpoints(local)
    if target is None:target=start
    direction=([side*.88,.4,.25] if j==0 else [side*.86,-.25,-.44]) if finger=='thumb' else [[0,-.35,.94],[0,-.96,-.28],[0,-.24,-.97]][j]
    posed=rigid_bone(local,start,end,target,direction)
    result[name]=[add(p,wrist) for p in posed]
    length=math.sqrt(dot(sub(end,start),sub(end,start)))
    next_target=add(target,mul(unit(direction),length))
    landmarks.append({'name':name,'start':target,'end':next_target,'lengthM':length})
    target=next_target
 return result,landmarks
mapping={m['name']:m for m in json.loads((INPUT/'mesh_mapping.json').read_text())}
groups=defaultdict(lambda:{'positions':[],'normals':[],'indices':[],'sourceNames':[],'sourceMappings':[]})
counts={'bones':0,'muscles':0}
for kind in ['skeleton','anatomy']:
 d,b=read_glb(kind)
 if kind=='skeleton':grips,grip_landmarks=make_grips(d,b)
 for m in d['meshes']:
  name=m['name'];mid=muscle_id(name) if kind=='anatomy' else None;mgid=movement_id(name) if kind=='anatomy' else None
  if kind=='anatomy' and (skip_anatomy(name) or not mgid):continue
  if name=='hyoid bone (2)':continue # duplicate identical source structure
  if kind=='anatomy':assert mapping[name]['source'] in ['bp3d','z-anatomy'],'Review license for new source'
  side='left' if 'left' in name else 'right'
  key=bone_group(name) if kind=='skeleton' else side+'_'+(mid or mgid)
  g=groups[key];g['type']='bone' if kind=='skeleton' else 'muscle';g['rigId']=key if kind=='skeleton' else None
  if mid is not None or 'muscleId' not in g:g['muscleId']=mid
  g['side']=side if kind=='anatomy' else None
  if mgid is not None or 'movementGroup' not in g:g['movementGroup']=mgid
  p=m['primitives'][0];pos=accessor(d,b,p['attributes']['POSITION']);norms=accessor(d,b,p['attributes']['NORMAL']);idx=accessor(d,b,p['indices']);start=len(g['positions'])
  if name in grips:g['positions'].extend(grips[name])
  elif kind=='skeleton' and key.endswith('Hand'):
   wrist=transform([(1 if side=='left' else -1)*253,-118,805])
   g['positions'].extend(add(wrist,hand_local(v,1 if side=='left' else -1)) for v in pos)
  else:g['positions'].extend(transform(v) for v in pos)
  g['normals'].extend(normal(n) for n in norms);g['indices'].extend(i+start for i in idx);g['sourceNames'].append(name)
  if kind=='anatomy':g['sourceMappings'].append(mapping[name])
  counts['bones' if kind=='skeleton' else 'muscles']+=1
out={'asset':{'version':'2.0','generator':'LiftLab anatomical extraction; BodyParts3D and Z-Anatomy via BodyExplorer','copyright':'BodyParts3D © The Database Center for Life Science, CC BY-SA 2.1 Japan. Z-Anatomy supplementary muscles, CC BY-SA 4.0. See ATTRIBUTION.md and manifest component licenses.'},'scene':0,'scenes':[{'nodes':[]}],'nodes':[],'meshes':[],'accessors':[],'bufferViews':[],'buffers':[{'byteLength':0}]}
binary=bytearray()
def emit(values,fmt,size,typ,target):
 while len(binary)%4:binary.append(0)
 offset=len(binary);flat=[x for v in values for x in v] if size>1 else values;binary.extend(struct.pack('<'+fmt*len(flat),*flat));view=len(out['bufferViews']);out['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':len(binary)-offset,'target':target});acc={'bufferView':view,'componentType':5126 if fmt=='f' else 5125,'count':len(values),'type':typ}
 if typ=='VEC3':acc['min']=[min(v[i] for v in values) for i in range(3)];acc['max']=[max(v[i] for v in values) for i in range(3)]
 index=len(out['accessors']);out['accessors'].append(acc);return index
manifest={'sourceRepository':'https://github.com/JohanBellander/BodyExplorer','commit':'7d04bf3c4de2bd9cb234dd51d7e6857c099afafd','upstreamBlobSha1':EXPECTED,'license':'Per-component: CC BY-SA 2.1 Japan (bp3d); CC BY-SA 4.0 (z-anatomy)','counts':counts,'groups':[],'transformation':{'scale':SCALE,'sourceShoulderMm':[160,-75,1310],'targetShoulderM':[.21,.145,-.52],'notes':'Nonuniform body fit to generic proportions; rigid per-phalanx finger poses without vertex warping; canonical closed grip; rigid bone groups and modeled soft tissue skinning; duplicate hyoid removed.'}}
manifest['componentLicenses']={'bp3d':'CC BY-SA 2.1 Japan','z-anatomy':'CC BY-SA 4.0'}
manifest['handGrip']={'center':[0,.055,.030],'method':'Rigid per-phalanx joint rotations; opposed thumbs; canonical grip frame aligned to the handle axis','joints':grip_landmarks}
for key,g in groups.items():
 attrs={'POSITION':emit(g['positions'],'f',3,'VEC3',34962),'NORMAL':emit(g['normals'],'f',3,'VEC3',34962)};indices=emit(g['indices'],'I',1,'SCALAR',34963)
 meta={k:v for k,v in g.items() if k not in ['positions','normals','indices']};meta['sourceVertexCount']=len(g['positions']);meta['triangleCount']=len(g['indices'])//3
 mesh=len(out['meshes']);out['meshes'].append({'name':key,'primitives':[{'attributes':attrs,'indices':indices}]});out['nodes'].append({'name':key,'mesh':mesh,'extras':meta});out['scenes'][0]['nodes'].append(mesh);manifest['groups'].append({'name':key,**meta})
out['buffers'][0]['byteLength']=len(binary);encoded=json.dumps(out,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4);binary+=b'\0'*((-len(binary))%4)
asset=struct.pack('<III',0x46546c67,2,28+len(encoded)+len(binary))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(binary),0x004e4942)+binary
(ROOT/'public/models/liftlab-anatomy.glb').write_bytes(asset);(ROOT/'public/models/manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print('Created',len(asset),'bytes;',counts,'in',len(groups),'render groups')
