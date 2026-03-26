import { useState, useEffect, useRef, useCallback } from "react";

// ============================================================
// CONSTANTS
// ============================================================
const NOKIA_GREEN = "#8bac0f";
const NOKIA_DARK = "#306230";
const NOKIA_LIGHT = "#9bbc0f";
const NOKIA_BLACK = "#0f380f";
const SCREEN_BG = "#9bbc0f";

const SMS_MAX_CHARS = 160;
const SMS_COST = 2; // credits per SMS
const CALL_COST_PER_SEC = 1; // credits per 10s

const TEMPLATES = [
  "Ik ben onderweg.",
  "Bel me terug!",
  "Komt niet uit.",
  "Tot straks!",
  "Waar ben je?",
];

// Fake contacts for demo
const DEMO_CONTACTS = [
  { name: "Mama", number: "+32477000001" },
  { name: "Papa", number: "+32477000002" },
  { name: "Stef", number: "+32495123456" },
  { name: "Laura", number: "+32478987654" },
];

// Fake inbox messages
const DEMO_INBOX = [
  { from: "+32477000001", name: "Mama", text: "Wanneer kom je thuis?", time: "11:23", read: false },
  { from: "+32495123456", name: "Stef", text: "Vanavond voetbal?", time: "09:14", read: true },
  { from: "+32478987654", name: "Laura", text: "Ik ben al aan het wachten!!", time: "Gisteren", read: true },
];

// Nokia ringtone frequencies [freq, duration]
const NOKIA_TUNE = [
  [659, 150], [587, 150], [370, 300], [415, 300],
  [554, 150], [494, 150], [294, 300], [330, 300],
  [554, 150], [494, 150], [370, 300], [415, 300],
  [659, 300],
];

// ============================================================
// AUDIO ENGINE
// ============================================================
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playNote(freq, duration, startTime) {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "square";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.3, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration / 1000 - 0.01);
  osc.start(startTime);
  osc.stop(startTime + duration / 1000);
}

function playRingtone() {
  const ctx = getAudioCtx();
  let t = ctx.currentTime + 0.05;
  NOKIA_TUNE.forEach(([freq, dur]) => {
    playNote(freq, dur, t);
    t += dur / 1000 + 0.02;
  });
}

function playBeep(freq = 880, dur = 80) {
  const ctx = getAudioCtx();
  playNote(freq, dur, ctx.currentTime + 0.01);
}

function playSMSSound() {
  const ctx = getAudioCtx();
  const t = ctx.currentTime + 0.01;
  playNote(1200, 60, t);
  playNote(900, 60, t + 0.08);
  playNote(1200, 100, t + 0.16);
}

// ============================================================
// SNAKE GAME
// ============================================================
function SnakeGame({ onExit }) {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const scoreRef = useRef(0);

  const CELL = 8;
  const COLS = 18;
  const ROWS = 14;

  const initGame = useCallback(() => {
    scoreRef.current = 0;
    setScore(0);
    setGameOver(false);
    return {
      snake: [{ x: 9, y: 7 }, { x: 8, y: 7 }, { x: 7, y: 7 }],
      dir: { x: 1, y: 0 },
      nextDir: { x: 1, y: 0 },
      food: { x: 14, y: 5 },
      alive: true,
      speed: 180,
      lastMove: 0,
    };
  }, []);

  const placeFood = (snake) => {
    let pos;
    do {
      pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
    } while (snake.some(s => s.x === pos.x && s.y === pos.y));
    return pos;
  };

  useEffect(() => {
    if (!started) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    gameRef.current = initGame();
    let animId;

    const draw = () => {
      const g = gameRef.current;
      ctx.fillStyle = NOKIA_LIGHT;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid dots
      ctx.fillStyle = NOKIA_GREEN;
      for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) {
        ctx.fillRect(x * CELL + 3, y * CELL + 3, 1, 1);
      }

      // Food
      ctx.fillStyle = NOKIA_BLACK;
      ctx.fillRect(g.food.x * CELL + 1, g.food.y * CELL + 1, CELL - 2, CELL - 2);

      // Snake
      g.snake.forEach((seg, i) => {
        ctx.fillStyle = i === 0 ? NOKIA_BLACK : NOKIA_DARK;
        ctx.fillRect(seg.x * CELL, seg.y * CELL, CELL - 1, CELL - 1);
      });
    };

    const tick = (ts) => {
      const g = gameRef.current;
      if (!g.alive) return;

      if (ts - g.lastMove > g.speed) {
        g.lastMove = ts;
        g.dir = g.nextDir;

        const head = {
          x: (g.snake[0].x + g.dir.x + COLS) % COLS,
          y: (g.snake[0].y + g.dir.y + ROWS) % ROWS,
        };

        if (g.snake.some(s => s.x === head.x && s.y === head.y)) {
          g.alive = false;
          playBeep(200, 300);
          setGameOver(true);
          return;
        }

        g.snake.unshift(head);

        if (head.x === g.food.x && head.y === g.food.y) {
          scoreRef.current += 10;
          setScore(scoreRef.current);
          g.food = placeFood(g.snake);
          g.speed = Math.max(80, g.speed - 3);
          playBeep(1200, 60);
        } else {
          g.snake.pop();
        }
      }

      draw();
      animId = requestAnimationFrame(tick);
    };

    draw();
    animId = requestAnimationFrame(tick);

    const handleKey = (e) => {
      const g = gameRef.current;
      if (!g) return;
      const dirs = {
        ArrowUp: { x: 0, y: -1 }, "2": { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 }, "8": { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 }, "4": { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 }, "6": { x: 1, y: 0 },
      };
      const d = dirs[e.key];
      if (d && !(d.x === -g.dir.x && d.y === -g.dir.y)) {
        g.nextDir = d;
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("keydown", handleKey);
    };
  }, [started, initGame]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      {!started ? (
        <div style={{ textAlign: "center", fontFamily: "monospace" }}>
          <div style={{ fontSize: 11, color: NOKIA_BLACK, marginBottom: 12, fontWeight: "bold" }}>SNAKE II</div>
          <div style={{ fontSize: 9, color: NOKIA_DARK, marginBottom: 16 }}>
            Gebruik pijltjestoetsen<br />of 2/4/6/8
          </div>
          <button
            onClick={() => setStarted(true)}
            style={{ ...btnStyle, width: 80, fontSize: 9 }}
          >START</button>
        </div>
      ) : gameOver ? (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, color: NOKIA_BLACK, fontWeight: "bold", marginBottom: 6 }}>GAME OVER</div>
          <div style={{ fontSize: 9, color: NOKIA_DARK, marginBottom: 10 }}>Score: {score}</div>
          <button onClick={() => { gameRef.current = initGame(); setStarted(true); setGameOver(false); }}
            style={{ ...btnStyle, width: 80, fontSize: 9, marginBottom: 6 }}>OPNIEUW</button>
          <br />
          <button onClick={onExit} style={{ ...btnStyle, width: 80, fontSize: 9, background: "#c44" }}>TERUG</button>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 9, color: NOKIA_BLACK, fontFamily: "monospace", marginBottom: 2 }}>
            Score: {score}
          </div>
          <canvas
            ref={canvasRef}
            width={COLS * CELL}
            height={ROWS * CELL}
            style={{ border: `2px solid ${NOKIA_DARK}`, imageRendering: "pixelated" }}
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 32px)", gap: 2, marginTop: 6 }}>
            {[["↑", { x: 0, y: -1 }], ["", null], ["", null],
              ["←", { x: -1, y: 0 }], ["↓", { x: 0, y: 1 }], ["→", { x: 1, y: 0 }]]
              .map(([label, dir], i) => (
                <button key={i}
                  onClick={() => { if (dir && gameRef.current) { const g = gameRef.current; if (!(dir.x === -g.dir.x && dir.y === -g.dir.y)) g.nextDir = dir; } }}
                  style={{ ...btnStyle, width: 32, height: 28, fontSize: 11, padding: 0, visibility: label ? "visible" : "hidden" }}
                >{label}</button>
              ))}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// BUTTON STYLE HELPER
