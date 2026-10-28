---
title: "Executable BPMN and DMN for tax collection"
description: "An executable process model with testable decisions for tax collection."
pubDate: 2022-05-20
tags: ["bpmn", "automation", "dmn"]
keywords: ["bpmn", "dmn", "tax-collection", "executable-process", "test-cases"]
author: ["andriyansyah"]
about: ["thesis"]
aboutExperience: ["makers-analyst-2022"]
mentions: ["bpmn", "dmn", "business-process-management"]
publisher: "andriyansyah"
inLanguage: "id"
draft: true
---

At Makers Institute I worked as a [Business Process Analyst](/experience/makers-analyst-2022) on the yearly motor vehicle tax collection process: identifying the as-is flow, redesigning it, and building an executable model in Business Process Model and Notation with decisions in Decision Model and Notation. The ground later became my bachelor [thesis](https://github.com/LazyGeniusMan/thesis) at Universitas Padjadjaran.

## Redesign before automation

The analysis came first: which steps added value, which waits were policy, and which handoffs only existed because the paper needed a signature. The redesigned process removed the dead steps, and only then did the executable BPMN model get built, so automation never fossilized waste.

## Rules live in DMN, not in diamonds

Eligibility checks and calculation rules moved into DMN decision tables, keeping the process diagram readable while every rule stayed independently testable. The accounting treatment for the collection was determined alongside the model for compliance with tax laws, and a wireframe carried the design to developers.

## Verification closes the loop

Comprehensive test cases checked the application against business requirements and tax regulations, proving the running software matched the model. The lesson that carried into every later project: a model you cannot execute is a drawing, and software you cannot trace to a model is a guess.
