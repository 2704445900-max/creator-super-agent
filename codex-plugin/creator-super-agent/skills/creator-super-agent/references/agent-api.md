# Agent API

Default base URL: `http://127.0.0.1:8787`.

## Start a generic run

```json
POST /api/agent/runs
{
  "workspaceId": "creator-default",
  "contentPackId": "creator-generic",
  "title": "15秒原创短片",
  "goal": "完成从剧本到故事板、关键帧、视频计划和发布方案",
  "script": "项目剧本或情节",
  "durationSec": 15,
  "budgetCny": 100,
  "generateImages": true,
  "imageProvider": "openai",
  "imageModel": "gpt-image-2",
  "requirePaidApproval": true,
  "requireVisualApproval": true,
  "autoStart": true
}
```

## Approve a paid image step

```json
POST /api/agent/runs/<id>/approve
{
  "approvalId": 1,
  "decision": "approved",
  "response": {
    "acknowledgedCost": true
  }
}
```

## Approve visual QA

```json
POST /api/agent/runs/<id>/approve
{
  "approvalId": 2,
  "decision": "approved",
  "response": {
    "confirmedPass": true,
    "visualIssues": [],
    "checkResults": {}
  }
}
```

Reject with `decision: "rejected"`. The run becomes paused and retains all files and events.
