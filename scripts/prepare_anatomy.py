#!/usr/bin/env python3
"""Extract/merge BodyParts3D anatomical meshes from the pinned BodyExplorer GLBs.
No external Python packages. Re-run with the three upstream files in the input directory.
Derived assets retain CC BY-SA 2.1 Japan. See public/models/ATTRIBUTION.md.
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
mapping={m['name']:m for m in json.loads((INPUT/'mesh_mapping.json').read_text())}
groups=defaultdict(lambda:{'positions':[],'normals':[],'indices':[],'sourceNames':[],'sourceMappings':[]})
counts={'bones':0,'muscles':0}
for kind in ['skeleton','anatomy']:
 d,b=read_glb(kind)
 for m in d['meshes']:
  name=m['name'];mid=muscle_id(name) if kind=='anatomy' else None
  if kind=='anatomy' and not mid:continue
  if name=='hyoid bone (2)':continue # duplicate identical source structure
  if kind=='anatomy':assert mapping[name]['source']=='bp3d','Review license for new source'
  side='left' if 'left' in name else 'right'
  key=bone_group(name) if kind=='skeleton' else side+'_'+mid
  g=groups[key];g['type']='bone' if kind=='skeleton' else 'muscle';g['rigId']=key if kind=='skeleton' else None;g['muscleId']=mid;g['side']=side if kind=='anatomy' else None
  p=m['primitives'][0];pos=accessor(d,b,p['attributes']['POSITION']);norms=accessor(d,b,p['attributes']['NORMAL']);idx=accessor(d,b,p['indices']);start=len(g['positions'])
  for v in pos:
   # Curl the articulated finger surfaces into a fixed grip pose before skinning.
   if kind=='skeleton' and key.endswith('Hand') and ('finger' in name or 'thumb' in name):
    depth=max(0,750-v[2]);theta=min(3.25,depth/32);v=[v[0],v[1]+32*(1-math.cos(theta)),750-32*math.sin(theta)] if depth else v
   g['positions'].append(transform(v))
  g['normals'].extend(normal(n) for n in norms);g['indices'].extend(i+start for i in idx);g['sourceNames'].append(name)
  if kind=='anatomy':g['sourceMappings'].append(mapping[name])
  counts['bones' if kind=='skeleton' else 'muscles']+=1
out={'asset':{'version':'2.0','generator':'LiftLab anatomical extraction; BodyParts3D via BodyExplorer','copyright':'BodyParts3D © The Database Center for Life Science. CC BY-SA 2.1 Japan.'},'scene':0,'scenes':[{'nodes':[]}],'nodes':[],'meshes':[],'accessors':[],'bufferViews':[],'buffers':[{'byteLength':0}]}
binary=bytearray()
def emit(values,fmt,size,typ,target):
 while len(binary)%4:binary.append(0)
 offset=len(binary);flat=[x for v in values for x in v] if size>1 else values;binary.extend(struct.pack('<'+fmt*len(flat),*flat));view=len(out['bufferViews']);out['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':len(binary)-offset,'target':target});acc={'bufferView':view,'componentType':5126 if fmt=='f' else 5125,'count':len(values),'type':typ}
 if typ=='VEC3':acc['min']=[min(v[i] for v in values) for i in range(3)];acc['max']=[max(v[i] for v in values) for i in range(3)]
 index=len(out['accessors']);out['accessors'].append(acc);return index
manifest={'sourceRepository':'https://github.com/JohanBellander/BodyExplorer','commit':'7d04bf3c4de2bd9cb234dd51d7e6857c099afafd','upstreamBlobSha1':EXPECTED,'license':'CC BY-SA 2.1 Japan','counts':counts,'groups':[],'transformation':{'scale':SCALE,'sourceShoulderMm':[160,-75,1310],'targetShoulderM':[.21,.145,-.52],'notes':'Nonuniform fit to generic engine proportions; rigid bone groups, modeled soft tissue skinning; fixed curled grip; duplicate hyoid removed.'}}
for key,g in groups.items():
 attrs={'POSITION':emit(g['positions'],'f',3,'VEC3',34962),'NORMAL':emit(g['normals'],'f',3,'VEC3',34962)};indices=emit(g['indices'],'I',1,'SCALAR',34963)
 meta={k:v for k,v in g.items() if k not in ['positions','normals','indices']};meta['sourceVertexCount']=len(g['positions']);meta['triangleCount']=len(g['indices'])//3
 mesh=len(out['meshes']);out['meshes'].append({'name':key,'primitives':[{'attributes':attrs,'indices':indices}]});out['nodes'].append({'name':key,'mesh':mesh,'extras':meta});out['scenes'][0]['nodes'].append(mesh);manifest['groups'].append({'name':key,**meta})
out['buffers'][0]['byteLength']=len(binary);encoded=json.dumps(out,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4);binary+=b'\0'*((-len(binary))%4)
asset=struct.pack('<III',0x46546c67,2,28+len(encoded)+len(binary))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(binary),0x004e4942)+binary
(ROOT/'public/models/liftlab-anatomy.glb').write_bytes(asset);(ROOT/'public/models/manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print('Created',len(asset),'bytes;',counts,'in',len(groups),'render groups')
