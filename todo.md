# Adaptive Reader Engine (ARE-1) - Project TODO

## Core Features

### Phase 1: Database & Data Models
- [x] Design user reading profile schema (level, strengths, weaknesses)
- [x] Design reading session tracking schema
- [x] Design content library schema
- [x] Design progress tracking schema
- [x] Implement database migrations

### Phase 2: Reading Level Assessment
- [x] Create calibration test with sample passages
- [x] Implement reading speed tracking (60-second timer)
- [x] Build comprehension question system
- [x] Implement Flesch-Kincaid readability scoring
- [x] Create difficulty band assignment (Levels 1-7)
- [x] Generate user reading profile with strengths/weaknesses

### Phase 3: Content Adaptation Engine
- [x] Integrate LLM for text rewriting at different difficulty levels
- [x] Implement prompt engineering for consistent quality
- [x] Build difficulty level adjustment algorithm
- [x] Create paragraph-by-paragraph adaptation system
- [ ] Implement content caching for performance

### Phase 4: Adaptive Reading Interface
- [x] Design and build onboarding flow
- [x] Create calibration test UI with timer
- [x] Build reading profile display page
- [x] Implement adaptive reader view with difficulty controls
- [x] Add progress tracking visualization
- [x] Create book/article selection interface
- [x] Implement real-time difficulty adjustment controls

### Phase 5: Progressive Learning System
- [ ] Track comprehension per paragraph
- [ ] Implement automatic difficulty increase (>85% comprehension)
- [ ] Implement automatic difficulty decrease (<60% comprehension)
- [ ] Build flow-state maintenance algorithm
- [ ] Create progress curve visualization
- [ ] Add daily recommendations system

### Phase 6: Testing & Polish
- [x] Write vitest tests for core procedures
- [x] Test calibration flow end-to-end
- [x] Test content adaptation with various texts
- [x] Test progressive difficulty adjustment
- [x] Create demo content library
- [ ] Performance optimization
- [x] Create checkpoint for deployment

## Phase 7: Cost-Optimized Pre-Generated Content (v2.0)

### Architecture Changes
- [ ] Refactor database schema to store paragraph variants (level 1-4)
- [ ] Remove real-time LLM adaptation from reader flow
- [ ] Update content adaptation to batch pre-generation

### The Prince Demo
- [ ] Extract first 3 chapters from PDF
- [ ] Split chapters into paragraphs
- [ ] Generate 4 difficulty levels for each paragraph (batch)
- [ ] Store all variants in database
- [ ] Update reader UI to switch between cached levels
- [ ] Test instant level switching (no LLM calls)

### Cost Optimization
- [ ] Calculate one-time generation cost vs per-read cost
- [ ] Implement paragraph-level caching
- [ ] Add optional "fine-tune paragraph" feature (single LLM call)
