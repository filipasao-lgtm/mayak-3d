import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations, Environment, OrbitControls, ContactShadows, Center, Backdrop } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { MESH_NAMES } from './mesh-names';
import './App.css';

// === CONFIGURATION ===
const ANIMATION_NAMES = {

button: "btn_CASSETTE_Action",
tray: "CASSETTE_Control_Action",
tape: "Tape_Action",
power: "btn_POWER_Action",
play: "btn_PLAY_Action",
volume: "Volume_CONTROL_Action",
VHD_L: "VHD_MASK_L_Action",
VHD_R: "VHD_MASK_R_Action",
FORWARD: "btn_FORWARD_Action",
BACKWARD: "btn_BACKWARD_ACTION",
PROG1: "btn_PROG1_Action",
PROG2n: "btn_PROG2_Action",
RECORD: "btn_RECORD_Action",
STEREO: "btn_STEREO_Action",
screen_NUMBERS: "btn_screen_NUMBERS_Action",
screen_PAMYAT: "btn_screen_PAMYAT_Action",
screen_POVTOR: "btn_screen_POVTOR_Action",
screen_PYSK: "btn_screen_PYSK_Action",
sl_BALANCE: "slider_BALANCE_Action",
sl_GROMKOST: "slider_GROMKOST_Action",
sl_LENTA: "slider_LENTA_Action",
sl_PODMAG: "slider_PODMAG_Action",
sl_PSH: "slider_PSH_Action",
swtch_AVTOPOISK: "swtch_AVTOPOISK_Action",
swtch_TAIMER: "swtch_TAIMER_Action"

};

// === TUNABLE SETTINGS ===
const MODEL_SCALE = 7;
const CAMERA_POSITION = [0, 5, 10]; // [X, Y, Z] - Initial camera position (intro start)
const CAMERA_TARGET_Y = 0.4; // Final camera Y position after intro (higher = scene appears lower in viewport)
const CAMERA_TARGET_Z = 4.5; // Final camera Z position after intro (lower = closer)
const SCENE_OFFSET_Y = -.4; // Move entire scene up/down (positive = down, negative = up)
const CAMERA_FOV = 45; // Field of view (lower = more zoomed in)
const FOG_NEAR = 2; // Fog start distance
const FOG_FAR = 60; // Fog end distance (full fog) — pushed 3x farther to reduce intensity
const THEME_CONFIG = {
  day: {
    fogColor: '#d6d9e0',
    backdropColor: '#d6d9e0',
  },
  night: {
    fogColor: '#14151a',
    backdropColor: '#14151a',
  },
};
const SHADOW_SCALE = 20; // Shadow size (larger = bigger shadow area) — halved
const SHADOW_BLUR = 1; // Shadow blur amount (higher = softer edges)
const SHADOW_OPACITY = 0.5; // Shadow darkness (0-1) — reduced by half
const BLOOM_INTENSITY = .1;
const BLOOM_RADIUS = .2;
const BLOOM_LUMINANCE_THRESHOLD = 0.08;
const LED_EMISSIVE_INTENSITY_ON = 1.1;
const LED_EMISSIVE_BOOST_MATERIALS = new Set([
  'Mat_LED_RECORD',
  'Mat_LED_FORWARD',
  'Mat_LED_BACKWARD',
]);
const AMBIENT_INTENSITY = 0.31;

// Which LED meshes are powered when power is on
const POWER_LED_NAMES = [
  'VHD_LED_L', 'VHD_LED_R', 'VHD_BAR_numbers', 'VHD_BAR_L', 'VHD_BAR_R'
];

// Map animation clip name -> LED mesh name (lights only when power is on AND button is "pressed")
const BUTTON_LED_MAP = {
  [ANIMATION_NAMES.BACKWARD]: 'LED_BACKWARD',
  [ANIMATION_NAMES.FORWARD]: 'LED_FORWARD',
  [ANIMATION_NAMES.play]: 'LED_PLAY',
  [ANIMATION_NAMES.RECORD]: 'LED_RECORD',
  [ANIMATION_NAMES.PROG2n]: 'LED_EDIT',
};

const LED_MESH_NAMES = MESH_NAMES.filter((n) => (
  n.startsWith('LED') || n.startsWith('VHD_LED') || n.includes('VHD_BAR')
));

const isGlassMesh = (meshName, materialName) => {
  const nameLower = meshName.toLowerCase();
  return materialName === 'Mat_Glass' || 
         meshName === 'Glass_Screen' || 
         meshName === 'Cassette-glass' ||
         nameLower.includes('glass');
};

const applyGlassMaterialProperties = (material) => {
  if (!material) return;
  if (material.color) material.color.set('#000000');
  material.transparent = true;
  material.opacity = 0.8;
  material.metalness = 0.1;
  material.roughness = 0.1;
  material.envMapIntensity = 1.5;
  material.needsUpdate = true;
};

// Mesh names discovered at runtime after GLB loads (kept local to avoid HMR warnings)
const AVAILABLE_MESH_NAMES = [];
const DEBUG_AUDIO = false;
const SPOT_INTENSITY = 0.1;
const ENVIRONMENT_INTENSITY = 0.1;

// === TIMING CONSTANTS ===
const CASSETTE_UNLOAD_DURATION = 2000; // Duration for cassette unload animation (ms)
const REMINDER_AUTO_HIDE_DELAY = 2000; // Auto-hide reminder popup (ms)
const VFD_INTRO_DURATION = 500; // VFD mask close animation (ms)
const VFD_NO_AUDIO_DURATION = 500; // VFD mask open animation (ms)

// === AUDIO & VFD ANALYZER ===
class AudioAnalyzer {
  constructor(audioElement) {
    this.audioElement = audioElement;
    this.audioContext = null;
    this.analyser = null;
    this.source = null;
    this.dataArrayL = null;
    this.dataArrayR = null;
    this.splitter = null;
    this.leftAnalyser = null;
    this.rightAnalyser = null;
    this.leftLevel = 0;
    this.rightLevel = 0;
  }

  init() {
    if (this.audioContext) {
      return true; // already initialized
    }
    
    try {
      // Create AudioContext first
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Check if audio element is ready
      if (!this.audioElement || this.audioElement.readyState < 2) {
        console.error('Audio element not ready, readyState:', this.audioElement?.readyState);
        return false;
      }
      
      // Create source from audio element
      this.source = this.audioContext.createMediaElementSource(this.audioElement);
      
      // Create stereo splitter
      this.splitter = this.audioContext.createChannelSplitter(2);
      
      // Create analysers for L/R
      this.leftAnalyser = this.audioContext.createAnalyser();
      this.rightAnalyser = this.audioContext.createAnalyser();
      this.leftAnalyser.fftSize = 2048;
      this.rightAnalyser.fftSize = 2048;
      this.leftAnalyser.smoothingTimeConstant = 0.8;
      this.rightAnalyser.smoothingTimeConstant = 0.8;
      
      this.dataArrayL = new Uint8Array(this.leftAnalyser.frequencyBinCount);
      this.dataArrayR = new Uint8Array(this.rightAnalyser.frequencyBinCount);
      
      // Wire up: source -> splitter -> [left, right] analysers
      this.source.connect(this.splitter);
      this.splitter.connect(this.leftAnalyser, 0);
      this.splitter.connect(this.rightAnalyser, 1);
      
      // Also connect to destination for audio playback
      this.source.connect(this.audioContext.destination);
      return true;
    } catch (err) {
      console.error('Failed to initialize audio analyzer:', err);
      this.audioContext = null; // Reset so we can retry
      return false;
    }
  }