// ============================================================
const btnStyle = {
  background: NOKIA_DARK,
  color: NOKIA_LIGHT,
  border: "none",
  borderRadius: 3,
  padding: "4px 8px",
  cursor: "pointer",
  fontFamily: "monospace",
  fontSize: 10,
  fontWeight: "bold",
  letterSpacing: 1,
  userSelect: "none",
  WebkitUserSelect: "none",
  transition: "all 0.1s",
};

// ============================================================
// MAIN APP
// ============================================================
export default function Nokia3310() {
  // Auth state
  const [screen, setScreen] = useState("boot"); // boot | pinentry | main
  const [pin, setPin] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [phoneNumber] = useState("+32477123456");
  const [userName] = useState("Arne");

  // System
  const [time, setTime] = useState("");
  const [battery] = useState(4); // 0-4
  const [signal] = useState(4); // 0-4
  const [credits, setCredits] = useState(500);
  const [vibrating, setVibrating] = useState(false);

  // Navigation
  const [menuStack, setMenuStack] = useState([]); // stack of menu ids
  const [menuIndex, setMenuIndex] = useState(0);

  // SMS
  const [inbox] = useState(DEMO_INBOX);
  const [sent, setSent] = useState([]);
  const [smsText, setSmsText] = useState("");
  const [smsTo, setSmsTo] = useState("");
  const [smsStep, setSmsStep] = useState("to"); // to | text | confirm
  const [viewingMsg, setViewingMsg] = useState(null);

  // Call
  const [callState, setCallState] = useState("idle"); // idle | calling | connected | incoming
  const [callTarget, setCallTarget] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [dialInput, setDialInput] = useState("");
  const callTimerRef = useRef(null);
  const ringtoneRef = useRef(null);

  // Settings
  const [welcomeText, setWelcomeText] = useState("Hallo!");
  const [editingWelcome, setEditingWelcome] = useState(false);
  const [contrast] = useState(3);
  const [ringtone, setRingtone] = useState("Nokia tune");
  const [volume, setVolume] = useState(3);

  // Recharge
  const [rechargeCode, setRechargeCode] = useState("");
  const [rechargeMsg, setRechargeMsg] = useState("");

  // Setup
  const [setupStep, setSetupStep] = useState("number"); // number | pin | pin2
  const [setupNumber, setSetupNumber] = useState("");
  const [setupPin, setSetupPin] = useState("");
  const [setupPin2, setSetupPin2] = useState("");
  const [setupError, setSetupError] = useState("");
  const [isNewUser] = useState(true);

  const inputRef = useRef(null);

  // Clock
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Boot sequence
  useEffect(() => {
    if (screen === "boot") {
      playBeep(880, 100);
      const t = setTimeout(() => {
        setScreen(isNewUser ? "setup" : "pinentry");
      }, 2200);
      return () => clearTimeout(t);
    }
  }, [screen, isNewUser]);

  // Call timer
  useEffect(() => {
    if (callState === "connected") {
      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        setCallDuration(p => {
          if ((p + 1) % 10 === 0) setCredits(c => Math.max(0, c - CALL_COST_PER_SEC));
          return p + 1;
        });
      }, 1000);
    } else {
      clearInterval(callTimerRef.current);
    }
    return () => clearInterval(callTimerRef.current);
  }, [callState]);

  // Simulate incoming call after 8s for demo
  useEffect(() => {
    if (screen !== "main") return;
    const t = setTimeout(() => {
      setCallTarget({ name: "Mama", number: "+32477000001" });
      setCallState("incoming");
      setVibrating(true);
      try { playRingtone(); } catch (e) {}
    }, 12000);
    return () => clearTimeout(t);
  }, [screen]);

  useEffect(() => {
    if (callState !== "incoming") setVibrating(false);
  }, [callState]);

  // Navigation helpers
  const currentMenu = menuStack[menuStack.length - 1] || "home";
  const navigate = (menu, idx = 0) => {
    playBeep(1100, 40);
    setMenuStack(s => [...s, menu]);
    setMenuIndex(idx);
  };
  const goBack = () => {
    playBeep(600, 40);
    if (menuStack.length === 0) return;
    setMenuStack(s => s.slice(0, -1));
    setMenuIndex(0);
    setSmsStep("to");
    setSmsText("");
    setSmsTo("");
    setDialInput("");
    setViewingMsg(null);
    setRechargeCode("");
    setRechargeMsg("");
    setEditingWelcome(false);
  };

  const formatDuration = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const resolveContactName = (number) => {
    const c = DEMO_CONTACTS.find(c => c.number === number);
    return c ? c.name : number;
  };

  const handleCall = (target) => {
    if (credits < 10) { alert("Onvoldoende beltegoed!"); return; }
    setCallTarget(target);
    setCallState("calling");
    playBeep(800, 100);
    navigate("incall");
    // Simulate answer after 3s
    setTimeout(() => {
      setCallState("connected");
      playBeep(1200, 80);
    }, 3000);
  };

  const handleHangUp = () => {
    setCallState("idle");
    setCallTarget(null);
    setCallDuration(0);
    goBack();
  };

  const handleAcceptCall = () => {
    setCallState("connected");
    setVibrating(false);
    navigate("incall");
  };

  const handleRejectCall = () => {
    setCallState("idle");
    setCallTarget(null);
    setVibrating(false);
  };

  const handleSendSMS = () => {
    if (!smsTo || !smsText) return;
    if (credits < SMS_COST) { alert("Onvoldoende beltegoed!"); return; }
    setCredits(c => c - SMS_COST);
    setSent(s => [{ to: smsTo, text: smsText, time: time }, ...s]);
    playSMSSound();
    setSmsText("");
    setSmsTo("");
    setSmsStep("to");
    setMenuStack(["messages"]);
    setMenuIndex(0);
  };

  const handleRecharge = () => {
    const valid = { "*101*1234#": 100, "*101*5678#": 250, "*101*9999#": 500 };
    const val = valid[rechargeCode.trim()];
    if (val) {
      setCredits(c => c + val);
      setRechargeMsg(`+${val} credits toegevoegd!`);
      playBeep(1200, 200);
    } else {
      setRechargeMsg("Ongeldige code.");
      playBeep(200, 300);
    }
  };

  const handleKeyPress = (key) => {
    playBeep(1000 + Math.random() * 200, 30);
    // Route key input to appropriate handler
    if (screen === "setup") handleSetupKey(key);
    else if (screen === "pinentry") handlePinKey(key);
    else handleMainKey(key);
  };

  const handleSetupKey = (key) => {
    if (key === "C") {
      if (setupStep === "number") setSetupNumber(p => p.slice(0, -1));
      if (setupStep === "pin") setSetupPin(p => p.slice(0, -1));
      if (setupStep === "pin2") setSetupPin2(p => p.slice(0, -1));
      return;
    }
    if (key === "OK") {
      if (setupStep === "number") {
        if (setupNumber.length < 8) { setSetupError("Nummer te kort"); return; }
        setSetupError(""); setSetupStep("pin");
      } else if (setupStep === "pin") {
        if (setupPin.length < 4) { setSetupError("PIN min 4 cijfers"); return; }
        setSetupError(""); setSetupStep("pin2");
      } else if (setupStep === "pin2") {
        if (setupPin2 !== setupPin) { setSetupError("PIN komt niet overeen"); return; }
        setPin(setupPin);
        setScreen("main");
      }
      return;
    }
    if (/\d/.test(key)) {
      if (setupStep === "number") setSetupNumber(p => (p + key).slice(0, 15));
      if (setupStep === "pin") setSetupPin(p => (p + key).slice(0, 6));
      if (setupStep === "pin2") setSetupPin2(p => (p + key).slice(0, 6));
    }
    if (key === "+" && setupStep === "number") setSetupNumber(p => p.length === 0 ? "+" : p);
  };

  const handlePinKey = (key) => {
    if (key === "C") { setPinInput(p => p.slice(0, -1)); setPinError(""); return; }
    if (key === "OK") {
      if (pinInput === pin) { setScreen("main"); setPinInput(""); }
      else { setPinError("Verkeerde PIN"); setPinInput(""); playBeep(200, 200); }
      return;
    }
    if (/\d/.test(key)) setPinInput(p => (p + key).slice(0, 6));
  };

  const handleMainKey = (key) => {
    if (callState === "incoming") {
      if (key === "GREEN") handleAcceptCall();
      if (key === "RED") handleRejectCall();
      return;
    }
    if (currentMenu === "incall") {
      if (key === "RED") handleHangUp();
      return;
    }

    const menus = getMenuItems(currentMenu);

    if (key === "UP") setMenuIndex(i => (i - 1 + menus.length) % menus.length);
    if (key === "DOWN") setMenuIndex(i => (i + 1) % menus.length);
    if (key === "OK" || key === "GREEN") {
      const item = menus[menuIndex];
      if (item) item.action();
    }
    if (key === "RED" || key === "BACK") {
      if (menuStack.length > 0) goBack();
    }

    // Numpad shortcuts on home
    if (currentMenu === "home" && /\d/.test(key)) {
      const idx = parseInt(key) - 1;
      if (idx >= 0 && idx < menus.length) { setMenuIndex(idx); menus[idx].action(); }
    }

    // Dial input
    if (currentMenu === "dialscreen") {
      if (/[\d+*#]/.test(key)) setDialInput(p => p + key);
      if (key === "C") setDialInput(p => p.slice(0, -1));
      if (key === "GREEN") {
        if (dialInput) handleCall({ number: dialInput, name: resolveContactName(dialInput) });
      }
    }

    // SMS compose
    if (currentMenu === "smsnew") {
      if (smsStep === "to") {
        if (/[\d+]/.test(key)) setSmsTo(p => p + key);
        if (key === "C") setSmsTo(p => p.slice(0, -1));
        if (key === "DOWN") setSmsStep("text");
      }
      if (smsStep === "text") {
        if (key === "C") setSmsText(p => p.slice(0, -1));
        if (key === "OK") setSmsStep("confirm");
      }
    }

    // Recharge
    if (currentMenu === "recharge") {
      if (/[\d*#]/.test(key)) setRechargeCode(p => p + key);
      if (key === "C") setRechargeCode(p => p.slice(0, -1));
      if (key === "GREEN") handleRecharge();
    }

    // Ringtone select
    if (currentMenu === "ringtones") {
      const tones = ["Nokia tune", "Ascending", "Beep once", "Vibrate only"];
      if (key === "OK") setRingtone(tones[menuIndex]);
    }

    // Volume
    if (currentMenu === "volume") {
      if (key === "UP" || key === "6") setVolume(v => Math.min(5, v + 1));
      if (key === "DOWN" || key === "4") setVolume(v => Math.max(0, v - 1));
    }
  };

  const getMenuItems = (menu) => {
    switch (menu) {
      case "home":
        return [
          { label: "Berichten", icon: "✉", action: () => navigate("messages") },
          { label: "Bellen", icon: "📞", action: () => navigate("calls") },
          { label: "Contacten", icon: "👤", action: () => navigate("contacts") },
          { label: "Spelletjes", icon: "🎮", action: () => navigate("games") },
          { label: "Instellingen", icon: "⚙", action: () => navigate("settings") },
          { label: "Rekenmachine", icon: "🔢", action: () => navigate("calculator") },
        ];
      case "messages":
        return [
          { label: "Postvak IN", action: () => navigate("inbox") },
          { label: "Verzonden", action: () => navigate("sent") },
          { label: "Nieuw bericht", action: () => navigate("smsnew") },
          { label: "Sjablonen", action: () => navigate("templates") },
        ];
      case "calls":
        return [
          { label: "Kies nummer", action: () => navigate("dialscreen") },
          { label: "Oproeplijst", action: () => navigate("calllog") },
          { label: "Snelkiezen", action: () => navigate("speeddial") },
        ];
      case "contacts":
        return DEMO_CONTACTS.map(c => ({
          label: c.name,
          sub: c.number,
          action: () => { setCallTarget(c); navigate("contactdetail"); },
        }));
      case "contactdetail":
        return [
          { label: "Bellen", action: () => handleCall(callTarget) },
          { label: "SMS sturen", action: () => { setSmsTo(callTarget?.number || ""); setSmsStep("text"); navigate("smsnew"); } },
        ];
      case "games":
        return [
          { label: "Snake II", action: () => navigate("snake") },
          { label: "Memory", action: () => navigate("memory") },
        ];
      case "settings":
        return [
          { label: "Beltonen", action: () => navigate("ringtones") },
          { label: "Volume", action: () => navigate("volume") },
          { label: "Weergave", action: () => navigate("display") },
          { label: "PIN wijzigen", action: () => navigate("pinchange") },
          { label: "Beltegoed", action: () => navigate("credit") },
          { label: "Toestelinfo", action: () => navigate("deviceinfo") },
        ];
      case "credit":
        return [
          { label: "Tegoed bekijken", action: () => navigate("creditview") },
          { label: "Tegoed opladen", action: () => navigate("recharge") },
        ];
      case "ringtones":
        return ["Nokia tune", "Ascending", "Beep once", "Vibrate only"].map(t => ({
          label: t, action: () => { setRingtone(t); playRingtone(); }
        }));
      case "inbox":
        return inbox.map((m, i) => ({
          label: (m.read ? "" : "● ") + (m.name || m.from),
          sub: m.text.slice(0, 20) + (m.text.length > 20 ? "..." : ""),
          action: () => { setViewingMsg(m); navigate("viewmsg"); },
        }));
      case "sent":
        return sent.length === 0
          ? [{ label: "(leeg)", action: () => {} }]
          : sent.map((m, i) => ({
              label: resolveContactName(m.to),
              sub: m.text.slice(0, 20),
              action: () => { setViewingMsg(m); navigate("viewmsg"); },
            }));
      case "templates":
        return TEMPLATES.map(t => ({
          label: t, action: () => { setSmsText(t); setSmsStep("text"); navigate("smsnew"); }
        }));
      case "calllog":
        return [
          { label: "Gemiste oproepen", action: () => {} },
          { label: "Ontvangen oproepen", action: () => {} },
          { label: "Gekozen nummers", action: () => {} },
        ];
      case "display":
        return [
          { label: "Welkomsttekst", action: () => setEditingWelcome(true) },
          { label: "Contrast", action: () => {} },
        ];
      case "volume":
        return [0, 1, 2, 3, 4, 5].map(v => ({
          label: `Volume ${v} ${"█".repeat(v)}${"░".repeat(5 - v)}`,
          action: () => setVolume(v),
        }));
      default:
        return [{ label: "Terug", action: goBack }];
    }
  };

  // ============================================================
  // SCREEN CONTENT RENDERER
  // ============================================================
  const renderScreen = () => {
    if (screen === "boot") return <BootScreen welcomeText={welcomeText} />;
    if (screen === "setup") return <SetupScreen step={setupStep} number={setupNumber} pin={setupPin} pin2={setupPin2} error={setupError} />;
    if (screen === "pinentry") return <PinScreen input={pinInput} error={pinError} />;

    if (callState === "incoming") return (
      <IncomingCallScreen target={callTarget} vibrating={vibrating} />
    );

    if (currentMenu === "incall") return (
      <InCallScreen target={callTarget} state={callState} duration={callDuration} formatDuration={formatDuration} />
    );

    if (currentMenu === "snake") return (
      <SnakeGame onExit={goBack} />
    );

    if (currentMenu === "memory") return <MemoryGame onExit={goBack} />;

    if (currentMenu === "calculator") return <Calculator onExit={goBack} onKey={playBeep} />;

    if (currentMenu === "smsnew") return (
      <SMSCompose to={smsTo} text={smsText} step={smsStep}
        onToChange={setSmsTo} onTextChange={t => setSmsText(t.slice(0, SMS_MAX_CHARS))}
        onSend={handleSendSMS} onBack={goBack} credits={credits} smsCost={SMS_COST} />
    );

    if (currentMenu === "viewmsg") return (
      <ViewMessage msg={viewingMsg} onBack={goBack} />
    );

    if (currentMenu === "dialscreen") return (
      <DialScreen input={dialInput} onCall={() => handleCall({ number: dialInput, name: resolveContactName(dialInput) })} />
    );

    if (currentMenu === "creditview") return (
      <CreditView credits={credits} />
    );

    if (currentMenu === "recharge") return (
      <RechargeScreen code={rechargeCode} onCodeChange={setRechargeCode} onRedeem={handleRecharge} msg={rechargeMsg} />
    );

    if (currentMenu === "deviceinfo") return (
      <DeviceInfo number={phoneNumber} />
    );

    if (currentMenu === "pinchange") return (
      <div style={screenTextStyle}>
        <div style={{ fontSize: 9, marginBottom: 8 }}>PIN WIJZIGEN</div>
        <div style={{ fontSize: 8, color: NOKIA_DARK }}>Functie beschikbaar<br />in volgende versie.</div>
      </div>
    );

    // Default: menu list
    const items = getMenuItems(currentMenu);
    return (
      <MenuList
        items={items}
        activeIndex={menuIndex}
        title={menuTitles[currentMenu] || currentMenu.toUpperCase()}
      />
    );
  };

  const menuTitles = {
    home: "MENU",
    messages: "BERICHTEN",
    calls: "BELLEN",
    contacts: "CONTACTEN",
    games: "SPELLETJES",
    settings: "INSTELLINGEN",
    credit: "BELTEGOED",
    ringtones: "BELTONEN",
    inbox: "POSTVAK IN",
    sent: "VERZONDEN",
    templates: "SJABLONEN",
    calllog: "OPROEPLIJST",
    display: "WEERGAVE",
    volume: "VOLUME",
    contactdetail: callTarget?.name || "CONTACT",
    speeddial: "SNELKIEZEN",
  };

  // ============================================================
  // PHYSICAL KEYBOARD SUPPORT
  // ============================================================
  useEffect(() => {
    const handler = (e) => {
      const map = {
        ArrowUp: "UP", ArrowDown: "DOWN", ArrowLeft: "BACK", ArrowRight: "OK",
        Enter: "OK", Escape: "RED", Backspace: "C",
        F1: "GREEN", F2: "RED",
      };
      const key = map[e.key] || (e.key.length === 1 ? e.key : null);
      if (key) { e.preventDefault(); handleKeyPress(key); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "100vh",
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
      fontFamily: "'Courier New', monospace",
      userSelect: "none",
    }}>
      {/* Phone body */}
      <div style={{
        position: "relative",
        width: 220,
        background: "linear-gradient(180deg, #1c1c1c 0%, #2a2a2a 40%, #1a1a1a 100%)",
        borderRadius: "36px 36px 48px 48px",
        padding: "12px 16px 24px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1), 0 0 0 1px #111",
        animation: vibrating ? "vibrate 0.1s infinite" : "none",
      }}>
        {/* Nokia logo */}
        <div style={{
          textAlign: "center", color: "#c0c0c0", fontSize: 10,
          letterSpacing: 6, fontWeight: "bold", padding: "4px 0 8px",
          textTransform: "uppercase",
        }}>NOKIA</div>

        {/* Screen bezel */}
        <div style={{
          background: "#111", borderRadius: 8, padding: 6,
          boxShadow: "inset 0 2px 8px rgba(0,0,0,0.9), 0 1px 0 rgba(255,255,255,0.05)",
        }}>
          {/* Status bar */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: NOKIA_BLACK, padding: "2px 4px", marginBottom: 2,
            borderRadius: "4px 4px 0 0",
          }}>
            <SignalIcon bars={signal} />
            <span style={{ color: NOKIA_LIGHT, fontSize: 8, fontWeight: "bold" }}>{time}</span>
            <BatteryIcon bars={battery} />
          </div>

          {/* Screen */}
          <div style={{
            background: SCREEN_BG,
            width: "100%", height: 110,
            overflow: "hidden",
            display: "flex", flexDirection: "column",
            padding: "4px 6px",
            boxSizing: "border-box",
            position: "relative",
          }}>
            {renderScreen()}
          </div>

          {/* Soft key labels */}
          <div style={{
            display: "flex", justifyContent: "space-between",
            background: NOKIA_BLACK, padding: "2px 8px",
            borderRadius: "0 0 4px 4px",
          }}>
            <span style={{ color: NOKIA_LIGHT, fontSize: 7 }}>
              {screen === "main" && menuStack.length > 0 ? "TERUG" : "MENU"}
            </span>
            <span style={{ color: NOKIA_LIGHT, fontSize: 7 }}>NAMEN</span>
          </div>
        </div>

        {/* Navigation cluster */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
          <div style={{ position: "relative", width: 72, height: 72 }}>
            {/* D-pad ring */}
            <div style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              background: "linear-gradient(145deg, #3a3a3a, #222)",
              boxShadow: "0 3px 6px rgba(0,0,0,0.5)",
            }} />
            <PhysBtn label="▲" style={{ top: 2, left: "50%", transform: "translateX(-50%)" }} onClick={() => handleKeyPress("UP")} />
            <PhysBtn label="▼" style={{ bottom: 2, left: "50%", transform: "translateX(-50%)" }} onClick={() => handleKeyPress("DOWN")} />
            <PhysBtn label="◄" style={{ left: 2, top: "50%", transform: "translateY(-50%)" }} onClick={() => handleKeyPress("BACK")} />
            <PhysBtn label="►" style={{ right: 2, top: "50%", transform: "translateY(-50%)" }} onClick={() => handleKeyPress("OK")} />
            {/* Center OK */}
            <button onClick={() => handleKeyPress("OK")} style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              width: 22, height: 22, borderRadius: "50%",
              background: "linear-gradient(145deg, #555, #333)",
              border: "none", cursor: "pointer", color: "#aaa", fontSize: 7, fontWeight: "bold",
            }}>OK</button>
          </div>
        </div>

        {/* Green / Red call buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, padding: "0 10px" }}>
          <PhysCallBtn color="#2d7a2d" onClick={() => handleKeyPress("GREEN")} label="📞" />
          <PhysCallBtn color="#7a2d2d" onClick={() => handleKeyPress("RED")} label="🔴" />
        </div>

        {/* Numpad */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          gap: 4, marginTop: 8, padding: "0 4px",
        }}>
          {["1", "2\nABC", "3\nDEF", "4\nGHI", "5\nJKL", "6\nMNO",
            "7\nPQRS", "8\nTUV", "9\nWXYZ", "*", "0\n+", "#"].map((k, i) => {
            const [main, sub] = k.split("\n");
            return (
              <button key={i} onClick={() => handleKeyPress(main === "0" ? "0" : main)}
                style={{
                  background: "linear-gradient(145deg, #3a3a3a, #252525)",
                  border: "1px solid #444",
                  borderRadius: 6, padding: "5px 2px",
                  cursor: "pointer", color: "#ddd",
                  fontSize: 12, fontWeight: "bold",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", lineHeight: 1,
                  boxShadow: "0 2px 4px rgba(0,0,0,0.4)",
                  transition: "all 0.05s",
                  fontFamily: "monospace",
                }}>
                <span>{main}</span>
                {sub && <span style={{ fontSize: 6, color: "#888", marginTop: 1 }}>{sub}</span>}
              </button>
            );
          })}
        </div>

        {/* C button */}
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "4px 4px 0", marginTop: 2 }}>
          <button onClick={() => handleKeyPress("C")}
            style={{
              ...btnStyle, background: "#444", color: "#ccc",
              width: 40, fontSize: 9, borderRadius: 6,
            }}>C</button>
        </div>

        {/* Bottom speaker dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 3, marginTop: 10 }}>
          {Array(7).fill(0).map((_, i) => (
            <div key={i} style={{ width: 3, height: 3, borderRadius: "50%", background: "#333" }} />
          ))}
        </div>
      </div>

      {/* Hint */}
      <div style={{ color: "#ffffff44", fontSize: 9, marginTop: 12, letterSpacing: 1 }}>
        Pijltjestoetsen + Enter / Esc | Klik de knoppen
      </div>

      <style>{`
        @keyframes vibrate {
          0%,100% { transform: translateX(0); }
          25% { transform: translateX(-3px) rotate(-1deg); }
          75% { transform: translateX(3px) rotate(1deg); }
        }
        @keyframes blink {
          0%,100% { opacity: 1; } 50% { opacity: 0; }
        }
        button:active { transform: scale(0.95); filter: brightness(0.8); }
      `}</style>
    </div>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function PhysBtn({ label, style, onClick }) {
  return (
    <button onClick={onClick} style={{
      position: "absolute", width: 20, height: 20, borderRadius: "50%",
      background: "transparent", border: "none", cursor: "pointer",
      color: "#bbb", fontSize: 9, display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 1, ...style,
    }}>{label}</button>
  );
}

