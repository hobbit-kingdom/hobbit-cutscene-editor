export interface Shot {
  id: string;
  index: number;
  name: string;
  nextShot: number;
  skipShot: number;
  maxTime: number;
  time: number;
}

export interface SyncPoint {
  id: string;
  index: number;
  name: string;
  type: number;
  action: number;
  offset: number;
  shot: number;
  fromEnd: number;
  absoluteTimeStart: number;
}

export type ActionType = 
  | 'camera'      // Type 4
  | 'dialog'      // Type 5
  | 'pop'         // Type 6
  | 'fade'        // Type 8
  | 'charAnim'    // Type 2
  | 'objAnim'     // Type 9
  | 'trigger';    // Type 10

export const ACTION_TYPE_MAP: Record<ActionType, number> = {
  charAnim: 2,
  camera: 4,
  dialog: 5,
  pop: 6,
  fade: 8,
  objAnim: 9,
  trigger: 10,
};

export const ACTION_TYPE_REVERSE: Record<number, ActionType> = {
  2: 'charAnim',
  4: 'camera',
  5: 'dialog',
  6: 'pop',
  8: 'fade',
  9: 'objAnim',
  10: 'trigger',
};

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  charAnim: 'Character Animation',
  camera: 'Camera',
  dialog: 'Dialog',
  pop: 'Pop/Teleport',
  fade: 'Fade',
  objAnim: 'Object Animation',
  trigger: 'Trigger',
};

// Base action interface
export interface BaseAction {
  id: string;
  index: number;
  name: string;
  type: ActionType;
  typeNum: number;
  shot: number;
  offset: number;
  duration: number;
  syncPoint: number;
  finishShot: number;
  defaultLength: number;
}

// Camera Action (Type 4)
export interface CameraAction extends BaseAction {
  type: 'camera';
  typeNum: 4;
  cameraType: number;
  target: string;
  relative: number;
  startOrient: [number, number, number];
  endOrient: [number, number, number];
  startOffset: [number, number, number];
  endOffset: [number, number, number];
  targetOffset: [number, number, number];
  startFOV: number;
  endFOV: number;
  transitionPop: number;
  loop: number;
  endSyncPoint: number;
}

// Dialog Action (Type 5)
export interface DialogAction extends BaseAction {
  type: 'dialog';
  typeNum: 5;
  speaker: string;
  sample: string;
  forceEnd: number;
  positional: number;
}

// Pop/Teleport Action (Type 6)
export interface PopAction extends BaseAction {
  type: 'pop';
  typeNum: 6;
  object: string;
  location: string;
  facing: string;
  setFacing: number;
  anim: string;
}

// Fade Action (Type 8)
export interface FadeAction extends BaseAction {
  type: 'fade';
  typeNum: 8;
  fxType: number;
  magnitude: number;
  frequency: number;
  rolling: number;
  fadeout: number;
  color: [number, number, number, number];
  targetVal: number;
}

// Character Animation Action (Type 2)
export interface CharAnimAction extends BaseAction {
  type: 'charAnim';
  typeNum: 2;
  character: string;
  animName: string;
  length: number;
  animGroup: string;
  animatedInPlace: number;
  loops: number;
  animsToPlay: number;
}

// Object Animation Action (Type 9)
export interface ObjAnimAction extends BaseAction {
  type: 'objAnim';
  typeNum: 9;
  object: string;
  animName: string;
  startAnimating: number;
  looping: number;
  hideWhenDone: number;
  setToEndOnSkip: number;
}

// Trigger Action (Type 10)
export interface TriggerAction extends BaseAction {
  type: 'trigger';
  typeNum: 10;
  triggerName: string;
}

export type Action = CameraAction | DialogAction | PopAction | FadeAction | CharAnimAction | ObjAnimAction | TriggerAction;

export interface Keyframe {
  posX: number;
  posY: number;
  posZ: number;
  oriX: number;
  oriY: number;
  oriZ: number;
  oriW: number;
}

export interface CameraPath {
  id: string;
  guid: string;
  pos: [number, number, number];
  orient: [number, number, number];
  scale: [number, number, number];
  bBox: [number, number, number, number, number, number];
  loops: number;
  range: [number, number, number];
  min: [number, number, number];
  playSpeed: number;
  camPosOffset: [number, number, number];
  camRotOffset: [number, number, number];
  lookatGuid: string;
  lookatOffset: [number, number, number];
  fromCenter: number;
  interpolate: number;
  lookspring: number;
  keyframes: Keyframe[];
}

export interface CinemaProperties {
  doesCameraColl: number;
  doesCameraFade: number;
  lightChannels: number;
  objectFlags: number;
  scriptResource: string;
  initialPos: [number, number, number];
  orientation: [number, number, number];
  localBoundingBox: [number, number, number, number, number, number];
  objSaveFlag: number;
  repeatable: number;
  popAtEnd: number;
  cinematic: number;
  time: number;
  initialShot: number;
  bilboInvisible: number;
  hasIntroTrans: number;
  hasOutroTrans: number;
  skippable: number;
  isDeathCinema: number;
  forceNoWeapon: number;
  forceUseStick: number;
  forceUseSting: number;
  letterbox: number;
  disableControl: number;
  bypassQueue: number;
  lowPriority: number;
  subtitleInBox: number;
}

export interface CinemaObject {
  guid: string;
  objName: string;
  duration: number;
  properties: CinemaProperties;
  shots: Shot[];
  syncPoints: SyncPoint[];
  actions: Action[];
  participants: string[];
  cameraPaths: CameraPath[];
}

