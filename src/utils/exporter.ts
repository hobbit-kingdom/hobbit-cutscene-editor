import { 
  CinemaObject, 
  Action,
  CameraAction,
  DialogAction,
  PopAction,
  FadeAction,
  CharAnimAction,
  ObjAnimAction,
  TriggerAction,
  CameraPath
} from '@/types/cinema';

// :f = float - always show decimal point
function formatFloat(n: number, minWidth: number = 0): string {
  const str = n.toString();
  let result: string;
  if (str.includes('.')) {
    const fixed = n.toFixed(6);
    result = fixed.replace(/(\.\d*?)0+$/, '$1');
    if (result.endsWith('.')) result += '00';
    else if (result.match(/\.\d$/)) result += '0';
  } else {
    result = n.toFixed(6);
  }
  return minWidth > 0 ? result.padEnd(minWidth) : result;
}

// :fff = three floats space separated
function formatTripleFloat(arr: [number, number, number]): string {
  return arr.map(n => formatFloat(n)).join(' ');
}

// :ffffff = six floats space separated
function formatSixFloat(arr: [number, number, number, number, number, number]): string {
  return arr.map(n => formatFloat(n)).join(' ');
}

// :dddd = four integers space separated
function formatQuadInt(arr: [number, number, number, number]): string {
  return arr.map(n => Math.floor(n).toString()).join(' ');
}

// :d = integer
function formatInt(n: number, minWidth: number = 0): string {
  const result = Math.floor(n).toString();
  return minWidth > 0 ? result.padEnd(minWidth) : result;
}

// :s = string (quoted)
function formatString(s: string, minWidth: number = 0): string {
  const result = `"${s}"`;
  return minWidth > 0 ? result.padEnd(minWidth) : result;
}

// :g = GUID (unquoted)
function formatGuid(g: string, minWidth: number = 0): string {
  return minWidth > 0 ? g.padEnd(minWidth) : g;
}