function PhysCallBtn({ color, onClick, label }) {
  return (
    <button onClick={onClick} style={{
      width: 44, height: 24, borderRadius: 12,
      background: `linear-gradient(145deg, ${color}dd, ${color}88)`,
      border: "none", cursor: "pointer", color: "#fff",
      fontSize: 11, boxShadow: "0 2px 4px rgba(0,0,0,0.4)",
    }}>{label}</button>
  );
}

function SignalIcon({ bars }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 1 }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{
          width: 2, height: 2 + i * 2,
          background: i <= bars ? NOKIA_LIGHT : NOKIA_DARK,
        }} />
      ))}
    </div>
  );
}

function BatteryIcon({ bars }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 1 }}>
      <div style={{
        display: "flex", gap: 1, border: `1px solid ${NOKIA_DARK}`,
        padding: 1, alignItems: "center",
      }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            width: 2, height: 5,
            background: i <= bars ? NOKIA_LIGHT : "transparent",
          }} />
        ))}
      </div>
    </div>
  );
}

const screenTextStyle = { color: NOKIA_BLACK, fontSize: 9, fontFamily: "monospace", lineHeight: 1.6, width: "100%" };

function BootScreen({ welcomeText }) {
  return (
    <div style={{ ...screenTextStyle, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
      <div style={{ fontSize: 14, fontWeight: "bold", color: NOKIA_BLACK, letterSpacing: 3, marginBottom: 6 }}>NOKIA</div>
      <div style={{ fontSize: 8, color: NOKIA_DARK, letterSpacing: 1 }}>Connecting People</div>
      <div style={{ marginTop: 8, fontSize: 9, color: NOKIA_BLACK, animation: "blink 1s infinite" }}>
        {welcomeText}
      </div>
    </div>
  );
}

function SetupScreen({ step, number, pin, pin2, error }) {
  const titles = { number: "GSM-NUMMER", pin: "KIES PIN", pin2: "BEVESTIG PIN" };
  const values = { number, pin: "●".repeat(pin.length), pin2: "●".repeat(pin2.length) };
  return (
    <div style={screenTextStyle}>
      <div style={{ fontSize: 8, fontWeight: "bold", marginBottom: 4, color: NOKIA_DARK }}>INSTELLEN</div>
      <div style={{ fontSize: 8, marginBottom: 4 }}>{titles[step]}</div>
      <div style={{
        background: NOKIA_GREEN, border: `1px solid ${NOKIA_DARK}`,
        padding: "2px 4px", minHeight: 14, fontSize: 9, letterSpacing: 1,
      }}>{values[step] || "_"}</div>
      {error && <div style={{ fontSize: 7, color: "#a00", marginTop: 3 }}>{error}</div>}
      <div style={{ fontSize: 7, color: NOKIA_DARK, marginTop: 4 }}>Typ + OK om te bevestigen</div>
    </div>
  );
}

function PinScreen({ input, error }) {
  return (
    <div style={{ ...screenTextStyle, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 6 }}>
      <div style={{ fontSize: 9, fontWeight: "bold" }}>PIN-CODE</div>
      <div style={{
        border: `1px solid ${NOKIA_DARK}`, padding: "3px 10px",
        letterSpacing: 4, fontSize: 12, background: NOKIA_GREEN,
      }}>{"●".repeat(input.length) || "_"}</div>
      {error && <div style={{ fontSize: 7, color: "#a00" }}>{error}</div>}
    </div>
  );
}

function MenuList({ items, activeIndex, title }) {
  const visibleStart = Math.max(0, activeIndex - 3);
  const visible = items.slice(visibleStart, visibleStart + 5);
  const adjustedActive = activeIndex - visibleStart;

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <div style={{
        fontSize: 8, fontWeight: "bold", color: NOKIA_BLACK,
        borderBottom: `1px solid ${NOKIA_DARK}`, marginBottom: 2, paddingBottom: 1,
        letterSpacing: 1,
      }}>{title}</div>
      {visible.map((item, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 3,
          background: i === adjustedActive ? NOKIA_DARK : "transparent",
          color: i === adjustedActive ? NOKIA_LIGHT : NOKIA_BLACK,
          padding: "1px 3px", borderRadius: 2,
          fontSize: 9, lineHeight: 1.4,
        }}>
          {item.icon && <span style={{ fontSize: 8 }}>{item.icon}</span>}
          <div>
            <div style={{ fontWeight: i === adjustedActive ? "bold" : "normal" }}>{item.label}</div>
            {item.sub && <div style={{ fontSize: 7, opacity: 0.7 }}>{item.sub}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function IncomingCallScreen({ target, vibrating }) {
  return (
    <div style={{ ...screenTextStyle, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 4 }}>
      <div style={{ fontSize: 8, animation: "blink 0.8s infinite" }}>INKOMENDE OPROEP</div>
      <div style={{ fontSize: 11, fontWeight: "bold" }}>{target?.name || target?.number}</div>
      <div style={{ fontSize: 8, color: NOKIA_DARK }}>{target?.number}</div>
      <div style={{ fontSize: 7, marginTop: 4, color: NOKIA_DARK }}>
        📞 Opnemen  🔴 Weigeren
      </div>
    </div>
  );
}

function InCallScreen({ target, state, duration, formatDuration }) {
  return (
    <div style={{ ...screenTextStyle, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 4 }}>
      <div style={{ fontSize: 8, color: NOKIA_DARK }}>
        {state === "calling" ? "Bellen..." : "Verbonden"}
      </div>
      <div style={{ fontSize: 11, fontWeight: "bold" }}>{target?.name || target?.number}</div>
      <div style={{ fontSize: 8 }}>{target?.number}</div>
      {state === "connected" && (
        <div style={{ fontSize: 10, fontWeight: "bold", marginTop: 4 }}>{formatDuration(duration)}</div>
      )}
      <div style={{ fontSize: 7, color: NOKIA_DARK, marginTop: 4 }}>🔴 Ophangen</div>
    </div>
  );
}

function SMSCompose({ to, text, step, onToChange, onTextChange, onSend, onBack, credits, smsCost }) {
  const remaining = 160 - text.length;
  return (
    <div style={{ ...screenTextStyle, height: "100%", display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ fontSize: 8, fontWeight: "bold", borderBottom: `1px solid ${NOKIA_DARK}`, paddingBottom: 1 }}>
        NIEUW BERICHT
      </div>
      <div style={{ fontSize: 7, color: NOKIA_DARK }}>Aan:</div>
      <input value={to} onChange={e => onToChange(e.target.value)}
        placeholder="+32..." style={{
          background: NOKIA_GREEN, border: `1px solid ${NOKIA_DARK}`,
          color: NOKIA_BLACK, fontSize: 8, padding: "1px 3px", width: "100%",
          outline: "none", fontFamily: "monospace", boxSizing: "border-box",
        }} />
      <div style={{ fontSize: 7, color: NOKIA_DARK }}>Bericht: [{remaining}/160]</div>
      <textarea value={text} onChange={e => onTextChange(e.target.value)}
        maxLength={160}
        style={{
          background: NOKIA_GREEN, border: `1px solid ${NOKIA_DARK}`,
          color: NOKIA_BLACK, fontSize: 8, padding: "1px 3px",
          width: "100%", resize: "none", height: 30,
          outline: "none", fontFamily: "monospace", boxSizing: "border-box",
        }} />
      <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
        <button onClick={onSend} disabled={!to || !text}
          style={{ ...btnStyle, flex: 1, fontSize: 7, padding: "2px 4px",
            opacity: (!to || !text) ? 0.5 : 1 }}>
          STUUR ({smsCost}cr)
        </button>
        <button onClick={onBack} style={{ ...btnStyle, flex: 1, fontSize: 7, padding: "2px 4px", background: "#555" }}>
          ANNULEER
        </button>
      </div>
    </div>
  );
}

function ViewMessage({ msg, onBack }) {
  if (!msg) return null;
  return (
    <div style={{ ...screenTextStyle, height: "100%", display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ fontSize: 8, fontWeight: "bold", borderBottom: `1px solid ${NOKIA_DARK}`, paddingBottom: 1 }}>
        {msg.name || msg.from || msg.to}
      </div>
      <div style={{ fontSize: 7, color: NOKIA_DARK }}>{msg.time || ""}</div>
      <div style={{ fontSize: 9, lineHeight: 1.5, flexGrow: 1 }}>{msg.text}</div>
      <button onClick={onBack} style={{ ...btnStyle, fontSize: 7, padding: "2px 0", width: "100%" }}>TERUG</button>
    </div>
  );
}

function DialScreen({ input, onCall }) {
  return (
    <div style={{ ...screenTextStyle, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, justifyContent: "center", height: "100%" }}>
      <div style={{ fontSize: 8, fontWeight: "bold" }}>KIES NUMMER</div>
      <div style={{
        background: NOKIA_GREEN, border: `1px solid ${NOKIA_DARK}`,
        padding: "3px 8px", minWidth: 120, textAlign: "center",
        fontSize: 11, letterSpacing: 2, minHeight: 18,
      }}>{input || "_"}</div>
      <div style={{ fontSize: 7, color: NOKIA_DARK }}>📞 om te bellen</div>
    </div>
  );
}

function CreditView({ credits }) {
  return (
    <div style={{ ...screenTextStyle, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 6 }}>
      <div style={{ fontSize: 8, fontWeight: "bold" }}>BELTEGOED</div>
      <div style={{ fontSize: 16, fontWeight: "bold" }}>{credits}</div>
      <div style={{ fontSize: 8 }}>credits</div>
      <div style={{ fontSize: 7, color: NOKIA_DARK }}>SMS: 2cr | Bellen: 1cr/10s</div>
    </div>
  );
}

function RechargeScreen({ code, onCodeChange, onRedeem, msg }) {
  return (
    <div style={{ ...screenTextStyle, display: "flex", flexDirection: "column", gap: 4, height: "100%" }}>
      <div style={{ fontSize: 8, fontWeight: "bold", borderBottom: `1px solid ${NOKIA_DARK}`, paddingBottom: 1 }}>
        TEGOED OPLADEN
      </div>
      <div style={{ fontSize: 7, color: NOKIA_DARK }}>Voer code in:</div>
      <div style={{ display: "flex", gap: 2 }}>
        <input value={code} onChange={e => onCodeChange(e.target.value)}
          placeholder="*101*xxxx#"
          style={{
            background: NOKIA_GREEN, border: `1px solid ${NOKIA_DARK}`,
            color: NOKIA_BLACK, fontSize: 8, padding: "1px 3px", flex: 1,
            outline: "none", fontFamily: "monospace",
          }} />
        <button onClick={onRedeem} style={{ ...btnStyle, fontSize: 7, padding: "2px 4px" }}>OK</button>
      </div>
      {msg && <div style={{ fontSize: 8, color: msg.includes("+") ? NOKIA_BLACK : "#a00" }}>{msg}</div>}
      <div style={{ fontSize: 7, color: NOKIA_DARK, marginTop: 4, lineHeight: 1.6 }}>
        Demo codes:<br />
        *101*1234# = +100<br />
        *101*5678# = +250<br />
        *101*9999# = +500
      </div>
    </div>
  );
}

function DeviceInfo({ number }) {
  return (
    <div style={{ ...screenTextStyle, display: "flex", flexDirection: "column", gap: 4, height: "100%" }}>
      <div style={{ fontSize: 8, fontWeight: "bold", borderBottom: `1px solid ${NOKIA_DARK}`, paddingBottom: 1 }}>TOESTELINFO</div>
      <div style={{ fontSize: 8, lineHeight: 1.8 }}>
        Model: Nokia 3310<br />
        SW: V05.11<br />
        IMEI: 35-209900<br />
        Nummer: {number}
      </div>
    </div>
  );
}

// ============================================================
// MEMORY GAME
// ============================================================
function MemoryGame({ onExit }) {
  const EMOJIS = ["★", "♦", "♣", "♠", "●", "▲", "■", "♥"];
  const [cards, setCards] = useState(() => {
    const pairs = [...EMOJIS, ...EMOJIS].sort(() => Math.random() - 0.5)
      .map((e, i) => ({ id: i, emoji: e, flipped: false, matched: false }));
    return pairs;
  });
  const [selected, setSelected] = useState([]);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);

  const handleCard = (id) => {
    if (selected.length === 2) return;
    const card = cards.find(c => c.id === id);
    if (!card || card.flipped || card.matched) return;
    playBeep(1100, 40);

    const newCards = cards.map(c => c.id === id ? { ...c, flipped: true } : c);
    setCards(newCards);
    const newSel = [...selected, id];
    setSelected(newSel);

    if (newSel.length === 2) {
      setMoves(m => m + 1);
      const [a, b] = newSel.map(id => newCards.find(c => c.id === id));
      setTimeout(() => {
        if (a.emoji === b.emoji) {
          const matched = newCards.map(c => newSel.includes(c.id) ? { ...c, matched: true } : c);
          setCards(matched);
          if (matched.every(c => c.matched)) { setWon(true); playRingtone(); }
        } else {
          setCards(newCards.map(c => newSel.includes(c.id) ? { ...c, flipped: false } : c));
        }
        setSelected([]);
      }, 800);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ fontSize: 8, color: NOKIA_BLACK, fontFamily: "monospace", fontWeight: "bold" }}>
        MEMORY — {moves} zetten
      </div>
      {won ? (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 9, color: NOKIA_BLACK, marginBottom: 6 }}>🎉 Gewonnen!</div>
          <button onClick={onExit} style={{ ...btnStyle, fontSize: 8 }}>TERUG</button>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 22px)", gap: 2 }}>
            {cards.map(card => (
              <div key={card.id} onClick={() => handleCard(card.id)}
                style={{
                  width: 22, height: 22, display: "flex", alignItems: "center",
                  justifyContent: "center", cursor: "pointer",
                  background: card.flipped || card.matched ? NOKIA_GREEN : NOKIA_DARK,
                  border: `1px solid ${NOKIA_BLACK}`, fontSize: 10,
                  color: NOKIA_BLACK, borderRadius: 2,
                  transition: "background 0.15s",
                }}>
                {(card.flipped || card.matched) ? card.emoji : "?"}
              </div>
            ))}
          </div>
          <button onClick={onExit} style={{ ...btnStyle, fontSize: 7, padding: "2px 8px" }}>TERUG</button>
        </>
      )}
    </div>
  );
}