  getChannelLevels() {
    if (!this.leftAnalyser || !this.rightAnalyser) return { left: 0, right: 0 };
    
    this.leftAnalyser.getByteFrequencyData(this.dataArrayL);
    this.rightAnalyser.getByteFrequencyData(this.dataArrayR);
    
    // Calculate average frequency level for each channel
    let sumL = 0, sumR = 0;
    const length = this.dataArrayL.length;
    
    for (let i = 0; i < length; i++) {
      sumL += this.dataArrayL[i];
      sumR += this.dataArrayR[i];
    }
    
    // Normalize to 0-1 range
    const avgL = (sumL / length) / 255;
    const avgR = (sumR / length) / 255;
    
    // Convert to dB scale (logarithmic) similar to VFD meter
    // Range: -20dB (green) to +5dB (red peak) - matching the VFD display
    const dbL = avgL > 0 ? 20 * Math.log10(avgL) : -40;
    const dbR = avgR > 0 ? 20 * Math.log10(avgR) : -40;
    
    // Normalize dB scale to 0-1 range matching VFD display (-20 to +5)
    // This maps the full -20 to +5 range, making red area reachable
    const normalizedL = Math.max(0, Math.min(1, (dbL + 20) / 25));
    const normalizedR = Math.max(0, Math.min(1, (dbR + 20) / 25));
    
    return { 
      left: normalizedL, 
      right: normalizedR
    };
  }
}

function StudioBackground({ color }) {
  return (
    <Backdrop
      receiveShadow
      floor={2}
      segments={50}
      scale={[50, 30, 10]}
      position={[0, -0.1, -10]}
    >
      <meshStandardMaterial color={color} roughness={1} transparent opacity={0} />
    </Backdrop>
  );
}

// --- NEW COMPONENT: Intro Animation ---
function Intro({ onFinish }) {
  const { camera } = useThree();
  
  // 1. Run this logic every single frame (60 times a second)
  useFrame((state, delta) => {
    // The target position we want to land on (Normal view)
    const targetY = CAMERA_TARGET_Y;
    const targetZ = CAMERA_TARGET_Z;

    // 2. Smoothly move camera towards target (Lerp = Linear Interpolation)
    // "0.02" is the speed. Higher = faster.
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.02);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.02);

    // 3. Always look at the center of the scene
    camera.lookAt(0, 0, 0);

    // 4. Check if we are "close enough" to stop
    if (Math.abs(camera.position.y - targetY) < 0.05) {
      onFinish(); // Tell the main app "We are done!"
    }
  });

  return null;
}