// Default factories
export function createDefaultShot(index: number): Shot {
  return {
    id: crypto.randomUUID(),
    index,
    name: `Shot ${index}`,
    nextShot: index + 1,
    skipShot: index + 1,
    maxTime: 10.0,
    time: 0.0,
  };
}

export function createDefaultSyncPoint(index: number, shot: number): SyncPoint {
  return {
    id: crypto.randomUUID(),
    index,
    name: `Shot ${shot}, Sync ${index}`,
    type: index === 0 ? 0 : 1, // SyncPoint 0 has type 0, all others type 1
    action: 0,
    offset: 0.0,
    shot,
    fromEnd: 1,
    absoluteTimeStart: 0.0,
  };
}

export function createDefaultAction(type: ActionType, index: number): Action {
  const base = {
    id: crypto.randomUUID(),
    index,
    name: `Action ${index}`,
    shot: 0,
    offset: 0.0,
    duration: 1.0,
    syncPoint: 0,
    finishShot: 1,
    defaultLength: 1.0,
  };

  switch (type) {
    case 'camera':
      return {
        ...base,
        type: 'camera',
        typeNum: 4,
        cameraType: 0,
        target: '00000000_00000000',
        relative: 0,
        startOrient: [0, 0, 0],
        endOrient: [0, 0, 0],
        startOffset: [0, 0, 0],
        endOffset: [0, 0, 0],
        targetOffset: [0, 0, 0],
        startFOV: 1.256637,
        endFOV: 1.256637,
        transitionPop: 0,
        loop: 0,
        endSyncPoint: 0,
      };
    case 'dialog':
      return {
        ...base,
        type: 'dialog',
        typeNum: 5,
        speaker: 'ABCABCAB_CABCABC0',
        sample: 'Dialog text here',
        forceEnd: 1,
        positional: 0,
      };
    case 'pop':
      return {
        ...base,
        type: 'pop',
        typeNum: 6,
        object: 'ABCABCAB_CABCABC0',
        location: '00000000_00000000',
        facing: '00000000_00000000',
        setFacing: 1,
        anim: '',
      };
    case 'fade':
      return {
        ...base,
        type: 'fade',
        typeNum: 8,
        fxType: 1,
        magnitude: 0.15,
        frequency: 20.0,
        rolling: 0,
        fadeout: 0,
        color: [0, 0, 0, 255],
        targetVal: 0.0,
      };
    case 'charAnim':
      return {
        ...base,
        type: 'charAnim',
        typeNum: 2,
        character: '00000000_00000000',
        animName: 'AnimName',
        length: 1.0,
        animGroup: 'anim_group.anim',
        animatedInPlace: 1,
        loops: 0,
        animsToPlay: 0,
      };
    case 'objAnim':
      return {
        ...base,
        type: 'objAnim',
        typeNum: 9,
        object: '00000000_00000000',
        animName: '',
        startAnimating: 1,
        looping: 0,
        hideWhenDone: 1,
        setToEndOnSkip: 1,
      };
    case 'trigger':
      return {
        ...base,
        type: 'trigger',
        typeNum: 10,
        triggerName: 'TriggerName',
      };
  }
}

export function createDefaultCinemaProperties(): CinemaProperties {
  return {
    doesCameraColl: 1,
    doesCameraFade: 1,
    lightChannels: 1,
    objectFlags: 432,
    scriptResource: '',
    initialPos: [0, 0, 0],
    orientation: [0, 0, 0],
    localBoundingBox: [-1, -1, -1, 1, 1, 1],
    objSaveFlag: 1,
    repeatable: 1,
    popAtEnd: 0,
    cinematic: 1,
    time: 0,
    initialShot: 0,
    bilboInvisible: 0,
    hasIntroTrans: 0,
    hasOutroTrans: 0,
    skippable: 1,
    isDeathCinema: 0,
    forceNoWeapon: 0,
    forceUseStick: 0,
    forceUseSting: 0,
    letterbox: 1,
    disableControl: 0,
    bypassQueue: 0,
    lowPriority: 0,
    subtitleInBox: 0,
  };
}

export function createDefaultKeyframe(): Keyframe {
  return {
    posX: 0,
    posY: 0,
    posZ: 0,
    oriX: 0,
    oriY: 0,
    oriZ: 0,
    oriW: 0,
  };
}

export function createDefaultCameraPath(guidSuffix: string): CameraPath {
  return {
    id: crypto.randomUUID(),
    guid: `CA3DDD8F_${guidSuffix}`,
    pos: [0, 0, 0],
    orient: [0, 0, 0],
    scale: [1, 1, 1],
    bBox: [0, 0, 0, 0, 0, 0],
    loops: 1,
    range: [0, 0, 0],
    min: [0, 0, 0],
    playSpeed: 1.0,
    camPosOffset: [0, 0, 0],
    camRotOffset: [0, 0, 0],
    lookatGuid: 'ABCABCAB_CABCABC0',
    lookatOffset: [0, 0, 0],
    fromCenter: 0,
    interpolate: 1,
    lookspring: 0,
    keyframes: [createDefaultKeyframe()],
  };
}

export function createDefaultCinema(): CinemaObject {
  const shot0 = createDefaultShot(0);
  const syncPoint0 = createDefaultSyncPoint(0, 0);
  
  return {
    guid: 'CA3DDD8F_11110000',
    objName: 'New Cinema',
    duration: 5.0,
    properties: createDefaultCinemaProperties(),
    shots: [shot0],
    syncPoints: [syncPoint0],
    actions: [],
    participants: ['ABCABCAB_CABCABC0'],
    cameraPaths: [],
  };
}