export function exportCinema(cinema: CinemaObject): string {
  const lines: string[] = [];
  
  // Cinema header
  lines.push('[ Cinema : 1 ]');
  lines.push(' { GUID:s              DoesCameraColl:d DoesCameraFade:d LightChannels:d ObjectFlags:d ScriptResource:s InitialPos:fff             Orientation:fff            LocalBoundingBox:ffffff                                  ObjSaveFlag:d ObjName:s                  Repeatable:d PopAtEnd:d Cinematic:d Time:f   Duration:f nShots:d nSyncPoints:d nActions:d nParticipants:d InitialShot:d BilboInvisible:d HasIntroTrans:d HasOutroTrans:d Skippable:d IsDeathCinema:d ForceNoWeapon:d ForceUseStick:d ForceUseSting:d Letterbox:d DisableControl:d BypassQueue:d LowPriority:d SubtitleInBox:d }');
  
  const p = cinema.properties;
  const objNamePadded = formatString(cinema.objName, 26);
  
  lines.push(`   ${formatString(cinema.guid, 18)} ${formatInt(p.doesCameraColl, 16)} ${formatInt(p.doesCameraFade, 16)} ${formatInt(p.lightChannels, 15)} ${formatInt(p.objectFlags, 13)} ${formatString(p.scriptResource, 16)} ${formatTripleFloat(p.initialPos).padEnd(26)} ${formatTripleFloat(p.orientation).padEnd(26)} ${formatSixFloat(p.localBoundingBox).padEnd(52)} ${formatInt(p.objSaveFlag, 13)} ${objNamePadded} ${formatInt(p.repeatable, 12)} ${formatInt(p.popAtEnd, 10)} ${formatInt(p.cinematic, 11)} ${formatFloat(p.time, 8)} ${formatFloat(cinema.duration, 10)} ${formatInt(cinema.shots.length, 8)} ${formatInt(cinema.syncPoints.length, 13)} ${formatInt(cinema.actions.length, 10)} ${formatInt(cinema.participants.length, 15)} ${formatInt(p.initialShot, 13)} ${formatInt(p.bilboInvisible, 16)} ${formatInt(p.hasIntroTrans, 15)} ${formatInt(p.hasOutroTrans, 15)} ${formatInt(p.skippable, 11)} ${formatInt(p.isDeathCinema, 15)} ${formatInt(p.forceNoWeapon, 15)} ${formatInt(p.forceUseStick, 15)} ${formatInt(p.forceUseSting, 15)} ${formatInt(p.letterbox, 11)} ${formatInt(p.disableControl, 16)} ${formatInt(p.bypassQueue, 13)} ${formatInt(p.lowPriority, 13)} ${formatInt(p.subtitleInBox, 15)}`);
  
  // Shots
  cinema.shots.forEach((shot, i) => {
    lines.push(`[ Shot${i} : 1 ]`);
    lines.push(` { Shot${i}\\Name:s Shot${i}\\NextShot:d Shot${i}\\SkipShot:d Shot${i}\\MaxTime:f Shot${i}\\Time:f }`);
    lines.push(`   ${formatString(shot.name, 12)} ${formatInt(shot.nextShot, 16)} ${formatInt(shot.skipShot, 16)} ${formatFloat(shot.maxTime, 14)} ${formatFloat(shot.time, 12)}`);
  });
  
  lines.push('');
  
  // SyncPoints
  cinema.syncPoints.forEach((sp, i) => {
    lines.push(`[ SyncPoint${i} : 1 ]`);
    lines.push(` { SyncPoint${i}\\Name:s SyncPoint${i}\\Type:d SyncPoint${i}\\Action:d SyncPoint${i}\\Offset:f SyncPoint${i}\\Shot:d SyncPoint${i}\\FromEnd:d SyncPoint${i}\\AbsoluteTimeStart:f }`);
    lines.push(`   ${formatString(sp.name, 17)} ${formatInt(sp.type, 17)} ${formatInt(sp.action, 19)} ${formatFloat(sp.offset, 19)} ${formatInt(sp.shot, 17)} ${formatInt(sp.fromEnd, 20)} ${formatFloat(sp.absoluteTimeStart, 23)}`);
  });
  
  lines.push('');
  lines.push('');
  
  // Actions
  cinema.actions.forEach((action, i) => {
    lines.push(exportAction(action, i));
  });
  
  lines.push('');
  
  // Participants
  lines.push(`[ Participants : ${cinema.participants.length} ]`);
  lines.push(' { PGuid:g           }');
  cinema.participants.forEach(p => {
    lines.push(`   ${p} `);
  });
  
  // Action-1 and Action-2 (fixed templates)
  lines.push('[ Action-1 : 1 ]');
  lines.push(' { Action-1\\Shot:d Action-1\\Offset:f Action-1\\Duration:f Action-1\\SyncPoint:d Action-1\\FinishShot:d Action-1\\DefaultLength:f Action-1\\FXType:d Action-1\\Magnitude:f Action-1\\Frequency:f Action-1\\Rolling:d Action-1\\Fadeout:d Action-1\\Color:dddd Action-1\\Target:f }');
  lines.push(`   ${formatInt(0, 15)} ${formatFloat(0, 17)} ${formatFloat(1, 19)} ${formatInt(0, 20)} ${formatInt(0, 21)} ${formatFloat(1, 24)} ${formatInt(3, 17)} ${formatFloat(0.15, 20)} ${formatFloat(20, 20)} ${formatInt(0, 18)} ${formatInt(0, 18)} ${formatQuadInt([0, 0, 0, 255]).padEnd(18)} ${formatFloat(0, 17)}`);
  
  lines.push('[ Action-2 : 1 ]');
  lines.push(' { Action-2\\Shot:d Action-2\\Offset:f Action-2\\Duration:f Action-2\\SyncPoint:d Action-2\\FinishShot:d Action-2\\DefaultLength:f Action-2\\FXType:d Action-2\\Magnitude:f Action-2\\Frequency:f Action-2\\Rolling:d Action-2\\Fadeout:d Action-2\\Color:dddd Action-2\\Target:f }');
  lines.push(`   ${formatInt(0, 15)} ${formatFloat(0, 17)} ${formatFloat(1, 19)} ${formatInt(0, 20)} ${formatInt(0, 21)} ${formatFloat(1, 24)} ${formatInt(3, 17)} ${formatFloat(0.15, 20)} ${formatFloat(20, 20)} ${formatInt(0, 18)} ${formatInt(0, 18)} ${formatQuadInt([0, 0, 0, 255]).padEnd(18)} ${formatFloat(0, 17)}`);
  
  lines.push('');
  
  // Camera Paths
  cinema.cameraPaths.forEach(cp => {
    lines.push(exportCameraPath(cp));
  });
  
  return lines.join('\n');
}

