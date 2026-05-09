import { Injectable } from '@nestjs/common';
import { SCRIPT_VIDEO_LIMITS } from './script-video.limits';
import { ScriptVideoBrief, ScriptVideoOutline, ScriptVideoScript, ScriptVideoStoryboard } from './script-video.validator';

@Injectable()
export class ScriptVideoPromptBuilder {
  buildOutlinePrompt(brief: ScriptVideoBrief): string {
    const source = brief.sourceType === 'script' ? brief.suppliedScript : brief.prompt;

    return `Create a compact outline for a short vertical video.
Return ONLY valid JSON. No markdown, no comments, no extra text.

Input:
- source: ${source}
- topic: ${brief.topic}
- tone: ${brief.tone}
- style: ${brief.style}
- audience: ${brief.audience}
- duration seconds: ${brief.durationSec}
- language: English

JSON shape:
{
  "title": "max 90 chars",
  "hook": "max ${SCRIPT_VIDEO_LIMITS.maxHookChars} chars",
  "beats": ["3 to 6 short beats, max 160 chars each"],
  "closing": "max 160 chars"
}

Rules:
- Keep it descriptive, reflective, or educational.
- Do not create a quiz or Q&A format.
- Use exactly 3 to 6 beats.
- Keep the hook concrete and mobile-friendly.`;
  }

  buildScriptPrompt(brief: ScriptVideoBrief, outline: ScriptVideoOutline): string {
    return `Write narration for a short vertical video from this approved outline.
Return ONLY valid JSON. No markdown, no comments, no extra text.

Context:
- tone: ${brief.tone}
- style: ${brief.style}
- audience: ${brief.audience}
- target duration seconds: ${brief.durationSec}
- language: English

Approved outline:
${JSON.stringify(outline)}

JSON shape:
{
  "title": "same or improved title, max 90 chars",
  "narration": ["3 to 8 short narration paragraphs, max 700 chars each"],
  "closing": "short final narration line, max 300 chars"
}

Rules:
- Use 3 to 8 narration paragraphs.
- Do not include scene directions, timestamps, bullets, or labels.
- Keep the total narration suitable for ${brief.durationSec} seconds.
- Make it sound natural when read aloud.`;
  }

  buildStoryboardEnhancementPrompt(
    brief: ScriptVideoBrief,
    storyboard: ScriptVideoStoryboard,
  ): string {
    return `Improve overlay text and visual prompts for this short video storyboard.
Return ONLY valid JSON. No markdown, no comments, no extra text.

Context:
- tone: ${brief.tone}
- style: ${brief.style}
- audience: ${brief.audience}
- language: English

Current storyboard:
${JSON.stringify(storyboard)}

JSON shape:
{
  "title": "max 90 chars",
  "hook": "max ${SCRIPT_VIDEO_LIMITS.maxHookChars} chars",
  "scenes": [
    {
      "narration": "keep original meaning",
      "visualText": "max ${SCRIPT_VIDEO_LIMITS.maxVisualTextChars} chars",
      "backgroundPrompt": "vertical 1080x1920 background prompt, max 280 chars",
      "mood": "max 60 chars",
      "durationSec": 1
    }
  ],
  "closing": "max 300 chars"
}

Rules:
- Keep the same number of scenes.
- Do not change durations.
- Do not add factual claims.
- Make visualText short, punchy, and readable on mobile.`;
  }

  buildRepairPrompt(rawText: string, schemaDescription: string): string {
    return `Repair this response into ONLY valid JSON matching the schema. No markdown, no comments.

Schema:
${schemaDescription}

Response to repair:
${rawText}`;
  }
}

