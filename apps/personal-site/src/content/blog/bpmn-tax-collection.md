---
title: "Model tax collection with BPMN"
description: "Executable process models for yearly motor vehicle tax collection."
pubDate: 2025-05-20
tags: ["bpmn", "automation"]
keywords: ["bpmn", "dmn", "tax-collection", "automation"]
author: ["andriyansyah"]
# Thesis artifact (parallel content-data task owns projects/thesis.md).
about: ["thesis"]
# Retrospective pattern: origin role first (Makers analyst work), later reuse second (Navcore).
aboutExperience: ["makers-analyst-2022", "navcore-2023"]
mentions: ["business-process-management", "bpmn", "dmn"]
publisher: "andriyansyah"
inLanguage: "id"
---

I spent the tax season at Makers Institute redesigning how tax collection work actually flows: identifying the as-is process, redesigning it, and building an executable model with Business Process Model and Notation (BPMN) and Decision Model and Notation (DMN).

## Start from the counter, not the chart

The work began with observation: who hands what to whom at the counter, which decisions send a file back, and where the process waits on a signature. Only after the real sequence was documented did the modeling start.

## Decisions are part of the model

Decision Model and Notation (DMN) carried the eligibility and calculation rules, so the process diagram stayed readable while the rules stayed testable. The accounting treatment for the collection was determined alongside the model, keeping it compliant with the relevant tax laws and regulations.

## Executable, then verified

The model became a wireframe for the tax collection application, and comprehensive test cases verified the application's alignment with business requirements and tax laws. This same ground, business process automation of the yearly motor vehicle tax collection process at Samsat, later became my bachelor [thesis](https://github.com/LazyGeniusMan/thesis) at Universitas Padjadjaran. The executable-model discipline, BPMN for flow, DMN for rules, test cases for proof, is the same one later delivery work at [PT Navcore Nextology](/experience/navcore-2023) relied on for low-code flows and ERP integrations.

What survived: a process the office could run, a model the developers could build from, and test cases that proved the two matched.
