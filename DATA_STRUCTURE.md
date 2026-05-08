# Swing Report Data Structure

Extracted from SwingLens iOS app — the golf swing analysis report JSON schema.

---

## Root: SwingReport

```json
{
  "reportId": "string",
  "videoId": "string",
  "userId": "string",
  "title": "string",
  "status": 1,
  "type": 0,
  "dataSource": "cloud",
  "createdAt": 1772689743027,
  "updatedAt": 1772689743027,
  "read_status": false,
  "coverNode": 3,
  "coachAnnotation": {},
  "coachIssues": [],
  "frames": { ... },
  "analyzes": {
    "frameAnalysis": { ... },
    "aiAdvice": { ... }
  }
}
```

---

## frames — Keyframe Images

Maps each swing phase to a keyframe image path.

```json
{
  "P1": "path/to/frame_0.jpg",
  "P2": "path/to/frame_1.jpg",
  "P3": "path/to/frame_2.jpg",
  "P4": "path/to/frame_3.jpg",
  "P5": "path/to/frame_4.jpg",
  "P6": "path/to/frame_5.jpg",
  "P7": "path/to/frame_6.jpg",
  "P8": "path/to/frame_7.jpg",
  "P9": "path/to/frame_8.jpg",
  "P10": "path/to/frame_9.jpg"
}
```

Phase meanings:
- P1 = Address (setup)
- P2 = Takeaway
- P3 = Halfway Back
- P4 = Top
- P5 = Early Downswing
- P6 = Pre-Impact
- P7 = Impact
- P8 = Release
- P9 = Follow Through
- P10 = End

---

## analyzes.frameAnalysis — Motion Analysis

```json
{
  "swingPhaseIndices": {
    "P1_address": 32,
    "P2_takeaway": 88,
    "P3_halfway_back": 112,
    "P4_top": 128,
    "P5_early_downswing": 133,
    "P6_pre_impact": 137,
    "P7_impact": 141,
    "P8_release": 146,
    "P9_follow_through": 148,
    "P10_end": 161
  },
  "kinematicsIndices": {
    "max_lead_hip_linear_speed_idx": 133,
    "max_lead_shoulder_linear_speed_idx": 145,
    "max_mid_hands_linear_speed_idx": 137,
    "max_chest_rotational_speed_idx": 135,
    "max_arm_rotational_speed_idx": 123,
    "max_pelvis_rotational_speed_idx": 136
  },
  "processingDuration": 0.159,
  "displayStats": {
    "isRightHanded": true,
    "viewingAngle": "faceOn",
    "totalSwingDuration": 1.209,
    "backswingDuration": 0.662,
    "downswingDuration": 0.215,
    "xFactorDegrees": -15.12,

    "shoulderTiltDegrees": { ... },
    "hipTurnDegrees": { ... },
    "shoulderTurnDegrees": { ... },
    "shoulderAngles": { ... },
    "elbowAngles": { ... },
    "kneeAngles": { ... },
    "hipFlexAngles": { ... },
    "wristAngles": { ... },
    "spineAngle": { ... },
    "hipSwayMeters": { ... },
    "shoulderSwayMeters": { ... },
    "kinematicSequence": { ... }
  }
}
```

### displayStats — Phase Metrics (all at Address, Takeaway, Top, Impact, etc.)

#### shoulderTiltDegrees
```json
{
  "atAddress": -0.5,
  "atTakeaway": -0.22,
  "atEarlyDownswing": 2.2,
  "atTop": 3.03,
  "atImpact": -3.21
}
```

#### hipTurnDegrees
```json
{
  "atAddress": 0,
  "atTakeaway": 1.18,
  "atTop": 59.15,
  "atEarlyDownswing": 37.34,
  "atImpact": 0.43,
  "atFollowThrough": 26.53,
  "atImpactUnnormalized": -1.25,
  "atTopUnnormalized": -60.83,
  "atFollowUnnormalized": 24.86
}
```

#### shoulderTurnDegrees
```json
{
  "atAddress": 0,
  "atTakeaway": 3.72,
  "atTop": 75.69,
  "atEarlyDownswing": 54.47,
  "atImpact": 0.55,
  "atImpactUnnormalized": -1.67,
  "atTopUnnormalized": -77.91
}
```

#### shoulderAngles
```json
{
  "rightShoulderHorizontalAbductionAtAddress": 87.68,
  "leftShoulderHorizontalAbductionAtAddress": 96.91,
  "rightShoulderHorizontalAbductionAtTop": 64.35,
  "leftShoulderHorizontalAbductionAtTop": 81.95,
  "rightShoulderHorizontalAbductionAtImpact": 75.39,
  "leftShoulderHorizontalAbductionAtImpact": 107.30,
  "rightShoulderVerticalElevationAtAddress": 0,
  "leftShoulderVerticalElevationAtAddress": 0,
  "rightShoulderVerticalElevationAtTop": 0,
  "leftShoulderVerticalElevationAtTop": 0,
  "rightShoulderVerticalElevationAtImpact": 0,
  "leftShoulderVerticalElevationAtImpact": 0
}
```

#### elbowAngles
```json
{
  "rightElbowAtAddress": 35.36,
  "leftElbowAtAddress": 24.86,
  "rightElbowAtTop": 42.68,
  "leftElbowAtTop": 49.16,
  "rightElbowAtImpact": 54.64,
  "leftElbowAtImpact": 45.01
}
```