const MayakModel = forwardRef(function MayakModel({ audioAnalyzer, isPlayingAudio, onPlayButtonClick, onSelectSongClick, onStereoToggle, volume, onPowerChange, onTapeUnload, onCasseteLoaded, modelScale = MODEL_SCALE, sceneOffsetY = SCENE_OFFSET_Y }, ref) {
  const group = useRef();
  const { scene, animations } = useGLTF('./mayak.glb');
  const { actions, mixer } = useAnimations(animations, group);
  // Power state for LEDs
  const [isPowerOn, setIsPowerOn] = useState(false);
  const vfdMasksRef = useRef({ left: null, right: null });
  const frameCountRef = useRef(0);
  // Smooth VFD response by storing previous scale values
  const vfdScaleRef = useRef({ left: 1.0, right: 1.0 });
  // Track pause/no-audio state for slow closure animation
  const noAudioCloseRef = useRef({ active: false, startTime: null, duration: VFD_NO_AUDIO_DURATION });
  // Track intro animation (masks closing when play is pressed)
  const vfdIntroRef = useRef({ active: false, startTime: null, duration: VFD_INTRO_DURATION });
  // Tape wheel rotation
  const tapeWheelsRef = useRef({ left: null, right: null });
  const wheelRotationRef = useRef({ rotating: false, speed: 3 }); // 3 radians per second

  // LED mesh names to toggle emissive on power (sourced from discovered mesh names)
  // If you prefer an explicit list, replace the above with: ['LED_PLAY','VHD_LED_L','VHD_LED_R','VHD_BAR_R','VHD_BAR_L','VHD_BAR_numbers'];
  const ledMeshesRef = useRef([]);
  const tapeLightMatsRef = useRef([]);
  const redZoneMatsRef = useRef([]);

  // Sync volume knob animation with volume level
  useEffect(() => {
    const volumeAction = actions[ANIMATION_NAMES.volume];
    if (volumeAction) {
      const clip = volumeAction.getClip ? volumeAction.getClip() : volumeAction._clip;
      const duration = (clip && clip.duration) ? clip.duration : 1;
      
      // Map volume (0-1) to animation time (0-duration)
      const targetTime = volume * duration;
      
      // Set up the action for manual control
      volumeAction.setLoop(THREE.LoopOnce);
      volumeAction.clampWhenFinished = true;
      volumeAction.enabled = true;
      volumeAction.paused = true; // Keep it paused
      volumeAction.time = targetTime;
      
      // Play briefly to update the pose, then pause
      if (!volumeAction.isRunning()) {
        volumeAction.play();
      }
      volumeAction.paused = true;
    }
  }, [volume, actions]);

  useEffect(() => {
    const allNames = [];
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;    // Casts shadow onto floor
        child.receiveShadow = true; // Casts shadow onto itself
        if (child.name) allNames.push(child.name);

        // Ensure glass/label meshes stay opaque (avoid white copy becoming transparent)
        const n = child.name.toLowerCase();
        if (n.includes('glass') || n.includes('cassette') || n.includes('label')) {
          const mat = child.material;
          if (mat) {
            mat.alphaTest = 0.5;
            mat.depthWrite = true;
            // Apply glass properties if this is a glass mesh
            if (isGlassMesh(child.name, mat.name)) {
              applyGlassMaterialProperties(mat);
            } else {
              mat.transparent = false;
              mat.opacity = 1;
            }
          }
        }

        // Boost the tape light emissive strength and tie it to power state (5x when on, 0 when off)
        if (child.name === 'LIGHT-tape') {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((mat) => {
            if (!mat) return;
            const current = typeof mat.emissiveIntensity === 'number' ? mat.emissiveIntensity : 1;
            mat.userData.baseTapeEmissive = current;
            mat.emissiveIntensity = isPowerOnRef.current ? current * 5 : 0;
            mat.toneMapped = false; // keep emissive bright for bloom
            mat.needsUpdate = true;
            tapeLightMatsRef.current.push(mat);
          });
        }

        // Handle Mat_LED_REDZONE emission (0 when off, 2x when on)
        const matsAll = Array.isArray(child.material) ? child.material : [child.material];
        matsAll.forEach((mat) => {
          if (mat && mat.name === 'Mat_LED_REDZONE') {
            const current = typeof mat.emissiveIntensity === 'number' ? mat.emissiveIntensity : 1;
            mat.userData.baseRedZoneEmissive = current;
            mat.emissiveIntensity = isPowerOnRef.current ? current * 2 : 0;
            mat.toneMapped = false;
            mat.needsUpdate = true;
            redZoneMatsRef.current.push(mat);
          }
        });

        // Boost Mat_VFD_GRAD emission 2x
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((mat) => {
          if (mat && mat.name === 'Mat_VFD_GRAD') {
            const current = typeof mat.emissiveIntensity === 'number' ? mat.emissiveIntensity : 1;
            mat.emissiveIntensity = current * 2;
            mat.toneMapped = false;
            mat.needsUpdate = true;
          }
        });
      }
      
      // Use exact match for VFD mask objects
      if (child.name === 'VHD_MASK_L') {
        vfdMasksRef.current.left = child;
      }
      if (child.name === 'VHD_MASK_R') {
        vfdMasksRef.current.right = child;
      }
      
      // Find tape wheel meshes
      if (child.name === 'Tape_wheele_L') {
        tapeWheelsRef.current.left = child;
      }
      if (child.name === 'Tape_wheele_R') {
        tapeWheelsRef.current.right = child;
      }
    });

    AVAILABLE_MESH_NAMES.splice(0, AVAILABLE_MESH_NAMES.length, ...allNames);
  }, [scene]);

  const updateTapeLightIntensity = () => {
    const mats = tapeLightMatsRef.current || [];
    mats.forEach((mat) => {
      if (!mat) return;
      const base = typeof mat.userData.baseTapeEmissive === 'number' ? mat.userData.baseTapeEmissive : 1;
      mat.emissiveIntensity = isPowerOnRef.current ? base * 5 : 0;
      mat.toneMapped = false;
      mat.needsUpdate = true;
    });
  };

  const updateRedZoneIntensity = () => {
    const mats = redZoneMatsRef.current || [];
    mats.forEach((mat) => {
      if (!mat) return;
      const base = typeof mat.userData.baseRedZoneEmissive === 'number' ? mat.userData.baseRedZoneEmissive : 1;
      mat.emissiveIntensity = isPowerOnRef.current ? base * 2 : 0;
      mat.toneMapped = false;
      mat.needsUpdate = true;
    });
  };

  const playSequence = () => {
    const clips = [
      ANIMATION_NAMES.button,
      ANIMATION_NAMES.tray,
      ANIMATION_NAMES.tape,
    ];

    const actionsList = clips
      .map((c) => ({ name: c, action: actions[c] }))
      .filter((x) => x.action);

    if (actionsList.length !== clips.length) return; // defensively bail if clips missing

    const anyPlayingForward = clips.some((c) => playing.current.get(c) === 'forward');
    const anyPlayingReverse = clips.some((c) => playing.current.get(c) === 'reverse');
    const anyPressed = clips.some((c) => pressed.current.has(c));

    // If reverse is currently playing, ignore clicks
    if (anyPlayingReverse) return;

    // 1) Start forward sequence if nothing is active
    if (!anyPressed && !anyPlayingForward) {
      actionsList.forEach(({ action }) => {
        action.reset();
        action.setLoop(THREE.LoopOnce);
        action.clampWhenFinished = true;
        action.enabled = true;
      });

      // play in sequence: button first, then tray & tape
      const [btn, tray, tape] = actionsList.map((a) => a.action);
      btn.timeScale = 1; btn.paused = false; btn.play(); playing.current.set(clips[0], 'forward');
      setTimeout(() => {
        tray.timeScale = 1; tray.paused = false; tray.play(); playing.current.set(clips[1], 'forward');
        tape.timeScale = 1; tape.paused = false; tape.play(); playing.current.set(clips[2], 'forward');
      }, 400);

      return;
    }

    // 2) If a forward sequence is in-progress, schedule reverse for all sequence clips
    if (anyPlayingForward) {
      clips.forEach((c) => pendingReverse.current.add(c));
      return;
    }

    // 3) If forward finished (pressed) and nothing is playing, start reverse immediately
    if (anyPressed && !anyPlayingForward && !anyPlayingReverse) {
      // Stagger reverse with specific timing: tray first, then tape 0.5s later, then button
      const delays = {};
      delays[ANIMATION_NAMES.tray] = 0;
      delays[ANIMATION_NAMES.tape] = 100; // 0.1s after tray
      delays[ANIMATION_NAMES.button] = 900; // button after tape

      actionsList.forEach(({ name, action }, idx) => {
        const clip = action.getClip ? action.getClip() : action._clip;
        const duration = (clip && clip.duration) ? clip.duration : 1;
        const delay = typeof delays[name] === 'number' ? delays[name] : (actionsList.length - 1 - idx) * 200;
        
        // Pause audio immediately when button reverse animation starts (at its delay)
        if (name === ANIMATION_NAMES.button) {
          setTimeout(() => {
            console.log('Cassette eject started - pausing audio immediately');
            if (onTapeUnload) onTapeUnload();
          }, delay);
        }
        
        setTimeout(() => {
          action.time = Math.max(duration - 1e-6, 0);
          action.timeScale = -1;
          action.paused = false;
          action.play();
          playing.current.set(name, 'reverse');
        }, delay);
      });
      return;
    }

    // otherwise ignore
  };

  // per-clip state
  const pressed = useRef(new Set());
  const playing = useRef(new Map());
  const pendingReverse = useRef(new Set());

  const findClipFromObjectName = (objName) => {
    if (!objName) return null;
    const n = objName.toLowerCase();
    for (const key in ANIMATION_NAMES) {
      const clipName = ANIMATION_NAMES[key];
      if (!clipName) continue;
      const base = clipName.replace(/_Action$/i, '').replace(/[-\s]/g, '_').toLowerCase();
      if (n.includes(base) || base.includes(n)) return clipName;
      if (clipName.toLowerCase().includes(n) || n.includes(clipName.toLowerCase())) return clipName;
    }
    return null;
  };

  // Keep a ref of the current power state so event callbacks (which may be stale closures)
  // can read latest value when they run.
  const isPowerOnRef = useRef(isPowerOn);
  const isPlayingAudioRef = useRef(isPlayingAudio);
  useEffect(() => { isPowerOnRef.current = isPowerOn; }, [isPowerOn]);
  useEffect(() => { 
    isPlayingAudioRef.current = isPlayingAudio; 
    updateLEDStates(); // Update LED states when playback state changes
  }, [isPlayingAudio]);

  // Helper to set LED materials on/off
  const updateLEDStates = () => {
    const leds = ledMeshesRef.current || [];
    leds.forEach((m) => {
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      let on = false;
      let color = '#4DFFAE';

      if (POWER_LED_NAMES.includes(m.name)) {
        on = !!isPowerOnRef.current;
        color = '#4DFFAE';
      } else {
        // Special case for LED_PLAY - only light when audio is actually playing
        if (m.name === 'LED_PLAY') {
          on = !!isPowerOnRef.current && !!isPlayingAudioRef.current;
          color = '#00ff00';
        } else {
          // check if this LED maps to a button clip
          for (const clipName in BUTTON_LED_MAP) {
            if (BUTTON_LED_MAP[clipName] === m.name) {
              on = !!isPowerOnRef.current && pressed.current.has(clipName);
              color = '#00ff00';
              break;
            }
          }
          // Red LEDs for RECORD, FORWARD, BACKWARD
          if (['LED_RECORD', 'LED_FORWARD', 'LED_BACKWARD'].includes(m.name)) {
            on = !!isPowerOnRef.current && pressed.current.has(
              m.name === 'LED_RECORD' ? ANIMATION_NAMES.RECORD :
              m.name === 'LED_FORWARD' ? ANIMATION_NAMES.FORWARD :
              ANIMATION_NAMES.BACKWARD
            );
            color = '#ff0000';
          }
        }
      }

      mats.forEach((mat) => {
        if (!mat) return;
        const intensity = LED_EMISSIVE_BOOST_MATERIALS.has(mat.name)
          ? LED_EMISSIVE_INTENSITY_ON * 3
          : LED_EMISSIVE_INTENSITY_ON;
        if (on) {
          if (mat.emissive) mat.emissive.set(color);
          mat.emissiveIntensity = intensity;
          mat.toneMapped = false;
        } else {
          mat.emissiveIntensity = 0;
          mat.toneMapped = true;
        }
        mat.needsUpdate = true;
      });
    });
  };

  useEffect(() => {
    if (!mixer) return;
    
    // Disable the animation actions for the VFD masks
    // This tells the mixer: "Don't calculate values for these clips."
    const vhdL = actions[ANIMATION_NAMES.VHD_L];
    const vhdR = actions[ANIMATION_NAMES.VHD_R];
    
    if (vhdL) { 
      vhdL.stop(); 
      vhdL.enabled = false;
      console.log('Disabled VHD_MASK_L animation');
    }
    if (vhdR) { 
      vhdR.stop(); 
      vhdR.enabled = false;
      console.log('Disabled VHD_MASK_R animation');
    }
    
    const onFinished = (e) => {
      const action = e.action;
      const clip = action && (action.getClip ? action.getClip() : action._clip);
      const clipName = clip && clip.name;
      if (!clipName) return;

      const dir = playing.current.get(clipName);
      if (dir === 'forward') {
        playing.current.delete(clipName);
        if (pendingReverse.current.has(clipName)) {
          pendingReverse.current.delete(clipName);
          const duration = (clip && clip.duration) ? clip.duration : 1;
          action.time = Math.max(duration - 1e-6, 0);
          action.timeScale = -1;
          action.paused = false;
          action.play();
          playing.current.set(clipName, 'reverse');
        } else {
          pressed.current.add(clipName);
          if (clipName === ANIMATION_NAMES.power) {
            setIsPowerOn(true);
            if (onPowerChange) onPowerChange(true); // Notify parent that power is on
          }
          // Detect cassette load completion
          if (clipName === ANIMATION_NAMES.button) {
            // Cassette has been inserted
            console.log('Cassette button forward animation finished - calling onCasseteLoaded');
            if (onCasseteLoaded) onCasseteLoaded();
          }
          // update LEDs after state change
          updateLEDStates();
        }
      } else if (dir === 'reverse') {
        playing.current.delete(clipName);
        pressed.current.delete(clipName);
        if (clipName === ANIMATION_NAMES.power) {
          setIsPowerOn(false);
          if (onPowerChange) onPowerChange(false); // Notify parent that power is off
        }
        // update LEDs after state change
        updateLEDStates();
        updateTapeLightIntensity();
      }
    };

    mixer.addEventListener('finished', onFinished);
    return () => mixer.removeEventListener('finished', onFinished);
  }, [mixer, onCasseteLoaded, onTapeUnload, onPowerChange]);

  // collect LED meshes once when scene is ready
  useEffect(() => {
    if (!scene) return;
    const leds = [];
    scene.traverse((child) => {
      if (child.isMesh && child.name && LED_MESH_NAMES.includes(child.name)) {
        leds.push(child);
      }
    });
    ledMeshesRef.current = leds;
    console.log('Found LED meshes:', leds.map((m) => m.name));

    // initialize LED states based on current pressed/power state
    updateLEDStates();
  }, [scene]);

  // Re-evaluate LED states when power state changes
  useEffect(() => {
    updateLEDStates();
    updateTapeLightIntensity();
    updateRedZoneIntensity();
  }, [isPowerOn]);

  // Handle audio pause/play state - trigger slow closure when paused
  useEffect(() => {
    if (!isPlayingAudio) {
      // Audio paused - start slow closure animation and stop wheel rotation
      noAudioCloseRef.current.active = true;
      noAudioCloseRef.current.startTime = Date.now();
      wheelRotationRef.current.rotating = false;
    } else {
      // Audio resumed - start intro animation (masks close completely)
      noAudioCloseRef.current.active = false;
      noAudioCloseRef.current.startTime = null;
      vfdIntroRef.current.active = true;
      vfdIntroRef.current.startTime = Date.now();
      vfdIntroRef.current.duration = VFD_INTRO_DURATION;
      wheelRotationRef.current.rotating = true;
    }
  }, [isPlayingAudio]);

  // Animate VFD masks based on audio levels
  // Priority 1 ensures this runs AFTER the animation mixer
  useFrame(() => {
    const leftMask = vfdMasksRef.current.left;
    const rightMask = vfdMasksRef.current.right;
    
    if (!leftMask || !rightMask) return;
    
    const minScale = 0.01;  
    const maxScale = 1.0;
    const sensitivity = 1.5; // Increased from 1.0 to allow reaching red levels
    const smoothing = 0.45;
    
    // Check if we're in intro animation (masks closing when play is pressed)
    if (vfdIntroRef.current.active && vfdIntroRef.current.startTime) {
      const elapsed = Date.now() - vfdIntroRef.current.startTime;
      const duration = vfdIntroRef.current.duration;
      const progress = Math.min(1, elapsed / duration); // 0 to 1 over 0.5s
      
      // Interpolate from current scale to fully closed (minScale)
      const targetL = vfdScaleRef.current.left * (1 - progress) + minScale * progress;
      const targetR = vfdScaleRef.current.right * (1 - progress) + minScale * progress;
      
      vfdScaleRef.current.left = targetL;
      vfdScaleRef.current.right = targetR;
      
      leftMask.scale.x = targetL;
      rightMask.scale.x = targetR;
      leftMask.updateMatrix();
      rightMask.updateMatrix();
      
      // When intro animation finishes, switch to audio-reactive mode
      if (progress >= 1) {
        vfdIntroRef.current.active = false;
      }
      
      return;
    }
    
    // Check if we're in slow-open animation (audio paused)
    if (noAudioCloseRef.current.active && noAudioCloseRef.current.startTime) {
      const elapsed = Date.now() - noAudioCloseRef.current.startTime;
      const duration = noAudioCloseRef.current.duration;
      const progress = Math.min(1, elapsed / duration); // 0 to 1 over 0.5s
      
      // Interpolate from current scale to fully open (maxScale)
      const targetL = vfdScaleRef.current.left * (1 - progress) + maxScale * progress;
      const targetR = vfdScaleRef.current.right * (1 - progress) + maxScale * progress;
      
      vfdScaleRef.current.left = targetL;
      vfdScaleRef.current.right = targetR;
      
      leftMask.scale.x = targetL;
      rightMask.scale.x = targetR;
      leftMask.updateMatrix();
      rightMask.updateMatrix();
      
      return;
    }
    
    // Normal audio-based animation
    if (!isPlayingAudio || !audioAnalyzer) {
      return;
    }
    
    const { left, right } = audioAnalyzer.getChannelLevels();
    
    // Apply volume multiplier to audio levels (so low volume = low VFD bars)
    const leftAdjusted = left * volume;
    const rightAdjusted = right * volume;
    
    if (DEBUG_AUDIO) {
      // Debug logging every 60 frames
      frameCountRef.current++;
      if (frameCountRef.current % 60 === 0) {
        const sampleL = audioAnalyzer.dataArrayL ? Array.from(audioAnalyzer.dataArrayL.slice(0, 10)) : [];
        const sampleR = audioAnalyzer.dataArrayR ? Array.from(audioAnalyzer.dataArrayR.slice(0, 10)) : [];
        console.log('Audio data:', {
          left: left.toFixed(4),
          right: right.toFixed(4),
          volume: volume.toFixed(2),
          leftAdjusted: leftAdjusted.toFixed(4),
          rightAdjusted: rightAdjusted.toFixed(4),
          sampleL,
          sampleR,
          contextState: audioAnalyzer.audioContext?.state,
          hasMasks: !!leftMask && !!rightMask
        });
      }
    }
    
    if (leftMask) {
      let targetScale = maxScale;
      if (leftAdjusted > 0) {
        targetScale = maxScale - (leftAdjusted * sensitivity);
      }
      const clampedTarget = Math.max(minScale, Math.min(maxScale, targetScale));
      
      // Smooth lerp between previous and target scale
      vfdScaleRef.current.left = vfdScaleRef.current.left * (1 - smoothing) + clampedTarget * smoothing;
      leftMask.scale.x = vfdScaleRef.current.left;
      leftMask.updateMatrix();
    }
    
    if (rightMask) {
      let targetScale = maxScale;
      if (rightAdjusted > 0) {
        targetScale = maxScale - (rightAdjusted * sensitivity);
      }
      const clampedTarget = Math.max(minScale, Math.min(maxScale, targetScale));
      
      // Smooth lerp between previous and target scale
      vfdScaleRef.current.right = vfdScaleRef.current.right * (1 - smoothing) + clampedTarget * smoothing;
      rightMask.scale.x = vfdScaleRef.current.right;
      rightMask.updateMatrix();
    }
    
    // Rotate tape wheels when playing
    if (wheelRotationRef.current.rotating) {
      const leftWheel = tapeWheelsRef.current.left;
      const rightWheel = tapeWheelsRef.current.right;
      const deltaTime = 1 / 60; // Assuming 60 FPS
      const rotationAmount = wheelRotationRef.current.speed * deltaTime;
      
      if (leftWheel) {
        leftWheel.rotation.y += rotationAmount;
      }
      if (rightWheel) {
        rightWheel.rotation.y += rotationAmount;
      }
    }
  }, 1); // Priority 1 ensures this runs AFTER the animation mixer

  const toggleActionForObject = (objName) => {
    const clipName = findClipFromObjectName(objName);
    if (!clipName) return;

    let action = actions[clipName];
    if (!action) {
      for (const k in actions) {
        const a = actions[k];
        const c = a && (a.getClip ? a.getClip() : a._clip);
        if (c && c.name && c.name.toLowerCase().includes(clipName.toLowerCase())) { action = a; break; }
      }
    }
    if (!action) return;

    action.setLoop(THREE.LoopOnce);
    action.clampWhenFinished = true;
    action.enabled = true;

    const isPressed = pressed.current.has(clipName);
    const isPlaying = playing.current.has(clipName);
    const currentDir = playing.current.get(clipName);

    const clip = action.getClip ? action.getClip() : action._clip;
    const duration = (clip && clip.duration) ? clip.duration : 1;

    if (!isPressed && !isPlaying) {
      action.reset(); action.timeScale = 1; action.paused = false; action.play(); playing.current.set(clipName,'forward');
      // Mark button as pressed immediately so its LED can light while the animation runs
      pressed.current.add(clipName);
      updateLEDStates();
      console.log('Clip started forward ->', clipName);
      return;
    }

    if (!isPressed && isPlaying && currentDir === 'forward') {
      pendingReverse.current.add(clipName);
      return;
    }

    if (isPressed && !isPlaying) {
      action.time = Math.max(duration - 1e-6, 0); action.timeScale = -1; action.paused = false; action.play(); playing.current.set(clipName,'reverse');
      return;
    }

    // ignore if reverse is playing
  };

  // Imperative controls for UI buttons
  const ensurePowerOn = () => {
    if (!isPowerOnRef.current) {
      toggleActionForObject('btn_POWER');
    }
  };

  const triggerLoadCassette = () => {
    playSequence();
  };

  const triggerPlayButton = () => {
    toggleActionForObject('btn_PLAY');
  };

  const triggerStereoButton = () => {
    toggleActionForObject('btn_STEREO');
  };

  const resetPlayButton = () => {
    const clipName = ANIMATION_NAMES.play;
    const action = actions[clipName];
    if (!action) return;

    const dir = playing.current.get(clipName);
    const isPressed = pressed.current.has(clipName);

    if (dir === 'reverse') return;

    action.setLoop(THREE.LoopOnce);
    action.clampWhenFinished = true;
    action.enabled = true;

    const clip = action.getClip ? action.getClip() : action._clip;
    const duration = (clip && clip.duration) ? clip.duration : 1;

    if (dir === 'forward') {
      pendingReverse.current.add(clipName);
      return;
    }

    if (isPressed && !dir) {
      pressed.current.delete(clipName); // Remove immediately so state is consistent
      action.time = Math.max(duration - 1e-6, 0);
      action.timeScale = -1;
      action.paused = false;
      action.play();
      playing.current.set(clipName, 'reverse');
      updateLEDStates(); // Update LEDs immediately
    }
  };

  const pressPlayButton = () => {
    const clipName = ANIMATION_NAMES.play;
    const action = actions[clipName];
    if (!action) return;

    const dir = playing.current.get(clipName);
    const isPressed = pressed.current.has(clipName);

    // If already pressed or playing forward, nothing to do
    if (isPressed || dir === 'forward') return;

    // If currently reversing, cancel it and start forward
    if (dir === 'reverse') {
      playing.current.delete(clipName);
    }

    // Start the forward (press) animation
    action.setLoop(THREE.LoopOnce);
    action.clampWhenFinished = true;
    action.enabled = true;
    action.reset();
    action.timeScale = 1;
    action.paused = false;
    action.play();
    playing.current.set(clipName, 'forward');
    pressed.current.add(clipName); // Mark as pressed immediately
    updateLEDStates();
  };

  const unloadCassette = () => {
    // Notify parent that tape is being unloaded
    console.log('unloadCassette called - calling onTapeUnload');
    if (onTapeUnload) {
      console.log('onTapeUnload callback exists, calling it');
      onTapeUnload();
    } else {
      console.log('WARNING: onTapeUnload callback not provided');
    }
    
    // Trigger reverse cassette sequence (eject)
    const clips = [
      ANIMATION_NAMES.button,
      ANIMATION_NAMES.tray,
      ANIMATION_NAMES.tape,
    ];

    const actionsList = clips
      .map((c) => ({ name: c, action: actions[c] }))
      .filter((x) => x.action);

    if (actionsList.length !== clips.length) return;

    // Clear all state immediately so fresh load can start
    clips.forEach((c) => {
      playing.current.delete(c);
      pressed.current.delete(c);
      pendingReverse.current.delete(c);
    });

    // Always trigger reverse sequence, regardless of pressed state
    // Stagger reverse with specific timing: tray first, then tape 0.5s later, then button
    const delays = {};
    delays[ANIMATION_NAMES.tray] = 0;
    delays[ANIMATION_NAMES.tape] = 100; // 0.1s after tray
    delays[ANIMATION_NAMES.button] = 900; // button after tape

    actionsList.forEach(({ name, action }, idx) => {
      const clip = action.getClip ? action.getClip() : action._clip;
      const duration = (clip && clip.duration) ? clip.duration : 1;
      const delay = typeof delays[name] === 'number' ? delays[name] : (actionsList.length - 1 - idx) * 200;
      setTimeout(() => {
        action.reset();
        action.time = Math.max(duration - 1e-6, 0);
        action.timeScale = -1;
        action.paused = false;
        action.play();
        playing.current.set(name, 'reverse');
      }, delay);
    });
  };

  // Force the stereo button back to its initial (unpressed) state
  const resetStereoButton = () => {
    const clipName = ANIMATION_NAMES.STEREO;
    const action = actions[clipName];
    if (!action) return;

    const dir = playing.current.get(clipName);
    const isPressed = pressed.current.has(clipName);

    // If it's already reversing, leave it
    if (dir === 'reverse') return;

    action.setLoop(THREE.LoopOnce);
    action.clampWhenFinished = true;
    action.enabled = true;

    const clip = action.getClip ? action.getClip() : action._clip;
    const duration = (clip && clip.duration) ? clip.duration : 1;

    // If it's currently playing forward, queue a reverse
    if (dir === 'forward') {
      pendingReverse.current.add(clipName);
      return;
    }

    // If it's sitting in pressed state, immediately play reverse
    if (isPressed && !dir) {
      action.time = Math.max(duration - 1e-6, 0);
      action.timeScale = -1;
      action.paused = false;
      action.play();
      playing.current.set(clipName, 'reverse');
    }
  };

  useImperativeHandle(ref, () => ({
    powerOn: ensurePowerOn,
    loadCassette: triggerLoadCassette,
    togglePlay: triggerPlayButton,
    unloadCassette: unloadCassette,
    resetStereoButton,
    toggleStereoButton: triggerStereoButton,
    resetPlayButton,
    pressPlayButton,
    isPowerOn: isPowerOn, // Expose power state to parent
  }));

  return (
    <group ref={group} position={[0, sceneOffsetY, 0]} dispose={null}>
      {/* Center and Scale the model */}
      <Center top>
        <primitive 
          object={scene} 
          scale={modelScale}
          onClick={(e) => {
            e.stopPropagation();
            const name = e.object.name || '';
            // Selecting music via the cassette mesh (exact match)
            if (name === 'cassete') {
              if (onSelectSongClick) onSelectSongClick();
              return;
            }
            // Volume knob interaction - explicitly use Volume_CONTROL_Action
            if (name.includes('Volume_knob')) {
              const volumeAction = actions[ANIMATION_NAMES.volume];
              if (volumeAction) {
                volumeAction.setLoop(THREE.LoopOnce);
                volumeAction.clampWhenFinished = true;
                volumeAction.enabled = true;
                const isPressed = pressed.current.has(ANIMATION_NAMES.volume);
                const isPlaying = playing.current.has(ANIMATION_NAMES.volume);
                const currentDir = playing.current.get(ANIMATION_NAMES.volume);
                const clip = volumeAction.getClip ? volumeAction.getClip() : volumeAction._clip;
                const duration = (clip && clip.duration) ? clip.duration : 1;
                
                if (!isPressed && !isPlaying) {
                  volumeAction.reset(); 
                  volumeAction.timeScale = 1; 
                  volumeAction.paused = false; 
                  volumeAction.play(); 
                  playing.current.set(ANIMATION_NAMES.volume, 'forward');
                  pressed.current.add(ANIMATION_NAMES.volume);
                  updateLEDStates();
                } else if (isPressed && !isPlaying) {
                  volumeAction.time = Math.max(duration - 1e-6, 0);
                  volumeAction.timeScale = -1;
                  volumeAction.paused = false;
                  volumeAction.play();
                  playing.current.set(ANIMATION_NAMES.volume, 'reverse');
                }
              }
              return;
            }
            // Normal button interactions (reverted)
            if (name.includes('btn_CASSETTE')) { playSequence(); return; }
            if (name.includes('btn_PLAY')) { 
              if (onPlayButtonClick) onPlayButtonClick();
              toggleActionForObject(name);
              return;
            }
            if (name.includes('btn_STEREO')) {
              if (onStereoToggle) onStereoToggle();
              toggleActionForObject(name);
              resetPlayButton();
              resetStereoButton();
              return;
            }
            if (name.includes('btn_POWER')) { toggleActionForObject(name); return; }
            toggleActionForObject(name);
          }} 
        />
      </Center>
    </group>
  );
});

