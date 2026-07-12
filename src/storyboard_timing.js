const DEFAULT_MIN_SHOTS = 3;
const DEFAULT_MAX_SHOTS = 48;

function compact(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function round1(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

function extractRuntimeSeconds(text) {
  const source = compact(text);
  if (!source) return null;

  const combined = source.match(/(\d+(?:\.\d+)?)\s*(?:分|分钟|min|minute|minutes)\s*(\d+(?:\.\d+)?)\s*(?:秒|s|sec|second|seconds)/i);
  if (combined) {
    return round1(Number(combined[1]) * 60 + Number(combined[2]));
  }

  const minute = source.match(/(\d+(?:\.\d+)?)\s*(?:分钟|分|min|minute|minutes)/i);
  if (minute) return round1(Number(minute[1]) * 60);

  const second = source.match(/(\d+(?:\.\d+)?)\s*(?:秒|s|sec|second|seconds)/i);
  if (second) return round1(Number(second[1]));

  return null;
}

function inferRuntimeFromScript(script, requestedShotCount, defaultDurationSec, autoShotPlanning = true) {
  const text = compact(script);
  const explicit = extractRuntimeSeconds(text);
  if (explicit) return { seconds: explicit, source: "script_explicit_duration" };

  if (autoShotPlanning) {
    const charCount = Array.from(text).length;
    if (charCount <= 120) return { seconds: 15, source: "script_density_short" };
    if (charCount <= 360) return { seconds: 30, source: "script_density_half_minute" };
    if (charCount <= 900) return { seconds: 60, source: "script_density_one_minute" };
    if (charCount <= 2400) return { seconds: 180, source: "script_density_three_minutes" };
    return { seconds: 300, source: "script_density_long_overview" };
  }

  if (requestedShotCount) {
    return {
      seconds: round1(requestedShotCount * clampNumber(defaultDurationSec || 4, 1.5, 12)),
      source: "shot_count_x_default_duration"
    };
  }

  return { seconds: 15, source: "script_density_short" };
}

function runtimeScale(seconds) {
  if (seconds <= 15) {
    return {
      type: "micro",
      label: "15秒以内短钩子",
      minShots: 4,
      maxShots: 6,
      idealAverageSec: 2.6,
      rhythm: "开场立即给行动，保留一个反应镜头和一个落点镜头。"
    };
  }
  if (seconds <= 30) {
    return {
      type: "short",
      label: "30秒以内短剧",
      minShots: 6,
      maxShots: 9,
      idealAverageSec: 3.4,
      rhythm: "建立目标、制造一次变化、用清晰动作收束。"
    };
  }
  if (seconds <= 60) {
    return {
      type: "short_plus",
      label: "1分钟以内短片",
      minShots: 8,
      maxShots: 14,
      idealAverageSec: 4.2,
      rhythm: "建立空间后交替推进行动、反应、道具和情绪。"
    };
  }
  if (seconds <= 180) {
    return {
      type: "medium",
      label: "1-3分钟中短剧",
      minShots: 14,
      maxShots: 28,
      idealAverageSec: 6,
      rhythm: "按段落推进，关键转折前后留反应镜头。"
    };
  }
  if (seconds <= 480) {
    return {
      type: "long",
      label: "3-8分钟中长剧",
      minShots: 28,
      maxShots: 44,
      idealAverageSec: 8,
      rhythm: "以序列为单位拆分，单张总图承载主镜头，复杂段落另开序列板。"
    };
  }
  return {
    type: "episode",
    label: "8分钟以上长段落",
    minShots: 36,
    maxShots: DEFAULT_MAX_SHOTS,
    idealAverageSec: 10,
    rhythm: "总图只做主镜头和段落骨架，正式制作时按场景拆成多张序列故事板。"
  };
}

function chooseShotCount(seconds, requestedShotCount, autoShotPlanning, scale) {
  const requested = requestedShotCount ? Math.trunc(clampNumber(requestedShotCount, DEFAULT_MIN_SHOTS, DEFAULT_MAX_SHOTS)) : null;
  if (autoShotPlanning === false && requested) return requested;

  const suggested = Math.round(seconds / scale.idealAverageSec);
  const autoCount = Math.trunc(clampNumber(suggested, scale.minShots, scale.maxShots));

  if (!requested) return autoCount;
  if (!seconds || seconds <= requested * 1.5 || seconds >= requested * 12) return autoCount;

  const difference = Math.abs(autoCount - requested);
  if (difference <= 2) return requested;
  return autoCount;
}

function timingRole(index, count) {
  if (index === 1) return "建立时间地点与主行动";
  if (index === count) return "落点、余韵或钩子";
  if (index === Math.ceil(count * 0.35)) return "第一次信息变化";
  if (index === Math.ceil(count * 0.65)) return "主要转折或压力升级";
  const cycle = ["行动推进", "反应确认", "道具/环境插入", "视线或空间衔接"];
  return cycle[(index - 2) % cycle.length];
}

function durationWeight(role, index, count) {
  if (role.includes("建立")) return 1.1;
  if (role.includes("落点")) return 1.2;
  if (role.includes("转折")) return 1.05;
  if (role.includes("反应")) return 0.95;
  if (role.includes("插入")) return 0.72;
  if (index === count - 1) return 0.9;
  return 1;
}

function allocateDurations(totalDurationSec, shotCount) {
  const roles = Array.from({ length: shotCount }, (_, itemIndex) => timingRole(itemIndex + 1, shotCount));
  const weights = roles.map((role, itemIndex) => durationWeight(role, itemIndex + 1, shotCount));
  const weightTotal = weights.reduce((sum, value) => sum + value, 0) || 1;
  let cursor = 0;
  const shots = roles.map((role, itemIndex) => {
    const index = itemIndex + 1;
    const rawDuration = totalDurationSec * (weights[itemIndex] / weightTotal);
    const durationSec = round1(clampNumber(rawDuration, 1.5, 12));
    const startSec = round1(cursor);
    cursor = round1(cursor + durationSec);
    return {
      index,
      durationSec,
      startSec,
      endSec: round1(cursor),
      role,
      rhythmNote: `${role}；本镜头用 ${durationSec}s 完成可读动作，不堆过多信息。`,
      transitionContinuity: index === 1
        ? "开场镜头负责建立空间、角色状态和动作方向。"
        : "承接上一镜头的视线、动作方向、道具状态或情绪强度。"
    };
  });

  const drift = round1(totalDurationSec - (shots.at(-1)?.endSec || 0));
  if (Math.abs(drift) >= 0.1 && shots.length) {
    const last = shots[shots.length - 1];
    last.durationSec = round1(Math.max(1.5, last.durationSec + drift));
    last.endSec = round1(totalDurationSec);
    if (shots.length > 1) last.startSec = shots[shots.length - 2].endSec;
  }
  return shots;
}

export function planStoryboardTiming(input = {}) {
  const director = input.director && typeof input.director === "object" ? input.director : {};
  const requestedShotCount = input.requestedShotCount || input.shotCount;
  const explicitDuration = Number(
    input.targetDurationSec ||
    input.totalDurationSec ||
    director.targetDurationSec ||
    director.totalDurationSec ||
    0
  );
  const runtime = Number.isFinite(explicitDuration) && explicitDuration > 0
    ? { seconds: round1(explicitDuration), source: "director_target_duration" }
    : inferRuntimeFromScript(
      [input.title, input.script, input.style, director.notes].filter(Boolean).join("\n"),
      requestedShotCount,
      director.defaultDurationSec,
      director.autoShotPlanning !== false
    );
  const totalDurationSec = round1(clampNumber(runtime.seconds, 6, 1800));
  const scale = runtimeScale(totalDurationSec);
  const shotCount = chooseShotCount(totalDurationSec, requestedShotCount, director.autoShotPlanning !== false, scale);
  const shots = allocateDurations(totalDurationSec, shotCount);
  const boardSegmentation = shotCount > 18
    ? {
      required: true,
      rule: "单张总图保留完整镜头表和主画面；正式制作建议按场景或段落拆成多张序列故事板，避免画面过密。"
    }
    : {
      required: false,
      rule: "当前镜头数量适合放进一张统一故事板总图。"
    };

  return {
    standard: "xinrui-storyboard-timing-v1",
    source: runtime.source,
    totalDurationSec,
    requestedShotCount: requestedShotCount ? Math.trunc(Number(requestedShotCount)) : null,
    shotCount,
    scale,
    autoShotPlanning: director.autoShotPlanning !== false,
    defaultDurationSec: clampNumber(director.defaultDurationSec || 4, 1.5, 12),
    boardSegmentation,
    shots
  };
}

export function timingForShot(timingPlan, index) {
  return (timingPlan?.shots || []).find((shot) => Number(shot.index) === Number(index)) || null;
}

export function storyboardTimingToMarkdown(timingPlan) {
  if (!timingPlan) return "";
  const lines = [
    `# 分镜时长规划`,
    "",
    `- 规格：${timingPlan.standard}`,
    `- 总时长：${timingPlan.totalDurationSec}s`,
    `- 镜头数：${timingPlan.shotCount}`,
    `- 类型：${timingPlan.scale?.label || "未分类"}`,
    `- 节奏：${timingPlan.scale?.rhythm || ""}`,
    `- 自动规划：${timingPlan.autoShotPlanning ? "是" : "否"}`,
    `- 总图拆分：${timingPlan.boardSegmentation?.rule || ""}`,
    "",
    "## 镜头时长表",
    ...((timingPlan.shots || []).map((shot) => (
      `- S${String(shot.index).padStart(2, "0")}: ${shot.startSec}-${shot.endSec}s / ${shot.durationSec}s / ${shot.role} / ${shot.transitionContinuity}`
    )))
  ];
  return `${lines.join("\n")}\n`;
}
