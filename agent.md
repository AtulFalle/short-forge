# AGENTS.md

## 🎯 Purpose

This document defines how AI agents (Codex, LLMs) should operate in this repository.

Agents must prioritize:

* Correctness over speed
* Deterministic outputs
* Clean architecture
* Strict validation
* use 'nx add <package name>' only, not 'npm' or 'yarn

---

## 🧠 General Rules

1. NEVER guess missing requirements
2. ALWAYS follow existing folder structure
3. DO NOT introduce new dependencies unless necessary
4. KEEP functions small and single-responsibility
5. WRITE production-ready code (no placeholders, no TODOs)

---

## 📦 Architecture Principles

* Follow modular architecture (NestJS modules)
* Separate concerns:

  * Controller → request handling only
  * Service → business logic
  * Validator → schema validation
  * External services → isolated (Ollama, FFmpeg)

---

## 🔁 LLM Integration Rules

* Always treat LLM output as **untrusted input**
* Must:

  * Parse JSON safely
  * Validate using Zod
  * Retry up to 3 times on failure
* Never return raw LLM output to client

---

## 🛑 Error Handling

* Never swallow errors silently
* Use structured logging
* Throw meaningful HTTP exceptions
* Retry transient failures only

---

## 🧪 Testing Expectations

* Every service must be testable independently
* Avoid hardcoding values
* Use dependency injection properly

---

## 🧼 Code Quality

* No duplicate logic
* No long functions (>50 lines)
* Use meaningful variable names
* Avoid magic numbers

---

## 🔐 Security Rules

* Never execute dynamic code from LLM
* Never trust string inputs blindly
* Sanitize all outputs used in rendering

---

## ⚡ Performance Rules

* Avoid blocking operations in request cycle
* Heavy tasks (video rendering) must be async
* Prefer streaming/file handling over memory-heavy operations

---

## 📁 File Naming

* kebab-case for files
* PascalCase for classes
* camelCase for variables/functions

---

## 🚫 What NOT to do

* Do not mix business logic in controllers
* Do not skip validation
* Do not tightly couple services
* Do not hardcode API URLs inside logic

---

## ✅ Definition of Done

A feature is complete only if:

* It is validated
* It handles edge cases
* It is testable
* It follows module boundaries
* It logs important steps
