import {
  CinemaObject,
  Shot,
  SyncPoint,
  Action,
  CameraPath,
  Keyframe,
  ACTION_TYPE_REVERSE,
  createDefaultCinemaProperties,
  createDefaultKeyframe,
} from '@/types/cinema';

// Parse a line of values based on the header format
function parseValues(headerLine: string, valueLine: string): Record<string, string> {
  // Extract field names from header: { Field1:type Field2:type ... }
  const headerMatch = headerLine.match(/\{([^}]+)\}/);
  if (!headerMatch) return {};
  
  const fields = headerMatch[1].trim().split(/\s+/);
  const values: Record<string, string> = {};
  
  // Parse values - handle quoted strings and unquoted values
  const valueStr = valueLine.trim();
  const tokens: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < valueStr.length; i++) {
    const char = valueStr[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if (char === ' ' && !inQuotes) {
      if (current.trim()) {
        tokens.push(current.trim());
      }
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) {
    tokens.push(current.trim());
  }
  
  // Match tokens to fields
  let tokenIndex = 0;
  for (const field of fields) {
    if (tokenIndex >= tokens.length) break;
    
    // Extract field name (before :type)
    const fieldName = field.split(':')[0];
    const fieldType = field.split(':')[1] || '';
    
    // Handle multi-value types
    if (fieldType === 'fff') {
      values[fieldName] = `${tokens[tokenIndex]} ${tokens[tokenIndex + 1] || '0'} ${tokens[tokenIndex + 2] || '0'}`;
      tokenIndex += 3;
    } else if (fieldType === 'ffffff') {
      values[fieldName] = `${tokens[tokenIndex]} ${tokens[tokenIndex + 1] || '0'} ${tokens[tokenIndex + 2] || '0'} ${tokens[tokenIndex + 3] || '0'} ${tokens[tokenIndex + 4] || '0'} ${tokens[tokenIndex + 5] || '0'}`;
      tokenIndex += 6;
    } else if (fieldType === 'dddd') {
      values[fieldName] = `${tokens[tokenIndex]} ${tokens[tokenIndex + 1] || '0'} ${tokens[tokenIndex + 2] || '0'} ${tokens[tokenIndex + 3] || '0'}`;
      tokenIndex += 4;
    } else {
      values[fieldName] = tokens[tokenIndex] || '';
      tokenIndex++;
    }
  }
  
  return values;
}

function parseString(val: string): string {
  return val.replace(/^"|"$/g, '');
}

function parseFloatVal(val: string): number {
  return Number.parseFloat(val) || 0;
}

function parseIntVal(val: string): number {
  return Math.floor(Number.parseFloat(val)) || 0;
}

function parseTriple(val: string): [number, number, number] {
  const parts = val.split(' ').map(v => Number.parseFloat(v) || 0);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

function parseSix(val: string): [number, number, number, number, number, number] {
  const parts = val.split(' ').map(v => Number.parseFloat(v) || 0);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0, parts[3] || 0, parts[4] || 0, parts[5] || 0];
}

function parseQuad(val: string): [number, number, number, number] {
  const parts = val.split(' ').map(v => Math.floor(Number.parseFloat(v)) || 0);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0, parts[3] || 0];
}