function exportAction(action: Action, index: number): string {
  const prefix = `Action${index}`;
  const lines: string[] = [];
  
  lines.push(`[ ${prefix} : 1 ]`);
  
  switch (action.type) {
    case 'camera': {
      const a = action as CameraAction;
      lines.push(` { ${prefix}\\Name:s ${prefix}\\Type:d ${prefix}\\Shot:d ${prefix}\\Offset:f ${prefix}\\Duration:f ${prefix}\\SyncPoint:d ${prefix}\\FinishShot:d ${prefix}\\DefaultLength:f ${prefix}\\CameraType:d ${prefix}\\Target:g  ${prefix}\\Relative:d ${prefix}\\StartOrient:fff    ${prefix}\\EndOrient:fff      ${prefix}\\StartOffset:fff    ${prefix}\\EndOffset:fff      ${prefix}\\TargetOffset:fff   ${prefix}\\StartFOV:f ${prefix}\\EndFOV:f ${prefix}\\TransitionPop:d ${prefix}\\Loop:d ${prefix}\\EndSyncPoint:d }`);
      lines.push(`   "${a.name}"    ${a.typeNum}              ${a.shot}              ${formatFloat(a.offset)}         ${formatFloat(a.duration)}               ${a.syncPoint}                   ${a.finishShot}                    ${formatFloat(a.defaultLength)}                ${a.cameraType}                    ${a.target} ${a.relative}                  ${formatTripleFloat(a.startOrient)} ${formatTripleFloat(a.endOrient)} ${formatTripleFloat(a.startOffset)} ${formatTripleFloat(a.endOffset)} ${formatTripleFloat(a.targetOffset)} ${formatFloat(a.startFOV)}           ${formatFloat(a.endFOV)}         ${a.transitionPop}                       ${a.loop}              ${a.endSyncPoint}                      `);
      break;
    }
    case 'dialog': {
      const a = action as DialogAction;
      lines.push(` { ${prefix}\\Name:s  ${prefix}\\Type:d ${prefix}\\Shot:d ${prefix}\\Offset:f ${prefix}\\Duration:f ${prefix}\\SyncPoint:d ${prefix}\\FinishShot:d ${prefix}\\DefaultLength:f ${prefix}\\Speaker:g ${prefix}\\Sample:s ${prefix}\\ForceEnd:d ${prefix}\\Positional:d }`);
      lines.push(`   "${a.name}"  ${a.typeNum}              ${a.shot}              ${formatFloat(a.offset)}         ${formatFloat(a.duration)}               ${a.syncPoint}                   ${a.finishShot}                    ${formatFloat(a.defaultLength)}                ${a.speaker} "${a.sample}"     ${a.forceEnd}                  ${a.positional}                    `);
      break;
    }
    case 'pop': {
      const a = action as PopAction;
      lines.push(` { ${prefix}\\Name:s ${prefix}\\Type:d ${prefix}\\Shot:d ${prefix}\\Offset:f ${prefix}\\Duration:f ${prefix}\\SyncPoint:d ${prefix}\\FinishShot:d ${prefix}\\DefaultLength:f ${prefix}\\Object:g  ${prefix}\\Location:g ${prefix}\\Facing:g  ${prefix}\\SetFacing:d ${prefix}\\Anim:s }`);
      lines.push(`   "${a.name}"    ${a.typeNum}              ${a.shot}              ${formatFloat(a.offset)}         ${formatFloat(a.duration)}           ${a.syncPoint}                   ${a.finishShot}                    ${formatFloat(a.defaultLength)}                ${a.object} ${a.location}  ${a.facing} ${a.setFacing}                   "${a.anim}"             `);
      break;
    }
    case 'fade': {
      const a = action as FadeAction;
      lines.push(` { ${prefix}\\Name:s ${prefix}\\Type:d ${prefix}\\Shot:d ${prefix}\\Offset:f ${prefix}\\Duration:f ${prefix}\\SyncPoint:d ${prefix}\\FinishShot:d ${prefix}\\DefaultLength:f ${prefix}\\FXType:d ${prefix}\\Magnitude:f ${prefix}\\Frequency:f ${prefix}\\Rolling:d ${prefix}\\Fadeout:d ${prefix}\\Color:dddd ${prefix}\\Target:f }`);
      lines.push(`   "${a.name}"     ${a.typeNum}              ${a.shot}              ${formatFloat(a.offset)}         ${formatFloat(a.duration)}           ${a.syncPoint}                   ${a.finishShot}                    ${formatFloat(a.defaultLength)}                ${a.fxType}                ${formatFloat(a.magnitude)}            ${formatFloat(a.frequency)}           ${a.rolling}                 ${a.fadeout}                 ${formatQuadInt(a.color)}          ${formatFloat(a.targetVal)}         `);
      break;
    }
    case 'charAnim': {
      const a = action as CharAnimAction;
      lines.push(` { ${prefix}\\Name:s ${prefix}\\Type:d ${prefix}\\Shot:d ${prefix}\\Offset:f ${prefix}\\Duration:f ${prefix}\\SyncPoint:d ${prefix}\\FinishShot:d ${prefix}\\DefaultLength:f ${prefix}\\Character:g ${prefix}\\AnimName:s ${prefix}\\Length:f ${prefix}\\AnimGroup:s    ${prefix}\\AnimatedInPlace:d ${prefix}\\Loops:d ${prefix}\\AnimsToPlay:d }`);
      lines.push(`   "${a.name}" ${a.typeNum}              ${a.shot}              ${formatFloat(a.offset)}         ${formatFloat(a.duration)}           ${a.syncPoint}                   ${a.finishShot}                    ${formatFloat(a.defaultLength)}                ${a.character}   "${a.animName}"     ${formatFloat(a.length)}         "${a.animGroup}" ${a.animatedInPlace}                         ${a.loops}               ${a.animsToPlay}                     `);
      break;
    }
    case 'objAnim': {
      const a = action as ObjAnimAction;
      lines.push(` { ${prefix}\\Name:s   ${prefix}\\Type:d ${prefix}\\Shot:d ${prefix}\\Offset:f ${prefix}\\Duration:f ${prefix}\\SyncPoint:d ${prefix}\\FinishShot:d ${prefix}\\DefaultLength:f ${prefix}\\Object:g  ${prefix}\\AnimName:s ${prefix}\\StartAnimating:d ${prefix}\\Looping:d ${prefix}\\HideWhenDone:d ${prefix}\\SetToEndOnSkip:d }`);
      lines.push(`   "${a.name}" ${a.typeNum}              ${a.shot}              ${formatFloat(a.offset)}         ${formatFloat(a.duration)}           ${a.syncPoint}                   ${a.finishShot}                    ${formatFloat(a.defaultLength)}                ${a.object} "${a.animName}"                 ${a.startAnimating}                        ${a.looping}                 ${a.hideWhenDone}                      ${a.setToEndOnSkip}                        `);
      break;
    }
    case 'trigger': {
      const a = action as TriggerAction;
      lines.push(` { ${prefix}\\Name:s ${prefix}\\Type:d ${prefix}\\TriggerName:s ${prefix}\\Shot:d ${prefix}\\Offset:f ${prefix}\\Duration:f ${prefix}\\SyncPoint:d ${prefix}\\FinishShot:d ${prefix}\\DefaultLength:f }`);
      lines.push(`   "${a.name}"   ${a.typeNum}              "${a.triggerName}"       ${a.shot}               ${formatFloat(a.offset)}         ${formatFloat(a.duration)}            ${a.syncPoint}                    ${a.finishShot}                     ${formatFloat(a.defaultLength)}    `);
      break;
    }
  }
  
  return lines.join('\n');
}