// ============================================================
// CALCULATOR
// ============================================================
function Calculator({ onExit, onKey }) {
  const [expr, setExpr] = useState("");
  const [result, setResult] = useState("");

  const press = (k) => {
    onKey(1100, 40);
    if (k === "=") {
      try {
        // Safe eval for basic math
        const r = Function('"use strict"; return (' + expr.replace(/[^0-9+\-*/.()]/g, '') + ')')();
        setResult(String(Math.round(r * 1e8) / 1e8));
      } catch { setResult("Fout"); }
    } else if (k === "C") {
      setExpr(""); setResult("");
    } else {
      setExpr(p => (p + k).slice(0, 20));
      setResult("");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, height: "100%" }}>
      <div style={{ fontSize: 8, fontWeight: "bold", color: NOKIA_BLACK, borderBottom: `1px solid ${NOKIA_DARK}`, paddingBottom: 1 }}>REKENMACHINE</div>
      <div style={{
        background: NOKIA_GREEN, border: `1px solid ${NOKIA_DARK}`,
        padding: "2px 4px", minHeight: 16, textAlign: "right",
        fontSize: 9, color: NOKIA_BLACK, fontFamily: "monospace",
      }}>{result || expr || "0"}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2 }}>
        {["7","8","9","/","4","5","6","*","1","2","3","-","C","0","=","+"].map(k => (
          <button key={k} onClick={() => press(k)} style={{
            ...btnStyle, padding: "3px 0", fontSize: 9,
            background: ["=","+","-","*","/"].includes(k) ? NOKIA_DARK : "#3a3a3a",
          }}>{k}</button>
        ))}
      </div>
      <button onClick={onExit} style={{ ...btnStyle, fontSize: 7, padding: "2px 0", marginTop: 2 }}>TERUG</button>
    </div>
  );
}