// Parse a single cinema section
function parseSingleCinema(lines: string[], startIndex: number): { cinema: CinemaObject, endIndex: number } {
  let i = startIndex;
  
  const cinema: CinemaObject = {
    guid: '',
    objName: '',
    duration: 0,
    properties: createDefaultCinemaProperties(),
    shots: [],
    syncPoints: [],
    actions: [],
    participants: [],
    cameraPaths: [],
  };
  
  while (i < lines.length) {
    const line = lines[i].trim();
    
    // Check if we hit the next cinema section (not the first one we're parsing)
    if (line.startsWith('[ Cinema :') && cinema.guid !== '') {
      return { cinema, endIndex: i };
    }
      
      // Cinema header
      if (line.startsWith('[ Cinema :')) {
        const headerLine = lines[i + 1];
        const valueLine = lines[i + 2];
        const vals = parseValues(headerLine, valueLine);
        
        cinema.guid = parseString(vals['GUID'] || '');
        cinema.objName = parseString(vals['ObjName'] || '');
        cinema.duration = parseFloatVal(vals['Duration'] || '0');
        
        const p = cinema.properties;
        p.doesCameraColl = parseIntVal(vals['DoesCameraColl'] || '1');
        p.doesCameraFade = parseIntVal(vals['DoesCameraFade'] || '1');
        p.lightChannels = parseIntVal(vals['LightChannels'] || '1');
        p.objectFlags = parseIntVal(vals['ObjectFlags'] || '432');
        p.scriptResource = parseString(vals['ScriptResource'] || '');
        p.initialPos = parseTriple(vals['InitialPos'] || '0 0 0');
        p.orientation = parseTriple(vals['Orientation'] || '0 0 0');
        p.localBoundingBox = parseSix(vals['LocalBoundingBox'] || '-1 -1 -1 1 1 1');
        p.objSaveFlag = parseIntVal(vals['ObjSaveFlag'] || '1');
        p.repeatable = parseIntVal(vals['Repeatable'] || '1');
        p.popAtEnd = parseIntVal(vals['PopAtEnd'] || '0');
        p.cinematic = parseIntVal(vals['Cinematic'] || '1');
        p.time = parseFloatVal(vals['Time'] || '0');
        p.initialShot = parseIntVal(vals['InitialShot'] || '0');
        p.bilboInvisible = parseIntVal(vals['BilboInvisible'] || '0');
        p.hasIntroTrans = parseIntVal(vals['HasIntroTrans'] || '0');
        p.hasOutroTrans = parseIntVal(vals['HasOutroTrans'] || '0');
        p.skippable = parseIntVal(vals['Skippable'] || '1');
        p.isDeathCinema = parseIntVal(vals['IsDeathCinema'] || '0');
        p.forceNoWeapon = parseIntVal(vals['ForceNoWeapon'] || '0');
        p.forceUseStick = parseIntVal(vals['ForceUseStick'] || '0');
        p.forceUseSting = parseIntVal(vals['ForceUseSting'] || '0');
        p.letterbox = parseIntVal(vals['Letterbox'] || '1');
        p.disableControl = parseIntVal(vals['DisableControl'] || '0');
        p.bypassQueue = parseIntVal(vals['BypassQueue'] || '0');
        p.lowPriority = parseIntVal(vals['LowPriority'] || '0');
        p.subtitleInBox = parseIntVal(vals['SubtitleInBox'] || '0');
        
        i += 3;
        continue;
      }
      
      // Shot
      const shotMatch = line.match(/\[ Shot(\d+) :/);
      if (shotMatch) {
        const shotIndex = parseIntVal(shotMatch[1]);
        const headerLine = lines[i + 1];
        const valueLine = lines[i + 2];
        const vals = parseValues(headerLine, valueLine);
        
        const prefix = `Shot${shotIndex}\\`;
        const shot: Shot = {
          id: crypto.randomUUID(),
          index: shotIndex,
          name: parseString(vals[`${prefix}Name`] || `Shot ${shotIndex}`),
          nextShot: parseIntVal(vals[`${prefix}NextShot`] || '0'),
          skipShot: parseIntVal(vals[`${prefix}SkipShot`] || '0'),
          maxTime: parseFloatVal(vals[`${prefix}MaxTime`] || '10'),
          time: parseFloatVal(vals[`${prefix}Time`] || '0'),
        };
        cinema.shots.push(shot);
        i += 3;
        continue;
      }
      
      // SyncPoint
      const syncMatch = line.match(/\[ SyncPoint(\d+) :/);
      if (syncMatch) {
        const syncIndex = parseIntVal(syncMatch[1]);
        const headerLine = lines[i + 1];
        const valueLine = lines[i + 2];
        const vals = parseValues(headerLine, valueLine);
        
        const prefix = `SyncPoint${syncIndex}\\`;
        const sp: SyncPoint = {
          id: crypto.randomUUID(),
          index: syncIndex,
          name: parseString(vals[`${prefix}Name`] || `Sync ${syncIndex}`),
          type: parseIntVal(vals[`${prefix}Type`] || '0'),
          action: parseIntVal(vals[`${prefix}Action`] || '0'),
          offset: parseFloatVal(vals[`${prefix}Offset`] || '0'),
          shot: parseIntVal(vals[`${prefix}Shot`] || '0'),
          fromEnd: parseIntVal(vals[`${prefix}FromEnd`] || '1'),
          absoluteTimeStart: parseFloatVal(vals[`${prefix}AbsoluteTimeStart`] || '0'),
        };
        cinema.syncPoints.push(sp);
        i += 3;
        continue;
      }
      
      // Action (not Action-1 or Action-2)
      const actionMatch = line.match(/\[ Action(\d+) :/);
      if (actionMatch) {
        const actionIndex = parseIntVal(actionMatch[1]);
        const headerLine = lines[i + 1];
        const valueLine = lines[i + 2];
        const vals = parseValues(headerLine, valueLine);
        
        const prefix = `Action${actionIndex}\\`;
        const typeNum = parseIntVal(vals[`${prefix}Type`] || '4');
        const actionType = ACTION_TYPE_REVERSE[typeNum] || 'camera';
        
        const baseAction = {
          id: crypto.randomUUID(),
          index: actionIndex,
          name: parseString(vals[`${prefix}Name`] || `Action ${actionIndex}`),
          shot: parseIntVal(vals[`${prefix}Shot`] || '0'),
          offset: parseFloatVal(vals[`${prefix}Offset`] || '0'),
          duration: parseFloatVal(vals[`${prefix}Duration`] || '1'),
          syncPoint: parseIntVal(vals[`${prefix}SyncPoint`] || '0'),
          finishShot: parseIntVal(vals[`${prefix}FinishShot`] || '1'),
          defaultLength: parseFloatVal(vals[`${prefix}DefaultLength`] || '1'),
        };
        
        let action: Action;
        switch (actionType) {
          case 'camera':
            action = {
              ...baseAction,
              type: 'camera',
              typeNum: 4,
              cameraType: parseIntVal(vals[`${prefix}CameraType`] || '0'),
              target: vals[`${prefix}Target`] || '00000000_00000000',
              relative: parseIntVal(vals[`${prefix}Relative`] || '0'),
              startOrient: parseTriple(vals[`${prefix}StartOrient`] || '0 0 0'),
              endOrient: parseTriple(vals[`${prefix}EndOrient`] || '0 0 0'),
              startOffset: parseTriple(vals[`${prefix}StartOffset`] || '0 0 0'),
              endOffset: parseTriple(vals[`${prefix}EndOffset`] || '0 0 0'),
              targetOffset: parseTriple(vals[`${prefix}TargetOffset`] || '0 0 0'),
              startFOV: parseFloatVal(vals[`${prefix}StartFOV`] || '1.256637'),
              endFOV: parseFloatVal(vals[`${prefix}EndFOV`] || '1.256637'),
              transitionPop: parseIntVal(vals[`${prefix}TransitionPop`] || '0'),
              loop: parseIntVal(vals[`${prefix}Loop`] || '0'),
              endSyncPoint: parseIntVal(vals[`${prefix}EndSyncPoint`] || '0'),
            };
            break;
          case 'dialog':
            action = {
              ...baseAction,
              type: 'dialog',
              typeNum: 5,
              speaker: vals[`${prefix}Speaker`] || 'ABCABCAB_CABCABC0',
              sample: parseString(vals[`${prefix}Sample`] || ''),
              forceEnd: parseIntVal(vals[`${prefix}ForceEnd`] || '1'),
              positional: parseIntVal(vals[`${prefix}Positional`] || '0'),
            };
            break;
          case 'pop':
            action = {
              ...baseAction,
              type: 'pop',
              typeNum: 6,
              object: vals[`${prefix}Object`] || 'ABCABCAB_CABCABC0',
              location: vals[`${prefix}Location`] || '00000000_00000000',
              facing: vals[`${prefix}Facing`] || '00000000_00000000',
              setFacing: parseIntVal(vals[`${prefix}SetFacing`] || '1'),
              anim: parseString(vals[`${prefix}Anim`] || ''),
            };
            break;
          case 'fade':
            action = {
              ...baseAction,
              type: 'fade',
              typeNum: 8,
              fxType: parseIntVal(vals[`${prefix}FXType`] || '1'),
              magnitude: parseFloatVal(vals[`${prefix}Magnitude`] || '0.15'),
              frequency: parseFloatVal(vals[`${prefix}Frequency`] || '20'),
              rolling: parseIntVal(vals[`${prefix}Rolling`] || '0'),
              fadeout: parseIntVal(vals[`${prefix}Fadeout`] || '0'),
              color: parseQuad(vals[`${prefix}Color`] || '0 0 0 255'),
              targetVal: parseFloatVal(vals[`${prefix}Target`] || '0'),
            };
            break;
          case 'charAnim':
            action = {
              ...baseAction,
              type: 'charAnim',
              typeNum: 2,
              character: vals[`${prefix}Character`] || '00000000_00000000',
              animName: parseString(vals[`${prefix}AnimName`] || ''),
              length: parseFloatVal(vals[`${prefix}Length`] || '1'),
              animGroup: parseString(vals[`${prefix}AnimGroup`] || ''),
              animatedInPlace: parseIntVal(vals[`${prefix}AnimatedInPlace`] || '1'),
              loops: parseIntVal(vals[`${prefix}Loops`] || '0'),
              animsToPlay: parseIntVal(vals[`${prefix}AnimsToPlay`] || '0'),
            };
            break;
          case 'objAnim':
            action = {
              ...baseAction,
              type: 'objAnim',
              typeNum: 9,
              object: vals[`${prefix}Object`] || '00000000_00000000',
              animName: parseString(vals[`${prefix}AnimName`] || ''),
              startAnimating: parseIntVal(vals[`${prefix}StartAnimating`] || '1'),
              looping: parseIntVal(vals[`${prefix}Looping`] || '0'),
              hideWhenDone: parseIntVal(vals[`${prefix}HideWhenDone`] || '1'),
              setToEndOnSkip: parseIntVal(vals[`${prefix}SetToEndOnSkip`] || '1'),
            };
            break;
          case 'trigger':
            action = {
              ...baseAction,
              type: 'trigger',
              typeNum: 10,
              triggerName: parseString(vals[`${prefix}TriggerName`] || ''),
            };
            break;
          default:
            action = {
              ...baseAction,
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
        }
        cinema.actions.push(action);
        i += 3;
        continue;
      }
      
      // Participants
      if (line.startsWith('[ Participants :')) {
        i += 2; // Skip header
        while (i < lines.length) {
          const pLine = lines[i].trim();
          if (pLine.startsWith('[') || pLine === '') {
            break;
          }
          const guid = pLine.trim();
          if (guid && !guid.startsWith('{')) {
            cinema.participants.push(guid);
          }
          i++;
        }
        continue;
      }
      
      // CameraPath
      if (line.startsWith('[ CameraPath :')) {
        const headerLine = lines[i + 1];
        const valueLine = lines[i + 2];
        const vals = parseValues(headerLine, valueLine);
        
        const cp: CameraPath = {
          id: crypto.randomUUID(),
          guid: parseString(vals['GUID'] || ''),
          pos: parseTriple(vals['Pos'] || '0 0 0'),
          orient: parseTriple(vals['Orient'] || '0 0 0'),
          scale: parseTriple(vals['Scale'] || '1 1 1'),
          bBox: parseSix(vals['BBox'] || '0 0 0 0 0 0'),
          loops: parseIntVal(vals['Loops'] || '1'),
          range: parseTriple(vals['Range'] || '0 0 0'),
          min: parseTriple(vals['Min'] || '0 0 0'),
          playSpeed: parseFloatVal(vals['PlaySpeed'] || '1'),
          camPosOffset: parseTriple(vals['CamPosOffset'] || '0 0 0'),
          camRotOffset: parseTriple(vals['CamRotOffset'] || '0 0 0'),
          lookatGuid: vals['LookatGuid'] || 'ABCABCAB_CABCABC0',
          lookatOffset: parseTriple(vals['LookatOffset'] || '0 0 0'),
          fromCenter: parseIntVal(vals['FromCenter'] || '0'),
          interpolate: parseIntVal(vals['Interpolate'] || '1'),
          lookspring: parseIntVal(vals['Lookspring'] || '0'),
          keyframes: [],
        };
        
        i += 3;
        
        // Check for Keyframes
        if (i < lines.length && lines[i].trim().startsWith('[ Keyframes :')) {
          i += 2; // Skip header line
          while (i < lines.length) {
            const kfLine = lines[i].trim();
            if (kfLine.startsWith('[') || kfLine === '') {
              break;
            }
            if (!kfLine.startsWith('{')) {
              const parts = kfLine.split(/\s+/).map(v => parseIntVal(v));
              const kf: Keyframe = {
                posX: parts[0] || 0,
                posY: parts[1] || 0,
                posZ: parts[2] || 0,
                oriX: parts[3] || 0,
                oriY: parts[4] || 0,
                oriZ: parts[5] || 0,
                oriW: parts[6] || 0,
              };
              cp.keyframes.push(kf);
            }
            i++;
          }
        }
        
        if (cp.keyframes.length === 0) {
          cp.keyframes.push(createDefaultKeyframe());
        }
        
        cinema.cameraPaths.push(cp);
        continue;
      }
      
      i++;
    }
    
    return { cinema, endIndex: i };
}

// Parse a file containing one or more cinemas
export function parseCinemaFile(content: string): CinemaObject[] {
  try {
    const lines = content.split('\n');
    const cinemas: CinemaObject[] = [];
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i].trim();
      
      // Skip comment lines and empty lines
      if (line.startsWith('//') || line === '') {
        i++;
        continue;
      }
      
      // Found a cinema section
      if (line.startsWith('[ Cinema :')) {
        const result = parseSingleCinema(lines, i);
        cinemas.push(result.cinema);
        i = result.endIndex;
      } else {
        i++;
      }
    }
    
    return cinemas;
  } catch (error) {
    console.error('Error parsing cinema file:', error);
    return [];
  }
}