#### kneeAngles
```json
{
  "leftKneeAtAddress": 24.59,
  "rightKneeAtAddress": 27.35,
  "leftKneeAtTop": 10.69,
  "rightKneeAtTop": 21.20,
  "leftKneeAtImpact": 25.03,
  "rightKneeAtImpact": 27.44
}
```

#### hipFlexAngles
```json
{
  "rightHipFlexAtAddress": 47.85,
  "leftHipFlexAtAddress": 47.10,
  "rightHipFlexAtTop": 19.52,
  "leftHipFlexAtTop": 16.73,
  "rightHipFlexAtImpact": 38.70,
  "leftHipFlexAtImpact": 31.63
}
```

#### wristAngles
```json
{
  "rightWristFlexionAtAddress": -56.05,
  "leftWristFlexionAtAddress": -68.07,
  "rightWristFlexionAtTop": 46.49,
  "leftWristFlexionAtTop": 45.59,
  "rightWristFlexionAtImpact": -35.15,
  "leftWristFlexionAtImpact": -49.79,
  "rightWristRadialDeviationAtTop": 0,
  "leftWristRadialDeviationAtTop": 0
}
```

#### spineAngle
```json
{
  "atAddress": 37.97,
  "atTop": 9.27,
  "atImpact": 28.47,
  "maxDeviation": 33.32
}
```

#### hipSwayMeters
```json
{
  "atAddress": -0.001,
  "atTakeaway": 0.032,
  "atEarlyDownswing": -0.017,
  "atTop": -0.061,
  "atImpact": 0.055
}
```

#### shoulderSwayMeters
```json
{
  "atAddress": 0.0004,
  "atTakeaway": -0.011,
  "atEarlyDownswing": -0.203,
  "atTop": -0.281,
  "atImpact": -0.079
}
```

#### kinematicSequence
```json
{
  "pelvisMaxSpeed": 568.10,
  "pelvisMaxSpeedFrame": 136,
  "torsoMaxSpeed": 685.92,
  "torsoMaxSpeedFrame": 135,
  "armMaxSpeed": 0,
  "armMaxSpeedFrame": 123,
  "leadHipMaxSpeed": 0.60,
  "leadHipMaxSpeedFrame": 133,
  "leadShoulderMaxSpeed": 2.24,
  "leadShoulderMaxSpeedFrame": 145,
  "midHandsMaxSpeed": 4.54,
  "midHandsMaxSpeedFrame": 137,
  "wristMaxSpeed": 4.54,
  "wristMaxSpeedFrame": 137,
  "hip2shoulderKinematicSequence": false
}
```

---

## analyzes.aiAdvice — AI-Generated Advice

```json
{
  "status": "done",
  "textOnly": false,
  "model": "gemini-3-pro-preview",
  "processingDuration": 42.35,
  "tokenUsage": {
    "input": 9083,
    "output": 1608,
    "total": 13383
  },
  "advice": {
    "nutshell": { ... },
    "root_causes": [ ... ],
    "swing_dynamics": [ ... ],
    "flipcards": [ ... ],
    "phase_analysis": [ ... ]
  }
}
```

### nutshell — Overall Summary

```json
{
  "name": "The Dynamic Drifter",
  "score": 78,
  "potential": 4,
  "stability": 2,
  "comment": "string — overall swing assessment",
  "vibe": {
    "name": "Simulator Sniper Energy",
    "value": 8.5
  },
  "technical_radar": [
    { "name": "Rotation", "value": 9 },
    { "name": "Sequencing", "value": 7 },
    { "name": "Balance", "value": 6 },
    { "name": "Plane Control", "value": 7.5 },
    { "name": "Impact Control", "value": 7 }
  ]
}
```

- **score**: 0-100 overall swing quality
- **potential**: 1-5 growth ceiling
- **stability**: 1-5 consistency rating
- **technical_radar**: 5-axis radar chart (each 0-10)
- **vibe**: playful personality descriptor (0-10)

### root_causes — Root Cause Analysis

```json
{
  "phase": 2,
  "summary": "Turn the trail hip into the heel rather than sliding it laterally.",
  "cause": {
    "joints": [{
      "name": "right hip",
      "type": "line",
      "description": "Swaying right",
      "direction": { "x": -1, "y": 0 }
    }]
  },
  "optim": {
    "joints": [{
      "name": "right hip",
      "type": "circle",
      "description": "Rotate in place",
      "radius": 15
    }]
  }
}
```

- **phase**: which swing phase the issue occurs in (1-10)
- **cause**: what's wrong (line = direction, circle = radius)
- **optim**: how to fix it

### swing_dynamics — Swing Patterns

```json
{
  "title": "Lateral Power Loading",
  "summary": "You generate force by shifting your center of mass...",
  "phases": [2, 3, 4]
}
```

### flipcards — Flip Cards (front: action, back: roast)

```json
{
  "front_title": "The Barrel Turn",
  "front_action": "Imagine standing inside a barrel. Turn your hips...",
  "back_roast_title": "The Zip Code Shift",
  "back_roast_text": "You sway so far off the ball in your backswing..."
}
```

### phase_analysis — Per-Phase Observations

```json
{
  "phase_number": 1,
  "observation": "Athletic setup with neutral grip and relaxed posture."
}
```