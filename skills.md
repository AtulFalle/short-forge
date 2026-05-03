# SKILLS.md

## 🧠 Core Stack

### Backend

* NestJS (modular architecture)
* TypeScript (strict mode)
* Zod (runtime validation)

### AI Layer

* Ollama (local LLM runtime)
* Models:

  * gemma (default)
  * qwen (optional for complex puzzles)

### Rendering

* Puppeteer (HTML → frames)
* FFmpeg (frames → video)

---

## 📐 Design Patterns

### 1. Service Pattern

* All business logic must live in services
* Controllers must remain thin

### 2. Factory Pattern

* Use for prompt generation
* Use for template selection

### 3. Adapter Pattern

* Wrap external systems (Ollama, FFmpeg)

---

## 🧾 Validation Strategy

* Use Zod for all runtime validation
* Never trust external input (including LLM output)

Example:

* LLM → parse → validate → transform → use

---

## 🔁 Retry Strategy

* Max retries: 3
* Retry only for:

  * JSON parse errors
  * schema validation failures

Do NOT retry:

* logical inconsistencies
* system errors

---

## 📊 Logging Standard

Use structured logs:

{
"event": "puzzle_generated",
"status": "success",
"duration": 1200
}

Log:

* LLM response (raw)
* validation errors
* retry attempts

---

## ⚙️ API Design

* RESTful
* Versioned (/api/v1)
* Consistent response format:

{
"status": "success",
"data": {},
"error": null
}

---

## 📦 File & Module Guidelines

Each module must contain:

* controller
* service
* validator (if needed)
* dto

---

## 🎨 Rendering Guidelines

* Resolution: 1080x1920
* Format: MP4 (H.264)
* Duration: 15–25 seconds
* Font: monospace (code clarity)

---

## ⚡ Performance Guidelines

* Use async/await properly
* Avoid blocking CPU-heavy work
* Use queues for rendering (future)

---

## 🔐 Security Best Practices

* Escape HTML content before rendering
* Do not allow arbitrary script injection
* Validate file paths

---

## 🧪 Testing Strategy

* Unit tests for services
* Integration tests for API
* Mock Ollama responses

---

## 🚀 Deployment (Future)

* Dockerized services
* Separate generator + renderer
* Optional queue (BullMQ + Redis)

---

## 📈 Scaling Strategy

Phase 1:

* Local file storage

Phase 2:

* S3 storage
* Queue-based rendering

Phase 3:

* Multi-model LLM routing

---

## 🎯 Engineering Philosophy

* Start simple, evolve system
* Optimize after validation
* Measure before scaling