export default function App() {
  const [loading, setLoading] = useState(true);
  const [introFinished, setIntroFinished] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showSelectReminder, setShowSelectReminder] = useState(false);
  const [casseteLoaded, setCasseteLoaded] = useState(false);
  const [showInitialGlow, setShowInitialGlow] = useState(false);
  const [volume, setVolume] = useState(0.7); // Volume state (0 to 1)
  const [previousVolume, setPreviousVolume] = useState(0.7); // Store volume before mute
  const [theme, setTheme] = useState('night');
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  }));
  const audioRef = useRef();
  const audioAnalyzerRef = useRef(null);
  const fileInputRef = useRef(null);
  const mayakRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isPortrait = viewportSize.width < viewportSize.height;
  const modelScale = useMemo(() => (isPortrait ? MODEL_SCALE * 0.5 : MODEL_SCALE), [isPortrait]);
  const sceneOffsetY = useMemo(() => (isPortrait ? SCENE_OFFSET_Y - 0.05 : SCENE_OFFSET_Y), [isPortrait]);
  const contactShadowScale = useMemo(() => (isPortrait ? SHADOW_SCALE * 0.85 : SHADOW_SCALE), [isPortrait]);

  const themeConfig = THEME_CONFIG[theme] || THEME_CONFIG.day;

  // Minimum loading delay to ensure smooth start
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000); // 1 second minimum loading time
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const cls = theme === 'night' ? 'theme-night' : 'theme-day';
    document.body.classList.remove('theme-day', 'theme-night');
    document.body.classList.add(cls);
  }, [theme]);

  // Clean up audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Update audio volume when volume state changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Handle volume change from slider
  const handleVolumeChange = (e) => {
    setVolume(parseFloat(e.target.value));
  };

  // Toggle mute volume
  const handleMute = () => {
    if (volume === 0) {
      // Restore previous volume (or default to 0.7 if somehow it's 0)
      setVolume(previousVolume > 0 ? previousVolume : 0.7);
    } else {
      // Save current volume and mute
      setPreviousVolume(volume);
      setVolume(0);
    }
  };

  // Set max volume
  const handleMaxVolume = () => {
    setVolume(1);
  };

  // Stop audio playback
  const handleStopAudio = () => {
    console.log('handleStopAudio called');
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsPlayingAudio(false);
        console.log('Audio stopped - paused and reset to 0');
      } catch (err) {
        console.error('Error stopping audio:', err);
      }
    } else {
      console.warn('audioRef.current is null');
    }
  };

  // Pause audio without resetting position (for tape eject)
  const pauseAudioWithoutReset = () => {
    console.log('pauseAudioWithoutReset called');
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        // Don't reset currentTime - keep playback position for resume
        setIsPlayingAudio(false);
        console.log('Audio paused - position preserved for resume');
      } catch (err) {
        console.error('Error pausing audio:', err);
      }
    } else {
      console.warn('audioRef.current is null');
    }
  };

  // Handle audio playback state
  const handlePlayAudio = async () => {
    if (!audioRef.current || !audioUrl) return;
    
    // Safety check: ensure cassette is loaded and power is on
    if (!casseteLoaded || !mayakRef.current?.isPowerOn) {
      console.log('Cannot play - cassette not loaded or power off');
      return;
    }
    
    try {
      if (isPlayingAudio) {
        // Pause if already playing
        audioRef.current.pause();
        setIsPlayingAudio(false);
        console.log('Audio paused');
      } else {
        // Initialize analyzer on first play (during user gesture)
        if (!audioAnalyzerRef.current) {
          console.log('Creating audio analyzer during user gesture...');
          audioAnalyzerRef.current = new AudioAnalyzer(audioRef.current);
        }
        
        // Wait for audio to be loaded before initializing Web Audio API
        if (audioRef.current.readyState < 2) {
          console.log('Waiting for audio to load...');
          await new Promise((resolve) => {
            audioRef.current.onloadeddata = resolve;
          });
        }
        
        // Initialize Web Audio API during user gesture
        if (!audioAnalyzerRef.current.audioContext) {
          console.log('Initializing Web Audio API...');
          const success = audioAnalyzerRef.current.init();
          if (!success) {
            console.error('Failed to initialize audio analyzer');
            return;
          }
        }
        
        // Resume audio context if suspended
        if (audioAnalyzerRef.current.audioContext?.state === 'suspended') {
          await audioAnalyzerRef.current.audioContext.resume();
          console.log('Audio context resumed, state:', audioAnalyzerRef.current.audioContext.state);
        }
        
        // Play audio
        await audioRef.current.play();
        setIsPlayingAudio(true);
        console.log('Audio playing, context state:', audioAnalyzerRef.current.audioContext?.state);
        audioRef.current.onended = () => setIsPlayingAudio(false);
      }
    } catch (err) {
      console.error('Failed to toggle audio:', err);
    }
  };

  // Handle power state change from 3D model
  const handlePowerChange = (isPowerOn) => {
    if (!isPowerOn) {
      // Power turned off - stop audio playback
      handleStopAudio();
    }
  };

  // Handle cassette load from 3D model
  const handleCasseteLoaded = () => {
    // Cassette inserted - mark as loaded if audio file exists
    if (audioUrl) {
      console.log('=== CASSETTE LOAD HANDLER CALLED ===');
      setCasseteLoaded(true);
      console.log('casseteLoaded set to:', true);
      console.log('=== CASSETTE LOAD HANDLER COMPLETE ===');
    }
  };

  // Handle tape unload from 3D model
  const handleTapeUnload = () => {
    // Tape ejected - pause audio but preserve playback position
    console.log('=== TAPE UNLOAD HANDLER CALLED ===');
    console.log('casseteLoaded before:', casseteLoaded);
    console.log('isPlayingAudio before:', isPlayingAudio);
    
    pauseAudioWithoutReset();
    setCasseteLoaded(false);
    
    console.log('casseteLoaded after:', false);
    console.log('=== TAPE UNLOAD HANDLER COMPLETE ===');
  };

  // Handle file input
  function handleAudioChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      setShowInitialGlow(false); // Hide initial glow once music is selected

      // Revoke previous object URL to avoid leaks before creating a new one
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }

      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      
      // Stop and reset current audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsPlayingAudio(false);
      
      // Handle cassette loading logic
      if (casseteLoaded) {
        setCasseteLoaded(false);
        if (mayakRef.current) {
          mayakRef.current.unloadCassette();
        }
        // Wait for unload animation to complete, then load the new cassette
        setTimeout(() => {
          if (mayakRef.current) {
            mayakRef.current.loadCassette();
          }
          setCasseteLoaded(true);
        }, CASSETTE_UNLOAD_DURATION);
      } else {
        // No cassette loaded yet - just load the new one
        if (mayakRef.current) {
          mayakRef.current.powerOn();
          mayakRef.current.loadCassette();
        }
        setCasseteLoaded(true);
      }
      
      // Dismiss reminder once a song is chosen
      setShowSelectReminder(false);
    } catch (err) {
      console.error('Failed to load audio file:', err);
    }
  }

  const handleSelectSongClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handlePlayPauseClick = async (fromStereo = false) => {
    // Check if power is off or cassette is not loaded
    if (!mayakRef.current?.isPowerOn) {
      console.log('Power is off - cannot play');
      return;
    }
    if (!casseteLoaded) {
      setShowSelectReminder(true);
      if (fileInputRef.current) fileInputRef.current.click();
      return;
    }
    
    // If currently playing, pause and unpress the play button
    if (isPlayingAudio && mayakRef.current) {
      console.log('Audio is playing, pausing...');
      await handlePlayAudio(); // This will pause
      mayakRef.current.resetPlayButton();
      return;
    }
    
    // Audio is not playing, so start it and press the button
    console.log('Audio not playing, starting playback and pressing button');
    if (mayakRef.current) {
      mayakRef.current.pressPlayButton();
      if (!fromStereo) {
        mayakRef.current.toggleStereoButton();
      }
    }
    await handlePlayAudio();
  };

  const handleStereoClick = () => {
    // Stop audio and return buttons to unpressed state
    handleStopAudio();
    setIsPlayingAudio(false);
    if (mayakRef.current) {
      mayakRef.current.resetPlayButton();
      mayakRef.current.resetStereoButton();
    }
  };

  // Auto-hide reminder after a short delay
  useEffect(() => {
    if (!showSelectReminder) return;
    const t = setTimeout(() => setShowSelectReminder(false), REMINDER_AUTO_HIDE_DELAY);
    return () => clearTimeout(t);
  }, [showSelectReminder]);

  // Show initial glow when intro finishes
  useEffect(() => {
    if (introFinished && !audioUrl) {
      setShowInitialGlow(true);
    }
  }, [introFinished, audioUrl]);

  return (
    // 1. Remove the background color from the div so it doesn't conflict
    <div className="canvas-shell">
      <div className="canvas-stage">
      
      <Canvas shadows camera={{ position: CAMERA_POSITION, fov: CAMERA_FOV }}>
        
        {/* Fog to blend 3D scene with CSS background */}
        <fog attach="fog" args={[themeConfig.fogColor, FOG_NEAR, FOG_FAR]} />

        <ambientLight intensity={AMBIENT_INTENSITY} />
        <spotLight
          position={[10, 15, 10]}
          angle={0.3}
          penumbra={1}
          intensity={SPOT_INTENSITY}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0001}
        />

        <Environment preset="apartment" environmentIntensity={ENVIRONMENT_INTENSITY} />

        <Suspense fallback={null}>
        <MayakModel 
          ref={mayakRef}
          audioAnalyzer={audioAnalyzerRef.current} 
          isPlayingAudio={isPlayingAudio}
          onSelectSongClick={handleSelectSongClick}
          onStereoToggle={handleStereoClick}
          volume={volume}
          onPowerChange={handlePowerChange}
          onTapeUnload={handleTapeUnload}
          onCasseteLoaded={handleCasseteLoaded}
          modelScale={modelScale}
          sceneOffsetY={sceneOffsetY}
          onPlayButtonClick={async () => {
            if (audioUrl) {
              console.log('Play button clicked, starting audio');
              await handlePlayAudio();
              if (mayakRef.current) {
                mayakRef.current.resetStereoButton();
              }
            }
          }}
        />
        </Suspense>

        {/* Post-processing for bloom on emissive LEDs */}
        <EffectComposer multisampling={0}>
          <Bloom intensity={BLOOM_INTENSITY} luminanceThreshold={BLOOM_LUMINANCE_THRESHOLD} mipmapBlur radius={BLOOM_RADIUS} />
        </EffectComposer>

        {/* 3. ADD THIS LINE HERE (This creates the curved wall) */}
        <StudioBackground color={themeConfig.backdropColor} />

        <OrbitControls makeDefault enabled={introFinished} minPolarAngle={0} maxPolarAngle={Math.PI / 2} />

        {!loading && !introFinished && (
          <Intro onFinish={() => setIntroFinished(true)} />
        )}

        {/* Optional: You can remove ContactShadows now because the Background catches real shadows. 
            Or keep it if you want extra darkness under the object. */}
        <ContactShadows 
          position={[0, sceneOffsetY, 0]}
          resolution={1024} 
          scale={contactShadowScale} 
          blur={SHADOW_BLUR} 
          opacity={SHADOW_OPACITY}
          far={10}
          color="#000000" 
        />
        
      </Canvas>

      </div>

      {/* Loading Screen */}
      {loading && (
        <div className="loading-screen">
          <div className="loading-dots">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        </div>
      )}

      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/mp3,audio/mpeg"
        onChange={handleAudioChange}
        style={{ display: 'none' }}
      />

      {/* UI Overlay */}
      <div className="ui-overlay">
        <div className="theme-toggle" title="Toggle day/night theme">
          <button
            className={`theme-switch ${theme}`}
            onClick={() => setTheme(theme === 'day' ? 'night' : 'day')}
          >
            <span className="theme-switch-text">{theme === 'day' ? 'Day' : 'Night'}</span>
            <span className="theme-switch-track">
              <span className="theme-switch-knob" />
            </span>
          </button>
        </div>
        <div className="hero-title">Маяк МП 140 С</div>
        <div className="controls-container">
          <div className="controls-bar">
            <div className="select-wrapper">
              {showSelectReminder && (
                <div className="reminder-pop">Please select a song firstly</div>
              )}
              <button className={`ui-btn primary ${showSelectReminder ? 'glow' : ''} ${showInitialGlow ? 'glow-green' : ''}`} onClick={handleSelectSongClick}>
                Select Music
              </button>
            </div>
            <div className="play-wrapper">
              {!casseteLoaded && (
                <div className="play-tooltip">Please select music first</div>
              )}
              <button className={`ui-btn ghost ${isPlayingAudio ? 'playing' : ''} ${!casseteLoaded ? 'disabled' : ''}`} onClick={handlePlayPauseClick}>
                {isPlayingAudio ? 'Pause' : 'Play'}
              </button>
            </div>
          </div>
          <div className="volume-control">
          <svg className="volume-icon clickable" viewBox="0 0 24 24" width="24" height="24" onClick={handleMute}>
            {volume === 0 ? (
              <path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
            ) : (
              <path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
            )}
          </svg>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="volume-slider"
          />
          <svg className="volume-icon clickable" viewBox="0 0 24 24" width="24" height="24" onClick={handleMaxVolume}>
            <path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
          </div>
        </div>
      </div>

      {/* Hidden Audio Element - Always rendered */}
      <audio 
        ref={audioRef} 
        src={audioUrl || ''}
        style={{ display: 'none' }}
        crossOrigin="anonymous"
        preload="auto"
      />
    </div>
  );
}