function exportCameraPath(cp: CameraPath): string {
  const lines: string[] = [];
  
  lines.push('[ CameraPath : 1 ]');
  lines.push(' { GUID:s              Pos:fff                    Orient:fff                 Scale:fff                  BBox:ffffff                    Loops:d Range:fff                  Min:fff                               PlaySpeed:f CamPosOffset:fff                      CamRotOffset:fff           LookatGuid:g      LookatOffset:fff           FromCenter:d Interpolate:d Lookspring:d }');
  lines.push(`   ${formatString(cp.guid, 18)} ${formatTripleFloat(cp.pos).padEnd(26)} ${formatTripleFloat(cp.orient).padEnd(26)} ${formatTripleFloat(cp.scale).padEnd(26)} ${formatSixFloat(cp.bBox).padEnd(30)} ${formatInt(cp.loops, 7)} ${formatTripleFloat(cp.range).padEnd(22)} ${formatTripleFloat(cp.min).padEnd(33)} ${formatFloat(cp.playSpeed, 11)} ${formatTripleFloat(cp.camPosOffset).padEnd(37)} ${formatTripleFloat(cp.camRotOffset).padEnd(26)} ${formatGuid(cp.lookatGuid, 17)} ${formatTripleFloat(cp.lookatOffset).padEnd(26)} ${formatInt(cp.fromCenter, 12)} ${formatInt(cp.interpolate, 13)} ${formatInt(cp.lookspring, 12)}`);
  
  // Keyframes
  lines.push('[ Keyframes : 1 ]');
  lines.push(' { PosX:d PosY:d PosZ:d OriX:d OriY:d OriZ:d OriW:d }');
  cp.keyframes.forEach(kf => {
    lines.push(`   ${formatInt(kf.posX, 6)} ${formatInt(kf.posY, 6)} ${formatInt(kf.posZ, 6)} ${formatInt(kf.oriX, 6)} ${formatInt(kf.oriY, 6)} ${formatInt(kf.oriZ, 6)} ${formatInt(kf.oriW, 6)}`);
  });
  
  lines.push('');
  return lines.join('\n');
}

// Export multiple cinemas
export function exportMultipleCinemas(cinemas: CinemaObject[]): string {
  const parts: string[] = [];
  
  cinemas.forEach((cinema, index) => {
    if (index > 0) {
      parts.push('\n//////////////////////////////////////////\n\n');
    }
    parts.push(exportCinema(cinema));
  });
  
  return parts.join('');
}
